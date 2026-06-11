package com.wonderfulhotel.app

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ProgressBar
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var swipeRefreshLayout: SwipeRefreshLayout
    private lateinit var progressBar: ProgressBar
    private var filePathCallback: ValueCallback<Array<Uri>>? = null

    // For local development on emulator, 10.0.2.2 routes to the host machine's localhost.
    // Port 8080 matches the default port running on the host machine.
    // Replace this with your production URL when deployed (e.g. "https://wonderful-hotel.onrender.com")
    private val appUrl = "http://10.0.2.2:8080"
    private val offlineUrl = "file:///android_asset/offline.html"

    private val filePickerLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val intentData = result.data
            val results = if (intentData == null) {
                null
            } else {
                val dataString = intentData.dataString
                val clipData = intentData.clipData
                if (clipData != null) {
                    val count = clipData.itemCount
                    val uris = Array(count) { i -> clipData.getItemAt(i).uri }
                    uris
                } else if (dataString != null) {
                    arrayOf(Uri.parse(dataString))
                } else {
                    null
                }
            }
            filePathCallback?.onReceiveValue(results)
        } else {
            filePathCallback?.onReceiveValue(null)
        }
        filePathCallback = null
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        swipeRefreshLayout = findViewById(R.id.swipeRefreshLayout)
        progressBar = findViewById(R.id.progressBar)

        setupWebView()
        setupSwipeToRefresh()
        setupBackNavigation()

        loadApp()
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        val settings = webView.settings
        
        // Essential capabilities
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        
        // Performance
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        
        // App identity in web server logs
        val defaultUserAgent = settings.userAgentString
        settings.userAgentString = "$defaultUserAgent WonderfulHotelAndroid/1.0"

        // Cookie management (critical for session state, login sessions and cart)
        val cookieManager = CookieManager.getInstance()
        cookieManager.setAcceptCookie(true)
        cookieManager.setAcceptThirdPartyCookies(webView, true)

        // Web view clients
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                if (url == null) return false
                
                // Allow standard web navigation within webview
                if (url.startsWith("http://") || url.startsWith("https://")) {
                    return false
                }
                
                // Handle system links (e.g. dialer, mail, maps) externally
                try {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                    startActivity(intent)
                } catch (e: Exception) {
                    // Fail gracefully if no handler is installed on the system
                }
                return true
            }

            override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                super.onPageStarted(view, url, favicon)
                progressBar.visibility = View.VISIBLE
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                progressBar.visibility = View.GONE
                swipeRefreshLayout.isRefreshing = false
            }

            override fun onReceivedError(
                view: WebView?,
                errorCode: Int,
                description: String?,
                failingUrl: String?
            ) {
                // Ignore errors for file assets
                if (failingUrl != null && failingUrl.startsWith("file:///android_asset/")) {
                    return
                }
                // Load local offline page when server is unreachable or offline
                webView.loadUrl(offlineUrl)
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                progressBar.progress = newProgress
                if (newProgress == 100) {
                    progressBar.visibility = View.GONE
                } else {
                    progressBar.visibility = View.VISIBLE
                }
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback

                val intent = fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                    type = "*/*"
                    addCategory(Intent.CATEGORY_OPENABLE)
                }
                try {
                    filePickerLauncher.launch(intent)
                } catch (e: Exception) {
                    this@MainActivity.filePathCallback = null
                    return false
                }
                return true
            }
        }

        // Add JavaScript interface for communication from local offline page
        webView.addJavascriptInterface(WebAppInterface(this), "AndroidApp")
    }

    private fun setupSwipeToRefresh() {
        swipeRefreshLayout.setOnRefreshListener {
            webView.reload()
        }
        // Custom colors for the refresh loader matching app brand colors
        swipeRefreshLayout.setColorSchemeResources(R.color.primary, R.color.accent)
    }

    private fun setupBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    // If we are on the offline fallback page and go back, we might loop.
                    val history = webView.copyBackForwardList()
                    val currentIndex = history.currentIndex
                    if (currentIndex > 0) {
                        val previousUrl = history.getItemAtIndex(currentIndex - 1).url
                        if (previousUrl == offlineUrl) {
                            // If previous page was offline page, exit the app instead of looping back to it
                            finish()
                            return
                        }
                    }
                    webView.goBack()
                } else {
                    finish()
                }
            }
        })
    }

    fun loadApp() {
        if (isNetworkAvailable()) {
            webView.loadUrl(appUrl)
        } else {
            webView.loadUrl(offlineUrl)
        }
    }

    fun isNetworkAvailable(): Boolean {
        val connectivityManager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = connectivityManager.activeNetwork ?: return false
        val activeNetwork = connectivityManager.getNetworkCapabilities(network) ?: return false
        return when {
            activeNetwork.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> true
            activeNetwork.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> true
            activeNetwork.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> true
            else -> false
        }
    }

    // JS interface class to let offline HTML notify native code
    inner class WebAppInterface(private val context: Context) {
        @JavascriptInterface
        fun retryConnection() {
            runOnUiThread {
                loadApp()
            }
        }
    }
}

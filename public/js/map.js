// Client-side Leaflet Map Integration script

if (!coordinates || coordinates.length < 2) {
  document.getElementById("map").innerHTML = `
    <div class="d-flex flex-column align-items-center justify-content-center h-100 text-center p-4 bg-light-subtle text-secondary small">
      <i class="fa-solid fa-map-location-dot fs-2 text-danger mb-2"></i>
      <h6 class="fw-bold text-dark mb-1">No Location Coordinates Available</h6>
      <p class="mb-0">Unable to retrieve geographical coordinates for this listing.</p>
    </div>
  `;
} else {
  // Leaflet uses [latitude, longitude], GeoJSON uses [longitude, latitude]
  const lat = coordinates[1];
  const lng = coordinates[0];

  // Initialize the Leaflet map
  const map = L.map('map', {
    scrollWheelZoom: false // disable scroll-zoom for user experience
  }).setView([lat, lng], 13);

  // Use the premium CartoDB Voyager map tiles
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(map);

  // Create a custom styled marker element matching the premium theme
  const customIcon = L.divIcon({
    className: 'custom-leaflet-marker',
    html: `<div style="background-color: #ff385c; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.3); transition: transform 0.2s ease;" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  // Create the interactive Popup content
  const popupContent = `
    <div style="font-family: 'Plus Jakarta Sans', sans-serif;">
      <h6 class="fw-bold text-dark mb-1" style="font-size: 14px; margin-bottom: 2px;">${listingTitle}</h6>
      <p class="text-secondary small mb-0" style="font-size: 11px; margin-bottom: 4px;"><i class="fa-solid fa-location-dot me-1 text-danger"></i>${listingLocation}</p>
      <small class="text-muted d-block mt-1" style="font-size: 10px; border-top: 1px solid #eee; padding-top: 4px;">Exact location provided upon booking confirmation.</small>
    </div>
  `;

  // Place marker and bind popup
  L.marker([lat, lng], { icon: customIcon })
    .addTo(map)
    .bindPopup(popupContent)
    .openPopup();
}

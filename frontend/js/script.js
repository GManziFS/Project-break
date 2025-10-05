let map;
let marker;
let geocoder;
let autocomplete;
let latitude;
let longitude;
let date;
let response;

function initMap() {
  const initialPosition = { lat: 39.704965, lng: -101.680907 };

  const mapOptions = {
    zoom: 4,
    center: initialPosition,
    mapTypeControl: false,       
    streetViewControl: false,    
    fullscreenControl: false,  
    clickableIcons: false,  
    zoomControl: true,           
    disableDefaultUI: true,   
    styles: [
      {
        featureType: "poi", 
        elementType: "labels",
        stylers: [{ visibility: "off" }]
      },
      {
        featureType: "road",
        elementType: "labels.icon",
        stylers: [{ visibility: "off" }]
      },
      {
        featureType: "transit",
        stylers: [{ visibility: "off" }]
      }
    ]
  };

  map = new google.maps.Map(document.getElementById("map"), mapOptions);

  geocoder = new google.maps.Geocoder();

  const input = document.getElementById("addressInput");
  autocomplete = new google.maps.places.Autocomplete(input, {
    fields: ["geometry", "formatted_address"],
    types: ["geocode"]
  });

  autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();
    if (place.geometry && place.geometry.location) {
      const location = place.geometry.location;
      map.setCenter(location);
      map.setZoom(14);
      placeMarker(location);
    }
  });

  document.getElementById("searchBtn").addEventListener("click", () => {
    const address = input.value.trim();
    if (address) {
      searchAddress(address);
    }
  });

  map.addListener("click", (event) => {
    const clickedLocation = event.latLng;
    placeMarker(clickedLocation);
  });
}

function placeMarker(location) {
  if (marker) {
    marker.setPosition(location);
  } else {
    marker = new google.maps.Marker({
      position: location,
      map: map,
      draggable: true,
    });
    marker.addListener("dragend", () => {
      const pos = marker.getPosition();
      updateCoords(pos.lat(), pos.lng());
    });
  }
  
  map.panTo(location);
  updateCoords(location.lat(), location.lng());
}

function updateCoords(lat, lng) {
  latitude = lat;
  longitude = lng;

  document.getElementById("coords").innerText = "Latitude: " + lat.toFixed(6) + ", Longitude: " + lng.toFixed(6);

  console.log("Latitude:", latitude, "Longitude:", longitude);
}

function searchAddress(address) {
  geocoder.geocode({ address: address }, (results, status) => {
    if (status === "OK") {
      const location = results[0].geometry.location;
      map.setCenter(location);
      map.setZoom(14);
      placeMarker(location);
    } else {
      alert("Endereço não encontrado: " + status);
    }
  });
}

const maxTemp = document.getElementById("max-temp");
const minTemp = document.getElementById("min-temp");
const btnTemp = document.getElementById("btn-temp");
const iptDate = document.getElementById("dateInput");

iptDate.addEventListener("change", () => {
  
})

// Refatoração de lógica do código btn.Temp

btnTemp.addEventListener("click", async () => {
  date = iptDate.value;

  if (!date) {
    alert("Please select a date.");
    return;
  } else if (!marker) {
    alert("Please select a location.");
    return;
  } else {
    // Apaga temporariamente o conteúdo anterior e mostra carregando
    maxTemp.innerText = "";
    minTemp.innerText = "Carregando...";
  }

  try {
    const BACKEND_URL = `/api/clima-completo?lat=${latitude}&lon=${longitude}&date=${date}`;
    const response = await fetch(BACKEND_URL);

    if (!response.ok) {
      throw new Error("Communication with the server has been lost: " + response.status);
    }

    const data = await response.json();
    console.log("Final Results: ", data);
    
    minTemp.innerText = `Temperatura mínima: ${data.temperatura_min_prevista}`;
    maxTemp.innerText = `Temperatura Máxima: ${data.temperatura_max_prevista}`;   
    
    // Mostra a referência da NASA para contexto
    document.getElementById("ref-temp").innerText = 
        `Ref. Histórica (NASA): ${data.temperatura_media_historica}`;

  } catch (error) {
    console.error("Error: ", error);
    minTemp.innerText = "";
    maxTemp.innerText = "";
    alert("Erro ao obter a previsão: " + error.message);
  }
});

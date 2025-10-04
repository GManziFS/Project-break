let map;
let marker;
let geocoder;
let autocomplete;

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
      pos = marker.getPosition();
      updateCoords(pos.lat(), pos.lng());
    });
  }
  
  map.panTo(location);
  updateCoords(location.lat(), location.lng());
}

function updateCoords(lat, lng) {
  document.getElementById("coords").innerText = "Latitude: " + lat.toFixed(6) + ", Longitude: " + lng.toFixed(6);
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

maxTemp = document.getElementById("max-temp")
minTemp = document.getElementById("min-temp")
btnTemp = document.getElementById("btn-temp")

btnTemp.addEventListener("click", async () => {
  try {
    const response = await fetch("http://api.weatherapi.com/v1/future.json?key=741cb8159a274a2f952144447250410&q=56.00,-90.00&dt=2026-06-18")
    if(!response.ok) throw new Error("Erro na requisição: "+response.status)
    const data = await response.json()
    console.log("Dados: ", data)

    const forecastDay = data.forecast.forecastday[0].day

    minTemp.innerText = `Temperatura minima: ${forecastDay.mintemp_c} °C`
    maxTemp.innerText = `Temperatura máxima: ${forecastDay.maxtemp_c} °C`

  } catch (error) {
    console.error("Erro: ",error);
  }
})

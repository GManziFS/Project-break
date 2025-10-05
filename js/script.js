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



btnTemp.addEventListener("click", async () => {
  date = iptDate.value
  if(!date){
    alert("Please select a date.")
    return
  }else{
    maxTemp.innerText = ""
    minTemp.innerText = "Carregando..."
  }

  const currentDate = new Date();
  currentDate.setHours(0,0,0,0);

  const userDate = new Date(date);
  userDate.setHours(0,0,0,0);

  console.log("Hoje: ",currentDate)
  console.log("antes: ",userDate)
  
  const pastApi = `http://api.weatherapi.com/v1/history.json?key=741cb8159a274a2f952144447250410&q=${latitude},${longitude}&dt=${date}`
  const currentApi = `http://api.weatherapi.com/v1/forecast.json?key=741cb8159a274a2f952144447250410&q=${latitude},${longitude}&days=14&aqi=yes&alerts=yes`
  const futureApi = `http://api.weatherapi.com/v1/future.json?key=741cb8159a274a2f952144447250410&q=${latitude},${longitude}&dt=${date}`

  const mlsecInDay = 24 * 60 * 60 * 1000;
  const futureLimit = 14 * mlsecInDay;

  try {
    if(userDate.getTime() == currentDate.getTime() || (userDate.getTime() > currentDate.getTime() && userDate.getTime() < currentDate.getTime() + futureLimit)){
      response = await fetch(currentApi);
    } else if (userDate.getTime() < currentDate.getTime()){
      response = await fetch(pastApi)
    } else {
      response = await fetch(futureApi)
    }
    if (!response.ok) throw new Error("Erro na requisição: " + response.status);
    const data = await response.json();
    console.log("Dados: ", data);
    console.log(response)

    const forecastDay = data.forecast.forecastday[0].day;

    minTemp.innerText = `Temperatura minima: ${forecastDay.mintemp_c} °C`;
    maxTemp.innerText = `Temperatura máxima: ${forecastDay.maxtemp_c} °C`;

  } catch (error) {
    console.error("Erro: ", error);
  }
});
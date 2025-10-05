let map;
let marker;
let geocoder;
let autocomplete;
let latitude;
let longitude;
let date;
let response;
let infoVisible = false;
let graphVisible = false;
let graficoClimatico = null; // Agora declarado corretamente

// DOM ELEMENTS
const maxTemp = document.getElementById("max-temp");
const minTemp = document.getElementById("min-temp");
const refTemp = document.getElementById("ref-temp");
const iptDate = document.getElementById("dateInput");
const btnBackMap = document.getElementById("backMap");
const backGraph = document.getElementById("backGraph");
const infoCards = document.getElementById("side-panel-ini"); // Removido o ponto no ID

const dayInMls = 24 * 60 * 60 * 1000;

function initMap() {
    const initialPosition = { lat: -14.514587, lng: -53.464720 };

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
            { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
            { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
            { featureType: "transit", stylers: [{ visibility: "off" }] }
        ]
    };

    map = new google.maps.Map(document.getElementById("map"), mapOptions);
    geocoder = new google.maps.Geocoder();

    const input = document.getElementById("addressInput");
    autocomplete = new google.maps.places.Autocomplete(input, { fields: ["geometry", "formatted_address"], types: ["geocode"] });

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
        if (address) searchAddress(address);
        getInformation();
    });

    map.addListener("click", (event) => {
        const clickedLocation = event.latLng;
        placeMarker(clickedLocation);
        document.body.classList.remove("dados-carregados", "grafico-ativo", "slideBtn");
    });
}

function placeMarker(location) {
    if (marker) {
        marker.setPosition(location);
    } else {
        marker = new google.maps.Marker({ position: location, map: map, draggable: true });
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
    document.getElementById("coords").innerText = `Latitude: ${lat.toFixed(6)}, Longitude: ${lng.toFixed(6)}`;
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

// Alternar painel lateral
btnBackMap.addEventListener("click", () => {
    infoVisible = !infoVisible;
    document.body.classList.toggle("dados-carregados", infoVisible);
});

// Alternar gráfico (visível ou não)
backGraph.addEventListener("click", () => {
    graphVisible = !graphVisible;
    if (graphVisible) {
        mostrarGrafico(new Date(iptDate.value)); // Atualiza com nova data
    } else {
        hideGrafico();
    }
});

btnBackMap.addEventListener("click", () => {
    document.body.classList.toggle("dados-carregados");
    document.body.classList.toggle("hideSide");
});

function hideGrafico() {
    document.body.classList.remove("grafico-ativo");
}

function hideSide(){
    document.body.classList.remove("sidePanel");
}

const getInformation = async () => {
    let rawDate = iptDate.value;

    if (!marker) {
        alert("Please select a location.");
        return;
    }

    if (!rawDate) {
        alert("Please select a date.");
        return;
    }

    const selectedDate = new Date(rawDate); // Correto
    const timestamp = selectedDate.getTime() + dayInMls;
    const date = new Date(timestamp)

    document.body.classList.add('dados-carregados', 'slideBtn');

    mostrarGrafico(date); // Chama com Date, não timestamp

    // Limpa visual
    minTemp.innerText = "Carregando...";
    maxTemp.innerText = "";
    if (refTemp) refTemp.innerText = "";

    try {
        const BACKEND_URL = `/api/clima-completo?lat=${latitude}&lon=${longitude}&date=${rawDate}`;
        const response = await fetch(BACKEND_URL);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Servidor: ${errorData.detalhe || errorData.error || response.status}`);
        }

        const data = await response.json();
        console.log("Final Results: ", data);

        minTemp.innerText = `Temperatura mínima: ${data.temperatura_min_prevista}`;
        maxTemp.innerText = `Temperatura Máxima: ${data.temperatura_max_prevista}`;
        if (refTemp) refTemp.innerText = `Ref. Histórica (NASA): ${data.temperatura_media_historica}`;
    } catch (error) {
        console.error("Error: ", error);
        minTemp.innerText = "N/A";
        maxTemp.innerText = "N/A";
        if (refTemp) refTemp.innerText = "";
        alert("Erro ao obter previsão: " + error.message);
    }
};

// Formata uma data para o gráfico
const formatarData = (data) => {
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

// Cria ou atualiza gráfico com novos dados e datas
function mostrarGrafico(date) {
    graphVisible = true;

    let dias = [];
    for (let i = 0; i < 15; i++) {
        let temp = new Date(date.getTime() + dayInMls * i);
        dias.push(temp);
    }

    dias = dias.map(formatarData);

    // Simula dados climáticos
    const temperatura = [29, 30, 28, 27, 31, 32, 33, 30, 28, 29, 27, 31, 30, 32, 29];
    const umidade = [70, 65, 72, 68, 60, 55, 58, 62, 64, 67, 69, 71, 66, 63, 65];
    const chuva = [40, 50, 60, 45, 90, 80, 50, 55, 60, 65, 75, 70, 50, 45, 55];

    const ctx = document.getElementById('climaChart');

    if (!graficoClimatico) {
        graficoClimatico = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dias,
                datasets: [
                    { label: 'Temperature (°C)', data: temperatura, backgroundColor: 'rgba(255, 99, 132, 0.5)', borderRadius: 6 },
                    { label: 'Humidity (%)', data: umidade, backgroundColor: 'rgba(54, 162, 235, 0.5)', borderRadius: 6 },
                    { label: 'Chances of rain (%)', data: chuva, type: 'line', borderColor: 'rgba(75, 192, 192, 1)', borderWidth: 2, tension: 0.4, fill: false, yAxisID: 'y' }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { min: 0, max: 100, ticks: { stepSize: 20 } },
                    x: { title: { display: true, text: 'Days of Month' } }
                },
                plugins: { legend: { position: 'bottom' } }
            }
        });
    } else {
        // Atualiza gráfico existente
        graficoClimatico.data.labels = dias;
        graficoClimatico.data.datasets[0].data = temperatura;
        graficoClimatico.data.datasets[1].data = umidade;
        graficoClimatico.data.datasets[2].data = chuva;
        graficoClimatico.update();
    }

    document.body.classList.add('grafico-ativo');
}

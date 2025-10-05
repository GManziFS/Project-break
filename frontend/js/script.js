let map;
let marker;
let geocoder;
let autocomplete;
let latitude;
let longitude;
let date;

// Elementos DOM (Mantidos para clareza)
const maxTemp = document.getElementById("max-temp");
const minTemp = document.getElementById("min-temp");
const refTemp = document.getElementById("ref-temp"); 
const iptDate = document.getElementById("dateInput");
const btnBackMap = document.getElementById("backMap");
const backGraph = document.getElementById("backGraph");

// ====================================================================
// FUNÇÕES DE MAPA E UTILIDADE
// ====================================================================

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
        document.body.classList.remove("dados-carregados", "grafico-ativo");
    });
}

function placeMarker(location) {
    if (marker) marker.setPosition(location);
    else {
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

function hideGrafico() {
    document.body.classList.remove("grafico-ativo");
}

// ====================================================================
// FUNÇÃO DE BUSCA E COMUNICAÇÃO COM BACKEND (CONSOLIDADA)
// ====================================================================

const getInformation = async () => {
    date = iptDate.value;

    // 1. Validação de Entrada
    if (!date) {
        alert("Please select a date.");
        return;
    } 
    if (!marker) {
        alert("Please select a location.");
        return;
    }

    // 2. Feedback Visual
    document.body.classList.add('dados-carregados');
    mostrarGrafico(); 
    minTemp.innerText = "Carregando...";
    maxTemp.innerText = "";
    if (refTemp) refTemp.innerText = "";

    try {
        // 3. Chamada ao Backend (URL: http://localhost:3000/api/clima-completo)
        const BACKEND_URL = `/api/clima-completo?lat=${latitude}&lon=${longitude}&date=${date}`;
        const response = await fetch(BACKEND_URL);

        if (!response.ok) {
            // Se o Node.js retornar um erro (403, 500), lemos a mensagem detalhada
            const errorData = await response.json();
            throw new Error(`Servidor: ${errorData.detalhe || errorData.error}`);
        }

        // 4. Exibição dos Dados Finais
        const data = await response.json();
        console.log("Final Results: ", data);
        
        minTemp.innerText = `Temp. Mín. Prevista: ${data.temperatura_min_prevista} °C`;
        maxTemp.innerText = `Temp. Máxima Prevista: ${data.temperatura_max_prevista} °C`;

        if (refTemp) {
            refTemp.innerText = `Ref. Histórica (NASA): ${data.temperatura_media_historica} °C (Anomalia: ${data.anomalia_temp} °C)`;
        }

        // Atualizar o gráfico aqui, passando 'data'
        // atualizarGraficoComDadosReais(data);

    } catch (error) {
        console.error("Error: ", error);
        minTemp.innerText = "N/A";
        maxTemp.innerText = "N/A";
        if (refTemp) refTemp.innerText = "";
        alert("Erro ao obter a previsão: " + error.message);
    }
};

// ====================================================================
// LISTENERS DE BOTÕES CORRIGIDOS E SIMPLIFICADOS
// ====================================================================

// Listener do botão de Esconder/Mostrar o Painel Lateral
btnBackMap.addEventListener("click", () => {
    document.body.classList.toggle("dados-carregados"); 
});

// Listener do botão de Esconder/Mostrar o Gráfico
backGraph.addEventListener("click", () => {
    document.body.classList.toggle("grafico-ativo");
});

// Listener para a mudança de data (limpa classes)
iptDate.addEventListener("change", () => { 
    document.body.classList.remove("dados-carregados", "grafico-ativo");
});

// ====================================================================
// FUNÇÃO MOSTRAR GRÁFICO (Mantida com dados mock)
// ====================================================================

function mostrarGrafico() {
    if (!window.graficoCriado) {
        const ctx = document.getElementById('climaChart');
        const dias = ['01','02','03','04','05','06','07','08','09','10','11','12','13','14','15'];
        const temperatura = [29,30,28,27,31,32,33,30,28,29,27,31,30,32,29];
        const umidade = [70,65,72,68,60,55,58,62,64,67,69,71,66,63,65];
        const chuva = [40,50,60,45,90,80,50,55,60,65,75,70,50,45,55];

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dias,
                datasets: [
                    { label: 'Temperatura (°C)', data: temperatura, backgroundColor: 'rgba(255, 99, 132, 0.5)', borderRadius: 6 },
                    { label: 'Umidade (%)', data: umidade, backgroundColor: 'rgba(54, 162, 235, 0.5)', borderRadius: 6 },
                    { label: 'Probabilidade de chuva (%)', data: chuva, type: 'line', borderColor: 'rgba(75, 192, 192, 1)', borderWidth: 2, tension: 0.4, fill: false, yAxisID: 'y' }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { min: 0, max: 100, ticks: { stepSize: 20 } },
                    x: { title: { display: true, text: 'Dias do Mês' } }
                },
                plugins: { legend: { position: 'bottom' } }
            }
        });

        window.graficoCriado = true;
    }
    document.body.classList.add('grafico-ativo');
}
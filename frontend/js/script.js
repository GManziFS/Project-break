let map;
let marker;
let geocoder;
let autocomplete;
let latitude;
let longitude;
let date;
let graficoClimatico = null; 

// Elementos DOM
const maxTemp = document.getElementById("max-temp");
const minTemp = document.getElementById("min-temp");
const avgTemp = document.getElementById("avg-temp"); // NOVO ELEMENTO
const refTemp = document.getElementById("ref-temp"); 
const iptDate = document.getElementById("dateInput");
const btnBackMap = document.getElementById("backMap");
const backGraph = document.getElementById("backGraph");
const precipPrevista = document.getElementById("precip-prevista");
const umidadeMedia = document.getElementById("umidade-media"); 
const ventoMedio = document.getElementById("vento-medio");     

// Base URL para o backend
const baseUrl = "http://localhost:3000"; 
const dayInMls = 24 * 60 * 60 * 1000; 

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

// Listener para a mudança de data (limpa classes)
iptDate.addEventListener("change", () => { 
    document.body.classList.remove("dados-carregados", "grafico-ativo");
});


// ====================================================================
// FUNÇÃO DE BUSCA E COMUNICAÇÃO COM BACKEND
// ====================================================================

const getInformation = async () => {
    const selectedDate = iptDate.value; 
    date = selectedDate; 

    // 1. Validação de Entrada
    if (!selectedDate) {
        alert("Por favor, selecione uma data.");
        return;
    } 
    if (!marker) {
        alert("Por favor, selecione uma localização.");
        return;
    }

    // 2. Feedback Visual
    document.body.classList.add('dados-carregados');
    // Limpa campos antes de carregar
    minTemp.innerText = "Carregando...";
    maxTemp.innerText = "";
    if (avgTemp) avgTemp.innerText = "";
    if (refTemp) refTemp.innerText = "";
    precipPrevista.innerText = "";
    umidadeMedia.innerText = "";
    ventoMedio.innerText = "";

    try {
        // 3. Chamada ao Backend
        const BACKEND_URL = baseUrl + `/api/clima-completo?lat=${latitude}&lon=${longitude}&date=${selectedDate}`;
        const response = await fetch(BACKEND_URL);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Servidor: ${errorData.detalhe || errorData.error}`);
        }

        // 4. Processa o corpo da resposta em JSON
        const data = await response.json(); 
        
        // 5. Exibição dos Dados Finais (Painel Lateral)
        minTemp.innerText = data.temperatura_min_prevista;
        maxTemp.innerText = data.temperatura_max_prevista;
        if (avgTemp) avgTemp.innerText = data.temperatura_media_prevista; 
        precipPrevista.innerText = data.precipitacao_prevista;
        umidadeMedia.innerText = data.umidade_media_prevista; 
        ventoMedio.innerText = data.vento_max_previsto; 

        if (refTemp) {
            refTemp.innerText = `Ref. Histórica: ${data.temperatura_media_historica} (Anomalia: ${data.anomalia_temp})`;
        }
        
        // 6. Atualização do Gráfico com Dados REAIS
        mostrarGrafico(data.dados_grafico); // Passa o array de 14 dias

    } catch (error) {
        console.error("Error:", error);
        
        // Exibição de N/A em caso de falha
        minTemp.innerText = "N/A";
        maxTemp.innerText = "N/A";
        if (avgTemp) avgTemp.innerText = "N/A";
        precipPrevista.innerText = "N/A";
        umidadeMedia.innerText = "N/A";
        ventoMedio.innerText = "N/A";
        if (refTemp) refTemp.innerText = "N/A";
        
        alert("Erro ao obter a previsão: " + error.message);
    }
};

// ====================================================================
// LISTENERS DE BOTÕES
// ====================================================================

// Listener do botão de Esconder/Mostrar o Painel Lateral
btnBackMap.addEventListener("click", () => {
    document.body.classList.toggle("dados-carregados"); 
});

// Listener do botão de Esconder/Mostrar o Gráfico
backGraph.addEventListener("click", () => {
    document.body.classList.toggle("grafico-ativo");
});


// ====================================================================
// FUNÇÃO MOSTRAR GRÁFICO (REESCRITA PARA USAR DADOS REAIS)
// ====================================================================

// Formata uma data (YYYY-MM-DD) para o gráfico (DD/MM)
const formatarData = (dataStr) => {
    const data = new Date(dataStr);
    // Adiciona 1 dia para corrigir o fuso horário que o JS interpreta
    data.setDate(data.getDate() + 1); 
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

// Cria ou atualiza gráfico com dados reais de 14 dias
function mostrarGrafico(dadosGrafico) {
    if (!dadosGrafico || dadosGrafico.length === 0) {
        // Se não houver dados reais, apenas esconde o gráfico
        document.body.classList.remove('grafico-ativo');
        return;
    }

    // 1. Extrai os dados reais do array
    const dias = dadosGrafico.map(d => formatarData(d.date));
    const temperatura = dadosGrafico.map(d => d.temp_avg);
    const umidade = dadosGrafico.map(d => d.humidity_avg);
    const chuva = dadosGrafico.map(d => d.precip_prob); // Probabilidade de chuva em %

    const ctx = document.getElementById('climaChart');

    if (!graficoClimatico) {
        // 2. Cria o Gráfico
        graficoClimatico = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dias,
                datasets: [
                    { 
                        label: 'Temperatura Média (°C)', 
                        data: temperatura, 
                        backgroundColor: 'rgba(255, 99, 132, 0.5)', 
                        borderRadius: 6 
                    },
                    { 
                        label: 'Umidade Média (%)', 
                        data: umidade, 
                        backgroundColor: 'rgba(54, 162, 235, 0.5)', 
                        borderRadius: 6 
                    },
                    { 
                        label: 'Probabilidade de Chuva (%)', 
                        data: chuva, 
                        type: 'line', 
                        borderColor: 'rgba(75, 192, 192, 1)', 
                        borderWidth: 2, 
                        tension: 0.4, 
                        fill: false, 
                        yAxisID: 'y' 
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { 
                        min: 0, 
                        max: 100, 
                        ticks: { stepSize: 20 },
                        title: { display: true, text: 'Umidade / Chuva (%)' }
                    },
                    x: { 
                        title: { display: true, text: 'Próximos Dias' } 
                    }
                },
                plugins: { legend: { position: 'bottom' } }
            }
        });
    } else {
        // 3. Atualiza gráfico existente
        graficoClimatico.data.labels = dias;
        graficoClimatico.data.datasets[0].data = temperatura;
        graficoClimatico.data.datasets[1].data = umidade;
        graficoClimatico.data.datasets[2].data = chuva;
        graficoClimatico.update();
    }

    document.body.classList.add('grafico-ativo');
}
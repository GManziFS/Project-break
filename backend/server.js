// backend/server.js
<<<<<<< HEAD

// --- 1. Configurações e Chave ---
const WEATHER_API_KEY = "585c4fb4448e43c7b3e185623250510"; // Hardcoded (Para teste)
=======
// const path = require('path');

// require('dotenv').config({path: path.resolve(__dirname, '../.env')});
const WEATHER_API_KEY = "e8563a4a764d45cab5f104656250510";

console.log("Variável carregada: ", !!WEATHER_API_KEY); // Deve ser 'true'
>>>>>>> 59ca26eb894c5d48ef1e39020ca2c8e38af52514
const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const app = express();
const PORT = 3000;

// Configuração do CORS
const allowedOrigins = ['http://localhost:5500'];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));

// DEBUG: Confirma que a variável está no escopo
console.log("Variável carregada: ", !!WEATHER_API_KEY); 

// --- 2. ROTA PRINCIPAL DA API (DEVE VIR ANTES DO MIDDLEWARE ESTÁTICO) ---
app.get('/api/clima-completo', async (req, res) => {
    const { lat, lon, date } = req.query; 

    if (!lat || !lon || !date) {
        return res.status(400).json({ error: "Parâmetros de localização e data são obrigatórios." });
    }

    try {
        // --- 2.1 LÓGICA DE TEMPO E CONSTRUÇÃO DA URL ---
        const userDate = new Date(date);
        const currentDate = new Date();
        const mlsecInDay = 24 * 60 * 60 * 1000;
        const futureLimit = 14 * mlsecInDay; 

        // 1. Definição da URL de SUCESSO (Forecast de 14 dias)
        const weatherApiUrl = `http://api.weatherapi.com/v1/forecast.json?key=${WEATHER_API_KEY}&q=${lat},${lon}&days=14&aqi=yes&alerts=yes`;

<<<<<<< HEAD
        // 2. Validação para retornar 403 (Evita erros de plano ao chamar histórico/futuro distante)
        if (userDate.getTime() < currentDate.getTime()) {
            return res.status(403).json({
                error: "Dados indisponíveis (Histórico)",
                detalhe: "Sua chave de API não permite a consulta de dados passados. Tente uma data futura ou atual."
            });
        }
        if (userDate.getTime() > currentDate.getTime() + futureLimit) {
            return res.status(403).json({
                error: "Dados indisponíveis (Futuro Distante)",
                detalhe: "A previsão está limitada a 14 dias pelo seu plano de API. Selecione uma data dentro desse limite."
            });
        }
        
=======
        if (userDate.getTime() < currentDate.getTime()) {
            return res.status(403).json({
                error: "Dados indisponíveis (Histórico)",
                detalhe: "O plano atual da API não permite consultas de dados passados"
            });
        }

        if (userDate.getTime() > currentDate.getTime() + futureLimit) {
            return res.status(403).json({
                error: "Dados indisponíveis (Futuro Distante)",
                detalhe: "A API de previsão esta limitada a 14 dias. A data selecionada está fora desse limite."
            });
        }

        weatherApiUrl = `http://api.weatherapi.com/v1/forecast.json?key=${WEATHER_API_KEY}&q=${lat},${lon}&days=14&aqi=yes&alerts=yes`;

>>>>>>> 59ca26eb894c5d48ef1e39020ca2c8e38af52514
        // URL da NASA POWER: Climatologia Personalizada (1990 - 2025)
        const nasaClimatologyUrl = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=T2M,PRECTOTCORR&community=AG&longitude=${lon}&latitude=${lat}&format=JSON&start=1990&end=2025`;

        // --- 2.2 CHAMADAS DE API (Executadas em Paralelo) ---
        const [weatherResponse, nasaResponse] = await Promise.all([
            axios.get(weatherApiUrl),
            axios.get(nasaClimatologyUrl)
        ]);

        const weatherData = weatherResponse.data;
        const nasaData = nasaResponse.data;

        // --- 3. LÓGICA DE PROCESSAMENTO E COMPARAÇÃO FINAL ---
        const forecastDayData = weatherData.forecast.forecastday.find(day => day.date === date) || weatherData.forecast.forecastday[0];
        const diaTargetWeather = forecastDayData.day;

        const tempMinPrevista = diaTargetWeather.mintemp_c;
        const tempMaxPrevista = diaTargetWeather.maxtemp_c;
        const chuvaPrevista = diaTargetWeather.totalprecip_mm;

        const mesConsulta = new Date(date).toLocaleString('en-US', { month: 'short' }).toUpperCase(); 
        const tempMediaHistorica = nasaData.properties.parameter.T2M[mesConsulta] || -999;
        const chuvaMediaHistorica = nasaData.properties.parameter.PRECTOTCORR[mesConsulta] || -999;
        const anomaliaTemperatura = tempMaxPrevista - tempMediaHistorica;

        // O JSON final limpo para o frontend
        const dadosParaFrontend = {
            data_consulta: date,
            temperatura_min_prevista: `${tempMinPrevista.toFixed(2)} °C`,
            temperatura_max_prevista: `${tempMaxPrevista.toFixed(2)} °C`,
            precipitacao_prevista: `${chuvaPrevista.toFixed(2)} mm`,
            temperatura_media_historica: `${tempMediaHistorica.toFixed(2)} °C`,
            precipitacao_media_historica: `${chuvaMediaHistorica.toFixed(2)} mm/dia`,
            anomalia_temp: `${anomaliaTemperatura.toFixed(2)} °C`
        };
        
        // 4. ENVIA O RESULTADO FINAL
        res.json(dadosParaFrontend);

    } catch (error) {
        console.error("CRITICAL ERROR IN ROUTE /api/clima-completo:", error.message);

        let status = 500;
        let errorMessage = "Falha interna no servidor ao processar a API.";
        let errorDetail = error.message;

        if (axios.isAxiosError(error) && error.response) {
            status = error.response.status;
            errorMessage = `A API externa retornou o status ${status}.`;
            errorDetail = error.response.data || error.message;
        }

        res.status(status).json({
            error: errorMessage,
            detalhe: errorDetail
        });
    }
});

// --- 3. MIDDLEWARE ESTÁTICO (DEVE VIR APÓS A ROTA DA API) ---
// app.use(express.static(path.join(__dirname, '../frontend')));

// --- 4. Inicialização do Servidor (DEVE VIR POR ÚLTIMO) ---
app.listen(PORT, () => {
    console.log(`Servidor Node.js rodando e pronto para receber requisições em http://localhost:${PORT}`);
});
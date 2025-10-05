// backend/server.js
require('dotenv').config();
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
console.log("Variável carregada: ", !!WEATHER_API_KEY); // Deve ser 'true'
const express = require('express');
const axios = require('axios'); // Necessário para fazer as chamadas de API
const path = require('path');
const app = express();
const PORT = 3000;

// A chave API é lida do arquivo .env


// Middleware: Serve os arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Rota Principal: Integração e Processamento das APIS

app.get('/api/clima-completo', async (req, res) => {
    const { lat, lon, date } = req.query; // Busca os dados do front

    if (!lat || !lon || !date) {
        return res.status(400).json({ error: "Parâmetros de localização e data são obrigatórios." });
    }

    try {
        // --- 1. LÓGICA DE TEMPO E CONSTRUÇÃO DA URL DO WEATHERAPI ---
        const userDate = new Date(date);
        const currentDate = new Date();
        const mlsecInDay = 24 * 60 * 60 * 1000;
        const futureLimit = 14 * mlsecInDay; // Limite de 14 dias do forecast

        let weatherApiUrl; // Variável padronizada e consistente

        // Determina qual endpoint usar (Forecast, History ou Future)
        if (userDate.getTime() <= currentDate.getTime() + futureLimit && userDate.getTime() >= currentDate.getTime()) {
            // CASO: Futuro próximo (até 14 dias), usa forecast.json
            weatherApiUrl = `http://api.weatherapi.com/v1/forecast.json?key=${WEATHER_API_KEY}&q=${lat},${lon}&days=14&aqi=yes&alerts=yes`;
        } else if (userDate.getTime() < currentDate.getTime()) {
            // CASO: Passado, usa history.json
            weatherApiUrl = `http://api.weatherapi.com/v1/history.json?key=${WEATHER_API_KEY}&q=${lat},${lon}&dt=${date}`;
        } else {
            // CASO: Futuro distante, usa future.json
            weatherApiUrl = `http://api.weatherapi.com/v1/future.json?key=${WEATHER_API_KEY}&q=${lat},${lon}&dt=${date}`;
        }

        // URL da NASA POWER: Climatologia Personalizada (1990 - 2025)
        const nasaClimatologyUrl = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=T2M,PRECTOTCORR&community=AG&longitude=${lon}&latitude=${lat}&format=JSON&start=1990&end=2025`;

        // --- 2. CHAMADAS DE API (Executadas em Paralelo) ---
        const [weatherResponse, nasaResponse] = await Promise.all([
            axios.get(weatherApiUrl), // Usando a variável corrigida
            axios.get(nasaClimatologyUrl)
        ]);

        const weatherData = weatherResponse.data;
        const nasaData = nasaResponse.data;

        // --- 3. LÓGICA DE PROCESSAMENTO E COMPARAÇÃO FINAL ---

        // 3.1. Extração da Previsão do Dia Específico (WeatherAPI)
        // O WeatherAPI retorna um array de dias, precisamos encontrar o dia da consulta.
        const forecastDayData = weatherData.forecast.forecastday.find(day => day.date === date) || weatherData.forecast.forecastday[0];
        const diaTargetWeather = forecastDayData.day;
        
        const tempMinPrevista = diaTargetWeather.mintemp_c;
        const tempMaxPrevista = diaTargetWeather.maxtemp_c;
        const chuvaPrevista = diaTargetWeather.totalprecip_mm;

        // 3.2. Extração da Climatologia (NASA)
        // Obtém o mês em formato 'JAN', 'FEB', etc.
        const mesConsulta = new Date(date).toLocaleString('en-US', { month: 'short' }).toUpperCase(); 
        
        // Dados médios históricos da NASA para aquele mês. Usa -999 em caso de erro.
        const tempMediaHistorica = nasaData.properties.parameter.T2M[mesConsulta] || -999;
        const chuvaMediaHistorica = nasaData.properties.parameter.PRECTOTCORR[mesConsulta] || -999;
        
        // 3.3. CÁLCULOS FINAIS
        const anomaliaTemperatura = tempMaxPrevista - tempMediaHistorica;

        // O JSON final limpo para o frontend (Sem as 3ª API externa)
        const dadosParaFrontend = {
            data_consulta: date,
            
            temperatura_min_prevista: `${tempMinPrevista.toFixed(2)} °C`,
            temperatura_max_prevista: `${tempMaxPrevista.toFixed(2)} °C`,
            precipitacao_prevista: `${chuvaPrevista.toFixed(2)} mm`,
            
            // Dados de Referência
            temperatura_media_historica: `${tempMediaHistorica.toFixed(2)} °C`,
            precipitacao_media_historica: `${chuvaMediaHistorica.toFixed(2)} mm/dia`,
            anomalia_temp: `${anomaliaTemperatura.toFixed(2)} °C`
        };
        
        // 4. ENVIA O RESULTADO FINAL
        res.json(dadosParaFrontend);

    } catch (error) {
        console.error("Erro no processamento da API:", error.message);
        
        // Tratamento de erro robusto para o frontend
        const status = error.response ? error.response.status : 500; 
        res.status(status).json({ 
            error: "Falha ao obter e processar dados climáticos.", 
            detalhe: error.message 
        });
    }
});


// --- 4. Inicialização do Servidor ---
app.listen(PORT, () => {
    console.log(`Servidor Node.js rodando e pronto para receber requisições em http://localhost:${PORT}`);
});
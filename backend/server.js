// backend/server.js

// --- 1. Configurações e Chave ---
// CHAVE HARDCODED: Para contornar o problema de ambiente (Solução temporária de debug)
const WEATHER_API_KEY = "585c4fb4448e43c7b3e185623250510"; 
const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do CORS para permitir comunicação com o frontend (5500 e 127.0.0.1)
const allowedOrigins = [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'https://project-break-x1kk.onrender.com',
    'https://project-break-two.vercel.app/'];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));

// --- 2. ROTA PRINCIPAL DA API ---

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

        // 2. Validação de Plano (Retorno 403 se for passado ou futuro distante)
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

        // URL da NASA POWER: Climatologia Personalizada (1990 - 2024)
        const nasaClimatologyUrl = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=T2M,PRECTOTCORR&community=AG&longitude=${lon}&latitude=${lat}&format=JSON&start=1990&end=2024`;

        // --- 2.2 CHAMADAS DE API (Executadas em Paralelo) ---
        const [weatherResponse, nasaResponse] = await Promise.all([
            axios.get(weatherApiUrl),
            axios.get(nasaClimatologyUrl)
        ]);

        const weatherData = weatherResponse.data;
        const nasaData = nasaResponse.data;

        // --- 3. LÓGICA DE PROCESSAMENTO E COMPARAÇÃO FINAL ---

        // 3.1. Dados para o dia alvo (Painel Lateral)
        const forecastDayData = weatherData.forecast.forecastday.find(day => day.date === date) || weatherData.forecast.forecastday[0];
        const diaTargetWeather = forecastDayData.day;

        const tempMinPrevista = diaTargetWeather.mintemp_c;
        const tempMaxPrevista = diaTargetWeather.maxtemp_c;
        const tempMediaPrevista = diaTargetWeather.avgtemp_c; 
        const chuvaPrevista = diaTargetWeather.totalprecip_mm;
        const umidadeMediaPrevista = diaTargetWeather.avghumidity;
        const ventoMaxPrevisto = diaTargetWeather.maxwind_kph; 

        // Extração da Climatologia (Referência)
        const mesConsulta = new Date(date).toLocaleString('en-US', { month: 'short' }).toUpperCase(); 
        const tempMediaHistorica = nasaData.properties.parameter.T2M[mesConsulta] || -999;
        const anomaliaTemperatura = tempMaxPrevista - tempMediaHistorica;


        // 3.2. Dados para o Gráfico (14 dias)
        const dadosGrafico = weatherData.forecast.forecastday.map(day => ({
            date: day.date,
            temp_avg: day.day.avgtemp_c,
            humidity_avg: day.day.avghumidity,
            precip_prob: day.day.daily_chance_of_rain 
        }));

        // 3.3. O JSON final limpo para o frontend
        const dadosParaFrontend = {
            data_consulta: date,
            // Previsão do Dia Alvo (Painel)
            temperatura_min_prevista: `${tempMinPrevista.toFixed(1)} °C`,
            temperatura_max_prevista: `${tempMaxPrevista.toFixed(1)} °C`,
            temperatura_media_prevista: `${tempMediaPrevista.toFixed(1)} °C`, 
            precipitacao_prevista: `${chuvaPrevista.toFixed(1)} mm`,
            umidade_media_prevista: `${umidadeMediaPrevista.toFixed(0)} %`, 
            vento_max_previsto: `${ventoMaxPrevisto.toFixed(1)} km/h`, 
            // Referência Histórica (Painel)
            temperatura_media_historica: `${tempMediaHistorica.toFixed(1)} °C`,
            anomalia_temp: `${anomaliaTemperatura.toFixed(1)} °C`,
            // Dados para o Gráfico (14 Dias)
            dados_grafico: dadosGrafico 
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

// --- 3. MIDDLEWARE ESTÁTICO ---
// app.use(express.static(path.join(__dirname, '../frontend'))); 

// --- 4. Inicialização do Servidor ---
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
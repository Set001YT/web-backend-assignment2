const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Weather API endpoint
app.get('/api/weather', async (req, res) => {
  try {
    const city = req.query.city;
    
    if (!city) {
      return res.status(400).json({ 
        error: 'City parameter is required',
        example: '/api/weather?city=London'
      });
    }

    const url = `https://api.openweathermap.org/data/2.5/weather`;
    const params = {
      q: city,
      appid: process.env.OPENWEATHER_API_KEY,
      units: 'metric'
    };

    const response = await axios.get(url, { params });
    const data = response.data;

    // Format response with all required fields
    const weatherData = {
      city: data.name,
      temperature: data.main.temp,
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      coordinates: {
        lat: data.coord.lat,
        lon: data.coord.lon
      },
      feelsLike: data.main.feels_like,
      windSpeed: data.wind.speed,
      countryCode: data.sys.country,
      rain: data.rain ? data.rain['3h'] || 0 : 0,
      humidity: data.main.humidity,
      pressure: data.main.pressure
    };

    res.json(weatherData);

  } catch (error) {
    console.error('Weather API Error:', error.message);
    
    if (error.response) {
      // API returned an error
      res.status(error.response.status).json({
        error: 'Weather data not found',
        message: error.response.data.message || 'City not found'
      });
    } else {
      // Network or other error
      res.status(500).json({
        error: 'Failed to fetch weather data',
        message: error.message
      });
    }
  }
});

// Country Facts API endpoint (using REST Countries API)
app.get('/api/facts', async (req, res) => {
  try {
    const countryCode = req.query.country;
    
    if (!countryCode) {
      return res.status(400).json({ 
        error: 'Country code parameter is required',
        example: '/api/facts?country=US'
      });
    }

    const url = `https://restcountries.com/v3.1/alpha/${countryCode}`;
    const response = await axios.get(url);
    const country = response.data[0];

    // Extract and format country facts
    const facts = {
      name: country.name.common,
      officialName: country.name.official,
      capital: country.capital ? country.capital[0] : 'N/A',
      region: country.region,
      subregion: country.subregion,
      population: country.population.toLocaleString(),
      area: country.area ? country.area.toLocaleString() + ' km²' : 'N/A',
      languages: country.languages ? Object.values(country.languages).join(', ') : 'N/A',
      currencies: country.currencies ? 
        Object.entries(country.currencies).map(([code, curr]) => 
          `${curr.name} (${curr.symbol || code})`
        ).join(', ') : 'N/A',
      timezone: country.timezones ? country.timezones[0] : 'N/A',
      flag: country.flags.png,
      coatOfArms: country.coatOfArms.png || null,
      maps: country.maps.googleMaps
    };

    res.json(facts);

  } catch (error) {
    console.error('Facts API Error:', error.message);
    
    if (error.response && error.response.status === 404) {
      res.status(404).json({
        error: 'Country not found',
        message: 'Invalid country code'
      });
    } else {
      res.status(500).json({
        error: 'Failed to fetch country facts',
        message: error.message
      });
    }
  }
});

// Combined endpoint - get weather and facts in one call
app.get('/api/weather-facts', async (req, res) => {
  try {
    const city = req.query.city;
    
    if (!city) {
      return res.status(400).json({ 
        error: 'City parameter is required',
        example: '/api/weather-facts?city=London'
      });
    }

    // First, get weather data to obtain country code
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather`;
    const weatherParams = {
      q: city,
      appid: process.env.OPENWEATHER_API_KEY,
      units: 'metric'
    };

    const weatherResponse = await axios.get(weatherUrl, { params: weatherParams });
    const weatherData = weatherResponse.data;

    // Format weather data
    const weather = {
      city: weatherData.name,
      temperature: weatherData.main.temp,
      description: weatherData.weather[0].description,
      icon: weatherData.weather[0].icon,
      coordinates: {
        lat: weatherData.coord.lat,
        lon: weatherData.coord.lon
      },
      feelsLike: weatherData.main.feels_like,
      windSpeed: weatherData.wind.speed,
      countryCode: weatherData.sys.country,
      rain: weatherData.rain ? weatherData.rain['3h'] || 0 : 0,
      humidity: weatherData.main.humidity,
      pressure: weatherData.main.pressure
    };

    // Then, get country facts using the country code
    const countryCode = weatherData.sys.country;
    const factsUrl = `https://restcountries.com/v3.1/alpha/${countryCode}`;
    const factsResponse = await axios.get(factsUrl);
    const country = factsResponse.data[0];

    const facts = {
      name: country.name.common,
      officialName: country.name.official,
      capital: country.capital ? country.capital[0] : 'N/A',
      region: country.region,
      subregion: country.subregion,
      population: country.population.toLocaleString(),
      area: country.area ? country.area.toLocaleString() + ' km²' : 'N/A',
      languages: country.languages ? Object.values(country.languages).join(', ') : 'N/A',
      currencies: country.currencies ? 
        Object.entries(country.currencies).map(([code, curr]) => 
          `${curr.name} (${curr.symbol || code})`
        ).join(', ') : 'N/A',
      timezone: country.timezones ? country.timezones[0] : 'N/A',
      flag: country.flags.png,
      maps: country.maps.googleMaps
    };

    // Return combined data
    res.json({
      weather,
      facts
    });

  } catch (error) {
    console.error('Combined API Error:', error.message);
    res.status(500).json({
      error: 'Failed to fetch data',
      message: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(` Server running on http://localhost:${PORT}`);
  console.log(` API Endpoints:`);
  console.log(`  - GET /api/health`);
  console.log(`  - GET /api/weather?city=CityName`);
  console.log(`  - GET /api/facts?country=CountryCode`);
  console.log(`  - GET /api/weather-facts?city=CityName`);
});

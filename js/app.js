document.addEventListener('DOMContentLoaded', function() {
    // Check which page we're on
    const currentPage = window.location.pathname.split('/').pop();
    
    // Use your Render backend URL
    const API_BASE_URL = 'https://stockify-backend-t7r2.onrender.com';
    console.log('API Base URL:', API_BASE_URL);
    
    if (currentPage === 'index.html' || currentPage === '') {
        initPredictionPage(API_BASE_URL);
    } else if (currentPage === 'popular.html') {
        initPopularStocksPage(API_BASE_URL);
    }
});

// Timeout utility function
function fetchWithTimeout(url, options, timeout = 90000) {
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout - backend is waking up. Please try again in 30 seconds.')), timeout)
        )
    ]);
}

function initPredictionPage(API_BASE_URL) {
    const predictionForm = document.getElementById('predictionForm');
    const resultsSection = document.getElementById('resultsSection');
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    // Auto-format ticker to uppercase
    const tickerInput = document.getElementById('ticker');
    tickerInput.addEventListener('input', function() {
        this.value = this.value.toUpperCase();
    });
    
    // Form submission
    predictionForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const ticker = tickerInput.value.trim();
        const model = document.getElementById('model').value;
        const days = parseInt(document.getElementById('days').value);
        
        if (!ticker) {
            showError('Please enter a stock ticker symbol');
            return;
        }
        
        if (days < 1 || days > 30) {
            showError('Prediction days must be between 1 and 30');
            return;
        }
        
        try {
            loadingOverlay.classList.remove('hidden');
            resultsSection.classList.add('hidden');
            
            console.log('Making prediction request to:', `${API_BASE_URL}/predict`);
            
            const response = await fetchWithTimeout(`${API_BASE_URL}/predict`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ticker: ticker,
                    model: model,
                    days: days
                })
            }, 60000); // 60 second timeout
            
            console.log('Response status:', response.status, response.statusText);
            
            if (!response.ok) {
                let errorMessage = `Server error: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (e) {
                    // If JSON parsing fails, try to get text response
                    try {
                        const errorText = await response.text();
                        if (errorText) errorMessage = errorText;
                    } catch (textError) {
                        // If text parsing also fails, use default message
                        errorMessage = `Server error: ${response.status} ${response.statusText}`;
                    }
                }
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            console.log('Response data:', data);
            
            if (data.status === 'error') {
                throw new Error(data.error || 'Failed to get predictions');
            }
            
            displayResults(data);
            
        } catch (error) {
            console.error('Prediction error:', error);
            if (error.message.includes('timeout')) {
                showError('Backend is waking up. This can take up to 60 seconds on first request. Please try again in 30 seconds.');
            } else {
                showError(error.message || 'Failed to connect to prediction service. Please try again later.');
            }
        } finally {
            loadingOverlay.classList.add('hidden');
        }
    });

    // Download chart buttons
    document.getElementById('downloadChart1')?.addEventListener('click', function() {
        const chartImg1 = document.getElementById('predictionChart1');
        if (!chartImg1.src) return;
        
        const link1 = document.createElement('a');
        link1.href = chartImg1.src;
        link1.download = `stock-prediction-historical-${new Date().toISOString().slice(0,10)}.png`;
        document.body.appendChild(link1);
        link1.click();
        document.body.removeChild(link1);
    });

    document.getElementById('downloadChart2')?.addEventListener('click', function() {
        const chartImg2 = document.getElementById('predictionChart2');
        if (!chartImg2.src) return;
        
        const link2 = document.createElement('a');
        link2.href = chartImg2.src;
        link2.download = `stock-prediction-only-${new Date().toISOString().slice(0,10)}.png`;
        document.body.appendChild(link2);
        link2.click();
        document.body.removeChild(link2);
    });

    // Check for ticker in URL params (for popular stocks click-through)
    function getUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const ticker = params.get('ticker');
        
        if (ticker && document.getElementById('ticker')) {
            document.getElementById('ticker').value = ticker;
        }
    }
    getUrlParams();
}

function initPopularStocksPage(API_BASE_URL) {
    const stocksGrid = document.getElementById('popularStocks');
    
    // Fetch popular stocks
    fetchPopularStocks(API_BASE_URL);
    
    async function fetchPopularStocks(API_BASE_URL) {
        try {
            console.log('Fetching popular stocks from:', `${API_BASE_URL}/popular`);
            
            const response = await fetchWithTimeout(`${API_BASE_URL}/popular`, {}, 30000);
            
            console.log('Popular stocks response status:', response.status, response.statusText);
            
            if (!response.ok) {
                let errorMessage = `Server error: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (e) {
                    // If JSON parsing fails, try to get text response
                    try {
                        const errorText = await response.text();
                        if (errorText) errorMessage = errorText;
                    } catch (textError) {
                        // If text parsing also fails, use default message
                        errorMessage = `Server error: ${response.status} ${response.statusText}`;
                    }
                }
                throw new Error(errorMessage);
            }
            
            const stocks = await response.json();
            console.log('Popular stocks data:', stocks);
            
            if (!stocks || !Array.isArray(stocks)) {
                throw new Error('Invalid data format received from server');
            }
            
            renderPopularStocks(stocks);
        } catch (error) {
            console.error('Error fetching popular stocks:', error);
            stocksGrid.innerHTML = `
                <div class="error-message glass-card">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${error.message || 'Failed to load popular stocks. Please try again later.'}</p>
                </div>
            `;
        }
    }
    
    function renderPopularStocks(stocks) {
        stocksGrid.innerHTML = '';
        
        if (stocks.length === 0) {
            stocksGrid.innerHTML = `
                <div class="error-message glass-card">
                    <i class="fas fa-info-circle"></i>
                    <p>No popular stocks available at the moment.</p>
                </div>
            `;
            return;
        }
        
        stocks.forEach(stock => {
            const stockCard = document.createElement('div');
            stockCard.className = 'stock-card glass-card';
            stockCard.innerHTML = `
                <div class="stock-ticker">${stock.ticker}</div>
                <div class="stock-name">${stock.name}</div>
            `;
            
            stockCard.addEventListener('click', () => {
                window.location.href = `index.html?ticker=${stock.ticker}`;
            });
            
            stocksGrid.appendChild(stockCard);
        });
    }
}

function displayResults(data) {
    console.log('Displaying results:', data);
    
    try {
        // 1. Update current price
        const currentPriceElement = document.getElementById('currentPrice');
        if (currentPriceElement) {
            currentPriceElement.textContent = `$${data.current_price?.toFixed(2) || 'N/A'}`;
        }

        // 2. Update predictions list
        const predictionsList = document.getElementById('predictionsList');
        if (predictionsList) {
            const predictionsCard = predictionsList.closest('.predictions-card');
            predictionsList.innerHTML = '';
            
            if (data.predictions && data.predictions.length > 0) {
                data.predictions.forEach((pred, index) => {
                    const predictionItem = document.createElement('div');
                    predictionItem.className = 'prediction-item';
                    predictionItem.innerHTML = `
                        <span class="prediction-day">Day ${index + 1}</span>
                        <span class="prediction-value">$${pred?.toFixed(2) || 'N/A'}</span>
                    `;
                    predictionsList.appendChild(predictionItem);
                });

                if (data.predictions.length > 5) {
                    predictionsCard.classList.add('scrollable');
                } else {
                    predictionsCard.classList.remove('scrollable');
                }
            } else {
                predictionsList.innerHTML = '<div class="no-predictions">No predictions available</div>';
                predictionsCard.classList.remove('scrollable');
            }
        }

        // 3. Update model metrics
        const metrics = data.model_metrics || {};
        if (document.getElementById('modelUsed')) {
            document.getElementById('modelUsed').textContent = metrics.model || 'N/A';
        }
        if (document.getElementById('r2Score')) {
            document.getElementById('r2Score').textContent = metrics.r2_score?.toFixed(4) || 'N/A';
        }
        if (document.getElementById('mseValue')) {
            document.getElementById('mseValue').textContent = metrics.mse?.toFixed(4) || 'N/A';
        }
        
        // 4. Update charts
        const chartImg1 = document.getElementById('predictionChart1');
        const chartImg2 = document.getElementById('predictionChart2');
        const downloadBtn1 = document.getElementById('downloadChart1');
        const downloadBtn2 = document.getElementById('downloadChart2');
        
        if (data.plot1 && chartImg1) {
            chartImg1.src = `data:image/png;base64,${data.plot1}`;
            chartImg1.style.display = 'block';
            if (downloadBtn1) downloadBtn1.style.display = 'inline-block';
        } else if (chartImg1) {
            chartImg1.style.display = 'none';
            if (downloadBtn1) downloadBtn1.style.display = 'none';
        }

        if (data.plot2 && chartImg2) {
            chartImg2.src = `data:image/png;base64,${data.plot2}`;
            chartImg2.style.display = 'block';
            if (downloadBtn2) downloadBtn2.style.display = 'inline-block';
        } else if (chartImg2) {
            chartImg2.style.display = 'none';
            if (downloadBtn2) downloadBtn2.style.display = 'none';
        }

        // Show results section
        if (resultsSection) {
            document.getElementById('resultsSection').classList.remove('hidden');
            
            // Scroll to results
            setTimeout(() => {
                document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
            }, 300);
        }
        
    } catch (error) {
        console.error('Error displaying results:', error);
        showError('Failed to display results. Please try again.');
    }
}

function showError(message) {
    // Remove any existing error alerts
    document.querySelectorAll('.error-alert').forEach(el => el.remove());
    
    const errorAlert = document.createElement('div');
    errorAlert.className = 'error-alert glass-card';
    errorAlert.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(errorAlert);
    
    setTimeout(() => {
        errorAlert.remove();
    }, 5000);
}

// Debug function to test with AAPL
window.testConnection = async function() {
    try {
        const API_BASE_URL = 'https://stockify-backend-t7r2.onrender.com';
        console.log('Testing connection to:', API_BASE_URL);
        
        const response = await fetch(`${API_BASE_URL}/health`);
        const data = await response.json();
        console.log('Health check:', data);
        
        return data;
    } catch (error) {
        console.error('Connection test error:', error);
        throw error;
    }
};
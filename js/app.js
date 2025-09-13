// Set API URL for production
const API_BASE_URL = 'https://stockify-backend-9gfp.onrender.com';

// Initialize mobile menu functionality
// Initialize mobile menu functionality
function initMobileMenu() {
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (mobileMenuToggle && navMenu) {
        // Only add event listeners for mobile devices
        if (window.innerWidth <= 768) {
            mobileMenuToggle.addEventListener('click', function() {
                navMenu.classList.toggle('active');
                const icon = this.querySelector('i');
                if (navMenu.classList.contains('active')) {
                    icon.classList.remove('fa-bars');
                    icon.classList.add('fa-times');
                    document.body.style.overflow = 'hidden'; // Prevent scrolling when menu is open
                } else {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                    document.body.style.overflow = 'auto'; // Re-enable scrolling
                }
            });
            
            // Close mobile menu when clicking on a link
            document.querySelectorAll('.nav-menu a').forEach(link => {
                link.addEventListener('click', () => {
                    navMenu.classList.remove('active');
                    if (mobileMenuToggle) {
                        const icon = mobileMenuToggle.querySelector('i');
                        icon.classList.remove('fa-times');
                        icon.classList.add('fa-bars');
                        document.body.style.overflow = 'auto';
                    }
                });
            });
            
            // Close menu when clicking outside
            document.addEventListener('click', function(event) {
                const isClickInsideNav = navMenu.contains(event.target);
                const isClickOnToggle = mobileMenuToggle.contains(event.target);
                
                if (!isClickInsideNav && !isClickOnToggle && navMenu.classList.contains('active')) {
                    navMenu.classList.remove('active');
                    const icon = mobileMenuToggle.querySelector('i');
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                    document.body.style.overflow = 'auto';
                }
            });
            
            // Close menu on escape key
            document.addEventListener('keydown', function(event) {
                if (event.key === 'Escape' && navMenu.classList.contains('active')) {
                    navMenu.classList.remove('active');
                    const icon = mobileMenuToggle.querySelector('i');
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                    document.body.style.overflow = 'auto';
                }
            });
        }
    }
}

// Update the resize event listener
window.addEventListener('resize', function() {
    const navMenu = document.querySelector('.nav-menu');
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    
    // Reset menu state on resize
    if (window.innerWidth > 768 && navMenu) {
        navMenu.classList.remove('active');
        if (mobileMenuToggle) {
            const icon = mobileMenuToggle.querySelector('i');
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
            document.body.style.overflow = 'auto';
        }
    }
    
    // Re-initialize mobile menu if needed
    if (window.innerWidth <= 768) {
        initMobileMenu();
    }
});

function initPredictionPage() {
    const predictionForm = document.getElementById('predictionForm');
    const resultsSection = document.getElementById('resultsSection');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingMessage = document.getElementById('loadingMessage');
    
    // Auto-format ticker to uppercase
    const tickerInput = document.getElementById('ticker');
    if (tickerInput) {
        tickerInput.addEventListener('input', function() {
            this.value = this.value.toUpperCase();
        });
    }
    
    // Form submission
    if (predictionForm) {
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
                loadingMessage.textContent = 'Processing your prediction...';
                resultsSection.classList.add('hidden');
                
                const response = await fetch(`${API_BASE_URL}/predict`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        ticker: ticker,
                        model: model,
                        days: days
                    })
                });
                
                // Check if response is OK before parsing JSON
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Server error: ${response.status} - ${errorText}`);
                }
                
                const data = await response.json();
                
                if (data.status === 'error') {
                    throw new Error(data.error || 'Failed to get predictions');
                }
                
                displayResults(data);
                
            } catch (error) {
                console.error('Prediction error:', error);
                showError(error.message || 'Something went wrong. Please try again.');
            } finally {
                loadingOverlay.classList.add('hidden');
            }
        });
    }

    // Download chart buttons
    document.getElementById('downloadChart1')?.addEventListener('click', function() {
        const chartImg1 = document.getElementById('predictionChart1');
        if (!chartImg1 || !chartImg1.src) return;
        
        const link1 = document.createElement('a');
        link1.href = chartImg1.src;
        link1.download = `stock-prediction-historical-${new Date().toISOString().slice(0,10)}.png`;
        document.body.appendChild(link1);
        link1.click();
        document.body.removeChild(link1);
    });

    document.getElementById('downloadChart2')?.addEventListener('click', function() {
        const chartImg2 = document.getElementById('predictionChart2');
        if (!chartImg2 || !chartImg2.src) return;
        
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

function initPopularStocksPage() {
    const stocksGrid = document.getElementById('popularStocks');
    
    // Fetch popular stocks
    if (stocksGrid) {
        fetchPopularStocks();
    }
    
    async function fetchPopularStocks() {
        try {
            const response = await fetch(`${API_BASE_URL}/popular`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const stocks = await response.json();
            
            if (!stocks || !Array.isArray(stocks)) {
                throw new Error('Invalid data format received');
            }
            
            renderPopularStocks(stocks);
        } catch (error) {
            console.error('Error fetching popular stocks:', error);
            stocksGrid.innerHTML = `
                <div class="error-message glass-card">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load popular stocks. Please try again later.</p>
                    <p>Error: ${error.message}</p>
                </div>
            `;
        }
    }
    
    function renderPopularStocks(stocks) {
        if (!stocks || stocks.length === 0) {
            stocksGrid.innerHTML = `
                <div class="error-message glass-card">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>No popular stocks available at the moment.</p>
                </div>
            `;
            return;
        }
        
        stocksGrid.innerHTML = '';
        
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
        const predictionsCard = predictionsList?.closest('.predictions-card');
        
        if (predictionsList) {
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

                // Add scrollable class if more than 5 predictions
                if (predictionsCard && data.predictions.length > 5) {
                    predictionsCard.classList.add('scrollable');
                } else if (predictionsCard) {
                    predictionsCard.classList.remove('scrollable');
                }
            } else {
                predictionsList.innerHTML = '<div class="no-predictions">No predictions available</div>';
                if (predictionsCard) {
                    predictionsCard.classList.remove('scrollable');
                }
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
        
        if (chartImg1 && data.plot1) {
            chartImg1.src = `data:image/png;base64,${data.plot1}`;
            chartImg1.style.display = 'block';
            if (downloadBtn1) downloadBtn1.style.display = 'inline-block';
        } else if (chartImg1) {
            chartImg1.style.display = 'none';
            if (downloadBtn1) downloadBtn1.style.display = 'none';
            console.warn('No chart data received for plot1');
        }

        if (chartImg2 && data.plot2) {
            chartImg2.src = `data:image/png;base64,${data.plot2}`;
            chartImg2.style.display = 'block';
            if (downloadBtn2) downloadBtn2.style.display = 'inline-block';
        } else if (chartImg2) {
            chartImg2.style.display = 'none';
            if (downloadBtn2) downloadBtn2.style.display = 'none';
            console.warn('No chart data received for plot2');
        }

        // Show results section
        const resultsSection = document.getElementById('resultsSection');
        if (resultsSection) {
            resultsSection.classList.remove('hidden');
            
            // Scroll to results
            setTimeout(() => {
                resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300);
        }
        
    } catch (error) {
        console.error('Error displaying results:', error);
        showError('Failed to display results. Please try again.');
    }
}

function showError(message) {
    // Remove any existing error alerts
    document.querySelectorAll('.error-alert').forEach(alert => alert.remove());
    
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
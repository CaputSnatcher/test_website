
document.addEventListener('DOMContentLoaded', function() {
    const authRequired = document.getElementById('auth-required');
    const shopContent = document.getElementById('shop-content');
    const productsContainer = document.getElementById('products-container');
    const cartBtn = document.getElementById('cart-btn');
    const cartCount = document.getElementById('cart-count');
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('checkout-btn');
    const addProductBtn = document.getElementById('add-product-btn');
    const saveProductBtn = document.getElementById('save-product-btn');

    let cart = [];
    let products = [];

    // Инициализация модальных окон Bootstrap
    const cartModal = new bootstrap.Modal(document.getElementById('cartModal'));
    const addProductModal = new bootstrap.Modal(document.getElementById('addProductModal'));

    // Проверка авторизации
    if (!isAuthenticated()) {
        authRequired.style.display = 'block';
        shopContent.style.display = 'none';
        return;
    } else {
        authRequired.style.display = 'none';
        shopContent.style.display = 'block';
    }

    // Загрузка товаров
    loadProducts();

    // Обработчики событий
    cartBtn.addEventListener('click', showCart);
    checkoutBtn.addEventListener('click', checkout);
    addProductBtn.addEventListener('click', () => addProductModal.show());
    saveProductBtn.addEventListener('click', saveProduct);

    async function loadProducts() {
        try {
            const response = await fetch('/api/products', {
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`
                }
            });
            if (response.ok) {
                products = await response.json();
                displayProducts();
            }
        } catch (error) {
            console.error('Ошибка загрузки товаров:', error);
        }
    }

    function displayProducts() {
        productsContainer.innerHTML = products.map(product => `
            <div class="col">
                <div class="card h-100">
                    <img src="${product.image}" class="card-img-top" alt="${product.name}">
                    <div class="card-body">
                        <h5 class="card-title">${product.name}</h5>
                        <p class="card-text">${product.description}</p>
                        <p class="card-text"><strong>${product.price} ₽</strong></p>
                        <button class="btn btn-primary" onclick="addToCart(${product.id})">
                            В корзину
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    window.addToCart = function(productId) {
        const product = products.find(p => p.id === productId);
        if (product) {
            const cartItem = cart.find(item => item.id === productId);
            if (cartItem) {
                cartItem.quantity++;
            } else {
                cart.push({ ...product, quantity: 1 });
            }
            updateCartCount();
        }
    }

    function updateCartCount() {
        const count = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = count;
    }

    function showCart() {
        cartItems.innerHTML = cart.map(item => `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <div>
                    <h6>${item.name}</h6>
                    <small>${item.price} ₽ x ${item.quantity}</small>
                </div>
                <div>
                    <button class="btn btn-sm btn-danger" onclick="removeFromCart(${item.id})">
                        Удалить
                    </button>
                </div>
            </div>
        `).join('') || '<p>Корзина пуста</p>';

        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        cartTotal.textContent = total;

        cartModal.show();
    }

    window.removeFromCart = function(productId) {
        cart = cart.filter(item => item.id !== productId);
        updateCartCount();
        showCart();
    }

    async function saveProduct(e) {
        e.preventDefault();
        
        const productData = {
            name: document.getElementById('product-name').value,
            description: document.getElementById('product-description').value,
            price: Number(document.getElementById('product-price').value),
            image: document.getElementById('product-image').value
        };

        try {
            const response = await fetch('/api/products', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify(productData)
            });

            if (response.ok) {
                addProductModal.hide();
                document.getElementById('add-product-form').reset();
                await loadProducts();
            }
        } catch (error) {
            console.error('Ошибка сохранения товара:', error);
        }
    }

    async function checkout() {
        if (cart.length === 0) {
            alert('Корзина пуста');
            return;
        }

        try {
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify({
                    items: cart,
                    total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
                })
            });

            if (response.ok) {
                alert('Заказ успешно оформлен!');
                cart = [];
                updateCartCount();
                cartModal.hide();
            }
        } catch (error) {
            console.error('Ошибка оформления заказа:', error);
        }
    }
});

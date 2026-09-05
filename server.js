// 1. Load Environment Variables
require('dotenv').config();

// 2. Import Dependencies
const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');

const app = express();
const port = 3000;

// 3. Setup Database Connection Pool
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
}).promise(); // Use promises for async/await

// 4. Setup Middleware
// To read EJS files
app.set('view engine', 'ejs');
// To find the 'views' folder
app.set('views', path.join(__dirname, 'views'));

// To read form data (e.g., req.body.email)
app.use(express.urlencoded({ extended: true }));
// To serve static files (CSS, client-side JS)
app.use(express.static(path.join(__dirname, 'public')));

// Setup session
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Middleware to make session data available in all EJS templates
app.use((req, res, next) => {
    res.locals.session = req.session;
    next();
});

// 5. Authentication Middleware (The "Bouncers")
const isAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
};

const isAdmin = (req, res, next) => {
    // Check if user is logged in AND if their role is 'admin'
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.redirect('/');
    }
    next();
};


// 6. --- ALL YOUR ROUTES GO HERE ---

// --- GET Routes (Page Loads) ---

// Homepage - Show all products
app.get('/', async (req, res) => {
    try {
        const [products] = await db.query("SELECT * FROM products");
        res.render('pages/index', { products: products });
    } catch (err) {
        console.error(err);
        res.send("Error loading products.");
    }
});

// Login page
app.get('/login', (req, res) => {
    res.render('pages/login');
});

// Register page
app.get('/register', (req, res) => {
    res.render('pages/register');
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/');
        }
        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
});

// --- POST Routes (Form Submissions) ---

// Register a new user
app.post('/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Save to database
        await db.query(
            "INSERT INTO users (email, password) VALUES (?, ?)", 
            [email, hashedPassword]
        );
        
        res.redirect('/login'); // Send to login after successful registration
    } catch (err) {
        console.error(err);
        res.send("Error registering user. Email might already be taken.");
    }
});

// Log a user in
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // DEBUG 1: See what data is coming from the form
    console.log("Login attempt:", email, password); 

    try {
        // 1. Find the user
        const [users] = await db.query(
            "SELECT * FROM users WHERE email = ?", 
            [email]
        );

        if (users.length === 0) {
            // DEBUG 2: Check if the user was even found
            console.log("DEBUG: User not found."); 
            return res.redirect('/login'); // User not found
        }

        const user = users[0];

        // --- ⭐ NEW DEBUG LOG IS HERE ⭐ ---
        // DEBUG 3: See the *exact* hash from the database
        console.log("HASH FROM DB:", user.password);
        // --- ⭐ ---

        // 2. Compare password
        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
            // 3. Passwords match! Create session.
            console.log("DEBUG: Login successful!"); // Added success log
            req.session.user = {
                id: user.id,
                email: user.email,
                role: user.role
            };
            res.redirect('/'); // Redirect to homepage
        } else {
            // DEBUG 4: Check if the password was the problem
            console.log("DEBUG: Password does not match!"); 
            // Passwords don't match
            res.redirect('/login');
        }
    } catch (err) {
        console.error(err);
        res.send("An error occurred.");
    }
});


// --- ADMIN Routes (Protected) ---
app.get('/admin', isAdmin, async (req, res) => {
    try {
        const [products] = await db.query("SELECT * FROM products");
        res.render('pages/admin', { products: products });
    } catch (err) {
        console.error(err);
        res.send("Error loading admin page.");
    }
});

app.post('/admin/add-product', isAdmin, async (req, res) => {
    const { name, description, price, imageUrl } = req.body;
    try {
        await db.query(
            "INSERT INTO products (name, description, price, imageUrl) VALUES (?, ?, ?, ?)",
            [name, description, price, imageUrl]
        );
        res.redirect('/admin');
    } catch (err) {
        console.error(err);
        res.send("Error adding product.");
    }
});

// ... (paste this after your /admin/add-product route)

app.post('/admin/delete-product', isAdmin, async (req, res) => {
    const { productId } = req.body;
    try {
        // 1. Delete all cart items that reference this product
        await db.query("DELETE FROM cart_items WHERE product_id = ?", [productId]);
        
        // 2. Now it's safe to delete the product
        await db.query("DELETE FROM products WHERE id = ?", [productId]);
        
        res.redirect('/admin');
    } catch (err) {
        console.error(err);
        res.send("Error deleting product.");
    }
});

// ... (paste these after your /admin/delete-product route)

// GET route to show the pre-filled edit page
app.get('/admin/edit-product/:id', isAdmin, async (req, res) => {
    const { id } = req.params; // Get the ID from the URL (e.g., /edit-product/3)
    try {
        const [products] = await db.query("SELECT * FROM products WHERE id = ?", [id]);
        
        if (products.length === 0) {
            return res.redirect('/admin'); // If product not found, go back
        }
        
        // Render the new edit page and pass the product data to it
        res.render('pages/edit-product', { product: products[0] });
    } catch (err) {
        console.error(err);
        res.send("Error loading edit page.");
    }
});

// POST route to handle the form submission and update the database
app.post('/admin/update-product', isAdmin, async (req, res) => {
    // Get all the data from the form
    const { productId, name, description, price, imageUrl } = req.body;
    
    try {
        await db.query(
            "UPDATE products SET name = ?, description = ?, price = ?, imageUrl = ? WHERE id = ?",
            [name, description, price, imageUrl, productId]
        );
        res.redirect('/admin'); // All done, go back to the admin panel
    } catch (err) {
        console.error(err);
        res.send("Error updating product.");
    }
});


// ... (your /cart routes start here)



// --- CART Routes (Protected) ---
app.get('/cart', isAuth, async (req, res) => {
    try {
        // Get all cart items for the logged-in user, JOIN with products to get details
        const [cartItems] = await db.query(
            `SELECT p.name, p.price, p.imageUrl, c.quantity, c.product_id
             FROM cart_items c
             JOIN products p ON c.product_id = p.id
             WHERE c.user_id = ?`,
            [req.session.user.id]
        );
        
        // Calculate total
        let total = 0;
        cartItems.forEach(item => {
            total += item.price * item.quantity;
        });

        res.render('pages/cart', { 
            cartItems: cartItems, 
            total: total.toFixed(2) 
        });
    } catch (err) {
        console.error(err);
        res.send("Error loading cart.");
    }
});

app.post('/cart/add', isAuth, async (req, res) => {
    const { productId } = req.body;
    const userId = req.session.user.id;
    
    try {
        // Check if item is already in cart
        const [existingItems] = await db.query(
            "SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?",
            [userId, productId]
        );
        
        if (existingItems.length > 0) {
            // Item exists, update quantity
            await db.query(
                "UPDATE cart_items SET quantity = quantity + 1 WHERE user_id = ? AND product_id = ?",
                [userId, productId]
            );
        } else {
            // Item does not exist, insert new
            await db.query(
                "INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)",
                [userId, productId, 1]
            );
        }
        res.redirect('/'); // Redirect back to homepage
    } catch (err) {
        console.error(err);
        res.send("Error adding to cart.");
    }
});

// // ... (all your other routes like /cart, /admin, etc.)

// // --- TEMPORARY ADMIN CREATION ROUTE ---
// app.get('/makeadmin', async (req, res) => {
//     try {
//         const email = 'admin2@test.com';
//         const password = 'newpass123'; // Our new, simple password
        
//         console.log('--- Creating new admin ---');
        
//         // 1. Hash the new password
//         const hashedPassword = await bcrypt.hash(password, 10);
//         console.log('New hash generated:', hashedPassword);

//         // 2. Insert the new admin user
//         await db.query(
//             "INSERT INTO users (email, password, role) VALUES (?, ?, 'admin')",
//             [email, hashedPassword]
//         );
        
//         console.log('SUCCESS: New admin user created.');
//         res.send('<h1>New Admin Created</h1><p>You can now log in with:<br>Email: admin2@test.com<br>Password: newpass123</p>');

//     } catch (err) {
//         console.error(err);
//         res.send('Error creating admin. Check terminal.');
//     }
// });
// // ----------------------------------------

// ... (your /cart/add route)

// POST route to remove an item from the cart
app.post('/cart/remove', isAuth, async (req, res) => {
    const { productId } = req.body;
    const userId = req.session.user.id;
    
    try {
        await db.query(
            "DELETE FROM cart_items WHERE user_id = ? AND product_id = ?",
            [userId, productId]
        );
        res.redirect('/cart');
    } catch (err) {
        console.error(err);
        res.send("Error removing from cart.");
    }
});

// POST route to update item quantity
app.post('/cart/update-quantity', isAuth, async (req, res) => {
    const { productId, action } = req.body;
    const userId = req.session.user.id;

    try {
        if (action === 'increase') {
            await db.query(
                "UPDATE cart_items SET quantity = quantity + 1 WHERE user_id = ? AND product_id = ?",
                [userId, productId]
            );
        } else if (action === 'decrease') {
            // First, check the current quantity
            const [items] = await db.query(
                "SELECT quantity FROM cart_items WHERE user_id = ? AND product_id = ?",
                [userId, productId]
            );
            
            if (items.length > 0 && items[0].quantity > 1) {
                // If quantity > 1, just decrease it
                await db.query(
                    "UPDATE cart_items SET quantity = quantity - 1 WHERE user_id = ? AND product_id = ?",
                    [userId, productId]
                );
            } else {
                // If quantity is 1, remove the item
                await db.query(
                    "DELETE FROM cart_items WHERE user_id = ? AND product_id = ?",
                    [userId, productId]
                );
            }
        }
        res.redirect('/cart');
    } catch (err) {
        console.error(err);
        res.send("Error updating quantity.");
    }
});


// ... (your new /cart/update-quantity route)

// GET route to show the checkout page and bill
app.get('/checkout', isAuth, async (req, res) => {
    try {
        const [cartItems] = await db.query(
            `SELECT p.name, p.price, p.imageUrl, c.quantity, c.product_id
             FROM cart_items c
             JOIN products p ON c.product_id = p.id
             WHERE c.user_id = ?`,
            [req.session.user.id]
        );
        
        if (cartItems.length === 0) {
            // Can't check out with an empty cart
            return res.redirect('/cart');
        }

        // Calculate totals for the bill
        let subtotal = 0;
        cartItems.forEach(item => {
            subtotal += item.price * item.quantity;
        });

        const tax = subtotal * 0.05; // 5% tax
        const finalTotal = subtotal + tax;

        res.render('pages/checkout', { 
            cartItems: cartItems, 
            subtotal: subtotal.toFixed(2),
            tax: tax.toFixed(2),
            finalTotal: finalTotal.toFixed(2)
        });
    } catch (err) {
        console.error(err);
        res.send("Error loading checkout page.");
    }
});

// ... (your GET /checkout route)

// GET route to show the shipping details page
app.get('/shipping-details', isAuth, (req, res) => {
    // Just render the new page
    res.render('pages/shipping-details');
});

// POST route to "place" the order
app.post('/place-order', isAuth, async (req, res) => {
    const userId = req.session.user.id;
    
    // We get the address details from the form (req.body)
    // For a bigger project, we would save this to an 'orders' table
    // For this project, we just need to clear the cart and show success.
    
    try {
        // 1. Clear the user's cart
        await db.query("DELETE FROM cart_items WHERE user_id = ?", [userId]);
        
        // 2. Render the "Order Placed" success page
        res.render('pages/order-placed');
        
    } catch (err) {
        console.error(err);
        res.send("Error placing order.");
    }
});

// ... (app.listen)
// 7. Start the Server
app.listen(port, () => {
    console.log(`🚀 Server rockin' at http://localhost:${port}`);
});
Creater : Eswaramoorthy M 
You can create a new file in your VS Code project folder named README.md and paste this content directly into it.
Simple E-Commerce Store 🛒
A full-stack e-commerce project built from scratch using Node.js, Express, and MySQL. This project features a complete customer-facing storefront and a secure admin panel for managing products, all built with EJS for server-side rendering.
✨ Features
 * Customer Features
   * Browse all products on the homepage.
   * Secure user registration and login (password hashing with bcrypt).
   * Persistent sessions using express-session.
   * Add products to a personal shopping cart.
   * Manage cart: update item quantities or remove items.
   * Complete checkout flow:
     * View a final bill with tax calculation.
     * Enter shipping and contact details.
     * Receive an "Order Placed" confirmation.
 * Admin Features
   * Protected admin-only routes.
   * Admin dashboard to view all products.
   * Full CRUD:
     * Create: Add new products to the store.
     * Read: View all products.
     * Update: Edit existing product details (name, price, etc.).
     * Delete: Remove products from the store.
💻 Tech Stack
 * Backend: Node.js, Express.js
 * Frontend: HTML, CSS, EJS (Embedded JavaScript)
 * Database: MySQL
 * Core Packages:
   * mysql2: To connect to the MySQL database.
   * ejs: As the template engine.
   * bcrypt: For hashing user passwords.
   * express-session: For managing user login sessions.
   * dotenv: For managing environment variables.
🚀 Getting Started
Follow these instructions to get a copy of the project up and running on your local machine.
1. Prerequisites
 * Node.js (which includes npm)
 * [suspicious link removed] (and a client like MySQL Workbench)
2. Installation & Setup
 * Clone the repository (or download the files):
   git clone https://your-repo-url/my-ecom-store.git
cd my-ecom-store

 * Install NPM packages:
   npm install

 * Set up the Database:
   * Open your MySQL client (e.g., MySQL Workbench).
   * Run the following SQL commands to create your database and tables:
   <!-- end list -->
   -- Create the database
CREATE DATABASE my_store_db;

-- Use the database
USE my_store_db;

-- Create the users table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('customer', 'admin') NOT NULL DEFAULT 'customer'
);

-- Create the products table
CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    imageUrl VARCHAR(255)
);

-- Create the cart items table
CREATE TABLE cart_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    product_id INT,
    quantity INT NOT NULL DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

   Note: ON DELETE CASCADE on cart_items is an alternative way to handle product deletion, but the server.js code also handles this manually.
 * Create your .env file:
   * In the root of the project (my-ecom-store/), create a file named .env.
   * Copy and paste the following, replacing with your MySQL credentials:
   <!-- end list -->
   # Database Connection
DB_HOST=localhost
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=my_store_db

# Session Secret
SESSION_SECRET=a-very-strong-and-secret-key-that-you-should-change

 * Run the server:
   node server.js

 * Open your browser and go to http://localhost:3000.
🧑‍💻 How to Use
Admin User
To manage products, you need an admin account. You can create one manually using the /makeadmin route we built.
 * Start your server (node server.js).
 * Go to http://localhost:3000/makeadmin in your browser.
 * This will create a new admin user. The default credentials are:
   * Email: admin2@test.com
   * Password: newpass123
 * Go to http://localhost:3000/login and log in with these credentials.
 * You will now see the "Admin Panel" link in the navbar.
(Remember to remove the /makeadmin route from server.js after you create your account for security!)
Customer
 * Go to http://localhost:3000/register to create a new customer account.
 * Log in with your new account.
 * Browse products, add them to your cart, and proceed through the full checkout flow!

 * Thankyou 😊
 * -Eswaramoorthy M
 *  

import { db, normalize } from "../db.js";
import { publishNotification, getNotificationsForShop, deleteNotification } from "./notifications.js";

/* Demo data seeding. Populates a shop with realistic Indian Kirana Store data
   so a first-time visitor sees a live-looking dashboard immediately. Idempotent per call. */

const PROD_BASES = ["Rice", "Sugar", "Wheat Flour", "Cooking Oil", "Toor Dal", "Tea", "Milk", "Salt", "Biscuits", "Soap", "Shampoo", "Detergent", "Matchbox", "Spices", "Garam Masala", "Turmeric", "Chilli Powder", "Coriander", "Cumin", "Mustard Seeds", "Paneer", "Butter", "Ghee", "Coffee", "Noodles", "Pasta", "Tomato Ketchup", "Chips", "Namkeen", "Cold Drink", "Juice", "Toothpaste", "Toothbrush", "Hair Oil", "Face Wash", "Deodorant", "Sanitary Pads", "Diapers", "Broom", "Floor Cleaner", "Dish Wash", "Toilet Cleaner", "Mosquito Repellent", "Bulb", "Batteries", "Pen", "Notebook", "Agarbatti", "Camphor", "Pooja Oil"];
const PROD_BRANDS = ["Tata", "Aashirvaad", "Fortune", "India Gate", "Daawat", "Gemini", "Gold Drop", "Red Label", "Taj Mahal", "Amul", "Heritage", "Jersey", "Britannia", "Parle", "Sunfeast", "Patanjali", "Dabur", "Himalaya", "Surf Excel", "Tide", "Ariel", "Vim", "Pril", "Lifebuoy", "Lux", "Dove", "Pears", "Cinthol", "Colgate", "Pepsodent", "Close Up", "Sensodyne", "Maggi", "Yippee", "Kissan", "Lays", "Kurkure", "Haldirams", "Bikano", "Coca Cola", "Pepsi", "Thums Up", "Sprite", "Real", "Tropicana", "Gillette", "Whisper", "Stayfree", "Pampers", "MamyPoko", "All Out", "Good Knight", "Duracell", "Eveready", "Cello", "Classmate", "Cycle", "Mangaldeep"];

const CUST_FIRST = ["Ramesh", "Suresh", "Mahesh", "Dinesh", "Naresh", "Rajesh", "Rakesh", "Mukesh", "Vijay", "Ajay", "Sanjay", "Anil", "Sunil", "Prakash", "Om", "Krishna", "Rama", "Shiva", "Gopi", "Hari", "Ravi", "Kiran", "Srinu", "Babu", "Raju", "Lakshmi", "Saraswati", "Parvati", "Durga", "Bhavani", "Sita", "Geeta", "Neeta", "Reeta", "Sunita", "Anita", "Kavita", "Savita", "Vanita", "Padma", "Radha", "Rekha", "Surekha", "Madhu", "Bindu", "Indu", "Sindhu", "Pooja", "Aarti", "Jyoti"];
const CUST_LAST = ["Sharma", "Verma", "Gupta", "Agarwal", "Jain", "Garg", "Bansal", "Mittal", "Singhal", "Goyal", "Kumar", "Singh", "Yadav", "Reddy", "Rao", "Naidu", "Chowdary", "Goud", "Patel", "Shah", "Desai", "Mehta", "Parekh", "Nair", "Menon", "Pillai", "Iyer", "Iyengar", "Das", "Bose", "Ghosh", "Datta", "Mitra", "Sen", "Roy", "Chakraborty", "Banerjee", "Chatterjee", "Mukherjee", "Bhattacharya", "Mishra", "Pandey", "Tiwari", "Shukla", "Dubey", "Pathak", "Agnihotri", "Dixit", "Goswami", "Bhardwaj"];

function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export async function clearShopData(shopId) {
  await db.batch([
    { sql: "DELETE FROM sales WHERE shop_id = ?", args: [shopId] },
    { sql: "DELETE FROM payments WHERE shop_id = ?", args: [shopId] },
    { sql: "DELETE FROM expenses WHERE shop_id = ?", args: [shopId] },
    { sql: "DELETE FROM customers WHERE shop_id = ?", args: [shopId] },
    { sql: "DELETE FROM products WHERE shop_id = ?", args: [shopId] },
  ]);

  // Clear in-memory notifications for this shop
  const ns = getNotificationsForShop(shopId);
  for (const n of ns) {
    deleteNotification(n.id, shopId);
  }
}

export async function seedDemoData(shopId) {
  await clearShopData(shopId);
  const rng = makeRng(shopId + 7);
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];

  const products = {};
  const productIds = [];
  
  // Create 147 products
  for (let i = 0; i < 147; i++) {
    let name = pick(PROD_BRANDS) + " " + pick(PROD_BASES);
    while (products[name]) name = pick(PROD_BRANDS) + " " + pick(PROD_BASES); // ensure unique names
    
    const cost = Math.floor(rng() * 200) + 10;
    const sell = Math.floor(cost * (1.1 + rng() * 0.3)); // 10% to 40% margin
    const stock = Math.floor(rng() * 100);
    const unit = pick(["kg", "kg", "packet", "packet", "packet", "piece", "l"]);
    
    const info = await db
      .prepare(`INSERT INTO products (shop_id, name, name_norm, unit, stock_qty, cost_price, sell_price) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(shopId, name, normalize(name), unit, stock, cost, sell);
      
    products[name] = { id: info.lastInsertRowid, name, cost, sell, stock, unit };
    productIds.push(name);
  }

  // Create 182 customers
  const customers = {};
  const customerIds = [];
  for (let i = 0; i < 182; i++) {
    let name = pick(CUST_FIRST) + " " + pick(CUST_LAST);
    while (customers[name]) name = pick(CUST_FIRST) + " " + pick(CUST_LAST);
    
    const info = await db
      .prepare("INSERT INTO customers (shop_id, name, name_norm) VALUES (?, ?, ?)")
      .run(shopId, name, normalize(name));
      
    customers[name] = info.lastInsertRowid;
    customerIds.push(name);
  }

  const stmts = [];

  // Generate around ~₹12,500 sales for today and realistic history
  // For 7 days
  for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
    // We want today (0) to have around 12500 in revenue. Average sale is ~150 rupees. So ~80 sales today.
    const count = daysAgo === 0 ? 80 + Math.floor(rng() * 20) : 40 + Math.floor(rng() * 30);
    
    for (let i = 0; i < count; i++) {
      const prodName = pick(productIds);
      const prod = products[prodName];
      const qty = 1 + Math.floor(rng() * 4);
      const amount = qty * prod.sell;
      const cost = qty * prod.cost;
      const onCredit = rng() < 0.2; // 20% sales on credit
      const cust = onCredit ? customers[pick(customerIds)] : null;
      
      const hour = 8 + Math.floor(rng() * 12); 
      const min = Math.floor(rng() * 60);
      const ts = `datetime(date('now','localtime','-${daysAgo} days'),'+${hour} hours','+${min} minutes')`;
      
      stmts.push({
        sql: `INSERT INTO sales (shop_id, product_id, item_text, qty, unit_price, amount, cost_amount, payment_type, customer_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ${ts})`,
        args: [shopId, prod.id, prod.name, qty, prod.sell, amount, cost, onCredit ? "udhaar" : "cash", cust],
      });
    }
  }

  // A few partial repayments
  for (let i=0; i<10; i++) {
     const ts = `datetime(date('now','localtime','-${Math.floor(rng()*5)} days'),'+12 hours')`;
     stmts.push({
      sql: `INSERT INTO payments (shop_id, customer_id, amount, created_at) VALUES (?, ?, ?, ${ts})`,
      args: [shopId, customers[pick(customerIds)], 200 + Math.floor(rng() * 500)],
    });
  }

  // Everyday expenses across the week
  const expenseCats = ["rent", "electricity", "transport", "tea", "packaging"];
  for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
      const cat = pick(expenseCats);
      const amt = 50 + Math.floor(rng() * 200);
      stmts.push({
        sql: `INSERT INTO expenses (shop_id, category, note, amount, created_at) VALUES (?, ?, ?, ?, datetime('now','localtime','-${daysAgo} days'))`,
        args: [shopId, cat, "Routine expense", amt],
      });
  }

  await db.batch(stmts);

  // Seed notifications
  publishNotification({
    shopId,
    title: "Low Stock Alert: Tata Salt",
    message: "Tata Salt is running low in stock (only 3 units left). Consider restocking soon.",
    category: "inventory",
    createdAt: new Date().toISOString()
  });
  publishNotification({
    shopId,
    title: "Udhaar Due: Ramesh Sharma",
    message: "Ramesh Sharma's credit limit has reached ₹450. Recommended follow-up.",
    category: "credits",
    amount: 450,
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  });
  publishNotification({
    shopId,
    title: "Payment Received: Suresh Verma",
    message: "Suresh Verma paid ₹500 towards their outstanding balance.",
    category: "payments",
    amount: 500,
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
  });
  publishNotification({
    shopId,
    title: "Connection Request",
    message: "Aashirvaad Distributors wants to connect with your shop for wholesale supply.",
    category: "connections",
    createdAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString()
  });
  publishNotification({
    shopId,
    title: "Order Logged via Voice",
    message: "Successfully logged sale of 5 items via Voice Assistant.",
    category: "orders",
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  });

  return { products: 147, customers: 182 };
}


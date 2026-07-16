// Test registration API directly
const payload = {
  whatsapp_number: "9845455152",
  name: "Raju Shop",
  shop_name: "Raju Shop",
  owner_name: "Raju",
  mobile_number: "9845455152",
  email: "test@test.com",
  shop_address: "Bangalore",
  shop_logo: "",
  business_category: "General Store",
  username: "raju2",
  password: "Raju@1234",
  lang: "en",
};

try {
  const res = await fetch("http://localhost:3001/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  console.log("Status:", res.status);
  console.log("Response:", JSON.stringify(data, null, 2));
} catch (e) {
  console.error("Error:", e.message);
}

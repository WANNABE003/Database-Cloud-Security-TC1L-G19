const productRows = document.querySelector("#productRows");
const productGrid = document.querySelector("#productGrid");
const orderRows = document.querySelector("#orderRows");
const staffOrderRows = document.querySelector("#staffOrderRows");
const cartRows = document.querySelector("#cartRows");
const cartCount = document.querySelector("#cartCount");
const sessionLabel = document.querySelector("#sessionLabel");
const toast = document.querySelector("#toast");
const securityOutput = document.querySelector("#securityOutput");
const productForm = document.querySelector("#productForm");
const orderForm = document.querySelector("#orderForm");
const userForm = document.querySelector("#userForm");
const clearUserFormBtn = document.querySelector("#clearUserFormBtn");
const loginForm = document.querySelector("#loginForm");
const registerForm = document.querySelector("#registerForm");
const authTitle = document.querySelector("#authTitle");
const authHint = document.querySelector("#authHint");
const demoUsers = document.querySelector("#demoUsers");
const auditBtn = document.querySelector("#auditBtn");
const customersBtn = document.querySelector("#customersBtn");
const logoutBtn = document.querySelector("#logoutBtn");
const authScreen = document.querySelector("#authScreen") || document.querySelector("#signin");
const appShell = document.querySelector("#appShell");
const heroSection = document.querySelector(".hero");
const shopSection = document.querySelector("#shop");
const approvalsSection = document.querySelector("#approvals");
const usersSection = document.querySelector("#users");
const filterButtons = [...document.querySelectorAll("[data-category]")];
const ordersSection = document.querySelector('[data-role-section="orders"]');
const staffSection = document.querySelector('[data-role-section="staff"]');
const userRows = document.querySelector("#userRows");
const navItems = [...document.querySelectorAll("[data-nav]")];
const authTabs = [...document.querySelectorAll("[data-auth-mode]")];

let currentUser = null;
let products = [];
let users = [];
let cart = [];
let activeCategory = "All";

function makeSku() {
  return `SKU-FSH-${Date.now().toString().slice(-5)}`;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2600);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function setFormDisabled(form, disabled) {
  [...form.elements].forEach((element) => {
    element.disabled = disabled;
  });
}

function applyRoleUi(role) {
  const canManageProducts = role === "Admin" || role === "InventoryOfficer";
  const canCreateOrders = role === "Customer";
  const canBrowseShop = role === "Customer";
  const canApproveOrders = role === "Admin" || role === "InventoryOfficer";
  const canManageUsers = role === "Admin";
  const canViewAudit = role === "Admin";
  const canViewMaskedCustomers = role === "Admin" || role === "InventoryOfficer";

  heroSection.hidden = !canBrowseShop;
  shopSection.hidden = !canBrowseShop;
  approvalsSection.hidden = !canApproveOrders;
  usersSection.hidden = !canManageUsers;
  ordersSection.hidden = role !== "Customer";
  staffSection.hidden = !canManageProducts && !canViewMaskedCustomers && !canApproveOrders;
  navItems.forEach((item) => {
    const target = item.dataset.nav;
    item.hidden =
      !role ||
      (target === "shop" && !canBrowseShop) ||
      (target === "orders" && role !== "Customer") ||
      (target === "approvals" && !canApproveOrders) ||
      (target === "manage" && !canManageProducts) ||
      (target === "security" && !canViewMaskedCustomers) ||
      (target === "users" && !canManageUsers);
  });

  setFormDisabled(productForm, !canManageProducts);
  setFormDisabled(orderForm, !canCreateOrders);
  setFormDisabled(userForm, !canManageUsers);
  auditBtn.disabled = !canViewAudit;
  customersBtn.disabled = !canViewMaskedCustomers;
  renderProducts();
  renderCart();
}

function showApp(isSignedIn) {
  authScreen.hidden = isSignedIn;
  appShell.hidden = !isSignedIn;
  logoutBtn.hidden = !isSignedIn;
}

function setAuthMode(mode) {
  const isRegister = mode === "register";
  loginForm.hidden = isRegister;
  registerForm.hidden = !isRegister;
  demoUsers.hidden = isRegister;
  authTitle.textContent = isRegister ? "Create Account" : "Welcome Back";
  authHint.textContent = isRegister
    ? "Register a customer account to shop and place orders."
    : "Use your assigned demo account to access the correct role view.";
  authTabs.forEach((button) => {
    button.classList.toggle("active", button.dataset.authMode === mode);
  });
}

function resetSessionUi() {
  productRows.innerHTML = "";
  orderRows.innerHTML = "";
  staffOrderRows.innerHTML = "";
  userRows.innerHTML = "";
  securityOutput.textContent = "Security test output appears here.";
  productForm.reset();
  orderForm.reset();
  userForm.reset();
  cart = [];
  renderCart();
}

function prepareRoleInputs(role) {
  resetSessionUi();
  applyRoleUi(role);
  if (role === "Admin" || role === "InventoryOfficer") {
    productForm.elements.sku.value = makeSku();
  }
}

async function loadMe() {
  try {
    const data = await api("/api/auth/me");
    sessionLabel.textContent = `${data.user.name} (${data.user.role})`;
    currentUser = data.user;
    showApp(true);
    return data.user;
  } catch {
    sessionLabel.textContent = "Not signed in";
    currentUser = null;
    showApp(false);
    return null;
  }
}

function productVisual(product) {
  const category = product.Category || "Fashion";
  const imageUrl = productImageUrl(product);
  return `
    <div class="product-art" data-category="${category}">
      <img src="${imageUrl}" alt="${product.Name}" loading="lazy" />
      <span>${category}</span>
    </div>
  `;
}

function productImageUrl(product) {
  const name = `${product.Name || ""} ${product.Category || ""}`.toLowerCase();

  if (name.includes("bag") || name.includes("crossbody")) {
    return "https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=900&q=80";
  }

  if (name.includes("blazer") || name.includes("outerwear") || name.includes("jacket")) {
    return "https://images.unsplash.com/photo-1543076447-215ad9ba6923?auto=format&fit=crop&w=900&q=80";
  }

  if (name.includes("skirt")) {
    return "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80";
  }

  if (name.includes("dress")) {
    return "https://images.unsplash.com/photo-1495385794356-15371f348c31?auto=format&fit=crop&w=900&q=80";
  }

  return "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=900&q=80";
}

function filteredProducts() {
  if (activeCategory === "All") return products;
  return products.filter((product) => product.Category === activeCategory);
}

function renderProducts() {
  const visibleProducts = filteredProducts();
  productGrid.innerHTML = "";
  productRows.innerHTML = "";

  if (visibleProducts.length === 0) {
    productGrid.innerHTML = `<div class="empty-state">No products available in this category.</div>`;
  }

  visibleProducts.forEach((product) => {
    const canAddToCart = currentUser?.role === "Customer" && Number(product.StockQty) > 0;
    const card = document.createElement("article");
    card.className = "product-card";
    card.innerHTML = `
      ${productVisual(product)}
      <div class="product-copy">
        <div>
          <p class="product-category">${product.Category}</p>
          <h3>${product.Name}</h3>
        </div>
        <p class="product-meta">${product.SKU} · ${product.StockQty} in stock</p>
        <div class="product-footer">
          <strong>RM ${Number(product.Price).toFixed(2)}</strong>
          <button data-cart="${product.ProductID}" type="button" ${canAddToCart ? "" : "disabled"}>Add to cart</button>
        </div>
      </div>
    `;
    productGrid.append(card);

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${product.ProductID}</td>
      <td>${product.Name}</td>
      <td>${product.SKU}</td>
      <td>RM ${Number(product.Price).toFixed(2)}</td>
      <td>${product.StockQty}</td>
      <td>
        <div class="stock-delete">
          <input
            aria-label="Quantity to delete for ${product.Name}"
            data-delete-qty="${product.ProductID}"
            type="number"
            min="1"
            max="${product.StockQty}"
            step="1"
            value="1"
            ${currentUser?.role === "Admin" ? "" : "disabled"}
          />
          <button class="danger" data-delete="${product.ProductID}" type="button" ${currentUser?.role === "Admin" ? "" : "disabled"}>Delete Qty</button>
        </div>
      </td>
    `;
    productRows.append(row);
  });
}

function renderCart() {
  cartRows.innerHTML = "";
  const canCheckout = currentUser?.role === "Customer" && cart.length > 0;

  cartCount.textContent = `${cart.reduce((sum, item) => sum + item.quantity, 0)} item${cart.length === 1 ? "" : "s"}`;

  if (cart.length === 0) {
    cartRows.innerHTML = `<div class="empty-state">Your cart is empty. Sign in as Customer and add products from the catalog.</div>`;
  }

  cart.forEach((item) => {
    const product = products.find((entry) => entry.ProductID === item.productId);
    if (!product) return;
    const row = document.createElement("div");
    row.className = "cart-item";
    row.innerHTML = `
      <div>
        <strong>${product.Name}</strong>
        <span>RM ${Number(product.Price).toFixed(2)} · ${product.ProductID}</span>
      </div>
      <div class="cart-actions">
        <button data-cart-minus="${product.ProductID}" type="button">-</button>
        <span>${item.quantity}</span>
        <button data-cart-plus="${product.ProductID}" type="button">+</button>
        <button class="ghost-button" data-cart-remove="${product.ProductID}" type="button">Remove</button>
      </div>
    `;
    cartRows.append(row);
  });

  [...orderForm.elements].forEach((element) => {
    element.disabled = !canCheckout;
  });
}

async function loadProducts() {
  const data = await api("/api/products");
  products = data.products;
  renderProducts();
  renderCart();
}

async function loadOrders() {
  if (!currentUser) {
    orderRows.innerHTML = "";
    staffOrderRows.innerHTML = "";
    return;
  }

  const data = await api("/api/orders");
  orderRows.innerHTML = "";
  staffOrderRows.innerHTML = "";

  if (currentUser.role === "Customer") {
    data.orders.forEach((order) => {
      const item = document.createElement("div");
      item.textContent = `${order.OrderID} - ${order.ProductName} x ${order.Quantity} - RM ${Number(order.TotalAmount).toFixed(2)} - ${order.Status}`;
      orderRows.append(item);
    });
    return;
  }

  if (!["Admin", "InventoryOfficer"].includes(currentUser.role)) return;

  if (data.orders.length === 0) {
    const item = document.createElement("div");
    item.className = "empty-state";
    item.textContent = "No customer orders found.";
    staffOrderRows.append(item);
    return;
  }

  data.orders.forEach((order) => {
    const isPending = order.Status === "Pending";
    const statusLabel = order.Status === "Paid" ? "Approved" : order.Status === "Cancelled" ? "Rejected" : order.Status;
    const item = document.createElement("div");
    item.className = "approval-item";
    item.innerHTML = `
      <div>
        <strong>${order.OrderID} - ${order.ProductName}</strong>
        <span>${order.UserID} · Qty ${order.Quantity} · RM ${Number(order.TotalAmount).toFixed(2)} · ${order.Status}</span>
      </div>
      ${
        isPending
          ? `<div class="approval-actions">
              <button data-order-status="Paid" data-order-id="${order.OrderID}" type="button">Approve</button>
              <button class="danger" data-order-status="Cancelled" data-order-id="${order.OrderID}" type="button">Reject</button>
            </div>`
          : `<span class="status-pill">${statusLabel}</span>`
      }
    `;
    staffOrderRows.append(item);
  });
}

function renderUsers() {
  userRows.innerHTML = "";

  if (users.length === 0) {
    userRows.innerHTML = `<tr><td colspan="6">No users found.</td></tr>`;
    return;
  }

  users.forEach((user) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${user.UserID}</td>
      <td>${user.FirstName} ${user.LastName}</td>
      <td>${user.Email}</td>
      <td>${user.Role}</td>
      <td>${user.IsActive ? "Active" : "Inactive"}</td>
      <td>
        <div class="row-actions">
          <button data-user-edit="${user.UserID}" type="button">Edit</button>
          <button class="danger" data-user-delete="${user.UserID}" type="button" ${user.UserID === currentUser?.userId ? "disabled" : ""}>Delete</button>
        </div>
      </td>
    `;
    userRows.append(row);
  });
}

async function loadUsers() {
  if (currentUser?.role !== "Admin") {
    users = [];
    renderUsers();
    return;
  }

  const data = await api("/api/users");
  users = data.users;
  renderUsers();
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  try {
    await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(form))
    });
    showToast("Signed in");
    const user = await loadMe();
    prepareRoleInputs(user?.role);
    await Promise.allSettled([loadProducts(), loadOrders(), loadUsers()]);
  } catch (error) {
    showToast(error.message);
  }
});

clearUserFormBtn.addEventListener("click", () => {
  userForm.reset();
  userForm.elements.userId.value = "";
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);

  try {
    await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(form))
    });
    loginForm.elements.email.value = form.get("email");
    loginForm.elements.password.value = form.get("password");
    registerForm.reset();
    setAuthMode("login");
    showToast("Account created. Sign in to continue.");
  } catch (error) {
    showToast(error.message);
  }
});

authTabs.forEach((button) => {
  button.addEventListener("click", () => setAuthMode(button.dataset.authMode));
});

document.querySelectorAll(".quick-login").forEach((button) => {
  button.addEventListener("click", () => {
    setAuthMode("login");
    loginForm.elements.email.value = button.dataset.email;
    loginForm.elements.password.value = "Password@123";
  });
});

logoutBtn.addEventListener("click", async () => {
  try {
    await api("/api/auth/logout", { method: "POST" });
    sessionLabel.textContent = "Not signed in";
    currentUser = null;
    resetSessionUi();
    applyRoleUi(null);
    showApp(false);
    await loadProducts();
    showToast("Signed out");
  } catch (error) {
    sessionLabel.textContent = "Not signed in";
    currentUser = null;
    resetSessionUi();
    applyRoleUi(null);
    showApp(false);
    showToast(error.message);
  }
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeCategory = button.dataset.category;
    filterButtons.forEach((entry) => entry.classList.toggle("active", entry === button));
    renderProducts();
  });
});

productGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-cart]");
  if (!button) return;

  if (currentUser?.role !== "Customer") {
    showToast("Sign in as Customer to add products to cart.");
    return;
  }

  const product = products.find((entry) => entry.ProductID === button.dataset.cart);
  if (!product || Number(product.StockQty) < 1) {
    showToast("This product is out of stock.");
    return;
  }

  const existing = cart.find((item) => item.productId === product.ProductID);
  if (existing) {
    if (existing.quantity >= Number(product.StockQty)) {
      showToast("No more stock available for this item.");
      return;
    }
    existing.quantity += 1;
  } else {
    cart.push({ productId: product.ProductID, quantity: 1 });
  }
  renderCart();
});

cartRows.addEventListener("click", (event) => {
  const plus = event.target.closest("[data-cart-plus]");
  const minus = event.target.closest("[data-cart-minus]");
  const remove = event.target.closest("[data-cart-remove]");
  const productId = plus?.dataset.cartPlus || minus?.dataset.cartMinus || remove?.dataset.cartRemove;
  if (!productId) return;

  const item = cart.find((entry) => entry.productId === productId);
  const product = products.find((entry) => entry.ProductID === productId);
  if (!item || !product) return;

  if (plus) {
    if (item.quantity >= Number(product.StockQty)) {
      showToast("No more stock available for this item.");
      return;
    }
    item.quantity += 1;
  }

  if (minus) {
    item.quantity -= 1;
  }

  if (remove || item.quantity < 1) {
    cart = cart.filter((entry) => entry.productId !== productId);
  }

  renderCart();
});

productForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const payload = Object.fromEntries(form);
  payload.price = Number(payload.price);
  payload.stockQty = Number(payload.stockQty);

  try {
    const data = await api("/api/products", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    showToast(`Inserted ${data.productId}`);
    productForm.reset();
    productForm.elements.sku.value = makeSku();
    await loadProducts();
  } catch (error) {
    showToast(error.message);
  }
});

productRows.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-delete]");
  if (!button) return;
  const product = products.find((entry) => entry.ProductID === button.dataset.delete);
  const qtyInput = productRows.querySelector(`[data-delete-qty="${button.dataset.delete}"]`);
  const quantity = Number(qtyInput?.value);

  if (!Number.isInteger(quantity) || quantity < 1) {
    showToast("Delete quantity must be at least 1.");
    return;
  }

  if (product && quantity > Number(product.StockQty)) {
    showToast("Delete quantity cannot be more than current stock.");
    return;
  }

  try {
    const data = await api(`/api/products/${button.dataset.delete}`, {
      method: "DELETE",
      body: JSON.stringify({ quantity })
    });
    showToast(data.remainingStock === 0 ? "Product deleted" : `${quantity} unit(s) removed`);
    await loadProducts();
  } catch (error) {
    showToast(error.message);
  }
});

userRows.addEventListener("click", async (event) => {
  const editButton = event.target.closest("[data-user-edit]");
  const deleteButton = event.target.closest("[data-user-delete]");

  if (editButton) {
    const user = users.find((entry) => entry.UserID === editButton.dataset.userEdit);
    if (!user) return;

    userForm.elements.userId.value = user.UserID;
    userForm.elements.role.value = user.Role;
    userForm.elements.email.value = user.Email;
    userForm.elements.firstName.value = user.FirstName;
    userForm.elements.lastName.value = user.LastName;
    userForm.elements.phoneNumber.value = user.PhoneNumber || "";
    userForm.elements.addressLine1.value = user.AddressLine1 || "";
    userForm.elements.city.value = user.City || "";
    userForm.elements.state.value = user.State || "";
    userForm.elements.postcode.value = user.Postcode || "";
    userForm.elements.password.value = "";
    userForm.elements.isActive.value = user.IsActive ? "true" : "false";
    userForm.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  if (!deleteButton) return;

  try {
    await api(`/api/users/${deleteButton.dataset.userDelete}`, { method: "DELETE" });
    showToast("User deleted");
    await loadUsers();
  } catch (error) {
    showToast(error.message);
  }
});

userForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const userId = form.get("userId");

  if (!userId) {
    showToast("Select a user to edit first.");
    return;
  }

  const payload = Object.fromEntries(form);
  delete payload.userId;
  if (!payload.password) delete payload.password;
  payload.isActive = payload.isActive === "true";

  try {
    await api(`/api/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
    showToast("User updated");
    userForm.reset();
    userForm.elements.userId.value = "";
    await loadUsers();
  } catch (error) {
    showToast(error.message);
  }
});

orderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const shippingAddress = form.get("shippingAddress");

  if (cart.length === 0) {
    showToast("Add at least one product to cart.");
    return;
  }

  try {
    for (const item of cart) {
      await api("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          productId: item.productId,
          quantity: item.quantity,
          shippingAddress
        })
      });
    }
    showToast("Order placed");
    cart = [];
    orderForm.reset();
    await Promise.allSettled([loadProducts(), loadOrders(), loadUsers()]);
  } catch (error) {
    showToast(error.message);
  }
});

staffOrderRows.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-order-status]");
  if (!button) return;

  try {
    const data = await api(`/api/orders/${button.dataset.orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: button.dataset.orderStatus })
    });
    showToast(data.status === "Paid" ? "Order approved" : "Order rejected");
    await Promise.allSettled([loadProducts(), loadOrders()]);
  } catch (error) {
    showToast(error.message);
  }
});

auditBtn.addEventListener("click", async () => {
  try {
    const data = await api("/api/security/audit");
    securityOutput.textContent = JSON.stringify(data.auditLogs, null, 2);
  } catch (error) {
    securityOutput.textContent = "Security test output appears here.";
    showToast(error.message);
  }
});

customersBtn.addEventListener("click", async () => {
  try {
    const data = await api("/api/security/masked-customers");
    securityOutput.textContent = JSON.stringify(data.customers, null, 2);
  } catch (error) {
    securityOutput.textContent = "Security test output appears here.";
    showToast(error.message);
  }
});

resetSessionUi();
applyRoleUi(null);
setAuthMode("login");
showApp(false);
loadMe().then(async (user) => {
  prepareRoleInputs(user?.role);
  await Promise.allSettled([loadProducts(), loadOrders(), loadUsers()]);
});

import { useState, useEffect } from "react";
import axios from "axios";
import "./index.css";

const AUTH_API = "http://localhost:5000/api/auth";
const PRODUCT_API = "http://localhost:5000/api/products";
const SUBSCRIPTION_API = "http://localhost:5000/api/subscriptions";
const INVOICE_API = "http://localhost:5000/api/invoices";
const PAYMENT_API = "http://localhost:5000/api/payments";
const DISCOUNT_API = "http://localhost:5000/api/discounts";

function App() {
  const [page, setPage] = useState("login");

  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user") || "null")
  );

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    price: "",
    status: "Active",
  });

  const [planForm, setPlanForm] = useState({
    product_id: "",
    name: "",
    billing_cycle: "monthly",
    price: "",
  });

  const [subscriptionForm, setSubscriptionForm] = useState({
    customer_id: "",
    plan_id: "",
    start_date: "",
    end_date: "",
    notes: "",
  });

  const [invoiceForm, setInvoiceForm] = useState({
    subscription_id: "",
    due_date: "",
    tax_rate: "0",
  });
  const [paymentForm, setPaymentForm] = useState({
  invoice_id: "",
  amount: "",
  payment_method: "UPI",
  notes: "",
});
const [discounts, setDiscounts] = useState([]);

const [discountForm, setDiscountForm] = useState({
  name: "",
  discount_type: "percentage",
  discount_value: "",
  plan_id: "",
});

const [discountMessage, setDiscountMessage] = useState("");

const [payments, setPayments] = useState([]);
  

  const [products, setProducts] = useState([]);
  const [plans, setPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);

  const [message, setMessage] = useState("");
  const [productMessage, setProductMessage] = useState("");
  const [planMessage, setPlanMessage] = useState("");
  const [subscriptionMessage, setSubscriptionMessage] = useState("");
  const [invoiceMessage, setInvoiceMessage] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [plansLoading, setPlansLoading] = useState(false);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
const [paymentLoading, setPaymentLoading] = useState(false);
  const token = localStorage.getItem("token");

  function authHeaders() {
    return {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    };
  }

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  function handleProductChange(e) {
    setProductForm({
      ...productForm,
      [e.target.name]: e.target.value,
    });
  }

  function handlePlanChange(e) {
    setPlanForm({
      ...planForm,
      [e.target.name]: e.target.value,
    });
  }

  function handleSubscriptionChange(e) {
    setSubscriptionForm({
      ...subscriptionForm,
      [e.target.name]: e.target.value,
    });
  }

  function handleInvoiceChange(e) {
    setInvoiceForm({
      ...invoiceForm,
      [e.target.name]: e.target.value,
    });
  }
  // Load discount rules
async function fetchDiscounts() {
  if (!["admin", "staff"].includes(user?.role)) return;

  try {
    const response = await axios.get(DISCOUNT_API, {
      headers: authHeaders(),
    });

    setDiscounts(Array.isArray(response.data) ? response.data : []);
  } catch (error) {
    setDiscountMessage(
      error.response?.data?.message || "Unable to load discounts."
    );
  }
}

// Create discount rule
async function handleCreateDiscount(e) {
  e.preventDefault();
  setDiscountMessage("");

  try {
    await axios.post(
      DISCOUNT_API,
      {
        name: discountForm.name.trim(),
        discount_type: discountForm.discount_type,
        discount_value: Number(discountForm.discount_value),
        plan_id: discountForm.plan_id || null,
      },
      {
        headers: authHeaders(),
      }
    );

    setDiscountMessage("Discount created successfully.");

    setDiscountForm({
      name: "",
      discount_type: "percentage",
      discount_value: "",
      plan_id: "",
    });

    await fetchDiscounts();
  } catch (error) {
    setDiscountMessage(
      error.response?.data?.message || "Unable to create discount."
    );
  }
}

// Activate or deactivate a discount
async function handleDiscountStatusChange(discountId, status) {
  setDiscountMessage("");

  try {
    await axios.patch(
      `${DISCOUNT_API}/${discountId}/status`,
      { status },
      {
        headers: authHeaders(),
      }
    );

    setDiscountMessage("Discount status updated.");

    await fetchDiscounts();
  } catch (error) {
    setDiscountMessage(
      error.response?.data?.message ||
        "Unable to update discount status."
    );
  }
}
 
async function handleRecordPayment(e) {
  e.preventDefault();
  setPaymentMessage("");
  setPaymentLoading(true);

  try {
    await axios.post(
      "http://localhost:5000/api/payments",
      {
        invoice_id: Number(paymentForm.invoice_id),
        amount: Number(paymentForm.amount),
        payment_method: paymentForm.payment_method,
        notes: paymentForm.notes,
      },
      { headers: authHeaders() }
    );

    setPaymentMessage("Payment recorded successfully.");

    setPaymentForm({
      invoice_id: "",
      amount: "",
      payment_method: "UPI",
      notes: "",
    });

    await fetchInvoices();
    await fetchPayments();
  } catch (error) {
    setPaymentMessage(
      error.response?.data?.error ||
        error.response?.data?.message ||
        "Unable to record payment."
    );
  } finally {
    setPaymentLoading(false);
  }
}

  // Load products
  async function fetchProducts() {
    const savedToken = localStorage.getItem("token");
    if (!savedToken) return;

    setProductsLoading(true);
    setProductMessage("");

    try {
      const response = await axios.get(PRODUCT_API, {
        headers: authHeaders(),
      });

      const data = response.data;
      setProducts(Array.isArray(data) ? data : data.products || []);
    } catch (error) {
      setProductMessage(
        error.response?.data?.message || "Unable to load products."
      );
    } finally {
      setProductsLoading(false);
    }
  }

  // Load subscription plans
  async function fetchPlans() {
    const savedToken = localStorage.getItem("token");
    if (!savedToken) return;

    setPlansLoading(true);
    setPlanMessage("");

    try {
      const response = await axios.get(`${PRODUCT_API}/plans`, {
        headers: authHeaders(),
      });

      const data = response.data;
      setPlans(Array.isArray(data) ? data : data.plans || []);
    } catch (error) {
      setPlanMessage(
        error.response?.data?.message ||
          "Unable to load subscription plans."
      );
    } finally {
      setPlansLoading(false);
    }
  }

  // Load subscriptions
  async function fetchSubscriptions() {
    const savedToken = localStorage.getItem("token");
    if (!savedToken) return;

    setSubscriptionsLoading(true);
    setSubscriptionMessage("");

    try {
      const response = await axios.get(SUBSCRIPTION_API, {
        headers: authHeaders(),
      });

      const data = response.data;

      setSubscriptions(
        Array.isArray(data) ? data : data.subscriptions || []
      );
    } catch (error) {
      setSubscriptionMessage(
        error.response?.data?.message ||
          "Unable to load subscriptions."
      );
    } finally {
      setSubscriptionsLoading(false);
    }
  }

  // Load customers for admin/staff
  async function fetchCustomers() {
    if (!["admin", "staff"].includes(user?.role)) return;

    try {
      const response = await axios.get(
        `${SUBSCRIPTION_API}/customers`,
        {
          headers: authHeaders(),
        }
      );

      const data = response.data;
      setCustomers(Array.isArray(data) ? data : data.customers || []);
    } catch (error) {
      setSubscriptionMessage(
        error.response?.data?.message ||
          "Unable to load customers. Check the /customers API route."
      );
    }
  }

  // Load invoices
  async function fetchInvoices() {
    const savedToken = localStorage.getItem("token");
    if (!savedToken) return;

    setInvoiceLoading(true);
    setInvoiceMessage("");

    try {
      const response = await axios.get(INVOICE_API, {
        headers: authHeaders(),
      });

      const data = response.data;

      setInvoices(
        Array.isArray(data) ? data : data.invoices || []
      );
    } catch (error) {
      setInvoiceMessage(
        error.response?.data?.message ||
          "Unable to load invoices."
      );
    } finally {
      setInvoiceLoading(false);
    }
  }
    // Load payments
  async function fetchPayments() {
    const savedToken = localStorage.getItem("token");
    if (!savedToken) return;

    setPaymentLoading(true);
    setPaymentMessage("");

    try {
      const response = await axios.get(PAYMENT_API, {
        headers: authHeaders(),
      });

      const data = response.data;
      setPayments(Array.isArray(data) ? data : data.payments || []);
    } catch (error) {
      setPaymentMessage(
        error.response?.data?.error ||
          error.response?.data?.message ||
          "Unable to load payments."
      );
    } finally {
      setPaymentLoading(false);
    }
  }

  // Load dashboard data after login
  useEffect(() => {
    if (!user) return;

    fetchSubscriptions();
    fetchInvoices();
    fetchPayments();
    fetchDiscounts();

    if (user.role === "admin") {
      fetchProducts();
      fetchPlans();
    }

    if (["admin", "staff"].includes(user.role)) {
      fetchCustomers();
      fetchPlans();
    }
  }, [user]);

  // Login and registration
  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      if (page === "register") {
        await axios.post(`${AUTH_API}/register`, form);

        setMessage("Registration successful! Please login.");
        setPage("login");

        setForm({
          name: "",
          email: form.email,
          password: "",
        });
      } else {
        const response = await axios.post(`${AUTH_API}/login`, {
          email: form.email,
          password: form.password,
        });

        localStorage.setItem("token", response.data.token);
        localStorage.setItem(
          "user",
          JSON.stringify(response.data.user)
        );

        setUser(response.data.user);
        setMessage("");
      }
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  // Create product
  async function handleAddProduct(e) {
    e.preventDefault();
    setProductMessage("");

    try {
      await axios.post(
        PRODUCT_API,
        {
          name: productForm.name,
          description: productForm.description,
          price: Number(productForm.price),
          status: productForm.status,
        },
        {
          headers: authHeaders(),
        }
      );

      setProductMessage("Product added successfully!");

      setProductForm({
        name: "",
        description: "",
        price: "",
        status: "Active",
      });

      await fetchProducts();
    } catch (error) {
      setProductMessage(
        error.response?.data?.message || "Unable to add product."
      );
    }
  }

  // Delete product
  async function handleDeleteProduct(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this product?"
    );

    if (!confirmed) return;

    setProductMessage("");

    try {
      await axios.delete(`${PRODUCT_API}/${id}`, {
        headers: authHeaders(),
      });

      setProductMessage("Product deleted successfully!");

      await fetchProducts();
      await fetchPlans();
    } catch (error) {
      setProductMessage(
        error.response?.data?.message ||
          "Unable to delete product."
      );
    }
  }

  // Create subscription plan
  async function handleAddPlan(e) {
    e.preventDefault();
    setPlanMessage("");

    try {
      await axios.post(
        `${PRODUCT_API}/plans`,
        {
          product_id: Number(planForm.product_id),
          name: planForm.name,
          billing_cycle: planForm.billing_cycle,
          price: Number(planForm.price),
        },
        {
          headers: authHeaders(),
        }
      );

      setPlanMessage("Subscription plan created successfully!");

      setPlanForm({
        product_id: "",
        name: "",
        billing_cycle: "monthly",
        price: "",
      });

      await fetchPlans();
    } catch (error) {
      setPlanMessage(
        error.response?.data?.message ||
          "Unable to create subscription plan."
      );
    }
  }

  // Create subscription
  async function handleAddSubscription(e) {
    e.preventDefault();
    setSubscriptionMessage("");

    try {
      await axios.post(
        SUBSCRIPTION_API,
        {
          customer_id: Number(subscriptionForm.customer_id),
          plan_id: Number(subscriptionForm.plan_id),
          start_date: subscriptionForm.start_date,
          end_date: subscriptionForm.end_date || null,
          notes: subscriptionForm.notes,
        },
        {
          headers: authHeaders(),
        }
      );

      setSubscriptionMessage("Subscription created successfully!");

      setSubscriptionForm({
        customer_id: "",
        plan_id: "",
        start_date: "",
        end_date: "",
        notes: "",
      });

      await fetchSubscriptions();
    } catch (error) {
      setSubscriptionMessage(
        error.response?.data?.message ||
          "Unable to create subscription."
      );
    }
  }

  // Update subscription status
  async function handleStatusChange(id, status) {
    setSubscriptionMessage("");

    try {
      await axios.patch(
        `${SUBSCRIPTION_API}/${id}/status`,
        { status },
        {
          headers: authHeaders(),
        }
      );

      setSubscriptionMessage("Subscription status updated.");
      await fetchSubscriptions();
    } catch (error) {
      setSubscriptionMessage(
        error.response?.data?.message ||
          "Unable to update subscription status."
      );
    }
  }

  // Create invoice
  async function handleCreateInvoice(e) {
    e.preventDefault();
    setInvoiceMessage("");

    try {
      await axios.post(
        INVOICE_API,
        {
          subscription_id: Number(invoiceForm.subscription_id),
          due_date: invoiceForm.due_date || null,
          tax_rate: Number(invoiceForm.tax_rate) || 0,
        },
        {
          headers: authHeaders(),
        }
      );

      setInvoiceMessage("Invoice created successfully!");

      setInvoiceForm({
        subscription_id: "",
        due_date: "",
        tax_rate: "0",
      });

      await fetchInvoices();
    } catch (error) {
      setInvoiceMessage(
        error.response?.data?.message ||
          "Unable to create invoice."
      );
    }
  }

  // Update invoice status
  async function handleInvoiceStatusChange(id, status) {
    setInvoiceMessage("");

    try {
      await axios.patch(
        `${INVOICE_API}/${id}/status`,
        { status },
        {
          headers: authHeaders(),
        }
      );

      setInvoiceMessage("Invoice status updated.");
      await fetchInvoices();
    } catch (error) {
      setInvoiceMessage(
        error.response?.data?.message ||
          "Unable to update invoice status."
      );
    }
  }

  // Logout
  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setUser(null);
    setProducts([]);
    setPlans([]);
    setSubscriptions([]);
    setCustomers([]);
    setInvoices([]);

    setPage("login");
  }

  // Dashboard
  if (user) {
    return (
      <div className="dashboard">
        <header className="topbar">
          <h2>Brightloop Software</h2>

          <button onClick={logout} className="logout">
            Logout
          </button>
        </header>

        <div className="welcome">
          <h1>Welcome, {user.name}</h1>

          <p>
            You are logged in as{" "}
            <strong>{user.role.toUpperCase()}</strong>
          </p>
        </div>

        <div className="role-card">
          <h2>{user.role} Dashboard</h2>

          {user.role === "admin" && (
            <p>
              Manage products, plans, subscriptions, invoices,
              taxes and discounts.
            </p>
          )}

          {user.role === "staff" && (
            <p>
              Manage customers, quotations, subscriptions,
              invoices and payments.
            </p>
          )}

          {user.role === "customer" && (
            <p>View your subscriptions and invoices.</p>
          )}
        </div>
        {/* DASHBOARD SUMMARY */}
<section className="role-card">
  <h2>Business Overview</h2>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: "16px",
    }}
  >
    <div className="role-card">
      <h3>Active Subscriptions</h3>
      <h2>
        {
          subscriptions.filter(
            (subscription) =>
              subscription.status?.toLowerCase() === "active"
          ).length
        }
      </h2>
    </div>

    <div className="role-card">
      <h3>Revenue Received</h3>
      <h2>
        ₹
        {invoices
          .filter((invoice) => invoice.status?.toLowerCase() === "paid")
          .reduce(
            (total, invoice) => total + Number(invoice.amount || 0),
            0
          )
          .toFixed(2)}
      </h2>
    </div>

    <div className="role-card">
      <h3>Outstanding Invoices</h3>
      <h2>
        ₹
        {invoices
          .filter((invoice) => invoice.status?.toLowerCase() !== "paid")
          .reduce(
            (total, invoice) => total + Number(invoice.amount || 0),
            0
          )
          .toFixed(2)}
      </h2>
    </div>

    <div className="role-card">
      <h3>Overdue Invoices</h3>
      <h2>
        {
          invoices.filter(
            (invoice) =>
              invoice.status?.toLowerCase() !== "paid" &&
              invoice.due_date &&
              new Date(invoice.due_date) < new Date()
          ).length
        }
      </h2>
    </div>
  </div>
</section>

        {/* ADMIN PRODUCT MANAGEMENT */}
        {user.role === "admin" && (
          <>
            <section className="role-card">
              <h2>Product Management</h2>

              <form onSubmit={handleAddProduct}>
                <input
                  name="name"
                  placeholder="Product name"
                  value={productForm.name}
                  onChange={handleProductChange}
                  required
                />

                <input
                  name="description"
                  placeholder="Description or notes"
                  value={productForm.description}
                  onChange={handleProductChange}
                />

                <input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Sales price"
                  value={productForm.price}
                  onChange={handleProductChange}
                  required
                />

                <select
                  name="status"
                  value={productForm.status}
                  onChange={handleProductChange}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>

                <button type="submit">Add Product</button>
              </form>

              {productMessage && (
                <p className="message">{productMessage}</p>
              )}

              <h3>Products</h3>

              {productsLoading ? (
                <p>Loading products...</p>
              ) : products.length === 0 ? (
                <p>No products added yet.</p>
              ) : (
                <div>
                  {products.map((product) => (
                    <div
                      key={product.id}
                      style={{
                        border: "1px solid #ddd",
                        borderRadius: "8px",
                        padding: "12px",
                        marginBottom: "10px",
                      }}
                    >
                      <h3>{product.name}</h3>

                      <p>
                        {product.description || "No description"}
                      </p>

                      <p>
                        Price: ₹
                        {Number(product.price).toFixed(2)}
                      </p>

                      <p>Status: {product.status}</p>

                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteProduct(product.id)
                        }
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ADMIN SUBSCRIPTION PLANS */}
            <section className="role-card">
              <h2>Subscription Plans</h2>

              <form onSubmit={handleAddPlan}>
                <select
                  name="product_id"
                  value={planForm.product_id}
                  onChange={handlePlanChange}
                  required
                >
                  <option value="">Select product</option>

                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>

                <input
                  name="name"
                  placeholder="Plan name"
                  value={planForm.name}
                  onChange={handlePlanChange}
                  required
                />

                <select
                  name="billing_cycle"
                  value={planForm.billing_cycle}
                  onChange={handlePlanChange}
                  required
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>

                <input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Plan price"
                  value={planForm.price}
                  onChange={handlePlanChange}
                  required
                />

                <button type="submit">Create Plan</button>
              </form>

              {planMessage && (
                <p className="message">{planMessage}</p>
              )}

              <h3>Existing Plans</h3>

              {plansLoading ? (
                <p>Loading plans...</p>
              ) : plans.length === 0 ? (
                <p>No subscription plans created yet.</p>
              ) : (
                <div>
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      style={{
                        border: "1px solid #ddd",
                        borderRadius: "8px",
                        padding: "12px",
                        marginBottom: "10px",
                      }}
                    >
                      <h3>{plan.name}</h3>

                      <p>Product: {plan.product_name}</p>
                      <p>Billing cycle: {plan.billing_cycle}</p>

                      <p>
                        Price: ₹
                        {Number(plan.price).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/* SUBSCRIPTION MANAGEMENT */}
        <section className="role-card">
          <h2>
            {user.role === "customer"
              ? "My Subscriptions"
              : "Subscription Management"}
          </h2>

          {["admin", "staff"].includes(user.role) && (
            <>
              <h3>Create Subscription</h3>

              <form onSubmit={handleAddSubscription}>
                <select
                  name="customer_id"
                  value={subscriptionForm.customer_id}
                  onChange={handleSubscriptionChange}
                  required
                >
                  <option value="">Select customer</option>

                  {customers.map((customer) => (
                    <option
                      key={customer.id}
                      value={customer.id}
                    >
                      {customer.name} — {customer.email}
                    </option>
                  ))}
                </select>

                <select
                  name="plan_id"
                  value={subscriptionForm.plan_id}
                  onChange={handleSubscriptionChange}
                  required
                >
                  <option value="">Select subscription plan</option>

                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} — ₹
                      {Number(plan.price).toFixed(2)} /{" "}
                      {plan.billing_cycle}
                    </option>
                  ))}
                </select>

                <label>Start date</label>
                <input
                  name="start_date"
                  type="date"
                  value={subscriptionForm.start_date}
                  onChange={handleSubscriptionChange}
                  required
                />

                <label>End date (optional)</label>
                <input
                  name="end_date"
                  type="date"
                  value={subscriptionForm.end_date}
                  onChange={handleSubscriptionChange}
                />

                <textarea
                  name="notes"
                  placeholder="Notes"
                  value={subscriptionForm.notes}
                  onChange={handleSubscriptionChange}
                />

                <button type="submit">
                  Create Subscription
                </button>
              </form>
            </>
          )}

          {subscriptionMessage && (
            <p className="message">{subscriptionMessage}</p>
          )}

          <h3>Subscriptions</h3>

          {subscriptionsLoading ? (
            <p>Loading subscriptions...</p>
          ) : subscriptions.length === 0 ? (
            <p>No subscriptions found.</p>
          ) : (
            <div>
              {subscriptions.map((subscription) => (
                <div
                  key={subscription.id}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    padding: "12px",
                    marginBottom: "10px",
                  }}
                >
                  <h3>
                    {subscription.plan_name ||
                      `Plan #${subscription.plan_id}`}
                  </h3>

                  {subscription.customer_name && (
                    <p>
                      Customer: {subscription.customer_name}
                    </p>
                  )}

                  {subscription.customer_email && (
                    <p>
                      Email: {subscription.customer_email}
                    </p>
                  )}

                  <p>
                    Product: {subscription.product_name || "—"}
                  </p>

                  <p>
                    Start date: {subscription.start_date}
                  </p>

                  <p>
                    End date: {subscription.end_date || "—"}
                  </p>

                  <p>
                    Price: ₹
                    {Number(
                      subscription.plan_price ??
                        subscription.price ??
                        0
                    ).toFixed(2)}
                  </p>

                  <p>Status: {subscription.status}</p>

                  {subscription.notes && (
                    <p>Notes: {subscription.notes}</p>
                  )}

                  {["admin", "staff"].includes(user.role) && (
                    <div>
                      <label>Update status</label>

                      <select
                        value={subscription.status}
                        onChange={(e) =>
                          handleStatusChange(
                            subscription.id,
                            e.target.value
                          )
                        }
                      >
                        <option value="Draft">Draft</option>
                        <option value="Quotation">Quotation</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Active">Active</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
        {/* DISCOUNT MANAGEMENT */}
{["admin", "staff"].includes(user.role) && (
  <section className="role-card">
    <h2>Discount Management</h2>

    <h3>Create Discount Rule</h3>

    <form onSubmit={handleCreateDiscount}>
      <input
        name="name"
        placeholder="Discount name"
        value={discountForm.name}
        onChange={(e) =>
          setDiscountForm({
            ...discountForm,
            name: e.target.value,
          })
        }
        required
      />

      <label>Discount type</label>

      <select
        value={discountForm.discount_type}
        onChange={(e) =>
          setDiscountForm({
            ...discountForm,
            discount_type: e.target.value,
          })
        }
      >
        <option value="percentage">Percentage (%)</option>
        <option value="fixed">Fixed amount (₹)</option>
      </select>

      <input
        type="number"
        min="0.01"
        max={
          discountForm.discount_type === "percentage"
            ? "100"
            : undefined
        }
        step="0.01"
        name="discount_value"
        placeholder={
          discountForm.discount_type === "percentage"
            ? "Percentage value"
            : "Amount in ₹"
        }
        value={discountForm.discount_value}
        onChange={(e) =>
          setDiscountForm({
            ...discountForm,
            discount_value: e.target.value,
          })
        }
        required
      />

      <label>Apply to plan (optional)</label>

      <select
        value={discountForm.plan_id}
        onChange={(e) =>
          setDiscountForm({
            ...discountForm,
            plan_id: e.target.value,
          })
        }
      >
        <option value="">All plans</option>

        {plans.map((plan) => (
          <option key={plan.id} value={plan.id}>
            {plan.name} — ₹{Number(plan.price || 0).toFixed(2)}
          </option>
        ))}
      </select>

      <button type="submit">Create Discount</button>
    </form>

    {discountMessage && (
      <p className="message">{discountMessage}</p>
    )}

    <h3>Existing Discounts</h3>

    {discounts.length === 0 ? (
      <p>No discount rules created yet.</p>
    ) : (
      discounts.map((discount) => (
        <div
          key={discount.id}
          style={{
            border: "1px solid #ddd",
            borderRadius: "8px",
            padding: "12px",
            marginBottom: "10px",
          }}
        >
          <h4>{discount.name}</h4>

          <p>
            Value:{" "}
            {discount.discount_type === "percentage"
              ? `${discount.discount_value}%`
              : `₹${Number(discount.discount_value).toFixed(2)}`}
          </p>

          <p>
            Plan:{" "}
            {discount.plan_name ||
              (discount.plan_id
                ? `Plan #${discount.plan_id}`
                : "All plans")}
          </p>

          <p>Status: {discount.status || "active"}</p>

          <label>Update status</label>

          <select
            value={discount.status || "active"}
            onChange={(e) =>
              handleDiscountStatusChange(
                discount.id,
                e.target.value
              )
            }
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      ))
    )}
  </section>
)}

        {/* INVOICE MANAGEMENT */}
        <section className="role-card">
          <h2>
            {user.role === "customer"
              ? "My Invoices"
              : "Invoice Management"}
          </h2>
          

          {/* Admin and staff can create invoices */}
          {["admin", "staff"].includes(user.role) && (
            <>
              <h3>Create Invoice</h3>

              <form onSubmit={handleCreateInvoice}>
                <select
                  name="subscription_id"
                  value={invoiceForm.subscription_id}
                  onChange={handleInvoiceChange}
                  required
                >
                  <option value="">Select subscription</option>

                  {subscriptions.map((subscription) => (
                    <option
                      key={subscription.id}
                      value={subscription.id}
                    >
                      #{subscription.id} —{" "}
                      {subscription.customer_name || "Customer"} —{" "}
                      {subscription.plan_name || "Plan"} — ₹
                      {Number(
                        subscription.plan_price ??
                          subscription.price ??
                          0
                      ).toFixed(2)}
                    </option>
                  ))}
                </select>

                <label>Tax rate (%)</label>
                <input
                  type="number"
                  name="tax_rate"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="Tax rate (e.g. 18)"
                  value={invoiceForm.tax_rate}
                  onChange={handleInvoiceChange}
                />

                <label>Due date</label>
                <input
                  type="date"
                  name="due_date"
                  value={invoiceForm.due_date}
                  onChange={handleInvoiceChange}
                />

                <button type="submit">Create Invoice</button>
              </form>
            </>
          )}

          {invoiceMessage && (
            <p className="message">{invoiceMessage}</p>
          )}

          <h3>Invoices</h3>

          {invoiceLoading ? (
            <p>Loading invoices...</p>
          ) : invoices.length === 0 ? (
            <p>No invoices found.</p>
          ) : (
            <div>
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    padding: "12px",
                    marginBottom: "10px",
                  }}
                >
                  <h3>
                    {invoice.invoice_number ||
                      `Invoice #${invoice.id}`}
                  </h3>

                  {invoice.customer_name && (
                    <p>
                      Customer: {invoice.customer_name}
                    </p>
                  )}

                  {invoice.customer_email && (
                    <p>
                      Email: {invoice.customer_email}
                    </p>
                  )}

                  <p>
                    Subscription: #{invoice.subscription_id}
                  </p>

                  <p>
                    Product: {invoice.product_name || "—"}
                  </p>

                  <p>
                    Plan: {invoice.plan_name || "—"}
                  </p>

                  <p>
                    Created: {invoice.created_at || "—"}
                  </p>

                  <p>
                    Due date: {invoice.due_date || "—"}
                  </p>

                  <p>
                    Subtotal: ₹{Number(invoice.subtotal ?? 0).toFixed(2)}
                  </p>

                  <p>
                    Tax ({Number(invoice.tax_rate ?? 0).toFixed(2)}%): ₹
                    {Number(invoice.tax_amount ?? 0).toFixed(2)}
                  </p>

                  <p>
  <strong>
    Invoice Total: ₹{Number(invoice.amount ?? 0).toFixed(2)}
  </strong>
</p>

                  <p>Status: {invoice.status || "Draft"}</p>

                  {["admin", "staff"].includes(user.role) && (
                    <div>
                      <label>Update invoice status</label>

                      <select
                        value={invoice.status || "Draft"}
                        onChange={(e) =>
                          handleInvoiceStatusChange(
                            invoice.id,
                            e.target.value
                          )
                        }
                      >
                        <option value="Draft">Draft</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Paid">Paid</option>
                      </select>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
                {/* PAYMENT MANAGEMENT */}
        <section className="role-card">
          <h2>Payment Management</h2>

          {["admin", "staff"].includes(user.role) && (
            <>
              <h3>Record Payment</h3>

              <form onSubmit={handleRecordPayment}>
                <select
                  name="invoice_id"
                  value={paymentForm.invoice_id}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      invoice_id: e.target.value,
                    })
                  }
                  required
                >
                  <option value="">Select invoice</option>

                  {invoices
                    .filter((invoice) => invoice.status !== "Paid")
                    .map((invoice) => (
                      <option key={invoice.id} value={invoice.id}>
                        {invoice.invoice_number ||
                          `Invoice #${invoice.id}`}{" "}
                        — {invoice.customer_name || "Customer"} — ₹
                        {Number(
                          invoice.total_amount ?? invoice.amount ?? 0
                        ).toFixed(2)}
                      </option>
                    ))}
                </select>

                <input
                  type="number"
                  name="amount"
                  min="0.01"
                  step="0.01"
                  placeholder="Payment amount"
                  value={paymentForm.amount}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      amount: e.target.value,
                    })
                  }
                  required
                />

                <select
                  name="payment_method"
                  value={paymentForm.payment_method}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      payment_method: e.target.value,
                    })
                  }
                  required
                >
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Other">Other</option>
                </select>

                <textarea
                  name="notes"
                  placeholder="Payment notes (optional)"
                  value={paymentForm.notes}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      notes: e.target.value,
                    })
                  }
                />

                <button type="submit" disabled={paymentLoading}>
                  {paymentLoading ? "Recording..." : "Record Payment"}
                </button>
              </form>
            </>
          )}

          {paymentMessage && (
            <p className="message">{paymentMessage}</p>
          )}

          <h3>Payments</h3>

          {paymentLoading ? (
            <p>Loading payments...</p>
          ) : payments.length === 0 ? (
            <p>No payments recorded yet.</p>
          ) : (
            <div>
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    padding: "12px",
                    marginBottom: "10px",
                  }}
                >
                  <h3>
                    Payment #{payment.id}
                  </h3>

                  <p>
                    Invoice:{" "}
                    {payment.invoice_number ||
                      `Invoice #${payment.invoice_id}`}
                  </p>

                  <p>
                    Amount: ₹{Number(payment.amount || 0).toFixed(2)}
                  </p>

                  <p>
                    Method: {payment.payment_method || "—"}
                  </p>

                  <p>
                    Date: {payment.payment_date || "—"}
                  </p>

                  {payment.notes && (
                    <p>Notes: {payment.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  // Login and registration screen
  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="brand">
          <h1>Brightloop</h1>
          <p>Subscription Management System</p>
        </div>

        <h2>
          {page === "login"
            ? "Welcome back"
            : "Create your account"}
        </h2>

        <p className="subtitle">
          {page === "login"
            ? "Sign in to continue"
            : "Register as a customer"}
        </p>

        <form onSubmit={handleSubmit}>
          {page === "register" && (
            <input
              name="name"
              placeholder="Full name"
              value={form.name}
              onChange={handleChange}
              required
            />
          )}

          <input
            name="email"
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={handleChange}
            required
          />

          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
          />

          <button type="submit" disabled={loading}>
            {loading
              ? "Please wait..."
              : page === "login"
              ? "Login"
              : "Register"}
          </button>
        </form>

        {message && <p className="message">{message}</p>}

        <div className="switch">
          {page === "login" ? (
            <>
              Don't have an account?{" "}
              <button
                onClick={() => {
                  setPage("register");
                  setMessage("");
                }}
              >
                Register
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={() => {
                  setPage("login");
                  setMessage("");
                }}
              >
                Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
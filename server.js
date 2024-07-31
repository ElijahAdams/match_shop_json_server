require('dotenv').config();
const jsonServer = require('json-server');
const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();
const port = process.env.PORT || 3000;

// Stripe secret
const stripe = require('stripe')(process.env.STRIPE_SECRET);
// Domain used for redirect
const YOUR_DOMAIN = 'http://localhost:4200';

server.use(middlewares);
server.use(jsonServer.bodyParser);

/**
 * create a checkout session with stripe
 */
server.post('/create-checkout-session', async (req, res, next) => {
  console.log(req.body.lineItems);
  const session = await stripe.checkout.sessions.create({
    ui_mode: 'embedded',
    // TODO get line Items from req body. 
    line_items: req.body.lineItems,
    mode: 'payment',
    return_url: `${YOUR_DOMAIN}/return?session_id={CHECKOUT_SESSION_ID}`,
  });
  res.send({clientSecret: session.client_secret});
});


const calculateOrderAmount = async (items) => {
  // const mockItems = [
  //   {
  //   id: "prod_QXjN3qJ7s2LCoY",
  //   count: 2,
  //   },
  //   {
  //     id: "prod_QXjKdcPSbAwBvm",
  //     count: 2,
  //   }
  // ];
  const itemsWithPricesPromise = items.map(async (item) => {
    const product = await stripe.products.retrieve(item.id);
    const price =  await stripe.prices.retrieve(product.default_price);
    item.product = product;
    item.price = price;
    return item;
  });
  const itemsWithPrices = await Promise.all(itemsWithPricesPromise);
  const totalPrice = itemsWithPrices.reduce(
    (accumulator, currentItem) => accumulator + ((currentItem.price.unit_amount) * currentItem.count),
    0,
  );
  return totalPrice;
};

server.post("/create-payment-intent", async (req, res) => {
  const { items } = req.body;
  const amount = await calculateOrderAmount(items);
  // Create a PaymentIntent with the order amount and currency
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: "usd",
  });

  res.send({
    clientSecret: paymentIntent.client_secret,
  });
});

/**
 * Intercept the menuItems GET call to merge it with the stripe data
 */
router.render = async (req, res) => {
  let menuItemsWithProducts;
  if(req.method === 'GET' && req.path === '/menuItems') {
    const menuItems = res.locals.data;
    const menuItemProductPromises = menuItems.map(async (menuItem) => {
      const product = await stripe.products.retrieve(menuItem.productId);
      menuItem.product = product;
      // TODO: This should be singular. Refactor to be "price"
      const prices =  await stripe.prices.retrieve(product.default_price);
      menuItem.prices = prices;
      return menuItem;
    });
    menuItemsWithProducts = await Promise.all(menuItemProductPromises);
    res.jsonp(menuItemsWithProducts);
  } else {
    res.jsonp(res.locals.data)
  }
}

server.use(router);

// Listen to server. 
server.listen(port, () => {
  console.log("app started on http://localhost:3000")
});
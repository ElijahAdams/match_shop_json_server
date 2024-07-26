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

/**
 * create a checkout session with stripe
 */
server.post('/create-checkout-session', async (req, res, next) => {
  const product = await stripe.products.retrieve('prod_QXB0KA6cORkUpl');
  const session = await stripe.checkout.sessions.create({
    ui_mode: 'embedded',
    line_items: [
      {
        // Provide the exact Price ID (for example, pr_1234) of the product you want to sell
        price: product.default_price,
        quantity: 1,
      },
    ],
    mode: 'payment', // Indicating 1 time payment. 
    // TODO: redirect URL needs to be based on the UI url. 
    return_url: `${YOUR_DOMAIN}/return?session_id={CHECKOUT_SESSION_ID}`,
  });
  res.send({clientSecret: session.client_secret});
});

/**
 * Intercept the menuItems GET call to merge it with the stripe data
 */
router.render = async (req, res) => {
  let menuItemsWithProducts;
  if(req.method === 'GET' && req.path === '/menuItems') {
    const menuItems = res.locals.data;
    const menuItemProductPromises = menuItems.map(async (menuitem) => {
      const product = await stripe.products.retrieve('prod_QXB0KA6cORkUpl');
      menuitem.product = product;
      return menuitem;
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
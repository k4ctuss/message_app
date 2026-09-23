const app = require('../app');
const request = require('supertest');

const USER_TEST_LOGIN = { email: 'nolan.blanc@grenoble-inp.org', password: '123456' };
const jws = require('jws');

const TOKEN_UNKNOW_USER = jws.sign({
  header: { alg: 'HS256' },
  payload: 'unknown@test.unknow',
  secret: process.env.TOKENSECRET
});

test('Test if user can log in and list users', async() => {
  let response = await request(app)
    .post('/login')
    .send(USER_TEST_LOGIN);
  expect(response.statusCode).toBe(200);
  expect(response.body).toHaveProperty('token');
  response = await request(app)
    .get('/api/users')
    .set('x-access-token', response.body.token);
  expect(response.statusCode).toBe(200);
  expect(response.body.message).toBe('Returning users');
  expect(response.body.users.length).toBeGreaterThan(0);
});

test('Test user sign up', async() => {
  let response = await request(app)
    .post('/register')
    .send({ email: 'test@test.test', name: 'test', password: '123456' });
  expect(response.statusCode).toBe(400);
  expect(response.body.message).toBe('Weak password!');

  response = await request(app)
    .post('/register')
    .send({ name: 'test', password: '123456' });
  expect(response.statusCode).toBe(400);
  expect(response.body.message).toBe('You must specify the name and email');

  response = await request(app)
    .post('/register')
    .send({ email: 'test@test.test', password: '1Mot2passe' });
  expect(response.statusCode).toBe(400);
  expect(response.body.message).toBe('You must specify the name and email');

  response = await request(app)
    .post('/register')
    .send({ email: 'test@test.test', name: 'test', password: '1Mot2passe*' });
  // expect(response.statusCode).toBe(200);
  expect(response.body.message).toBe('User Added');

  response = await request(app)
    .post('/register')
    .send({ email: 'test@test.test', name: 'test-deux', password: '1Mot2passe*plusfort' });
  expect(response.statusCode).toBe(400);
  expect(response.body.message).toBe('Validation error'); // pass de compte avec le même mot de pass
});

test('Test user login', async() => {
  let response = await request(app)
    .post('/login')
    .send({ password: USER_TEST_LOGIN.password });
  expect(response.statusCode).toBe(400);
  expect(response.body.message).toBe('You must specify the email and password');

  response = await request(app)
    .post('/login')
    .send({ email: USER_TEST_LOGIN.email });
  expect(response.statusCode).toBe(400);
  expect(response.body.message).toBe('You must specify the email and password');

  response = await request(app)
    .post('/login')
    .send({ email: 'test@test.test', password: '123456' });
  expect(response.statusCode).toBe(403);
  expect(response.body.message).toBe('Wrong email/password');

  response = await request(app)
    .post('/login')
    .send({ email: USER_TEST_LOGIN.email, password: 'hoooooooooooo' });
  expect(response.statusCode).toBe(403);
  expect(response.body.message).toBe('Wrong email/password');

  response = await request(app)
    .post('/login')
    .send(USER_TEST_LOGIN);
  expect(response.statusCode).toBe(200);
  expect(response.body).toHaveProperty('token');
  expect(response.body.message).toBe('Login/Password ok');
});

test('Test list users', async() => {
  let response = await request(app)
    .post('/login')
    .send(USER_TEST_LOGIN);
  const { token } = response.body;

  response = await request(app)
    .get('/api/users');
  expect(response.statusCode).toBe(403);
  expect(response.body.message).toBe('Token missing');

  response = await request(app)
    .get('/api/users')
    .set('x-access-token', 'invalid.token.sorry');
  expect(response.statusCode).toBe(403);
  expect(response.body.message).toBe('Token invalid');

  response = await request(app)
    .get('/api/users')
    .set('x-access-token', TOKEN_UNKNOW_USER);
  expect(response.statusCode).toBe(403);
  expect(response.body.message).toBe('Forbidden');

  response = await request(app)
    .get('/api/users')
    .set('x-access-token', token);
  expect(response.statusCode).toBe(200);
  expect(response.body.message).toBe('Returning users');
});

test('user can delete own account but not another user', async() => {
  const stamp = Date.now();
  const selfUser = { name: 'Self One', email: `self.one.${stamp}@test.test`, password: '1Mot2passe*' };
  const otherUser = { name: 'Self Two', email: `self.two.${stamp}@test.test`, password: '1Mot2passe*' };

  await request(app).post('/register').send(selfUser);
  await request(app).post('/register').send(otherUser);

  let response = await request(app).post('/login').send({ email: selfUser.email, password: selfUser.password });
  const selfToken = response.body.token;
  const selfId = response.body.user.id;

  response = await request(app).post('/login').send({ email: otherUser.email, password: otherUser.password });
  const otherToken = response.body.token;
  const otherId = response.body.user.id;

  response = await request(app)
    .delete(`/api/users/${otherId}`)
    .set('x-access-token', selfToken);
  expect(response.statusCode).toBe(403);
  expect(response.body.message).toBe('Forbidden');

  response = await request(app)
    .delete(`/api/users/${selfId}`)
    .set('x-access-token', selfToken);
  expect(response.statusCode).toBe(200);
  expect(response.body.message).toBe('User deleted');

  response = await request(app)
    .delete(`/api/users/${otherId}`)
    .set('x-access-token', otherToken);
  expect(response.statusCode).toBe(200);
});

test('Test update password', async() => {
  let response = await request(app)
    .post('/login')
    .send({ email: 'nolan.blanc@grenoble-inp.org', password: '123456' });
  const token = response.body.token;

  response = await request(app)
    .put('/api/password')
    .send({ password: 'myNewPassword123' });
  expect(response.statusCode).toBe(403);
  expect(response.body.message).toBe('Token missing');

  response = await request(app)
    .put('/api/password')
    .set('x-access-token', 'invalid.token.sorry')
    .send({ password: 'myNewPassword123' });
  expect(response.statusCode).toBe(403);
  expect(response.body.message).toBe('Token invalid');

  response = await request(app)
    .put('/api/password')
    .set('x-access-token', TOKEN_UNKNOW_USER)
    .send({ password: 'myNewPassword123$' });
  expect(response.statusCode).toBe(403);
  expect(response.body.message).toBe('Forbidden');

  response = await request(app)
    .put('/api/password')
    .set('x-access-token', token);
  expect(response.statusCode).toBe(400);
  expect(response.body.message).toBe('User not connected or password not provided');

  response = await request(app)
    .put('/api/password')
    .set('x-access-token', token)
    .send({ password: 'myNewPassword' });
  expect(response.statusCode).toBe(400);
  expect(response.body.message).toBe('Weak password!');

  response = await request(app)
    .put('/api/password')
    .set('x-access-token', token)
    .send({ password: 'myNewPassword&1234' });
  expect(response.statusCode).toBe(200);
  expect(response.body.message).toBe('Password updated');
});

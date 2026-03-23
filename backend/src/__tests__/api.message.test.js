const app = require('../app');
const request = require('supertest');

let adminTK;
let outsiderTK;
let adminGroupId;
let createdMessageContent;

beforeAll(async () => {
	const adminCreds = { email: 'nolan.blanc@grenoble-inp.org', password: '123456' };
	const outsiderCreds = { email: 'member@test.test', password: 'Agreat1$password' };

	let response = await request(app)
		.post('/login')
		.send(adminCreds);
	adminTK = response.body.token;

	response = await request(app)
		.post('/login')
		.send(outsiderCreds);

	if (response.statusCode !== 200) {
		await request(app)
			.post('/register')
			.send({ name: 'member user', ...outsiderCreds });

		response = await request(app)
			.post('/login')
			.send(outsiderCreds);
	}
	outsiderTK = response.body.token;

	response = await request(app)
		.get('/api/users')
		.set('x-access-token', adminTK);
	const outsiderUser = response.body.data.find(u => u.email === outsiderCreds.email);
	const outsiderUserId = outsiderUser.id;

	response = await request(app)
		.get('/api/mygroups')
		.set('x-access-token', adminTK);
	const adminDefaultGroup = response.body.groups.find(g => g.id === 1) || response.body.groups[0];
	adminGroupId = adminDefaultGroup.id;

	// Ensure outsider is not a member of admin group for forbidden tests.
	const membersResponse = await request(app)
		.get(`/api/mygroups/${adminGroupId}`)
		.set('x-access-token', adminTK);
	const isOutsiderMember = membersResponse.body.members.some(m => m.id === outsiderUserId);
	if (isOutsiderMember) {
		await request(app)
			.delete(`/api/mygroups/${adminGroupId}/${outsiderUserId}`)
			.set('x-access-token', adminTK);
	}

	createdMessageContent = `message test ${Date.now()}`;
});

test('Test create message', async () => {
	let response = await request(app)
		.post(`/api/messages/${adminGroupId}`)
		.set('x-access-token', adminTK);
	expect(response.statusCode).toBe(400);
	expect(response.body.message).toBe('message content not provided');

	response = await request(app)
		.post(`/api/messages/${adminGroupId}`)
		.send({ content: 'message without token' });
	expect(response.statusCode).toBe(403);
	expect(response.body.message).toBe('Token missing');

	response = await request(app)
		.post(`/api/messages/${adminGroupId}`)
		.set('x-access-token', outsiderTK)
		.send({ content: 'outsider message' });
	expect(response.statusCode).toBe(403);
	expect(response.body.message).toBe('Forbidden');

	response = await request(app)
		.post(`/api/messages/${adminGroupId}`)
		.set('x-access-token', adminTK)
		.send({ content: createdMessageContent });
	expect(response.statusCode).toBe(200);
	expect(response.body.message).toBe('message added');
});

test('Test get messages', async () => {
	let response = await request(app)
		.get(`/api/messages/${adminGroupId}`);
	expect(response.statusCode).toBe(403);
	expect(response.body.message).toBe('Token missing');

	response = await request(app)
		.get(`/api/messages/${adminGroupId}`)
		.set('x-access-token', outsiderTK);
	expect(response.statusCode).toBe(403);
	expect(response.body.message).toBe('Forbidden');

	response = await request(app)
		.get(`/api/messages/${adminGroupId}`)
		.set('x-access-token', adminTK);
	expect(response.statusCode).toBe(200);
	expect(response.body.message).toBe('Return all messages');
	expect(response.body.messages.some(m => m.content === createdMessageContent)).toBe(true);
});


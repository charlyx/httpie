import test from 'tape';
import { parse } from 'url';
import * as httpie from '../src';

// Demo: https://reqres.in/api
function isResponse(t, res, code, expected) {
	t.is(res.statusCode, code, `~> statusCode = ${code}`);
	t.ok(res.headers.etag, `~> headers.etag exists`);
	t.ok(res.headers['content-type'], `~> headers['content-type'] exists`);
	t.ok(res.headers['content-length'], `~> headers['content-length'] exists`);

	t.is(Object.prototype.toString.call(res.data), '[object Object]', '~> res.data is an object');
	if (expected) t.same(res.data, expected, '~~> is expected response data!');
}

test('exports', t => {
	t.plan(8);
	t.is(typeof httpie, 'object', 'exports an Object');
	['send', 'get', 'post', 'put', 'patch', 'del'].forEach(k => {
		t.is(typeof httpie[k], 'function', `~> httpie.${k} is a function`);
	});
	let out = httpie.send('GET', 'https://www.google.com');
	t.true(out instanceof Promise, '~> always returns a Promise!');
});

test('GET (200)', async t => {
	t.plan(6);
	let res = await httpie.get('https://reqres.in/api/users/2');
	isResponse(t, res, 200, {"data":{"id":2,"first_name":"Janet","last_name":"Weaver","avatar":"https://s3.amazonaws.com/uifaces/faces/twitter/josephstein/128.jpg"}});
});

test('GET (404)', async t => {
	t.plan(9);
	try {
		await httpie.get('https://reqres.in/api/users/23');
		t.pass('i will not run');
	} catch (err) {
		t.true(err instanceof Error, '~> returns a true Error instance');
		t.is(err.message, err.statusMessage, '~> the "message" and "statusMessage" are identical');
		t.is(err.message, 'Not Found', '~~> Not Found');
		isResponse(t, err, 404, {});
	}
});

test('HEAD (200)', async t => {
	t.plan(5);
	let res = await httpie.get('https://reqres.in/api/users/2');
	isResponse(t, res, 200);
});

test('HEAD (404)', async t => {
	t.plan(8);
	try {
		await httpie.get('https://reqres.in/api/users/23');
		t.pass('i will not run');
	} catch (err) {
		t.true(err instanceof Error, '~> returns a true Error instance');
		t.is(err.message, err.statusMessage, '~> the "message" and "statusMessage" are identical');
		t.is(err.message, 'Not Found', '~~> Not Found');
		isResponse(t, err, 404);
	}
});

test('POST 201', async t => {
	t.plan(9);

	let body = {
    name: 'morpheus',
    job: 'leader'
	};

	let res = await httpie.post('https://reqres.in/api/users', { body });

	isResponse(t, res, 201);
	t.ok(!!res.data.id, '~~> created item w/ "id" value');
	t.is(res.data.job, body.job, '~~> created item w/ "job" value');
	t.is(res.data.name, body.name, '~~> created item w/ "name" value');
	t.ok(!!res.data.createdAt, '~~> created item w/ "createdAt" value');
});

test('PUT (200)', async t => {
	t.plan(8);

	let body = {
    name: 'morpheus',
    job: 'zion resident'
	};

	let res = await httpie.put('https://reqres.in/api/users/2', { body });

	isResponse(t, res, 200);
	t.is(res.data.job, body.job, '~~> created item w/ "job" value');
	t.is(res.data.name, body.name, '~~> created item w/ "name" value');
	t.ok(!!res.data.updatedAt, '~~> created item w/ "updatedAt" value');
});

test('PATCH (200)', async t => {
	t.plan(8);

	let body = {
    name: 'morpheus',
    job: 'rebel'
	};

	let res = await httpie.patch('https://reqres.in/api/users/2', { body });

	isResponse(t, res, 200);
	t.is(res.data.job, body.job, '~~> created item w/ "job" value');
	t.is(res.data.name, body.name, '~~> created item w/ "name" value');
	t.ok(!!res.data.updatedAt, '~~> created item w/ "updatedAt" value');
});

test('DELETE (204)', async t => {
	t.plan(2);
	let res = await httpie.del('https://reqres.in/api/users/2');
	t.is(res.statusCode, 204);
	t.is(res.data, '');
});

test('GET (HTTP -> HTTPS)', async t => {
	t.plan(6);
	let res = await httpie.get('http://reqres.in/api/users');
	t.is(res.req.agent.protocol, 'https:', '~> follow-up request with HTTPS');
	isResponse(t, res, 200);
});

test('GET (301 = redirect:false)', async t => {
	t.plan(4);
	let res = await httpie.get('http://reqres.in/api/users', { redirect:0 });
	t.is(res.statusCode, 301, '~> statusCode = 301');
	t.is(res.statusMessage, 'Moved Permanently', '~> "Moved Permanently"');
	t.is(res.headers.location, 'https://reqres.in/api/users', '~> has "Location" header');
	t.is(res.data, '', '~> res.data is empty string');
});

test('GET (delay)', async t => {
	t.plan(3);
	let now = Date.now();
	let res = await httpie.send('GET', 'https://reqres.in/api/users?delay=5');
	t.is(res.statusCode, 200, '~> res.statusCode = 200');
	t.is(typeof res.data, 'object', '~> res.data is an object');
	t.true(Date.now() - now >= 5e3, '~> waited at least 5 seconds');
});

test('POST (string body w/ object url)', async t => {
	t.plan(7);
	const body = 'peter@klaven';
	const uri = parse('https://reqres.in/api/login');
	await httpie.post(uri, { body }).catch(err => {
		t.is(err.message, 'Bad Request');
		isResponse(t, err, 400, {
			error: 'Missing email or username'
		});
	});
});

test('custom headers', async t => {
	t.plan(2);
	let headers = { 'X-FOO': 'BAR123' };
	let res = await httpie.get('https://reqres.in/api/users', { headers });
	let sent = res.req.getHeader('x-foo');

	t.is(res.statusCode, 200, '~> statusCode = 200');
	t.is(sent, 'BAR123', '~> sent custom "X-FOO" header');
});

function reviver(key, val) {
	if (key.includes('_')) return; // removes
	return typeof val === 'number' ? String(val) : val;
}

test('GET (reviver)', async t => {
	t.plan(5);
	let res = await httpie.get('https://reqres.in/api/users', { reviver });
	t.is(res.statusCode, 200, '~> statusCode = 200');

	t.is(res.data.per_page, undefined, '~> removed "per_page" key');
	t.is(typeof res.data.page, 'string', '~> converted numbers to strings');
	t.is(res.data.data[1].first_name, undefined, `~> (deep) removed "first_name" key`);
	t.is(typeof res.data.data[1].id, 'string', `~> (deep) converted numbers to strings`);
});

test('GET (reviver w/ redirect)', async t => {
	t.plan(6);
	let res = await httpie.get('http://reqres.in/api/users', { reviver });
	t.is(res.req.agent.protocol, 'https:', '~> follow-up request with HTTPS');
	t.is(res.statusCode, 200, '~> statusCode = 200');

	t.is(res.data.per_page, undefined, '~> removed "per_page" key');
	t.is(typeof res.data.page, 'string', '~> converted numbers to strings');
	t.is(res.data.data[1].first_name, undefined, `~> (deep) removed "first_name" key`);
	t.is(typeof res.data.data[1].id, 'string', `~> (deep) converted numbers to strings`);
	t.end();
});

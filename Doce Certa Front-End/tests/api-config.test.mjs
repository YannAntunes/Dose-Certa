import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveApiBaseUrl } from '../src/services/apiConfig.js';
test('configured URL strips trailing slashes',()=>assert.equal(resolveApiBaseUrl('https://api.example.com///',false),'https://api.example.com'));
test('localhost is only dev fallback',()=>assert.equal(resolveApiBaseUrl(undefined,true),'http://localhost:8080'));
test('Render is production fallback',()=>assert.equal(resolveApiBaseUrl(undefined,false),'https://dose-certa-api-uwza.onrender.com'));
test('configured URL is trimmed',()=>assert.equal(resolveApiBaseUrl('  https://api.example.com/  ',false),'https://api.example.com'));

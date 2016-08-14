jest.autoMockOff();
var defineTest = require('jscodeshift/dist/testUtils').defineTest;
defineTest(__dirname, 'ModulesTransform', null, 'ModulesFixture');

// The Module object: Our interface to the outside world. We import
// and export values on it, and do the work to get that through
// closure compiler if necessary. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(Module) { ..generated code.. }
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to do an eval in order to handle the closure compiler
// case, where this code here is minified but Module was defined
// elsewhere (e.g. case 4 above). We also need to check if Module
// already exists (e.g. case 3 above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
(function(){
var Module;
if (!Module) Module = (typeof Module !== 'undefined' ? Module : null) || {};

GLOBAL.Module = Module;
var canvas = document.createElement('canvas');
canvas.addEventListener("webglcontextlost", function(e) { alert('WebGL context lost. You will need to reload the page.'); e.preventDefault(); }, false);
Module.canvas = canvas;

// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = {};
for (var key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key];
  }
}

// The environment setup code below is customized to use Module.
// *** Environment setup code ***
var ENVIRONMENT_IS_WEB = typeof window === 'object';
// Three configurations we can be running in:
// 1) We could be the application main() thread running in the main JS UI thread. (ENVIRONMENT_IS_WORKER == false and ENVIRONMENT_IS_PTHREAD == false)
// 2) We could be the application main() thread proxied to worker. (with Emscripten -s PROXY_TO_WORKER=1) (ENVIRONMENT_IS_WORKER == true, ENVIRONMENT_IS_PTHREAD == false)
// 3) We could be an application pthread running in a worker. (ENVIRONMENT_IS_WORKER == true and ENVIRONMENT_IS_PTHREAD == true)
var ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
var ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof require === 'function' && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER;
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

if (ENVIRONMENT_IS_NODE) {
  // Expose functionality in the same simple way that the shells work
  // Note that we pollute the global namespace here, otherwise we break in node
  if (!Module['print']) Module['print'] = function print(x) {
    process['stdout'].write(x + '\n');
  };
  if (!Module['printErr']) Module['printErr'] = function printErr(x) {
    process['stderr'].write(x + '\n');
  };

  var nodeFS = require('fs');
  var nodePath = require('path');

  Module['read'] = function read(filename, binary) {
    filename = nodePath['normalize'](filename);
    var ret = nodeFS['readFileSync'](filename);
    // The path is absolute if the normalized version is the same as the resolved.
    if (!ret && filename != nodePath['resolve'](filename)) {
      filename = path.join(__dirname, '..', 'src', filename);
      ret = nodeFS['readFileSync'](filename);
    }
    if (ret && !binary) ret = ret.toString();
    return ret;
  };

  Module['readBinary'] = function readBinary(filename) {
    var ret = Module['read'](filename, true);
    if (!ret.buffer) {
      ret = new Uint8Array(ret);
    }
    assert(ret.buffer);
    return ret;
  };

  Module['load'] = function load(f) {
    globalEval(read(f));
  };

  if (!Module['thisProgram']) {
    if (process['argv'].length > 1) {
      Module['thisProgram'] = process['argv'][1].replace(/\\/g, '/');
    } else {
      Module['thisProgram'] = 'unknown-program';
    }
  }

  Module['arguments'] = process['argv'].slice(2);

  if (typeof module !== 'undefined') {
    module['exports'] = Module;
  }

  process['on']('uncaughtException', function(ex) {
    // suppress ExitStatus exceptions from showing an error
    if (!(ex instanceof ExitStatus)) {
      throw ex;
    }
  });

  Module['inspect'] = function () { return '[Emscripten Module object]'; };
}
else if (ENVIRONMENT_IS_SHELL) {
  if (!Module['print']) Module['print'] = print;
  if (typeof printErr != 'undefined') Module['printErr'] = printErr; // not present in v8 or older sm

  if (typeof read != 'undefined') {
    Module['read'] = read;
  } else {
    Module['read'] = function read() { throw 'no read() available (jsc?)' };
  }

  Module['readBinary'] = function readBinary(f) {
    if (typeof readbuffer === 'function') {
      return new Uint8Array(readbuffer(f));
    }
    var data = read(f, 'binary');
    assert(typeof data === 'object');
    return data;
  };

  if (typeof scriptArgs != 'undefined') {
    Module['arguments'] = scriptArgs;
  } else if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

}
else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  Module['read'] = function read(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);
    return xhr.responseText;
  };

  if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }

  if (typeof console !== 'undefined') {
    if (!Module['print']) Module['print'] = function print(x) {
      console.log(x);
    };
    if (!Module['printErr']) Module['printErr'] = function printErr(x) {
      console.log(x);
    };
  } else {
    // Probably a worker, and without console.log. We can do very little here...
    var TRY_USE_DUMP = false;
    if (!Module['print']) Module['print'] = (TRY_USE_DUMP && (typeof(dump) !== "undefined") ? (function(x) {
      dump(x);
    }) : (function(x) {
      // self.postMessage(x); // enable this if you want stdout to be sent as messages
    }));
  }

  if (ENVIRONMENT_IS_WORKER) {
    Module['load'] = importScripts;
  }

  if (typeof Module['setWindowTitle'] === 'undefined') {
    Module['setWindowTitle'] = function(title) { document.title = title };
  }
}
else {
  // Unreachable because SHELL is dependant on the others
  throw 'Unknown runtime environment. Where are we?';
}

function globalEval(x) {
  eval.call(null, x);
}
if (!Module['load'] && Module['read']) {
  Module['load'] = function load(f) {
    globalEval(Module['read'](f));
  };
}
if (!Module['print']) {
  Module['print'] = function(){};
}
if (!Module['printErr']) {
  Module['printErr'] = Module['print'];
}
if (!Module['arguments']) {
  Module['arguments'] = [];
}
if (!Module['thisProgram']) {
  Module['thisProgram'] = './this.program';
}

// *** Environment setup code ***

// Closure helpers
Module.print = Module['print'];
Module.printErr = Module['printErr'];

// Callbacks
Module['preRun'] = [];
Module['postRun'] = [];

// Merge back in the overrides
for (var key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key];
  }
}



// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in: 
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at: 
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html

//========================================
// Runtime code shared with compiler
//========================================

var Runtime = {
  setTempRet0: function (value) {
    tempRet0 = value;
  },
  getTempRet0: function () {
    return tempRet0;
  },
  stackSave: function () {
    return STACKTOP;
  },
  stackRestore: function (stackTop) {
    STACKTOP = stackTop;
  },
  getNativeTypeSize: function (type) {
    switch (type) {
      case 'i1': case 'i8': return 1;
      case 'i16': return 2;
      case 'i32': return 4;
      case 'i64': return 8;
      case 'float': return 4;
      case 'double': return 8;
      default: {
        if (type[type.length-1] === '*') {
          return Runtime.QUANTUM_SIZE; // A pointer
        } else if (type[0] === 'i') {
          var bits = parseInt(type.substr(1));
          assert(bits % 8 === 0);
          return bits/8;
        } else {
          return 0;
        }
      }
    }
  },
  getNativeFieldSize: function (type) {
    return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE);
  },
  STACK_ALIGN: 16,
  prepVararg: function (ptr, type) {
    if (type === 'double' || type === 'i64') {
      // move so the load is aligned
      if (ptr & 7) {
        assert((ptr & 7) === 4);
        ptr += 4;
      }
    } else {
      assert((ptr & 3) === 0);
    }
    return ptr;
  },
  getAlignSize: function (type, size, vararg) {
    // we align i64s and doubles on 64-bit boundaries, unlike x86
    if (!vararg && (type == 'i64' || type == 'double')) return 8;
    if (!type) return Math.min(size, 8); // align structures internally to 64 bits
    return Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE);
  },
  dynCall: function (sig, ptr, args) {
    if (args && args.length) {
      if (!args.splice) args = Array.prototype.slice.call(args);
      args.splice(0, 0, ptr);
      return Module['dynCall_' + sig].apply(null, args);
    } else {
      return Module['dynCall_' + sig].call(null, ptr);
    }
  },
  functionPointers: [],
  addFunction: function (func) {
    for (var i = 0; i < Runtime.functionPointers.length; i++) {
      if (!Runtime.functionPointers[i]) {
        Runtime.functionPointers[i] = func;
        return 2*(1 + i);
      }
    }
    throw 'Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.';
  },
  removeFunction: function (index) {
    Runtime.functionPointers[(index-2)/2] = null;
  },
  warnOnce: function (text) {
    if (!Runtime.warnOnce.shown) Runtime.warnOnce.shown = {};
    if (!Runtime.warnOnce.shown[text]) {
      Runtime.warnOnce.shown[text] = 1;
      Module.printErr(text);
    }
  },
  funcWrappers: {},
  getFuncWrapper: function (func, sig) {
    assert(sig);
    if (!Runtime.funcWrappers[sig]) {
      Runtime.funcWrappers[sig] = {};
    }
    var sigCache = Runtime.funcWrappers[sig];
    if (!sigCache[func]) {
      sigCache[func] = function dynCall_wrapper() {
        return Runtime.dynCall(sig, func, arguments);
      };
    }
    return sigCache[func];
  },
  getCompilerSetting: function (name) {
    throw 'You must build with -s RETAIN_COMPILER_SETTINGS=1 for Runtime.getCompilerSetting or emscripten_get_compiler_setting to work';
  },
  stackAlloc: function (size) { var ret = STACKTOP;STACKTOP = (STACKTOP + size)|0;STACKTOP = (((STACKTOP)+15)&-16); return ret; },
  staticAlloc: function (size) { var ret = STATICTOP;STATICTOP = (STATICTOP + size)|0;STATICTOP = (((STATICTOP)+15)&-16); return ret; },
  dynamicAlloc: function (size) { var ret = DYNAMICTOP;DYNAMICTOP = (DYNAMICTOP + size)|0;DYNAMICTOP = (((DYNAMICTOP)+15)&-16); if (DYNAMICTOP >= TOTAL_MEMORY) { var success = enlargeMemory(); if (!success) { DYNAMICTOP = ret;  return 0; } }; return ret; },
  alignMemory: function (size,quantum) { var ret = size = Math.ceil((size)/(quantum ? quantum : 16))*(quantum ? quantum : 16); return ret; },
  makeBigInt: function (low,high,unsigned) { var ret = (unsigned ? ((+((low>>>0)))+((+((high>>>0)))*4294967296.0)) : ((+((low>>>0)))+((+((high|0)))*4294967296.0))); return ret; },
  GLOBAL_BASE: 8,
  QUANTUM_SIZE: 4,
  __dummy__: 0
}



Module["Runtime"] = Runtime;



//========================================
// Runtime essentials
//========================================

var __THREW__ = 0; // Used in checking for thrown exceptions.

var ABORT = false; // whether we are quitting the application. no code should run after this. set in exit() and abort()
var EXITSTATUS = 0;

var undef = 0;
// tempInt is used for 32-bit signed values or smaller. tempBigInt is used
// for 32-bit unsigned values or more than 32 bits. TODO: audit all uses of tempInt
var tempValue, tempInt, tempBigInt, tempInt2, tempBigInt2, tempPair, tempBigIntI, tempBigIntR, tempBigIntS, tempBigIntP, tempBigIntD, tempDouble, tempFloat;
var tempI64, tempI64b;
var tempRet0, tempRet1, tempRet2, tempRet3, tempRet4, tempRet5, tempRet6, tempRet7, tempRet8, tempRet9;

function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: ' + text);
  }
}

var globalScope = this;

// Returns the C function with a specified identifier (for C++, you need to do manual name mangling)
function getCFunc(ident) {
  var func = Module['_' + ident]; // closure exported function
  if (!func) {
    try {
      func = eval('_' + ident); // explicit lookup
    } catch(e) {}
  }
  assert(func, 'Cannot call unknown function ' + ident + ' (perhaps LLVM optimizations or closure removed it?)');
  return func;
}

var cwrap, ccall;
(function(){
  var JSfuncs = {
    // Helpers for cwrap -- it can't refer to Runtime directly because it might
    // be renamed by closure, instead it calls JSfuncs['stackSave'].body to find
    // out what the minified function name is.
    'stackSave': function() {
      Runtime.stackSave()
    },
    'stackRestore': function() {
      Runtime.stackRestore()
    },
    // type conversion from js to c
    'arrayToC' : function(arr) {
      var ret = Runtime.stackAlloc(arr.length);
      writeArrayToMemory(arr, ret);
      return ret;
    },
    'stringToC' : function(str) {
      var ret = 0;
      if (str !== null && str !== undefined && str !== 0) { // null string
        // at most 4 bytes per UTF-8 code point, +1 for the trailing '\0'
        ret = Runtime.stackAlloc((str.length << 2) + 1);
        writeStringToMemory(str, ret);
      }
      return ret;
    }
  };
  // For fast lookup of conversion functions
  var toC = {'string' : JSfuncs['stringToC'], 'array' : JSfuncs['arrayToC']};

  // C calling interface. 
  ccall = function ccallFunc(ident, returnType, argTypes, args, opts) {
    var func = getCFunc(ident);
    var cArgs = [];
    var stack = 0;
    if (args) {
      for (var i = 0; i < args.length; i++) {
        var converter = toC[argTypes[i]];
        if (converter) {
          if (stack === 0) stack = Runtime.stackSave();
          cArgs[i] = converter(args[i]);
        } else {
          cArgs[i] = args[i];
        }
      }
    }
    var ret = func.apply(null, cArgs);
    if (returnType === 'string') ret = Pointer_stringify(ret);
    if (stack !== 0) {
      if (opts && opts.async) {
        EmterpreterAsync.asyncFinalizers.push(function() {
          Runtime.stackRestore(stack);
        });
        return;
      }
      Runtime.stackRestore(stack);
    }
    return ret;
  }

  var sourceRegex = /^function\s*\(([^)]*)\)\s*{\s*([^*]*?)[\s;]*(?:return\s*(.*?)[;\s]*)?}$/;
  function parseJSFunc(jsfunc) {
    // Match the body and the return value of a javascript function source
    var parsed = jsfunc.toString().match(sourceRegex).slice(1);
    return {arguments : parsed[0], body : parsed[1], returnValue: parsed[2]}
  }
  var JSsource = {};
  for (var fun in JSfuncs) {
    if (JSfuncs.hasOwnProperty(fun)) {
      // Elements of toCsource are arrays of three items:
      // the code, and the return value
      JSsource[fun] = parseJSFunc(JSfuncs[fun]);
    }
  }

  
  cwrap = function cwrap(ident, returnType, argTypes) {
    argTypes = argTypes || [];
    var cfunc = getCFunc(ident);
    // When the function takes numbers and returns a number, we can just return
    // the original function
    var numericArgs = argTypes.every(function(type){ return type === 'number'});
    var numericRet = (returnType !== 'string');
    if ( numericRet && numericArgs) {
      return cfunc;
    }
    // Creation of the arguments list (["$1","$2",...,"$nargs"])
    var argNames = argTypes.map(function(x,i){return '$'+i});
    var funcstr = "(function(" + argNames.join(',') + ") {";
    var nargs = argTypes.length;
    if (!numericArgs) {
      // Generate the code needed to convert the arguments from javascript
      // values to pointers
      funcstr += 'var stack = ' + JSsource['stackSave'].body + ';';
      for (var i = 0; i < nargs; i++) {
        var arg = argNames[i], type = argTypes[i];
        if (type === 'number') continue;
        var convertCode = JSsource[type + 'ToC']; // [code, return]
        funcstr += 'var ' + convertCode.arguments + ' = ' + arg + ';';
        funcstr += convertCode.body + ';';
        funcstr += arg + '=' + convertCode.returnValue + ';';
      }
    }

    // When the code is compressed, the name of cfunc is not literally 'cfunc' anymore
    var cfuncname = parseJSFunc(function(){return cfunc}).returnValue;
    // Call the function
    funcstr += 'var ret = ' + cfuncname + '(' + argNames.join(',') + ');';
    if (!numericRet) { // Return type can only by 'string' or 'number'
      // Convert the result to a string
      var strgfy = parseJSFunc(function(){return Pointer_stringify}).returnValue;
      funcstr += 'ret = ' + strgfy + '(ret);';
    }
    if (!numericArgs) {
      // If we had a stack, restore it
      funcstr += JSsource['stackRestore'].body.replace('()', '(stack)') + ';';
    }
    funcstr += 'return ret})';
    return eval(funcstr);
  };
})();
Module["ccall"] = ccall;
Module["cwrap"] = cwrap;

function setValue(ptr, value, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': HEAP8[((ptr)>>0)]=value; break;
      case 'i8': HEAP8[((ptr)>>0)]=value; break;
      case 'i16': HEAP16[((ptr)>>1)]=value; break;
      case 'i32': HEAP32[((ptr)>>2)]=value; break;
      case 'i64': (tempI64 = [value>>>0,(tempDouble=value,(+(Math_abs(tempDouble))) >= 1.0 ? (tempDouble > 0.0 ? ((Math_min((+(Math_floor((tempDouble)/4294967296.0))), 4294967295.0))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/4294967296.0)))))>>>0) : 0)],HEAP32[((ptr)>>2)]=tempI64[0],HEAP32[(((ptr)+(4))>>2)]=tempI64[1]); break;
      case 'float': HEAPF32[((ptr)>>2)]=value; break;
      case 'double': HEAPF64[((ptr)>>3)]=value; break;
      default: abort('invalid type for setValue: ' + type);
    }
}
Module["setValue"] = setValue;


function getValue(ptr, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': return HEAP8[((ptr)>>0)];
      case 'i8': return HEAP8[((ptr)>>0)];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP32[((ptr)>>2)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      default: abort('invalid type for setValue: ' + type);
    }
  return null;
}
Module["getValue"] = getValue;

var ALLOC_NORMAL = 0; // Tries to use _malloc()
var ALLOC_STACK = 1; // Lives for the duration of the current function call
var ALLOC_STATIC = 2; // Cannot be freed
var ALLOC_DYNAMIC = 3; // Cannot be freed except through sbrk
var ALLOC_NONE = 4; // Do not allocate
Module["ALLOC_NORMAL"] = ALLOC_NORMAL;
Module["ALLOC_STACK"] = ALLOC_STACK;
Module["ALLOC_STATIC"] = ALLOC_STATIC;
Module["ALLOC_DYNAMIC"] = ALLOC_DYNAMIC;
Module["ALLOC_NONE"] = ALLOC_NONE;

// allocate(): This is for internal use. You can use it yourself as well, but the interface
//             is a little tricky (see docs right below). The reason is that it is optimized
//             for multiple syntaxes to save space in generated code. So you should
//             normally not use allocate(), and instead allocate memory using _malloc(),
//             initialize it with setValue(), and so forth.
// @slab: An array of data, or a number. If a number, then the size of the block to allocate,
//        in *bytes* (note that this is sometimes confusing: the next parameter does not
//        affect this!)
// @types: Either an array of types, one for each byte (or 0 if no type at that position),
//         or a single type which is used for the entire block. This only matters if there
//         is initial data - if @slab is a number, then this does not matter at all and is
//         ignored.
// @allocator: How to allocate memory, see ALLOC_*
function allocate(slab, types, allocator, ptr) {
  var zeroinit, size;
  if (typeof slab === 'number') {
    zeroinit = true;
    size = slab;
  } else {
    zeroinit = false;
    size = slab.length;
  }

  var singleType = typeof types === 'string' ? types : null;

  var ret;
  if (allocator == ALLOC_NONE) {
    ret = ptr;
  } else {
    ret = [_malloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
  }

  if (zeroinit) {
    var ptr = ret, stop;
    assert((ret & 3) == 0);
    stop = ret + (size & ~3);
    for (; ptr < stop; ptr += 4) {
      HEAP32[((ptr)>>2)]=0;
    }
    stop = ret + size;
    while (ptr < stop) {
      HEAP8[((ptr++)>>0)]=0;
    }
    return ret;
  }

  if (singleType === 'i8') {
    if (slab.subarray || slab.slice) {
      HEAPU8.set(slab, ret);
    } else {
      HEAPU8.set(new Uint8Array(slab), ret);
    }
    return ret;
  }

  var i = 0, type, typeSize, previousType;
  while (i < size) {
    var curr = slab[i];

    if (typeof curr === 'function') {
      curr = Runtime.getFunctionIndex(curr);
    }

    type = singleType || types[i];
    if (type === 0) {
      i++;
      continue;
    }

    if (type == 'i64') type = 'i32'; // special case: we have one i32 here, and one i32 later

    setValue(ret+i, curr, type);

    // no need to look up size unless type changes, so cache it
    if (previousType !== type) {
      typeSize = Runtime.getNativeTypeSize(type);
      previousType = type;
    }
    i += typeSize;
  }

  return ret;
}
Module["allocate"] = allocate;

// Allocate memory during any stage of startup - static memory early on, dynamic memory later, malloc when ready
function getMemory(size) {
  if (!staticSealed) return Runtime.staticAlloc(size);
  if ((typeof _sbrk !== 'undefined' && !_sbrk.called) || !runtimeInitialized) return Runtime.dynamicAlloc(size);
  return _malloc(size);
}
Module["getMemory"] = getMemory;

function Pointer_stringify(ptr, /* optional */ length) {
  if (length === 0 || !ptr) return '';
  // TODO: use TextDecoder
  // Find the length, and check for UTF while doing so
  var hasUtf = 0;
  var t;
  var i = 0;
  while (1) {
    t = HEAPU8[(((ptr)+(i))>>0)];
    hasUtf |= t;
    if (t == 0 && !length) break;
    i++;
    if (length && i == length) break;
  }
  if (!length) length = i;

  var ret = '';

  if (hasUtf < 128) {
    var MAX_CHUNK = 1024; // split up into chunks, because .apply on a huge string can overflow the stack
    var curr;
    while (length > 0) {
      curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
      ret = ret ? ret + curr : curr;
      ptr += MAX_CHUNK;
      length -= MAX_CHUNK;
    }
    return ret;
  }
  return Module['UTF8ToString'](ptr);
}
Module["Pointer_stringify"] = Pointer_stringify;

// Given a pointer 'ptr' to a null-terminated ASCII-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function AsciiToString(ptr) {
  var str = '';
  while (1) {
    var ch = HEAP8[((ptr++)>>0)];
    if (!ch) return str;
    str += String.fromCharCode(ch);
  }
}
Module["AsciiToString"] = AsciiToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in ASCII form. The copy will require at most str.length+1 bytes of space in the HEAP.

function stringToAscii(str, outPtr) {
  return writeAsciiToMemory(str, outPtr, false);
}
Module["stringToAscii"] = stringToAscii;

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the given array that contains uint8 values, returns
// a copy of that string as a Javascript String object.

function UTF8ArrayToString(u8Array, idx) {
  var u0, u1, u2, u3, u4, u5;

  var str = '';
  while (1) {
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
    u0 = u8Array[idx++];
    if (!u0) return str;
    if (!(u0 & 0x80)) { str += String.fromCharCode(u0); continue; }
    u1 = u8Array[idx++] & 63;
    if ((u0 & 0xE0) == 0xC0) { str += String.fromCharCode(((u0 & 31) << 6) | u1); continue; }
    u2 = u8Array[idx++] & 63;
    if ((u0 & 0xF0) == 0xE0) {
      u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
    } else {
      u3 = u8Array[idx++] & 63;
      if ((u0 & 0xF8) == 0xF0) {
        u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | u3;
      } else {
        u4 = u8Array[idx++] & 63;
        if ((u0 & 0xFC) == 0xF8) {
          u0 = ((u0 & 3) << 24) | (u1 << 18) | (u2 << 12) | (u3 << 6) | u4;
        } else {
          u5 = u8Array[idx++] & 63;
          u0 = ((u0 & 1) << 30) | (u1 << 24) | (u2 << 18) | (u3 << 12) | (u4 << 6) | u5;
        }
      }
    }
    if (u0 < 0x10000) {
      str += String.fromCharCode(u0);
    } else {
      var ch = u0 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    }
  }
}
Module["UTF8ArrayToString"] = UTF8ArrayToString;

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function UTF8ToString(ptr) {
  return UTF8ArrayToString(HEAPU8,ptr);
}
Module["UTF8ToString"] = UTF8ToString;

// Copies the given Javascript String object 'str' to the given byte array at address 'outIdx',
// encoded in UTF8 form and null-terminated. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outU8Array: the array to copy to. Each index in this array is assumed to be one 8-byte element.
//   outIdx: The starting offset in the array to begin the copying.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null 
//                    terminator, i.e. if maxBytesToWrite=1, only the null terminator will be written and nothing else.
//                    maxBytesToWrite=0 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
  if (!(maxBytesToWrite > 0)) // Parameter maxBytesToWrite is not optional. Negative values, 0, null, undefined and false each don't write out any bytes.
    return 0;

  var startIdx = outIdx;
  var endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description and https://www.ietf.org/rfc/rfc2279.txt and https://tools.ietf.org/html/rfc3629
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
    if (u <= 0x7F) {
      if (outIdx >= endIdx) break;
      outU8Array[outIdx++] = u;
    } else if (u <= 0x7FF) {
      if (outIdx + 1 >= endIdx) break;
      outU8Array[outIdx++] = 0xC0 | (u >> 6);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0xFFFF) {
      if (outIdx + 2 >= endIdx) break;
      outU8Array[outIdx++] = 0xE0 | (u >> 12);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0x1FFFFF) {
      if (outIdx + 3 >= endIdx) break;
      outU8Array[outIdx++] = 0xF0 | (u >> 18);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else if (u <= 0x3FFFFFF) {
      if (outIdx + 4 >= endIdx) break;
      outU8Array[outIdx++] = 0xF8 | (u >> 24);
      outU8Array[outIdx++] = 0x80 | ((u >> 18) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    } else {
      if (outIdx + 5 >= endIdx) break;
      outU8Array[outIdx++] = 0xFC | (u >> 30);
      outU8Array[outIdx++] = 0x80 | ((u >> 24) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 18) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
      outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
      outU8Array[outIdx++] = 0x80 | (u & 63);
    }
  }
  // Null-terminate the pointer to the buffer.
  outU8Array[outIdx] = 0;
  return outIdx - startIdx;
}
Module["stringToUTF8Array"] = stringToUTF8Array;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF8 form. The copy will require at most str.length*4+1 bytes of space in the HEAP.
// Use the function lengthBytesUTF8() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF8(str, outPtr, maxBytesToWrite) {
  return stringToUTF8Array(str, HEAPU8,outPtr, maxBytesToWrite);
}
Module["stringToUTF8"] = stringToUTF8;

// Returns the number of bytes the given Javascript string takes if encoded as a UTF8 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF8(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! So decode UTF16->UTF32->UTF8.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var u = str.charCodeAt(i); // possibly a lead surrogate
    if (u >= 0xD800 && u <= 0xDFFF) u = 0x10000 + ((u & 0x3FF) << 10) | (str.charCodeAt(++i) & 0x3FF);
    if (u <= 0x7F) {
      ++len;
    } else if (u <= 0x7FF) {
      len += 2;
    } else if (u <= 0xFFFF) {
      len += 3;
    } else if (u <= 0x1FFFFF) {
      len += 4;
    } else if (u <= 0x3FFFFFF) {
      len += 5;
    } else {
      len += 6;
    }
  }
  return len;
}
Module["lengthBytesUTF8"] = lengthBytesUTF8;

// Given a pointer 'ptr' to a null-terminated UTF16LE-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.

function UTF16ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var codeUnit = HEAP16[(((ptr)+(i*2))>>1)];
    if (codeUnit == 0)
      return str;
    ++i;
    // fromCharCode constructs a character from a UTF-16 code unit, so we can pass the UTF16 string right through.
    str += String.fromCharCode(codeUnit);
  }
}
Module["UTF16ToString"] = UTF16ToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF16 form. The copy will require at most str.length*4+2 bytes of space in the HEAP.
// Use the function lengthBytesUTF16() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null 
//                    terminator, i.e. if maxBytesToWrite=2, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<2 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF16(str, outPtr, maxBytesToWrite) {
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 2) return 0;
  maxBytesToWrite -= 2; // Null terminator.
  var startPtr = outPtr;
  var numCharsToWrite = (maxBytesToWrite < str.length*2) ? (maxBytesToWrite / 2) : str.length;
  for (var i = 0; i < numCharsToWrite; ++i) {
    // charCodeAt returns a UTF-16 encoded code unit, so it can be directly written to the HEAP.
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    HEAP16[((outPtr)>>1)]=codeUnit;
    outPtr += 2;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP16[((outPtr)>>1)]=0;
  return outPtr - startPtr;
}
Module["stringToUTF16"] = stringToUTF16;

// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF16(str) {
  return str.length*2;
}
Module["lengthBytesUTF16"] = lengthBytesUTF16;

function UTF32ToString(ptr) {
  var i = 0;

  var str = '';
  while (1) {
    var utf32 = HEAP32[(((ptr)+(i*4))>>2)];
    if (utf32 == 0)
      return str;
    ++i;
    // Gotcha: fromCharCode constructs a character from a UTF-16 encoded code (pair), not from a Unicode code point! So encode the code point to UTF-16 for constructing.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    if (utf32 >= 0x10000) {
      var ch = utf32 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    } else {
      str += String.fromCharCode(utf32);
    }
  }
}
Module["UTF32ToString"] = UTF32ToString;

// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr',
// null-terminated and encoded in UTF32 form. The copy will require at most str.length*4+4 bytes of space in the HEAP.
// Use the function lengthBytesUTF32() to compute the exact number of bytes (excluding null terminator) that this function will write.
// Parameters:
//   str: the Javascript string to copy.
//   outPtr: Byte address in Emscripten HEAP where to write the string to.
//   maxBytesToWrite: The maximum number of bytes this function can write to the array. This count should include the null 
//                    terminator, i.e. if maxBytesToWrite=4, only the null terminator will be written and nothing else.
//                    maxBytesToWrite<4 does not write any bytes to the output, not even the null terminator.
// Returns the number of bytes written, EXCLUDING the null terminator.

function stringToUTF32(str, outPtr, maxBytesToWrite) {
  // Backwards compatibility: if max bytes is not specified, assume unsafe unbounded write is allowed.
  if (maxBytesToWrite === undefined) {
    maxBytesToWrite = 0x7FFFFFFF;
  }
  if (maxBytesToWrite < 4) return 0;
  var startPtr = outPtr;
  var endPtr = startPtr + maxBytesToWrite - 4;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
      var trailSurrogate = str.charCodeAt(++i);
      codeUnit = 0x10000 + ((codeUnit & 0x3FF) << 10) | (trailSurrogate & 0x3FF);
    }
    HEAP32[((outPtr)>>2)]=codeUnit;
    outPtr += 4;
    if (outPtr + 4 > endPtr) break;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP32[((outPtr)>>2)]=0;
  return outPtr - startPtr;
}
Module["stringToUTF32"] = stringToUTF32;

// Returns the number of bytes the given Javascript string takes if encoded as a UTF16 byte array, EXCLUDING the null terminator byte.

function lengthBytesUTF32(str) {
  var len = 0;
  for (var i = 0; i < str.length; ++i) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    // See http://unicode.org/faq/utf_bom.html#utf16-3
    var codeUnit = str.charCodeAt(i);
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) ++i; // possibly a lead surrogate, so skip over the tail surrogate.
    len += 4;
  }

  return len;
}
Module["lengthBytesUTF32"] = lengthBytesUTF32;

function demangle(func) {
  var hasLibcxxabi = !!Module['___cxa_demangle'];
  if (hasLibcxxabi) {
    try {
      var buf = _malloc(func.length);
      writeStringToMemory(func.substr(1), buf);
      var status = _malloc(4);
      var ret = Module['___cxa_demangle'](buf, 0, 0, status);
      if (getValue(status, 'i32') === 0 && ret) {
        return Pointer_stringify(ret);
      }
      // otherwise, libcxxabi failed, we can try ours which may return a partial result
    } catch(e) {
      // failure when using libcxxabi, we can try ours which may return a partial result
    } finally {
      if (buf) _free(buf);
      if (status) _free(status);
      if (ret) _free(ret);
    }
  }
  var i = 3;
  // params, etc.
  var basicTypes = {
    'v': 'void',
    'b': 'bool',
    'c': 'char',
    's': 'short',
    'i': 'int',
    'l': 'long',
    'f': 'float',
    'd': 'double',
    'w': 'wchar_t',
    'a': 'signed char',
    'h': 'unsigned char',
    't': 'unsigned short',
    'j': 'unsigned int',
    'm': 'unsigned long',
    'x': 'long long',
    'y': 'unsigned long long',
    'z': '...'
  };
  var subs = [];
  var first = true;
  function dump(x) {
    //return;
    if (x) Module.print(x);
    Module.print(func);
    var pre = '';
    for (var a = 0; a < i; a++) pre += ' ';
    Module.print (pre + '^');
  }
  function parseNested() {
    i++;
    if (func[i] === 'K') i++; // ignore const
    var parts = [];
    while (func[i] !== 'E') {
      if (func[i] === 'S') { // substitution
        i++;
        var next = func.indexOf('_', i);
        var num = func.substring(i, next) || 0;
        parts.push(subs[num] || '?');
        i = next+1;
        continue;
      }
      if (func[i] === 'C') { // constructor
        parts.push(parts[parts.length-1]);
        i += 2;
        continue;
      }
      var size = parseInt(func.substr(i));
      var pre = size.toString().length;
      if (!size || !pre) { i--; break; } // counter i++ below us
      var curr = func.substr(i + pre, size);
      parts.push(curr);
      subs.push(curr);
      i += pre + size;
    }
    i++; // skip E
    return parts;
  }
  function parse(rawList, limit, allowVoid) { // main parser
    limit = limit || Infinity;
    var ret = '', list = [];
    function flushList() {
      return '(' + list.join(', ') + ')';
    }
    var name;
    if (func[i] === 'N') {
      // namespaced N-E
      name = parseNested().join('::');
      limit--;
      if (limit === 0) return rawList ? [name] : name;
    } else {
      // not namespaced
      if (func[i] === 'K' || (first && func[i] === 'L')) i++; // ignore const and first 'L'
      var size = parseInt(func.substr(i));
      if (size) {
        var pre = size.toString().length;
        name = func.substr(i + pre, size);
        i += pre + size;
      }
    }
    first = false;
    if (func[i] === 'I') {
      i++;
      var iList = parse(true);
      var iRet = parse(true, 1, true);
      ret += iRet[0] + ' ' + name + '<' + iList.join(', ') + '>';
    } else {
      ret = name;
    }
    paramLoop: while (i < func.length && limit-- > 0) {
      //dump('paramLoop');
      var c = func[i++];
      if (c in basicTypes) {
        list.push(basicTypes[c]);
      } else {
        switch (c) {
          case 'P': list.push(parse(true, 1, true)[0] + '*'); break; // pointer
          case 'R': list.push(parse(true, 1, true)[0] + '&'); break; // reference
          case 'L': { // literal
            i++; // skip basic type
            var end = func.indexOf('E', i);
            var size = end - i;
            list.push(func.substr(i, size));
            i += size + 2; // size + 'EE'
            break;
          }
          case 'A': { // array
            var size = parseInt(func.substr(i));
            i += size.toString().length;
            if (func[i] !== '_') throw '?';
            i++; // skip _
            list.push(parse(true, 1, true)[0] + ' [' + size + ']');
            break;
          }
          case 'E': break paramLoop;
          default: ret += '?' + c; break paramLoop;
        }
      }
    }
    if (!allowVoid && list.length === 1 && list[0] === 'void') list = []; // avoid (void)
    if (rawList) {
      if (ret) {
        list.push(ret + '?');
      }
      return list;
    } else {
      return ret + flushList();
    }
  }
  var parsed = func;
  try {
    // Special-case the entry point, since its name differs from other name mangling.
    if (func == 'Object._main' || func == '_main') {
      return 'main()';
    }
    if (typeof func === 'number') func = Pointer_stringify(func);
    if (func[0] !== '_') return func;
    if (func[1] !== '_') return func; // C function
    if (func[2] !== 'Z') return func;
    switch (func[3]) {
      case 'n': return 'operator new()';
      case 'd': return 'operator delete()';
    }
    parsed = parse();
  } catch(e) {
    parsed += '?';
  }
  if (parsed.indexOf('?') >= 0 && !hasLibcxxabi) {
    Runtime.warnOnce('warning: a problem occurred in builtin C++ name demangling; build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling');
  }
  return parsed;
}

function demangleAll(text) {
  return text.replace(/__Z[\w\d_]+/g, function(x) { var y = demangle(x); return x === y ? x : (x + ' [' + y + ']') });
}

function jsStackTrace() {
  var err = new Error();
  if (!err.stack) {
    // IE10+ special cases: It does have callstack info, but it is only populated if an Error object is thrown,
    // so try that as a special-case.
    try {
      throw new Error(0);
    } catch(e) {
      err = e;
    }
    if (!err.stack) {
      return '(no stack trace available)';
    }
  }
  return err.stack.toString();
}

function stackTrace() {
  return demangleAll(jsStackTrace());
}
Module["stackTrace"] = stackTrace;

// Memory management

var PAGE_SIZE = 4096;

function alignMemoryPage(x) {
  if (x % 4096 > 0) {
    x += (4096 - (x % 4096));
  }
  return x;
}

var HEAP;
var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;

var STATIC_BASE = 0, STATICTOP = 0, staticSealed = false; // static area
var STACK_BASE = 0, STACKTOP = 0, STACK_MAX = 0; // stack area
var DYNAMIC_BASE = 0, DYNAMICTOP = 0; // dynamic area handled by sbrk


function abortOnCannotGrowMemory() {
  abort('Cannot enlarge memory arrays. Either (1) compile with  -s TOTAL_MEMORY=X  with X higher than the current value ' + TOTAL_MEMORY + ', (2) compile with  -s ALLOW_MEMORY_GROWTH=1  which adjusts the size at runtime but prevents some optimizations, (3) set Module.TOTAL_MEMORY to a higher value before the program runs, or if you want malloc to return NULL (0) instead of this abort, compile with  -s ABORTING_MALLOC=0 ');
}

function enlargeMemory() {
  abortOnCannotGrowMemory();
}


var TOTAL_STACK = Module['TOTAL_STACK'] || 5242880;
var TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 60000000;

var totalMemory = 64*1024;
while (totalMemory < TOTAL_MEMORY || totalMemory < 2*TOTAL_STACK) {
  if (totalMemory < 16*1024*1024) {
    totalMemory *= 2;
  } else {
    totalMemory += 16*1024*1024
  }
}
if (totalMemory !== TOTAL_MEMORY) {
  TOTAL_MEMORY = totalMemory;
}

// Initialize the runtime's memory
// check for full engine support (use string 'subarray' to avoid closure compiler confusion)
assert(typeof Int32Array !== 'undefined' && typeof Float64Array !== 'undefined' && !!(new Int32Array(1)['subarray']) && !!(new Int32Array(1)['set']),
       'JS engine does not provide full typed array support');

var buffer;



// Use a provided buffer, if there is one, or else allocate a new one
if (Module['buffer']) {
  buffer = Module['buffer'];
  assert(buffer.byteLength === TOTAL_MEMORY, 'provided buffer should be ' + TOTAL_MEMORY + ' bytes, but it is ' + buffer.byteLength);
} else {
  buffer = new ArrayBuffer(TOTAL_MEMORY);
}
HEAP8 = new Int8Array(buffer);
HEAP16 = new Int16Array(buffer);
HEAP32 = new Int32Array(buffer);
HEAPU8 = new Uint8Array(buffer);
HEAPU16 = new Uint16Array(buffer);
HEAPU32 = new Uint32Array(buffer);
HEAPF32 = new Float32Array(buffer);
HEAPF64 = new Float64Array(buffer);


// Endianness check (note: assumes compiler arch was little-endian)
HEAP32[0] = 255;
assert(HEAPU8[0] === 255 && HEAPU8[3] === 0, 'Typed arrays 2 must be run on a little-endian system');

Module['HEAP'] = HEAP;
Module['buffer'] = buffer;
Module['HEAP8'] = HEAP8;
Module['HEAP16'] = HEAP16;
Module['HEAP32'] = HEAP32;
Module['HEAPU8'] = HEAPU8;
Module['HEAPU16'] = HEAPU16;
Module['HEAPU32'] = HEAPU32;
Module['HEAPF32'] = HEAPF32;
Module['HEAPF64'] = HEAPF64;

function callRuntimeCallbacks(callbacks) {
  while(callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == 'function') {
      callback();
      continue;
    }
    var func = callback.func;
    if (typeof func === 'number') {
      if (callback.arg === undefined) {
        Runtime.dynCall('v', func);
      } else {
        Runtime.dynCall('vi', func, [callback.arg]);
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg);
    }
  }
}

var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATMAIN__    = []; // functions called when main() is to be run
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the runtime has exited

var runtimeInitialized = false;
var runtimeExited = false;


function preRun() {
  // compatibility - merge in anything from Module['preRun'] at this time
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}

function ensureInitRuntime() {
  if (runtimeInitialized) return;
  runtimeInitialized = true;
  callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
  callRuntimeCallbacks(__ATMAIN__);
}

function exitRuntime() {
  callRuntimeCallbacks(__ATEXIT__);
  runtimeExited = true;
}

function postRun() {
  // compatibility - merge in anything from Module['postRun'] at this time
  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}
Module["addOnPreRun"] = addOnPreRun;

function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}
Module["addOnInit"] = addOnInit;

function addOnPreMain(cb) {
  __ATMAIN__.unshift(cb);
}
Module["addOnPreMain"] = addOnPreMain;

function addOnExit(cb) {
  __ATEXIT__.unshift(cb);
}
Module["addOnExit"] = addOnExit;

function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}
Module["addOnPostRun"] = addOnPostRun;

// Tools


function intArrayFromString(stringy, dontAddNull, length /* optional */) {
  var len = length > 0 ? length : lengthBytesUTF8(stringy)+1;
  var u8array = new Array(len);
  var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
  if (dontAddNull) u8array.length = numBytesWritten;
  return u8array;
}
Module["intArrayFromString"] = intArrayFromString;

function intArrayToString(array) {
  var ret = [];
  for (var i = 0; i < array.length; i++) {
    var chr = array[i];
    if (chr > 0xFF) {
      chr &= 0xFF;
    }
    ret.push(String.fromCharCode(chr));
  }
  return ret.join('');
}
Module["intArrayToString"] = intArrayToString;

function writeStringToMemory(string, buffer, dontAddNull) {
  var array = intArrayFromString(string, dontAddNull);
  var i = 0;
  while (i < array.length) {
    var chr = array[i];
    HEAP8[(((buffer)+(i))>>0)]=chr;
    i = i + 1;
  }
}
Module["writeStringToMemory"] = writeStringToMemory;

function writeArrayToMemory(array, buffer) {
  for (var i = 0; i < array.length; i++) {
    HEAP8[((buffer++)>>0)]=array[i];
  }
}
Module["writeArrayToMemory"] = writeArrayToMemory;

function writeAsciiToMemory(str, buffer, dontAddNull) {
  for (var i = 0; i < str.length; ++i) {
    HEAP8[((buffer++)>>0)]=str.charCodeAt(i);
  }
  // Null-terminate the pointer to the HEAP.
  if (!dontAddNull) HEAP8[((buffer)>>0)]=0;
}
Module["writeAsciiToMemory"] = writeAsciiToMemory;

function unSign(value, bits, ignore) {
  if (value >= 0) {
    return value;
  }
  return bits <= 32 ? 2*Math.abs(1 << (bits-1)) + value // Need some trickery, since if bits == 32, we are right at the limit of the bits JS uses in bitshifts
                    : Math.pow(2, bits)         + value;
}
function reSign(value, bits, ignore) {
  if (value <= 0) {
    return value;
  }
  var half = bits <= 32 ? Math.abs(1 << (bits-1)) // abs is needed if bits == 32
                        : Math.pow(2, bits-1);
  if (value >= half && (bits <= 32 || value > half)) { // for huge values, we can hit the precision limit and always get true here. so don't do that
                                                       // but, in general there is no perfect solution here. With 64-bit ints, we get rounding and errors
                                                       // TODO: In i64 mode 1, resign the two parts separately and safely
    value = -2*half + value; // Cannot bitshift half, as it may be at the limit of the bits JS uses in bitshifts
  }
  return value;
}


// check for imul support, and also for correctness ( https://bugs.webkit.org/show_bug.cgi?id=126345 )
if (!Math['imul'] || Math['imul'](0xffffffff, 5) !== -5) Math['imul'] = function imul(a, b) {
  var ah  = a >>> 16;
  var al = a & 0xffff;
  var bh  = b >>> 16;
  var bl = b & 0xffff;
  return (al*bl + ((ah*bl + al*bh) << 16))|0;
};
Math.imul = Math['imul'];


if (!Math['clz32']) Math['clz32'] = function(x) {
  x = x >>> 0;
  for (var i = 0; i < 32; i++) {
    if (x & (1 << (31 - i))) return i;
  }
  return 32;
};
Math.clz32 = Math['clz32']

var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_fround = Math.fround;
var Math_min = Math.min;
var Math_clz32 = Math.clz32;

// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// PRE_RUN_ADDITIONS (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled

function getUniqueRunDependency(id) {
  return id;
}

function addRunDependency(id) {
  runDependencies++;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
}
Module["addRunDependency"] = addRunDependency;

function removeRunDependency(id) {
  runDependencies--;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}
Module["removeRunDependency"] = removeRunDependency;

Module["preloadedImages"] = {}; // maps url to image data
Module["preloadedAudios"] = {}; // maps url to audio data



var memoryInitializer = null;



// === Body ===

var ASM_CONSTS = [function() { { var _ctx = exports.get(); GLctx.texImage2D(GLctx.TEXTURE_2D, 0, GLctx.RGBA, GLctx.RGBA, GLctx.UNSIGNED_BYTE, _ctx.currentImage); } },
 function() { { var _ctx = exports.get(); GLctx.texImage2D(GLctx.TEXTURE_2D, 0, GLctx.RGBA, GLctx.RGBA, GLctx.UNSIGNED_BYTE, _ctx.currentText); } },
 function($0) { { var buffer = document.createElement('canvas'); buffer.width = GLctx.canvas.wodth; buffer.height = GLctx.canvas.height; var myctx = buffer.getContext("2d"); var mytext = myctx.measureText(" "); return mytext.width; } },
 function() { { var cubeImage = document.createElement('canvas'); cubeImage.width = 512; cubeImage.height = 512; var textContext = cubeImage.getContext('2d'); textContext.beginPath(); textContext.rect(0, 0, textContext.canvas.width, textContext.canvas.height); textContext.fillStyle = 'rgba(0,0,0,0)'; textContext.fill(); var _ctx = exports.get(); textContext.fillStyle = _ctx.fillStyle; textContext.strokeStyle = _ctx.strokeStyle; textContext.font = _ctx.font; textContext.textAlign = _ctx.textAlign; textContext.fillText(_ctx.get_text(), textContext.canvas.width/2, textContext.canvas.height/2); textContext.restore(); _ctx.currentText=cubeImage; } },
 function() { { var cubeImage = document.createElement('canvas'); cubeImage.width = 512; cubeImage.height = 512; var textContext = cubeImage.getContext('2d'); textContext.beginPath(); textContext.rect(0, 0, textContext.canvas.width, textContext.canvas.height); textContext.fillStyle = 'rgba(0,0,0,0)'; textContext.fill(); var _ctx = exports.get(); textContext.fillStyle = _ctx.fillStyle; textContext.strokeStyle = _ctx.strokeStyle; textContext.font = _ctx.font; textContext.textAlign = _ctx.textAlign; textContext.strokeText(_ctx.get_text(), textContext.canvas.width/2, textContext.canvas.height/2); textContext.restore(); _ctx.currentText=cubeImage; } }];

function _emscripten_asm_const_0(code) {
 return ASM_CONSTS[code]();
}

function _emscripten_asm_const_1(code, a0) {
 return ASM_CONSTS[code](a0);
}



STATIC_BASE = 8;

STATICTOP = STATIC_BASE + 19520;
  /* global initializers */  __ATINIT__.push();
  

/* memory initializer */ allocate([240,30,0,0,27,62,0,0,24,0,0,0,0,0,0,0,200,30,0,0,40,62,0,0,200,30,0,0,53,62,0,0,240,30,0,0,66,62,0,0,32,0,0,0,0,0,0,0,240,30,0,0,99,62,0,0,40,0,0,0,0,0,0,0,240,30,0,0,133,62,0,0,56,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,95,56,0,0,0,0,112,67,0,0,120,67,0,0,127,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,105,56,0,0,0,0,122,67,0,0,107,67,0,0,87,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,118,56,0,0,0,0,0,0,0,0,127,67,0,0,127,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,123,56,0,0,0,0,254,66,0,0,127,67,0,0,84,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,134,56,0,0,0,0,112,67,0,0,127,67,0,0,127,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,140,56,0,0,0,0,117,67,0,0,117,67,0,0,92,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,146,56,0,0,0,0,127,67,0,0,100,67,0,0,68,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,153,56,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,159,56,0,0,0,0,127,67,0,0,107,67,0,0,77,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,174,56,0,0,0,0,0,0,0,0,0,0,0,0,127,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,179,56,0,0,0,0,10,67,0,0,44,66,0,0,98,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,190,56,0,0,0,0,37,67,0,0,40,66,0,0,40,66,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,196,56,0,0,0,0,94,67,0,0,56,67,0,0,7,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,206,56,0,0,0,0,190,66,0,0,30,67,0,0,32,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,216,56,0,0,0,0,254,66,0,0,127,67,0,0,0,0,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,227,56,0,0,0,0,82,67,0,0,210,66,0,0,240,65,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,237,56,0,0,0,0,127,67,0,0,254,66,0,0,160,66,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,243,56,0,0,0,0,200,66,0,0,21,67,0,0,109,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,57,0,0,0,0,127,67,0,0,120,67,0,0,92,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,11,57,0,0,0,0,92,67,0,0,160,65,0,0,112,66,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,19,57,0,0,0,0,0,0,0,0,127,67,0,0,127,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,24,57,0,0,0,0,0,0,0,0,0,0,0,0,11,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,33,57,0,0,0,0,0,0,0,0,11,67,0,0,11,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,42,57,0,0,0,0,56,67,0,0,6,67,0,0,48,65,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,56,57,0,0,0,0,41,67,0,0,41,67,0,0,41,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,65,57,0,0,0,0,0,0,0,0,200,66,0,0,0,0,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,75,57,0,0,0,0,41,67,0,0,41,67,0,0,41,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,84,57,0,0,0,0,61,67,0,0,55,67,0,0,214,66,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,94,57,0,0,0,0,11,67,0,0,0,0,0,0,11,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,106,57,0,0,0,0,170,66,0,0,214,66,0,0,60,66,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,121,57,0,0,0,0,127,67,0,0,12,67,0,0,0,0,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,132,57,0,0,0,0,25,67,0,0,72,66,0,0,76,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,143,57,0,0,0,0,11,67,0,0,0,0,0,0,0,0,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,151,57,0,0,0,0,105,67,0,0,22,67,0,0,244,66,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,162,57,0,0,0,0,15,67,0,0,60,67,0,0,15,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,175,57,0,0,0,0,144,66,0,0,116,66,0,0,11,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,189,57,0,0,0,0,60,66,0,0,158,66,0,0,158,66,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,203,57,0,0,0,0,60,66,0,0,158,66,0,0,158,66,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,217,57,0,0,0,0,0,0,0,0,78,67,0,0,81,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,231,57,0,0,0,0,20,67,0,0,0,0,0,0,83,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,242,57,0,0,0,0,127,67,0,0,160,65,0,0,19,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,251,57,0,0,0,0,0,0,0,0,63,67,0,0,127,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,58,0,0,0,0,210,66,0,0,210,66,0,0,210,66,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,15,58,0,0,0,0,210,66,0,0,210,66,0,0,210,66,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,23,58,0,0,0,0,240,65,0,0,16,67,0,0,127,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,34,58,0,0,0,0,50,67,0,0,8,66,0,0,8,66,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,44,58,0,0,0,0,127,67,0,0,122,67,0,0,112,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,56,58,0,0,0,0,8,66,0,0,11,67,0,0,8,66,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,68,58,0,0,0,0,127,67,0,0,0,0,0,0,127,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,76,58,0,0,0,0,92,67,0,0,92,67,0,0,92,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,86,58,0,0,0,0,120,67,0,0,120,67,0,0,127,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,97,58,0,0,0,0,127,67,0,0,87,67,0,0,0,0,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,102,58,0,0,0,0,90,67,0,0,37,67,0,0,0,66,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,112,58,0,0,0,0,0,67,0,0,0,67,0,0,0,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,117,58,0,0,0,0,0,67,0,0,0,67,0,0,0,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,122,58,0,0,0,0,0,0,0,0,0,67,0,0,0,0,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,58,0,0,0,0,45,67,0,0,127,67,0,0,60,66,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,140,58,0,0,0,0,112,67,0,0,127,67,0,0,112,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,149,58,0,0,0,0,127,67,0,0,210,66,0,0,52,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,157,58,0,0,0,0,77,67,0,0,184,66,0,0,184,66,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,167,58,0,0,0,0,150,66,0,0,0,0,0,0,2,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,174,58,0,0,0,0,127,67,0,0,127,67,0,0,112,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,180,58,0,0,0,0,112,67,0,0,102,67,0,0,12,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,186,58,0,0,0,0,102,67,0,0,102,67,0,0,122,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,195,58,0,0,0,0,127,67,0,0,112,67,0,0,117,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,209,58,0,0,0,0,248,66,0,0,124,67,0,0,0,0,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,219,58,0,0,0,0,127,67,0,0,122,67,0,0,77,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,232,58,0,0,0,0,45,67,0,0,88,67,0,0,102,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,242,58,0,0,0,0,112,67,0,0,0,67,0,0,0,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,253,58,0,0,0,0,96,67,0,0,127,67,0,0,127,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,59,0,0,0,0,122,67,0,0,122,67,0,0,82,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,28,59,0,0,0,0,83,67,0,0,83,67,0,0,83,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,38,59,0,0,0,0,16,67,0,0,110,67,0,0,16,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,49,59,0,0,0,0,83,67,0,0,83,67,0,0,83,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,59,59,0,0,0,0,127,67,0,0,54,67,0,0,65,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,69,59,0,0,0,0,127,67,0,0,32,67,0,0,244,66,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,81,59,0,0,0,0,0,66,0,0,50,67,0,0,42,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,95,59,0,0,0,0,7,67,0,0,78,67,0,0,122,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,108,59,0,0,0,0,238,66,0,0,8,67,0,0,25,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,123,59,0,0,0,0,238,66,0,0,8,67,0,0,25,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,138,59,0,0,0,0,48,67,0,0,68,67,0,0,94,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,153,59,0,0,0,0,127,67,0,0,127,67,0,0,96,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,165,59,0,0,0,0,0,0,0,0,127,67,0,0,0,0,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,170,59,0,0,0,0,72,66,0,0,77,67,0,0,72,66,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,180,59,0,0,0,0,122,67,0,0,112,67,0,0,102,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,186,59,0,0,0,0,127,67,0,0,0,0,0,0,127,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,194,59,0,0,0,0,0,67,0,0,0,0,0,0,0,0,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,201,59,0,0,0,0,204,66,0,0,77,67,0,0,42,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,218,59,0,0,0,0,0,0,0,0,0,0,0,0,77,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,229,59,0,0,0,0,58,67,0,0,170,66,0,0,83,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,242,59,0,0,0,0,19,67,0,0,224,66,0,0,91,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,255,59,0,0,0,0,112,66,0,0,51,67,0,0,226,66,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,14,60,0,0,0,0,246,66,0,0,208,66,0,0,110,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,30,60,0,0,0,0,0,0,0,0,122,67,0,0,26,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,48,60,0,0,0,0,144,66,0,0,81,67,0,0,76,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,64,60,0,0,0,0,71,67,0,0,168,65,0,0,5,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,80,60,0,0,0,0,200,65,0,0,200,65,0,0,224,66,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,93,60,0,0,0,0,117,67,0,0,127,67,0,0,122,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,103,60,0,0,0,0,127,67,0,0,100,67,0,0,97,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,113,60,0,0,0,0,127,67,0,0,100,67,0,0,53,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,122,60,0,0,0,0,127,67,0,0,94,67,0,0,45,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,134,60,0,0,0,0,0,0,0,0,0,0,0,0,0,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,139,60,0,0,0,0,125,67,0,0,117,67,0,0,102,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,147,60,0,0,0,0,0,67,0,0,0,67,0,0,0,0,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,153,60,0,0,0,0,214,66,0,0,14,67,0,0,12,66,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,163,60,0,0,0,0,127,67,0,0,37,67,0,0,0,0,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,170,60,0,0,0,0,127,67,0,0,138,66,0,0,0,0,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,180,60,0,0,0,0,90,67,0,0,224,66,0,0,86,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,187,60,0,0,0,0,110,67,0,0,104,67,0,0,42,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,201,60,0,0,0,0,24,67,0,0,123,67,0,0,24,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,211,60,0,0,0,0,47,67,0,0,110,67,0,0,110,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,225,60,0,0,0,0,91,67,0,0,224,66,0,0,19,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,239,60,0,0,0,0,127,67,0,0,111,67,0,0,85,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,250,60,0,0,0,0,127,67,0,0,90,67,0,0,57,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,61,0,0,0,0,77,67,0,0,5,67,0,0,124,66,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,9,61,0,0,0,0,127,67,0,0,64,67,0,0,75,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,14,61,0,0,0,0,93,67,0,0,32,67,0,0,93,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,19,61,0,0,0,0,48,67,0,0,96,67,0,0,102,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,30,61,0,0,0,0,0,67,0,0,0,0,0,0,0,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,61,0,0,0,0,127,67,0,0,0,0,0,0,0,0,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,41,61,0,0,0,0,60,67,0,0,15,67,0,0,15,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,51,61,0,0,0,0,130,66,0,0,210,66,0,0,97,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,61,61,0,0,0,0,11,67,0,0,138,66,0,0,152,65,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,73,61,0,0,0,0,122,67,0,0,0,67,0,0,228,66,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,80,61,0,0,0,0,116,67,0,0,36,67,0,0,192,66,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,91,61,0,0,0,0,56,66,0,0,11,67,0,0,174,66,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,100,61,0,0,0,0,127,67,0,0,117,67,0,0,110,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,109,61,0,0,0,0,32,67,0,0,164,66,0,0,52,66,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,116,61,0,0,0,0,64,67,0,0,64,67,0,0,64,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,123,61,0,0,0,0,7,67,0,0,78,67,0,0,107,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,131,61,0,0,0,0,212,66,0,0,180,66,0,0,77,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,141,61,0,0,0,0,224,66,0,0,0,67,0,0,16,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,151,61,0,0,0,0,224,66,0,0,0,67,0,0,16,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,161,61,0,0,0,0,127,67,0,0,122,67,0,0,122,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,166,61,0,0,0,0,0,0,0,0,127,67,0,0,254,66,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,178,61,0,0,0,0,140,66,0,0,2,67,0,0,52,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,188,61,0,0,0,0,82,67,0,0,52,67,0,0,12,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,192,61,0,0,0,0,0,0,0,0,0,67,0,0,0,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,197,61,0,0,0,0,88,67,0,0,63,67,0,0,88,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,205,61,0,0,0,0,127,67,0,0,198,66,0,0,142,66,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,212,61,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,224,61,0,0,0,0,128,66,0,0,96,67,0,0,80,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,234,61,0,0,0,0,110,67,0,0,2,67,0,0,110,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,241,61,0,0,0,0,117,67,0,0,94,67,0,0,51,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,247,61,0,0,0,0,127,67,0,0,127,67,0,0,127,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,253,61,0,0,0,0,117,67,0,0,117,67,0,0,117,67,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,8,62,0,0,0,0,127,67,0,0,127,67,0,0,0,0,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,15,62,0,0,0,0,26,67,0,0,77,67,0,0,72,66,0,0,128,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,8,0,0,0,1,0,0,0,2,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,56,0,0,0,3,0,0,0,4,0,0,0,5,0,0,0,6,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,72,0,0,0,3,0,0,0,7,0,0,0,5,0,0,0,6,0,0,0,1,0,0,0,2,0,0,0,2,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,72,31,0,0,72,31,0,0,0,0,0,0,5,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,3,0,0,0,37,70,0,0,0,4,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,10,255,255,255,255,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,78,97,110,111,86,71,0,123,32,118,97,114,32,98,117,102,102,101,114,32,61,32,100,111,99,117,109,101,110,116,46,99,114,101,97,116,101,69,108,101,109,101,110,116,40,39,99,97,110,118,97,115,39,41,59,32,98,117,102,102,101,114,46,119,105,100,116,104,32,61,32,71,76,99,116,120,46,99,97,110,118,97,115,46,119,111,100,116,104,59,32,98,117,102,102,101,114,46,104,101,105,103,104,116,32,61,32,71,76,99,116,120,46,99,97,110,118,97,115,46,104,101,105,103,104,116,59,32,118,97,114,32,109,121,99,116,120,32,61,32,98,117,102,102,101,114,46,103,101,116,67,111,110,116,101,120,116,40,34,50,100,34,41,59,32,118,97,114,32,109,121,116,101,120,116,32,61,32,109,121,99,116,120,46,109,101,97,115,117,114,101,84,101,120,116,40,34,32,34,41,59,32,114,101,116,117,114,110,32,109,121,116,101,120,116,46,119,105,100,116,104,59,32,125,0,123,32,118,97,114,32,99,117,98,101,73,109,97,103,101,32,61,32,100,111,99,117,109,101,110,116,46,99,114,101,97,116,101,69,108,101,109,101,110,116,40,39,99,97,110,118,97,115,39,41,59,32,99,117,98,101,73,109,97,103,101,46,119,105,100,116,104,32,61,32,53,49,50,59,32,99,117,98,101,73,109,97,103,101,46,104,101,105,103,104,116,32,61,32,53,49,50,59,32,118,97,114,32,116,101,120,116,67,111,110,116,101,120,116,32,61,32,99,117,98,101,73,109,97,103,101,46,103,101,116,67,111,110,116,101,120,116,40,39,50,100,39,41,59,32,116,101,120,116,67,111,110,116,101,120,116,46,98,101,103,105,110,80,97,116,104,40,41,59,32,116,101,120,116,67,111,110,116,101,120,116,46,114,101,99,116,40,48,44,32,48,44,32,116,101,120,116,67,111,110,116,101,120,116,46,99,97,110,118,97,115,46,119,105,100,116,104,44,32,116,101,120,116,67,111,110,116,101,120,116,46,99,97,110,118,97,115,46,104,101,105,103,104,116,41,59,32,116,101,120,116,67,111,110,116,101,120,116,46,102,105,108,108,83,116,121,108,101,32,61,32,39,114,103,98,97,40,48,44,48,44,48,44,48,41,39,59,32,116,101,120,116,67,111,110,116,101,120,116,46,102,105,108,108,40,41,59,32,118,97,114,32,95,99,116,120,32,61,32,101,120,112,111,114,116,115,46,103,101,116,40,41,59,32,116,101,120,116,67,111,110,116,101,120,116,46,102,105,108,108,83,116,121,108,101,32,61,32,95,99,116,120,46,102,105,108,108,83,116,121,108,101,59,32,116,101,120,116,67,111,110,116,101,120,116,46,115,116,114,111,107,101,83,116,121,108,101,32,61,32,95,99,116,120,46,115,116,114,111,107,101,83,116,121,108,101,59,32,116,101,120,116,67,111,110,116,101,120,116,46,102,111,110,116,32,61,32,95,99,116,120,46,102,111,110,116,59,32,116,101,120,116,67,111,110,116,101,120,116,46,116,101,120,116,65,108,105,103,110,32,61,32,95,99,116,120,46,116,101,120,116,65,108,105,103,110,59,32,116,101,120,116,67,111,110,116,101,120,116,46,102,105,108,108,84,101,120,116,40,95,99,116,120,46,103,101,116,95,116,101,120,116,40,41,44,32,116,101,120,116,67,111,110,116,101,120,116,46,99,97,110,118,97,115,46,119,105,100,116,104,47,50,44,32,116,101,120,116,67,111,110,116,101,120,116,46,99,97,110,118,97,115,46,104,101,105,103,104,116,47,50,41,59,32,116,101,120,116,67,111,110,116,101,120,116,46,114,101,115,116,111,114,101,40,41,59,32,95,99,116,120,46,99,117,114,114,101,110,116,84,101,120,116,61,99,117,98,101,73,109,97,103,101,59,32,125,0,123,32,118,97,114,32,99,117,98,101,73,109,97,103,101,32,61,32,100,111,99,117,109,101,110,116,46,99,114,101,97,116,101,69,108,101,109,101,110,116,40,39,99,97,110,118,97,115,39,41,59,32,99,117,98,101,73,109,97,103,101,46,119,105,100,116,104,32,61,32,53,49,50,59,32,99,117,98,101,73,109,97,103,101,46,104,101,105,103,104,116,32,61,32,53,49,50,59,32,118,97,114,32,116,101,120,116,67,111,110,116,101,120,116,32,61,32,99,117,98,101,73,109,97,103,101,46,103,101,116,67,111,110,116,101,120,116,40,39,50,100,39,41,59,32,116,101,120,116,67,111,110,116,101,120,116,46,98,101,103,105,110,80,97,116,104,40,41,59,32,116,101,120,116,67,111,110,116,101,120,116,46,114,101,99,116,40,48,44,32,48,44,32,116,101,120,116,67,111,110,116,101,120,116,46,99,97,110,118,97,115,46,119,105,100,116,104,44,32,116,101,120,116,67,111,110,116,101,120,116,46,99,97,110,118,97,115,46,104,101,105,103,104,116,41,59,32,116,101,120,116,67,111,110,116,101,120,116,46,102,105,108,108,83,116,121,108,101,32,61,32,39,114,103,98,97,40,48,44,48,44,48,44,48,41,39,59,32,116,101,120,116,67,111,110,116,101,120,116,46,102,105,108,108,40,41,59,32,118,97,114,32,95,99,116,120,32,61,32,101,120,112,111,114,116,115,46,103,101,116,40,41,59,32,116,101,120,116,67,111,110,116,101,120,116,46,102,105,108,108,83,116,121,108,101,32,61,32,95,99,116,120,46,102,105,108,108,83,116,121,108,101,59,32,116,101,120,116,67,111,110,116,101,120,116,46,115,116,114,111,107,101,83,116,121,108,101,32,61,32,95,99,116,120,46,115,116,114,111,107,101,83,116,121,108,101,59,32,116,101,120,116,67,111,110,116,101,120,116,46,102,111,110,116,32,61,32,95,99,116,120,46,102,111,110,116,59,32,116,101,120,116,67,111,110,116,101,120,116,46,116,101,120,116,65,108,105,103,110,32,61,32,95,99,116,120,46,116,101,120,116,65,108,105,103,110,59,32,116,101,120,116,67,111,110,116,101,120,116,46,115,116,114,111,107,101,84,101,120,116,40,95,99,116,120,46,103,101,116,95,116,101,120,116,40,41,44,32,116,101,120,116,67,111,110,116,101,120,116,46,99,97,110,118,97,115,46,119,105,100,116,104,47,50,44,32,116,101,120,116,67,111,110,116,101,120,116,46,99,97,110,118,97,115,46,104,101,105,103,104,116,47,50,41,59,32,116,101,120,116,67,111,110,116,101,120,116,46,114,101,115,116,111,114,101,40,41,59,32,95,99,116,120,46,99,117,114,114,101,110,116,84,101,120,116,61,99,117,98,101,73,109,97,103,101,59,32,125,0,35,118,101,114,115,105,111,110,32,49,48,48,10,35,100,101,102,105,110,101,32,78,65,78,79,86,71,95,71,76,50,32,49,10,35,100,101,102,105,110,101,32,85,78,73,70,79,82,77,65,82,82,65,89,95,83,73,90,69,32,49,49,10,10,0,35,105,102,100,101,102,32,78,65,78,79,86,71,95,71,76,51,10,9,117,110,105,102,111,114,109,32,118,101,99,50,32,118,105,101,119,83,105,122,101,59,10,9,105,110,32,118,101,99,50,32,118,101,114,116,101,120,59,10,9,105,110,32,118,101,99], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE);
/* memory initializer */ allocate([50,32,116,99,111,111,114,100,59,10,9,111,117,116,32,118,101,99,50,32,102,116,99,111,111,114,100,59,10,9,111,117,116,32,118,101,99,50,32,102,112,111,115,59,10,35,101,108,115,101,10,9,117,110,105,102,111,114,109,32,118,101,99,50,32,118,105,101,119,83,105,122,101,59,10,9,97,116,116,114,105,98,117,116,101,32,118,101,99,50,32,118,101,114,116,101,120,59,10,9,97,116,116,114,105,98,117,116,101,32,118,101,99,50,32,116,99,111,111,114,100,59,10,9,118,97,114,121,105,110,103,32,118,101,99,50,32,102,116,99,111,111,114,100,59,10,9,118,97,114,121,105,110,103,32,118,101,99,50,32,102,112,111,115,59,10,35,101,110,100,105,102,10,118,111,105,100,32,109,97,105,110,40,118,111,105,100,41,32,123,10,9,102,116,99,111,111,114,100,32,61,32,116,99,111,111,114,100,59,10,9,102,112,111,115,32,61,32,118,101,114,116,101,120,59,10,9,103,108,95,80,111,115,105,116,105,111,110,32,61,32,118,101,99,52,40,50,46,48,42,118,101,114,116,101,120,46,120,47,118,105,101,119,83,105,122,101,46,120,32,45,32,49,46,48,44,32,49,46,48,32,45,32,50,46,48,42,118,101,114,116,101,120,46,121,47,118,105,101,119,83,105,122,101,46,121,44,32,48,44,32,49,41,59,10,125,10,0,35,105,102,100,101,102,32,71,76,95,69,83,10,35,105,102,32,100,101,102,105,110,101,100,40,71,76,95,70,82,65,71,77,69,78,84,95,80,82,69,67,73,83,73,79,78,95,72,73,71,72,41,32,124,124,32,100,101,102,105,110,101,100,40,78,65,78,79,86,71,95,71,76,51,41,10,32,112,114,101,99,105,115,105,111,110,32,104,105,103,104,112,32,102,108,111,97,116,59,10,35,101,108,115,101,10,32,112,114,101,99,105,115,105,111,110,32,109,101,100,105,117,109,112,32,102,108,111,97,116,59,10,35,101,110,100,105,102,10,35,101,110,100,105,102,10,35,105,102,100,101,102,32,78,65,78,79,86,71,95,71,76,51,10,35,105,102,100,101,102,32,85,83,69,95,85,78,73,70,79,82,77,66,85,70,70,69,82,10,9,108,97,121,111,117,116,40,115,116,100,49,52,48,41,32,117,110,105,102,111,114,109,32,102,114,97,103,32,123,10,9,9,109,97,116,51,32,115,99,105,115,115,111,114,77,97,116,59,10,9,9,109,97,116,51,32,112,97,105,110,116,77,97,116,59,10,9,9,118,101,99,52,32,105,110,110,101,114,67,111,108,59,10,9,9,118,101,99,52,32,111,117,116,101,114,67,111,108,59,10,9,9,118,101,99,50,32,115,99,105,115,115,111,114,69,120,116,59,10,9,9,118,101,99,50,32,115,99,105,115,115,111,114,83,99,97,108,101,59,10,9,9,118,101,99,50,32,101,120,116,101,110,116,59,10,9,9,102,108,111,97,116,32,114,97,100,105,117,115,59,10,9,9,102,108,111,97,116,32,102,101,97,116,104,101,114,59,10,9,9,102,108,111,97,116,32,115,116,114,111,107,101,77,117,108,116,59,10,9,9,102,108,111,97,116,32,115,116,114,111,107,101,84,104,114,59,10,9,9,105,110,116,32,116,101,120,84,121,112,101,59,10,9,9,105,110,116,32,116,121,112,101,59,10,9,125,59,10,35,101,108,115,101,10,9,117,110,105,102,111,114,109,32,118,101,99,52,32,102,114,97,103,91,85,78,73,70,79,82,77,65,82,82,65,89,95,83,73,90,69,93,59,10,35,101,110,100,105,102,10,9,117,110,105,102,111,114,109,32,115,97,109,112,108,101,114,50,68,32,116,101,120,59,10,9,105,110,32,118,101,99,50,32,102,116,99,111,111,114,100,59,10,9,105,110,32,118,101,99,50,32,102,112,111,115,59,10,9,111,117,116,32,118,101,99,52,32,111,117,116,67,111,108,111,114,59,10,35,101,108,115,101,10,9,117,110,105,102,111,114,109,32,118,101,99,52,32,102,114,97,103,91,85,78,73,70,79,82,77,65,82,82,65,89,95,83,73,90,69,93,59,10,9,117,110,105,102,111,114,109,32,115,97,109,112,108,101,114,50,68,32,116,101,120,59,10,9,118,97,114,121,105,110,103,32,118,101,99,50,32,102,116,99,111,111,114,100,59,10,9,118,97,114,121,105,110,103,32,118,101,99,50,32,102,112,111,115,59,10,35,101,110,100,105,102,10,35,105,102,110,100,101,102,32,85,83,69,95,85,78,73,70,79,82,77,66,85,70,70,69,82,10,9,35,100,101,102,105,110,101,32,115,99,105,115,115,111,114,77,97,116,32,109,97,116,51,40,102,114,97,103,91,48,93,46,120,121,122,44,32,102,114,97,103,91,49,93,46,120,121,122,44,32,102,114,97,103,91,50,93,46,120,121,122,41,10,9,35,100,101,102,105,110,101,32,112,97,105,110,116,77,97,116,32,109,97,116,51,40,102,114,97,103,91,51,93,46,120,121,122,44,32,102,114,97,103,91,52,93,46,120,121,122,44,32,102,114,97,103,91,53,93,46,120,121,122,41,10,9,35,100,101,102,105,110,101,32,105,110,110,101,114,67,111,108,32,102,114,97,103,91,54,93,10,9,35,100,101,102,105,110,101,32,111,117,116,101,114,67,111,108,32,102,114,97,103,91,55,93,10,9,35,100,101,102,105,110,101,32,115,99,105,115,115,111,114,69,120,116,32,102,114,97,103,91,56,93,46,120,121,10,9,35,100,101,102,105,110,101,32,115,99,105,115,115,111,114,83,99,97,108,101,32,102,114,97,103,91,56,93,46,122,119,10,9,35,100,101,102,105,110,101,32,101,120,116,101,110,116,32,102,114,97,103,91,57,93,46,120,121,10,9,35,100,101,102,105,110,101,32,114,97,100,105,117,115,32,102,114,97,103,91,57,93,46,122,10,9,35,100,101,102,105,110,101,32,102,101,97,116,104,101,114,32,102,114,97,103,91,57,93,46,119,10,9,35,100,101,102,105,110,101,32,115,116,114,111,107,101,77,117,108,116,32,102,114,97,103,91,49,48,93,46,120,10,9,35,100,101,102,105,110,101,32,115,116,114,111,107,101,84,104,114,32,102,114,97,103,91,49,48,93,46,121,10,9,35,100,101,102,105,110,101,32,116,101,120,84,121,112,101,32,105,110,116,40,102,114,97,103,91,49,48,93,46,122,41,10,9,35,100,101,102,105,110,101,32,116,121,112,101,32,105,110,116,40,102,114,97,103,91,49,48,93,46,119,41,10,35,101,110,100,105,102,10,10,102,108,111,97,116,32,115,100,114,111,117,110,100,114,101,99,116,40,118,101,99,50,32,112,116,44,32,118,101,99,50,32,101,120,116,44,32,102,108,111,97,116,32,114,97,100,41,32,123,10,9,118,101,99,50,32,101,120,116,50,32,61,32,101,120,116,32,45,32,118,101,99,50,40,114,97,100,44,114,97,100,41,59,10,9,118,101,99,50,32,100,32,61,32,97,98,115,40,112,116,41,32,45,32,101,120,116,50,59,10,9,114,101,116,117,114,110,32,109,105,110,40,109,97,120,40,100,46,120,44,100,46,121,41,44,48,46,48,41,32,43,32,108,101,110,103,116,104,40,109,97,120,40,100,44,48,46,48,41,41,32,45,32,114,97,100,59,10,125,10,10,47,47,32,83,99,105,115,115,111,114,105,110,103,10,102,108,111,97,116,32,115,99,105,115,115,111,114,77,97,115,107,40,118,101,99,50,32,112,41,32,123,10,9,118,101,99,50,32,115,99,32,61,32,40,97,98,115,40,40,115,99,105,115,115,111,114,77,97,116,32,42,32,118,101,99,51,40,112,44,49,46,48,41,41,46,120,121,41,32,45,32,115,99,105,115,115,111,114,69,120,116,41,59,10,9,115,99,32,61,32,118,101,99,50,40,48,46,53,44,48,46,53,41,32,45,32,115,99,32,42,32,115,99,105,115,115,111,114,83,99,97,108,101,59,10,9,114,101,116,117,114,110,32,99,108,97,109,112,40,115,99,46,120,44,48,46,48,44,49,46,48,41,32,42,32,99,108,97,109,112,40,115,99,46,121,44,48,46,48,44,49,46,48,41,59,10,125,10,35,105,102,100,101,102,32,69,68,71,69,95,65,65,10,47,47,32,83,116,114,111,107,101,32,45,32,102,114,111,109,32,91,48,46,46,49,93,32,116,111,32,99,108,105,112,112,101,100,32,112,121,114,97,109,105,100,44,32,119,104,101,114,101,32,116,104,101,32,115,108,111,112,101,32,105,115,32,49,112,120,46,10,102,108,111,97,116,32,115,116,114,111,107,101,77,97,115,107,40,41,32,123,10,9,114,101,116,117,114,110,32,109,105,110,40,49,46,48,44,32,40,49,46,48,45,97,98,115,40,102,116,99,111,111,114,100,46,120,42,50,46,48,45,49,46,48,41,41,42,115,116,114,111,107,101,77,117,108,116,41,32,42,32,109,105,110,40,49,46,48,44,32,102,116,99,111,111,114,100,46,121,41,59,10,125,10,35,101,110,100,105,102,10,10,118,111,105,100,32,109,97,105,110,40,118,111,105,100,41,32,123,10,32,32,32,118,101,99,52,32,114,101,115,117,108,116,59,10,9,102,108,111,97,116,32,115,99,105,115,115,111,114,32,61,32,115,99,105,115,115,111,114,77,97,115,107,40,102,112,111,115,41,59,10,35,105,102,100,101,102,32,69,68,71,69,95,65,65,10,9,102,108,111,97,116,32,115,116,114,111,107,101,65,108,112,104,97,32,61,32,115,116,114,111,107,101,77,97,115,107,40,41,59,10,35,101,108,115,101,10,9,102,108,111,97,116,32,115,116,114,111,107,101,65,108,112,104,97,32,61,32,49,46,48,59,10,35,101,110,100,105,102,10,9,105,102,32,40,116,121,112,101,32,61,61,32,48,41,32,123,9,9,9,47,47,32,71,114,97,100,105,101,110,116,10,9,9,47,47,32,67,97,108,99,117,108,97,116,101,32,103,114,97,100,105,101,110,116,32,99,111,108,111,114,32,117,115,105,110,103,32,98,111,120,32,103,114,97,100,105,101,110,116,10,9,9,118,101,99,50,32,112,116,32,61,32,40,112,97,105,110,116,77,97,116,32,42,32,118,101,99,51,40,102,112,111,115,44,49,46,48,41,41,46,120,121,59,10,9,9,102,108,111,97,116,32,100,32,61,32,99,108,97,109,112,40,40,115,100,114,111,117,110,100,114,101,99,116,40,112,116,44,32,101,120,116,101,110,116,44,32,114,97,100,105,117,115,41,32,43,32,102,101,97,116,104,101,114,42,48,46,53,41,32,47,32,102,101,97,116,104,101,114,44,32,48,46,48,44,32,49,46,48,41,59,10,9,9,118,101,99,52,32,99,111,108,111,114,32,61,32,109,105,120,40,105,110,110,101,114,67,111,108,44,111,117,116,101,114,67,111,108,44,100,41,59,10,9,9,47,47,32,67,111,109,98,105,110,101,32,97,108,112,104,97,10,9,9,99,111,108,111,114,32,42,61,32,115,116,114,111,107,101,65,108,112,104,97,32,42,32,115,99,105,115,115,111,114,59,10,9,9,114,101,115,117,108,116,32,61,32,99,111,108,111,114,59,10,9,125,32,101,108,115,101,32,105,102,32,40,116,121,112,101,32,61,61,32,49,41,32,123,9,9,47,47,32,73,109,97,103,101,10,9,9,47,47,32,67,97,108,99,117,108,97,116,101,32,99,111,108,111,114,32,102,114,111,110,32,116,101,120,116,117,114,101,10,9,9,118,101,99,50,32,112,116,32,61,32,40,112,97,105,110,116,77,97,116,32,42,32,118,101,99,51,40,102,112,111,115,44,49,46,48,41,41,46,120,121,32,47,32,101,120,116,101,110,116,59,10,35,105,102,100,101,102,32,78,65,78,79,86,71,95,71,76,51,10,9,9,118,101,99,52,32,99,111,108,111,114,32,61,32,116,101,120,116,117,114,101,40,116,101,120,44,32,112,116,41,59,10,35,101,108,115,101,10,9,9,118,101,99,52,32,99,111,108,111,114,32,61,32,116,101,120,116,117,114,101,50,68,40,116,101,120,44,32,112,116,41,59,10,35,101,110,100,105,102,10,9,9,105,102,32,40,116,101,120,84,121,112,101,32,61,61,32,49,41,32,99,111,108,111,114,32,61,32,118,101,99,52,40,99,111,108,111,114,46,120,121,122,42,99,111,108,111,114,46,119,44,99,111,108,111,114,46,119,41,59,9,9,105,102,32,40,116,101,120,84,121,112,101,32,61,61,32,50,41,32,99,111,108,111,114,32,61,32,118,101,99,52,40,99,111,108,111,114,46,120,41,59,9,9,47,47,32,65,112,112,108,121,32,99,111,108,111,114,32,116,105,110,116,32,97,110,100,32,97,108,112,104,97,46,10,9,9,99,111,108,111,114,32,42,61,32,105,110,110,101,114,67,111,108,59,10,9,9,47,47,32,67,111,109,98,105,110,101,32,97,108,112,104,97,10,9,9,99,111,108,111,114,32,42,61,32,115,116,114,111,107,101,65,108,112,104,97,32,42,32,115,99,105,115,115,111,114,59,10,9,9,114,101,115,117,108,116,32,61,32,99,111,108,111,114,59,10,9,125,32,101,108,115,101,32,105,102,32,40,116,121,112,101,32,61,61,32,50,41,32,123,9,9,47,47,32,83,116,101,110,99,105,108,32,102,105,108,108,10,9,9,114,101,115,117,108,116,32,61,32,118,101,99,52,40,49,44,49,44,49,44,49,41,59,10,9,125,32,101,108,115,101,32,105,102,32,40,116,121,112,101,32,61,61,32,51,41,32,123,9,9,47,47,32,84,101,120,116,117,114,101,100,32,116,114,105,115,10,35,105,102,100,101,102,32,78,65,78,79,86,71,95,71,76,51,10,9,9,118,101,99,52,32,99,111,108,111,114,32,61,32,116,101,120,116,117,114,101,40,116,101,120,44,32,102,116,99,111,111,114,100,41,59,10,35,101,108,115,101,10,9,9,118,101,99,52,32,99,111,108,111,114,32,61,32,116,101,120,116,117,114,101,50,68,40,116,101,120,44,32,102,116,99,111,111,114,100,41,59,10,35,101,110,100,105,102,10,9,9,105,102,32,40,116,101,120,84,121,112,101,32,61,61,32,49,41,32,99,111,108,111,114,32,61,32,118,101,99,52,40,99,111,108,111,114,46,120,121,122,42,99,111,108,111,114,46,119,44,99,111,108,111,114,46,119,41,59,9,9,105,102,32,40,116,101,120,84,121,112,101,32,61,61,32,50,41,32,99,111,108,111,114,32,61,32,118,101,99,52,40,99,111,108,111,114,46,120,41,59,9,9,99,111,108,111,114,32,42,61,32,115,99,105,115,115,111,114,59,10,9,9,114,101,115,117,108,116,32,61,32,99,111,108,111,114,32,42,32,105,110,110,101,114,67,111,108,59,10,9,125,10,35,105,102,100,101,102,32,69,68,71,69,95,65,65,10,9,105,102,32,40,115,116,114,111,107,101,65,108,112,104,97,32,60,32,115,116,114,111,107,101,84,104,114,41,32,100,105,115,99,97,114,100,59,10,35,101,110,100,105,102,10,35,105,102,100,101,102,32,78,65,78,79,86,71,95,71,76,51,10,9,111,117,116,67,111,108,111,114,32,61,32,114,101,115,117,108,116,59,10,35,101,108,115,101,10,9,103,108,95,70,114,97,103,67,111,108,111,114,32,61,32,114,101,115,117,108,116,59,10,35,101,110,100,105,102,10,125,10,0,105,110,105,116,0,115,104,97,100,101,114,0,35,100,101,102,105,110,101,32,69,68,71,69,95,65,65,32,49,10,0,117,110,105,102,111,114,109,32,108,111,99,97,116,105,111,110,115,0,99,114,101,97,116,101,32,100,111,110,101,0,69,114,114,111,114,32,37,48,56,120,32,97,102,116,101,114,32,37,115,10,0,0,118,101,114,116,0,102,114,97,103,0,118,101,114,116,101,120,0,116,99,111,111,114,100,0,83,104,97,100,101,114,32,37,115,47,37,115,32,101,114,114,111,114,58,10,37,115,10,0,80,114,111,103,114,97,109,32,37,115,32,101,114,114,111,114,58,10,37,115,10,0,118,105,101,119,83,105,122,101,0,116,101,120,0,82,101,112,101,97,116,32,88,47,89,32,105,115,32,110,111,116,32,115,117,112,112,111,114,116,101,100,32,102,111,114,32,110,111,110,32,112,111,119,101,114,45,111,102,45,116,119,111,32,116,101,120,116,117,114,101,115,32,40,37,100,32,120,32,37,100,41,10,0,77,105,112,45,109,97,112,115,32,105,115,32,110,111,116,32,115,117,112,112,111,114,116,32,102,111,114,32,110,111,110,32,112,111,119,101,114,45,111,102,45,116,119,111,32,116,101,120,116,117,114,101,115,32,40,37,100,32,120,32,37,100,41,10,0,99,114,101,97,116,101,32,116,101,120,0,102,105,108,108,32,115,105,109,112,108,101,0,102,105,108,108,32,102,105,108,108,0,116,101,120,32,112,97,105,110,116,32,116,101,120,0,99,111,110,118,101,120,32,102,105,108,108,0,115,116,114,111,107,101,32,102,105,108,108,32,48,0,115,116,114,111,107,101,32,102,105,108,108,32,49,0,115,116,114,111,107,101,32,102,105,108,108,0,116,114,105,97,110,103,108,101,115,32,102,105,108,108,0,123,32,118,97,114,32,95,99,116,120,32,61,32,101,120,112,111,114,116,115,46,103,101,116,40,41,59,32,71,76,99,116,120,46,116,101,120,73,109,97,103,101,50,68,40,71,76,99,116,120,46,84,69,88,84,85,82,69,95,50,68,44,32,48,44,32,71,76,99,116,120,46,82,71,66,65,44,32,71,76,99,116,120,46,82,71,66,65,44,32,71,76,99,116,120,46,85,78,83,73,71,78,69,68,95,66,89,84,69,44,32,95,99,116,120,46,99,117,114,114,101,110,116,73,109,97,103,101,41,59,32,125,0,123,32,118,97,114,32,95,99,116,120,32,61,32,101,120,112,111,114,116,115,46,103,101,116,40,41,59,32,71,76,99,116,120,46,116,101,120,73,109,97,103,101,50,68,40,71,76,99,116,120,46,84,69,88,84,85,82,69,95,50,68,44,32,48,44,32,71,76,99,116,120,46,82,71,66,65,44,32,71,76,99,116,120,46,82,71,66,65,44,32,71,76,99,116,120,46,85,78,83,73,71,78,69,68,95,66,89,84,69,44,32,95,99,116,120,46,99,117,114,114,101,110,116,84,101,120,116,41,59,32,125,0,0,97,108,105,99,101,98,108,117,101,0,97,110,116,105,113,117,101,119,104,105,116,101,0,97,113,117,97,0,97,113,117,97,109,97,114,105,110,101,0,97,122,117,114,101,0,98,101,105,103,101,0,98,105,115,113,117,101,0,98,108,97,99,107,0,98,108,97,110,99,104,101,100,97,108,109,111,110,100,0,98,108,117,101,0,98,108,117,101,118,105,111,108,101,116,0,98,114,111,119,110,0,98,117,114,108,121,119,111,111,100,0,99,97,100,101,116,98,108,117,101,0,99,104,97,114,116,114,101,117,115,101,0,99,104,111,99,111,108,97,116,101,0,99,111,114,97,108,0,99,111,114,110,102,108,111,119,101,114,98,108,117,101,0,99,111,114,110,115,105,108,107,0,99,114,105,109,115,111,110,0,99,121,97,110,0,100,97,114,107,98,108,117,101,0,100,97,114,107,99,121,97,110,0,100,97,114,107,103,111,108,100,101,110,114,111,100,0,100,97,114,107,103,114,97,121,0,100,97,114,107,103,114,101,101,110,0,100,97,114,107,103,114,101,121,0,100,97,114,107,107,104,97,107,105,0,100,97,114,107,109,97,103,101,110,116,97,0,100,97,114,107,111,108,105,118,101,103,114,101,101,110,0,100,97,114,107,111,114,97,110,103,101,0,100,97,114,107,111,114,99,104,105,100,0,100,97,114,107,114,101,100,0,100,97,114,107,115,97,108,109,111,110,0,100,97,114,107,115,101,97,103,114,101,101,110,0,100,97,114,107,115,108,97,116,101,98,108,117,101,0,100,97,114,107,115,108,97,116,101,103,114,97,121,0,100,97,114,107,115,108,97,116,101,103,114,101,121,0,100,97,114,107,116,117,114,113,117,111,105,115,101,0,100,97,114,107,118,105,111,108,101,116,0,100,101,101,112,112,105,110,107,0,100,101,101,112,115,107,121,98,108,117,101,0,100,105,109,103,114,97,121,0,100,105,109,103,114,101,121,0,100,111,100,103,101,114,98,108,117,101,0,102,105,114,101,98,114,105,99,107,0,102,108,111,114,97,108,119,104,105,116,101,0,102,111,114,101,115,116,103,114,101,101,110,0,102,117,99,104,115,105,97,0,103,97,105,110,115,98,111,114,111,0,103,104,111,115,116,119,104,105,116,101,0,103,111,108,100,0,103,111,108,100,101,110,114,111,100,0,103,114,97,121,0,103,114,101,121,0,103,114,101,101,110,0,103,114,101,101,110,121,101,108,108,111,119,0,104,111,110,101,121,100,101,119,0,104,111,116,112,105,110,107,0,105,110,100,105,97,110,114,101,100,0,105,110,100,105,103,111,0,105,118,111,114,121,0,107,104,97,107,105,0,108,97,118,101,110,100,101,114,0,108,97,118,101,110,100,101,114,98,108,117,115,104,0,108,97,119,110,103,114,101,101,110,0,108,101,109,111,110,99,104,105,102,102,111,110,0,108,105,103,104,116,98,108,117,101,0,108,105,103,104,116,99,111,114,97,108,0,108,105,103,104,116,99,121,97,110,0,108,105,103,104,116,103,111,108,100,101,110,114,111,100,121,101,108,108,111,119,0,108,105,103,104,116,103,114,97,121,0,108,105,103,104,116,103,114,101,101,110,0,108,105,103,104,116,103,114,101,121,0,108,105,103,104,116,112,105,110,107,0,108,105,103,104,116,115,97,108,109,111,110,0,108,105,103,104,116,115,101,97,103,114,101,101,110,0,108,105,103,104,116,115,107,121,98,108,117,101,0,108,105,103,104,116,115,108,97,116,101,103,114,97,121,0,108,105,103,104,116,115,108,97,116,101,103,114,101,121,0,108,105,103,104,116,115,116,101,101,108,98,108,117,101,0,108,105,103,104,116,121,101,108,108,111,119,0,108,105,109,101,0,108,105,109,101,103,114,101,101,110,0,108,105,110,101,110,0,109,97,103,101,110,116,97,0,109,97,114,111,111,110,0,109,101,100,105,117,109,97,113,117,97,109,97,114,105,110,101,0,109,101,100,105,117,109,98,108,117,101,0,109,101,100,105,117,109,111,114,99,104,105,100,0,109,101,100,105,117,109,112,117,114,112,108,101,0,109,101,100,105,117,109,115,101,97,103,114,101,101,110,0,109,101,100,105,117,109,115,108,97,116,101,98,108,117,101,0,109,101,100,105,117,109,115,112,114,105,110,103,103,114,101,101,110,0,109,101,100,105,117,109,116,117,114,113,117,111,105,115,101,0,109,101,100,105,117,109,118,105,111,108,101,116,114,101,100,0,109,105,100,110,105,103,104,116,98,108,117,101,0,109,105,110,116,99,114,101,97,109,0,109,105,115,116,121,114,111,115,101,0,109,111,99,99,97,115,105,110,0,110,97,118,97,106,111,119,104,105,116,101,0,110,97,118,121,0,111,108,100,108,97,99,101,0,111,108,105,118,101,0,111,108,105,118,101,100,114,97,98,0,111,114,97,110,103,101,0,111,114,97,110,103,101,114,101,100,0,111,114,99,104,105,100,0,112,97,108,101,103,111,108,100,101,110,114,111,100,0,112,97,108,101,103,114,101,101,110,0,112,97,108,101,116,117,114,113,117,111,105,115,101,0,112,97,108,101,118,105,111,108,101,116,114,101,100,0,112,97,112,97,121,97,119,104,105,112,0,112,101,97,99,104,112,117,102,102,0,112,101,114,117,0,112,105,110,107,0,112,108,117,109,0,112,111,119,100,101,114,98,108,117,101,0,112,117,114,112,108,101,0,114,101,100,0,114,111,115,121,98,114,111,119,110,0,114,111,121,97,108,98,108,117,101,0,115,97,100,100,108,101,98,114,111,119,110,0,115,97,108,109,111,110,0,115,97,110,100,121,98,114,111,119,110,0,115,101,97,103,114,101,101,110,0,115,101,97,115,104,101,108,108,0,115,105,101,110,110,97,0,115,105,108,118,101,114,0,115,107,121,98,108,117,101,0,115,108,97,116,101,98,108,117,101,0,115,108,97,116,101,103,114,97,121,0,115,108,97,116,101,103,114,101,121,0,115,110,111,119,0,115,112,114,105,110,103,103,114,101,101,110,0,115,116,101,101,108,98,108,117,101,0,116,97,110,0,116,101,97,108,0,116,104,105,115,116,108,101,0,116,111,109,97,116,111,0,116,114,97,110,115,112,97,114,101,110,116,0,116,117,114,113,117,111,105,115,101,0,118,105,111,108,101,116,0,119,104,101,97,116,0,119,104,105,116,101,0,119,104,105,116,101,115,109,111,107,101,0,121,101,108,108,111,119,0,121,101,108,108,111,119,103,114,101,101,110,0,83,116,57,98,97,100,95,97,108,108,111,99,0,83,116,57,101,120,99,101,112,116,105,111,110,0,83,116,57,116,121,112,101,95,105,110,102,111,0,78,49,48,95,95,99,120,120,97,98,105,118,49,49,54,95,95,115,104,105,109,95,116,121,112,101,95,105,110,102,111,69,0,78,49,48,95,95,99,120,120,97,98,105,118,49,49,55,95,95,99,108,97,115,115,95,116,121,112,101,95,105,110,102,111,69,0,78,49,48,95,95,99,120,120,97,98,105,118,49,50,48,95,95,115,105,95,99,108,97,115,115,95,116,121,112,101,95,105,110,102,111,69,0,115,116,100,58,58,98,97,100,95,97,108,108,111,99,0,84,33,34,25,13,1,2,3,17,75,28,12,16,4,11,29,18,30,39,104,110,111,112,113,98,32,5,6,15,19,20,21,26,8,22,7,40,36,23,24,9,10,14,27,31,37,35,131,130,125,38,42,43,60,61,62,63,67,71,74,77,88,89,90,91,92,93,94,95,96,97,99,100,101,102,103,105,106,107,108,114,115,116,121,122,123,124,0,73,108,108,101,103,97,108,32,98,121,116,101,32,115,101,113,117,101,110,99,101,0,68,111,109,97,105,110,32,101,114,114,111,114,0,82,101,115,117,108,116,32,110,111,116,32,114,101,112,114,101,115,101,110,116,97,98,108,101,0,78,111,116,32,97,32,116,116,121,0,80,101,114,109,105,115,115,105,111,110,32,100,101,110,105,101,100,0,79,112,101,114,97,116,105,111,110,32,110,111,116,32,112,101,114,109,105,116,116,101,100,0,78,111,32,115,117,99,104,32,102,105,108,101,32,111,114,32,100,105,114,101,99,116,111,114,121,0,78,111,32,115,117,99,104,32,112,114,111,99,101,115,115,0,70,105,108,101,32,101,120,105,115,116,115,0,86,97,108,117,101,32,116,111,111,32,108,97,114,103,101,32,102,111,114,32,100,97,116,97,32,116,121,112,101,0,78,111,32,115,112,97,99,101,32,108,101,102,116,32,111,110,32,100,101,118,105,99,101,0,79,117,116,32,111,102,32,109,101,109,111,114,121,0,82,101,115,111,117,114,99,101,32,98,117,115,121,0,73,110,116,101,114,114,117,112,116,101,100,32,115,121,115,116,101,109,32,99,97,108,108,0,82,101,115,111,117,114,99,101,32,116,101,109,112,111,114,97,114,105,108,121,32,117,110,97,118,97,105,108,97,98,108,101,0,73,110,118,97,108,105,100,32,115,101,101,107,0,67,114,111,115,115,45,100,101,118,105,99,101,32,108,105,110,107,0,82,101,97,100,45,111,110,108,121,32,102,105,108,101,32,115,121,115,116,101,109,0,68,105,114,101,99,116,111,114,121,32,110,111,116,32,101,109,112,116,121,0,67,111,110,110,101,99,116,105,111,110,32,114,101,115,101,116,32,98,121,32,112,101,101,114,0,79,112,101,114,97,116,105,111,110,32,116,105,109,101,100,32,111,117,116,0,67,111,110,110,101,99,116,105,111,110,32,114,101,102,117,115,101,100,0,72,111,115,116,32,105,115,32,100,111,119,110,0,72,111,115,116,32,105,115,32,117,110,114,101,97,99,104,97,98,108,101,0,65,100,100,114,101,115,115,32,105,110,32,117,115,101,0,66,114,111,107,101,110,32,112,105,112,101,0,73,47,79,32,101,114,114,111,114,0,78,111,32,115,117,99,104,32,100,101,118,105,99,101,32,111,114,32,97,100,100,114,101,115,115,0,66,108,111,99,107,32,100,101,118,105,99,101,32,114,101,113,117,105,114,101,100,0,78,111,32,115,117,99,104,32,100,101,118,105,99,101,0,78,111,116,32,97,32,100,105,114,101,99,116,111,114,121,0,73,115,32,97,32,100,105,114,101,99,116,111,114,121,0,84,101,120,116,32,102,105,108,101,32,98,117,115,121,0,69,120,101,99,32,102,111,114,109,97,116,32,101,114,114,111,114,0,73,110,118,97,108,105,100,32,97,114,103,117,109,101,110,116,0,65,114,103,117,109,101,110,116,32,108,105,115,116,32,116,111,111,32,108,111,110,103,0,83,121,109,98,111,108,105,99,32,108,105,110,107,32,108,111,111,112,0,70,105,108,101,110,97,109,101,32,116,111,111,32,108,111,110,103,0,84,111,111,32,109,97,110,121,32,111,112,101,110,32,102,105,108,101,115,32,105,110,32,115,121,115,116,101,109,0,78,111,32,102,105,108,101,32,100,101,115,99,114,105,112,116,111,114,115,32,97,118,97,105,108,97,98,108,101,0,66,97,100,32,102,105,108,101,32,100,101,115,99,114,105,112,116,111,114,0,78,111,32,99,104,105,108,100,32,112,114,111,99,101,115,115,0,66,97,100,32,97,100,100,114,101,115,115,0,70,105,108,101,32,116,111,111,32,108,97,114,103,101,0,84,111,111,32,109,97,110,121,32,108,105,110,107,115,0,78,111,32,108,111,99,107,115,32,97,118,97,105,108,97,98,108,101,0,82,101,115,111,117,114,99,101,32,100,101,97,100,108,111,99,107,32,119,111,117,108,100,32,111,99,99,117,114,0,83,116,97,116,101,32,110,111,116,32,114,101,99,111,118,101,114,97,98,108,101,0,80,114,101,118,105,111,117,115,32,111,119,110,101,114,32,100,105,101,100,0,79,112,101,114,97,116,105,111,110,32,99,97,110,99,101,108,101,100,0,70,117,110,99,116,105,111,110,32,110,111,116,32,105,109,112,108,101,109,101,110,116,101,100,0,78,111,32,109,101,115,115,97,103,101,32,111,102,32,100,101,115,105,114,101,100,32,116,121,112,101,0,73,100,101,110,116,105,102,105,101,114,32,114,101,109,111,118,101,100,0,68,101,118,105,99,101,32,110,111,116,32,97,32,115,116,114,101,97,109,0,78,111,32,100,97,116,97,32,97,118,97,105,108,97,98,108,101,0,68,101,118,105,99,101,32,116,105,109,101,111,117,116,0,79,117,116,32,111,102,32,115,116,114,101,97,109,115,32,114,101,115,111,117,114,99,101,115,0,76,105,110,107,32,104,97,115,32,98,101,101,110,32,115,101,118,101,114,101,100,0,80,114,111,116,111,99,111,108,32,101,114,114,111,114,0,66,97,100,32,109,101,115,115,97,103,101,0,70,105,108,101,32,100,101,115,99,114,105,112,116,111,114,32,105,110,32,98,97,100,32,115,116,97,116,101,0,78,111,116,32,97,32,115,111,99,107,101,116,0,68,101,115,116,105,110,97,116,105,111,110,32,97,100,100,114,101,115,115,32,114,101,113,117,105,114,101,100,0,77,101,115,115,97,103,101,32,116,111,111,32,108,97,114,103,101,0,80,114,111,116,111,99,111,108,32,119,114,111,110,103,32,116,121,112,101,32,102,111,114,32,115,111,99,107,101,116,0,80,114,111,116,111,99,111,108,32,110,111,116,32,97,118,97,105,108,97,98,108,101,0,80,114,111,116,111,99,111,108,32,110,111,116,32,115,117,112,112,111,114,116,101,100,0,83,111,99,107,101,116,32,116,121,112,101,32,110,111,116,32,115,117,112,112,111,114,116,101,100,0,78,111,116,32,115,117,112,112,111,114,116,101,100,0,80,114,111,116,111,99,111,108,32,102,97,109,105,108,121,32,110,111,116,32,115,117,112,112,111,114,116,101,100,0,65,100,100,114,101,115,115,32,102,97,109,105,108,121,32,110,111,116,32,115,117,112,112,111,114,116,101,100,32,98,121,32,112,114,111,116,111,99,111,108,0,65,100,100,114,101,115,115,32,110,111,116,32,97,118,97,105,108,97,98,108,101,0,78,101,116,119,111,114,107,32,105,115,32,100,111,119,110,0,78,101,116,119,111,114,107,32,117,110,114,101,97,99,104,97,98,108,101,0,67,111,110,110,101,99,116,105,111,110,32,114,101,115,101,116,32,98,121,32,110,101,116,119,111,114,107,0,67,111,110,110,101,99,116,105,111,110,32,97,98,111,114,116,101,100,0,78,111,32,98,117,102,102,101,114,32,115,112,97,99,101,32,97,118,97,105,108,97,98,108,101,0,83,111,99,107,101,116,32,105,115,32,99,111,110,110,101,99,116,101,100,0,83,111,99,107,101,116,32,110,111,116,32,99,111,110,110,101,99,116,101,100,0,67,97,110,110,111,116,32,115,101,110,100,32,97,102,116,101,114,32,115,111,99,107,101,116,32,115,104,117,116,100,111,119,110,0,79,112,101,114,97,116,105,111,110,32,97,108,114,101,97,100,121,32,105,110,32,112,114,111,103,114,101,115,115,0,79,112,101,114,97,116,105,111,110,32,105,110,32,112,114,111,103,114,101,115,115,0,83,116,97,108,101,32,102,105,108,101,32,104,97,110,100,108,101,0,82,101,109,111,116,101,32,73,47,79,32,101,114,114,111,114,0,81,117,111,116,97,32,101,120,99,101,101,100,101,100,0,78,111,32,109,101,100,105,117,109,32,102,111,117,110,100,0,87,114,111,110,103,32,109,101,100,105,117,109,32,116,121,112,101,0,78,111,32,101,114,114,111,114,32,105,110,102,111,114,109,97,116,105,111,110], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+10240);
/* memory initializer */ allocate([17,0,10,0,17,17,17,0,0,0,0,5,0,0,0,0,0,0,9,0,0,0,0,11,0,0,0,0,0,0,0,0,17,0,15,10,17,17,17,3,10,7,0,1,19,9,11,11,0,0,9,6,11,0,0,11,0,6,17,0,0,0,17,17,17,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,11,0,0,0,0,0,0,0,0,17,0,10,10,17,17,17,0,10,0,0,2,0,9,11,0,0,0,9,0,11,0,0,11,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,0,12,0,0,0,0,9,12,0,0,0,0,0,12,0,0,12,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,14,0,0,0,0,0,0,0,0,0,0,0,13,0,0,0,4,13,0,0,0,0,9,14,0,0,0,0,0,14,0,0,14,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,16,0,0,0,0,0,0,0,0,0,0,0,15,0,0,0,0,15,0,0,0,0,9,16,0,0,0,0,0,16,0,0,16,0,0,18,0,0,0,18,18,18,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,18,0,0,0,18,18,18,0,0,0,0,0,0,9,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,11,0,0,0,0,0,0,0,0,0,0,0,10,0,0,0,0,10,0,0,0,0,9,11,0,0,0,0,0,11,0,0,11,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,0,12,0,0,0,0,9,12,0,0,0,0,0,12,0,0,12,0,0,48,49,50,51,52,53,54,55,56,57,65,66,67,68,69,70,45,43,32,32,32,48,88,48,120,0,40,110,117,108,108,41,0,45,48,88,43,48,88,32,48,88,45,48,120,43,48,120,32,48,120,0,105,110,102,0,73,78,70,0,110,97,110,0,78,65,78,0,46,0], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE+18973);





/* no memory initializer */
var tempDoublePtr = Runtime.alignMemory(allocate(12, "i8", ALLOC_STATIC), 8);

assert(tempDoublePtr % 8 == 0);

function copyTempFloat(ptr) { // functions, because inlining this code increases code size too much

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

}

function copyTempDouble(ptr) {

  HEAP8[tempDoublePtr] = HEAP8[ptr];

  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];

  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];

  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];

  HEAP8[tempDoublePtr+4] = HEAP8[ptr+4];

  HEAP8[tempDoublePtr+5] = HEAP8[ptr+5];

  HEAP8[tempDoublePtr+6] = HEAP8[ptr+6];

  HEAP8[tempDoublePtr+7] = HEAP8[ptr+7];

}

// {{PRE_LIBRARY}}


   
  Module["_i64Subtract"] = _i64Subtract;

   
  Module["_i64Add"] = _i64Add;

  
  function __ZSt18uncaught_exceptionv() { // std::uncaught_exception()
      return !!__ZSt18uncaught_exceptionv.uncaught_exception;
    }
  
  
  
  var EXCEPTIONS={last:0,caught:[],infos:{},deAdjust:function (adjusted) {
        if (!adjusted || EXCEPTIONS.infos[adjusted]) return adjusted;
        for (var ptr in EXCEPTIONS.infos) {
          var info = EXCEPTIONS.infos[ptr];
          if (info.adjusted === adjusted) {
            return ptr;
          }
        }
        return adjusted;
      },addRef:function (ptr) {
        if (!ptr) return;
        var info = EXCEPTIONS.infos[ptr];
        info.refcount++;
      },decRef:function (ptr) {
        if (!ptr) return;
        var info = EXCEPTIONS.infos[ptr];
        assert(info.refcount > 0);
        info.refcount--;
        if (info.refcount === 0) {
          if (info.destructor) {
            Runtime.dynCall('vi', info.destructor, [ptr]);
          }
          delete EXCEPTIONS.infos[ptr];
          ___cxa_free_exception(ptr);
        }
      },clearRef:function (ptr) {
        if (!ptr) return;
        var info = EXCEPTIONS.infos[ptr];
        info.refcount = 0;
      }};
  function ___resumeException(ptr) {
      if (!EXCEPTIONS.last) { EXCEPTIONS.last = ptr; }
      EXCEPTIONS.clearRef(EXCEPTIONS.deAdjust(ptr)); // exception refcount should be cleared, but don't free it
      throw ptr + " - Exception catching is disabled, this exception cannot be caught. Compile with -s DISABLE_EXCEPTION_CATCHING=0 or DISABLE_EXCEPTION_CATCHING=2 to catch.";
    }function ___cxa_find_matching_catch() {
      var thrown = EXCEPTIONS.last;
      if (!thrown) {
        // just pass through the null ptr
        return ((asm["setTempRet0"](0),0)|0);
      }
      var info = EXCEPTIONS.infos[thrown];
      var throwntype = info.type;
      if (!throwntype) {
        // just pass through the thrown ptr
        return ((asm["setTempRet0"](0),thrown)|0);
      }
      var typeArray = Array.prototype.slice.call(arguments);
  
      var pointer = Module['___cxa_is_pointer_type'](throwntype);
      // can_catch receives a **, add indirection
      if (!___cxa_find_matching_catch.buffer) ___cxa_find_matching_catch.buffer = _malloc(4);
      HEAP32[((___cxa_find_matching_catch.buffer)>>2)]=thrown;
      thrown = ___cxa_find_matching_catch.buffer;
      // The different catch blocks are denoted by different types.
      // Due to inheritance, those types may not precisely match the
      // type of the thrown object. Find one which matches, and
      // return the type of the catch block which should be called.
      for (var i = 0; i < typeArray.length; i++) {
        if (typeArray[i] && Module['___cxa_can_catch'](typeArray[i], throwntype, thrown)) {
          thrown = HEAP32[((thrown)>>2)]; // undo indirection
          info.adjusted = thrown;
          return ((asm["setTempRet0"](typeArray[i]),thrown)|0);
        }
      }
      // Shouldn't happen unless we have bogus data in typeArray
      // or encounter a type for which emscripten doesn't have suitable
      // typeinfo defined. Best-efforts match just in case.
      thrown = HEAP32[((thrown)>>2)]; // undo indirection
      return ((asm["setTempRet0"](throwntype),thrown)|0);
    }function ___cxa_throw(ptr, type, destructor) {
      EXCEPTIONS.infos[ptr] = {
        ptr: ptr,
        adjusted: ptr,
        type: type,
        destructor: destructor,
        refcount: 0
      };
      EXCEPTIONS.last = ptr;
      if (!("uncaught_exception" in __ZSt18uncaught_exceptionv)) {
        __ZSt18uncaught_exceptionv.uncaught_exception = 1;
      } else {
        __ZSt18uncaught_exceptionv.uncaught_exception++;
      }
      throw ptr + " - Exception catching is disabled, this exception cannot be caught. Compile with -s DISABLE_EXCEPTION_CATCHING=0 or DISABLE_EXCEPTION_CATCHING=2 to catch.";
    }

  
  
  function _emscripten_get_now() {
      if (!_emscripten_get_now.actual) {
        if (ENVIRONMENT_IS_NODE) {
          _emscripten_get_now.actual = function _emscripten_get_now_actual() {
            var t = process['hrtime']();
            return t[0] * 1e3 + t[1] / 1e6;
          }
        } else if (typeof dateNow !== 'undefined') {
          _emscripten_get_now.actual = dateNow;
        } else if (typeof self === 'object' && self['performance'] && typeof self['performance']['now'] === 'function') {
          _emscripten_get_now.actual = function _emscripten_get_now_actual() { return self['performance']['now'](); };
        } else if (typeof performance === 'object' && typeof performance['now'] === 'function') {
          _emscripten_get_now.actual = function _emscripten_get_now_actual() { return performance['now'](); };
        } else {
          _emscripten_get_now.actual = Date.now;
        }
      }
      return _emscripten_get_now.actual();
    }
  
  var GL={counter:1,lastError:0,buffers:[],mappedBuffers:{},programs:[],framebuffers:[],renderbuffers:[],textures:[],uniforms:[],shaders:[],vaos:[],contexts:[],currentContext:null,currArrayBuffer:0,currElementArrayBuffer:0,byteSizeByTypeRoot:5120,byteSizeByType:[1,1,2,2,4,4,4,2,3,4,8],programInfos:{},stringCache:{},packAlignment:4,unpackAlignment:4,init:function () {
        GL.createLog2ceilLookup(GL.MAX_TEMP_BUFFER_SIZE);
        GL.miniTempBuffer = new Float32Array(GL.MINI_TEMP_BUFFER_SIZE);
        for (var i = 0; i < GL.MINI_TEMP_BUFFER_SIZE; i++) {
          GL.miniTempBufferViews[i] = GL.miniTempBuffer.subarray(0, i+1);
        }
      },recordError:function recordError(errorCode) {
        if (!GL.lastError) {
          GL.lastError = errorCode;
        }
      },getNewId:function (table) {
        var ret = GL.counter++;
        for (var i = table.length; i < ret; i++) {
          table[i] = null;
        }
        return ret;
      },MINI_TEMP_BUFFER_SIZE:16,miniTempBuffer:null,miniTempBufferViews:[0],MAX_TEMP_BUFFER_SIZE:2097152,numTempVertexBuffersPerSize:64,log2ceilLookup:null,createLog2ceilLookup:function (maxValue) {
        GL.log2ceilLookup = new Uint8Array(maxValue+1);
        var log2 = 0;
        var pow2 = 1;
        GL.log2ceilLookup[0] = 0;
        for(var i = 1; i <= maxValue; ++i) {
          if (i > pow2) {
            pow2 <<= 1;
            ++log2;
          }
          GL.log2ceilLookup[i] = log2;
        }
      },generateTempBuffers:function (quads, context) {
        var largestIndex = GL.log2ceilLookup[GL.MAX_TEMP_BUFFER_SIZE];
        context.tempVertexBufferCounters1 = [];
        context.tempVertexBufferCounters2 = [];
        context.tempVertexBufferCounters1.length = context.tempVertexBufferCounters2.length = largestIndex+1;
        context.tempVertexBuffers1 = [];
        context.tempVertexBuffers2 = [];
        context.tempVertexBuffers1.length = context.tempVertexBuffers2.length = largestIndex+1;
        context.tempIndexBuffers = [];
        context.tempIndexBuffers.length = largestIndex+1;
        for(var i = 0; i <= largestIndex; ++i) {
          context.tempIndexBuffers[i] = null; // Created on-demand
          context.tempVertexBufferCounters1[i] = context.tempVertexBufferCounters2[i] = 0;
          var ringbufferLength = GL.numTempVertexBuffersPerSize;
          context.tempVertexBuffers1[i] = [];
          context.tempVertexBuffers2[i] = [];
          var ringbuffer1 = context.tempVertexBuffers1[i];
          var ringbuffer2 = context.tempVertexBuffers2[i];
          ringbuffer1.length = ringbuffer2.length = ringbufferLength;
          for(var j = 0; j < ringbufferLength; ++j) {
            ringbuffer1[j] = ringbuffer2[j] = null; // Created on-demand
          }
        }
  
        if (quads) {
          // GL_QUAD indexes can be precalculated
          context.tempQuadIndexBuffer = GLctx.createBuffer();
          context.GLctx.bindBuffer(context.GLctx.ELEMENT_ARRAY_BUFFER, context.tempQuadIndexBuffer);
          var numIndexes = GL.MAX_TEMP_BUFFER_SIZE >> 1;
          var quadIndexes = new Uint16Array(numIndexes);
          var i = 0, v = 0;
          while (1) {
            quadIndexes[i++] = v;
            if (i >= numIndexes) break;
            quadIndexes[i++] = v+1;
            if (i >= numIndexes) break;
            quadIndexes[i++] = v+2;
            if (i >= numIndexes) break;
            quadIndexes[i++] = v;
            if (i >= numIndexes) break;
            quadIndexes[i++] = v+2;
            if (i >= numIndexes) break;
            quadIndexes[i++] = v+3;
            if (i >= numIndexes) break;
            v += 4;
          }
          context.GLctx.bufferData(context.GLctx.ELEMENT_ARRAY_BUFFER, quadIndexes, context.GLctx.STATIC_DRAW);
          context.GLctx.bindBuffer(context.GLctx.ELEMENT_ARRAY_BUFFER, null);
        }
      },getTempVertexBuffer:function getTempVertexBuffer(sizeBytes) {
        var idx = GL.log2ceilLookup[sizeBytes];
        var ringbuffer = GL.currentContext.tempVertexBuffers1[idx];
        var nextFreeBufferIndex = GL.currentContext.tempVertexBufferCounters1[idx];
        GL.currentContext.tempVertexBufferCounters1[idx] = (GL.currentContext.tempVertexBufferCounters1[idx]+1) & (GL.numTempVertexBuffersPerSize-1);
        var vbo = ringbuffer[nextFreeBufferIndex];
        if (vbo) {
          return vbo;
        }
        var prevVBO = GLctx.getParameter(GLctx.ARRAY_BUFFER_BINDING);
        ringbuffer[nextFreeBufferIndex] = GLctx.createBuffer();
        GLctx.bindBuffer(GLctx.ARRAY_BUFFER, ringbuffer[nextFreeBufferIndex]);
        GLctx.bufferData(GLctx.ARRAY_BUFFER, 1 << idx, GLctx.DYNAMIC_DRAW);
        GLctx.bindBuffer(GLctx.ARRAY_BUFFER, prevVBO);
        return ringbuffer[nextFreeBufferIndex];
      },getTempIndexBuffer:function getTempIndexBuffer(sizeBytes) {
        var idx = GL.log2ceilLookup[sizeBytes];
        var ibo = GL.currentContext.tempIndexBuffers[idx];
        if (ibo) {
          return ibo;
        }
        var prevIBO = GLctx.getParameter(GLctx.ELEMENT_ARRAY_BUFFER_BINDING);
        GL.currentContext.tempIndexBuffers[idx] = GLctx.createBuffer();
        GLctx.bindBuffer(GLctx.ELEMENT_ARRAY_BUFFER, GL.currentContext.tempIndexBuffers[idx]);
        GLctx.bufferData(GLctx.ELEMENT_ARRAY_BUFFER, 1 << idx, GLctx.DYNAMIC_DRAW);
        GLctx.bindBuffer(GLctx.ELEMENT_ARRAY_BUFFER, prevIBO);
        return GL.currentContext.tempIndexBuffers[idx];
      },newRenderingFrameStarted:function newRenderingFrameStarted() {
        if (!GL.currentContext) {
          return;
        }
        var vb = GL.currentContext.tempVertexBuffers1;
        GL.currentContext.tempVertexBuffers1 = GL.currentContext.tempVertexBuffers2;
        GL.currentContext.tempVertexBuffers2 = vb;
        vb = GL.currentContext.tempVertexBufferCounters1;
        GL.currentContext.tempVertexBufferCounters1 = GL.currentContext.tempVertexBufferCounters2;
        GL.currentContext.tempVertexBufferCounters2 = vb;
        var largestIndex = GL.log2ceilLookup[GL.MAX_TEMP_BUFFER_SIZE];
        for(var i = 0; i <= largestIndex; ++i) {
          GL.currentContext.tempVertexBufferCounters1[i] = 0;
        }
      },getSource:function (shader, count, string, length) {
        var source = '';
        for (var i = 0; i < count; ++i) {
          var frag;
          if (length) {
            var len = HEAP32[(((length)+(i*4))>>2)];
            if (len < 0) {
              frag = Pointer_stringify(HEAP32[(((string)+(i*4))>>2)]);
            } else {
              frag = Pointer_stringify(HEAP32[(((string)+(i*4))>>2)], len);
            }
          } else {
            frag = Pointer_stringify(HEAP32[(((string)+(i*4))>>2)]);
          }
          source += frag;
        }
        return source;
      },calcBufLength:function calcBufLength(size, type, stride, count) {
        if (stride > 0) {
          return count * stride;  // XXXvlad this is not exactly correct I don't think
        }
        var typeSize = GL.byteSizeByType[type - GL.byteSizeByTypeRoot];
        return size * typeSize * count;
      },usedTempBuffers:[],preDrawHandleClientVertexAttribBindings:function preDrawHandleClientVertexAttribBindings(count) {
        GL.resetBufferBinding = false;
  
        // TODO: initial pass to detect ranges we need to upload, might not need an upload per attrib
        for (var i = 0; i < GL.currentContext.maxVertexAttribs; ++i) {
          var cb = GL.currentContext.clientBuffers[i];
          if (!cb.clientside || !cb.enabled) continue;
  
          GL.resetBufferBinding = true;
  
          var size = GL.calcBufLength(cb.size, cb.type, cb.stride, count);
          var buf = GL.getTempVertexBuffer(size);
          GLctx.bindBuffer(GLctx.ARRAY_BUFFER, buf);
          GLctx.bufferSubData(GLctx.ARRAY_BUFFER,
                                   0,
                                   HEAPU8.subarray(cb.ptr, cb.ptr + size));
          GLctx.vertexAttribPointer(i, cb.size, cb.type, cb.normalized, cb.stride, 0);
        }
      },postDrawHandleClientVertexAttribBindings:function postDrawHandleClientVertexAttribBindings() {
        if (GL.resetBufferBinding) {
          GLctx.bindBuffer(GLctx.ARRAY_BUFFER, GL.buffers[GL.currArrayBuffer]);
        }
      },createContext:function (canvas, webGLContextAttributes) {
        if (typeof webGLContextAttributes.majorVersion === 'undefined' && typeof webGLContextAttributes.minorVersion === 'undefined') {
          webGLContextAttributes.majorVersion = 1;
          webGLContextAttributes.minorVersion = 0;
        }
        var ctx;
        var errorInfo = '?';
        function onContextCreationError(event) {
          errorInfo = event.statusMessage || errorInfo;
        }
        try {
          canvas.addEventListener('webglcontextcreationerror', onContextCreationError, false);
          try {
            if (webGLContextAttributes.majorVersion == 1 && webGLContextAttributes.minorVersion == 0) {
              ctx = canvas.getContext("webgl", webGLContextAttributes) || canvas.getContext("experimental-webgl", webGLContextAttributes);
            } else if (webGLContextAttributes.majorVersion == 2 && webGLContextAttributes.minorVersion == 0) {
              ctx = canvas.getContext("webgl2", webGLContextAttributes) || canvas.getContext("experimental-webgl2", webGLContextAttributes);
            } else {
              throw 'Unsupported WebGL context version ' + majorVersion + '.' + minorVersion + '!'
            }
          } finally {
            canvas.removeEventListener('webglcontextcreationerror', onContextCreationError, false);
          }
          if (!ctx) throw ':(';
        } catch (e) {
          Module.print('Could not create canvas: ' + [errorInfo, e, JSON.stringify(webGLContextAttributes)]);
          return 0;
        }
        // possible GL_DEBUG entry point: ctx = wrapDebugGL(ctx);
  
        if (!ctx) return 0;
        return GL.registerContext(ctx, webGLContextAttributes);
      },registerContext:function (ctx, webGLContextAttributes) {
        var handle = GL.getNewId(GL.contexts);
        var context = {
          handle: handle,
          version: webGLContextAttributes.majorVersion,
          GLctx: ctx
        };
        // Store the created context object so that we can access the context given a canvas without having to pass the parameters again.
        if (ctx.canvas) ctx.canvas.GLctxObject = context;
        GL.contexts[handle] = context;
        if (typeof webGLContextAttributes['enableExtensionsByDefault'] === 'undefined' || webGLContextAttributes.enableExtensionsByDefault) {
          GL.initExtensions(context);
        }
        return handle;
      },makeContextCurrent:function (contextHandle) {
        var context = GL.contexts[contextHandle];
        if (!context) return false;
        GLctx = Module.ctx = context.GLctx; // Active WebGL context object.
        GL.currentContext = context; // Active Emscripten GL layer context object.
        return true;
      },getContext:function (contextHandle) {
        return GL.contexts[contextHandle];
      },deleteContext:function (contextHandle) {
        if (GL.currentContext === GL.contexts[contextHandle]) GL.currentContext = null;
        if (typeof JSEvents === 'object') JSEvents.removeAllHandlersOnTarget(GL.contexts[contextHandle].GLctx.canvas); // Release all JS event handlers on the DOM element that the GL context is associated with since the context is now deleted.
        if (GL.contexts[contextHandle] && GL.contexts[contextHandle].GLctx.canvas) GL.contexts[contextHandle].GLctx.canvas.GLctxObject = undefined; // Make sure the canvas object no longer refers to the context object so there are no GC surprises.
        GL.contexts[contextHandle] = null;
      },initExtensions:function (context) {
        // If this function is called without a specific context object, init the extensions of the currently active context.
        if (!context) context = GL.currentContext;
  
        if (context.initExtensionsDone) return;
        context.initExtensionsDone = true;
  
        var GLctx = context.GLctx;
  
        context.maxVertexAttribs = GLctx.getParameter(GLctx.MAX_VERTEX_ATTRIBS);
        context.clientBuffers = [];
        for (var i = 0; i < context.maxVertexAttribs; i++) {
          context.clientBuffers[i] = { enabled: false, clientside: false, size: 0, type: 0, normalized: 0, stride: 0, ptr: 0 };
        }
  
        GL.generateTempBuffers(false, context);
  
        // Detect the presence of a few extensions manually, this GL interop layer itself will need to know if they exist. 
  
        if (context.version < 2) {
          // Extension available from Firefox 26 and Google Chrome 30
          var instancedArraysExt = GLctx.getExtension('ANGLE_instanced_arrays');
          if (instancedArraysExt) {
            GLctx['vertexAttribDivisor'] = function(index, divisor) { instancedArraysExt['vertexAttribDivisorANGLE'](index, divisor); };
            GLctx['drawArraysInstanced'] = function(mode, first, count, primcount) { instancedArraysExt['drawArraysInstancedANGLE'](mode, first, count, primcount); };
            GLctx['drawElementsInstanced'] = function(mode, count, type, indices, primcount) { instancedArraysExt['drawElementsInstancedANGLE'](mode, count, type, indices, primcount); };
          }
  
          // Extension available from Firefox 25 and WebKit
          var vaoExt = GLctx.getExtension('OES_vertex_array_object');
          if (vaoExt) {
            GLctx['createVertexArray'] = function() { return vaoExt['createVertexArrayOES'](); };
            GLctx['deleteVertexArray'] = function(vao) { vaoExt['deleteVertexArrayOES'](vao); };
            GLctx['bindVertexArray'] = function(vao) { vaoExt['bindVertexArrayOES'](vao); };
            GLctx['isVertexArray'] = function(vao) { return vaoExt['isVertexArrayOES'](vao); };
          }
  
          var drawBuffersExt = GLctx.getExtension('WEBGL_draw_buffers');
          if (drawBuffersExt) {
            GLctx['drawBuffers'] = function(n, bufs) { drawBuffersExt['drawBuffersWEBGL'](n, bufs); };
          }
        }
  
        // These are the 'safe' feature-enabling extensions that don't add any performance impact related to e.g. debugging, and
        // should be enabled by default so that client GLES2/GL code will not need to go through extra hoops to get its stuff working.
        // As new extensions are ratified at http://www.khronos.org/registry/webgl/extensions/ , feel free to add your new extensions
        // here, as long as they don't produce a performance impact for users that might not be using those extensions.
        // E.g. debugging-related extensions should probably be off by default.
        var automaticallyEnabledExtensions = [ "OES_texture_float", "OES_texture_half_float", "OES_standard_derivatives",
                                               "OES_vertex_array_object", "WEBGL_compressed_texture_s3tc", "WEBGL_depth_texture",
                                               "OES_element_index_uint", "EXT_texture_filter_anisotropic", "ANGLE_instanced_arrays",
                                               "OES_texture_float_linear", "OES_texture_half_float_linear", "WEBGL_compressed_texture_atc",
                                               "WEBGL_compressed_texture_pvrtc", "EXT_color_buffer_half_float", "WEBGL_color_buffer_float",
                                               "EXT_frag_depth", "EXT_sRGB", "WEBGL_draw_buffers", "WEBGL_shared_resources",
                                               "EXT_shader_texture_lod" ];
  
        function shouldEnableAutomatically(extension) {
          var ret = false;
          automaticallyEnabledExtensions.forEach(function(include) {
            if (ext.indexOf(include) != -1) {
              ret = true;
            }
          });
          return ret;
        }
  
        var exts = GLctx.getSupportedExtensions();
        if (exts && exts.length > 0) {
          GLctx.getSupportedExtensions().forEach(function(ext) {
            if (automaticallyEnabledExtensions.indexOf(ext) != -1) {
              GLctx.getExtension(ext); // Calling .getExtension enables that extension permanently, no need to store the return value to be enabled.
            }
          });
        }
      },populateUniformTable:function (program) {
        var p = GL.programs[program];
        GL.programInfos[program] = {
          uniforms: {},
          maxUniformLength: 0, // This is eagerly computed below, since we already enumerate all uniforms anyway.
          maxAttributeLength: -1 // This is lazily computed and cached, computed when/if first asked, "-1" meaning not computed yet.
        };
  
        var ptable = GL.programInfos[program];
        var utable = ptable.uniforms;
        // A program's uniform table maps the string name of an uniform to an integer location of that uniform.
        // The global GL.uniforms map maps integer locations to WebGLUniformLocations.
        var numUniforms = GLctx.getProgramParameter(p, GLctx.ACTIVE_UNIFORMS);
        for (var i = 0; i < numUniforms; ++i) {
          var u = GLctx.getActiveUniform(p, i);
  
          var name = u.name;
          ptable.maxUniformLength = Math.max(ptable.maxUniformLength, name.length+1);
  
          // Strip off any trailing array specifier we might have got, e.g. "[0]".
          if (name.indexOf(']', name.length-1) !== -1) {
            var ls = name.lastIndexOf('[');
            name = name.slice(0, ls);
          }
  
          // Optimize memory usage slightly: If we have an array of uniforms, e.g. 'vec3 colors[3];', then 
          // only store the string 'colors' in utable, and 'colors[0]', 'colors[1]' and 'colors[2]' will be parsed as 'colors'+i.
          // Note that for the GL.uniforms table, we still need to fetch the all WebGLUniformLocations for all the indices.
          var loc = GLctx.getUniformLocation(p, name);
          var id = GL.getNewId(GL.uniforms);
          utable[name] = [u.size, id];
          GL.uniforms[id] = loc;
  
          for (var j = 1; j < u.size; ++j) {
            var n = name + '['+j+']';
            loc = GLctx.getUniformLocation(p, n);
            id = GL.getNewId(GL.uniforms);
  
            GL.uniforms[id] = loc;
          }
        }
      }};var GLFW={Window:function (id, width, height, title, monitor, share) {
        this.id = id;
        this.x = 0;
        this.y = 0;
        this.storedX = 0; // Used to store X before fullscreen
        this.storedY = 0; // Used to store Y before fullscreen
        this.width = width;
        this.height = height;
        this.storedWidth = width; // Used to store width before fullscreen
        this.storedHeight = height; // Used to store height before fullscreen
        this.title = title;
        this.monitor = monitor;
        this.share = share;
        this.attributes = GLFW.hints;
        this.inputModes = {
          0x00033001:0x00034001, // GLFW_CURSOR (GLFW_CURSOR_NORMAL)
          0x00033002:0, // GLFW_STICKY_KEYS
          0x00033003:0, // GLFW_STICKY_MOUSE_BUTTONS
        };
        this.buttons = 0;
        this.keys = new Array();
        this.shouldClose = 0;
        this.title = null;
        this.windowPosFunc = null; // GLFWwindowposfun
        this.windowSizeFunc = null; // GLFWwindowsizefun
        this.windowCloseFunc = null; // GLFWwindowclosefun
        this.windowRefreshFunc = null; // GLFWwindowrefreshfun
        this.windowFocusFunc = null; // GLFWwindowfocusfun
        this.windowIconifyFunc = null; // GLFWwindowiconifyfun
        this.framebufferSizeFunc = null; // GLFWframebuffersizefun
        this.mouseButtonFunc = null; // GLFWmousebuttonfun
        this.cursorPosFunc = null; // GLFWcursorposfun
        this.cursorEnterFunc = null; // GLFWcursorenterfun
        this.scrollFunc = null; // GLFWscrollfun
        this.keyFunc = null; // GLFWkeyfun
        this.charFunc = null; // GLFWcharfun
        this.userptr = null;
      },WindowFromId:function (id) {
        if (id <= 0 || !GLFW.windows) return null;
        return GLFW.windows[id - 1];
      },errorFunc:null,monitorFunc:null,active:null,windows:null,monitors:null,monitorString:null,versionString:null,initialTime:null,extensions:null,hints:null,defaultHints:{131073:0,131074:0,131075:1,131076:1,131077:1,135169:8,135170:8,135171:8,135172:8,135173:24,135174:8,135175:0,135176:0,135177:0,135178:0,135179:0,135180:0,135181:0,135182:0,135183:0,139265:196609,139266:1,139267:0,139268:0,139269:0,139270:0,139271:0,139272:0},DOMToGLFWKeyCode:function (keycode) {
        switch (keycode) {
          case 0x20:return 32; // DOM_VK_SPACE -> GLFW_KEY_SPACE
          case 0xDE:return 39; // DOM_VK_QUOTE -> GLFW_KEY_APOSTROPHE
          case 0xBC:return 44; // DOM_VK_COMMA -> GLFW_KEY_COMMA
          case 0xAD:return 45; // DOM_VK_HYPHEN_MINUS -> GLFW_KEY_MINUS
          case 0xBE:return 46; // DOM_VK_PERIOD -> GLFW_KEY_PERIOD
          case 0xBF:return 47; // DOM_VK_SLASH -> GLFW_KEY_SLASH
          case 0x30:return 48; // DOM_VK_0 -> GLFW_KEY_0
          case 0x31:return 49; // DOM_VK_1 -> GLFW_KEY_1
          case 0x32:return 50; // DOM_VK_2 -> GLFW_KEY_2
          case 0x33:return 51; // DOM_VK_3 -> GLFW_KEY_3
          case 0x34:return 52; // DOM_VK_4 -> GLFW_KEY_4
          case 0x35:return 53; // DOM_VK_5 -> GLFW_KEY_5
          case 0x36:return 54; // DOM_VK_6 -> GLFW_KEY_6
          case 0x37:return 55; // DOM_VK_7 -> GLFW_KEY_7
          case 0x38:return 56; // DOM_VK_8 -> GLFW_KEY_8
          case 0x39:return 57; // DOM_VK_9 -> GLFW_KEY_9
          case 0x3B:return 59; // DOM_VK_SEMICOLON -> GLFW_KEY_SEMICOLON
          case 0x61:return 61; // DOM_VK_EQUALS -> GLFW_KEY_EQUAL
          case 0x41:return 65; // DOM_VK_A -> GLFW_KEY_A
          case 0x42:return 66; // DOM_VK_B -> GLFW_KEY_B
          case 0x43:return 67; // DOM_VK_C -> GLFW_KEY_C
          case 0x44:return 68; // DOM_VK_D -> GLFW_KEY_D
          case 0x45:return 69; // DOM_VK_E -> GLFW_KEY_E
          case 0x46:return 70; // DOM_VK_F -> GLFW_KEY_F
          case 0x47:return 71; // DOM_VK_G -> GLFW_KEY_G
          case 0x48:return 72; // DOM_VK_H -> GLFW_KEY_H
          case 0x49:return 73; // DOM_VK_I -> GLFW_KEY_I
          case 0x4A:return 74; // DOM_VK_J -> GLFW_KEY_J
          case 0x4B:return 75; // DOM_VK_K -> GLFW_KEY_K
          case 0x4C:return 76; // DOM_VK_L -> GLFW_KEY_L
          case 0x4D:return 77; // DOM_VK_M -> GLFW_KEY_M
          case 0x4E:return 78; // DOM_VK_N -> GLFW_KEY_N
          case 0x4F:return 79; // DOM_VK_O -> GLFW_KEY_O
          case 0x50:return 80; // DOM_VK_P -> GLFW_KEY_P
          case 0x51:return 81; // DOM_VK_Q -> GLFW_KEY_Q
          case 0x52:return 82; // DOM_VK_R -> GLFW_KEY_R
          case 0x53:return 83; // DOM_VK_S -> GLFW_KEY_S
          case 0x54:return 84; // DOM_VK_T -> GLFW_KEY_T
          case 0x55:return 85; // DOM_VK_U -> GLFW_KEY_U
          case 0x56:return 86; // DOM_VK_V -> GLFW_KEY_V
          case 0x57:return 87; // DOM_VK_W -> GLFW_KEY_W
          case 0x58:return 88; // DOM_VK_X -> GLFW_KEY_X
          case 0x59:return 89; // DOM_VK_Y -> GLFW_KEY_Y
          case 0x5a:return 90; // DOM_VK_Z -> GLFW_KEY_Z
          case 0xDB:return 91; // DOM_VK_OPEN_BRACKET -> GLFW_KEY_LEFT_BRACKET
          case 0xDC:return 92; // DOM_VK_BACKSLASH -> GLFW_KEY_BACKSLASH
          case 0xDD:return 93; // DOM_VK_CLOSE_BRACKET -> GLFW_KEY_RIGHT_BRACKET
          case 0xC0:return 94; // DOM_VK_BACK_QUOTE -> GLFW_KEY_GRAVE_ACCENT
          case 0x1B:return 256; // DOM_VK_ESCAPE -> GLFW_KEY_ESCAPE
          case 0x0D:return 257; // DOM_VK_RETURN -> GLFW_KEY_ENTER
          case 0x09:return 258; // DOM_VK_TAB -> GLFW_KEY_TAB
          case 0x08:return 259; // DOM_VK_BACK -> GLFW_KEY_BACKSPACE
          case 0x2D:return 260; // DOM_VK_INSERT -> GLFW_KEY_INSERT
          case 0x2E:return 261; // DOM_VK_DELETE -> GLFW_KEY_DELETE
          case 0x27:return 262; // DOM_VK_RIGHT -> GLFW_KEY_RIGHT
          case 0x25:return 263; // DOM_VK_LEFT -> GLFW_KEY_LEFT
          case 0x28:return 264; // DOM_VK_DOWN -> GLFW_KEY_DOWN
          case 0x26:return 265; // DOM_VK_UP -> GLFW_KEY_UP
          case 0x21:return 266; // DOM_VK_PAGE_UP -> GLFW_KEY_PAGE_UP
          case 0x22:return 267; // DOM_VK_PAGE_DOWN -> GLFW_KEY_PAGE_DOWN
          case 0x24:return 268; // DOM_VK_HOME -> GLFW_KEY_HOME
          case 0x23:return 269; // DOM_VK_END -> GLFW_KEY_END
          case 0x14:return 280; // DOM_VK_CAPS_LOCK -> GLFW_KEY_CAPS_LOCK
          case 0x91:return 281; // DOM_VK_SCROLL_LOCK -> GLFW_KEY_SCROLL_LOCK
          case 0x90:return 282; // DOM_VK_NUM_LOCK -> GLFW_KEY_NUM_LOCK
          case 0x2C:return 283; // DOM_VK_SNAPSHOT -> GLFW_KEY_PRINT_SCREEN
          case 0x13:return 284; // DOM_VK_PAUSE -> GLFW_KEY_PAUSE
          case 0x70:return 290; // DOM_VK_F1 -> GLFW_KEY_F1
          case 0x71:return 291; // DOM_VK_F2 -> GLFW_KEY_F2
          case 0x72:return 292; // DOM_VK_F3 -> GLFW_KEY_F3
          case 0x73:return 293; // DOM_VK_F4 -> GLFW_KEY_F4
          case 0x74:return 294; // DOM_VK_F5 -> GLFW_KEY_F5
          case 0x75:return 295; // DOM_VK_F6 -> GLFW_KEY_F6
          case 0x76:return 296; // DOM_VK_F7 -> GLFW_KEY_F7
          case 0x77:return 297; // DOM_VK_F8 -> GLFW_KEY_F8
          case 0x78:return 298; // DOM_VK_F9 -> GLFW_KEY_F9
          case 0x79:return 299; // DOM_VK_F10 -> GLFW_KEY_F10
          case 0x7A:return 300; // DOM_VK_F11 -> GLFW_KEY_F11
          case 0x7B:return 301; // DOM_VK_F12 -> GLFW_KEY_F12
          case 0x7C:return 302; // DOM_VK_F13 -> GLFW_KEY_F13
          case 0x7D:return 303; // DOM_VK_F14 -> GLFW_KEY_F14
          case 0x7E:return 304; // DOM_VK_F15 -> GLFW_KEY_F15
          case 0x7F:return 305; // DOM_VK_F16 -> GLFW_KEY_F16
          case 0x80:return 306; // DOM_VK_F17 -> GLFW_KEY_F17
          case 0x81:return 307; // DOM_VK_F18 -> GLFW_KEY_F18
          case 0x82:return 308; // DOM_VK_F19 -> GLFW_KEY_F19
          case 0x83:return 309; // DOM_VK_F20 -> GLFW_KEY_F20
          case 0x84:return 310; // DOM_VK_F21 -> GLFW_KEY_F21
          case 0x85:return 311; // DOM_VK_F22 -> GLFW_KEY_F22
          case 0x86:return 312; // DOM_VK_F23 -> GLFW_KEY_F23
          case 0x87:return 313; // DOM_VK_F24 -> GLFW_KEY_F24
          case 0x88:return 314; // 0x88 (not used?) -> GLFW_KEY_F25
          case 0x60:return 320; // DOM_VK_NUMPAD0 -> GLFW_KEY_KP_0
          case 0x61:return 321; // DOM_VK_NUMPAD1 -> GLFW_KEY_KP_1
          case 0x62:return 322; // DOM_VK_NUMPAD2 -> GLFW_KEY_KP_2
          case 0x63:return 323; // DOM_VK_NUMPAD3 -> GLFW_KEY_KP_3
          case 0x64:return 324; // DOM_VK_NUMPAD4 -> GLFW_KEY_KP_4
          case 0x65:return 325; // DOM_VK_NUMPAD5 -> GLFW_KEY_KP_5
          case 0x66:return 326; // DOM_VK_NUMPAD6 -> GLFW_KEY_KP_6
          case 0x67:return 327; // DOM_VK_NUMPAD7 -> GLFW_KEY_KP_7
          case 0x68:return 328; // DOM_VK_NUMPAD8 -> GLFW_KEY_KP_8
          case 0x69:return 329; // DOM_VK_NUMPAD9 -> GLFW_KEY_KP_9
          case 0x6E:return 330; // DOM_VK_DECIMAL -> GLFW_KEY_KP_DECIMAL
          case 0x6F:return 331; // DOM_VK_DIVIDE -> GLFW_KEY_KP_DIVIDE
          case 0x6A:return 332; // DOM_VK_MULTIPLY -> GLFW_KEY_KP_MULTIPLY
          case 0x6D:return 333; // DOM_VK_SUBTRACT -> GLFW_KEY_KP_SUBTRACT
          case 0x6B:return 334; // DOM_VK_ADD -> GLFW_KEY_KP_ADD
          // case 0x0D:return 335; // DOM_VK_RETURN -> GLFW_KEY_KP_ENTER (DOM_KEY_LOCATION_RIGHT)
          // case 0x61:return 336; // DOM_VK_EQUALS -> GLFW_KEY_KP_EQUAL (DOM_KEY_LOCATION_RIGHT)
          case 0x10:return 340; // DOM_VK_SHIFT -> GLFW_KEY_LEFT_SHIFT
          case 0x11:return 341; // DOM_VK_CONTROL -> GLFW_KEY_LEFT_CONTROL
          case 0x12:return 342; // DOM_VK_ALT -> GLFW_KEY_LEFT_ALT
          case 0x5B:return 343; // DOM_VK_WIN -> GLFW_KEY_LEFT_SUPER
          // case 0x10:return 344; // DOM_VK_SHIFT -> GLFW_KEY_RIGHT_SHIFT (DOM_KEY_LOCATION_RIGHT)
          // case 0x11:return 345; // DOM_VK_CONTROL -> GLFW_KEY_RIGHT_CONTROL (DOM_KEY_LOCATION_RIGHT)
          // case 0x12:return 346; // DOM_VK_ALT -> GLFW_KEY_RIGHT_ALT (DOM_KEY_LOCATION_RIGHT)
          // case 0x5B:return 347; // DOM_VK_WIN -> GLFW_KEY_RIGHT_SUPER (DOM_KEY_LOCATION_RIGHT)
          case 0x5D:return 348; // DOM_VK_CONTEXT_MENU -> GLFW_KEY_MENU
  
          // XXX: GLFW_KEY_WORLD_1, GLFW_KEY_WORLD_2 what are these?
          default:return -1; // GLFW_KEY_UNKNOWN
        };
      },getModBits:function (win) {
        var mod = 0;
        if (win.keys[340]) mod |= 0x0001; // GLFW_MOD_SHIFT
        if (win.keys[341]) mod |= 0x0002; // GLFW_MOD_CONTROL
        if (win.keys[342]) mod |= 0x0004; // GLFW_MOD_ALT
        if (win.keys[343]) mod |= 0x0008; // GLFW_MOD_SUPER
        return mod;
      },onKeyPress:function (event) {
        if (!GLFW.active || !GLFW.active.charFunc) return;
  
        // correct unicode charCode is only available with onKeyPress event
        var charCode = event.charCode;
        if (charCode == 0 || (charCode >= 0x00 && charCode <= 0x1F)) return;
  
  
        Runtime.dynCall('vii', GLFW.active.charFunc, [GLFW.active.id, charCode]);
      },onKeyChanged:function (event, status) {
        if (!GLFW.active) return;
  
        var key = GLFW.DOMToGLFWKeyCode(event.keyCode);
        if (key == -1) return;
  
        GLFW.active.keys[key] = status;
        if (!GLFW.active.keyFunc) return;
  
  
        Runtime.dynCall('viiiii', GLFW.active.keyFunc, [GLFW.active.id, key, event.keyCode, status, GLFW.getModBits(GLFW.active)]);
      },onKeydown:function (event) {
        GLFW.onKeyChanged(event, 1); // GLFW_PRESS
  
        // This logic comes directly from the sdl implementation. We cannot
        // call preventDefault on all keydown events otherwise onKeyPress will
        // not get called
        if (event.keyCode === 8 /* backspace */ || event.keyCode === 9 /* tab */) {
          event.preventDefault();
        }
      },onKeyup:function (event) {
        GLFW.onKeyChanged(event, 0); // GLFW_RELEASE
      },onMousemove:function (event) {
        if (!GLFW.active) return;
  
        Browser.calculateMouseEvent(event);
  
        if (event.target != Module["canvas"] || !GLFW.active.cursorPosFunc) return;
  
  
        Runtime.dynCall('vidd', GLFW.active.cursorPosFunc, [GLFW.active.id, Browser.mouseX, Browser.mouseY]);
      },onMouseButtonChanged:function (event, status) {
        if (!GLFW.active || !GLFW.active.mouseButtonFunc) return;
  
        Browser.calculateMouseEvent(event);
  
        if (event.target != Module["canvas"]) return;
  
        if (status == 1) { // GLFW_PRESS
          try {
            event.target.setCapture();
          } catch (e) {}
        }
  
        // DOM and glfw have different button codes
        var eventButton = event['button'];
        if (eventButton > 0) {
          if (eventButton == 1) {
            eventButton = 2;
          } else {
            eventButton = 1;
          }
        }
  
  
        Runtime.dynCall('viiii', GLFW.active.mouseButtonFunc, [GLFW.active.id, eventButton, status, GLFW.getModBits(GLFW.active)]);
      },onMouseButtonDown:function (event) {
        if (!GLFW.active) return;
        GLFW.active.buttons |= (1 << event['button']);
        GLFW.onMouseButtonChanged(event, 1); // GLFW_PRESS
      },onMouseButtonUp:function (event) {
        if (!GLFW.active) return;
        GLFW.active.buttons &= ~(1 << event['button']);
        GLFW.onMouseButtonChanged(event, 0); // GLFW_RELEASE
      },onMouseWheel:function (event) {
        // Note the minus sign that flips browser wheel direction (positive direction scrolls page down) to native wheel direction (positive direction is mouse wheel up)
        var delta = -Browser.getMouseWheelDelta(event);
        delta = (delta == 0) ? 0 : (delta > 0 ? Math.max(delta, 1) : Math.min(delta, -1)); // Quantize to integer so that minimum scroll is at least +/- 1.
        GLFW.wheelPos += delta;
  
        if (!GLFW.active || !GLFW.active.scrollFunc || event.target != Module['canvas']) return;
  
  
        var sx = 0;
        var sy = 0;
        if (event.type == 'mousewheel') {
          sx = event.wheelDeltaX;
          sy = event.wheelDeltaY;
        } else {
          sx = event.deltaX;
          sy = event.deltaY;
        }
  
        Runtime.dynCall('vidd', GLFW.active.scrollFunc, [GLFW.active.id, sx, sy]);
  
        event.preventDefault();
      },onFullScreenEventChange:function () {
        if (!GLFW.active) return;
  
        if (document["fullScreen"] || document["mozFullScreen"] || document["webkitIsFullScreen"]) {
          GLFW.active.storedX = GLFW.active.x;
          GLFW.active.storedY = GLFW.active.y;
          GLFW.active.storedWidth = GLFW.active.width;
          GLFW.active.storedHeight = GLFW.active.height;
          GLFW.active.x = GLFW.active.y = 0;
          GLFW.active.width = screen.width;
          GLFW.active.height = screen.height;
        } else {
          GLFW.active.x = GLFW.active.storedX;
          GLFW.active.y = GLFW.active.storedY;
          GLFW.active.width = GLFW.active.storedWidth;
          GLFW.active.height = GLFW.active.storedHeight;
        }
  
        Browser.setCanvasSize(GLFW.active.width, GLFW.active.height, true); // resets the canvas size to counter the aspect preservation of Browser.updateCanvasDimensions
  
        if (!GLFW.active.windowSizeFunc) return;
  
  
        Runtime.dynCall('viii', GLFW.active.windowSizeFunc, [GLFW.active.id, GLFW.active.width, GLFW.active.height]);
      },requestFullScreen:function () {
        var RFS = Module["canvas"]['requestFullscreen'] ||
                  Module["canvas"]['requestFullScreen'] ||
                  Module["canvas"]['mozRequestFullScreen'] ||
                  Module["canvas"]['webkitRequestFullScreen'] ||
                  (function() {});
        RFS.apply(Module["canvas"], []);
      },cancelFullScreen:function () {
        var CFS = document['exitFullscreen'] ||
                  document['cancelFullScreen'] ||
                  document['mozCancelFullScreen'] ||
                  document['webkitCancelFullScreen'] ||
            (function() {});
        CFS.apply(document, []);
      },getTime:function () {
        return _emscripten_get_now() / 1000;
      },setWindowTitle:function (winid, title) {
        var win = GLFW.WindowFromId(winid);
        if (!win) return;
  
        win.title = Pointer_stringify(title);
        if (GLFW.active.id == win.id) {
          document.title = win.title;
        }
      },setKeyCallback:function (winid, cbfun) {
        var win = GLFW.WindowFromId(winid);
        if (!win) return;
        win.keyFunc = cbfun;
      },setCharCallback:function (winid, cbfun) {
        var win = GLFW.WindowFromId(winid);
        if (!win) return;
        win.charFunc = cbfun;
      },setMouseButtonCallback:function (winid, cbfun) {
        var win = GLFW.WindowFromId(winid);
        if (!win) return;
        win.mouseButtonFunc = cbfun;
      },setCursorPosCallback:function (winid, cbfun) {
        var win = GLFW.WindowFromId(winid);
        if (!win) return;
        win.cursorPosFunc = cbfun;
      },setScrollCallback:function (winid, cbfun) {
        var win = GLFW.WindowFromId(winid);
        if (!win) return;
        win.scrollFunc = cbfun;
      },setWindowSizeCallback:function (winid, cbfun) {
        var win = GLFW.WindowFromId(winid);
        if (!win) return;
        win.windowSizeFunc = cbfun;
      },setWindowCloseCallback:function (winid, cbfun) {
        var win = GLFW.WindowFromId(winid);
        if (!win) return;
        win.windowCloseFunc = cbfun;
      },setWindowRefreshCallback:function (winid, cbfun) {
        var win = GLFW.WindowFromId(winid);
        if (!win) return;
        win.windowRefreshFunc = cbfun;
      },getKey:function (winid, key) {
        var win = GLFW.WindowFromId(winid);
        if (!win) return 0;
        return win.keys[key];
      },getMouseButton:function (winid, button) {
        var win = GLFW.WindowFromId(winid);
        if (!win) return 0;
        return (win.buttons & (1 << button)) > 0;
      },getCursorPos:function (winid, x, y) {
        setValue(x, Browser.mouseX, 'double');
        setValue(y, Browser.mouseY, 'double');
      },getMousePos:function (winid, x, y) {
        setValue(x, Browser.mouseX, 'i32');
        setValue(y, Browser.mouseY, 'i32');
      },setCursorPos:function (winid, x, y) {
      },getWindowPos:function (winid, x, y) {
        var wx = 0;
        var wy = 0;
  
        var win = GLFW.WindowFromId(winid);
        if (win) {
          wx = win.x;
          wy = win.y;
        }
  
        setValue(x, wx, 'i32');
        setValue(y, wy, 'i32');
      },setWindowPos:function (winid, x, y) {
        var win = GLFW.WindowFromId(winid);
        if (!win) return;
        win.x = x;
        win.y = y;
      },getWindowSize:function (winid, width, height) {
        var ww = 0;
        var wh = 0;
  
        var win = GLFW.WindowFromId(winid);
        if (win) {
          ww = win.width;
          wh = win.height;
        }
  
        setValue(width, ww, 'i32');
        setValue(height, wh, 'i32');
      },setWindowSize:function (winid, width, height) {
        var win = GLFW.WindowFromId(winid);
        if (!win) return;
  
        if (GLFW.active.id == win.id) {
          if (width == screen.width && height == screen.height) {
            GLFW.requestFullScreen();
          } else {
            GLFW.cancelFullScreen();
            Browser.setCanvasSize(width, height);
            win.width = width;
            win.height = height;
          }
        }
  
        if (!win.windowResizeFunc) return;
  
  
        Runtime.dynCall('viii', win.windowResizeFunc, [win.id, width, height]);
      },createWindow:function (width, height, title, monitor, share) {
        var i, id;
        for (i = 0; i < GLFW.windows.length && GLFW.windows[i] !== null; i++);
        if (i > 0) throw "glfwCreateWindow only supports one window at time currently";
  
        // id for window
        id = i + 1;
  
        // not valid
        if (width <= 0 || height <= 0) return 0;
  
        if (monitor) {
          GLFW.requestFullScreen();
        } else {
          Browser.setCanvasSize(width, height);
        }
  
        // Create context when there are no existing alive windows
        for (i = 0; i < GLFW.windows.length && GLFW.windows[i] == null; i++);
        if (i == GLFW.windows.length) {
          var contextAttributes = {
            antialias: (GLFW.hints[0x0002100D] > 1), // GLFW_SAMPLES
            depth: (GLFW.hints[0x00021005] > 0),     // GLFW_DEPTH_BITS
            stencil: (GLFW.hints[0x00021006] > 0)    // GLFW_STENCIL_BITS
          }
          Module.ctx = Browser.createContext(Module['canvas'], true, true, contextAttributes);
        }
  
        // If context creation failed, do not return a valid window
        if (!Module.ctx) return 0;
  
        // Get non alive id
        var win = new GLFW.Window(id, width, height, title, monitor, share);
  
        // Set window to array
        if (id - 1 == GLFW.windows.length) {
          GLFW.windows.push(win);
        } else {
          GLFW.windows[id - 1] = win;
        }
  
        GLFW.active = win;
        return win.id;
      },destroyWindow:function (winid) {
        var win = GLFW.WindowFromId(winid);
        if (!win) return;
  
        if (win.windowCloseFunc)
          Runtime.dynCall('vi', win.windowCloseFunc, [win.id]);
  
        GLFW.windows[win.id - 1] = null;
        if (GLFW.active.id == win.id)
          GLFW.active = null;
  
        // Destroy context when no alive windows
        for (var i = 0; i < GLFW.windows.length; i++)
          if (GLFW.windows[i] !== null) return;
  
        Module.ctx = Browser.destroyContext(Module['canvas'], true, true);
      },swapBuffers:function (winid) {
      },GLFW2ParamToGLFW3Param:function (param) {
        table = {
          0x00030001:0, // GLFW_MOUSE_CURSOR
          0x00030002:0, // GLFW_STICKY_KEYS
          0x00030003:0, // GLFW_STICKY_MOUSE_BUTTONS
          0x00030004:0, // GLFW_SYSTEM_KEYS
          0x00030005:0, // GLFW_KEY_REPEAT
          0x00030006:0, // GLFW_AUTO_POLL_EVENTS
          0x00020001:0, // GLFW_OPENED
          0x00020002:0, // GLFW_ACTIVE
          0x00020003:0, // GLFW_ICONIFIED
          0x00020004:0, // GLFW_ACCELERATED
          0x00020005:0x00021001, // GLFW_RED_BITS
          0x00020006:0x00021002, // GLFW_GREEN_BITS
          0x00020007:0x00021003, // GLFW_BLUE_BITS
          0x00020008:0x00021004, // GLFW_ALPHA_BITS
          0x00020009:0x00021005, // GLFW_DEPTH_BITS
          0x0002000A:0x00021006, // GLFW_STENCIL_BITS
          0x0002000B:0x0002100F, // GLFW_REFRESH_RATE
          0x0002000C:0x00021007, // GLFW_ACCUM_RED_BITS
          0x0002000D:0x00021008, // GLFW_ACCUM_GREEN_BITS
          0x0002000E:0x00021009, // GLFW_ACCUM_BLUE_BITS
          0x0002000F:0x0002100A, // GLFW_ACCUM_ALPHA_BITS
          0x00020010:0x0002100B, // GLFW_AUX_BUFFERS
          0x00020011:0x0002100C, // GLFW_STEREO
          0x00020012:0, // GLFW_WINDOW_NO_RESIZE
          0x00020013:0x0002100D, // GLFW_FSAA_SAMPLES
          0x00020014:0x00022002, // GLFW_OPENGL_VERSION_MAJOR
          0x00020015:0x00022003, // GLFW_OPENGL_VERSION_MINOR
          0x00020016:0x00022006, // GLFW_OPENGL_FORWARD_COMPAT
          0x00020017:0x00022007, // GLFW_OPENGL_DEBUG_CONTEXT
          0x00020018:0x00022008, // GLFW_OPENGL_PROFILE
        };
        return table[param];
      }};function _glfwGetCursorPos(winid, x, y) {
      GLFW.getCursorPos(winid, x, y);
    }

  function _glUseProgram(program) {
      GLctx.useProgram(program ? GL.programs[program] : null);
    }

  function _glfwTerminate() {
      window.removeEventListener("keydown", GLFW.onKeydown, true);
      window.removeEventListener("keypress", GLFW.onKeyPress, true);
      window.removeEventListener("keyup", GLFW.onKeyup, true);
      Module["canvas"].removeEventListener("mousemove", GLFW.onMousemove, true);
      Module["canvas"].removeEventListener("mousedown", GLFW.onMouseButtonDown, true);
      Module["canvas"].removeEventListener("mouseup", GLFW.onMouseButtonUp, true);
      Module["canvas"].removeEventListener('wheel', GLFW.onMouseWheel, true);
      Module["canvas"].removeEventListener('mousewheel', GLFW.onMouseWheel, true);
      Module["canvas"].width = Module["canvas"].height = 1;
      GLFW.windows = null;
      GLFW.active = null;
    }

  function _glLinkProgram(program) {
      GLctx.linkProgram(GL.programs[program]);
      GL.programInfos[program] = null; // uniforms no longer keep the same names after linking
      GL.populateUniformTable(program);
    }

  function _glShaderSource(shader, count, string, length) {
      var source = GL.getSource(shader, count, string, length);
      GLctx.shaderSource(GL.shaders[shader], source);
    }

  function _glBindTexture(target, texture) {
      GLctx.bindTexture(target, texture ? GL.textures[texture] : null);
    }

  var _acosf=Math_acos;

  var _sqrtf=Math_sqrt;

  
  function ___setErrNo(value) {
      if (Module['___errno_location']) HEAP32[((Module['___errno_location']())>>2)]=value;
      return value;
    }
  
  var ERRNO_CODES={EPERM:1,ENOENT:2,ESRCH:3,EINTR:4,EIO:5,ENXIO:6,E2BIG:7,ENOEXEC:8,EBADF:9,ECHILD:10,EAGAIN:11,EWOULDBLOCK:11,ENOMEM:12,EACCES:13,EFAULT:14,ENOTBLK:15,EBUSY:16,EEXIST:17,EXDEV:18,ENODEV:19,ENOTDIR:20,EISDIR:21,EINVAL:22,ENFILE:23,EMFILE:24,ENOTTY:25,ETXTBSY:26,EFBIG:27,ENOSPC:28,ESPIPE:29,EROFS:30,EMLINK:31,EPIPE:32,EDOM:33,ERANGE:34,ENOMSG:42,EIDRM:43,ECHRNG:44,EL2NSYNC:45,EL3HLT:46,EL3RST:47,ELNRNG:48,EUNATCH:49,ENOCSI:50,EL2HLT:51,EDEADLK:35,ENOLCK:37,EBADE:52,EBADR:53,EXFULL:54,ENOANO:55,EBADRQC:56,EBADSLT:57,EDEADLOCK:35,EBFONT:59,ENOSTR:60,ENODATA:61,ETIME:62,ENOSR:63,ENONET:64,ENOPKG:65,EREMOTE:66,ENOLINK:67,EADV:68,ESRMNT:69,ECOMM:70,EPROTO:71,EMULTIHOP:72,EDOTDOT:73,EBADMSG:74,ENOTUNIQ:76,EBADFD:77,EREMCHG:78,ELIBACC:79,ELIBBAD:80,ELIBSCN:81,ELIBMAX:82,ELIBEXEC:83,ENOSYS:38,ENOTEMPTY:39,ENAMETOOLONG:36,ELOOP:40,EOPNOTSUPP:95,EPFNOSUPPORT:96,ECONNRESET:104,ENOBUFS:105,EAFNOSUPPORT:97,EPROTOTYPE:91,ENOTSOCK:88,ENOPROTOOPT:92,ESHUTDOWN:108,ECONNREFUSED:111,EADDRINUSE:98,ECONNABORTED:103,ENETUNREACH:101,ENETDOWN:100,ETIMEDOUT:110,EHOSTDOWN:112,EHOSTUNREACH:113,EINPROGRESS:115,EALREADY:114,EDESTADDRREQ:89,EMSGSIZE:90,EPROTONOSUPPORT:93,ESOCKTNOSUPPORT:94,EADDRNOTAVAIL:99,ENETRESET:102,EISCONN:106,ENOTCONN:107,ETOOMANYREFS:109,EUSERS:87,EDQUOT:122,ESTALE:116,ENOTSUP:95,ENOMEDIUM:123,EILSEQ:84,EOVERFLOW:75,ECANCELED:125,ENOTRECOVERABLE:131,EOWNERDEAD:130,ESTRPIPE:86};function _sysconf(name) {
      // long sysconf(int name);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/sysconf.html
      switch(name) {
        case 30: return PAGE_SIZE;
        case 85: return totalMemory / PAGE_SIZE;
        case 132:
        case 133:
        case 12:
        case 137:
        case 138:
        case 15:
        case 235:
        case 16:
        case 17:
        case 18:
        case 19:
        case 20:
        case 149:
        case 13:
        case 10:
        case 236:
        case 153:
        case 9:
        case 21:
        case 22:
        case 159:
        case 154:
        case 14:
        case 77:
        case 78:
        case 139:
        case 80:
        case 81:
        case 82:
        case 68:
        case 67:
        case 164:
        case 11:
        case 29:
        case 47:
        case 48:
        case 95:
        case 52:
        case 51:
        case 46:
          return 200809;
        case 79:
          return 0;
        case 27:
        case 246:
        case 127:
        case 128:
        case 23:
        case 24:
        case 160:
        case 161:
        case 181:
        case 182:
        case 242:
        case 183:
        case 184:
        case 243:
        case 244:
        case 245:
        case 165:
        case 178:
        case 179:
        case 49:
        case 50:
        case 168:
        case 169:
        case 175:
        case 170:
        case 171:
        case 172:
        case 97:
        case 76:
        case 32:
        case 173:
        case 35:
          return -1;
        case 176:
        case 177:
        case 7:
        case 155:
        case 8:
        case 157:
        case 125:
        case 126:
        case 92:
        case 93:
        case 129:
        case 130:
        case 131:
        case 94:
        case 91:
          return 1;
        case 74:
        case 60:
        case 69:
        case 70:
        case 4:
          return 1024;
        case 31:
        case 42:
        case 72:
          return 32;
        case 87:
        case 26:
        case 33:
          return 2147483647;
        case 34:
        case 1:
          return 47839;
        case 38:
        case 36:
          return 99;
        case 43:
        case 37:
          return 2048;
        case 0: return 2097152;
        case 3: return 65536;
        case 28: return 32768;
        case 44: return 32767;
        case 75: return 16384;
        case 39: return 1000;
        case 89: return 700;
        case 71: return 256;
        case 40: return 255;
        case 2: return 100;
        case 180: return 64;
        case 25: return 20;
        case 5: return 16;
        case 6: return 6;
        case 73: return 4;
        case 84: {
          if (typeof navigator === 'object') return navigator['hardwareConcurrency'] || 1;
          return 1;
        }
      }
      ___setErrNo(ERRNO_CODES.EINVAL);
      return -1;
    }

  function _glUniform2fv(location, count, value) {
      location = GL.uniforms[location];
      var view;
      if (count === 1) {
        // avoid allocation for the common case of uploading one uniform
        view = GL.miniTempBufferViews[1];
        view[0] = HEAPF32[((value)>>2)];
        view[1] = HEAPF32[(((value)+(4))>>2)];
      } else {
        view = HEAPF32.subarray((value)>>2,(value+count*8)>>2);
      }
      GLctx.uniform2fv(location, view);
    }

  function _glEnableVertexAttribArray(index) {
      var cb = GL.currentContext.clientBuffers[index];
      cb.enabled = true;
      GLctx.enableVertexAttribArray(index);
    }

  function _glBindBuffer(target, buffer) {
      var bufferObj = buffer ? GL.buffers[buffer] : null;
  
      if (target == GLctx.ARRAY_BUFFER) {
        GL.currArrayBuffer = buffer;
      } else if (target == GLctx.ELEMENT_ARRAY_BUFFER) {
        GL.currElementArrayBuffer = buffer;
      }
  
      GLctx.bindBuffer(target, bufferObj);
    }

  
  function __exit(status) {
      // void _exit(int status);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/exit.html
      Module['exit'](status);
    }function _exit(status) {
      __exit(status);
    }

  function _glCompileShader(shader) {
      GLctx.compileShader(GL.shaders[shader]);
    }

  
  
  
  var ERRNO_MESSAGES={0:"Success",1:"Not super-user",2:"No such file or directory",3:"No such process",4:"Interrupted system call",5:"I/O error",6:"No such device or address",7:"Arg list too long",8:"Exec format error",9:"Bad file number",10:"No children",11:"No more processes",12:"Not enough core",13:"Permission denied",14:"Bad address",15:"Block device required",16:"Mount device busy",17:"File exists",18:"Cross-device link",19:"No such device",20:"Not a directory",21:"Is a directory",22:"Invalid argument",23:"Too many open files in system",24:"Too many open files",25:"Not a typewriter",26:"Text file busy",27:"File too large",28:"No space left on device",29:"Illegal seek",30:"Read only file system",31:"Too many links",32:"Broken pipe",33:"Math arg out of domain of func",34:"Math result not representable",35:"File locking deadlock error",36:"File or path name too long",37:"No record locks available",38:"Function not implemented",39:"Directory not empty",40:"Too many symbolic links",42:"No message of desired type",43:"Identifier removed",44:"Channel number out of range",45:"Level 2 not synchronized",46:"Level 3 halted",47:"Level 3 reset",48:"Link number out of range",49:"Protocol driver not attached",50:"No CSI structure available",51:"Level 2 halted",52:"Invalid exchange",53:"Invalid request descriptor",54:"Exchange full",55:"No anode",56:"Invalid request code",57:"Invalid slot",59:"Bad font file fmt",60:"Device not a stream",61:"No data (for no delay io)",62:"Timer expired",63:"Out of streams resources",64:"Machine is not on the network",65:"Package not installed",66:"The object is remote",67:"The link has been severed",68:"Advertise error",69:"Srmount error",70:"Communication error on send",71:"Protocol error",72:"Multihop attempted",73:"Cross mount point (not really error)",74:"Trying to read unreadable message",75:"Value too large for defined data type",76:"Given log. name not unique",77:"f.d. invalid for this operation",78:"Remote address changed",79:"Can   access a needed shared lib",80:"Accessing a corrupted shared lib",81:".lib section in a.out corrupted",82:"Attempting to link in too many libs",83:"Attempting to exec a shared library",84:"Illegal byte sequence",86:"Streams pipe error",87:"Too many users",88:"Socket operation on non-socket",89:"Destination address required",90:"Message too long",91:"Protocol wrong type for socket",92:"Protocol not available",93:"Unknown protocol",94:"Socket type not supported",95:"Not supported",96:"Protocol family not supported",97:"Address family not supported by protocol family",98:"Address already in use",99:"Address not available",100:"Network interface is not configured",101:"Network is unreachable",102:"Connection reset by network",103:"Connection aborted",104:"Connection reset by peer",105:"No buffer space available",106:"Socket is already connected",107:"Socket is not connected",108:"Can't send after socket shutdown",109:"Too many references",110:"Connection timed out",111:"Connection refused",112:"Host is down",113:"Host is unreachable",114:"Socket already connected",115:"Connection already in progress",116:"Stale file handle",122:"Quota exceeded",123:"No medium (in tape drive)",125:"Operation canceled",130:"Previous owner died",131:"State not recoverable"};
  
  var PATH={splitPath:function (filename) {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1);
      },normalizeArray:function (parts, allowAboveRoot) {
        // if the path tries to go above the root, `up` ends up > 0
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
          var last = parts[i];
          if (last === '.') {
            parts.splice(i, 1);
          } else if (last === '..') {
            parts.splice(i, 1);
            up++;
          } else if (up) {
            parts.splice(i, 1);
            up--;
          }
        }
        // if the path is allowed to go above the root, restore leading ..s
        if (allowAboveRoot) {
          for (; up--; up) {
            parts.unshift('..');
          }
        }
        return parts;
      },normalize:function (path) {
        var isAbsolute = path.charAt(0) === '/',
            trailingSlash = path.substr(-1) === '/';
        // Normalize the path
        path = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), !isAbsolute).join('/');
        if (!path && !isAbsolute) {
          path = '.';
        }
        if (path && trailingSlash) {
          path += '/';
        }
        return (isAbsolute ? '/' : '') + path;
      },dirname:function (path) {
        var result = PATH.splitPath(path),
            root = result[0],
            dir = result[1];
        if (!root && !dir) {
          // No dirname whatsoever
          return '.';
        }
        if (dir) {
          // It has a dirname, strip trailing slash
          dir = dir.substr(0, dir.length - 1);
        }
        return root + dir;
      },basename:function (path) {
        // EMSCRIPTEN return '/'' for '/', not an empty string
        if (path === '/') return '/';
        var lastSlash = path.lastIndexOf('/');
        if (lastSlash === -1) return path;
        return path.substr(lastSlash+1);
      },extname:function (path) {
        return PATH.splitPath(path)[3];
      },join:function () {
        var paths = Array.prototype.slice.call(arguments, 0);
        return PATH.normalize(paths.join('/'));
      },join2:function (l, r) {
        return PATH.normalize(l + '/' + r);
      },resolve:function () {
        var resolvedPath = '',
          resolvedAbsolute = false;
        for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
          var path = (i >= 0) ? arguments[i] : FS.cwd();
          // Skip empty and invalid entries
          if (typeof path !== 'string') {
            throw new TypeError('Arguments to path.resolve must be strings');
          } else if (!path) {
            return ''; // an invalid portion invalidates the whole thing
          }
          resolvedPath = path + '/' + resolvedPath;
          resolvedAbsolute = path.charAt(0) === '/';
        }
        // At this point the path should be resolved to a full absolute path, but
        // handle relative paths to be safe (might happen when process.cwd() fails)
        resolvedPath = PATH.normalizeArray(resolvedPath.split('/').filter(function(p) {
          return !!p;
        }), !resolvedAbsolute).join('/');
        return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
      },relative:function (from, to) {
        from = PATH.resolve(from).substr(1);
        to = PATH.resolve(to).substr(1);
        function trim(arr) {
          var start = 0;
          for (; start < arr.length; start++) {
            if (arr[start] !== '') break;
          }
          var end = arr.length - 1;
          for (; end >= 0; end--) {
            if (arr[end] !== '') break;
          }
          if (start > end) return [];
          return arr.slice(start, end - start + 1);
        }
        var fromParts = trim(from.split('/'));
        var toParts = trim(to.split('/'));
        var length = Math.min(fromParts.length, toParts.length);
        var samePartsLength = length;
        for (var i = 0; i < length; i++) {
          if (fromParts[i] !== toParts[i]) {
            samePartsLength = i;
            break;
          }
        }
        var outputParts = [];
        for (var i = samePartsLength; i < fromParts.length; i++) {
          outputParts.push('..');
        }
        outputParts = outputParts.concat(toParts.slice(samePartsLength));
        return outputParts.join('/');
      }};
  
  var TTY={ttys:[],init:function () {
        // https://github.com/kripken/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // currently, FS.init does not distinguish if process.stdin is a file or TTY
        //   // device, it always assumes it's a TTY device. because of this, we're forcing
        //   // process.stdin to UTF8 encoding to at least make stdin reading compatible
        //   // with text files until FS.init can be refactored.
        //   process['stdin']['setEncoding']('utf8');
        // }
      },shutdown:function () {
        // https://github.com/kripken/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // inolen: any idea as to why node -e 'process.stdin.read()' wouldn't exit immediately (with process.stdin being a tty)?
        //   // isaacs: because now it's reading from the stream, you've expressed interest in it, so that read() kicks off a _read() which creates a ReadReq operation
        //   // inolen: I thought read() in that case was a synchronous operation that just grabbed some amount of buffered data if it exists?
        //   // isaacs: it is. but it also triggers a _read() call, which calls readStart() on the handle
        //   // isaacs: do process.stdin.pause() and i'd think it'd probably close the pending call
        //   process['stdin']['pause']();
        // }
      },register:function (dev, ops) {
        TTY.ttys[dev] = { input: [], output: [], ops: ops };
        FS.registerDevice(dev, TTY.stream_ops);
      },stream_ops:{open:function (stream) {
          var tty = TTY.ttys[stream.node.rdev];
          if (!tty) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          stream.tty = tty;
          stream.seekable = false;
        },close:function (stream) {
          // flush any pending line data
          stream.tty.ops.flush(stream.tty);
        },flush:function (stream) {
          stream.tty.ops.flush(stream.tty);
        },read:function (stream, buffer, offset, length, pos /* ignored */) {
          if (!stream.tty || !stream.tty.ops.get_char) {
            throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
          }
          var bytesRead = 0;
          for (var i = 0; i < length; i++) {
            var result;
            try {
              result = stream.tty.ops.get_char(stream.tty);
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
            if (result === undefined && bytesRead === 0) {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
            if (result === null || result === undefined) break;
            bytesRead++;
            buffer[offset+i] = result;
          }
          if (bytesRead) {
            stream.node.timestamp = Date.now();
          }
          return bytesRead;
        },write:function (stream, buffer, offset, length, pos) {
          if (!stream.tty || !stream.tty.ops.put_char) {
            throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
          }
          for (var i = 0; i < length; i++) {
            try {
              stream.tty.ops.put_char(stream.tty, buffer[offset+i]);
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
          }
          if (length) {
            stream.node.timestamp = Date.now();
          }
          return i;
        }},default_tty_ops:{get_char:function (tty) {
          if (!tty.input.length) {
            var result = null;
            if (ENVIRONMENT_IS_NODE) {
              // we will read data by chunks of BUFSIZE
              var BUFSIZE = 256;
              var buf = new Buffer(BUFSIZE);
              var bytesRead = 0;
  
              var fd = process.stdin.fd;
              // Linux and Mac cannot use process.stdin.fd (which isn't set up as sync)
              var usingDevice = false;
              try {
                fd = fs.openSync('/dev/stdin', 'r');
                usingDevice = true;
              } catch (e) {}
  
              bytesRead = fs.readSync(fd, buf, 0, BUFSIZE, null);
  
              if (usingDevice) { fs.closeSync(fd); }
              if (bytesRead > 0) {
                result = buf.slice(0, bytesRead).toString('utf-8');
              } else {
                result = null;
              }
  
            } else if (typeof window != 'undefined' &&
              typeof window.prompt == 'function') {
              // Browser.
              result = window.prompt('Input: ');  // returns null on cancel
              if (result !== null) {
                result += '\n';
              }
            } else if (typeof readline == 'function') {
              // Command line.
              result = readline();
              if (result !== null) {
                result += '\n';
              }
            }
            if (!result) {
              return null;
            }
            tty.input = intArrayFromString(result, true);
          }
          return tty.input.shift();
        },put_char:function (tty, val) {
          if (val === null || val === 10) {
            Module['print'](UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val); // val == 0 would cut text output off in the middle.
          }
        },flush:function (tty) {
          if (tty.output && tty.output.length > 0) {
            Module['print'](UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          }
        }},default_tty1_ops:{put_char:function (tty, val) {
          if (val === null || val === 10) {
            Module['printErr'](UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val);
          }
        },flush:function (tty) {
          if (tty.output && tty.output.length > 0) {
            Module['printErr'](UTF8ArrayToString(tty.output, 0));
            tty.output = [];
          }
        }}};
  
  var MEMFS={ops_table:null,mount:function (mount) {
        return MEMFS.createNode(null, '/', 16384 | 511 /* 0777 */, 0);
      },createNode:function (parent, name, mode, dev) {
        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
          // no supported
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (!MEMFS.ops_table) {
          MEMFS.ops_table = {
            dir: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                lookup: MEMFS.node_ops.lookup,
                mknod: MEMFS.node_ops.mknod,
                rename: MEMFS.node_ops.rename,
                unlink: MEMFS.node_ops.unlink,
                rmdir: MEMFS.node_ops.rmdir,
                readdir: MEMFS.node_ops.readdir,
                symlink: MEMFS.node_ops.symlink
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek
              }
            },
            file: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: {
                llseek: MEMFS.stream_ops.llseek,
                read: MEMFS.stream_ops.read,
                write: MEMFS.stream_ops.write,
                allocate: MEMFS.stream_ops.allocate,
                mmap: MEMFS.stream_ops.mmap,
                msync: MEMFS.stream_ops.msync
              }
            },
            link: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr,
                readlink: MEMFS.node_ops.readlink
              },
              stream: {}
            },
            chrdev: {
              node: {
                getattr: MEMFS.node_ops.getattr,
                setattr: MEMFS.node_ops.setattr
              },
              stream: FS.chrdev_stream_ops
            }
          };
        }
        var node = FS.createNode(parent, name, mode, dev);
        if (FS.isDir(node.mode)) {
          node.node_ops = MEMFS.ops_table.dir.node;
          node.stream_ops = MEMFS.ops_table.dir.stream;
          node.contents = {};
        } else if (FS.isFile(node.mode)) {
          node.node_ops = MEMFS.ops_table.file.node;
          node.stream_ops = MEMFS.ops_table.file.stream;
          node.usedBytes = 0; // The actual number of bytes used in the typed array, as opposed to contents.buffer.byteLength which gives the whole capacity.
          // When the byte data of the file is populated, this will point to either a typed array, or a normal JS array. Typed arrays are preferred
          // for performance, and used by default. However, typed arrays are not resizable like normal JS arrays are, so there is a small disk size
          // penalty involved for appending file writes that continuously grow a file similar to std::vector capacity vs used -scheme.
          node.contents = null; 
        } else if (FS.isLink(node.mode)) {
          node.node_ops = MEMFS.ops_table.link.node;
          node.stream_ops = MEMFS.ops_table.link.stream;
        } else if (FS.isChrdev(node.mode)) {
          node.node_ops = MEMFS.ops_table.chrdev.node;
          node.stream_ops = MEMFS.ops_table.chrdev.stream;
        }
        node.timestamp = Date.now();
        // add the new node to the parent
        if (parent) {
          parent.contents[name] = node;
        }
        return node;
      },getFileDataAsRegularArray:function (node) {
        if (node.contents && node.contents.subarray) {
          var arr = [];
          for (var i = 0; i < node.usedBytes; ++i) arr.push(node.contents[i]);
          return arr; // Returns a copy of the original data.
        }
        return node.contents; // No-op, the file contents are already in a JS array. Return as-is.
      },getFileDataAsTypedArray:function (node) {
        if (!node.contents) return new Uint8Array;
        if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes); // Make sure to not return excess unused bytes.
        return new Uint8Array(node.contents);
      },expandFileStorage:function (node, newCapacity) {
        // If we are asked to expand the size of a file that already exists, revert to using a standard JS array to store the file
        // instead of a typed array. This makes resizing the array more flexible because we can just .push() elements at the back to
        // increase the size.
        if (node.contents && node.contents.subarray && newCapacity > node.contents.length) {
          node.contents = MEMFS.getFileDataAsRegularArray(node);
          node.usedBytes = node.contents.length; // We might be writing to a lazy-loaded file which had overridden this property, so force-reset it.
        }
  
        if (!node.contents || node.contents.subarray) { // Keep using a typed array if creating a new storage, or if old one was a typed array as well.
          var prevCapacity = node.contents ? node.contents.buffer.byteLength : 0;
          if (prevCapacity >= newCapacity) return; // No need to expand, the storage was already large enough.
          // Don't expand strictly to the given requested limit if it's only a very small increase, but instead geometrically grow capacity.
          // For small filesizes (<1MB), perform size*2 geometric increase, but for large sizes, do a much more conservative size*1.125 increase to
          // avoid overshooting the allocation cap by a very large margin.
          var CAPACITY_DOUBLING_MAX = 1024 * 1024;
          newCapacity = Math.max(newCapacity, (prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2.0 : 1.125)) | 0);
          if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256); // At minimum allocate 256b for each file when expanding.
          var oldContents = node.contents;
          node.contents = new Uint8Array(newCapacity); // Allocate new storage.
          if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0); // Copy old data over to the new storage.
          return;
        }
        // Not using a typed array to back the file storage. Use a standard JS array instead.
        if (!node.contents && newCapacity > 0) node.contents = [];
        while (node.contents.length < newCapacity) node.contents.push(0);
      },resizeFileStorage:function (node, newSize) {
        if (node.usedBytes == newSize) return;
        if (newSize == 0) {
          node.contents = null; // Fully decommit when requesting a resize to zero.
          node.usedBytes = 0;
          return;
        }
        if (!node.contents || node.contents.subarray) { // Resize a typed array if that is being used as the backing store.
          var oldContents = node.contents;
          node.contents = new Uint8Array(new ArrayBuffer(newSize)); // Allocate new storage.
          if (oldContents) {
            node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes))); // Copy old data over to the new storage.
          }
          node.usedBytes = newSize;
          return;
        }
        // Backing with a JS array.
        if (!node.contents) node.contents = [];
        if (node.contents.length > newSize) node.contents.length = newSize;
        else while (node.contents.length < newSize) node.contents.push(0);
        node.usedBytes = newSize;
      },node_ops:{getattr:function (node) {
          var attr = {};
          // device numbers reuse inode numbers.
          attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
          attr.ino = node.id;
          attr.mode = node.mode;
          attr.nlink = 1;
          attr.uid = 0;
          attr.gid = 0;
          attr.rdev = node.rdev;
          if (FS.isDir(node.mode)) {
            attr.size = 4096;
          } else if (FS.isFile(node.mode)) {
            attr.size = node.usedBytes;
          } else if (FS.isLink(node.mode)) {
            attr.size = node.link.length;
          } else {
            attr.size = 0;
          }
          attr.atime = new Date(node.timestamp);
          attr.mtime = new Date(node.timestamp);
          attr.ctime = new Date(node.timestamp);
          // NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),
          //       but this is not required by the standard.
          attr.blksize = 4096;
          attr.blocks = Math.ceil(attr.size / attr.blksize);
          return attr;
        },setattr:function (node, attr) {
          if (attr.mode !== undefined) {
            node.mode = attr.mode;
          }
          if (attr.timestamp !== undefined) {
            node.timestamp = attr.timestamp;
          }
          if (attr.size !== undefined) {
            MEMFS.resizeFileStorage(node, attr.size);
          }
        },lookup:function (parent, name) {
          throw FS.genericErrors[ERRNO_CODES.ENOENT];
        },mknod:function (parent, name, mode, dev) {
          return MEMFS.createNode(parent, name, mode, dev);
        },rename:function (old_node, new_dir, new_name) {
          // if we're overwriting a directory at new_name, make sure it's empty.
          if (FS.isDir(old_node.mode)) {
            var new_node;
            try {
              new_node = FS.lookupNode(new_dir, new_name);
            } catch (e) {
            }
            if (new_node) {
              for (var i in new_node.contents) {
                throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
              }
            }
          }
          // do the internal rewiring
          delete old_node.parent.contents[old_node.name];
          old_node.name = new_name;
          new_dir.contents[new_name] = old_node;
          old_node.parent = new_dir;
        },unlink:function (parent, name) {
          delete parent.contents[name];
        },rmdir:function (parent, name) {
          var node = FS.lookupNode(parent, name);
          for (var i in node.contents) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
          }
          delete parent.contents[name];
        },readdir:function (node) {
          var entries = ['.', '..']
          for (var key in node.contents) {
            if (!node.contents.hasOwnProperty(key)) {
              continue;
            }
            entries.push(key);
          }
          return entries;
        },symlink:function (parent, newname, oldpath) {
          var node = MEMFS.createNode(parent, newname, 511 /* 0777 */ | 40960, 0);
          node.link = oldpath;
          return node;
        },readlink:function (node) {
          if (!FS.isLink(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          return node.link;
        }},stream_ops:{read:function (stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= stream.node.usedBytes) return 0;
          var size = Math.min(stream.node.usedBytes - position, length);
          assert(size >= 0);
          if (size > 8 && contents.subarray) { // non-trivial, and typed array
            buffer.set(contents.subarray(position, position + size), offset);
          } else {
            for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
          }
          return size;
        },write:function (stream, buffer, offset, length, position, canOwn) {
          if (!length) return 0;
          var node = stream.node;
          node.timestamp = Date.now();
  
          if (buffer.subarray && (!node.contents || node.contents.subarray)) { // This write is from a typed array to a typed array?
            if (canOwn) { // Can we just reuse the buffer we are given?
              node.contents = buffer.subarray(offset, offset + length);
              node.usedBytes = length;
              return length;
            } else if (node.usedBytes === 0 && position === 0) { // If this is a simple first write to an empty file, do a fast set since we don't need to care about old data.
              node.contents = new Uint8Array(buffer.subarray(offset, offset + length));
              node.usedBytes = length;
              return length;
            } else if (position + length <= node.usedBytes) { // Writing to an already allocated and used subrange of the file?
              node.contents.set(buffer.subarray(offset, offset + length), position);
              return length;
            }
          }
  
          // Appending to an existing file and we need to reallocate, or source data did not come as a typed array.
          MEMFS.expandFileStorage(node, position+length);
          if (node.contents.subarray && buffer.subarray) node.contents.set(buffer.subarray(offset, offset + length), position); // Use typed array write if available.
          else {
            for (var i = 0; i < length; i++) {
             node.contents[position + i] = buffer[offset + i]; // Or fall back to manual write if not.
            }
          }
          node.usedBytes = Math.max(node.usedBytes, position+length);
          return length;
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              position += stream.node.usedBytes;
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          return position;
        },allocate:function (stream, offset, length) {
          MEMFS.expandFileStorage(stream.node, offset + length);
          stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length);
        },mmap:function (stream, buffer, offset, length, position, prot, flags) {
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          var ptr;
          var allocated;
          var contents = stream.node.contents;
          // Only make a new copy when MAP_PRIVATE is specified.
          if ( !(flags & 2) &&
                (contents.buffer === buffer || contents.buffer === buffer.buffer) ) {
            // We can't emulate MAP_SHARED when the file is not backed by the buffer
            // we're mapping to (e.g. the HEAP buffer).
            allocated = false;
            ptr = contents.byteOffset;
          } else {
            // Try to avoid unnecessary slices.
            if (position > 0 || position + length < stream.node.usedBytes) {
              if (contents.subarray) {
                contents = contents.subarray(position, position + length);
              } else {
                contents = Array.prototype.slice.call(contents, position, position + length);
              }
            }
            allocated = true;
            ptr = _malloc(length);
            if (!ptr) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOMEM);
            }
            buffer.set(contents, ptr);
          }
          return { ptr: ptr, allocated: allocated };
        },msync:function (stream, buffer, offset, length, mmapFlags) {
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          if (mmapFlags & 2) {
            // MAP_PRIVATE calls need not to be synced back to underlying fs
            return 0;
          }
  
          var bytesWritten = MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
          // should we check if bytesWritten and length are the same?
          return 0;
        }}};
  
  var IDBFS={dbs:{},indexedDB:function () {
        if (typeof indexedDB !== 'undefined') return indexedDB;
        var ret = null;
        if (typeof window === 'object') ret = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
        assert(ret, 'IDBFS used, but indexedDB not supported');
        return ret;
      },DB_VERSION:21,DB_STORE_NAME:"FILE_DATA",mount:function (mount) {
        // reuse all of the core MEMFS functionality
        return MEMFS.mount.apply(null, arguments);
      },syncfs:function (mount, populate, callback) {
        IDBFS.getLocalSet(mount, function(err, local) {
          if (err) return callback(err);
  
          IDBFS.getRemoteSet(mount, function(err, remote) {
            if (err) return callback(err);
  
            var src = populate ? remote : local;
            var dst = populate ? local : remote;
  
            IDBFS.reconcile(src, dst, callback);
          });
        });
      },getDB:function (name, callback) {
        // check the cache first
        var db = IDBFS.dbs[name];
        if (db) {
          return callback(null, db);
        }
  
        var req;
        try {
          req = IDBFS.indexedDB().open(name, IDBFS.DB_VERSION);
        } catch (e) {
          return callback(e);
        }
        req.onupgradeneeded = function(e) {
          var db = e.target.result;
          var transaction = e.target.transaction;
  
          var fileStore;
  
          if (db.objectStoreNames.contains(IDBFS.DB_STORE_NAME)) {
            fileStore = transaction.objectStore(IDBFS.DB_STORE_NAME);
          } else {
            fileStore = db.createObjectStore(IDBFS.DB_STORE_NAME);
          }
  
          if (!fileStore.indexNames.contains('timestamp')) {
            fileStore.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };
        req.onsuccess = function() {
          db = req.result;
  
          // add to the cache
          IDBFS.dbs[name] = db;
          callback(null, db);
        };
        req.onerror = function(e) {
          callback(this.error);
          e.preventDefault();
        };
      },getLocalSet:function (mount, callback) {
        var entries = {};
  
        function isRealDir(p) {
          return p !== '.' && p !== '..';
        };
        function toAbsolute(root) {
          return function(p) {
            return PATH.join2(root, p);
          }
        };
  
        var check = FS.readdir(mount.mountpoint).filter(isRealDir).map(toAbsolute(mount.mountpoint));
  
        while (check.length) {
          var path = check.pop();
          var stat;
  
          try {
            stat = FS.stat(path);
          } catch (e) {
            return callback(e);
          }
  
          if (FS.isDir(stat.mode)) {
            check.push.apply(check, FS.readdir(path).filter(isRealDir).map(toAbsolute(path)));
          }
  
          entries[path] = { timestamp: stat.mtime };
        }
  
        return callback(null, { type: 'local', entries: entries });
      },getRemoteSet:function (mount, callback) {
        var entries = {};
  
        IDBFS.getDB(mount.mountpoint, function(err, db) {
          if (err) return callback(err);
  
          var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readonly');
          transaction.onerror = function(e) {
            callback(this.error);
            e.preventDefault();
          };
  
          var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
          var index = store.index('timestamp');
  
          index.openKeyCursor().onsuccess = function(event) {
            var cursor = event.target.result;
  
            if (!cursor) {
              return callback(null, { type: 'remote', db: db, entries: entries });
            }
  
            entries[cursor.primaryKey] = { timestamp: cursor.key };
  
            cursor.continue();
          };
        });
      },loadLocalEntry:function (path, callback) {
        var stat, node;
  
        try {
          var lookup = FS.lookupPath(path);
          node = lookup.node;
          stat = FS.stat(path);
        } catch (e) {
          return callback(e);
        }
  
        if (FS.isDir(stat.mode)) {
          return callback(null, { timestamp: stat.mtime, mode: stat.mode });
        } else if (FS.isFile(stat.mode)) {
          // Performance consideration: storing a normal JavaScript array to a IndexedDB is much slower than storing a typed array.
          // Therefore always convert the file contents to a typed array first before writing the data to IndexedDB.
          node.contents = MEMFS.getFileDataAsTypedArray(node);
          return callback(null, { timestamp: stat.mtime, mode: stat.mode, contents: node.contents });
        } else {
          return callback(new Error('node type not supported'));
        }
      },storeLocalEntry:function (path, entry, callback) {
        try {
          if (FS.isDir(entry.mode)) {
            FS.mkdir(path, entry.mode);
          } else if (FS.isFile(entry.mode)) {
            FS.writeFile(path, entry.contents, { encoding: 'binary', canOwn: true });
          } else {
            return callback(new Error('node type not supported'));
          }
  
          FS.chmod(path, entry.mode);
          FS.utime(path, entry.timestamp, entry.timestamp);
        } catch (e) {
          return callback(e);
        }
  
        callback(null);
      },removeLocalEntry:function (path, callback) {
        try {
          var lookup = FS.lookupPath(path);
          var stat = FS.stat(path);
  
          if (FS.isDir(stat.mode)) {
            FS.rmdir(path);
          } else if (FS.isFile(stat.mode)) {
            FS.unlink(path);
          }
        } catch (e) {
          return callback(e);
        }
  
        callback(null);
      },loadRemoteEntry:function (store, path, callback) {
        var req = store.get(path);
        req.onsuccess = function(event) { callback(null, event.target.result); };
        req.onerror = function(e) {
          callback(this.error);
          e.preventDefault();
        };
      },storeRemoteEntry:function (store, path, entry, callback) {
        var req = store.put(entry, path);
        req.onsuccess = function() { callback(null); };
        req.onerror = function(e) {
          callback(this.error);
          e.preventDefault();
        };
      },removeRemoteEntry:function (store, path, callback) {
        var req = store.delete(path);
        req.onsuccess = function() { callback(null); };
        req.onerror = function(e) {
          callback(this.error);
          e.preventDefault();
        };
      },reconcile:function (src, dst, callback) {
        var total = 0;
  
        var create = [];
        Object.keys(src.entries).forEach(function (key) {
          var e = src.entries[key];
          var e2 = dst.entries[key];
          if (!e2 || e.timestamp > e2.timestamp) {
            create.push(key);
            total++;
          }
        });
  
        var remove = [];
        Object.keys(dst.entries).forEach(function (key) {
          var e = dst.entries[key];
          var e2 = src.entries[key];
          if (!e2) {
            remove.push(key);
            total++;
          }
        });
  
        if (!total) {
          return callback(null);
        }
  
        var errored = false;
        var completed = 0;
        var db = src.type === 'remote' ? src.db : dst.db;
        var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readwrite');
        var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
  
        function done(err) {
          if (err) {
            if (!done.errored) {
              done.errored = true;
              return callback(err);
            }
            return;
          }
          if (++completed >= total) {
            return callback(null);
          }
        };
  
        transaction.onerror = function(e) {
          done(this.error);
          e.preventDefault();
        };
  
        // sort paths in ascending order so directory entries are created
        // before the files inside them
        create.sort().forEach(function (path) {
          if (dst.type === 'local') {
            IDBFS.loadRemoteEntry(store, path, function (err, entry) {
              if (err) return done(err);
              IDBFS.storeLocalEntry(path, entry, done);
            });
          } else {
            IDBFS.loadLocalEntry(path, function (err, entry) {
              if (err) return done(err);
              IDBFS.storeRemoteEntry(store, path, entry, done);
            });
          }
        });
  
        // sort paths in descending order so files are deleted before their
        // parent directories
        remove.sort().reverse().forEach(function(path) {
          if (dst.type === 'local') {
            IDBFS.removeLocalEntry(path, done);
          } else {
            IDBFS.removeRemoteEntry(store, path, done);
          }
        });
      }};
  
  var NODEFS={isWindows:false,staticInit:function () {
        NODEFS.isWindows = !!process.platform.match(/^win/);
      },mount:function (mount) {
        assert(ENVIRONMENT_IS_NODE);
        return NODEFS.createNode(null, '/', NODEFS.getMode(mount.opts.root), 0);
      },createNode:function (parent, name, mode, dev) {
        if (!FS.isDir(mode) && !FS.isFile(mode) && !FS.isLink(mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var node = FS.createNode(parent, name, mode);
        node.node_ops = NODEFS.node_ops;
        node.stream_ops = NODEFS.stream_ops;
        return node;
      },getMode:function (path) {
        var stat;
        try {
          stat = fs.lstatSync(path);
          if (NODEFS.isWindows) {
            // On Windows, directories return permission bits 'rw-rw-rw-', even though they have 'rwxrwxrwx', so
            // propagate write bits to execute bits.
            stat.mode = stat.mode | ((stat.mode & 146) >> 1);
          }
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code]);
        }
        return stat.mode;
      },realPath:function (node) {
        var parts = [];
        while (node.parent !== node) {
          parts.push(node.name);
          node = node.parent;
        }
        parts.push(node.mount.opts.root);
        parts.reverse();
        return PATH.join.apply(null, parts);
      },flagsToPermissionStringMap:{0:"r",1:"r+",2:"r+",64:"r",65:"r+",66:"r+",129:"rx+",193:"rx+",514:"w+",577:"w",578:"w+",705:"wx",706:"wx+",1024:"a",1025:"a",1026:"a+",1089:"a",1090:"a+",1153:"ax",1154:"ax+",1217:"ax",1218:"ax+",4096:"rs",4098:"rs+"},flagsToPermissionString:function (flags) {
        flags &= ~0100000 /*O_LARGEFILE*/; // Ignore this flag from musl, otherwise node.js fails to open the file.
        flags &= ~02000000 /*O_CLOEXEC*/; // Some applications may pass it; it makes no sense for a single process.
        if (flags in NODEFS.flagsToPermissionStringMap) {
          return NODEFS.flagsToPermissionStringMap[flags];
        } else {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
      },node_ops:{getattr:function (node) {
          var path = NODEFS.realPath(node);
          var stat;
          try {
            stat = fs.lstatSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          // node.js v0.10.20 doesn't report blksize and blocks on Windows. Fake them with default blksize of 4096.
          // See http://support.microsoft.com/kb/140365
          if (NODEFS.isWindows && !stat.blksize) {
            stat.blksize = 4096;
          }
          if (NODEFS.isWindows && !stat.blocks) {
            stat.blocks = (stat.size+stat.blksize-1)/stat.blksize|0;
          }
          return {
            dev: stat.dev,
            ino: stat.ino,
            mode: stat.mode,
            nlink: stat.nlink,
            uid: stat.uid,
            gid: stat.gid,
            rdev: stat.rdev,
            size: stat.size,
            atime: stat.atime,
            mtime: stat.mtime,
            ctime: stat.ctime,
            blksize: stat.blksize,
            blocks: stat.blocks
          };
        },setattr:function (node, attr) {
          var path = NODEFS.realPath(node);
          try {
            if (attr.mode !== undefined) {
              fs.chmodSync(path, attr.mode);
              // update the common node structure mode as well
              node.mode = attr.mode;
            }
            if (attr.timestamp !== undefined) {
              var date = new Date(attr.timestamp);
              fs.utimesSync(path, date, date);
            }
            if (attr.size !== undefined) {
              fs.truncateSync(path, attr.size);
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },lookup:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          var mode = NODEFS.getMode(path);
          return NODEFS.createNode(parent, name, mode);
        },mknod:function (parent, name, mode, dev) {
          var node = NODEFS.createNode(parent, name, mode, dev);
          // create the backing node for this in the fs root as well
          var path = NODEFS.realPath(node);
          try {
            if (FS.isDir(node.mode)) {
              fs.mkdirSync(path, node.mode);
            } else {
              fs.writeFileSync(path, '', { mode: node.mode });
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          return node;
        },rename:function (oldNode, newDir, newName) {
          var oldPath = NODEFS.realPath(oldNode);
          var newPath = PATH.join2(NODEFS.realPath(newDir), newName);
          try {
            fs.renameSync(oldPath, newPath);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },unlink:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          try {
            fs.unlinkSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },rmdir:function (parent, name) {
          var path = PATH.join2(NODEFS.realPath(parent), name);
          try {
            fs.rmdirSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },readdir:function (node) {
          var path = NODEFS.realPath(node);
          try {
            return fs.readdirSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },symlink:function (parent, newName, oldPath) {
          var newPath = PATH.join2(NODEFS.realPath(parent), newName);
          try {
            fs.symlinkSync(oldPath, newPath);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },readlink:function (node) {
          var path = NODEFS.realPath(node);
          try {
            path = fs.readlinkSync(path);
            path = NODEJS_PATH.relative(NODEJS_PATH.resolve(node.mount.opts.root), path);
            return path;
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        }},stream_ops:{open:function (stream) {
          var path = NODEFS.realPath(stream.node);
          try {
            if (FS.isFile(stream.node.mode)) {
              stream.nfd = fs.openSync(path, NODEFS.flagsToPermissionString(stream.flags));
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },close:function (stream) {
          try {
            if (FS.isFile(stream.node.mode) && stream.nfd) {
              fs.closeSync(stream.nfd);
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },read:function (stream, buffer, offset, length, position) {
          if (length === 0) return 0; // node errors on 0 length reads
          // FIXME this is terrible.
          var nbuffer = new Buffer(length);
          var res;
          try {
            res = fs.readSync(stream.nfd, nbuffer, 0, length, position);
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          if (res > 0) {
            for (var i = 0; i < res; i++) {
              buffer[offset + i] = nbuffer[i];
            }
          }
          return res;
        },write:function (stream, buffer, offset, length, position) {
          // FIXME this is terrible.
          var nbuffer = new Buffer(buffer.subarray(offset, offset + length));
          var res;
          try {
            res = fs.writeSync(stream.nfd, nbuffer, 0, length, position);
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          return res;
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              try {
                var stat = fs.fstatSync(stream.nfd);
                position += stat.size;
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES[e.code]);
              }
            }
          }
  
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
  
          return position;
        }}};
  
  var WORKERFS={DIR_MODE:16895,FILE_MODE:33279,reader:null,mount:function (mount) {
        assert(ENVIRONMENT_IS_WORKER);
        if (!WORKERFS.reader) WORKERFS.reader = new FileReaderSync();
        var root = WORKERFS.createNode(null, '/', WORKERFS.DIR_MODE, 0);
        var createdParents = {};
        function ensureParent(path) {
          // return the parent node, creating subdirs as necessary
          var parts = path.split('/');
          var parent = root;
          for (var i = 0; i < parts.length-1; i++) {
            var curr = parts.slice(0, i+1).join('/');
            if (!createdParents[curr]) {
              createdParents[curr] = WORKERFS.createNode(parent, curr, WORKERFS.DIR_MODE, 0);
            }
            parent = createdParents[curr];
          }
          return parent;
        }
        function base(path) {
          var parts = path.split('/');
          return parts[parts.length-1];
        }
        // We also accept FileList here, by using Array.prototype
        Array.prototype.forEach.call(mount.opts["files"] || [], function(file) {
          WORKERFS.createNode(ensureParent(file.name), base(file.name), WORKERFS.FILE_MODE, 0, file, file.lastModifiedDate);
        });
        (mount.opts["blobs"] || []).forEach(function(obj) {
          WORKERFS.createNode(ensureParent(obj["name"]), base(obj["name"]), WORKERFS.FILE_MODE, 0, obj["data"]);
        });
        (mount.opts["packages"] || []).forEach(function(pack) {
          pack['metadata'].files.forEach(function(file) {
            var name = file.filename.substr(1); // remove initial slash
            WORKERFS.createNode(ensureParent(name), base(name), WORKERFS.FILE_MODE, 0, pack['blob'].slice(file.start, file.end));
          });
        });
        return root;
      },createNode:function (parent, name, mode, dev, contents, mtime) {
        var node = FS.createNode(parent, name, mode);
        node.mode = mode;
        node.node_ops = WORKERFS.node_ops;
        node.stream_ops = WORKERFS.stream_ops;
        node.timestamp = (mtime || new Date).getTime();
        assert(WORKERFS.FILE_MODE !== WORKERFS.DIR_MODE);
        if (mode === WORKERFS.FILE_MODE) {
          node.size = contents.size;
          node.contents = contents;
        } else {
          node.size = 4096;
          node.contents = {};
        }
        if (parent) {
          parent.contents[name] = node;
        }
        return node;
      },node_ops:{getattr:function (node) {
          return {
            dev: 1,
            ino: undefined,
            mode: node.mode,
            nlink: 1,
            uid: 0,
            gid: 0,
            rdev: undefined,
            size: node.size,
            atime: new Date(node.timestamp),
            mtime: new Date(node.timestamp),
            ctime: new Date(node.timestamp),
            blksize: 4096,
            blocks: Math.ceil(node.size / 4096),
          };
        },setattr:function (node, attr) {
          if (attr.mode !== undefined) {
            node.mode = attr.mode;
          }
          if (attr.timestamp !== undefined) {
            node.timestamp = attr.timestamp;
          }
        },lookup:function (parent, name) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        },mknod:function (parent, name, mode, dev) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        },rename:function (oldNode, newDir, newName) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        },unlink:function (parent, name) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        },rmdir:function (parent, name) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        },readdir:function (node) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        },symlink:function (parent, newName, oldPath) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        },readlink:function (node) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }},stream_ops:{read:function (stream, buffer, offset, length, position) {
          if (position >= stream.node.size) return 0;
          var chunk = stream.node.contents.slice(position, position + length);
          var ab = WORKERFS.reader.readAsArrayBuffer(chunk);
          buffer.set(new Uint8Array(ab), offset);
          return chunk.size;
        },write:function (stream, buffer, offset, length, position) {
          throw new FS.ErrnoError(ERRNO_CODES.EIO);
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              position += stream.node.size;
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          return position;
        }}};
  
  var _stdin=allocate(1, "i32*", ALLOC_STATIC);
  
  var _stdout=allocate(1, "i32*", ALLOC_STATIC);
  
  var _stderr=allocate(1, "i32*", ALLOC_STATIC);var FS={root:null,mounts:[],devices:[null],streams:[],nextInode:1,nameTable:null,currentPath:"/",initialized:false,ignorePermissions:true,trackingDelegate:{},tracking:{openFlags:{READ:1,WRITE:2}},ErrnoError:null,genericErrors:{},filesystems:null,handleFSError:function (e) {
        if (!(e instanceof FS.ErrnoError)) throw e + ' : ' + stackTrace();
        return ___setErrNo(e.errno);
      },lookupPath:function (path, opts) {
        path = PATH.resolve(FS.cwd(), path);
        opts = opts || {};
  
        if (!path) return { path: '', node: null };
  
        var defaults = {
          follow_mount: true,
          recurse_count: 0
        };
        for (var key in defaults) {
          if (opts[key] === undefined) {
            opts[key] = defaults[key];
          }
        }
  
        if (opts.recurse_count > 8) {  // max recursive lookup of 8
          throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
        }
  
        // split the path
        var parts = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), false);
  
        // start at the root
        var current = FS.root;
        var current_path = '/';
  
        for (var i = 0; i < parts.length; i++) {
          var islast = (i === parts.length-1);
          if (islast && opts.parent) {
            // stop resolving
            break;
          }
  
          current = FS.lookupNode(current, parts[i]);
          current_path = PATH.join2(current_path, parts[i]);
  
          // jump to the mount's root node if this is a mountpoint
          if (FS.isMountpoint(current)) {
            if (!islast || (islast && opts.follow_mount)) {
              current = current.mounted.root;
            }
          }
  
          // by default, lookupPath will not follow a symlink if it is the final path component.
          // setting opts.follow = true will override this behavior.
          if (!islast || opts.follow) {
            var count = 0;
            while (FS.isLink(current.mode)) {
              var link = FS.readlink(current_path);
              current_path = PATH.resolve(PATH.dirname(current_path), link);
  
              var lookup = FS.lookupPath(current_path, { recurse_count: opts.recurse_count });
              current = lookup.node;
  
              if (count++ > 40) {  // limit max consecutive symlinks to 40 (SYMLOOP_MAX).
                throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
              }
            }
          }
        }
  
        return { path: current_path, node: current };
      },getPath:function (node) {
        var path;
        while (true) {
          if (FS.isRoot(node)) {
            var mount = node.mount.mountpoint;
            if (!path) return mount;
            return mount[mount.length-1] !== '/' ? mount + '/' + path : mount + path;
          }
          path = path ? node.name + '/' + path : node.name;
          node = node.parent;
        }
      },hashName:function (parentid, name) {
        var hash = 0;
  
  
        for (var i = 0; i < name.length; i++) {
          hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
        }
        return ((parentid + hash) >>> 0) % FS.nameTable.length;
      },hashAddNode:function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        node.name_next = FS.nameTable[hash];
        FS.nameTable[hash] = node;
      },hashRemoveNode:function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        if (FS.nameTable[hash] === node) {
          FS.nameTable[hash] = node.name_next;
        } else {
          var current = FS.nameTable[hash];
          while (current) {
            if (current.name_next === node) {
              current.name_next = node.name_next;
              break;
            }
            current = current.name_next;
          }
        }
      },lookupNode:function (parent, name) {
        var err = FS.mayLookup(parent);
        if (err) {
          throw new FS.ErrnoError(err, parent);
        }
        var hash = FS.hashName(parent.id, name);
        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
          var nodeName = node.name;
          if (node.parent.id === parent.id && nodeName === name) {
            return node;
          }
        }
        // if we failed to find it in the cache, call into the VFS
        return FS.lookup(parent, name);
      },createNode:function (parent, name, mode, rdev) {
        if (!FS.FSNode) {
          FS.FSNode = function(parent, name, mode, rdev) {
            if (!parent) {
              parent = this;  // root node sets parent to itself
            }
            this.parent = parent;
            this.mount = parent.mount;
            this.mounted = null;
            this.id = FS.nextInode++;
            this.name = name;
            this.mode = mode;
            this.node_ops = {};
            this.stream_ops = {};
            this.rdev = rdev;
          };
  
          FS.FSNode.prototype = {};
  
          // compatibility
          var readMode = 292 | 73;
          var writeMode = 146;
  
          // NOTE we must use Object.defineProperties instead of individual calls to
          // Object.defineProperty in order to make closure compiler happy
          Object.defineProperties(FS.FSNode.prototype, {
            read: {
              get: function() { return (this.mode & readMode) === readMode; },
              set: function(val) { val ? this.mode |= readMode : this.mode &= ~readMode; }
            },
            write: {
              get: function() { return (this.mode & writeMode) === writeMode; },
              set: function(val) { val ? this.mode |= writeMode : this.mode &= ~writeMode; }
            },
            isFolder: {
              get: function() { return FS.isDir(this.mode); }
            },
            isDevice: {
              get: function() { return FS.isChrdev(this.mode); }
            }
          });
        }
  
        var node = new FS.FSNode(parent, name, mode, rdev);
  
        FS.hashAddNode(node);
  
        return node;
      },destroyNode:function (node) {
        FS.hashRemoveNode(node);
      },isRoot:function (node) {
        return node === node.parent;
      },isMountpoint:function (node) {
        return !!node.mounted;
      },isFile:function (mode) {
        return (mode & 61440) === 32768;
      },isDir:function (mode) {
        return (mode & 61440) === 16384;
      },isLink:function (mode) {
        return (mode & 61440) === 40960;
      },isChrdev:function (mode) {
        return (mode & 61440) === 8192;
      },isBlkdev:function (mode) {
        return (mode & 61440) === 24576;
      },isFIFO:function (mode) {
        return (mode & 61440) === 4096;
      },isSocket:function (mode) {
        return (mode & 49152) === 49152;
      },flagModes:{"r":0,"rs":1052672,"r+":2,"w":577,"wx":705,"xw":705,"w+":578,"wx+":706,"xw+":706,"a":1089,"ax":1217,"xa":1217,"a+":1090,"ax+":1218,"xa+":1218},modeStringToFlags:function (str) {
        var flags = FS.flagModes[str];
        if (typeof flags === 'undefined') {
          throw new Error('Unknown file open mode: ' + str);
        }
        return flags;
      },flagsToPermissionString:function (flag) {
        var perms = ['r', 'w', 'rw'][flag & 3];
        if ((flag & 512)) {
          perms += 'w';
        }
        return perms;
      },nodePermissions:function (node, perms) {
        if (FS.ignorePermissions) {
          return 0;
        }
        // return 0 if any user, group or owner bits are set.
        if (perms.indexOf('r') !== -1 && !(node.mode & 292)) {
          return ERRNO_CODES.EACCES;
        } else if (perms.indexOf('w') !== -1 && !(node.mode & 146)) {
          return ERRNO_CODES.EACCES;
        } else if (perms.indexOf('x') !== -1 && !(node.mode & 73)) {
          return ERRNO_CODES.EACCES;
        }
        return 0;
      },mayLookup:function (dir) {
        var err = FS.nodePermissions(dir, 'x');
        if (err) return err;
        if (!dir.node_ops.lookup) return ERRNO_CODES.EACCES;
        return 0;
      },mayCreate:function (dir, name) {
        try {
          var node = FS.lookupNode(dir, name);
          return ERRNO_CODES.EEXIST;
        } catch (e) {
        }
        return FS.nodePermissions(dir, 'wx');
      },mayDelete:function (dir, name, isdir) {
        var node;
        try {
          node = FS.lookupNode(dir, name);
        } catch (e) {
          return e.errno;
        }
        var err = FS.nodePermissions(dir, 'wx');
        if (err) {
          return err;
        }
        if (isdir) {
          if (!FS.isDir(node.mode)) {
            return ERRNO_CODES.ENOTDIR;
          }
          if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
            return ERRNO_CODES.EBUSY;
          }
        } else {
          if (FS.isDir(node.mode)) {
            return ERRNO_CODES.EISDIR;
          }
        }
        return 0;
      },mayOpen:function (node, flags) {
        if (!node) {
          return ERRNO_CODES.ENOENT;
        }
        if (FS.isLink(node.mode)) {
          return ERRNO_CODES.ELOOP;
        } else if (FS.isDir(node.mode)) {
          if ((flags & 2097155) !== 0 ||  // opening for write
              (flags & 512)) {
            return ERRNO_CODES.EISDIR;
          }
        }
        return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
      },MAX_OPEN_FDS:4096,nextfd:function (fd_start, fd_end) {
        fd_start = fd_start || 0;
        fd_end = fd_end || FS.MAX_OPEN_FDS;
        for (var fd = fd_start; fd <= fd_end; fd++) {
          if (!FS.streams[fd]) {
            return fd;
          }
        }
        throw new FS.ErrnoError(ERRNO_CODES.EMFILE);
      },getStream:function (fd) {
        return FS.streams[fd];
      },createStream:function (stream, fd_start, fd_end) {
        if (!FS.FSStream) {
          FS.FSStream = function(){};
          FS.FSStream.prototype = {};
          // compatibility
          Object.defineProperties(FS.FSStream.prototype, {
            object: {
              get: function() { return this.node; },
              set: function(val) { this.node = val; }
            },
            isRead: {
              get: function() { return (this.flags & 2097155) !== 1; }
            },
            isWrite: {
              get: function() { return (this.flags & 2097155) !== 0; }
            },
            isAppend: {
              get: function() { return (this.flags & 1024); }
            }
          });
        }
        // clone it, so we can return an instance of FSStream
        var newStream = new FS.FSStream();
        for (var p in stream) {
          newStream[p] = stream[p];
        }
        stream = newStream;
        var fd = FS.nextfd(fd_start, fd_end);
        stream.fd = fd;
        FS.streams[fd] = stream;
        return stream;
      },closeStream:function (fd) {
        FS.streams[fd] = null;
      },chrdev_stream_ops:{open:function (stream) {
          var device = FS.getDevice(stream.node.rdev);
          // override node's stream ops with the device's
          stream.stream_ops = device.stream_ops;
          // forward the open call
          if (stream.stream_ops.open) {
            stream.stream_ops.open(stream);
          }
        },llseek:function () {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }},major:function (dev) {
        return ((dev) >> 8);
      },minor:function (dev) {
        return ((dev) & 0xff);
      },makedev:function (ma, mi) {
        return ((ma) << 8 | (mi));
      },registerDevice:function (dev, ops) {
        FS.devices[dev] = { stream_ops: ops };
      },getDevice:function (dev) {
        return FS.devices[dev];
      },getMounts:function (mount) {
        var mounts = [];
        var check = [mount];
  
        while (check.length) {
          var m = check.pop();
  
          mounts.push(m);
  
          check.push.apply(check, m.mounts);
        }
  
        return mounts;
      },syncfs:function (populate, callback) {
        if (typeof(populate) === 'function') {
          callback = populate;
          populate = false;
        }
  
        var mounts = FS.getMounts(FS.root.mount);
        var completed = 0;
  
        function done(err) {
          if (err) {
            if (!done.errored) {
              done.errored = true;
              return callback(err);
            }
            return;
          }
          if (++completed >= mounts.length) {
            callback(null);
          }
        };
  
        // sync all mounts
        mounts.forEach(function (mount) {
          if (!mount.type.syncfs) {
            return done(null);
          }
          mount.type.syncfs(mount, populate, done);
        });
      },mount:function (type, opts, mountpoint) {
        var root = mountpoint === '/';
        var pseudo = !mountpoint;
        var node;
  
        if (root && FS.root) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        } else if (!root && !pseudo) {
          var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
          mountpoint = lookup.path;  // use the absolute path
          node = lookup.node;
  
          if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
          }
  
          if (!FS.isDir(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
          }
        }
  
        var mount = {
          type: type,
          opts: opts,
          mountpoint: mountpoint,
          mounts: []
        };
  
        // create a root node for the fs
        var mountRoot = type.mount(mount);
        mountRoot.mount = mount;
        mount.root = mountRoot;
  
        if (root) {
          FS.root = mountRoot;
        } else if (node) {
          // set as a mountpoint
          node.mounted = mount;
  
          // add the new mount to the current mount's children
          if (node.mount) {
            node.mount.mounts.push(mount);
          }
        }
  
        return mountRoot;
      },unmount:function (mountpoint) {
        var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
        if (!FS.isMountpoint(lookup.node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
  
        // destroy the nodes for this mount, and all its child mounts
        var node = lookup.node;
        var mount = node.mounted;
        var mounts = FS.getMounts(mount);
  
        Object.keys(FS.nameTable).forEach(function (hash) {
          var current = FS.nameTable[hash];
  
          while (current) {
            var next = current.name_next;
  
            if (mounts.indexOf(current.mount) !== -1) {
              FS.destroyNode(current);
            }
  
            current = next;
          }
        });
  
        // no longer a mountpoint
        node.mounted = null;
  
        // remove this mount from the child mounts
        var idx = node.mount.mounts.indexOf(mount);
        assert(idx !== -1);
        node.mount.mounts.splice(idx, 1);
      },lookup:function (parent, name) {
        return parent.node_ops.lookup(parent, name);
      },mknod:function (path, mode, dev) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        if (!name || name === '.' || name === '..') {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var err = FS.mayCreate(parent, name);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.mknod) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return parent.node_ops.mknod(parent, name, mode, dev);
      },create:function (path, mode) {
        mode = mode !== undefined ? mode : 438 /* 0666 */;
        mode &= 4095;
        mode |= 32768;
        return FS.mknod(path, mode, 0);
      },mkdir:function (path, mode) {
        mode = mode !== undefined ? mode : 511 /* 0777 */;
        mode &= 511 | 512;
        mode |= 16384;
        return FS.mknod(path, mode, 0);
      },mkdev:function (path, mode, dev) {
        if (typeof(dev) === 'undefined') {
          dev = mode;
          mode = 438 /* 0666 */;
        }
        mode |= 8192;
        return FS.mknod(path, mode, dev);
      },symlink:function (oldpath, newpath) {
        if (!PATH.resolve(oldpath)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        var lookup = FS.lookupPath(newpath, { parent: true });
        var parent = lookup.node;
        if (!parent) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        var newname = PATH.basename(newpath);
        var err = FS.mayCreate(parent, newname);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.symlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return parent.node_ops.symlink(parent, newname, oldpath);
      },rename:function (old_path, new_path) {
        var old_dirname = PATH.dirname(old_path);
        var new_dirname = PATH.dirname(new_path);
        var old_name = PATH.basename(old_path);
        var new_name = PATH.basename(new_path);
        // parents must exist
        var lookup, old_dir, new_dir;
        try {
          lookup = FS.lookupPath(old_path, { parent: true });
          old_dir = lookup.node;
          lookup = FS.lookupPath(new_path, { parent: true });
          new_dir = lookup.node;
        } catch (e) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        if (!old_dir || !new_dir) throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        // need to be part of the same mount
        if (old_dir.mount !== new_dir.mount) {
          throw new FS.ErrnoError(ERRNO_CODES.EXDEV);
        }
        // source must exist
        var old_node = FS.lookupNode(old_dir, old_name);
        // old path should not be an ancestor of the new path
        var relative = PATH.relative(old_path, new_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        // new path should not be an ancestor of the old path
        relative = PATH.relative(new_path, old_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
        }
        // see if the new path already exists
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name);
        } catch (e) {
          // not fatal
        }
        // early out if nothing needs to change
        if (old_node === new_node) {
          return;
        }
        // we'll need to delete the old entry
        var isdir = FS.isDir(old_node.mode);
        var err = FS.mayDelete(old_dir, old_name, isdir);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        // need delete permissions if we'll be overwriting.
        // need create permissions if new doesn't already exist.
        err = new_node ?
          FS.mayDelete(new_dir, new_name, isdir) :
          FS.mayCreate(new_dir, new_name);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!old_dir.node_ops.rename) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(old_node) || (new_node && FS.isMountpoint(new_node))) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        // if we are going to change the parent, check write permissions
        if (new_dir !== old_dir) {
          err = FS.nodePermissions(old_dir, 'w');
          if (err) {
            throw new FS.ErrnoError(err);
          }
        }
        try {
          if (FS.trackingDelegate['willMovePath']) {
            FS.trackingDelegate['willMovePath'](old_path, new_path);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['willMovePath']('"+old_path+"', '"+new_path+"') threw an exception: " + e.message);
        }
        // remove the node from the lookup hash
        FS.hashRemoveNode(old_node);
        // do the underlying fs rename
        try {
          old_dir.node_ops.rename(old_node, new_dir, new_name);
        } catch (e) {
          throw e;
        } finally {
          // add the node back to the hash (in case node_ops.rename
          // changed its name)
          FS.hashAddNode(old_node);
        }
        try {
          if (FS.trackingDelegate['onMovePath']) FS.trackingDelegate['onMovePath'](old_path, new_path);
        } catch(e) {
          console.log("FS.trackingDelegate['onMovePath']('"+old_path+"', '"+new_path+"') threw an exception: " + e.message);
        }
      },rmdir:function (path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, true);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.rmdir) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        try {
          if (FS.trackingDelegate['willDeletePath']) {
            FS.trackingDelegate['willDeletePath'](path);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['willDeletePath']('"+path+"') threw an exception: " + e.message);
        }
        parent.node_ops.rmdir(parent, name);
        FS.destroyNode(node);
        try {
          if (FS.trackingDelegate['onDeletePath']) FS.trackingDelegate['onDeletePath'](path);
        } catch(e) {
          console.log("FS.trackingDelegate['onDeletePath']('"+path+"') threw an exception: " + e.message);
        }
      },readdir:function (path) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        if (!node.node_ops.readdir) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        return node.node_ops.readdir(node);
      },unlink:function (path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, false);
        if (err) {
          // POSIX says unlink should set EPERM, not EISDIR
          if (err === ERRNO_CODES.EISDIR) err = ERRNO_CODES.EPERM;
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.unlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        try {
          if (FS.trackingDelegate['willDeletePath']) {
            FS.trackingDelegate['willDeletePath'](path);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['willDeletePath']('"+path+"') threw an exception: " + e.message);
        }
        parent.node_ops.unlink(parent, name);
        FS.destroyNode(node);
        try {
          if (FS.trackingDelegate['onDeletePath']) FS.trackingDelegate['onDeletePath'](path);
        } catch(e) {
          console.log("FS.trackingDelegate['onDeletePath']('"+path+"') threw an exception: " + e.message);
        }
      },readlink:function (path) {
        var lookup = FS.lookupPath(path);
        var link = lookup.node;
        if (!link) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        if (!link.node_ops.readlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        return PATH.resolve(FS.getPath(link.parent), link.node_ops.readlink(link));
      },stat:function (path, dontFollow) {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        var node = lookup.node;
        if (!node) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        if (!node.node_ops.getattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return node.node_ops.getattr(node);
      },lstat:function (path) {
        return FS.stat(path, true);
      },chmod:function (path, mode, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        node.node_ops.setattr(node, {
          mode: (mode & 4095) | (node.mode & ~4095),
          timestamp: Date.now()
        });
      },lchmod:function (path, mode) {
        FS.chmod(path, mode, true);
      },fchmod:function (fd, mode) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        FS.chmod(stream.node, mode);
      },chown:function (path, uid, gid, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        node.node_ops.setattr(node, {
          timestamp: Date.now()
          // we ignore the uid / gid for now
        });
      },lchown:function (path, uid, gid) {
        FS.chown(path, uid, gid, true);
      },fchown:function (fd, uid, gid) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        FS.chown(stream.node, uid, gid);
      },truncate:function (path, len) {
        if (len < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: true });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!FS.isFile(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var err = FS.nodePermissions(node, 'w');
        if (err) {
          throw new FS.ErrnoError(err);
        }
        node.node_ops.setattr(node, {
          size: len,
          timestamp: Date.now()
        });
      },ftruncate:function (fd, len) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        FS.truncate(stream.node, len);
      },utime:function (path, atime, mtime) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        node.node_ops.setattr(node, {
          timestamp: Math.max(atime, mtime)
        });
      },open:function (path, flags, mode, fd_start, fd_end) {
        if (path === "") {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        flags = typeof flags === 'string' ? FS.modeStringToFlags(flags) : flags;
        mode = typeof mode === 'undefined' ? 438 /* 0666 */ : mode;
        if ((flags & 64)) {
          mode = (mode & 4095) | 32768;
        } else {
          mode = 0;
        }
        var node;
        if (typeof path === 'object') {
          node = path;
        } else {
          path = PATH.normalize(path);
          try {
            var lookup = FS.lookupPath(path, {
              follow: !(flags & 131072)
            });
            node = lookup.node;
          } catch (e) {
            // ignore
          }
        }
        // perhaps we need to create the node
        var created = false;
        if ((flags & 64)) {
          if (node) {
            // if O_CREAT and O_EXCL are set, error out if the node already exists
            if ((flags & 128)) {
              throw new FS.ErrnoError(ERRNO_CODES.EEXIST);
            }
          } else {
            // node doesn't exist, try to create it
            node = FS.mknod(path, mode, 0);
            created = true;
          }
        }
        if (!node) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        // can't truncate a device
        if (FS.isChrdev(node.mode)) {
          flags &= ~512;
        }
        // if asked only for a directory, then this must be one
        if ((flags & 65536) && !FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        // check permissions, if this is not a file we just created now (it is ok to
        // create and write to a file with read-only permissions; it is read-only
        // for later use)
        if (!created) {
          var err = FS.mayOpen(node, flags);
          if (err) {
            throw new FS.ErrnoError(err);
          }
        }
        // do truncation if necessary
        if ((flags & 512)) {
          FS.truncate(node, 0);
        }
        // we've already handled these, don't pass down to the underlying vfs
        flags &= ~(128 | 512);
  
        // register the stream with the filesystem
        var stream = FS.createStream({
          node: node,
          path: FS.getPath(node),  // we want the absolute path to the node
          flags: flags,
          seekable: true,
          position: 0,
          stream_ops: node.stream_ops,
          // used by the file family libc calls (fopen, fwrite, ferror, etc.)
          ungotten: [],
          error: false
        }, fd_start, fd_end);
        // call the new stream's open function
        if (stream.stream_ops.open) {
          stream.stream_ops.open(stream);
        }
        if (Module['logReadFiles'] && !(flags & 1)) {
          if (!FS.readFiles) FS.readFiles = {};
          if (!(path in FS.readFiles)) {
            FS.readFiles[path] = 1;
            Module['printErr']('read file: ' + path);
          }
        }
        try {
          if (FS.trackingDelegate['onOpenFile']) {
            var trackingFlags = 0;
            if ((flags & 2097155) !== 1) {
              trackingFlags |= FS.tracking.openFlags.READ;
            }
            if ((flags & 2097155) !== 0) {
              trackingFlags |= FS.tracking.openFlags.WRITE;
            }
            FS.trackingDelegate['onOpenFile'](path, trackingFlags);
          }
        } catch(e) {
          console.log("FS.trackingDelegate['onOpenFile']('"+path+"', flags) threw an exception: " + e.message);
        }
        return stream;
      },close:function (stream) {
        if (stream.getdents) stream.getdents = null; // free readdir state
        try {
          if (stream.stream_ops.close) {
            stream.stream_ops.close(stream);
          }
        } catch (e) {
          throw e;
        } finally {
          FS.closeStream(stream.fd);
        }
      },llseek:function (stream, offset, whence) {
        if (!stream.seekable || !stream.stream_ops.llseek) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        stream.position = stream.stream_ops.llseek(stream, offset, whence);
        stream.ungotten = [];
        return stream.position;
      },read:function (stream, buffer, offset, length, position) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!stream.stream_ops.read) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var seeking = true;
        if (typeof position === 'undefined') {
          position = stream.position;
          seeking = false;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
        if (!seeking) stream.position += bytesRead;
        return bytesRead;
      },write:function (stream, buffer, offset, length, position, canOwn) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!stream.stream_ops.write) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if (stream.flags & 1024) {
          // seek to the end before writing in append mode
          FS.llseek(stream, 0, 2);
        }
        var seeking = true;
        if (typeof position === 'undefined') {
          position = stream.position;
          seeking = false;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
        if (!seeking) stream.position += bytesWritten;
        try {
          if (stream.path && FS.trackingDelegate['onWriteToFile']) FS.trackingDelegate['onWriteToFile'](stream.path);
        } catch(e) {
          console.log("FS.trackingDelegate['onWriteToFile']('"+path+"') threw an exception: " + e.message);
        }
        return bytesWritten;
      },allocate:function (stream, offset, length) {
        if (offset < 0 || length <= 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (!FS.isFile(stream.node.mode) && !FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
        }
        if (!stream.stream_ops.allocate) {
          throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
        }
        stream.stream_ops.allocate(stream, offset, length);
      },mmap:function (stream, buffer, offset, length, position, prot, flags) {
        // TODO if PROT is PROT_WRITE, make sure we have write access
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(ERRNO_CODES.EACCES);
        }
        if (!stream.stream_ops.mmap) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
        }
        return stream.stream_ops.mmap(stream, buffer, offset, length, position, prot, flags);
      },msync:function (stream, buffer, offset, length, mmapFlags) {
        if (!stream || !stream.stream_ops.msync) {
          return 0;
        }
        return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags);
      },munmap:function (stream) {
        return 0;
      },ioctl:function (stream, cmd, arg) {
        if (!stream.stream_ops.ioctl) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTTY);
        }
        return stream.stream_ops.ioctl(stream, cmd, arg);
      },readFile:function (path, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'r';
        opts.encoding = opts.encoding || 'binary';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        var ret;
        var stream = FS.open(path, opts.flags);
        var stat = FS.stat(path);
        var length = stat.size;
        var buf = new Uint8Array(length);
        FS.read(stream, buf, 0, length, 0);
        if (opts.encoding === 'utf8') {
          ret = UTF8ArrayToString(buf, 0);
        } else if (opts.encoding === 'binary') {
          ret = buf;
        }
        FS.close(stream);
        return ret;
      },writeFile:function (path, data, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'w';
        opts.encoding = opts.encoding || 'utf8';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        var stream = FS.open(path, opts.flags, opts.mode);
        if (opts.encoding === 'utf8') {
          var buf = new Uint8Array(lengthBytesUTF8(data)+1);
          var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
          FS.write(stream, buf, 0, actualNumBytes, 0, opts.canOwn);
        } else if (opts.encoding === 'binary') {
          FS.write(stream, data, 0, data.length, 0, opts.canOwn);
        }
        FS.close(stream);
      },cwd:function () {
        return FS.currentPath;
      },chdir:function (path) {
        var lookup = FS.lookupPath(path, { follow: true });
        if (!FS.isDir(lookup.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        var err = FS.nodePermissions(lookup.node, 'x');
        if (err) {
          throw new FS.ErrnoError(err);
        }
        FS.currentPath = lookup.path;
      },createDefaultDirectories:function () {
        FS.mkdir('/tmp');
        FS.mkdir('/home');
        FS.mkdir('/home/web_user');
      },createDefaultDevices:function () {
        // create /dev
        FS.mkdir('/dev');
        // setup /dev/null
        FS.registerDevice(FS.makedev(1, 3), {
          read: function() { return 0; },
          write: function(stream, buffer, offset, length, pos) { return length; }
        });
        FS.mkdev('/dev/null', FS.makedev(1, 3));
        // setup /dev/tty and /dev/tty1
        // stderr needs to print output using Module['printErr']
        // so we register a second tty just for it.
        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
        FS.mkdev('/dev/tty', FS.makedev(5, 0));
        FS.mkdev('/dev/tty1', FS.makedev(6, 0));
        // setup /dev/[u]random
        var random_device;
        if (typeof crypto !== 'undefined') {
          // for modern web browsers
          var randomBuffer = new Uint8Array(1);
          random_device = function() { crypto.getRandomValues(randomBuffer); return randomBuffer[0]; };
        } else if (ENVIRONMENT_IS_NODE) {
          // for nodejs
          random_device = function() { return require('crypto').randomBytes(1)[0]; };
        } else {
          // default for ES5 platforms
          random_device = function() { return (Math.random()*256)|0; };
        }
        FS.createDevice('/dev', 'random', random_device);
        FS.createDevice('/dev', 'urandom', random_device);
        // we're not going to emulate the actual shm device,
        // just create the tmp dirs that reside in it commonly
        FS.mkdir('/dev/shm');
        FS.mkdir('/dev/shm/tmp');
      },createSpecialDirectories:function () {
        // create /proc/self/fd which allows /proc/self/fd/6 => readlink gives the name of the stream for fd 6 (see test_unistd_ttyname)
        FS.mkdir('/proc');
        FS.mkdir('/proc/self');
        FS.mkdir('/proc/self/fd');
        FS.mount({
          mount: function() {
            var node = FS.createNode('/proc/self', 'fd', 16384 | 0777, 73);
            node.node_ops = {
              lookup: function(parent, name) {
                var fd = +name;
                var stream = FS.getStream(fd);
                if (!stream) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
                var ret = {
                  parent: null,
                  mount: { mountpoint: 'fake' },
                  node_ops: { readlink: function() { return stream.path } }
                };
                ret.parent = ret; // make it look like a simple root node
                return ret;
              }
            };
            return node;
          }
        }, {}, '/proc/self/fd');
      },createStandardStreams:function () {
        // TODO deprecate the old functionality of a single
        // input / output callback and that utilizes FS.createDevice
        // and instead require a unique set of stream ops
  
        // by default, we symlink the standard streams to the
        // default tty devices. however, if the standard streams
        // have been overwritten we create a unique device for
        // them instead.
        if (Module['stdin']) {
          FS.createDevice('/dev', 'stdin', Module['stdin']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdin');
        }
        if (Module['stdout']) {
          FS.createDevice('/dev', 'stdout', null, Module['stdout']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdout');
        }
        if (Module['stderr']) {
          FS.createDevice('/dev', 'stderr', null, Module['stderr']);
        } else {
          FS.symlink('/dev/tty1', '/dev/stderr');
        }
  
        // open default streams for the stdin, stdout and stderr devices
        var stdin = FS.open('/dev/stdin', 'r');
        assert(stdin.fd === 0, 'invalid handle for stdin (' + stdin.fd + ')');
  
        var stdout = FS.open('/dev/stdout', 'w');
        assert(stdout.fd === 1, 'invalid handle for stdout (' + stdout.fd + ')');
  
        var stderr = FS.open('/dev/stderr', 'w');
        assert(stderr.fd === 2, 'invalid handle for stderr (' + stderr.fd + ')');
      },ensureErrnoError:function () {
        if (FS.ErrnoError) return;
        FS.ErrnoError = function ErrnoError(errno, node) {
          //Module.printErr(stackTrace()); // useful for debugging
          this.node = node;
          this.setErrno = function(errno) {
            this.errno = errno;
            for (var key in ERRNO_CODES) {
              if (ERRNO_CODES[key] === errno) {
                this.code = key;
                break;
              }
            }
          };
          this.setErrno(errno);
          this.message = ERRNO_MESSAGES[errno];
        };
        FS.ErrnoError.prototype = new Error();
        FS.ErrnoError.prototype.constructor = FS.ErrnoError;
        // Some errors may happen quite a bit, to avoid overhead we reuse them (and suffer a lack of stack info)
        [ERRNO_CODES.ENOENT].forEach(function(code) {
          FS.genericErrors[code] = new FS.ErrnoError(code);
          FS.genericErrors[code].stack = '<generic error, no stack>';
        });
      },staticInit:function () {
        FS.ensureErrnoError();
  
        FS.nameTable = new Array(4096);
  
        FS.mount(MEMFS, {}, '/');
  
        FS.createDefaultDirectories();
        FS.createDefaultDevices();
        FS.createSpecialDirectories();
  
        FS.filesystems = {
          'MEMFS': MEMFS,
          'IDBFS': IDBFS,
          'NODEFS': NODEFS,
          'WORKERFS': WORKERFS,
        };
      },init:function (input, output, error) {
        assert(!FS.init.initialized, 'FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)');
        FS.init.initialized = true;
  
        FS.ensureErrnoError();
  
        // Allow Module.stdin etc. to provide defaults, if none explicitly passed to us here
        Module['stdin'] = input || Module['stdin'];
        Module['stdout'] = output || Module['stdout'];
        Module['stderr'] = error || Module['stderr'];
  
        FS.createStandardStreams();
      },quit:function () {
        FS.init.initialized = false;
        // force-flush all streams, so we get musl std streams printed out
        var fflush = Module['_fflush'];
        if (fflush) fflush(0);
        // close all of our streams
        for (var i = 0; i < FS.streams.length; i++) {
          var stream = FS.streams[i];
          if (!stream) {
            continue;
          }
          FS.close(stream);
        }
      },getMode:function (canRead, canWrite) {
        var mode = 0;
        if (canRead) mode |= 292 | 73;
        if (canWrite) mode |= 146;
        return mode;
      },joinPath:function (parts, forceRelative) {
        var path = PATH.join.apply(null, parts);
        if (forceRelative && path[0] == '/') path = path.substr(1);
        return path;
      },absolutePath:function (relative, base) {
        return PATH.resolve(base, relative);
      },standardizePath:function (path) {
        return PATH.normalize(path);
      },findObject:function (path, dontResolveLastLink) {
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (ret.exists) {
          return ret.object;
        } else {
          ___setErrNo(ret.error);
          return null;
        }
      },analyzePath:function (path, dontResolveLastLink) {
        // operate from within the context of the symlink's target
        try {
          var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          path = lookup.path;
        } catch (e) {
        }
        var ret = {
          isRoot: false, exists: false, error: 0, name: null, path: null, object: null,
          parentExists: false, parentPath: null, parentObject: null
        };
        try {
          var lookup = FS.lookupPath(path, { parent: true });
          ret.parentExists = true;
          ret.parentPath = lookup.path;
          ret.parentObject = lookup.node;
          ret.name = PATH.basename(path);
          lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          ret.exists = true;
          ret.path = lookup.path;
          ret.object = lookup.node;
          ret.name = lookup.node.name;
          ret.isRoot = lookup.path === '/';
        } catch (e) {
          ret.error = e.errno;
        };
        return ret;
      },createFolder:function (parent, name, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.mkdir(path, mode);
      },createPath:function (parent, path, canRead, canWrite) {
        parent = typeof parent === 'string' ? parent : FS.getPath(parent);
        var parts = path.split('/').reverse();
        while (parts.length) {
          var part = parts.pop();
          if (!part) continue;
          var current = PATH.join2(parent, part);
          try {
            FS.mkdir(current);
          } catch (e) {
            // ignore EEXIST
          }
          parent = current;
        }
        return current;
      },createFile:function (parent, name, properties, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.create(path, mode);
      },createDataFile:function (parent, name, data, canRead, canWrite, canOwn) {
        var path = name ? PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name) : parent;
        var mode = FS.getMode(canRead, canWrite);
        var node = FS.create(path, mode);
        if (data) {
          if (typeof data === 'string') {
            var arr = new Array(data.length);
            for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
            data = arr;
          }
          // make sure we can write to the file
          FS.chmod(node, mode | 146);
          var stream = FS.open(node, 'w');
          FS.write(stream, data, 0, data.length, 0, canOwn);
          FS.close(stream);
          FS.chmod(node, mode);
        }
        return node;
      },createDevice:function (parent, name, input, output) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(!!input, !!output);
        if (!FS.createDevice.major) FS.createDevice.major = 64;
        var dev = FS.makedev(FS.createDevice.major++, 0);
        // Create a fake device that a set of stream ops to emulate
        // the old behavior.
        FS.registerDevice(dev, {
          open: function(stream) {
            stream.seekable = false;
          },
          close: function(stream) {
            // flush any pending line data
            if (output && output.buffer && output.buffer.length) {
              output(10);
            }
          },
          read: function(stream, buffer, offset, length, pos /* ignored */) {
            var bytesRead = 0;
            for (var i = 0; i < length; i++) {
              var result;
              try {
                result = input();
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
              }
              if (result === undefined && bytesRead === 0) {
                throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
              }
              if (result === null || result === undefined) break;
              bytesRead++;
              buffer[offset+i] = result;
            }
            if (bytesRead) {
              stream.node.timestamp = Date.now();
            }
            return bytesRead;
          },
          write: function(stream, buffer, offset, length, pos) {
            for (var i = 0; i < length; i++) {
              try {
                output(buffer[offset+i]);
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
              }
            }
            if (length) {
              stream.node.timestamp = Date.now();
            }
            return i;
          }
        });
        return FS.mkdev(path, mode, dev);
      },createLink:function (parent, name, target, canRead, canWrite) {
        var path = PATH.join2(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        return FS.symlink(target, path);
      },forceLoadFile:function (obj) {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
        var success = true;
        if (typeof XMLHttpRequest !== 'undefined') {
          throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
        } else if (Module['read']) {
          // Command-line.
          try {
            // WARNING: Can't read binary files in V8's d8 or tracemonkey's js, as
            //          read() will try to parse UTF8.
            obj.contents = intArrayFromString(Module['read'](obj.url), true);
            obj.usedBytes = obj.contents.length;
          } catch (e) {
            success = false;
          }
        } else {
          throw new Error('Cannot load without read() or XMLHttpRequest.');
        }
        if (!success) ___setErrNo(ERRNO_CODES.EIO);
        return success;
      },createLazyFile:function (parent, name, url, canRead, canWrite) {
        // Lazy chunked Uint8Array (implements get and length from Uint8Array). Actual getting is abstracted away for eventual reuse.
        function LazyUint8Array() {
          this.lengthKnown = false;
          this.chunks = []; // Loaded chunks. Index is the chunk number
        }
        LazyUint8Array.prototype.get = function LazyUint8Array_get(idx) {
          if (idx > this.length-1 || idx < 0) {
            return undefined;
          }
          var chunkOffset = idx % this.chunkSize;
          var chunkNum = (idx / this.chunkSize)|0;
          return this.getter(chunkNum)[chunkOffset];
        }
        LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
          this.getter = getter;
        }
        LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
          // Find length
          var xhr = new XMLHttpRequest();
          xhr.open('HEAD', url, false);
          xhr.send(null);
          if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
          var datalength = Number(xhr.getResponseHeader("Content-length"));
          var header;
          var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
          var usesGzip = (header = xhr.getResponseHeader("Content-Encoding")) && header === "gzip";
  
          var chunkSize = 1024*1024; // Chunk size in bytes
  
          if (!hasByteServing) chunkSize = datalength;
  
          // Function to get a range from the remote URL.
          var doXHR = (function(from, to) {
            if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
            if (to > datalength-1) throw new Error("only " + datalength + " bytes available! programmer error!");
  
            // TODO: Use mozResponseArrayBuffer, responseStream, etc. if available.
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, false);
            if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
  
            // Some hints to the browser that we want binary data.
            if (typeof Uint8Array != 'undefined') xhr.responseType = 'arraybuffer';
            if (xhr.overrideMimeType) {
              xhr.overrideMimeType('text/plain; charset=x-user-defined');
            }
  
            xhr.send(null);
            if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
            if (xhr.response !== undefined) {
              return new Uint8Array(xhr.response || []);
            } else {
              return intArrayFromString(xhr.responseText || '', true);
            }
          });
          var lazyArray = this;
          lazyArray.setDataGetter(function(chunkNum) {
            var start = chunkNum * chunkSize;
            var end = (chunkNum+1) * chunkSize - 1; // including this byte
            end = Math.min(end, datalength-1); // if datalength-1 is selected, this is the last block
            if (typeof(lazyArray.chunks[chunkNum]) === "undefined") {
              lazyArray.chunks[chunkNum] = doXHR(start, end);
            }
            if (typeof(lazyArray.chunks[chunkNum]) === "undefined") throw new Error("doXHR failed!");
            return lazyArray.chunks[chunkNum];
          });
  
          if (usesGzip || !datalength) {
            // if the server uses gzip or doesn't supply the length, we have to download the whole file to get the (uncompressed) length
            chunkSize = datalength = 1; // this will force getter(0)/doXHR do download the whole file
            datalength = this.getter(0).length;
            chunkSize = datalength;
            console.log("LazyFiles on gzip forces download of the whole file when length is accessed");
          }
  
          this._length = datalength;
          this._chunkSize = chunkSize;
          this.lengthKnown = true;
        }
        if (typeof XMLHttpRequest !== 'undefined') {
          if (!ENVIRONMENT_IS_WORKER) throw 'Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc';
          var lazyArray = new LazyUint8Array();
          Object.defineProperties(lazyArray, {
            length: {
              get: function() {
                if(!this.lengthKnown) {
                  this.cacheLength();
                }
                return this._length;
              }
            },
            chunkSize: {
              get: function() {
                if(!this.lengthKnown) {
                  this.cacheLength();
                }
                return this._chunkSize;
              }
            }
          });
  
          var properties = { isDevice: false, contents: lazyArray };
        } else {
          var properties = { isDevice: false, url: url };
        }
  
        var node = FS.createFile(parent, name, properties, canRead, canWrite);
        // This is a total hack, but I want to get this lazy file code out of the
        // core of MEMFS. If we want to keep this lazy file concept I feel it should
        // be its own thin LAZYFS proxying calls to MEMFS.
        if (properties.contents) {
          node.contents = properties.contents;
        } else if (properties.url) {
          node.contents = null;
          node.url = properties.url;
        }
        // Add a function that defers querying the file size until it is asked the first time.
        Object.defineProperties(node, {
          usedBytes: {
            get: function() { return this.contents.length; }
          }
        });
        // override each stream op with one that tries to force load the lazy file first
        var stream_ops = {};
        var keys = Object.keys(node.stream_ops);
        keys.forEach(function(key) {
          var fn = node.stream_ops[key];
          stream_ops[key] = function forceLoadLazyFile() {
            if (!FS.forceLoadFile(node)) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
            return fn.apply(null, arguments);
          };
        });
        // use a custom read function
        stream_ops.read = function stream_ops_read(stream, buffer, offset, length, position) {
          if (!FS.forceLoadFile(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EIO);
          }
          var contents = stream.node.contents;
          if (position >= contents.length)
            return 0;
          var size = Math.min(contents.length - position, length);
          assert(size >= 0);
          if (contents.slice) { // normal array
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i];
            }
          } else {
            for (var i = 0; i < size; i++) { // LazyUint8Array from sync binary XHR
              buffer[offset + i] = contents.get(position + i);
            }
          }
          return size;
        };
        node.stream_ops = stream_ops;
        return node;
      },createPreloadedFile:function (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) {
        Browser.init();
        // TODO we should allow people to just pass in a complete filename instead
        // of parent and name being that we just join them anyways
        var fullname = name ? PATH.resolve(PATH.join2(parent, name)) : parent;
        var dep = getUniqueRunDependency('cp ' + fullname); // might have several active requests for the same fullname
        function processData(byteArray) {
          function finish(byteArray) {
            if (preFinish) preFinish();
            if (!dontCreateFile) {
              FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
            }
            if (onload) onload();
            removeRunDependency(dep);
          }
          var handled = false;
          Module['preloadPlugins'].forEach(function(plugin) {
            if (handled) return;
            if (plugin['canHandle'](fullname)) {
              plugin['handle'](byteArray, fullname, finish, function() {
                if (onerror) onerror();
                removeRunDependency(dep);
              });
              handled = true;
            }
          });
          if (!handled) finish(byteArray);
        }
        addRunDependency(dep);
        if (typeof url == 'string') {
          Browser.asyncLoad(url, function(byteArray) {
            processData(byteArray);
          }, onerror);
        } else {
          processData(url);
        }
      },indexedDB:function () {
        return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
      },DB_NAME:function () {
        return 'EM_FS_' + window.location.pathname;
      },DB_VERSION:20,DB_STORE_NAME:"FILE_DATA",saveFilesToDB:function (paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = function openRequest_onupgradeneeded() {
          console.log('creating db');
          var db = openRequest.result;
          db.createObjectStore(FS.DB_STORE_NAME);
        };
        openRequest.onsuccess = function openRequest_onsuccess() {
          var db = openRequest.result;
          var transaction = db.transaction([FS.DB_STORE_NAME], 'readwrite');
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var putRequest = files.put(FS.analyzePath(path).object.contents, path);
            putRequest.onsuccess = function putRequest_onsuccess() { ok++; if (ok + fail == total) finish() };
            putRequest.onerror = function putRequest_onerror() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      },loadFilesFromDB:function (paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = onerror; // no database to load from
        openRequest.onsuccess = function openRequest_onsuccess() {
          var db = openRequest.result;
          try {
            var transaction = db.transaction([FS.DB_STORE_NAME], 'readonly');
          } catch(e) {
            onerror(e);
            return;
          }
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var getRequest = files.get(path);
            getRequest.onsuccess = function getRequest_onsuccess() {
              if (FS.analyzePath(path).exists) {
                FS.unlink(path);
              }
              FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
              ok++;
              if (ok + fail == total) finish();
            };
            getRequest.onerror = function getRequest_onerror() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      }};var SYSCALLS={DEFAULT_POLLMASK:5,mappings:{},umask:511,calculateAt:function (dirfd, path) {
        if (path[0] !== '/') {
          // relative path
          var dir;
          if (dirfd === -100) {
            dir = FS.cwd();
          } else {
            var dirstream = FS.getStream(dirfd);
            if (!dirstream) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
            dir = dirstream.path;
          }
          path = PATH.join2(dir, path);
        }
        return path;
      },doStat:function (func, path, buf) {
        try {
          var stat = func(path);
        } catch (e) {
          if (e && e.node && PATH.normalize(path) !== PATH.normalize(FS.getPath(e.node))) {
            // an error occurred while trying to look up the path; we should just report ENOTDIR
            return -ERRNO_CODES.ENOTDIR;
          }
          throw e;
        }
        HEAP32[((buf)>>2)]=stat.dev;
        HEAP32[(((buf)+(4))>>2)]=0;
        HEAP32[(((buf)+(8))>>2)]=stat.ino;
        HEAP32[(((buf)+(12))>>2)]=stat.mode;
        HEAP32[(((buf)+(16))>>2)]=stat.nlink;
        HEAP32[(((buf)+(20))>>2)]=stat.uid;
        HEAP32[(((buf)+(24))>>2)]=stat.gid;
        HEAP32[(((buf)+(28))>>2)]=stat.rdev;
        HEAP32[(((buf)+(32))>>2)]=0;
        HEAP32[(((buf)+(36))>>2)]=stat.size;
        HEAP32[(((buf)+(40))>>2)]=4096;
        HEAP32[(((buf)+(44))>>2)]=stat.blocks;
        HEAP32[(((buf)+(48))>>2)]=(stat.atime.getTime() / 1000)|0;
        HEAP32[(((buf)+(52))>>2)]=0;
        HEAP32[(((buf)+(56))>>2)]=(stat.mtime.getTime() / 1000)|0;
        HEAP32[(((buf)+(60))>>2)]=0;
        HEAP32[(((buf)+(64))>>2)]=(stat.ctime.getTime() / 1000)|0;
        HEAP32[(((buf)+(68))>>2)]=0;
        HEAP32[(((buf)+(72))>>2)]=stat.ino;
        return 0;
      },doMsync:function (addr, stream, len, flags) {
        var buffer = new Uint8Array(HEAPU8.subarray(addr, addr + len));
        FS.msync(stream, buffer, 0, len, flags);
      },doMkdir:function (path, mode) {
        // remove a trailing slash, if one - /a/b/ has basename of '', but
        // we want to create b in the context of this function
        path = PATH.normalize(path);
        if (path[path.length-1] === '/') path = path.substr(0, path.length-1);
        FS.mkdir(path, mode, 0);
        return 0;
      },doMknod:function (path, mode, dev) {
        // we don't want this in the JS API as it uses mknod to create all nodes.
        switch (mode & 61440) {
          case 32768:
          case 8192:
          case 24576:
          case 4096:
          case 49152:
            break;
          default: return -ERRNO_CODES.EINVAL;
        }
        FS.mknod(path, mode, dev);
        return 0;
      },doReadlink:function (path, buf, bufsize) {
        if (bufsize <= 0) return -ERRNO_CODES.EINVAL;
        var ret = FS.readlink(path);
        ret = ret.slice(0, Math.max(0, bufsize));
        writeStringToMemory(ret, buf, true);
        return ret.length;
      },doAccess:function (path, amode) {
        if (amode & ~7) {
          // need a valid mode
          return -ERRNO_CODES.EINVAL;
        }
        var node;
        var lookup = FS.lookupPath(path, { follow: true });
        node = lookup.node;
        var perms = '';
        if (amode & 4) perms += 'r';
        if (amode & 2) perms += 'w';
        if (amode & 1) perms += 'x';
        if (perms /* otherwise, they've just passed F_OK */ && FS.nodePermissions(node, perms)) {
          return -ERRNO_CODES.EACCES;
        }
        return 0;
      },doDup:function (path, flags, suggestFD) {
        var suggest = FS.getStream(suggestFD);
        if (suggest) FS.close(suggest);
        return FS.open(path, flags, 0, suggestFD, suggestFD).fd;
      },doReadv:function (stream, iov, iovcnt, offset) {
        var ret = 0;
        for (var i = 0; i < iovcnt; i++) {
          var ptr = HEAP32[(((iov)+(i*8))>>2)];
          var len = HEAP32[(((iov)+(i*8 + 4))>>2)];
          var curr = FS.read(stream, HEAP8,ptr, len, offset);
          if (curr < 0) return -1;
          ret += curr;
          if (curr < len) break; // nothing more to read
        }
        return ret;
      },doWritev:function (stream, iov, iovcnt, offset) {
        var ret = 0;
        for (var i = 0; i < iovcnt; i++) {
          var ptr = HEAP32[(((iov)+(i*8))>>2)];
          var len = HEAP32[(((iov)+(i*8 + 4))>>2)];
          var curr = FS.write(stream, HEAP8,ptr, len, offset);
          if (curr < 0) return -1;
          ret += curr;
        }
        return ret;
      },varargs:0,get:function (varargs) {
        SYSCALLS.varargs += 4;
        var ret = HEAP32[(((SYSCALLS.varargs)-(4))>>2)];
        return ret;
      },getStr:function () {
        var ret = Pointer_stringify(SYSCALLS.get());
        return ret;
      },getStreamFromFD:function () {
        var stream = FS.getStream(SYSCALLS.get());
        if (!stream) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        return stream;
      },getSocketFromFD:function () {
        var socket = SOCKFS.getSocket(SYSCALLS.get());
        if (!socket) throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        return socket;
      },getSocketAddress:function (allowNull) {
        var addrp = SYSCALLS.get(), addrlen = SYSCALLS.get();
        if (allowNull && addrp === 0) return null;
        var info = __read_sockaddr(addrp, addrlen);
        if (info.errno) throw new FS.ErrnoError(info.errno);
        info.addr = DNS.lookup_addr(info.addr) || info.addr;
        return info;
      },get64:function () {
        var low = SYSCALLS.get(), high = SYSCALLS.get();
        if (low >= 0) assert(high === 0);
        else assert(high === -1);
        return low;
      },getZero:function () {
        assert(SYSCALLS.get() === 0);
      }};function ___syscall54(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // ioctl
      var stream = SYSCALLS.getStreamFromFD(), op = SYSCALLS.get();
      switch (op) {
        case 21505: {
          if (!stream.tty) return -ERRNO_CODES.ENOTTY;
          return 0;
        }
        case 21506: {
          if (!stream.tty) return -ERRNO_CODES.ENOTTY;
          return 0; // no-op, not actually adjusting terminal settings
        }
        case 21519: {
          if (!stream.tty) return -ERRNO_CODES.ENOTTY;
          var argp = SYSCALLS.get();
          HEAP32[((argp)>>2)]=0;
          return 0;
        }
        case 21520: {
          if (!stream.tty) return -ERRNO_CODES.ENOTTY;
          return -ERRNO_CODES.EINVAL; // not supported
        }
        case 21531: {
          var argp = SYSCALLS.get();
          return FS.ioctl(stream, op, argp);
        }
        default: abort('bad ioctl syscall ' + op);
      }
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function _glDeleteTextures(n, textures) {
      for (var i = 0; i < n; i++) {
        var id = HEAP32[(((textures)+(i*4))>>2)];
        var texture = GL.textures[id];
        if (!texture) continue; // GL spec: "glDeleteTextures silently ignores 0s and names that do not correspond to existing textures".
        GLctx.deleteTexture(texture);
        texture.name = 0;
        GL.textures[id] = null;
      }
    }

  function _glStencilOpSeparate(x0, x1, x2, x3) { GLctx.stencilOpSeparate(x0, x1, x2, x3) }

  function _glBufferData(target, size, data, usage) {
      switch (usage) { // fix usages, WebGL only has *_DRAW
        case 0x88E1: // GL_STREAM_READ
        case 0x88E2: // GL_STREAM_COPY
          usage = 0x88E0; // GL_STREAM_DRAW
          break;
        case 0x88E5: // GL_STATIC_READ
        case 0x88E6: // GL_STATIC_COPY
          usage = 0x88E4; // GL_STATIC_DRAW
          break;
        case 0x88E9: // GL_DYNAMIC_READ
        case 0x88EA: // GL_DYNAMIC_COPY
          usage = 0x88E8; // GL_DYNAMIC_DRAW
          break;
      }
      if (!data) {
        GLctx.bufferData(target, size, usage);
      } else {
        GLctx.bufferData(target, HEAPU8.subarray(data, data+size), usage);
      }
    }

  function _glfwCreateWindow(width, height, title, monitor, share) {
      return GLFW.createWindow(width, height, title, monitor, share);
    }

  var _BDtoIHigh=true;

  function _pthread_cleanup_push(routine, arg) {
      __ATEXIT__.push(function() { Runtime.dynCall('vi', routine, [arg]) })
      _pthread_cleanup_push.level = __ATEXIT__.length;
    }

  function _glGetError() {
      // First return any GL error generated by the emscripten library_gl.js interop layer.
      if (GL.lastError) {
        var error = GL.lastError;
        GL.lastError = 0/*GL_NO_ERROR*/;
        return error;
      } else { // If there were none, return the GL error from the browser GL context.
        return GLctx.getError();
      }
    }

  function _pthread_cleanup_pop() {
      assert(_pthread_cleanup_push.level == __ATEXIT__.length, 'cannot pop if something else added meanwhile!');
      __ATEXIT__.pop();
      _pthread_cleanup_push.level = __ATEXIT__.length;
    }

  function _glStencilOp(x0, x1, x2) { GLctx.stencilOp(x0, x1, x2) }

  function _glVertexAttribPointer(index, size, type, normalized, stride, ptr) {
      var cb = GL.currentContext.clientBuffers[index];
      if (!GL.currArrayBuffer) {
        cb.size = size;
        cb.type = type;
        cb.normalized = normalized;
        cb.stride = stride;
        cb.ptr = ptr;
        cb.clientside = true;
        return;
      }
      cb.clientside = false;
      GLctx.vertexAttribPointer(index, size, type, normalized, stride, ptr);
    }

  
  function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.set(HEAPU8.subarray(src, src+num), dest);
      return dest;
    } 
  Module["_memcpy"] = _memcpy;

  function _glfwGetFramebufferSize(winid, width, height) {
      var ww = 0;
      var wh = 0;
  
      var win = GLFW.WindowFromId(winid);
      if (win) {
        ww = win.width;
        wh = win.height;
      }
  
      setValue(width, ww, 'i32');
      setValue(height, wh, 'i32');
    }

  function _sbrk(bytes) {
      // Implement a Linux-like 'memory area' for our 'process'.
      // Changes the size of the memory area by |bytes|; returns the
      // address of the previous top ('break') of the memory area
      // We control the "dynamic" memory - DYNAMIC_BASE to DYNAMICTOP
      var self = _sbrk;
      if (!self.called) {
        DYNAMICTOP = alignMemoryPage(DYNAMICTOP); // make sure we start out aligned
        self.called = true;
        assert(Runtime.dynamicAlloc);
        self.alloc = Runtime.dynamicAlloc;
        Runtime.dynamicAlloc = function() { abort('cannot dynamically allocate, sbrk now has control') };
      }
      var ret = DYNAMICTOP;
      if (bytes != 0) {
        var success = self.alloc(bytes);
        if (!success) return -1 >>> 0; // sbrk failure code
      }
      return ret;  // Previous break location.
    }

  function _glGenTextures(n, textures) {
      for (var i = 0; i < n; i++) {
        var texture = GLctx.createTexture();
        if (!texture) {
          GL.recordError(0x0502 /* GL_INVALID_OPERATION */); // GLES + EGL specs don't specify what should happen here, so best to issue an error and create IDs with 0.
          while(i < n) HEAP32[(((textures)+(i++*4))>>2)]=0;
          return;
        }
        var id = GL.getNewId(GL.textures);
        texture.name = id;
        GL.textures[id] = texture;
        HEAP32[(((textures)+(i*4))>>2)]=id;
      }
    }

  var _tanf=Math_tan;

  function _glStencilFunc(x0, x1, x2) { GLctx.stencilFunc(x0, x1, x2) }

  function _glColorMask(x0, x1, x2, x3) { GLctx.colorMask(x0, x1, x2, x3) }

  function _glfwInit() {
      if (GLFW.windows) return 1; // GL_TRUE
  
      GLFW.initialTime = GLFW.getTime();
      GLFW.hints = GLFW.defaultHints;
      GLFW.windows = new Array()
      GLFW.active = null;
  
      window.addEventListener("keydown", GLFW.onKeydown, true);
      window.addEventListener("keypress", GLFW.onKeyPress, true);
      window.addEventListener("keyup", GLFW.onKeyup, true);
      Module["canvas"].addEventListener("mousemove", GLFW.onMousemove, true);
      Module["canvas"].addEventListener("mousedown", GLFW.onMouseButtonDown, true);
      Module["canvas"].addEventListener("mouseup", GLFW.onMouseButtonUp, true);
      Module["canvas"].addEventListener('wheel', GLFW.onMouseWheel, true);
      Module["canvas"].addEventListener('mousewheel', GLFW.onMouseWheel, true);
  
      Browser.resizeListeners.push(function(width, height) {
         GLFW.onFullScreenEventChange();
      });
      return 1; // GL_TRUE
    }

  function _glfwSwapBuffers(winid) {
      GLFW.swapBuffers(winid);
    }

  function _glTexParameteri(x0, x1, x2) { GLctx.texParameteri(x0, x1, x2) }

  function _glCreateShader(shaderType) {
      var id = GL.getNewId(GL.shaders);
      GL.shaders[id] = GLctx.createShader(shaderType);
      return id;
    }

  function _glUniform1i(location, v0) {
      location = GL.uniforms[location];
      GLctx.uniform1i(location, v0);
    }

  var _cosf=Math_cos;

  function _glDisableVertexAttribArray(index) {
      var cb = GL.currentContext.clientBuffers[index];
      cb.enabled = false;
      GLctx.disableVertexAttribArray(index);
    }

  
  
  function emscriptenWebGLComputeImageSize(width, height, sizePerPixel, alignment) {
      function roundedToNextMultipleOf(x, y) {
        return Math.floor((x + y - 1) / y) * y
      }
      var plainRowSize = width * sizePerPixel;
      var alignedRowSize = roundedToNextMultipleOf(plainRowSize, alignment);
      return (height <= 0) ? 0 :
               ((height - 1) * alignedRowSize + plainRowSize);
    }function emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, internalFormat) {
      var sizePerPixel;
      var numChannels;
      switch(format) {
        case 0x1906 /* GL_ALPHA */:
        case 0x1909 /* GL_LUMINANCE */:
        case 0x1902 /* GL_DEPTH_COMPONENT */:
        case 0x1903 /* GL_RED */:
          numChannels = 1;
          break;
        case 0x190A /* GL_LUMINANCE_ALPHA */:
        case 0x8227 /* GL_RG */:
          numChannels = 2;
          break;
        case 0x1907 /* GL_RGB */:
        case 0x8C40 /* GL_SRGB_EXT */:
          numChannels = 3;
          break;
        case 0x1908 /* GL_RGBA */:
        case 0x8C42 /* GL_SRGB_ALPHA_EXT */:
          numChannels = 4;
          break;
        default:
          GL.recordError(0x0500); // GL_INVALID_ENUM
          return {
            pixels: null,
            internalFormat: 0x0
          };
      }
      switch (type) {
        case 0x1401 /* GL_UNSIGNED_BYTE */:
          sizePerPixel = numChannels*1;
          break;
        case 0x1403 /* GL_UNSIGNED_SHORT */:
        case 0x8D61 /* GL_HALF_FLOAT_OES */:
          sizePerPixel = numChannels*2;
          break;
        case 0x1405 /* GL_UNSIGNED_INT */:
        case 0x1406 /* GL_FLOAT */:
          sizePerPixel = numChannels*4;
          break;
        case 0x84FA /* UNSIGNED_INT_24_8_WEBGL/UNSIGNED_INT_24_8 */:
          sizePerPixel = 4;
          break;
        case 0x8363 /* GL_UNSIGNED_SHORT_5_6_5 */:
        case 0x8033 /* GL_UNSIGNED_SHORT_4_4_4_4 */:
        case 0x8034 /* GL_UNSIGNED_SHORT_5_5_5_1 */:
          sizePerPixel = 2;
          break;
        default:
          GL.recordError(0x0500); // GL_INVALID_ENUM
          return {
            pixels: null,
            internalFormat: 0x0
          };
      }
      var bytes = emscriptenWebGLComputeImageSize(width, height, sizePerPixel, GL.unpackAlignment);
      if (type == 0x1401 /* GL_UNSIGNED_BYTE */) {
        pixels = HEAPU8.subarray((pixels),(pixels+bytes));
      } else if (type == 0x1406 /* GL_FLOAT */) {
        pixels = HEAPF32.subarray((pixels)>>2,(pixels+bytes)>>2);
      } else if (type == 0x1405 /* GL_UNSIGNED_INT */ || type == 0x84FA /* UNSIGNED_INT_24_8_WEBGL */) {
        pixels = HEAPU32.subarray((pixels)>>2,(pixels+bytes)>>2);
      } else {
        pixels = HEAPU16.subarray((pixels)>>1,(pixels+bytes)>>1);
      }
      return {
        pixels: pixels,
        internalFormat: internalFormat
      };
    }function _glTexSubImage2D(target, level, xoffset, yoffset, width, height, format, type, pixels) {
      var pixelData;
      if (pixels) {
        pixelData = emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, -1).pixels;
      } else {
        pixelData = null;
      }
      GLctx.texSubImage2D(target, level, xoffset, yoffset, width, height, format, type, pixelData);
    }

  function _glTexImage2D(target, level, internalFormat, width, height, border, format, type, pixels) {
      var pixelData;
      if (pixels) {
        var data = emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, internalFormat);
        pixelData = data.pixels;
        internalFormat = data.internalFormat;
      } else {
        pixelData = null;
      }
      GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, pixelData);
    }

  function _glDisable(x0) { GLctx.disable(x0) }

  function _glStencilMask(x0) { GLctx.stencilMask(x0) }

   
  Module["_memset"] = _memset;

  var _BDtoILow=true;

   
  Module["_bitshift64Lshr"] = _bitshift64Lshr;

  function _glGetProgramiv(program, pname, p) {
      if (!p) {
        // GLES2 specification does not specify how to behave if p is a null pointer. Since calling this function does not make sense
        // if p == null, issue a GL error to notify user about it. 
        GL.recordError(0x0501 /* GL_INVALID_VALUE */);
        return;
      }
      if (pname == 0x8B84) { // GL_INFO_LOG_LENGTH
        var log = GLctx.getProgramInfoLog(GL.programs[program]);
        if (log === null) log = '(unknown error)';
        HEAP32[((p)>>2)]=log.length + 1;
      } else if (pname == 0x8B87 /* GL_ACTIVE_UNIFORM_MAX_LENGTH */) {
        var ptable = GL.programInfos[program];
        if (ptable) {
          HEAP32[((p)>>2)]=ptable.maxUniformLength;
          return;
        } else if (program < GL.counter) {
          GL.recordError(0x0502 /* GL_INVALID_OPERATION */);
        } else {
          GL.recordError(0x0501 /* GL_INVALID_VALUE */);
        }
      } else if (pname == 0x8B8A /* GL_ACTIVE_ATTRIBUTE_MAX_LENGTH */) {
        var ptable = GL.programInfos[program];
        if (ptable) {
          if (ptable.maxAttributeLength == -1) {
            var program = GL.programs[program];
            var numAttribs = GLctx.getProgramParameter(program, GLctx.ACTIVE_ATTRIBUTES);
            ptable.maxAttributeLength = 0; // Spec says if there are no active attribs, 0 must be returned.
            for(var i = 0; i < numAttribs; ++i) {
              var activeAttrib = GLctx.getActiveAttrib(program, i);
              ptable.maxAttributeLength = Math.max(ptable.maxAttributeLength, activeAttrib.name.length+1);
            }
          }
          HEAP32[((p)>>2)]=ptable.maxAttributeLength;
          return;
        } else if (program < GL.counter) {
          GL.recordError(0x0502 /* GL_INVALID_OPERATION */);
        } else {
          GL.recordError(0x0501 /* GL_INVALID_VALUE */);
        }
      } else {
        HEAP32[((p)>>2)]=GLctx.getProgramParameter(GL.programs[program], pname);
      }
    }

  function ___gxx_personality_v0() {
    }

  function _glGetShaderInfoLog(shader, maxLength, length, infoLog) {
      var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
      if (log === null) log = '(unknown error)';
      log = log.substr(0, maxLength - 1);
      if (maxLength > 0 && infoLog) {
        writeStringToMemory(log, infoLog);
        if (length) HEAP32[((length)>>2)]=log.length;
      } else {
        if (length) HEAP32[((length)>>2)]=0;
      }
    }

   
  Module["_bitshift64Shl"] = _bitshift64Shl;

  function _abort() {
      Module['abort']();
    }

  function _glDeleteBuffers(n, buffers) {
      for (var i = 0; i < n; i++) {
        var id = HEAP32[(((buffers)+(i*4))>>2)];
        var buffer = GL.buffers[id];
  
        // From spec: "glDeleteBuffers silently ignores 0's and names that do not
        // correspond to existing buffer objects."
        if (!buffer) continue;
  
        GLctx.deleteBuffer(buffer);
        buffer.name = 0;
        GL.buffers[id] = null;
  
        if (id == GL.currArrayBuffer) GL.currArrayBuffer = 0;
        if (id == GL.currElementArrayBuffer) GL.currElementArrayBuffer = 0;
      }
    }

  function _glGetUniformLocation(program, name) {
      name = Pointer_stringify(name);
  
      var arrayOffset = 0;
      // If user passed an array accessor "[index]", parse the array index off the accessor.
      if (name.indexOf(']', name.length-1) !== -1) {
        var ls = name.lastIndexOf('[');
        var arrayIndex = name.slice(ls+1, -1);
        if (arrayIndex.length > 0) {
          arrayOffset = parseInt(arrayIndex);
          if (arrayOffset < 0) {
            return -1;
          }
        }
        name = name.slice(0, ls);
      }
  
      var ptable = GL.programInfos[program];
      if (!ptable) {
        return -1;
      }
      var utable = ptable.uniforms;
      var uniformInfo = utable[name]; // returns pair [ dimension_of_uniform_array, uniform_location ]
      if (uniformInfo && arrayOffset < uniformInfo[0]) { // Check if user asked for an out-of-bounds element, i.e. for 'vec4 colors[3];' user could ask for 'colors[10]' which should return -1.
        return uniformInfo[1]+arrayOffset;
      } else {
        return -1;
      }
    }

  function _glfwMakeContextCurrent(winid) {}

  function _glFinish() { GLctx.finish() }

  function ___lock() {}

  function _glfwGetWindowSize(winid, width, height) {
      GLFW.getWindowSize(winid, width, height);
    }

  function _glCullFace(x0) { GLctx.cullFace(x0) }

  var _emscripten_asm_const=true;

  function _glEnable(x0) { GLctx.enable(x0) }

  function _glUniform4fv(location, count, value) {
      location = GL.uniforms[location];
      var view;
      if (count === 1) {
        // avoid allocation for the common case of uploading one uniform
        view = GL.miniTempBufferViews[3];
        view[0] = HEAPF32[((value)>>2)];
        view[1] = HEAPF32[(((value)+(4))>>2)];
        view[2] = HEAPF32[(((value)+(8))>>2)];
        view[3] = HEAPF32[(((value)+(12))>>2)];
      } else {
        view = HEAPF32.subarray((value)>>2,(value+count*16)>>2);
      }
      GLctx.uniform4fv(location, view);
    }

  function _glDrawArrays(mode, first, count) {
      // bind any client-side buffers
      GL.preDrawHandleClientVertexAttribBindings(first + count);
  
      GLctx.drawArrays(mode, first, count);
  
      GL.postDrawHandleClientVertexAttribBindings();
    }

  var _emscripten_asm_const_int=true;

  function _glGenBuffers(n, buffers) {
      for (var i = 0; i < n; i++) {
        var buffer = GLctx.createBuffer();
        if (!buffer) {
          GL.recordError(0x0502 /* GL_INVALID_OPERATION */);
          while(i < n) HEAP32[(((buffers)+(i++*4))>>2)]=0;
          return;
        }
        var id = GL.getNewId(GL.buffers);
        buffer.name = id;
        GL.buffers[id] = buffer;
        HEAP32[(((buffers)+(i*4))>>2)]=id;
      }
    }

  function _glDeleteProgram(id) {
      if (!id) return;
      var program = GL.programs[id];
      if (!program) { // glDeleteProgram actually signals an error when deleting a nonexisting object, unlike some other GL delete functions.
        GL.recordError(0x0501 /* GL_INVALID_VALUE */);
        return;
      }
      GLctx.deleteProgram(program);
      program.name = 0;
      GL.programs[id] = null;
      GL.programInfos[id] = null;
    }

  
  
  function _emscripten_set_main_loop_timing(mode, value) {
      Browser.mainLoop.timingMode = mode;
      Browser.mainLoop.timingValue = value;
  
      if (!Browser.mainLoop.func) {
        return 1; // Return non-zero on failure, can't set timing mode when there is no main loop.
      }
  
      if (mode == 0 /*EM_TIMING_SETTIMEOUT*/) {
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_setTimeout() {
          setTimeout(Browser.mainLoop.runner, value); // doing this each time means that on exception, we stop
        };
        Browser.mainLoop.method = 'timeout';
      } else if (mode == 1 /*EM_TIMING_RAF*/) {
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_rAF() {
          Browser.requestAnimationFrame(Browser.mainLoop.runner);
        };
        Browser.mainLoop.method = 'rAF';
      } else if (mode == 2 /*EM_TIMING_SETIMMEDIATE*/) {
        if (!window['setImmediate']) {
          // Emulate setImmediate. (note: not a complete polyfill, we don't emulate clearImmediate() to keep code size to minimum, since not needed)
          var setImmediates = [];
          var emscriptenMainLoopMessageId = '__emcc';
          function Browser_setImmediate_messageHandler(event) {
            if (event.source === window && event.data === emscriptenMainLoopMessageId) {
              event.stopPropagation();
              setImmediates.shift()();
            }
          }
          window.addEventListener("message", Browser_setImmediate_messageHandler, true);
          window['setImmediate'] = function Browser_emulated_setImmediate(func) {
            setImmediates.push(func);
            window.postMessage(emscriptenMainLoopMessageId, "*");
          }
        }
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_setImmediate() {
          window['setImmediate'](Browser.mainLoop.runner);
        };
        Browser.mainLoop.method = 'immediate';
      }
      return 0;
    }function _emscripten_set_main_loop(func, fps, simulateInfiniteLoop, arg, noSetTiming) {
      Module['noExitRuntime'] = true;
  
      assert(!Browser.mainLoop.func, 'emscripten_set_main_loop: there can only be one main loop function at once: call emscripten_cancel_main_loop to cancel the previous one before setting a new one with different parameters.');
  
      Browser.mainLoop.func = func;
      Browser.mainLoop.arg = arg;
  
      var thisMainLoopId = Browser.mainLoop.currentlyRunningMainloop;
  
      Browser.mainLoop.runner = function Browser_mainLoop_runner() {
        if (ABORT) return;
        if (Browser.mainLoop.queue.length > 0) {
          var start = Date.now();
          var blocker = Browser.mainLoop.queue.shift();
          blocker.func(blocker.arg);
          if (Browser.mainLoop.remainingBlockers) {
            var remaining = Browser.mainLoop.remainingBlockers;
            var next = remaining%1 == 0 ? remaining-1 : Math.floor(remaining);
            if (blocker.counted) {
              Browser.mainLoop.remainingBlockers = next;
            } else {
              // not counted, but move the progress along a tiny bit
              next = next + 0.5; // do not steal all the next one's progress
              Browser.mainLoop.remainingBlockers = (8*remaining + next)/9;
            }
          }
          console.log('main loop blocker "' + blocker.name + '" took ' + (Date.now() - start) + ' ms'); //, left: ' + Browser.mainLoop.remainingBlockers);
          Browser.mainLoop.updateStatus();
          setTimeout(Browser.mainLoop.runner, 0);
          return;
        }
  
        // catch pauses from non-main loop sources
        if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
  
        // Implement very basic swap interval control
        Browser.mainLoop.currentFrameNumber = Browser.mainLoop.currentFrameNumber + 1 | 0;
        if (Browser.mainLoop.timingMode == 1/*EM_TIMING_RAF*/ && Browser.mainLoop.timingValue > 1 && Browser.mainLoop.currentFrameNumber % Browser.mainLoop.timingValue != 0) {
          // Not the scheduled time to render this frame - skip.
          Browser.mainLoop.scheduler();
          return;
        }
  
        // Signal GL rendering layer that processing of a new frame is about to start. This helps it optimize
        // VBO double-buffering and reduce GPU stalls.
        GL.newRenderingFrameStarted();
  
        if (Browser.mainLoop.method === 'timeout' && Module.ctx) {
          Module.printErr('Looks like you are rendering without using requestAnimationFrame for the main loop. You should use 0 for the frame rate in emscripten_set_main_loop in order to use requestAnimationFrame, as that can greatly improve your frame rates!');
          Browser.mainLoop.method = ''; // just warn once per call to set main loop
        }
  
        Browser.mainLoop.runIter(function() {
          if (typeof arg !== 'undefined') {
            Runtime.dynCall('vi', func, [arg]);
          } else {
            Runtime.dynCall('v', func);
          }
        });
  
        // catch pauses from the main loop itself
        if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
  
        // Queue new audio data. This is important to be right after the main loop invocation, so that we will immediately be able
        // to queue the newest produced audio samples.
        // TODO: Consider adding pre- and post- rAF callbacks so that GL.newRenderingFrameStarted() and SDL.audio.queueNewAudioData()
        //       do not need to be hardcoded into this function, but can be more generic.
        if (typeof SDL === 'object' && SDL.audio && SDL.audio.queueNewAudioData) SDL.audio.queueNewAudioData();
  
        Browser.mainLoop.scheduler();
      }
  
      if (!noSetTiming) {
        if (fps && fps > 0) _emscripten_set_main_loop_timing(0/*EM_TIMING_SETTIMEOUT*/, 1000.0 / fps);
        else _emscripten_set_main_loop_timing(1/*EM_TIMING_RAF*/, 1); // Do rAF by rendering each frame (no decimating)
  
        Browser.mainLoop.scheduler();
      }
  
      if (simulateInfiniteLoop) {
        throw 'SimulateInfiniteLoop';
      }
    }var Browser={mainLoop:{scheduler:null,method:"",currentlyRunningMainloop:0,func:null,arg:0,timingMode:0,timingValue:0,currentFrameNumber:0,queue:[],pause:function () {
          Browser.mainLoop.scheduler = null;
          Browser.mainLoop.currentlyRunningMainloop++; // Incrementing this signals the previous main loop that it's now become old, and it must return.
        },resume:function () {
          Browser.mainLoop.currentlyRunningMainloop++;
          var timingMode = Browser.mainLoop.timingMode;
          var timingValue = Browser.mainLoop.timingValue;
          var func = Browser.mainLoop.func;
          Browser.mainLoop.func = null;
          _emscripten_set_main_loop(func, 0, false, Browser.mainLoop.arg, true /* do not set timing and call scheduler, we will do it on the next lines */);
          _emscripten_set_main_loop_timing(timingMode, timingValue);
          Browser.mainLoop.scheduler();
        },updateStatus:function () {
          if (Module['setStatus']) {
            var message = Module['statusMessage'] || 'Please wait...';
            var remaining = Browser.mainLoop.remainingBlockers;
            var expected = Browser.mainLoop.expectedBlockers;
            if (remaining) {
              if (remaining < expected) {
                Module['setStatus'](message + ' (' + (expected - remaining) + '/' + expected + ')');
              } else {
                Module['setStatus'](message);
              }
            } else {
              Module['setStatus']('');
            }
          }
        },runIter:function (func) {
          if (ABORT) return;
          if (Module['preMainLoop']) {
            var preRet = Module['preMainLoop']();
            if (preRet === false) {
              return; // |return false| skips a frame
            }
          }
          try {
            func();
          } catch (e) {
            if (e instanceof ExitStatus) {
              return;
            } else {
              if (e && typeof e === 'object' && e.stack) Module.printErr('exception thrown: ' + [e, e.stack]);
              throw e;
            }
          }
          if (Module['postMainLoop']) Module['postMainLoop']();
        }},isFullScreen:false,pointerLock:false,moduleContextCreatedCallbacks:[],workers:[],init:function () {
        if (!Module["preloadPlugins"]) Module["preloadPlugins"] = []; // needs to exist even in workers
  
        if (Browser.initted) return;
        Browser.initted = true;
  
        try {
          new Blob();
          Browser.hasBlobConstructor = true;
        } catch(e) {
          Browser.hasBlobConstructor = false;
          console.log("warning: no blob constructor, cannot create blobs with mimetypes");
        }
        Browser.BlobBuilder = typeof MozBlobBuilder != "undefined" ? MozBlobBuilder : (typeof WebKitBlobBuilder != "undefined" ? WebKitBlobBuilder : (!Browser.hasBlobConstructor ? console.log("warning: no BlobBuilder") : null));
        Browser.URLObject = typeof window != "undefined" ? (window.URL ? window.URL : window.webkitURL) : undefined;
        if (!Module.noImageDecoding && typeof Browser.URLObject === 'undefined') {
          console.log("warning: Browser does not support creating object URLs. Built-in browser image decoding will not be available.");
          Module.noImageDecoding = true;
        }
  
        // Support for plugins that can process preloaded files. You can add more of these to
        // your app by creating and appending to Module.preloadPlugins.
        //
        // Each plugin is asked if it can handle a file based on the file's name. If it can,
        // it is given the file's raw data. When it is done, it calls a callback with the file's
        // (possibly modified) data. For example, a plugin might decompress a file, or it
        // might create some side data structure for use later (like an Image element, etc.).
  
        var imagePlugin = {};
        imagePlugin['canHandle'] = function imagePlugin_canHandle(name) {
          return !Module.noImageDecoding && /\.(jpg|jpeg|png|bmp)$/i.test(name);
        };
        imagePlugin['handle'] = function imagePlugin_handle(byteArray, name, onload, onerror) {
          var b = null;
          if (Browser.hasBlobConstructor) {
            try {
              b = new Blob([byteArray], { type: Browser.getMimetype(name) });
              if (b.size !== byteArray.length) { // Safari bug #118630
                // Safari's Blob can only take an ArrayBuffer
                b = new Blob([(new Uint8Array(byteArray)).buffer], { type: Browser.getMimetype(name) });
              }
            } catch(e) {
              Runtime.warnOnce('Blob constructor present but fails: ' + e + '; falling back to blob builder');
            }
          }
          if (!b) {
            var bb = new Browser.BlobBuilder();
            bb.append((new Uint8Array(byteArray)).buffer); // we need to pass a buffer, and must copy the array to get the right data range
            b = bb.getBlob();
          }
          var url = Browser.URLObject.createObjectURL(b);
          var img = new Image();
          img.onload = function img_onload() {
            assert(img.complete, 'Image ' + name + ' could not be decoded');
            var canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            Module["preloadedImages"][name] = canvas;
            Browser.URLObject.revokeObjectURL(url);
            if (onload) onload(byteArray);
          };
          img.onerror = function img_onerror(event) {
            console.log('Image ' + url + ' could not be decoded');
            if (onerror) onerror();
          };
          img.src = url;
        };
        Module['preloadPlugins'].push(imagePlugin);
  
        var audioPlugin = {};
        audioPlugin['canHandle'] = function audioPlugin_canHandle(name) {
          return !Module.noAudioDecoding && name.substr(-4) in { '.ogg': 1, '.wav': 1, '.mp3': 1 };
        };
        audioPlugin['handle'] = function audioPlugin_handle(byteArray, name, onload, onerror) {
          var done = false;
          function finish(audio) {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = audio;
            if (onload) onload(byteArray);
          }
          function fail() {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = new Audio(); // empty shim
            if (onerror) onerror();
          }
          if (Browser.hasBlobConstructor) {
            try {
              var b = new Blob([byteArray], { type: Browser.getMimetype(name) });
            } catch(e) {
              return fail();
            }
            var url = Browser.URLObject.createObjectURL(b); // XXX we never revoke this!
            var audio = new Audio();
            audio.addEventListener('canplaythrough', function() { finish(audio) }, false); // use addEventListener due to chromium bug 124926
            audio.onerror = function audio_onerror(event) {
              if (done) return;
              console.log('warning: browser could not fully decode audio ' + name + ', trying slower base64 approach');
              function encode64(data) {
                var BASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
                var PAD = '=';
                var ret = '';
                var leftchar = 0;
                var leftbits = 0;
                for (var i = 0; i < data.length; i++) {
                  leftchar = (leftchar << 8) | data[i];
                  leftbits += 8;
                  while (leftbits >= 6) {
                    var curr = (leftchar >> (leftbits-6)) & 0x3f;
                    leftbits -= 6;
                    ret += BASE[curr];
                  }
                }
                if (leftbits == 2) {
                  ret += BASE[(leftchar&3) << 4];
                  ret += PAD + PAD;
                } else if (leftbits == 4) {
                  ret += BASE[(leftchar&0xf) << 2];
                  ret += PAD;
                }
                return ret;
              }
              audio.src = 'data:audio/x-' + name.substr(-3) + ';base64,' + encode64(byteArray);
              finish(audio); // we don't wait for confirmation this worked - but it's worth trying
            };
            audio.src = url;
            // workaround for chrome bug 124926 - we do not always get oncanplaythrough or onerror
            Browser.safeSetTimeout(function() {
              finish(audio); // try to use it even though it is not necessarily ready to play
            }, 10000);
          } else {
            return fail();
          }
        };
        Module['preloadPlugins'].push(audioPlugin);
  
        // Canvas event setup
  
        var canvas = Module['canvas'];
        function pointerLockChange() {
          Browser.pointerLock = document['pointerLockElement'] === canvas ||
                                document['mozPointerLockElement'] === canvas ||
                                document['webkitPointerLockElement'] === canvas ||
                                document['msPointerLockElement'] === canvas;
        }
        if (canvas) {
          // forced aspect ratio can be enabled by defining 'forcedAspectRatio' on Module
          // Module['forcedAspectRatio'] = 4 / 3;
          
          canvas.requestPointerLock = canvas['requestPointerLock'] ||
                                      canvas['mozRequestPointerLock'] ||
                                      canvas['webkitRequestPointerLock'] ||
                                      canvas['msRequestPointerLock'] ||
                                      function(){};
          canvas.exitPointerLock = document['exitPointerLock'] ||
                                   document['mozExitPointerLock'] ||
                                   document['webkitExitPointerLock'] ||
                                   document['msExitPointerLock'] ||
                                   function(){}; // no-op if function does not exist
          canvas.exitPointerLock = canvas.exitPointerLock.bind(document);
  
  
          document.addEventListener('pointerlockchange', pointerLockChange, false);
          document.addEventListener('mozpointerlockchange', pointerLockChange, false);
          document.addEventListener('webkitpointerlockchange', pointerLockChange, false);
          document.addEventListener('mspointerlockchange', pointerLockChange, false);
  
          if (Module['elementPointerLock']) {
            canvas.addEventListener("click", function(ev) {
              if (!Browser.pointerLock && canvas.requestPointerLock) {
                canvas.requestPointerLock();
                ev.preventDefault();
              }
            }, false);
          }
        }
      },createContext:function (canvas, useWebGL, setInModule, webGLContextAttributes) {
        if (useWebGL && Module.ctx && canvas == Module.canvas) return Module.ctx; // no need to recreate GL context if it's already been created for this canvas.
  
        var ctx;
        var contextHandle;
        if (useWebGL) {
          // For GLES2/desktop GL compatibility, adjust a few defaults to be different to WebGL defaults, so that they align better with the desktop defaults.
          var contextAttributes = {
            antialias: false,
            alpha: false
          };
  
          if (webGLContextAttributes) {
            for (var attribute in webGLContextAttributes) {
              contextAttributes[attribute] = webGLContextAttributes[attribute];
            }
          }
  
          contextHandle = GL.createContext(canvas, contextAttributes);
          if (contextHandle) {
            ctx = GL.getContext(contextHandle).GLctx;
          }
          // Set the background of the WebGL canvas to black
          canvas.style.backgroundColor = "black";
        } else {
          ctx = canvas.getContext('2d');
        }
  
        if (!ctx) return null;
  
        if (setInModule) {
          if (!useWebGL) assert(typeof GLctx === 'undefined', 'cannot set in module if GLctx is used, but we are a non-GL context that would replace it');
  
          Module.ctx = ctx;
          if (useWebGL) GL.makeContextCurrent(contextHandle);
          Module.useWebGL = useWebGL;
          Browser.moduleContextCreatedCallbacks.forEach(function(callback) { callback() });
          Browser.init();
        }
        return ctx;
      },destroyContext:function (canvas, useWebGL, setInModule) {},fullScreenHandlersInstalled:false,lockPointer:undefined,resizeCanvas:undefined,requestFullScreen:function (lockPointer, resizeCanvas, vrDevice) {
        Browser.lockPointer = lockPointer;
        Browser.resizeCanvas = resizeCanvas;
        Browser.vrDevice = vrDevice;
        if (typeof Browser.lockPointer === 'undefined') Browser.lockPointer = true;
        if (typeof Browser.resizeCanvas === 'undefined') Browser.resizeCanvas = false;
        if (typeof Browser.vrDevice === 'undefined') Browser.vrDevice = null;
  
        var canvas = Module['canvas'];
        function fullScreenChange() {
          Browser.isFullScreen = false;
          var canvasContainer = canvas.parentNode;
          if ((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
               document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
               document['fullScreenElement'] || document['fullscreenElement'] ||
               document['msFullScreenElement'] || document['msFullscreenElement'] ||
               document['webkitCurrentFullScreenElement']) === canvasContainer) {
            canvas.cancelFullScreen = document['cancelFullScreen'] ||
                                      document['mozCancelFullScreen'] ||
                                      document['webkitCancelFullScreen'] ||
                                      document['msExitFullscreen'] ||
                                      document['exitFullscreen'] ||
                                      function() {};
            canvas.cancelFullScreen = canvas.cancelFullScreen.bind(document);
            if (Browser.lockPointer) canvas.requestPointerLock();
            Browser.isFullScreen = true;
            if (Browser.resizeCanvas) Browser.setFullScreenCanvasSize();
          } else {
            
            // remove the full screen specific parent of the canvas again to restore the HTML structure from before going full screen
            canvasContainer.parentNode.insertBefore(canvas, canvasContainer);
            canvasContainer.parentNode.removeChild(canvasContainer);
            
            if (Browser.resizeCanvas) Browser.setWindowedCanvasSize();
          }
          if (Module['onFullScreen']) Module['onFullScreen'](Browser.isFullScreen);
          Browser.updateCanvasDimensions(canvas);
        }
  
        if (!Browser.fullScreenHandlersInstalled) {
          Browser.fullScreenHandlersInstalled = true;
          document.addEventListener('fullscreenchange', fullScreenChange, false);
          document.addEventListener('mozfullscreenchange', fullScreenChange, false);
          document.addEventListener('webkitfullscreenchange', fullScreenChange, false);
          document.addEventListener('MSFullscreenChange', fullScreenChange, false);
        }
  
        // create a new parent to ensure the canvas has no siblings. this allows browsers to optimize full screen performance when its parent is the full screen root
        var canvasContainer = document.createElement("div");
        canvas.parentNode.insertBefore(canvasContainer, canvas);
        canvasContainer.appendChild(canvas);
  
        // use parent of canvas as full screen root to allow aspect ratio correction (Firefox stretches the root to screen size)
        canvasContainer.requestFullScreen = canvasContainer['requestFullScreen'] ||
                                            canvasContainer['mozRequestFullScreen'] ||
                                            canvasContainer['msRequestFullscreen'] ||
                                           (canvasContainer['webkitRequestFullScreen'] ? function() { canvasContainer['webkitRequestFullScreen'](Element['ALLOW_KEYBOARD_INPUT']) } : null);
  
        if (vrDevice) {
          canvasContainer.requestFullScreen({ vrDisplay: vrDevice });
        } else {
          canvasContainer.requestFullScreen();
        }
      },nextRAF:0,fakeRequestAnimationFrame:function (func) {
        // try to keep 60fps between calls to here
        var now = Date.now();
        if (Browser.nextRAF === 0) {
          Browser.nextRAF = now + 1000/60;
        } else {
          while (now + 2 >= Browser.nextRAF) { // fudge a little, to avoid timer jitter causing us to do lots of delay:0
            Browser.nextRAF += 1000/60;
          }
        }
        var delay = Math.max(Browser.nextRAF - now, 0);
        setTimeout(func, delay);
      },requestAnimationFrame:function requestAnimationFrame(func) {
        if (typeof window === 'undefined') { // Provide fallback to setTimeout if window is undefined (e.g. in Node.js)
          Browser.fakeRequestAnimationFrame(func);
        } else {
          if (!window.requestAnimationFrame) {
            window.requestAnimationFrame = window['requestAnimationFrame'] ||
                                           window['mozRequestAnimationFrame'] ||
                                           window['webkitRequestAnimationFrame'] ||
                                           window['msRequestAnimationFrame'] ||
                                           window['oRequestAnimationFrame'] ||
                                           Browser.fakeRequestAnimationFrame;
          }
          window.requestAnimationFrame(func);
        }
      },safeCallback:function (func) {
        return function() {
          if (!ABORT) return func.apply(null, arguments);
        };
      },allowAsyncCallbacks:true,queuedAsyncCallbacks:[],pauseAsyncCallbacks:function () {
        Browser.allowAsyncCallbacks = false;
      },resumeAsyncCallbacks:function () { // marks future callbacks as ok to execute, and synchronously runs any remaining ones right now
        Browser.allowAsyncCallbacks = true;
        if (Browser.queuedAsyncCallbacks.length > 0) {
          var callbacks = Browser.queuedAsyncCallbacks;
          Browser.queuedAsyncCallbacks = [];
          callbacks.forEach(function(func) {
            func();
          });
        }
      },safeRequestAnimationFrame:function (func) {
        return Browser.requestAnimationFrame(function() {
          if (ABORT) return;
          if (Browser.allowAsyncCallbacks) {
            func();
          } else {
            Browser.queuedAsyncCallbacks.push(func);
          }
        });
      },safeSetTimeout:function (func, timeout) {
        Module['noExitRuntime'] = true;
        return setTimeout(function() {
          if (ABORT) return;
          if (Browser.allowAsyncCallbacks) {
            func();
          } else {
            Browser.queuedAsyncCallbacks.push(func);
          }
        }, timeout);
      },safeSetInterval:function (func, timeout) {
        Module['noExitRuntime'] = true;
        return setInterval(function() {
          if (ABORT) return;
          if (Browser.allowAsyncCallbacks) {
            func();
          } // drop it on the floor otherwise, next interval will kick in
        }, timeout);
      },getMimetype:function (name) {
        return {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'bmp': 'image/bmp',
          'ogg': 'audio/ogg',
          'wav': 'audio/wav',
          'mp3': 'audio/mpeg'
        }[name.substr(name.lastIndexOf('.')+1)];
      },getUserMedia:function (func) {
        if(!window.getUserMedia) {
          window.getUserMedia = navigator['getUserMedia'] ||
                                navigator['mozGetUserMedia'];
        }
        window.getUserMedia(func);
      },getMovementX:function (event) {
        return event['movementX'] ||
               event['mozMovementX'] ||
               event['webkitMovementX'] ||
               0;
      },getMovementY:function (event) {
        return event['movementY'] ||
               event['mozMovementY'] ||
               event['webkitMovementY'] ||
               0;
      },getMouseWheelDelta:function (event) {
        var delta = 0;
        switch (event.type) {
          case 'DOMMouseScroll': 
            delta = event.detail;
            break;
          case 'mousewheel': 
            delta = event.wheelDelta;
            break;
          case 'wheel': 
            delta = event['deltaY'];
            break;
          default:
            throw 'unrecognized mouse wheel event: ' + event.type;
        }
        return delta;
      },mouseX:0,mouseY:0,mouseMovementX:0,mouseMovementY:0,touches:{},lastTouches:{},calculateMouseEvent:function (event) { // event should be mousemove, mousedown or mouseup
        if (Browser.pointerLock) {
          // When the pointer is locked, calculate the coordinates
          // based on the movement of the mouse.
          // Workaround for Firefox bug 764498
          if (event.type != 'mousemove' &&
              ('mozMovementX' in event)) {
            Browser.mouseMovementX = Browser.mouseMovementY = 0;
          } else {
            Browser.mouseMovementX = Browser.getMovementX(event);
            Browser.mouseMovementY = Browser.getMovementY(event);
          }
          
          // check if SDL is available
          if (typeof SDL != "undefined") {
          	Browser.mouseX = SDL.mouseX + Browser.mouseMovementX;
          	Browser.mouseY = SDL.mouseY + Browser.mouseMovementY;
          } else {
          	// just add the mouse delta to the current absolut mouse position
          	// FIXME: ideally this should be clamped against the canvas size and zero
          	Browser.mouseX += Browser.mouseMovementX;
          	Browser.mouseY += Browser.mouseMovementY;
          }        
        } else {
          // Otherwise, calculate the movement based on the changes
          // in the coordinates.
          var rect = Module["canvas"].getBoundingClientRect();
          var cw = Module["canvas"].width;
          var ch = Module["canvas"].height;
  
          // Neither .scrollX or .pageXOffset are defined in a spec, but
          // we prefer .scrollX because it is currently in a spec draft.
          // (see: http://www.w3.org/TR/2013/WD-cssom-view-20131217/)
          var scrollX = ((typeof window.scrollX !== 'undefined') ? window.scrollX : window.pageXOffset);
          var scrollY = ((typeof window.scrollY !== 'undefined') ? window.scrollY : window.pageYOffset);
  
          if (event.type === 'touchstart' || event.type === 'touchend' || event.type === 'touchmove') {
            var touch = event.touch;
            if (touch === undefined) {
              return; // the "touch" property is only defined in SDL
  
            }
            var adjustedX = touch.pageX - (scrollX + rect.left);
            var adjustedY = touch.pageY - (scrollY + rect.top);
  
            adjustedX = adjustedX * (cw / rect.width);
            adjustedY = adjustedY * (ch / rect.height);
  
            var coords = { x: adjustedX, y: adjustedY };
            
            if (event.type === 'touchstart') {
              Browser.lastTouches[touch.identifier] = coords;
              Browser.touches[touch.identifier] = coords;
            } else if (event.type === 'touchend' || event.type === 'touchmove') {
              var last = Browser.touches[touch.identifier];
              if (!last) last = coords;
              Browser.lastTouches[touch.identifier] = last;
              Browser.touches[touch.identifier] = coords;
            } 
            return;
          }
  
          var x = event.pageX - (scrollX + rect.left);
          var y = event.pageY - (scrollY + rect.top);
  
          // the canvas might be CSS-scaled compared to its backbuffer;
          // SDL-using content will want mouse coordinates in terms
          // of backbuffer units.
          x = x * (cw / rect.width);
          y = y * (ch / rect.height);
  
          Browser.mouseMovementX = x - Browser.mouseX;
          Browser.mouseMovementY = y - Browser.mouseY;
          Browser.mouseX = x;
          Browser.mouseY = y;
        }
      },xhrLoad:function (url, onload, onerror) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function xhr_onload() {
          if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
            onload(xhr.response);
          } else {
            onerror();
          }
        };
        xhr.onerror = onerror;
        xhr.send(null);
      },asyncLoad:function (url, onload, onerror, noRunDep) {
        Browser.xhrLoad(url, function(arrayBuffer) {
          assert(arrayBuffer, 'Loading data file "' + url + '" failed (no arrayBuffer).');
          onload(new Uint8Array(arrayBuffer));
          if (!noRunDep) removeRunDependency('al ' + url);
        }, function(event) {
          if (onerror) {
            onerror();
          } else {
            throw 'Loading data file "' + url + '" failed.';
          }
        });
        if (!noRunDep) addRunDependency('al ' + url);
      },resizeListeners:[],updateResizeListeners:function () {
        var canvas = Module['canvas'];
        Browser.resizeListeners.forEach(function(listener) {
          listener(canvas.width, canvas.height);
        });
      },setCanvasSize:function (width, height, noUpdates) {
        var canvas = Module['canvas'];
        Browser.updateCanvasDimensions(canvas, width, height);
        if (!noUpdates) Browser.updateResizeListeners();
      },windowedWidth:0,windowedHeight:0,setFullScreenCanvasSize:function () {
        // check if SDL is available   
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags | 0x00800000; // set SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      },setWindowedCanvasSize:function () {
        // check if SDL is available       
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags & ~0x00800000; // clear SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      },updateCanvasDimensions:function (canvas, wNative, hNative) {
        if (wNative && hNative) {
          canvas.widthNative = wNative;
          canvas.heightNative = hNative;
        } else {
          wNative = canvas.widthNative;
          hNative = canvas.heightNative;
        }
        var w = wNative;
        var h = hNative;
        if (Module['forcedAspectRatio'] && Module['forcedAspectRatio'] > 0) {
          if (w/h < Module['forcedAspectRatio']) {
            w = Math.round(h * Module['forcedAspectRatio']);
          } else {
            h = Math.round(w / Module['forcedAspectRatio']);
          }
        }
        if (((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
             document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
             document['fullScreenElement'] || document['fullscreenElement'] ||
             document['msFullScreenElement'] || document['msFullscreenElement'] ||
             document['webkitCurrentFullScreenElement']) === canvas.parentNode) && (typeof screen != 'undefined')) {
           var factor = Math.min(screen.width / w, screen.height / h);
           w = Math.round(w * factor);
           h = Math.round(h * factor);
        }
        if (Browser.resizeCanvas) {
          if (canvas.width  != w) canvas.width  = w;
          if (canvas.height != h) canvas.height = h;
          if (typeof canvas.style != 'undefined') {
            canvas.style.removeProperty( "width");
            canvas.style.removeProperty("height");
          }
        } else {
          if (canvas.width  != wNative) canvas.width  = wNative;
          if (canvas.height != hNative) canvas.height = hNative;
          /*if (typeof canvas.style != 'undefined') {
            if (w != wNative || h != hNative) {
              canvas.style.setProperty( "width", w + "px", "important");
              canvas.style.setProperty("height", h + "px", "important");
            } else {
              canvas.style.removeProperty( "width");
              canvas.style.removeProperty("height");
            }
          }*/
        }
      },wgetRequests:{},nextWgetRequestHandle:0,getNextWgetRequestHandle:function () {
        var handle = Browser.nextWgetRequestHandle;
        Browser.nextWgetRequestHandle++;
        return handle;
      }};

  function ___unlock() {}

  function _glAttachShader(program, shader) {
      GLctx.attachShader(GL.programs[program],
                              GL.shaders[shader]);
    }

  var _atan2f=Math_atan2;

  function _glDeleteShader(id) {
      if (!id) return;
      var shader = GL.shaders[id];
      if (!shader) { // glDeleteShader actually signals an error when deleting a nonexisting object, unlike some other GL delete functions.
        GL.recordError(0x0501 /* GL_INVALID_VALUE */);
        return;
      }
      GLctx.deleteShader(shader);
      GL.shaders[id] = null;
    }

  function _glBlendFunc(x0, x1) { GLctx.blendFunc(x0, x1) }

  function _glCreateProgram() {
      var id = GL.getNewId(GL.programs);
      var program = GLctx.createProgram();
      program.name = id;
      GL.programs[id] = program;
      return id;
    }

  var _ceilf=Math_ceil;

  function _glfwPollEvents() {}

  
  function _malloc(bytes) {
      /* Over-allocate to make sure it is byte-aligned by 8.
       * This will leak memory, but this is only the dummy
       * implementation (replaced by dlmalloc normally) so
       * not an issue.
       */
      var ptr = Runtime.dynamicAlloc(bytes + 8);
      return (ptr+8) & 0xFFFFFFF8;
    }
  Module["_malloc"] = _malloc;function ___cxa_allocate_exception(size) {
      return _malloc(size);
    }

  function _glBindAttribLocation(program, index, name) {
      name = Pointer_stringify(name);
      GLctx.bindAttribLocation(GL.programs[program], index, name);
    }

  function _glfwDestroyWindow(winid) {
      return GLFW.destroyWindow(winid);
    }

  function _glGetProgramInfoLog(program, maxLength, length, infoLog) {
      var log = GLctx.getProgramInfoLog(GL.programs[program]);
      if (log === null) log = '(unknown error)';
  
      log = log.substr(0, maxLength - 1);
      if (maxLength > 0 && infoLog) {
        writeStringToMemory(log, infoLog);
        if (length) HEAP32[((length)>>2)]=log.length;
      } else {
        if (length) HEAP32[((length)>>2)]=0;
      }
    }

  var _sinf=Math_sin;

  function ___syscall6(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // close
      var stream = SYSCALLS.getStreamFromFD();
      FS.close(stream);
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  var _BItoD=true;

  function _glActiveTexture(x0) { GLctx.activeTexture(x0) }

  function _glFrontFace(x0) { GLctx.frontFace(x0) }

  function _glGenerateMipmap(x0) { GLctx.generateMipmap(x0) }

  function _glPixelStorei(pname, param) {
      if (pname == 0x0D05 /* GL_PACK_ALIGNMENT */) {
        GL.packAlignment = param;
      } else if (pname == 0x0cf5 /* GL_UNPACK_ALIGNMENT */) {
        GL.unpackAlignment = param;
      }
      GLctx.pixelStorei(pname, param);
    }

  function _time(ptr) {
      var ret = (Date.now()/1000)|0;
      if (ptr) {
        HEAP32[((ptr)>>2)]=ret;
      }
      return ret;
    }

  function _glGetShaderiv(shader, pname, p) {
      if (!p) {
        // GLES2 specification does not specify how to behave if p is a null pointer. Since calling this function does not make sense
        // if p == null, issue a GL error to notify user about it. 
        GL.recordError(0x0501 /* GL_INVALID_VALUE */);
        return;
      }
      if (pname == 0x8B84) { // GL_INFO_LOG_LENGTH
        var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
        if (log === null) log = '(unknown error)';
        HEAP32[((p)>>2)]=log.length + 1;
      } else {
        HEAP32[((p)>>2)]=GLctx.getShaderParameter(GL.shaders[shader], pname);
      }
    }

  function _pthread_self() {
      //FIXME: assumes only a single thread
      return 0;
    }

  function ___syscall140(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // llseek
      var stream = SYSCALLS.getStreamFromFD(), offset_high = SYSCALLS.get(), offset_low = SYSCALLS.get(), result = SYSCALLS.get(), whence = SYSCALLS.get();
      var offset = offset_low;
      assert(offset_high === 0);
      FS.llseek(stream, offset, whence);
      HEAP32[((result)>>2)]=stream.position;
      if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null; // reset readdir state
      return 0;
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }

  function ___syscall146(which, varargs) {SYSCALLS.varargs = varargs;
  try {
   // writev
      var stream = SYSCALLS.getStreamFromFD(), iov = SYSCALLS.get(), iovcnt = SYSCALLS.get();
      return SYSCALLS.doWritev(stream, iov, iovcnt);
    } catch (e) {
    if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
    return -e.errno;
  }
  }
var GLctx; GL.init()
FS.staticInit();__ATINIT__.unshift(function() { if (!Module["noFSInit"] && !FS.init.initialized) FS.init() });__ATMAIN__.push(function() { FS.ignorePermissions = false });__ATEXIT__.push(function() { FS.quit() });Module["FS_createFolder"] = FS.createFolder;Module["FS_createPath"] = FS.createPath;Module["FS_createDataFile"] = FS.createDataFile;Module["FS_createPreloadedFile"] = FS.createPreloadedFile;Module["FS_createLazyFile"] = FS.createLazyFile;Module["FS_createLink"] = FS.createLink;Module["FS_createDevice"] = FS.createDevice;Module["FS_unlink"] = FS.unlink;
__ATINIT__.unshift(function() { TTY.init() });__ATEXIT__.push(function() { TTY.shutdown() });
if (ENVIRONMENT_IS_NODE) { var fs = require("fs"); var NODEJS_PATH = require("path"); NODEFS.staticInit(); }
Module["requestFullScreen"] = function Module_requestFullScreen(lockPointer, resizeCanvas, vrDevice) { Browser.requestFullScreen(lockPointer, resizeCanvas, vrDevice) };
  Module["requestAnimationFrame"] = function Module_requestAnimationFrame(func) { Browser.requestAnimationFrame(func) };
  Module["setCanvasSize"] = function Module_setCanvasSize(width, height, noUpdates) { Browser.setCanvasSize(width, height, noUpdates) };
  Module["pauseMainLoop"] = function Module_pauseMainLoop() { Browser.mainLoop.pause() };
  Module["resumeMainLoop"] = function Module_resumeMainLoop() { Browser.mainLoop.resume() };
  Module["getUserMedia"] = function Module_getUserMedia() { Browser.getUserMedia() }
  Module["createContext"] = function Module_createContext(canvas, useWebGL, setInModule, webGLContextAttributes) { return Browser.createContext(canvas, useWebGL, setInModule, webGLContextAttributes) }
STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);

staticSealed = true; // seal the static portion of memory

STACK_MAX = STACK_BASE + TOTAL_STACK;

DYNAMIC_BASE = DYNAMICTOP = Runtime.alignMemory(STACK_MAX);

assert(DYNAMIC_BASE < TOTAL_MEMORY, "TOTAL_MEMORY not big enough for stack");

 var cttz_i8 = allocate([8,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,6,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,7,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,6,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,5,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0,4,0,1,0,2,0,1,0,3,0,1,0,2,0,1,0], "i8", ALLOC_DYNAMIC);


function invoke_iiiiiiii(index,a1,a2,a3,a4,a5,a6,a7) {
  try {
    return Module["dynCall_iiiiiiii"](index,a1,a2,a3,a4,a5,a6,a7);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_iiii(index,a1,a2,a3) {
  try {
    return Module["dynCall_iiii"](index,a1,a2,a3);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_viiiiii(index,a1,a2,a3,a4,a5,a6) {
  try {
    Module["dynCall_viiiiii"](index,a1,a2,a3,a4,a5,a6);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_viiidiii(index,a1,a2,a3,a4,a5,a6,a7) {
  try {
    Module["dynCall_viiidiii"](index,a1,a2,a3,a4,a5,a6,a7);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_viiiii(index,a1,a2,a3,a4,a5) {
  try {
    Module["dynCall_viiiii"](index,a1,a2,a3,a4,a5);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_vi(index,a1) {
  try {
    Module["dynCall_vi"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_iiiiiii(index,a1,a2,a3,a4,a5,a6) {
  try {
    return Module["dynCall_iiiiiii"](index,a1,a2,a3,a4,a5,a6);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_ii(index,a1) {
  try {
    return Module["dynCall_ii"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_viii(index,a1,a2,a3) {
  try {
    Module["dynCall_viii"](index,a1,a2,a3);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_v(index) {
  try {
    Module["dynCall_v"](index);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_iiiii(index,a1,a2,a3,a4) {
  try {
    return Module["dynCall_iiiii"](index,a1,a2,a3,a4);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_viiii(index,a1,a2,a3,a4) {
  try {
    Module["dynCall_viiii"](index,a1,a2,a3,a4);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_iii(index,a1,a2) {
  try {
    return Module["dynCall_iii"](index,a1,a2);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

function invoke_viiiddii(index,a1,a2,a3,a4,a5,a6,a7) {
  try {
    Module["dynCall_viiiddii"](index,a1,a2,a3,a4,a5,a6,a7);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}

Module.asmGlobalArg = { "Math": Math, "Int8Array": Int8Array, "Int16Array": Int16Array, "Int32Array": Int32Array, "Uint8Array": Uint8Array, "Uint16Array": Uint16Array, "Uint32Array": Uint32Array, "Float32Array": Float32Array, "Float64Array": Float64Array, "NaN": NaN, "Infinity": Infinity };

Module.asmLibraryArg = { "abort": abort, "assert": assert, "invoke_iiiiiiii": invoke_iiiiiiii, "invoke_iiii": invoke_iiii, "invoke_viiiiii": invoke_viiiiii, "invoke_viiidiii": invoke_viiidiii, "invoke_viiiii": invoke_viiiii, "invoke_vi": invoke_vi, "invoke_iiiiiii": invoke_iiiiiii, "invoke_ii": invoke_ii, "invoke_viii": invoke_viii, "invoke_v": invoke_v, "invoke_iiiii": invoke_iiiii, "invoke_viiii": invoke_viiii, "invoke_iii": invoke_iii, "invoke_viiiddii": invoke_viiiddii, "_glUseProgram": _glUseProgram, "_glfwCreateWindow": _glfwCreateWindow, "_glStencilFunc": _glStencilFunc, "_glUniform2fv": _glUniform2fv, "_glDeleteProgram": _glDeleteProgram, "__ZSt18uncaught_exceptionv": __ZSt18uncaught_exceptionv, "_glBindBuffer": _glBindBuffer, "_glGetShaderInfoLog": _glGetShaderInfoLog, "_emscripten_set_main_loop_timing": _emscripten_set_main_loop_timing, "_sbrk": _sbrk, "_glBlendFunc": _glBlendFunc, "_glDisableVertexAttribArray": _glDisableVertexAttribArray, "_sinf": _sinf, "_sysconf": _sysconf, "_glStencilOp": _glStencilOp, "_glfwInit": _glfwInit, "_glGenBuffers": _glGenBuffers, "_glShaderSource": _glShaderSource, "_pthread_cleanup_push": _pthread_cleanup_push, "_tanf": _tanf, "___syscall140": ___syscall140, "_glfwDestroyWindow": _glfwDestroyWindow, "___syscall146": ___syscall146, "_pthread_cleanup_pop": _pthread_cleanup_pop, "_glGenerateMipmap": _glGenerateMipmap, "_glVertexAttribPointer": _glVertexAttribPointer, "_glGetProgramInfoLog": _glGetProgramInfoLog, "_atan2f": _atan2f, "___cxa_find_matching_catch": ___cxa_find_matching_catch, "_glfwMakeContextCurrent": _glfwMakeContextCurrent, "___setErrNo": ___setErrNo, "_glDeleteTextures": _glDeleteTextures, "_glStencilOpSeparate": _glStencilOpSeparate, "___resumeException": ___resumeException, "_glEnable": _glEnable, "_glGenTextures": _glGenTextures, "_emscripten_get_now": _emscripten_get_now, "_glAttachShader": _glAttachShader, "_glCreateProgram": _glCreateProgram, "___lock": ___lock, "emscriptenWebGLGetTexPixelData": emscriptenWebGLGetTexPixelData, "___syscall6": ___syscall6, "_time": _time, "_exit": _exit, "_emscripten_asm_const_1": _emscripten_asm_const_1, "_emscripten_asm_const_0": _emscripten_asm_const_0, "_glCullFace": _glCullFace, "_glfwPollEvents": _glfwPollEvents, "___cxa_allocate_exception": ___cxa_allocate_exception, "_ceilf": _ceilf, "_glfwGetFramebufferSize": _glfwGetFramebufferSize, "_acosf": _acosf, "_glBindTexture": _glBindTexture, "_glFinish": _glFinish, "_glUniform1i": _glUniform1i, "_glDrawArrays": _glDrawArrays, "_emscripten_memcpy_big": _emscripten_memcpy_big, "_glGetError": _glGetError, "_sqrtf": _sqrtf, "_glActiveTexture": _glActiveTexture, "_glfwSwapBuffers": _glfwSwapBuffers, "_glfwTerminate": _glfwTerminate, "_glFrontFace": _glFrontFace, "_glCompileShader": _glCompileShader, "_glEnableVertexAttribArray": _glEnableVertexAttribArray, "_abort": _abort, "_glDeleteBuffers": _glDeleteBuffers, "_glBufferData": _glBufferData, "_glTexImage2D": _glTexImage2D, "_glDeleteShader": _glDeleteShader, "_cosf": _cosf, "_glGetProgramiv": _glGetProgramiv, "emscriptenWebGLComputeImageSize": emscriptenWebGLComputeImageSize, "___gxx_personality_v0": ___gxx_personality_v0, "_glfwGetWindowSize": _glfwGetWindowSize, "_glLinkProgram": _glLinkProgram, "_glGetShaderiv": _glGetShaderiv, "_glGetUniformLocation": _glGetUniformLocation, "_glUniform4fv": _glUniform4fv, "__exit": __exit, "_glBindAttribLocation": _glBindAttribLocation, "_glPixelStorei": _glPixelStorei, "_pthread_self": _pthread_self, "_glfwGetCursorPos": _glfwGetCursorPos, "___syscall54": ___syscall54, "___unlock": ___unlock, "_emscripten_set_main_loop": _emscripten_set_main_loop, "___cxa_throw": ___cxa_throw, "_glColorMask": _glColorMask, "_glDisable": _glDisable, "_glTexParameteri": _glTexParameteri, "_glStencilMask": _glStencilMask, "_glCreateShader": _glCreateShader, "_glTexSubImage2D": _glTexSubImage2D, "STACKTOP": STACKTOP, "STACK_MAX": STACK_MAX, "tempDoublePtr": tempDoublePtr, "ABORT": ABORT, "cttz_i8": cttz_i8 };
// EMSCRIPTEN_START_ASM
var asm = (function(global, env, buffer) {
  'use asm';
  
  
  var HEAP8 = new global.Int8Array(buffer);
  var HEAP16 = new global.Int16Array(buffer);
  var HEAP32 = new global.Int32Array(buffer);
  var HEAPU8 = new global.Uint8Array(buffer);
  var HEAPU16 = new global.Uint16Array(buffer);
  var HEAPU32 = new global.Uint32Array(buffer);
  var HEAPF32 = new global.Float32Array(buffer);
  var HEAPF64 = new global.Float64Array(buffer);


  var STACKTOP=env.STACKTOP|0;
  var STACK_MAX=env.STACK_MAX|0;
  var tempDoublePtr=env.tempDoublePtr|0;
  var ABORT=env.ABORT|0;
  var cttz_i8=env.cttz_i8|0;

  var __THREW__ = 0;
  var threwValue = 0;
  var setjmpId = 0;
  var undef = 0;
  var nan = global.NaN, inf = global.Infinity;
  var tempInt = 0, tempBigInt = 0, tempBigIntP = 0, tempBigIntS = 0, tempBigIntR = 0.0, tempBigIntI = 0, tempBigIntD = 0, tempValue = 0, tempDouble = 0.0;

  var tempRet0 = 0;
  var tempRet1 = 0;
  var tempRet2 = 0;
  var tempRet3 = 0;
  var tempRet4 = 0;
  var tempRet5 = 0;
  var tempRet6 = 0;
  var tempRet7 = 0;
  var tempRet8 = 0;
  var tempRet9 = 0;
  var Math_floor=global.Math.floor;
  var Math_abs=global.Math.abs;
  var Math_sqrt=global.Math.sqrt;
  var Math_pow=global.Math.pow;
  var Math_cos=global.Math.cos;
  var Math_sin=global.Math.sin;
  var Math_tan=global.Math.tan;
  var Math_acos=global.Math.acos;
  var Math_asin=global.Math.asin;
  var Math_atan=global.Math.atan;
  var Math_atan2=global.Math.atan2;
  var Math_exp=global.Math.exp;
  var Math_log=global.Math.log;
  var Math_ceil=global.Math.ceil;
  var Math_imul=global.Math.imul;
  var Math_min=global.Math.min;
  var Math_clz32=global.Math.clz32;
  var abort=env.abort;
  var assert=env.assert;
  var invoke_iiiiiiii=env.invoke_iiiiiiii;
  var invoke_iiii=env.invoke_iiii;
  var invoke_viiiiii=env.invoke_viiiiii;
  var invoke_viiidiii=env.invoke_viiidiii;
  var invoke_viiiii=env.invoke_viiiii;
  var invoke_vi=env.invoke_vi;
  var invoke_iiiiiii=env.invoke_iiiiiii;
  var invoke_ii=env.invoke_ii;
  var invoke_viii=env.invoke_viii;
  var invoke_v=env.invoke_v;
  var invoke_iiiii=env.invoke_iiiii;
  var invoke_viiii=env.invoke_viiii;
  var invoke_iii=env.invoke_iii;
  var invoke_viiiddii=env.invoke_viiiddii;
  var _glUseProgram=env._glUseProgram;
  var _glfwCreateWindow=env._glfwCreateWindow;
  var _glStencilFunc=env._glStencilFunc;
  var _glUniform2fv=env._glUniform2fv;
  var _glDeleteProgram=env._glDeleteProgram;
  var __ZSt18uncaught_exceptionv=env.__ZSt18uncaught_exceptionv;
  var _glBindBuffer=env._glBindBuffer;
  var _glGetShaderInfoLog=env._glGetShaderInfoLog;
  var _emscripten_set_main_loop_timing=env._emscripten_set_main_loop_timing;
  var _sbrk=env._sbrk;
  var _glBlendFunc=env._glBlendFunc;
  var _glDisableVertexAttribArray=env._glDisableVertexAttribArray;
  var _sinf=env._sinf;
  var _sysconf=env._sysconf;
  var _glStencilOp=env._glStencilOp;
  var _glfwInit=env._glfwInit;
  var _glGenBuffers=env._glGenBuffers;
  var _glShaderSource=env._glShaderSource;
  var _pthread_cleanup_push=env._pthread_cleanup_push;
  var _tanf=env._tanf;
  var ___syscall140=env.___syscall140;
  var _glfwDestroyWindow=env._glfwDestroyWindow;
  var ___syscall146=env.___syscall146;
  var _pthread_cleanup_pop=env._pthread_cleanup_pop;
  var _glGenerateMipmap=env._glGenerateMipmap;
  var _glVertexAttribPointer=env._glVertexAttribPointer;
  var _glGetProgramInfoLog=env._glGetProgramInfoLog;
  var _atan2f=env._atan2f;
  var ___cxa_find_matching_catch=env.___cxa_find_matching_catch;
  var _glfwMakeContextCurrent=env._glfwMakeContextCurrent;
  var ___setErrNo=env.___setErrNo;
  var _glDeleteTextures=env._glDeleteTextures;
  var _glStencilOpSeparate=env._glStencilOpSeparate;
  var ___resumeException=env.___resumeException;
  var _glEnable=env._glEnable;
  var _glGenTextures=env._glGenTextures;
  var _emscripten_get_now=env._emscripten_get_now;
  var _glAttachShader=env._glAttachShader;
  var _glCreateProgram=env._glCreateProgram;
  var ___lock=env.___lock;
  var emscriptenWebGLGetTexPixelData=env.emscriptenWebGLGetTexPixelData;
  var ___syscall6=env.___syscall6;
  var _time=env._time;
  var _exit=env._exit;
  var _emscripten_asm_const_1=env._emscripten_asm_const_1;
  var _emscripten_asm_const_0=env._emscripten_asm_const_0;
  var _glCullFace=env._glCullFace;
  var _glfwPollEvents=env._glfwPollEvents;
  var ___cxa_allocate_exception=env.___cxa_allocate_exception;
  var _ceilf=env._ceilf;
  var _glfwGetFramebufferSize=env._glfwGetFramebufferSize;
  var _acosf=env._acosf;
  var _glBindTexture=env._glBindTexture;
  var _glFinish=env._glFinish;
  var _glUniform1i=env._glUniform1i;
  var _glDrawArrays=env._glDrawArrays;
  var _emscripten_memcpy_big=env._emscripten_memcpy_big;
  var _glGetError=env._glGetError;
  var _sqrtf=env._sqrtf;
  var _glActiveTexture=env._glActiveTexture;
  var _glfwSwapBuffers=env._glfwSwapBuffers;
  var _glfwTerminate=env._glfwTerminate;
  var _glFrontFace=env._glFrontFace;
  var _glCompileShader=env._glCompileShader;
  var _glEnableVertexAttribArray=env._glEnableVertexAttribArray;
  var _abort=env._abort;
  var _glDeleteBuffers=env._glDeleteBuffers;
  var _glBufferData=env._glBufferData;
  var _glTexImage2D=env._glTexImage2D;
  var _glDeleteShader=env._glDeleteShader;
  var _cosf=env._cosf;
  var _glGetProgramiv=env._glGetProgramiv;
  var emscriptenWebGLComputeImageSize=env.emscriptenWebGLComputeImageSize;
  var ___gxx_personality_v0=env.___gxx_personality_v0;
  var _glfwGetWindowSize=env._glfwGetWindowSize;
  var _glLinkProgram=env._glLinkProgram;
  var _glGetShaderiv=env._glGetShaderiv;
  var _glGetUniformLocation=env._glGetUniformLocation;
  var _glUniform4fv=env._glUniform4fv;
  var __exit=env.__exit;
  var _glBindAttribLocation=env._glBindAttribLocation;
  var _glPixelStorei=env._glPixelStorei;
  var _pthread_self=env._pthread_self;
  var _glfwGetCursorPos=env._glfwGetCursorPos;
  var ___syscall54=env.___syscall54;
  var ___unlock=env.___unlock;
  var _emscripten_set_main_loop=env._emscripten_set_main_loop;
  var ___cxa_throw=env.___cxa_throw;
  var _glColorMask=env._glColorMask;
  var _glDisable=env._glDisable;
  var _glTexParameteri=env._glTexParameteri;
  var _glStencilMask=env._glStencilMask;
  var _glCreateShader=env._glCreateShader;
  var _glTexSubImage2D=env._glTexSubImage2D;
  var tempFloat = 0.0;

// EMSCRIPTEN_START_FUNCS
function stackAlloc(size) {
  size = size|0;
  var ret = 0;
  ret = STACKTOP;
  STACKTOP = (STACKTOP + size)|0;
  STACKTOP = (STACKTOP + 15)&-16;

  return ret|0;
}
function stackSave() {
  return STACKTOP|0;
}
function stackRestore(top) {
  top = top|0;
  STACKTOP = top;
}
function establishStackSpace(stackBase, stackMax) {
  stackBase = stackBase|0;
  stackMax = stackMax|0;
  STACKTOP = stackBase;
  STACK_MAX = stackMax;
}

function setThrew(threw, value) {
  threw = threw|0;
  value = value|0;
  if ((__THREW__|0) == 0) {
    __THREW__ = threw;
    threwValue = value;
  }
}
function copyTempFloat(ptr) {
  ptr = ptr|0;
  HEAP8[tempDoublePtr>>0] = HEAP8[ptr>>0];
  HEAP8[tempDoublePtr+1>>0] = HEAP8[ptr+1>>0];
  HEAP8[tempDoublePtr+2>>0] = HEAP8[ptr+2>>0];
  HEAP8[tempDoublePtr+3>>0] = HEAP8[ptr+3>>0];
}
function copyTempDouble(ptr) {
  ptr = ptr|0;
  HEAP8[tempDoublePtr>>0] = HEAP8[ptr>>0];
  HEAP8[tempDoublePtr+1>>0] = HEAP8[ptr+1>>0];
  HEAP8[tempDoublePtr+2>>0] = HEAP8[ptr+2>>0];
  HEAP8[tempDoublePtr+3>>0] = HEAP8[ptr+3>>0];
  HEAP8[tempDoublePtr+4>>0] = HEAP8[ptr+4>>0];
  HEAP8[tempDoublePtr+5>>0] = HEAP8[ptr+5>>0];
  HEAP8[tempDoublePtr+6>>0] = HEAP8[ptr+6>>0];
  HEAP8[tempDoublePtr+7>>0] = HEAP8[ptr+7>>0];
}

function setTempRet0(value) {
  value = value|0;
  tempRet0 = value;
}
function getTempRet0() {
  return tempRet0|0;
}

function _nvgCreateGLES2($flags) {
 $flags = $flags|0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var $params = 0, dest = 0, label = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 64|0;
 $params = sp;
 $0 = (_malloc(128)|0);
 $1 = ($0|0)==(0|0);
 if (!($1)) {
  dest=$0; stop=dest+128|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
  dest=$params; stop=dest+52|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
  $2 = ((($params)) + 8|0);
  HEAP32[$2>>2] = 3;
  $3 = ((($params)) + 12|0);
  HEAP32[$3>>2] = 1;
  $4 = ((($params)) + 16|0);
  HEAP32[$4>>2] = 1;
  $5 = ((($params)) + 20|0);
  HEAP32[$5>>2] = 1;
  $6 = ((($params)) + 24|0);
  HEAP32[$6>>2] = 1;
  $7 = ((($params)) + 28|0);
  HEAP32[$7>>2] = 1;
  $8 = ((($params)) + 32|0);
  HEAP32[$8>>2] = 8;
  $9 = ((($params)) + 36|0);
  HEAP32[$9>>2] = 9;
  $10 = ((($params)) + 40|0);
  HEAP32[$10>>2] = 1;
  $11 = ((($params)) + 44|0);
  HEAP32[$11>>2] = 1;
  $12 = ((($params)) + 48|0);
  HEAP32[$12>>2] = 3;
  $13 = ((($params)) + 52|0);
  HEAP32[$13>>2] = 10;
  HEAP32[$params>>2] = $0;
  $14 = $flags & 1;
  $15 = ((($params)) + 4|0);
  HEAP32[$15>>2] = $14;
  $16 = ((($0)) + 56|0);
  HEAP32[$16>>2] = $flags;
  $17 = (_nvgCreateInternal($params)|0);
  $18 = ($17|0)==(0|0);
  if (!($18)) {
   $$0 = $17;
   STACKTOP = sp;return ($$0|0);
  }
 }
 $$0 = 0;
 STACKTOP = sp;return ($$0|0);
}
function __ZL19glnvg__renderCreatePv($uptr) {
 $uptr = $uptr|0;
 var $$0 = 0, $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 __ZL17glnvg__checkErrorP12GLNVGcontextPKc($uptr,13751);
 $0 = ((($uptr)) + 56|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = $1 & 1;
 $3 = ($2|0)==(0);
 if ($3) {
  $6 = (__ZL19glnvg__createShaderP11GLNVGshaderPKcS2_S2_S2_S2_($uptr,0)|0);
  $7 = ($6|0)==(0);
  if ($7) {
   $$0 = 0;
   return ($$0|0);
  }
 } else {
  $4 = (__ZL19glnvg__createShaderP11GLNVGshaderPKcS2_S2_S2_S2_($uptr,13763)|0);
  $5 = ($4|0)==(0);
  if ($5) {
   $$0 = 0;
   return ($$0|0);
  }
 }
 __ZL17glnvg__checkErrorP12GLNVGcontextPKc($uptr,13782);
 __ZL18glnvg__getUniformsP11GLNVGshader($uptr);
 $8 = ((($uptr)) + 48|0);
 _glGenBuffers(1,($8|0));
 $9 = ((($uptr)) + 52|0);
 HEAP32[$9>>2] = 180;
 __ZL17glnvg__checkErrorP12GLNVGcontextPKc($uptr,13800);
 _glFinish();
 $$0 = 1;
 return ($$0|0);
}
function __ZL26glnvg__renderCreateTexturePviiiiPKh($uptr,$type,$w,$h,$imageFlags,$data) {
 $uptr = $uptr|0;
 $type = $type|0;
 $w = $w|0;
 $h = $h|0;
 $imageFlags = $imageFlags|0;
 $data = $data|0;
 var $$0 = 0, $$01 = 0, $$1 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0;
 var $24 = 0, $25 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $vararg_buffer = 0, $vararg_buffer2 = 0, $vararg_ptr1 = 0, $vararg_ptr5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0;
 $vararg_buffer2 = sp + 8|0;
 $vararg_buffer = sp;
 $0 = (__ZL19glnvg__allocTextureP12GLNVGcontext($uptr)|0);
 $1 = ($0|0)==(0|0);
 if ($1) {
  $$0 = 0;
  STACKTOP = sp;return ($$0|0);
 }
 $2 = (__ZL18glnvg__nearestPow2j($w)|0);
 $3 = ($2|0)==($w|0);
 if ($3) {
  $4 = (__ZL18glnvg__nearestPow2j($h)|0);
  $5 = ($4|0)==($h|0);
  if ($5) {
   $$1 = $imageFlags;
  } else {
   label = 4;
  }
 } else {
  label = 4;
 }
 if ((label|0) == 4) {
  $6 = $imageFlags & 6;
  $7 = ($6|0)==(0);
  if ($7) {
   $$01 = $imageFlags;
  } else {
   HEAP32[$vararg_buffer>>2] = $w;
   $vararg_ptr1 = ((($vararg_buffer)) + 4|0);
   HEAP32[$vararg_ptr1>>2] = $h;
   (_printf(13917,$vararg_buffer)|0);
   $8 = $imageFlags & -7;
   $$01 = $8;
  }
  $9 = $$01 & 1;
  $10 = ($9|0)==(0);
  if ($10) {
   $$1 = $$01;
  } else {
   HEAP32[$vararg_buffer2>>2] = $w;
   $vararg_ptr5 = ((($vararg_buffer2)) + 4|0);
   HEAP32[$vararg_ptr5>>2] = $h;
   (_printf(13986,$vararg_buffer2)|0);
   $11 = $$01 & -2;
   $$1 = $11;
  }
 }
 $12 = ((($0)) + 4|0);
 _glGenTextures(1,($12|0));
 $13 = ((($0)) + 8|0);
 HEAP32[$13>>2] = $w;
 $14 = ((($0)) + 12|0);
 HEAP32[$14>>2] = $h;
 $15 = ((($0)) + 16|0);
 HEAP32[$15>>2] = $type;
 $16 = ((($0)) + 20|0);
 HEAP32[$16>>2] = $$1;
 $17 = HEAP32[$12>>2]|0;
 __ZL18glnvg__bindTextureP12GLNVGcontextj($uptr,$17);
 _glPixelStorei(3317,1);
 $18 = ($type|0)==(2);
 if ($18) {
  _glTexImage2D(3553,0,6408,($w|0),($h|0),0,6408,5121,($data|0));
 } else {
  _glTexImage2D(3553,0,6409,($w|0),($h|0),0,6409,5121,($data|0));
 }
 $19 = $$1 & 1;
 $20 = ($19|0)!=(0);
 if ($20) {
  _glTexParameteri(3553,10241,9987);
 } else {
  _glTexParameteri(3553,10241,9729);
 }
 _glTexParameteri(3553,10240,9729);
 $21 = $$1 & 2;
 $22 = ($21|0)==(0);
 if ($22) {
  _glTexParameteri(3553,10242,33071);
 } else {
  _glTexParameteri(3553,10242,10497);
 }
 $23 = $$1 & 4;
 $24 = ($23|0)==(0);
 if ($24) {
  _glTexParameteri(3553,10243,33071);
 } else {
  _glTexParameteri(3553,10243,10497);
 }
 _glPixelStorei(3317,4);
 if ($20) {
  _glGenerateMipmap(3553);
 }
 __ZL17glnvg__checkErrorP12GLNVGcontextPKc($uptr,14051);
 __ZL18glnvg__bindTextureP12GLNVGcontextj($uptr,0);
 $25 = HEAP32[$0>>2]|0;
 $$0 = $25;
 STACKTOP = sp;return ($$0|0);
}
function __ZL26glnvg__renderDeleteTexturePvi($uptr,$image) {
 $uptr = $uptr|0;
 $image = $image|0;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZL20glnvg__deleteTextureP12GLNVGcontexti($uptr,$image)|0);
 return ($0|0);
}
function __ZL26glnvg__renderUpdateTexturePviiiiiPKh($uptr,$image,$x,$y,$w,$h,$data) {
 $uptr = $uptr|0;
 $image = $image|0;
 $x = $x|0;
 $y = $y|0;
 $w = $w|0;
 $h = $h|0;
 $data = $data|0;
 var $$0 = 0, $$01 = 0, $$pn = 0, $0 = 0, $1 = 0, $10 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZL18glnvg__findTextureP12GLNVGcontexti($uptr,$image)|0);
 $1 = ($0|0)==(0|0);
 if ($1) {
  $$0 = 0;
  return ($$0|0);
 }
 $2 = ((($0)) + 4|0);
 $3 = HEAP32[$2>>2]|0;
 __ZL18glnvg__bindTextureP12GLNVGcontextj($uptr,$3);
 _glPixelStorei(3317,1);
 $4 = ((($0)) + 16|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = ($5|0)==(2);
 $7 = ((($0)) + 8|0);
 $8 = HEAP32[$7>>2]|0;
 $9 = Math_imul($8, $y)|0;
 $10 = $9 << 2;
 $$pn = $6 ? $10 : $9;
 $$01 = (($data) + ($$pn)|0);
 if ($6) {
  _glTexSubImage2D(3553,0,0,($y|0),($8|0),($h|0),6408,5121,($$01|0));
 } else {
  _glTexSubImage2D(3553,0,0,($y|0),($8|0),($h|0),6409,5121,($$01|0));
 }
 _glPixelStorei(3317,4);
 __ZL18glnvg__bindTextureP12GLNVGcontextj($uptr,0);
 $$0 = 1;
 return ($$0|0);
}
function __ZL27glnvg__renderGetTextureSizePviPiS0_($uptr,$image,$w,$h) {
 $uptr = $uptr|0;
 $image = $image|0;
 $w = $w|0;
 $h = $h|0;
 var $$0 = 0, $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZL18glnvg__findTextureP12GLNVGcontexti($uptr,$image)|0);
 $1 = ($0|0)==(0|0);
 if ($1) {
  $$0 = 0;
  return ($$0|0);
 }
 $2 = ((($0)) + 8|0);
 $3 = HEAP32[$2>>2]|0;
 HEAP32[$w>>2] = $3;
 $4 = ((($0)) + 12|0);
 $5 = HEAP32[$4>>2]|0;
 HEAP32[$h>>2] = $5;
 $$0 = 1;
 return ($$0|0);
}
function __ZL21glnvg__renderViewportPvii($uptr,$width,$height) {
 $uptr = $uptr|0;
 $width = $width|0;
 $height = $height|0;
 var $0 = 0.0, $1 = 0, $2 = 0.0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+($width|0));
 $1 = ((($uptr)) + 28|0);
 HEAPF32[$1>>2] = $0;
 $2 = (+($height|0));
 $3 = ((($uptr)) + 32|0);
 HEAPF32[$3>>2] = $2;
 return;
}
function __ZL19glnvg__renderCancelPv($uptr) {
 $uptr = $uptr|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($uptr)) + 92|0);
 HEAP32[$0>>2] = 0;
 $1 = ((($uptr)) + 80|0);
 HEAP32[$1>>2] = 0;
 $2 = ((($uptr)) + 68|0);
 HEAP32[$2>>2] = 0;
 $3 = ((($uptr)) + 104|0);
 HEAP32[$3>>2] = 0;
 return;
}
function __ZL18glnvg__renderFlushPv($uptr) {
 $uptr = $uptr|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $i$01 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($uptr)) + 68|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)>(0);
 if (!($2)) {
  $30 = ((($uptr)) + 92|0);
  HEAP32[$30>>2] = 0;
  $31 = ((($uptr)) + 80|0);
  HEAP32[$31>>2] = 0;
  HEAP32[$0>>2] = 0;
  $32 = ((($uptr)) + 104|0);
  HEAP32[$32>>2] = 0;
  return;
 }
 $3 = HEAP32[$uptr>>2]|0;
 _glUseProgram(($3|0));
 _glBlendFunc(1,771);
 _glEnable(2884);
 _glCullFace(1029);
 _glFrontFace(2305);
 _glEnable(3042);
 _glDisable(2929);
 _glDisable(3089);
 _glColorMask(1,1,1,1);
 _glStencilMask(-1);
 _glStencilOp(7680,7680,7680);
 _glStencilFunc(519,0,-1);
 _glActiveTexture(33984);
 _glBindTexture(3553,0);
 $4 = ((($uptr)) + 108|0);
 HEAP32[$4>>2] = 0;
 $5 = ((($uptr)) + 112|0);
 HEAP32[$5>>2] = -1;
 $6 = ((($uptr)) + 116|0);
 HEAP32[$6>>2] = 519;
 $7 = ((($uptr)) + 120|0);
 HEAP32[$7>>2] = 0;
 $8 = ((($uptr)) + 124|0);
 HEAP32[$8>>2] = -1;
 $9 = ((($uptr)) + 48|0);
 $10 = HEAP32[$9>>2]|0;
 _glBindBuffer(34962,($10|0));
 $11 = ((($uptr)) + 92|0);
 $12 = HEAP32[$11>>2]|0;
 $13 = $12 << 4;
 $14 = ((($uptr)) + 84|0);
 $15 = HEAP32[$14>>2]|0;
 _glBufferData(34962,($13|0),($15|0),35040);
 _glEnableVertexAttribArray(0);
 _glEnableVertexAttribArray(1);
 _glVertexAttribPointer(0,2,5126,0,16,(0|0));
 _glVertexAttribPointer(1,2,5126,0,16,((8)|0));
 $16 = ((($uptr)) + 12|0);
 $17 = ((($uptr)) + 16|0);
 $18 = HEAP32[$17>>2]|0;
 _glUniform1i(($18|0),0);
 $19 = HEAP32[$16>>2]|0;
 $20 = ((($uptr)) + 28|0);
 _glUniform2fv(($19|0),1,($20|0));
 $21 = HEAP32[$0>>2]|0;
 $22 = ($21|0)>(0);
 L4: do {
  if ($22) {
   $23 = ((($uptr)) + 60|0);
   $i$01 = 0;
   while(1) {
    $24 = HEAP32[$23>>2]|0;
    $25 = (($24) + (($i$01*28)|0)|0);
    $26 = HEAP32[$25>>2]|0;
    switch ($26|0) {
    case 1:  {
     __ZL11glnvg__fillP12GLNVGcontextP9GLNVGcall($uptr,$25);
     break;
    }
    case 2:  {
     __ZL17glnvg__convexFillP12GLNVGcontextP9GLNVGcall($uptr,$25);
     break;
    }
    case 3:  {
     __ZL13glnvg__strokeP12GLNVGcontextP9GLNVGcall($uptr,$25);
     break;
    }
    case 4:  {
     __ZL16glnvg__trianglesP12GLNVGcontextP9GLNVGcall($uptr,$25);
     break;
    }
    default: {
    }
    }
    $27 = (($i$01) + 1)|0;
    $28 = HEAP32[$0>>2]|0;
    $29 = ($27|0)<($28|0);
    if ($29) {
     $i$01 = $27;
    } else {
     break L4;
    }
   }
  }
 } while(0);
 _glDisableVertexAttribArray(0);
 _glDisableVertexAttribArray(1);
 _glDisable(2884);
 _glBindBuffer(34962,0);
 _glUseProgram(0);
 __ZL18glnvg__bindTextureP12GLNVGcontextj($uptr,0);
 $30 = ((($uptr)) + 92|0);
 HEAP32[$30>>2] = 0;
 $31 = ((($uptr)) + 80|0);
 HEAP32[$31>>2] = 0;
 HEAP32[$0>>2] = 0;
 $32 = ((($uptr)) + 104|0);
 HEAP32[$32>>2] = 0;
 return;
}
function __ZL17glnvg__renderFillPvP8NVGpaintP10NVGscissorfPKfPK7NVGpathi($uptr,$paint,$scissor,$fringe,$bounds,$paths,$npaths) {
 $uptr = $uptr|0;
 $paint = $paint|0;
 $scissor = $scissor|0;
 $fringe = +$fringe;
 $bounds = $bounds|0;
 $paths = $paths|0;
 $npaths = $npaths|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0.0, $59 = 0, $6 = 0, $60 = 0.0, $61 = 0, $62 = 0;
 var $63 = 0.0, $64 = 0.0, $65 = 0, $66 = 0.0, $67 = 0, $68 = 0.0, $69 = 0, $7 = 0, $70 = 0.0, $71 = 0.0, $72 = 0, $73 = 0.0, $74 = 0.0, $75 = 0, $76 = 0.0, $77 = 0.0, $78 = 0, $79 = 0, $8 = 0, $80 = 0;
 var $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $exitcond = 0;
 var $i$02 = 0, $offset$0$lcssa = 0, $offset$01 = 0, $offset$1 = 0, $offset$2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZL16glnvg__allocCallP12GLNVGcontext($uptr)|0);
 $1 = ($0|0)==(0|0);
 if ($1) {
  return;
 }
 HEAP32[$0>>2] = 1;
 $2 = (__ZL17glnvg__allocPathsP12GLNVGcontexti($uptr,$npaths)|0);
 $3 = ((($0)) + 8|0);
 HEAP32[$3>>2] = $2;
 $4 = ($2|0)==(-1);
 do {
  if (!($4)) {
   $5 = ((($0)) + 12|0);
   HEAP32[$5>>2] = $npaths;
   $6 = ((($paint)) + 72|0);
   $7 = HEAP32[$6>>2]|0;
   $8 = ((($0)) + 4|0);
   HEAP32[$8>>2] = $7;
   $9 = ($npaths|0)==(1);
   if ($9) {
    $10 = ((($paths)) + 36|0);
    $11 = HEAP32[$10>>2]|0;
    $12 = ($11|0)==(0);
    if (!($12)) {
     HEAP32[$0>>2] = 2;
    }
   }
   $13 = (__ZL19glnvg__maxVertCountPK7NVGpathi($paths,$npaths)|0);
   $14 = (($13) + 6)|0;
   $15 = (__ZL17glnvg__allocVertsP12GLNVGcontexti($uptr,$14)|0);
   $16 = ($15|0)==(-1);
   if (!($16)) {
    $17 = ($npaths|0)>(0);
    if ($17) {
     $18 = ((($uptr)) + 72|0);
     $19 = ((($uptr)) + 84|0);
     $20 = ((($uptr)) + 84|0);
     $i$02 = 0;$offset$01 = $15;
     while(1) {
      $21 = HEAP32[$3>>2]|0;
      $22 = (($21) + ($i$02))|0;
      $23 = HEAP32[$18>>2]|0;
      $24 = (($23) + ($22<<4)|0);
      ;HEAP32[$24>>2]=0|0;HEAP32[$24+4>>2]=0|0;HEAP32[$24+8>>2]=0|0;HEAP32[$24+12>>2]=0|0;
      $25 = (((($paths) + (($i$02*40)|0)|0)) + 20|0);
      $26 = HEAP32[$25>>2]|0;
      $27 = ($26|0)>(0);
      if ($27) {
       HEAP32[$24>>2] = $offset$01;
       $28 = HEAP32[$25>>2]|0;
       $29 = (((($23) + ($22<<4)|0)) + 4|0);
       HEAP32[$29>>2] = $28;
       $30 = HEAP32[$19>>2]|0;
       $31 = (($30) + ($offset$01<<4)|0);
       $32 = (((($paths) + (($i$02*40)|0)|0)) + 16|0);
       $33 = HEAP32[$32>>2]|0;
       $34 = HEAP32[$25>>2]|0;
       $35 = $34 << 4;
       _memcpy(($31|0),($33|0),($35|0))|0;
       $36 = HEAP32[$25>>2]|0;
       $37 = (($36) + ($offset$01))|0;
       $offset$1 = $37;
      } else {
       $offset$1 = $offset$01;
      }
      $38 = (((($paths) + (($i$02*40)|0)|0)) + 28|0);
      $39 = HEAP32[$38>>2]|0;
      $40 = ($39|0)>(0);
      if ($40) {
       $41 = (((($23) + ($22<<4)|0)) + 8|0);
       HEAP32[$41>>2] = $offset$1;
       $42 = HEAP32[$38>>2]|0;
       $43 = (((($23) + ($22<<4)|0)) + 12|0);
       HEAP32[$43>>2] = $42;
       $44 = HEAP32[$20>>2]|0;
       $45 = (($44) + ($offset$1<<4)|0);
       $46 = (((($paths) + (($i$02*40)|0)|0)) + 24|0);
       $47 = HEAP32[$46>>2]|0;
       $48 = HEAP32[$38>>2]|0;
       $49 = $48 << 4;
       _memcpy(($45|0),($47|0),($49|0))|0;
       $50 = HEAP32[$38>>2]|0;
       $51 = (($50) + ($offset$1))|0;
       $offset$2 = $51;
      } else {
       $offset$2 = $offset$1;
      }
      $52 = (($i$02) + 1)|0;
      $exitcond = ($52|0)==($npaths|0);
      if ($exitcond) {
       $offset$0$lcssa = $offset$2;
       break;
      } else {
       $i$02 = $52;$offset$01 = $offset$2;
      }
     }
    } else {
     $offset$0$lcssa = $15;
    }
    $53 = ((($0)) + 16|0);
    HEAP32[$53>>2] = $offset$0$lcssa;
    $54 = ((($0)) + 20|0);
    HEAP32[$54>>2] = 6;
    $55 = ((($uptr)) + 84|0);
    $56 = HEAP32[$55>>2]|0;
    $57 = (($56) + ($offset$0$lcssa<<4)|0);
    $58 = +HEAPF32[$bounds>>2];
    $59 = ((($bounds)) + 12|0);
    $60 = +HEAPF32[$59>>2];
    __ZL11glnvg__vsetP9NVGvertexffff($57,$58,$60);
    $61 = ((($57)) + 16|0);
    $62 = ((($bounds)) + 8|0);
    $63 = +HEAPF32[$62>>2];
    $64 = +HEAPF32[$59>>2];
    __ZL11glnvg__vsetP9NVGvertexffff($61,$63,$64);
    $65 = ((($57)) + 32|0);
    $66 = +HEAPF32[$62>>2];
    $67 = ((($bounds)) + 4|0);
    $68 = +HEAPF32[$67>>2];
    __ZL11glnvg__vsetP9NVGvertexffff($65,$66,$68);
    $69 = ((($57)) + 48|0);
    $70 = +HEAPF32[$bounds>>2];
    $71 = +HEAPF32[$59>>2];
    __ZL11glnvg__vsetP9NVGvertexffff($69,$70,$71);
    $72 = ((($57)) + 64|0);
    $73 = +HEAPF32[$62>>2];
    $74 = +HEAPF32[$67>>2];
    __ZL11glnvg__vsetP9NVGvertexffff($72,$73,$74);
    $75 = ((($57)) + 80|0);
    $76 = +HEAPF32[$bounds>>2];
    $77 = +HEAPF32[$67>>2];
    __ZL11glnvg__vsetP9NVGvertexffff($75,$76,$77);
    $78 = HEAP32[$0>>2]|0;
    $79 = ($78|0)==(1);
    if ($79) {
     $80 = (__ZL24glnvg__allocFragUniformsP12GLNVGcontexti($uptr,2)|0);
     $81 = ((($0)) + 24|0);
     HEAP32[$81>>2] = $80;
     $82 = ($80|0)==(-1);
     if ($82) {
      break;
     }
     $83 = (__ZL19nvg__fragUniformPtrP12GLNVGcontexti($uptr,$80)|0);
     _memset(($83|0),0,172)|0;
     $84 = ((($83)) + 164|0);
     HEAPF32[$84>>2] = -1.0;
     $85 = ((($83)) + 172|0);
     HEAPF32[$85>>2] = 2.0;
     $86 = HEAP32[$81>>2]|0;
     $87 = ((($uptr)) + 52|0);
     $88 = HEAP32[$87>>2]|0;
     $89 = (($88) + ($86))|0;
     $90 = (__ZL19nvg__fragUniformPtrP12GLNVGcontexti($uptr,$89)|0);
     __ZL19glnvg__convertPaintP12GLNVGcontextP17GLNVGfragUniformsP8NVGpaintP10NVGscissorfff($uptr,$90,$paint,$scissor,$fringe,$fringe,-1.0);
     return;
    } else {
     $91 = (__ZL24glnvg__allocFragUniformsP12GLNVGcontexti($uptr,1)|0);
     $92 = ((($0)) + 24|0);
     HEAP32[$92>>2] = $91;
     $93 = ($91|0)==(-1);
     if ($93) {
      break;
     }
     $94 = (__ZL19nvg__fragUniformPtrP12GLNVGcontexti($uptr,$91)|0);
     __ZL19glnvg__convertPaintP12GLNVGcontextP17GLNVGfragUniformsP8NVGpaintP10NVGscissorfff($uptr,$94,$paint,$scissor,$fringe,$fringe,-1.0);
     return;
    }
   }
  }
 } while(0);
 $95 = ((($uptr)) + 68|0);
 $96 = HEAP32[$95>>2]|0;
 $97 = ($96|0)>(0);
 if (!($97)) {
  return;
 }
 $98 = (($96) + -1)|0;
 HEAP32[$95>>2] = $98;
 return;
}
function __ZL19glnvg__renderStrokePvP8NVGpaintP10NVGscissorffPK7NVGpathi($uptr,$paint,$scissor,$fringe,$strokeWidth,$paths,$npaths) {
 $uptr = $uptr|0;
 $paint = $paint|0;
 $scissor = $scissor|0;
 $fringe = +$fringe;
 $strokeWidth = +$strokeWidth;
 $paths = $paths|0;
 $npaths = $npaths|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $exitcond = 0, $i$02 = 0, $offset$01 = 0, $offset$1 = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 $0 = (__ZL16glnvg__allocCallP12GLNVGcontext($uptr)|0);
 $1 = ($0|0)==(0|0);
 if ($1) {
  return;
 }
 HEAP32[$0>>2] = 3;
 $2 = (__ZL17glnvg__allocPathsP12GLNVGcontexti($uptr,$npaths)|0);
 $3 = ((($0)) + 8|0);
 HEAP32[$3>>2] = $2;
 $4 = ($2|0)==(-1);
 do {
  if (!($4)) {
   $5 = ((($0)) + 12|0);
   HEAP32[$5>>2] = $npaths;
   $6 = ((($paint)) + 72|0);
   $7 = HEAP32[$6>>2]|0;
   $8 = ((($0)) + 4|0);
   HEAP32[$8>>2] = $7;
   $9 = (__ZL19glnvg__maxVertCountPK7NVGpathi($paths,$npaths)|0);
   $10 = (__ZL17glnvg__allocVertsP12GLNVGcontexti($uptr,$9)|0);
   $11 = ($10|0)==(-1);
   if (!($11)) {
    $12 = ($npaths|0)>(0);
    if ($12) {
     $13 = ((($uptr)) + 72|0);
     $14 = ((($uptr)) + 84|0);
     $i$02 = 0;$offset$01 = $10;
     while(1) {
      $15 = HEAP32[$3>>2]|0;
      $16 = (($15) + ($i$02))|0;
      $17 = HEAP32[$13>>2]|0;
      $18 = (($17) + ($16<<4)|0);
      ;HEAP32[$18>>2]=0|0;HEAP32[$18+4>>2]=0|0;HEAP32[$18+8>>2]=0|0;HEAP32[$18+12>>2]=0|0;
      $19 = (((($paths) + (($i$02*40)|0)|0)) + 28|0);
      $20 = HEAP32[$19>>2]|0;
      $21 = ($20|0)==(0);
      if ($21) {
       $offset$1 = $offset$01;
      } else {
       $22 = (((($17) + ($16<<4)|0)) + 8|0);
       HEAP32[$22>>2] = $offset$01;
       $23 = HEAP32[$19>>2]|0;
       $24 = (((($17) + ($16<<4)|0)) + 12|0);
       HEAP32[$24>>2] = $23;
       $25 = HEAP32[$14>>2]|0;
       $26 = (($25) + ($offset$01<<4)|0);
       $27 = (((($paths) + (($i$02*40)|0)|0)) + 24|0);
       $28 = HEAP32[$27>>2]|0;
       $29 = HEAP32[$19>>2]|0;
       $30 = $29 << 4;
       _memcpy(($26|0),($28|0),($30|0))|0;
       $31 = HEAP32[$19>>2]|0;
       $32 = (($31) + ($offset$01))|0;
       $offset$1 = $32;
      }
      $33 = (($i$02) + 1)|0;
      $exitcond = ($33|0)==($npaths|0);
      if ($exitcond) {
       break;
      } else {
       $i$02 = $33;$offset$01 = $offset$1;
      }
     }
    }
    $34 = ((($uptr)) + 56|0);
    $35 = HEAP32[$34>>2]|0;
    $36 = $35 & 2;
    $37 = ($36|0)==(0);
    if ($37) {
     $47 = (__ZL24glnvg__allocFragUniformsP12GLNVGcontexti($uptr,1)|0);
     $48 = ((($0)) + 24|0);
     HEAP32[$48>>2] = $47;
     $49 = ($47|0)==(-1);
     if ($49) {
      break;
     }
     $50 = (__ZL19nvg__fragUniformPtrP12GLNVGcontexti($uptr,$47)|0);
     __ZL19glnvg__convertPaintP12GLNVGcontextP17GLNVGfragUniformsP8NVGpaintP10NVGscissorfff($uptr,$50,$paint,$scissor,$strokeWidth,$fringe,-1.0);
     return;
    } else {
     $38 = (__ZL24glnvg__allocFragUniformsP12GLNVGcontexti($uptr,2)|0);
     $39 = ((($0)) + 24|0);
     HEAP32[$39>>2] = $38;
     $40 = ($38|0)==(-1);
     if ($40) {
      break;
     }
     $41 = (__ZL19nvg__fragUniformPtrP12GLNVGcontexti($uptr,$38)|0);
     __ZL19glnvg__convertPaintP12GLNVGcontextP17GLNVGfragUniformsP8NVGpaintP10NVGscissorfff($uptr,$41,$paint,$scissor,$strokeWidth,$fringe,-1.0);
     $42 = HEAP32[$39>>2]|0;
     $43 = ((($uptr)) + 52|0);
     $44 = HEAP32[$43>>2]|0;
     $45 = (($44) + ($42))|0;
     $46 = (__ZL19nvg__fragUniformPtrP12GLNVGcontexti($uptr,$45)|0);
     __ZL19glnvg__convertPaintP12GLNVGcontextP17GLNVGfragUniformsP8NVGpaintP10NVGscissorfff($uptr,$46,$paint,$scissor,$strokeWidth,$fringe,0.99803918600082397);
     return;
    }
   }
  }
 } while(0);
 $51 = ((($uptr)) + 68|0);
 $52 = HEAP32[$51>>2]|0;
 $53 = ($52|0)>(0);
 if (!($53)) {
  return;
 }
 $54 = (($52) + -1)|0;
 HEAP32[$51>>2] = $54;
 return;
}
function __ZL22glnvg__renderTrianglesPvP8NVGpaintP10NVGscissorPK9NVGvertexi($uptr,$paint,$scissor,$verts,$nverts) {
 $uptr = $uptr|0;
 $paint = $paint|0;
 $scissor = $scissor|0;
 $verts = $verts|0;
 $nverts = $nverts|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0;
 var $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZL16glnvg__allocCallP12GLNVGcontext($uptr)|0);
 $1 = ($0|0)==(0|0);
 if ($1) {
  return;
 }
 HEAP32[$0>>2] = 4;
 $2 = ((($paint)) + 72|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = ((($0)) + 4|0);
 HEAP32[$4>>2] = $3;
 $5 = (__ZL17glnvg__allocVertsP12GLNVGcontexti($uptr,$nverts)|0);
 $6 = ((($0)) + 16|0);
 HEAP32[$6>>2] = $5;
 $7 = ($5|0)==(-1);
 if (!($7)) {
  $8 = ((($0)) + 20|0);
  HEAP32[$8>>2] = $nverts;
  $9 = HEAP32[$6>>2]|0;
  $10 = ((($uptr)) + 84|0);
  $11 = HEAP32[$10>>2]|0;
  $12 = (($11) + ($9<<4)|0);
  $13 = $nverts << 4;
  _memcpy(($12|0),($verts|0),($13|0))|0;
  $14 = (__ZL24glnvg__allocFragUniformsP12GLNVGcontexti($uptr,1)|0);
  $15 = ((($0)) + 24|0);
  HEAP32[$15>>2] = $14;
  $16 = ($14|0)==(-1);
  if (!($16)) {
   $17 = (__ZL19nvg__fragUniformPtrP12GLNVGcontexti($uptr,$14)|0);
   __ZL19glnvg__convertPaintP12GLNVGcontextP17GLNVGfragUniformsP8NVGpaintP10NVGscissorfff($uptr,$17,$paint,$scissor,1.0,1.0,-1.0);
   $18 = ((($17)) + 172|0);
   HEAPF32[$18>>2] = 3.0;
   return;
  }
 }
 $19 = ((($uptr)) + 68|0);
 $20 = HEAP32[$19>>2]|0;
 $21 = ($20|0)>(0);
 if (!($21)) {
  return;
 }
 $22 = (($20) + -1)|0;
 HEAP32[$19>>2] = $22;
 return;
}
function __ZL19glnvg__renderDeletePv($uptr) {
 $uptr = $uptr|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $i$01 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($uptr|0)==(0|0);
 if ($0) {
  return;
 }
 __ZL19glnvg__deleteShaderP11GLNVGshader($uptr);
 $1 = ((($uptr)) + 48|0);
 $2 = HEAP32[$1>>2]|0;
 $3 = ($2|0)==(0);
 if (!($3)) {
  _glDeleteBuffers(1,($1|0));
 }
 $4 = ((($uptr)) + 36|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = ($5|0)>(0);
 $7 = ((($uptr)) + 24|0);
 if ($6) {
  $i$01 = 0;
  while(1) {
   $8 = HEAP32[$7>>2]|0;
   $9 = (((($8) + (($i$01*24)|0)|0)) + 4|0);
   $10 = HEAP32[$9>>2]|0;
   $11 = ($10|0)==(0);
   if (!($11)) {
    $12 = (((($8) + (($i$01*24)|0)|0)) + 20|0);
    $13 = HEAP32[$12>>2]|0;
    $14 = $13 & 65536;
    $15 = ($14|0)==(0);
    if ($15) {
     _glDeleteTextures(1,($9|0));
    }
   }
   $16 = (($i$01) + 1)|0;
   $17 = HEAP32[$4>>2]|0;
   $18 = ($16|0)<($17|0);
   if ($18) {
    $i$01 = $16;
   } else {
    break;
   }
  }
 }
 $19 = HEAP32[$7>>2]|0;
 _free($19);
 $20 = ((($uptr)) + 72|0);
 $21 = HEAP32[$20>>2]|0;
 _free($21);
 $22 = ((($uptr)) + 84|0);
 $23 = HEAP32[$22>>2]|0;
 _free($23);
 $24 = ((($uptr)) + 96|0);
 $25 = HEAP32[$24>>2]|0;
 _free($25);
 $26 = ((($uptr)) + 60|0);
 $27 = HEAP32[$26>>2]|0;
 _free($27);
 _free($uptr);
 return;
}
function _nvgDeleteGLES2($ctx) {
 $ctx = $ctx|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 _nvgDeleteInternal($ctx);
 return;
}
function __ZL19glnvg__allocTextureP12GLNVGcontext($gl) {
 $gl = $gl|0;
 var $$1 = 0, $$lcssa = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0;
 var $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $i$04 = 0, $tex$1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($gl)) + 36|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)>(0);
 L1: do {
  if ($2) {
   $3 = ((($gl)) + 24|0);
   $4 = HEAP32[$3>>2]|0;
   $i$04 = 0;
   while(1) {
    $8 = (($4) + (($i$04*24)|0)|0);
    $9 = HEAP32[$8>>2]|0;
    $10 = ($9|0)==(0);
    $7 = (($i$04) + 1)|0;
    if ($10) {
     $$lcssa = $8;
     break;
    }
    $5 = HEAP32[$0>>2]|0;
    $6 = ($7|0)<($5|0);
    if ($6) {
     $i$04 = $7;
    } else {
     label = 6;
     break L1;
    }
   }
   $11 = ($$lcssa|0)==(0|0);
   if ($11) {
    label = 6;
   } else {
    $tex$1 = $$lcssa;
   }
  } else {
   label = 6;
  }
 } while(0);
 if ((label|0) == 6) {
  $12 = HEAP32[$0>>2]|0;
  $13 = ((($gl)) + 40|0);
  $14 = HEAP32[$13>>2]|0;
  $15 = ($12|0)<($14|0);
  do {
   if (!($15)) {
    $16 = (($12) + 1)|0;
    $17 = (__ZL11glnvg__maxiii($16,4)|0);
    $18 = (($14|0) / 2)&-1;
    $19 = (($17) + ($18))|0;
    $20 = ((($gl)) + 24|0);
    $21 = HEAP32[$20>>2]|0;
    $22 = ($19*24)|0;
    $23 = (_realloc($21,$22)|0);
    $24 = ($23|0)==(0|0);
    if ($24) {
     $$1 = 0;
     return ($$1|0);
    } else {
     HEAP32[$20>>2] = $23;
     HEAP32[$13>>2] = $19;
     break;
    }
   }
  } while(0);
  $25 = HEAP32[$0>>2]|0;
  $26 = (($25) + 1)|0;
  HEAP32[$0>>2] = $26;
  $27 = ((($gl)) + 24|0);
  $28 = HEAP32[$27>>2]|0;
  $29 = (($28) + (($25*24)|0)|0);
  $tex$1 = $29;
 }
 ;HEAP32[$tex$1>>2]=0|0;HEAP32[$tex$1+4>>2]=0|0;HEAP32[$tex$1+8>>2]=0|0;HEAP32[$tex$1+12>>2]=0|0;HEAP32[$tex$1+16>>2]=0|0;HEAP32[$tex$1+20>>2]=0|0;
 $30 = ((($gl)) + 44|0);
 $31 = HEAP32[$30>>2]|0;
 $32 = (($31) + 1)|0;
 HEAP32[$30>>2] = $32;
 HEAP32[$tex$1>>2] = $32;
 $$1 = $tex$1;
 return ($$1|0);
}
function __ZL18glnvg__findTextureP12GLNVGcontexti($gl,$id) {
 $gl = $gl|0;
 $id = $id|0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $i$01 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($gl)) + 36|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)>(0);
 if (!($2)) {
  $$0 = 0;
  return ($$0|0);
 }
 $3 = ((($gl)) + 24|0);
 $4 = HEAP32[$3>>2]|0;
 $i$01 = 0;
 while(1) {
  $8 = (($4) + (($i$01*24)|0)|0);
  $9 = HEAP32[$8>>2]|0;
  $10 = ($9|0)==($id|0);
  $7 = (($i$01) + 1)|0;
  if ($10) {
   $$0 = $8;
   label = 5;
   break;
  }
  $5 = HEAP32[$0>>2]|0;
  $6 = ($7|0)<($5|0);
  if ($6) {
   $i$01 = $7;
  } else {
   $$0 = 0;
   label = 5;
   break;
  }
 }
 if ((label|0) == 5) {
  return ($$0|0);
 }
 return (0)|0;
}
function __ZN13NanoVGContextC2Eii($this,$rWidth,$rHeight) {
 $this = $this|0;
 $rWidth = $rWidth|0;
 $rHeight = $rHeight|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 (_glfwInit()|0);
 _rgba_init();
 $0 = ((($this)) + 28|0);
 HEAP32[$0>>2] = $rWidth;
 $1 = ((($this)) + 32|0);
 HEAP32[$1>>2] = $rHeight;
 $2 = (_glfwCreateWindow(($rWidth|0),($rHeight|0),(8616|0),(0|0),(0|0))|0);
 HEAP32[23] = $2;
 _glfwMakeContextCurrent(($2|0));
 $3 = (_nvgCreateGLES2(1)|0);
 HEAP32[22] = $3;
 $4 = ((($this)) + 44|0);
 HEAP32[$4>>2] = 0;
 HEAPF32[$this>>2] = 1.0;
 $5 = ((($this)) + 48|0);
 HEAP8[$5>>0] = 0;
 return;
}
function __ZN13NanoVGContextD2Ev($this) {
 $this = $this|0;
 var $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[22]|0;
 _nvgDeleteGLES2($0);
 _glfwTerminate();
 $1 = HEAP32[23]|0;
 _glfwDestroyWindow(($1|0));
 return;
}
function __ZN13NanoVGContext11glBeginLoopEv($this) {
 $this = $this|0;
 var $0 = 0, $1 = 0, $10 = 0.0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0.0, $8 = 0, $9 = 0.0, $fbHeight = 0, $fbWidth = 0, $mx = 0, $my = 0;
 var $winHeight = 0, $winWidth = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0;
 $mx = sp + 8|0;
 $my = sp;
 $winWidth = sp + 28|0;
 $winHeight = sp + 24|0;
 $fbWidth = sp + 20|0;
 $fbHeight = sp + 16|0;
 $0 = ((($this)) + 48|0);
 $1 = HEAP8[$0>>0]|0;
 $2 = ($1<<24>>24)==(0);
 if (!($2)) {
  STACKTOP = sp;return;
 }
 HEAP8[$0>>0] = 1;
 $3 = HEAP32[23]|0;
 _glfwGetCursorPos(($3|0),($mx|0),($my|0));
 $4 = HEAP32[23]|0;
 _glfwGetWindowSize(($4|0),($winWidth|0),($winHeight|0));
 $5 = HEAP32[23]|0;
 _glfwGetFramebufferSize(($5|0),($fbWidth|0),($fbHeight|0));
 $6 = HEAP32[$fbWidth>>2]|0;
 $7 = (+($6|0));
 $8 = HEAP32[$winWidth>>2]|0;
 $9 = (+($8|0));
 $10 = $7 / $9;
 $11 = HEAP32[22]|0;
 $12 = ((($this)) + 28|0);
 $13 = HEAP32[$12>>2]|0;
 $14 = ((($this)) + 32|0);
 $15 = HEAP32[$14>>2]|0;
 _nvgBeginFrame($11,$13,$15,$10);
 STACKTOP = sp;return;
}
function __ZN13NanoVGContext9glEndLoopEv($this) {
 $this = $this|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($this)) + 48|0);
 $1 = HEAP8[$0>>0]|0;
 $2 = ($1<<24>>24)==(0);
 if ($2) {
  return;
 }
 HEAP8[$0>>0] = 0;
 $3 = HEAP32[22]|0;
 _nvgEndFrame($3);
 $4 = HEAP32[23]|0;
 _glfwSwapBuffers(($4|0));
 _glfwPollEvents();
 return;
}
function __ZN13NanoVGContext4saveEv($this) {
 $this = $this|0;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[22]|0;
 _nvgSave($0);
 return;
}
function __ZN13NanoVGContext7restoreEv($this) {
 $this = $this|0;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[22]|0;
 _nvgRestore($0);
 return;
}
function __ZN13NanoVGContext9translateEii($this,$x,$y) {
 $this = $this|0;
 $x = $x|0;
 $y = $y|0;
 var $0 = 0, $1 = 0.0, $2 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[22]|0;
 $1 = (+($x|0));
 $2 = (+($y|0));
 _nvgTranslate($0,$1,$2);
 return;
}
function __ZN13NanoVGContext22createTextureFromImageEii($this,$sWidth,$sHeight) {
 $this = $this|0;
 $sWidth = $sWidth|0;
 $sHeight = $sHeight|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[22]|0;
 $1 = HEAP32[$0>>2]|0;
 $2 = (__ZL21renderCreateTextureJSPviiii($1,$sWidth,$sHeight)|0);
 $3 = ((($this)) + 36|0);
 HEAP32[$3>>2] = $2;
 return ($2|0);
}
function __ZL21renderCreateTextureJSPviiii($uptr,$w,$h) {
 $uptr = $uptr|0;
 $w = $w|0;
 $h = $h|0;
 var $$0 = 0, $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZL19glnvg__allocTextureP12GLNVGcontext($uptr)|0);
 $1 = ($0|0)==(0|0);
 if ($1) {
  $$0 = 0;
  return ($$0|0);
 }
 $2 = ((($0)) + 4|0);
 _glGenTextures(1,($2|0));
 $3 = ((($0)) + 8|0);
 HEAP32[$3>>2] = $w;
 $4 = ((($0)) + 12|0);
 HEAP32[$4>>2] = $h;
 $5 = ((($0)) + 16|0);
 HEAP32[$5>>2] = 2;
 $6 = ((($0)) + 20|0);
 HEAP32[$6>>2] = 0;
 $7 = HEAP32[$2>>2]|0;
 __ZL18glnvg__bindTextureP12GLNVGcontextj($uptr,$7);
 _glPixelStorei(3317,1);
 _emscripten_asm_const_0(0);
 _glTexParameteri(3553,10241,9729);
 _glTexParameteri(3553,10240,9729);
 _glTexParameteri(3553,10242,33071);
 _glTexParameteri(3553,10243,33071);
 _glPixelStorei(3317,4);
 __ZL17glnvg__checkErrorP12GLNVGcontextPKc($uptr,14051);
 __ZL18glnvg__bindTextureP12GLNVGcontextj($uptr,0);
 $8 = HEAP32[$0>>2]|0;
 $$0 = $8;
 return ($$0|0);
}
function __ZN13NanoVGContext21createTextureFromTextEii($this,$sWidth,$sHeight) {
 $this = $this|0;
 $sWidth = $sWidth|0;
 $sHeight = $sHeight|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[22]|0;
 $1 = HEAP32[$0>>2]|0;
 $2 = (__ZL25renderCreateTextTextureJSPviiii($1,$sWidth,$sHeight)|0);
 $3 = ((($this)) + 40|0);
 HEAP32[$3>>2] = $2;
 return ($2|0);
}
function __ZL25renderCreateTextTextureJSPviiii($uptr,$w,$h) {
 $uptr = $uptr|0;
 $w = $w|0;
 $h = $h|0;
 var $$0 = 0, $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZL19glnvg__allocTextureP12GLNVGcontext($uptr)|0);
 $1 = ($0|0)==(0|0);
 if ($1) {
  $$0 = 0;
  return ($$0|0);
 }
 $2 = ((($0)) + 4|0);
 _glGenTextures(1,($2|0));
 $3 = ((($0)) + 8|0);
 HEAP32[$3>>2] = $w;
 $4 = ((($0)) + 12|0);
 HEAP32[$4>>2] = $h;
 $5 = ((($0)) + 16|0);
 HEAP32[$5>>2] = 2;
 $6 = ((($0)) + 20|0);
 HEAP32[$6>>2] = 0;
 $7 = HEAP32[$2>>2]|0;
 __ZL18glnvg__bindTextureP12GLNVGcontextj($uptr,$7);
 _glPixelStorei(3317,1);
 _emscripten_asm_const_0(1);
 _glTexParameteri(3553,10241,9729);
 _glTexParameteri(3553,10240,9729);
 _glTexParameteri(3553,10242,33071);
 _glTexParameteri(3553,10243,33071);
 _glPixelStorei(3317,4);
 __ZL17glnvg__checkErrorP12GLNVGcontextPKc($uptr,14051);
 __ZL18glnvg__bindTextureP12GLNVGcontextj($uptr,0);
 $8 = HEAP32[$0>>2]|0;
 $$0 = $8;
 return ($$0|0);
}
function __ZN13NanoVGContext9drawImageEiiiiiiiiiiif($this,$mTexture,$sx,$sy,$sWidth,$sHeight,$dx,$dy,$dWidth,$dHeight,$tWidth,$tHeight,$alpha) {
 $this = $this|0;
 $mTexture = $mTexture|0;
 $sx = $sx|0;
 $sy = $sy|0;
 $sWidth = $sWidth|0;
 $sHeight = $sHeight|0;
 $dx = $dx|0;
 $dy = $dy|0;
 $dWidth = $dWidth|0;
 $dHeight = $dHeight|0;
 $tWidth = $tWidth|0;
 $tHeight = $tHeight|0;
 $alpha = +$alpha;
 var $0 = 0.0, $1 = 0.0, $10 = 0.0, $11 = 0.0, $12 = 0, $13 = 0.0, $14 = 0.0, $15 = 0.0, $16 = 0.0, $17 = 0.0, $18 = 0.0, $19 = 0.0, $2 = 0.0, $20 = 0.0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $3 = 0.0, $4 = 0.0;
 var $5 = 0.0, $6 = 0, $7 = 0, $8 = 0.0, $9 = 0.0, $imgPaint = 0, $imgPaint$byval_copy = 0, dest = 0, label = 0, sp = 0, src = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 160|0;
 $imgPaint$byval_copy = sp + 76|0;
 $imgPaint = sp;
 $0 = (+($dWidth|0));
 $1 = (+($sWidth|0));
 $2 = $0 / $1;
 $3 = (+($dHeight|0));
 $4 = (+($sHeight|0));
 $5 = $3 / $4;
 $6 = HEAP32[22]|0;
 $7 = (0 - ($sx))|0;
 $8 = (+($7|0));
 $9 = $8 * $2;
 $10 = (+($dx|0));
 $11 = $10 + $9;
 $12 = (0 - ($sy))|0;
 $13 = (+($12|0));
 $14 = $13 * $5;
 $15 = (+($dy|0));
 $16 = $15 + $14;
 $17 = (+($tWidth|0));
 $18 = $2 * $17;
 $19 = (+($tHeight|0));
 $20 = $5 * $19;
 _nvgImagePattern($imgPaint,$6,$11,$16,$18,$20,0.0,$mTexture,$alpha);
 $21 = HEAP32[22]|0;
 _nvgBeginPath($21);
 $22 = HEAP32[22]|0;
 _nvgRect($22,$10,$15,$0,$3);
 $23 = HEAP32[22]|0;
 dest=$imgPaint$byval_copy; src=$imgPaint; stop=dest+76|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
 _nvgFillPaint($23,$imgPaint$byval_copy);
 $24 = HEAP32[22]|0;
 _nvgFill($24);
 STACKTOP = sp;return;
}
function __ZN13NanoVGContext9beginPathEv($this) {
 $this = $this|0;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[22]|0;
 _nvgBeginPath($0);
 return;
}
function __ZN13NanoVGContext9closePathEv($this) {
 $this = $this|0;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[22]|0;
 _nvgClosePath($0);
 return;
}
function __ZN13NanoVGContext6strokeEv($this) {
 $this = $this|0;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[22]|0;
 _nvgStroke($0);
 return;
}
function __ZN13NanoVGContext6moveToEii($this,$x,$y) {
 $this = $this|0;
 $x = $x|0;
 $y = $y|0;
 var $0 = 0, $1 = 0.0, $2 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[22]|0;
 $1 = (+($x|0));
 $2 = (+($y|0));
 _nvgMoveTo($0,$1,$2);
 return;
}
function __ZN13NanoVGContext6lineToEii($this,$x,$y) {
 $this = $this|0;
 $x = $x|0;
 $y = $y|0;
 var $0 = 0, $1 = 0.0, $2 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[22]|0;
 $1 = (+($x|0));
 $2 = (+($y|0));
 _nvgLineTo($0,$1,$2);
 return;
}
function __ZN13NanoVGContext8fillRectEiiii($this,$x,$y,$width,$height) {
 $this = $this|0;
 $x = $x|0;
 $y = $y|0;
 $width = $width|0;
 $height = $height|0;
 var $0 = 0, $1 = 0, $2 = 0.0, $3 = 0.0, $4 = 0.0, $5 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[22]|0;
 _nvgBeginPath($0);
 $1 = HEAP32[22]|0;
 $2 = (+($x|0));
 $3 = (+($y|0));
 $4 = (+($width|0));
 $5 = (+($height|0));
 _nvgRect($1,$2,$3,$4,$5);
 __ZN13NanoVGContext4fillEv(0);
 return;
}
function __ZN13NanoVGContext4fillEv($this) {
 $this = $this|0;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[22]|0;
 _nvgFill($0);
 return;
}
function __ZN13NanoVGContext10strokeRectEiiii($this,$x,$y,$width,$height) {
 $this = $this|0;
 $x = $x|0;
 $y = $y|0;
 $width = $width|0;
 $height = $height|0;
 var $0 = 0, $1 = 0, $2 = 0.0, $3 = 0.0, $4 = 0.0, $5 = 0.0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[22]|0;
 _nvgBeginPath($0);
 $1 = HEAP32[22]|0;
 $2 = (+($x|0));
 $3 = (+($y|0));
 $4 = (+($width|0));
 $5 = (+($height|0));
 _nvgRect($1,$2,$3,$4,$5);
 $6 = HEAP32[22]|0;
 _nvgStroke($6);
 return;
}
function __ZN13NanoVGContext9clearRectEiiii($this,$x,$y,$width,$height) {
 $this = $this|0;
 $x = $x|0;
 $y = $y|0;
 $width = $width|0;
 $height = $height|0;
 var $$byval_copy = 0, $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0.0, $5 = 0.0, $6 = 0.0, $7 = 0.0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0;
 $$byval_copy = sp + 16|0;
 $0 = sp;
 $1 = HEAP32[22]|0;
 _nvgSave($1);
 $2 = HEAP32[22]|0;
 _nvgRGB($0,-1,-1,-1);
 ;HEAP32[$$byval_copy>>2]=HEAP32[$0>>2]|0;HEAP32[$$byval_copy+4>>2]=HEAP32[$0+4>>2]|0;HEAP32[$$byval_copy+8>>2]=HEAP32[$0+8>>2]|0;HEAP32[$$byval_copy+12>>2]=HEAP32[$0+12>>2]|0;
 _nvgFillColor($2,$$byval_copy);
 $3 = HEAP32[22]|0;
 $4 = (+($x|0));
 $5 = (+($y|0));
 $6 = (+($width|0));
 $7 = (+($height|0));
 _nvgRect($3,$4,$5,$6,$7);
 $8 = HEAP32[22]|0;
 _nvgFill($8);
 $9 = HEAP32[22]|0;
 _nvgRestore($9);
 STACKTOP = sp;return;
}
function __ZN13NanoVGContext4rectEiiii($this,$x,$y,$w,$h) {
 $this = $this|0;
 $x = $x|0;
 $y = $y|0;
 $w = $w|0;
 $h = $h|0;
 var $0 = 0, $1 = 0.0, $2 = 0.0, $3 = 0.0, $4 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[22]|0;
 $1 = (+($x|0));
 $2 = (+($y|0));
 $3 = (+($w|0));
 $4 = (+($h|0));
 _nvgRect($0,$1,$2,$3,$4);
 return;
}
function __ZN13NanoVGContext6rotateEf($this,$angle) {
 $this = $this|0;
 $angle = +$angle;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[22]|0;
 _nvgRotate($0,$angle);
 return;
}
function __ZN13NanoVGContext5scaleEff($this,$x,$y) {
 $this = $this|0;
 $x = +$x;
 $y = +$y;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[22]|0;
 _nvgScale($0,$x,$y);
 return;
}
function __ZN13NanoVGContext7scissorEiiii($this,$x,$y,$w,$h) {
 $this = $this|0;
 $x = $x|0;
 $y = $y|0;
 $w = $w|0;
 $h = $h|0;
 var $0 = 0, $1 = 0.0, $2 = 0.0, $3 = 0.0, $4 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[22]|0;
 $1 = (+($x|0));
 $2 = (+($y|0));
 $3 = (+($w|0));
 $4 = (+($h|0));
 _nvgScissor($0,$1,$2,$3,$4);
 return;
}
function __ZN13NanoVGContext15set_globalAlphaEf($this,$a) {
 $this = $this|0;
 $a = +$a;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 HEAPF32[$this>>2] = $a;
 $0 = HEAP32[22]|0;
 _nvgGlobalAlpha($0,$a);
 return;
}
function __ZN13NanoVGContext12setTransformEffffff($this,$a,$b,$c,$d,$e,$f) {
 $this = $this|0;
 $a = +$a;
 $b = +$b;
 $c = +$c;
 $d = +$d;
 $e = +$e;
 $f = +$f;
 var $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[22]|0;
 _nvgResetTransform($0);
 $1 = HEAP32[22]|0;
 _nvgTransform($1,$a,$b,$c,$d,$e,$f);
 return;
}
function __ZN13NanoVGContext3arcEfffffb($this,$x,$y,$radius,$startAngle,$endAngle,$antiClockwise) {
 $this = $this|0;
 $x = +$x;
 $y = +$y;
 $radius = +$radius;
 $startAngle = +$startAngle;
 $endAngle = +$endAngle;
 $antiClockwise = $antiClockwise|0;
 var $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[22]|0;
 $1 = $antiClockwise ? 1 : 2;
 _nvgArc($0,$x,$y,$radius,$startAngle,$endAngle,$1);
 return;
}
function __ZN13NanoVGContext5arcToEfffff($this,$x1,$y1,$x2,$y2,$radius) {
 $this = $this|0;
 $x1 = +$x1;
 $y1 = +$y1;
 $x2 = +$x2;
 $y2 = +$y2;
 $radius = +$radius;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[22]|0;
 _nvgArcTo($0,$x1,$y1,$x2,$y2,$radius);
 return;
}
function __ZN13NanoVGContext13bezierCurveToEffffff($this,$cpx1,$cpy1,$cpx2,$cpy2,$x,$y) {
 $this = $this|0;
 $cpx1 = +$cpx1;
 $cpy1 = +$cpy1;
 $cpx2 = +$cpx2;
 $cpy2 = +$cpy2;
 $x = +$x;
 $y = +$y;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[22]|0;
 _nvgBezierTo($0,$cpx1,$cpy1,$cpx2,$cpy2,$x,$y);
 return;
}
function __ZN13NanoVGContext16quadraticCurveToEffff($this,$cpx,$cpy,$x,$y) {
 $this = $this|0;
 $cpx = +$cpx;
 $cpy = +$cpy;
 $x = +$x;
 $y = +$y;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[22]|0;
 _nvgQuadTo($0,$cpx,$cpy,$x,$y);
 return;
}
function __ZN13NanoVGContext11measureTextEPc($this,$text) {
 $this = $this|0;
 $text = $text|0;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = _emscripten_asm_const_1(2, 0)|0;
 return +0;
}
function __ZN13NanoVGContext8fillTextEPcii($this,$text,$x,$y) {
 $this = $this|0;
 $text = $text|0;
 $x = $x|0;
 $y = $y|0;
 var $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 _emscripten_asm_const_0(3);
 (__ZN13NanoVGContext21createTextureFromTextEii($this,$x,$y)|0);
 $0 = ((($this)) + 40|0);
 $1 = HEAP32[$0>>2]|0;
 __ZN13NanoVGContext9drawImageEiiiiiiiiiiif(0,$1,0,0,512,512,-128,-192,512,512,512,512,1.0);
 return;
}
function __ZN13NanoVGContext10strokeTextEPcii($this,$text,$x,$y) {
 $this = $this|0;
 $text = $text|0;
 $x = $x|0;
 $y = $y|0;
 var $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 _emscripten_asm_const_0(4);
 (__ZN13NanoVGContext21createTextureFromTextEii($this,$x,$y)|0);
 $0 = ((($this)) + 40|0);
 $1 = HEAP32[$0>>2]|0;
 __ZN13NanoVGContext9drawImageEiiiiiiiiiiif(0,$1,0,0,512,512,-128,-192,512,512,512,512,1.0);
 return;
}
function __ZL17glnvg__checkErrorP12GLNVGcontextPKc($gl,$str) {
 $gl = $gl|0;
 $str = $str|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $vararg_buffer = 0, $vararg_ptr1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0;
 $vararg_buffer = sp;
 $0 = ((($gl)) + 56|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = $1 & 4;
 $3 = ($2|0)==(0);
 if ($3) {
  STACKTOP = sp;return;
 }
 $4 = (_glGetError()|0);
 $5 = ($4|0)==(0);
 if ($5) {
  STACKTOP = sp;return;
 }
 HEAP32[$vararg_buffer>>2] = $4;
 $vararg_ptr1 = ((($vararg_buffer)) + 4|0);
 HEAP32[$vararg_ptr1>>2] = $str;
 (_printf(13812,$vararg_buffer)|0);
 STACKTOP = sp;return;
}
function __ZL19glnvg__createShaderP11GLNVGshaderPKcS2_S2_S2_S2_($shader,$opts) {
 $shader = $shader|0;
 $opts = $opts|0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $status = 0, $str = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0;
 $status = sp + 12|0;
 $str = sp;
 HEAP32[$str>>2] = 10117;
 $0 = ($opts|0)!=(0|0);
 $1 = $0 ? $opts : 13833;
 $2 = ((($str)) + 4|0);
 HEAP32[$2>>2] = $1;
 ;HEAP32[$shader>>2]=0|0;HEAP32[$shader+4>>2]=0|0;HEAP32[$shader+8>>2]=0|0;HEAP32[$shader+12>>2]=0|0;HEAP32[$shader+16>>2]=0|0;HEAP32[$shader+20>>2]=0|0;
 $3 = (_glCreateProgram()|0);
 $4 = (_glCreateShader(35633)|0);
 $5 = (_glCreateShader(35632)|0);
 $6 = ((($str)) + 8|0);
 HEAP32[$6>>2] = 10182;
 _glShaderSource(($4|0),3,($str|0),(0|0));
 HEAP32[$6>>2] = 10566;
 _glShaderSource(($5|0),3,($str|0),(0|0));
 _glCompileShader(($4|0));
 _glGetShaderiv(($4|0),35713,($status|0));
 $7 = HEAP32[$status>>2]|0;
 $8 = ($7|0)==(1);
 if (!($8)) {
  __ZL22glnvg__dumpShaderErrorjPKcS0_($4,13834);
  $$0 = 0;
  STACKTOP = sp;return ($$0|0);
 }
 _glCompileShader(($5|0));
 _glGetShaderiv(($5|0),35713,($status|0));
 $9 = HEAP32[$status>>2]|0;
 $10 = ($9|0)==(1);
 if (!($10)) {
  __ZL22glnvg__dumpShaderErrorjPKcS0_($5,13839);
  $$0 = 0;
  STACKTOP = sp;return ($$0|0);
 }
 _glAttachShader(($3|0),($4|0));
 _glAttachShader(($3|0),($5|0));
 _glBindAttribLocation(($3|0),0,(13844|0));
 _glBindAttribLocation(($3|0),1,(13851|0));
 _glLinkProgram(($3|0));
 _glGetProgramiv(($3|0),35714,($status|0));
 $11 = HEAP32[$status>>2]|0;
 $12 = ($11|0)==(1);
 if ($12) {
  HEAP32[$shader>>2] = $3;
  $13 = ((($shader)) + 8|0);
  HEAP32[$13>>2] = $4;
  $14 = ((($shader)) + 4|0);
  HEAP32[$14>>2] = $5;
  $$0 = 1;
  STACKTOP = sp;return ($$0|0);
 } else {
  __ZL23glnvg__dumpProgramErrorjPKc($3);
  $$0 = 0;
  STACKTOP = sp;return ($$0|0);
 }
 return (0)|0;
}
function __ZL18glnvg__getUniformsP11GLNVGshader($shader) {
 $shader = $shader|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[$shader>>2]|0;
 $1 = (_glGetUniformLocation(($0|0),(13904|0))|0);
 $2 = ((($shader)) + 12|0);
 HEAP32[$2>>2] = $1;
 $3 = HEAP32[$shader>>2]|0;
 $4 = (_glGetUniformLocation(($3|0),(13913|0))|0);
 $5 = ((($shader)) + 16|0);
 HEAP32[$5>>2] = $4;
 $6 = HEAP32[$shader>>2]|0;
 $7 = (_glGetUniformLocation(($6|0),(13839|0))|0);
 $8 = ((($shader)) + 20|0);
 HEAP32[$8>>2] = $7;
 return;
}
function __ZL22glnvg__dumpShaderErrorjPKcS0_($shader,$type) {
 $shader = $shader|0;
 $type = $type|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $len = 0, $str = 0, $vararg_buffer = 0, $vararg_ptr1 = 0, $vararg_ptr2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 544|0;
 $vararg_buffer = sp;
 $str = sp + 16|0;
 $len = sp + 12|0;
 HEAP32[$len>>2] = 0;
 _glGetShaderInfoLog(($shader|0),512,($len|0),($str|0));
 $0 = HEAP32[$len>>2]|0;
 $1 = ($0|0)>(512);
 if ($1) {
  HEAP32[$len>>2] = 512;
 }
 $2 = HEAP32[$len>>2]|0;
 $3 = (($str) + ($2)|0);
 HEAP8[$3>>0] = 0;
 HEAP32[$vararg_buffer>>2] = 13756;
 $vararg_ptr1 = ((($vararg_buffer)) + 4|0);
 HEAP32[$vararg_ptr1>>2] = $type;
 $vararg_ptr2 = ((($vararg_buffer)) + 8|0);
 HEAP32[$vararg_ptr2>>2] = $str;
 (_printf(13858,$vararg_buffer)|0);
 STACKTOP = sp;return;
}
function __ZL23glnvg__dumpProgramErrorjPKc($prog) {
 $prog = $prog|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $len = 0, $str = 0, $vararg_buffer = 0, $vararg_ptr1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 528|0;
 $vararg_buffer = sp;
 $str = sp + 12|0;
 $len = sp + 8|0;
 HEAP32[$len>>2] = 0;
 _glGetProgramInfoLog(($prog|0),512,($len|0),($str|0));
 $0 = HEAP32[$len>>2]|0;
 $1 = ($0|0)>(512);
 if ($1) {
  HEAP32[$len>>2] = 512;
 }
 $2 = HEAP32[$len>>2]|0;
 $3 = (($str) + ($2)|0);
 HEAP8[$3>>0] = 0;
 HEAP32[$vararg_buffer>>2] = 13756;
 $vararg_ptr1 = ((($vararg_buffer)) + 4|0);
 HEAP32[$vararg_ptr1>>2] = $str;
 (_printf(13882,$vararg_buffer)|0);
 STACKTOP = sp;return;
}
function __ZL18glnvg__nearestPow2j($num) {
 $num = $num|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($num|0)!=(0);
 $1 = (($num) + -1)|0;
 $2 = $0 ? $1 : 0;
 $3 = $2 >>> 1;
 $4 = $3 | $2;
 $5 = $4 >>> 2;
 $6 = $5 | $4;
 $7 = $6 >>> 4;
 $8 = $7 | $6;
 $9 = $8 >>> 8;
 $10 = $9 | $8;
 $11 = $10 >>> 16;
 $12 = $11 | $10;
 $13 = (($12) + 1)|0;
 return ($13|0);
}
function __ZL18glnvg__bindTextureP12GLNVGcontextj($gl,$tex) {
 $gl = $gl|0;
 $tex = $tex|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($gl)) + 108|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)==($tex|0);
 if ($2) {
  return;
 }
 HEAP32[$0>>2] = $tex;
 _glBindTexture(3553,($tex|0));
 return;
}
function __ZL20glnvg__deleteTextureP12GLNVGcontexti($gl,$id) {
 $gl = $gl|0;
 $id = $id|0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0;
 var $9 = 0, $i$03 = 0, $i$03$lcssa = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($gl)) + 36|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)>(0);
 if (!($2)) {
  $$0 = 0;
  return ($$0|0);
 }
 $3 = ((($gl)) + 24|0);
 $4 = HEAP32[$3>>2]|0;
 $i$03 = 0;
 while(1) {
  $5 = (($4) + (($i$03*24)|0)|0);
  $6 = HEAP32[$5>>2]|0;
  $7 = ($6|0)==($id|0);
  if ($7) {
   $i$03$lcssa = $i$03;
   break;
  }
  $17 = (($i$03) + 1)|0;
  $18 = HEAP32[$0>>2]|0;
  $19 = ($17|0)<($18|0);
  if ($19) {
   $i$03 = $17;
  } else {
   $$0 = 0;
   label = 9;
   break;
  }
 }
 if ((label|0) == 9) {
  return ($$0|0);
 }
 $8 = (((($4) + (($i$03$lcssa*24)|0)|0)) + 4|0);
 $9 = HEAP32[$8>>2]|0;
 $10 = ($9|0)==(0);
 if (!($10)) {
  $11 = (((($4) + (($i$03$lcssa*24)|0)|0)) + 20|0);
  $12 = HEAP32[$11>>2]|0;
  $13 = $12 & 65536;
  $14 = ($13|0)==(0);
  if ($14) {
   _glDeleteTextures(1,($8|0));
  }
 }
 $15 = HEAP32[$3>>2]|0;
 $16 = (($15) + (($i$03$lcssa*24)|0)|0);
 ;HEAP32[$16>>2]=0|0;HEAP32[$16+4>>2]=0|0;HEAP32[$16+8>>2]=0|0;HEAP32[$16+12>>2]=0|0;HEAP32[$16+16>>2]=0|0;HEAP32[$16+20>>2]=0|0;
 $$0 = 1;
 return ($$0|0);
}
function __ZL11glnvg__fillP12GLNVGcontextP9GLNVGcall($gl,$call) {
 $gl = $gl|0;
 $call = $call|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $exitcond = 0, $exitcond4 = 0, $i$02 = 0, $i$11 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($call)) + 8|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ((($gl)) + 72|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = (($3) + ($1<<4)|0);
 $5 = ((($call)) + 12|0);
 $6 = HEAP32[$5>>2]|0;
 _glEnable(2960);
 __ZL18glnvg__stencilMaskP12GLNVGcontextj($gl);
 __ZL18glnvg__stencilFuncP12GLNVGcontextjij($gl,519);
 _glColorMask(0,0,0,0);
 $7 = ((($call)) + 24|0);
 $8 = HEAP32[$7>>2]|0;
 __ZL18glnvg__setUniformsP12GLNVGcontextii($gl,$8,0);
 __ZL17glnvg__checkErrorP12GLNVGcontextPKc($gl,14062);
 _glStencilOpSeparate(1028,7680,7680,34055);
 _glStencilOpSeparate(1029,7680,7680,34056);
 _glDisable(2884);
 $9 = ($6|0)>(0);
 if ($9) {
  $i$02 = 0;
  while(1) {
   $10 = (($4) + ($i$02<<4)|0);
   $11 = HEAP32[$10>>2]|0;
   $12 = ((($10)) + 4|0);
   $13 = HEAP32[$12>>2]|0;
   _glDrawArrays(6,($11|0),($13|0));
   $14 = (($i$02) + 1)|0;
   $exitcond4 = ($14|0)==($6|0);
   if ($exitcond4) {
    break;
   } else {
    $i$02 = $14;
   }
  }
 }
 _glEnable(2884);
 _glColorMask(1,1,1,1);
 $15 = HEAP32[$7>>2]|0;
 $16 = ((($gl)) + 52|0);
 $17 = HEAP32[$16>>2]|0;
 $18 = (($17) + ($15))|0;
 $19 = ((($call)) + 4|0);
 $20 = HEAP32[$19>>2]|0;
 __ZL18glnvg__setUniformsP12GLNVGcontextii($gl,$18,$20);
 __ZL17glnvg__checkErrorP12GLNVGcontextPKc($gl,14074);
 $21 = ((($gl)) + 56|0);
 $22 = HEAP32[$21>>2]|0;
 $23 = $22 & 1;
 $24 = ($23|0)==(0);
 if (!($24)) {
  __ZL18glnvg__stencilFuncP12GLNVGcontextjij($gl,514);
  _glStencilOp(7680,7680,7680);
  $25 = ($6|0)>(0);
  if ($25) {
   $i$11 = 0;
   while(1) {
    $26 = (($4) + ($i$11<<4)|0);
    $27 = ((($26)) + 8|0);
    $28 = HEAP32[$27>>2]|0;
    $29 = ((($26)) + 12|0);
    $30 = HEAP32[$29>>2]|0;
    _glDrawArrays(5,($28|0),($30|0));
    $31 = (($i$11) + 1)|0;
    $exitcond = ($31|0)==($6|0);
    if ($exitcond) {
     break;
    } else {
     $i$11 = $31;
    }
   }
  }
 }
 __ZL18glnvg__stencilFuncP12GLNVGcontextjij($gl,517);
 _glStencilOp(0,0,0);
 $32 = ((($call)) + 16|0);
 $33 = HEAP32[$32>>2]|0;
 $34 = ((($call)) + 20|0);
 $35 = HEAP32[$34>>2]|0;
 _glDrawArrays(4,($33|0),($35|0));
 _glDisable(2960);
 return;
}
function __ZL17glnvg__convexFillP12GLNVGcontextP9GLNVGcall($gl,$call) {
 $gl = $gl|0;
 $call = $call|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $exitcond = 0, $exitcond4 = 0, $i$02 = 0, $i$11 = 0, $or$cond = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($call)) + 8|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ((($gl)) + 72|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = (($3) + ($1<<4)|0);
 $5 = ((($call)) + 12|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = ((($call)) + 24|0);
 $8 = HEAP32[$7>>2]|0;
 $9 = ((($call)) + 4|0);
 $10 = HEAP32[$9>>2]|0;
 __ZL18glnvg__setUniformsP12GLNVGcontextii($gl,$8,$10);
 __ZL17glnvg__checkErrorP12GLNVGcontextPKc($gl,14098);
 $11 = ($6|0)>(0);
 if ($11) {
  $i$02 = 0;
 } else {
  return;
 }
 while(1) {
  $12 = (($4) + ($i$02<<4)|0);
  $13 = HEAP32[$12>>2]|0;
  $14 = ((($12)) + 4|0);
  $15 = HEAP32[$14>>2]|0;
  _glDrawArrays(6,($13|0),($15|0));
  $16 = (($i$02) + 1)|0;
  $exitcond4 = ($16|0)==($6|0);
  if ($exitcond4) {
   break;
  } else {
   $i$02 = $16;
  }
 }
 $17 = ((($gl)) + 56|0);
 $18 = HEAP32[$17>>2]|0;
 $19 = $18 & 1;
 $20 = ($19|0)!=(0);
 $21 = ($6|0)>(0);
 $or$cond = $20 & $21;
 if ($or$cond) {
  $i$11 = 0;
 } else {
  return;
 }
 while(1) {
  $22 = (($4) + ($i$11<<4)|0);
  $23 = ((($22)) + 8|0);
  $24 = HEAP32[$23>>2]|0;
  $25 = ((($22)) + 12|0);
  $26 = HEAP32[$25>>2]|0;
  _glDrawArrays(5,($24|0),($26|0));
  $27 = (($i$11) + 1)|0;
  $exitcond = ($27|0)==($6|0);
  if ($exitcond) {
   break;
  } else {
   $i$11 = $27;
  }
 }
 return;
}
function __ZL13glnvg__strokeP12GLNVGcontextP9GLNVGcall($gl,$call) {
 $gl = $gl|0;
 $call = $call|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $exitcond = 0, $exitcond12 = 0, $exitcond13 = 0, $exitcond14 = 0, $i$08 = 0, $i$14 = 0, $i$22 = 0, $i$31 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($call)) + 8|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ((($gl)) + 72|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = (($3) + ($1<<4)|0);
 $5 = ((($call)) + 12|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = ((($gl)) + 56|0);
 $8 = HEAP32[$7>>2]|0;
 $9 = $8 & 2;
 $10 = ($9|0)==(0);
 if ($10) {
  $41 = ((($call)) + 24|0);
  $42 = HEAP32[$41>>2]|0;
  $43 = ((($call)) + 4|0);
  $44 = HEAP32[$43>>2]|0;
  __ZL18glnvg__setUniformsP12GLNVGcontextii($gl,$42,$44);
  __ZL17glnvg__checkErrorP12GLNVGcontextPKc($gl,14138);
  $45 = ($6|0)>(0);
  if ($45) {
   $i$31 = 0;
  } else {
   return;
  }
  while(1) {
   $46 = (($4) + ($i$31<<4)|0);
   $47 = ((($46)) + 8|0);
   $48 = HEAP32[$47>>2]|0;
   $49 = ((($46)) + 12|0);
   $50 = HEAP32[$49>>2]|0;
   _glDrawArrays(5,($48|0),($50|0));
   $51 = (($i$31) + 1)|0;
   $exitcond = ($51|0)==($6|0);
   if ($exitcond) {
    break;
   } else {
    $i$31 = $51;
   }
  }
  return;
 }
 _glEnable(2960);
 __ZL18glnvg__stencilMaskP12GLNVGcontextj($gl);
 __ZL18glnvg__stencilFuncP12GLNVGcontextjij($gl,514);
 _glStencilOp(7680,7680,7682);
 $11 = ((($call)) + 24|0);
 $12 = HEAP32[$11>>2]|0;
 $13 = ((($gl)) + 52|0);
 $14 = HEAP32[$13>>2]|0;
 $15 = (($14) + ($12))|0;
 $16 = ((($call)) + 4|0);
 $17 = HEAP32[$16>>2]|0;
 __ZL18glnvg__setUniformsP12GLNVGcontextii($gl,$15,$17);
 __ZL17glnvg__checkErrorP12GLNVGcontextPKc($gl,14110);
 $18 = ($6|0)>(0);
 if ($18) {
  $i$08 = 0;
  while(1) {
   $19 = (($4) + ($i$08<<4)|0);
   $20 = ((($19)) + 8|0);
   $21 = HEAP32[$20>>2]|0;
   $22 = ((($19)) + 12|0);
   $23 = HEAP32[$22>>2]|0;
   _glDrawArrays(5,($21|0),($23|0));
   $24 = (($i$08) + 1)|0;
   $exitcond14 = ($24|0)==($6|0);
   if ($exitcond14) {
    break;
   } else {
    $i$08 = $24;
   }
  }
 }
 $25 = HEAP32[$11>>2]|0;
 $26 = HEAP32[$16>>2]|0;
 __ZL18glnvg__setUniformsP12GLNVGcontextii($gl,$25,$26);
 __ZL18glnvg__stencilFuncP12GLNVGcontextjij($gl,514);
 _glStencilOp(7680,7680,7680);
 $27 = ($6|0)>(0);
 if ($27) {
  $i$14 = 0;
  while(1) {
   $28 = (($4) + ($i$14<<4)|0);
   $29 = ((($28)) + 8|0);
   $30 = HEAP32[$29>>2]|0;
   $31 = ((($28)) + 12|0);
   $32 = HEAP32[$31>>2]|0;
   _glDrawArrays(5,($30|0),($32|0));
   $33 = (($i$14) + 1)|0;
   $exitcond13 = ($33|0)==($6|0);
   if ($exitcond13) {
    break;
   } else {
    $i$14 = $33;
   }
  }
 }
 _glColorMask(0,0,0,0);
 __ZL18glnvg__stencilFuncP12GLNVGcontextjij($gl,519);
 _glStencilOp(0,0,0);
 __ZL17glnvg__checkErrorP12GLNVGcontextPKc($gl,14124);
 $34 = ($6|0)>(0);
 if ($34) {
  $i$22 = 0;
  while(1) {
   $35 = (($4) + ($i$22<<4)|0);
   $36 = ((($35)) + 8|0);
   $37 = HEAP32[$36>>2]|0;
   $38 = ((($35)) + 12|0);
   $39 = HEAP32[$38>>2]|0;
   _glDrawArrays(5,($37|0),($39|0));
   $40 = (($i$22) + 1)|0;
   $exitcond12 = ($40|0)==($6|0);
   if ($exitcond12) {
    break;
   } else {
    $i$22 = $40;
   }
  }
 }
 _glColorMask(1,1,1,1);
 _glDisable(2960);
 return;
}
function __ZL16glnvg__trianglesP12GLNVGcontextP9GLNVGcall($gl,$call) {
 $gl = $gl|0;
 $call = $call|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($call)) + 24|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ((($call)) + 4|0);
 $3 = HEAP32[$2>>2]|0;
 __ZL18glnvg__setUniformsP12GLNVGcontextii($gl,$1,$3);
 __ZL17glnvg__checkErrorP12GLNVGcontextPKc($gl,14150);
 $4 = ((($call)) + 16|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = ((($call)) + 20|0);
 $7 = HEAP32[$6>>2]|0;
 _glDrawArrays(4,($5|0),($7|0));
 return;
}
function __ZL18glnvg__stencilMaskP12GLNVGcontextj($gl) {
 $gl = $gl|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($gl)) + 112|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)==(255);
 if ($2) {
  return;
 }
 HEAP32[$0>>2] = 255;
 _glStencilMask(255);
 return;
}
function __ZL18glnvg__stencilFuncP12GLNVGcontextjij($gl,$func) {
 $gl = $gl|0;
 $func = $func|0;
 var $0 = 0, $1 = 0, $10 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($gl)) + 116|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)==($func|0);
 if ($2) {
  $3 = ((($gl)) + 120|0);
  $4 = HEAP32[$3>>2]|0;
  $5 = ($4|0)==(0);
  if ($5) {
   $6 = ((($gl)) + 124|0);
   $7 = HEAP32[$6>>2]|0;
   $8 = ($7|0)==(255);
   if ($8) {
    return;
   }
  }
 }
 HEAP32[$0>>2] = $func;
 $9 = ((($gl)) + 120|0);
 HEAP32[$9>>2] = 0;
 $10 = ((($gl)) + 124|0);
 HEAP32[$10>>2] = 255;
 _glStencilFunc(($func|0),0,255);
 return;
}
function __ZL18glnvg__setUniformsP12GLNVGcontextii($gl,$uniformOffset,$image) {
 $gl = $gl|0;
 $uniformOffset = $uniformOffset|0;
 $image = $image|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__ZL19nvg__fragUniformPtrP12GLNVGcontexti($gl,$uniformOffset)|0);
 $1 = ((($gl)) + 20|0);
 $2 = HEAP32[$1>>2]|0;
 _glUniform4fv(($2|0),11,($0|0));
 $3 = ($image|0)==(0);
 if ($3) {
  __ZL18glnvg__bindTextureP12GLNVGcontextj($gl,0);
  return;
 }
 $4 = (__ZL18glnvg__findTextureP12GLNVGcontexti($gl,$image)|0);
 $5 = ($4|0)==(0|0);
 if ($5) {
  $8 = 0;
 } else {
  $6 = ((($4)) + 4|0);
  $7 = HEAP32[$6>>2]|0;
  $8 = $7;
 }
 __ZL18glnvg__bindTextureP12GLNVGcontextj($gl,$8);
 __ZL17glnvg__checkErrorP12GLNVGcontextPKc($gl,14084);
 return;
}
function __ZL19nvg__fragUniformPtrP12GLNVGcontexti($gl,$i) {
 $gl = $gl|0;
 $i = $i|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($gl)) + 96|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = (($1) + ($i)|0);
 return ($2|0);
}
function __ZL16glnvg__allocCallP12GLNVGcontext($gl) {
 $gl = $gl|0;
 var $$1 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($gl)) + 68|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ((($gl)) + 64|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = ($1|0)<($3|0);
 do {
  if (!($4)) {
   $5 = (($1) + 1)|0;
   $6 = (__ZL11glnvg__maxiii($5,128)|0);
   $7 = (($3|0) / 2)&-1;
   $8 = (($6) + ($7))|0;
   $9 = ((($gl)) + 60|0);
   $10 = HEAP32[$9>>2]|0;
   $11 = ($8*28)|0;
   $12 = (_realloc($10,$11)|0);
   $13 = ($12|0)==(0|0);
   if ($13) {
    $$1 = 0;
    return ($$1|0);
   } else {
    HEAP32[$9>>2] = $12;
    HEAP32[$2>>2] = $8;
    break;
   }
  }
 } while(0);
 $14 = HEAP32[$0>>2]|0;
 $15 = (($14) + 1)|0;
 HEAP32[$0>>2] = $15;
 $16 = ((($gl)) + 60|0);
 $17 = HEAP32[$16>>2]|0;
 $18 = (($17) + (($14*28)|0)|0);
 ;HEAP32[$18>>2]=0|0;HEAP32[$18+4>>2]=0|0;HEAP32[$18+8>>2]=0|0;HEAP32[$18+12>>2]=0|0;HEAP32[$18+16>>2]=0|0;HEAP32[$18+20>>2]=0|0;HEAP32[$18+24>>2]=0|0;
 $$1 = $18;
 return ($$1|0);
}
function __ZL17glnvg__allocPathsP12GLNVGcontexti($gl,$n) {
 $gl = $gl|0;
 $n = $n|0;
 var $$1 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($gl)) + 80|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = (($1) + ($n))|0;
 $3 = ((($gl)) + 76|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = ($2|0)>($4|0);
 do {
  if ($5) {
   $6 = (__ZL11glnvg__maxiii($2,128)|0);
   $7 = (($4|0) / 2)&-1;
   $8 = (($6) + ($7))|0;
   $9 = ((($gl)) + 72|0);
   $10 = HEAP32[$9>>2]|0;
   $11 = $8 << 4;
   $12 = (_realloc($10,$11)|0);
   $13 = ($12|0)==(0|0);
   if ($13) {
    $$1 = -1;
    return ($$1|0);
   } else {
    HEAP32[$9>>2] = $12;
    HEAP32[$3>>2] = $8;
    break;
   }
  }
 } while(0);
 $14 = HEAP32[$0>>2]|0;
 $15 = (($14) + ($n))|0;
 HEAP32[$0>>2] = $15;
 $$1 = $14;
 return ($$1|0);
}
function __ZL19glnvg__maxVertCountPK7NVGpathi($paths,$npaths) {
 $paths = $paths|0;
 $npaths = $npaths|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $count$0$lcssa = 0, $count$02 = 0, $exitcond = 0, $i$01 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($npaths|0)>(0);
 if ($0) {
  $count$02 = 0;$i$01 = 0;
 } else {
  $count$0$lcssa = 0;
  return ($count$0$lcssa|0);
 }
 while(1) {
  $1 = (((($paths) + (($i$01*40)|0)|0)) + 20|0);
  $2 = HEAP32[$1>>2]|0;
  $3 = (($2) + ($count$02))|0;
  $4 = (((($paths) + (($i$01*40)|0)|0)) + 28|0);
  $5 = HEAP32[$4>>2]|0;
  $6 = (($3) + ($5))|0;
  $7 = (($i$01) + 1)|0;
  $exitcond = ($7|0)==($npaths|0);
  if ($exitcond) {
   $count$0$lcssa = $6;
   break;
  } else {
   $count$02 = $6;$i$01 = $7;
  }
 }
 return ($count$0$lcssa|0);
}
function __ZL17glnvg__allocVertsP12GLNVGcontexti($gl,$n) {
 $gl = $gl|0;
 $n = $n|0;
 var $$1 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($gl)) + 92|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = (($1) + ($n))|0;
 $3 = ((($gl)) + 88|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = ($2|0)>($4|0);
 do {
  if ($5) {
   $6 = (__ZL11glnvg__maxiii($2,4096)|0);
   $7 = (($4|0) / 2)&-1;
   $8 = (($6) + ($7))|0;
   $9 = ((($gl)) + 84|0);
   $10 = HEAP32[$9>>2]|0;
   $11 = $8 << 4;
   $12 = (_realloc($10,$11)|0);
   $13 = ($12|0)==(0|0);
   if ($13) {
    $$1 = -1;
    return ($$1|0);
   } else {
    HEAP32[$9>>2] = $12;
    HEAP32[$3>>2] = $8;
    break;
   }
  }
 } while(0);
 $14 = HEAP32[$0>>2]|0;
 $15 = (($14) + ($n))|0;
 HEAP32[$0>>2] = $15;
 $$1 = $14;
 return ($$1|0);
}
function __ZL11glnvg__vsetP9NVGvertexffff($vtx,$x,$y) {
 $vtx = $vtx|0;
 $x = +$x;
 $y = +$y;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 HEAPF32[$vtx>>2] = $x;
 $0 = ((($vtx)) + 4|0);
 HEAPF32[$0>>2] = $y;
 $1 = ((($vtx)) + 8|0);
 HEAPF32[$1>>2] = 0.5;
 $2 = ((($vtx)) + 12|0);
 HEAPF32[$2>>2] = 1.0;
 return;
}
function __ZL24glnvg__allocFragUniformsP12GLNVGcontexti($gl,$n) {
 $gl = $gl|0;
 $n = $n|0;
 var $$1 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($gl)) + 52|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ((($gl)) + 104|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = (($3) + ($n))|0;
 $5 = ((($gl)) + 100|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = ($4|0)>($6|0);
 do {
  if ($7) {
   $8 = (__ZL11glnvg__maxiii($4,128)|0);
   $9 = (($6|0) / 2)&-1;
   $10 = (($8) + ($9))|0;
   $11 = ((($gl)) + 96|0);
   $12 = HEAP32[$11>>2]|0;
   $13 = Math_imul($10, $1)|0;
   $14 = (_realloc($12,$13)|0);
   $15 = ($14|0)==(0|0);
   if ($15) {
    $$1 = -1;
    return ($$1|0);
   } else {
    HEAP32[$11>>2] = $14;
    HEAP32[$5>>2] = $10;
    break;
   }
  }
 } while(0);
 $16 = HEAP32[$2>>2]|0;
 $17 = Math_imul($16, $1)|0;
 $18 = (($16) + ($n))|0;
 HEAP32[$2>>2] = $18;
 $$1 = $17;
 return ($$1|0);
}
function __ZL19glnvg__convertPaintP12GLNVGcontextP17GLNVGfragUniformsP8NVGpaintP10NVGscissorfff($gl,$frag,$paint,$scissor,$width,$fringe,$strokeThr) {
 $gl = $gl|0;
 $frag = $frag|0;
 $paint = $paint|0;
 $scissor = $scissor|0;
 $width = +$width;
 $fringe = +$fringe;
 $strokeThr = +$strokeThr;
 var $$byval_copy$1 = 0, $$lobit = 0, $0 = 0, $1 = 0, $10 = 0.0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0.0, $21 = 0.0, $22 = 0, $23 = 0.0, $24 = 0.0;
 var $25 = 0.0, $26 = 0.0, $27 = 0.0, $28 = 0, $29 = 0, $3 = 0, $30 = 0.0, $31 = 0.0, $32 = 0, $33 = 0.0, $34 = 0.0, $35 = 0.0, $36 = 0.0, $37 = 0.0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0;
 var $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0.0, $52 = 0.0, $53 = 0.0, $54 = 0.0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0;
 var $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0.0, $70 = 0, $71 = 0, $72 = 0, $73 = 0.0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0;
 var $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $9 = 0, $invxform = 0, dest = 0, label = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 80|0;
 $$byval_copy$1 = sp + 56|0;
 $invxform = sp + 16|0;
 $0 = sp + 40|0;
 $1 = sp;
 _memset(($frag|0),0,176)|0;
 $2 = ((($frag)) + 96|0);
 $3 = ((($paint)) + 40|0);
 ;HEAP32[$$byval_copy$1>>2]=HEAP32[$3>>2]|0;HEAP32[$$byval_copy$1+4>>2]=HEAP32[$3+4>>2]|0;HEAP32[$$byval_copy$1+8>>2]=HEAP32[$3+8>>2]|0;HEAP32[$$byval_copy$1+12>>2]=HEAP32[$3+12>>2]|0;
 __ZL18glnvg__premulColor8NVGcolor($0,$$byval_copy$1);
 ;HEAP32[$2>>2]=HEAP32[$0>>2]|0;HEAP32[$2+4>>2]=HEAP32[$0+4>>2]|0;HEAP32[$2+8>>2]=HEAP32[$0+8>>2]|0;HEAP32[$2+12>>2]=HEAP32[$0+12>>2]|0;
 $4 = ((($frag)) + 112|0);
 $5 = ((($paint)) + 56|0);
 ;HEAP32[$$byval_copy$1>>2]=HEAP32[$5>>2]|0;HEAP32[$$byval_copy$1+4>>2]=HEAP32[$5+4>>2]|0;HEAP32[$$byval_copy$1+8>>2]=HEAP32[$5+8>>2]|0;HEAP32[$$byval_copy$1+12>>2]=HEAP32[$5+12>>2]|0;
 __ZL18glnvg__premulColor8NVGcolor($1,$$byval_copy$1);
 ;HEAP32[$4>>2]=HEAP32[$1>>2]|0;HEAP32[$4+4>>2]=HEAP32[$1+4>>2]|0;HEAP32[$4+8>>2]=HEAP32[$1+8>>2]|0;HEAP32[$4+12>>2]=HEAP32[$1+12>>2]|0;
 $6 = ((($scissor)) + 24|0);
 $7 = +HEAPF32[$6>>2];
 $8 = $7 < -0.5;
 if ($8) {
  label = 3;
 } else {
  $9 = ((($scissor)) + 28|0);
  $10 = +HEAPF32[$9>>2];
  $11 = $10 < -0.5;
  if ($11) {
   label = 3;
  } else {
   (_nvgTransformInverse($invxform,$scissor)|0);
   __ZL20glnvg__xformToMat3x4PfS_($frag,$invxform);
   $16 = HEAP32[$6>>2]|0;
   $17 = ((($frag)) + 128|0);
   HEAP32[$17>>2] = $16;
   $18 = HEAP32[$9>>2]|0;
   $19 = ((($frag)) + 132|0);
   HEAP32[$19>>2] = $18;
   $20 = +HEAPF32[$scissor>>2];
   $21 = $20 * $20;
   $22 = ((($scissor)) + 8|0);
   $23 = +HEAPF32[$22>>2];
   $24 = $23 * $23;
   $25 = $21 + $24;
   $26 = (+Math_sqrt((+$25)));
   $27 = $26 / $fringe;
   $28 = ((($frag)) + 136|0);
   HEAPF32[$28>>2] = $27;
   $29 = ((($scissor)) + 4|0);
   $30 = +HEAPF32[$29>>2];
   $31 = $30 * $30;
   $32 = ((($scissor)) + 12|0);
   $33 = +HEAPF32[$32>>2];
   $34 = $33 * $33;
   $35 = $31 + $34;
   $36 = (+Math_sqrt((+$35)));
   $37 = $36 / $fringe;
   $38 = ((($frag)) + 140|0);
   HEAPF32[$38>>2] = $37;
  }
 }
 if ((label|0) == 3) {
  dest=$frag; stop=dest+48|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
  $12 = ((($frag)) + 128|0);
  HEAPF32[$12>>2] = 1.0;
  $13 = ((($frag)) + 132|0);
  HEAPF32[$13>>2] = 1.0;
  $14 = ((($frag)) + 136|0);
  HEAPF32[$14>>2] = 1.0;
  $15 = ((($frag)) + 140|0);
  HEAPF32[$15>>2] = 1.0;
 }
 $39 = ((($frag)) + 144|0);
 $40 = ((($paint)) + 24|0);
 $41 = $40;
 $42 = $41;
 $43 = HEAP32[$42>>2]|0;
 $44 = (($41) + 4)|0;
 $45 = $44;
 $46 = HEAP32[$45>>2]|0;
 $47 = $39;
 $48 = $47;
 HEAP32[$48>>2] = $43;
 $49 = (($47) + 4)|0;
 $50 = $49;
 HEAP32[$50>>2] = $46;
 $51 = $width * 0.5;
 $52 = $fringe * 0.5;
 $53 = $51 + $52;
 $54 = $53 / $fringe;
 $55 = ((($frag)) + 160|0);
 HEAPF32[$55>>2] = $54;
 $56 = ((($frag)) + 164|0);
 HEAPF32[$56>>2] = $strokeThr;
 $57 = ((($paint)) + 72|0);
 $58 = HEAP32[$57>>2]|0;
 $59 = ($58|0)==(0);
 do {
  if ($59) {
   $76 = ((($frag)) + 172|0);
   HEAPF32[$76>>2] = 0.0;
   $77 = ((($paint)) + 32|0);
   $78 = HEAP32[$77>>2]|0;
   $79 = ((($frag)) + 152|0);
   HEAP32[$79>>2] = $78;
   $80 = ((($paint)) + 36|0);
   $81 = HEAP32[$80>>2]|0;
   $82 = ((($frag)) + 156|0);
   HEAP32[$82>>2] = $81;
   (_nvgTransformInverse($invxform,$paint)|0);
  } else {
   $60 = (__ZL18glnvg__findTextureP12GLNVGcontexti($gl,$58)|0);
   $61 = ($60|0)==(0|0);
   if ($61) {
    STACKTOP = sp;return;
   }
   $62 = ((($60)) + 20|0);
   $63 = HEAP32[$62>>2]|0;
   $64 = $63 & 8;
   $65 = ($64|0)==(0);
   if ($65) {
    (_nvgTransformInverse($invxform,$paint)|0);
   } else {
    _nvgTransformScale($$byval_copy$1,1.0,-1.0);
    _nvgTransformMultiply($$byval_copy$1,$paint);
    (_nvgTransformInverse($invxform,$$byval_copy$1)|0);
   }
   $66 = ((($frag)) + 172|0);
   HEAPF32[$66>>2] = 1.0;
   $67 = ((($60)) + 16|0);
   $68 = HEAP32[$67>>2]|0;
   $69 = ($68|0)==(2);
   if ($69) {
    $70 = HEAP32[$62>>2]|0;
    $71 = $70 >>> 4;
    $$lobit = $71 & 1;
    $72 = $$lobit ^ 1;
    $73 = (+($72|0));
    $74 = ((($frag)) + 168|0);
    HEAPF32[$74>>2] = $73;
    break;
   } else {
    $75 = ((($frag)) + 168|0);
    HEAPF32[$75>>2] = 2.0;
    break;
   }
  }
 } while(0);
 $83 = ((($frag)) + 48|0);
 __ZL20glnvg__xformToMat3x4PfS_($83,$invxform);
 STACKTOP = sp;return;
}
function __ZL11glnvg__maxiii($a,$b) {
 $a = $a|0;
 $b = $b|0;
 var $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($a|0)>($b|0);
 $1 = $0 ? $a : $b;
 return ($1|0);
}
function __ZL18glnvg__premulColor8NVGcolor($agg$result,$c) {
 $agg$result = $agg$result|0;
 $c = $c|0;
 var $0 = 0, $1 = 0.0, $10 = 0.0, $2 = 0.0, $3 = 0.0, $4 = 0, $5 = 0.0, $6 = 0.0, $7 = 0.0, $8 = 0, $9 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($c)) + 12|0);
 $1 = +HEAPF32[$0>>2];
 $2 = +HEAPF32[$c>>2];
 $3 = $1 * $2;
 HEAPF32[$c>>2] = $3;
 $4 = ((($c)) + 4|0);
 $5 = +HEAPF32[$4>>2];
 $6 = $1 * $5;
 HEAPF32[$4>>2] = $6;
 $7 = +HEAPF32[$0>>2];
 $8 = ((($c)) + 8|0);
 $9 = +HEAPF32[$8>>2];
 $10 = $7 * $9;
 HEAPF32[$8>>2] = $10;
 ;HEAP32[$agg$result>>2]=HEAP32[$c>>2]|0;HEAP32[$agg$result+4>>2]=HEAP32[$c+4>>2]|0;HEAP32[$agg$result+8>>2]=HEAP32[$c+8>>2]|0;HEAP32[$agg$result+12>>2]=HEAP32[$c+12>>2]|0;
 return;
}
function __ZL20glnvg__xformToMat3x4PfS_($m3,$t) {
 $m3 = $m3|0;
 $t = $t|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0;
 var $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[$t>>2]|0;
 HEAP32[$m3>>2] = $0;
 $1 = ((($t)) + 4|0);
 $2 = HEAP32[$1>>2]|0;
 $3 = ((($m3)) + 4|0);
 HEAP32[$3>>2] = $2;
 $4 = ((($m3)) + 8|0);
 HEAPF32[$4>>2] = 0.0;
 $5 = ((($m3)) + 12|0);
 HEAPF32[$5>>2] = 0.0;
 $6 = ((($t)) + 8|0);
 $7 = HEAP32[$6>>2]|0;
 $8 = ((($m3)) + 16|0);
 HEAP32[$8>>2] = $7;
 $9 = ((($t)) + 12|0);
 $10 = HEAP32[$9>>2]|0;
 $11 = ((($m3)) + 20|0);
 HEAP32[$11>>2] = $10;
 $12 = ((($m3)) + 24|0);
 HEAPF32[$12>>2] = 0.0;
 $13 = ((($m3)) + 28|0);
 HEAPF32[$13>>2] = 0.0;
 $14 = ((($t)) + 16|0);
 $15 = HEAP32[$14>>2]|0;
 $16 = ((($m3)) + 32|0);
 HEAP32[$16>>2] = $15;
 $17 = ((($t)) + 20|0);
 $18 = HEAP32[$17>>2]|0;
 $19 = ((($m3)) + 36|0);
 HEAP32[$19>>2] = $18;
 $20 = ((($m3)) + 40|0);
 HEAPF32[$20>>2] = 1.0;
 $21 = ((($m3)) + 44|0);
 HEAPF32[$21>>2] = 0.0;
 return;
}
function __ZL19glnvg__deleteShaderP11GLNVGshader($shader) {
 $shader = $shader|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[$shader>>2]|0;
 $1 = ($0|0)==(0);
 if (!($1)) {
  _glDeleteProgram(($0|0));
 }
 $2 = ((($shader)) + 8|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = ($3|0)==(0);
 if (!($4)) {
  _glDeleteShader(($3|0));
 }
 $5 = ((($shader)) + 4|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = ($6|0)==(0);
 if ($7) {
  return;
 }
 _glDeleteShader(($6|0));
 return;
}
function _emscripten_bind_NanoVGContext_NanoVGContext_2($arg0,$arg1) {
 $arg0 = $arg0|0;
 $arg1 = $arg1|0;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (__Znwj(52)|0);
 __ZN13NanoVGContextC2Eii($0,$arg0,$arg1);
 return ($0|0);
}
function _emscripten_bind_NanoVGContext_createTextureFromImage_2($self,$arg0,$arg1) {
 $self = $self|0;
 $arg0 = $arg0|0;
 $arg1 = $arg1|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 (__ZN13NanoVGContext22createTextureFromImageEii($self,$arg0,$arg1)|0);
 return;
}
function _emscripten_bind_NanoVGContext_glBeginLoop_0($self) {
 $self = $self|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZN13NanoVGContext11glBeginLoopEv($self);
 return;
}
function _emscripten_bind_NanoVGContext_glEndLoop_0($self) {
 $self = $self|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZN13NanoVGContext9glEndLoopEv($self);
 return;
}
function _emscripten_bind_NanoVGContext_save_0($self) {
 $self = $self|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZN13NanoVGContext4saveEv($self);
 return;
}
function _emscripten_bind_NanoVGContext_restore_0($self) {
 $self = $self|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZN13NanoVGContext7restoreEv($self);
 return;
}
function _emscripten_bind_NanoVGContext_translate_2($self,$arg0,$arg1) {
 $self = $self|0;
 $arg0 = $arg0|0;
 $arg1 = $arg1|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZN13NanoVGContext9translateEii($self,$arg0,$arg1);
 return;
}
function _emscripten_bind_NanoVGContext_rect_4($self,$arg0,$arg1,$arg2,$arg3) {
 $self = $self|0;
 $arg0 = $arg0|0;
 $arg1 = $arg1|0;
 $arg2 = $arg2|0;
 $arg3 = $arg3|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZN13NanoVGContext4rectEiiii($self,$arg0,$arg1,$arg2,$arg3);
 return;
}
function _emscripten_bind_NanoVGContext_rotate_1($self,$arg0) {
 $self = $self|0;
 $arg0 = +$arg0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZN13NanoVGContext6rotateEf($self,$arg0);
 return;
}
function _emscripten_bind_NanoVGContext_scale_2($self,$arg0,$arg1) {
 $self = $self|0;
 $arg0 = +$arg0;
 $arg1 = +$arg1;
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZN13NanoVGContext5scaleEff($self,$arg0,$arg1);
 return;
}
function _emscripten_bind_NanoVGContext_scissor_4($self,$arg0,$arg1,$arg2,$arg3) {
 $self = $self|0;
 $arg0 = $arg0|0;
 $arg1 = $arg1|0;
 $arg2 = $arg2|0;
 $arg3 = $arg3|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZN13NanoVGContext7scissorEiiii($self,$arg0,$arg1,$arg2,$arg3);
 return;
}
function _emscripten_bind_NanoVGContext_drawImage_12($self,$arg0,$arg1,$arg2,$arg3,$arg4,$arg5,$arg6,$arg7,$arg8,$arg9,$arg10,$arg11) {
 $self = $self|0;
 $arg0 = $arg0|0;
 $arg1 = $arg1|0;
 $arg2 = $arg2|0;
 $arg3 = $arg3|0;
 $arg4 = $arg4|0;
 $arg5 = $arg5|0;
 $arg6 = $arg6|0;
 $arg7 = $arg7|0;
 $arg8 = $arg8|0;
 $arg9 = $arg9|0;
 $arg10 = $arg10|0;
 $arg11 = $arg11|0;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+($arg11|0));
 __ZN13NanoVGContext9drawImageEiiiiiiiiiiif($self,$arg0,$arg1,$arg2,$arg3,$arg4,$arg5,$arg6,$arg7,$arg8,$arg9,$arg10,$0);
 return;
}
function _emscripten_bind_NanoVGContext_beginPath_0($self) {
 $self = $self|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZN13NanoVGContext9beginPathEv($self);
 return;
}
function _emscripten_bind_NanoVGContext_closePath_0($self) {
 $self = $self|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZN13NanoVGContext9closePathEv($self);
 return;
}
function _emscripten_bind_NanoVGContext_stroke_0($self) {
 $self = $self|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZN13NanoVGContext6strokeEv($self);
 return;
}
function _emscripten_bind_NanoVGContext_moveTo_2($self,$arg0,$arg1) {
 $self = $self|0;
 $arg0 = $arg0|0;
 $arg1 = $arg1|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZN13NanoVGContext6moveToEii($self,$arg0,$arg1);
 return;
}
function _emscripten_bind_NanoVGContext_lineTo_2($self,$arg0,$arg1) {
 $self = $self|0;
 $arg0 = $arg0|0;
 $arg1 = $arg1|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZN13NanoVGContext6lineToEii($self,$arg0,$arg1);
 return;
}
function _emscripten_bind_NanoVGContext_fillRect_4($self,$arg0,$arg1,$arg2,$arg3) {
 $self = $self|0;
 $arg0 = $arg0|0;
 $arg1 = $arg1|0;
 $arg2 = $arg2|0;
 $arg3 = $arg3|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZN13NanoVGContext8fillRectEiiii($self,$arg0,$arg1,$arg2,$arg3);
 return;
}
function _emscripten_bind_NanoVGContext_strokeRect_4($self,$arg0,$arg1,$arg2,$arg3) {
 $self = $self|0;
 $arg0 = $arg0|0;
 $arg1 = $arg1|0;
 $arg2 = $arg2|0;
 $arg3 = $arg3|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZN13NanoVGContext10strokeRectEiiii($self,$arg0,$arg1,$arg2,$arg3);
 return;
}
function _emscripten_bind_NanoVGContext_clearRect_4($self,$arg0,$arg1,$arg2,$arg3) {
 $self = $self|0;
 $arg0 = $arg0|0;
 $arg1 = $arg1|0;
 $arg2 = $arg2|0;
 $arg3 = $arg3|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZN13NanoVGContext9clearRectEiiii($self,$arg0,$arg1,$arg2,$arg3);
 return;
}
function _emscripten_bind_NanoVGContext_fill_0($self) {
 $self = $self|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZN13NanoVGContext4fillEv($self);
 return;
}
function _emscripten_bind_NanoVGContext_fillText_3($self,$arg0,$arg1,$arg2) {
 $self = $self|0;
 $arg0 = $arg0|0;
 $arg1 = $arg1|0;
 $arg2 = $arg2|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZN13NanoVGContext8fillTextEPcii($self,$arg0,$arg1,$arg2);
 return;
}
function _emscripten_bind_NanoVGContext_strokeText_3($self,$arg0,$arg1,$arg2) {
 $self = $self|0;
 $arg0 = $arg0|0;
 $arg1 = $arg1|0;
 $arg2 = $arg2|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZN13NanoVGContext10strokeTextEPcii($self,$arg0,$arg1,$arg2);
 return;
}
function _emscripten_bind_NanoVGContext_arc_6($self,$arg0,$arg1,$arg2,$arg3,$arg4,$arg5) {
 $self = $self|0;
 $arg0 = +$arg0;
 $arg1 = +$arg1;
 $arg2 = +$arg2;
 $arg3 = +$arg3;
 $arg4 = +$arg4;
 $arg5 = $arg5|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZN13NanoVGContext3arcEfffffb($self,$arg0,$arg1,$arg2,$arg3,$arg4,$arg5);
 return;
}
function _emscripten_bind_NanoVGContext_arcTo_5($self,$arg0,$arg1,$arg2,$arg3,$arg4) {
 $self = $self|0;
 $arg0 = +$arg0;
 $arg1 = +$arg1;
 $arg2 = +$arg2;
 $arg3 = +$arg3;
 $arg4 = +$arg4;
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZN13NanoVGContext5arcToEfffff($self,$arg0,$arg1,$arg2,$arg3,$arg4);
 return;
}
function _emscripten_bind_NanoVGContext_bezierCurveTo_6($self,$arg0,$arg1,$arg2,$arg3,$arg4,$arg5) {
 $self = $self|0;
 $arg0 = +$arg0;
 $arg1 = +$arg1;
 $arg2 = +$arg2;
 $arg3 = +$arg3;
 $arg4 = +$arg4;
 $arg5 = +$arg5;
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZN13NanoVGContext13bezierCurveToEffffff($self,$arg0,$arg1,$arg2,$arg3,$arg4,$arg5);
 return;
}
function _emscripten_bind_NanoVGContext_quadraticCurveTo_4($self,$arg0,$arg1,$arg2,$arg3) {
 $self = $self|0;
 $arg0 = +$arg0;
 $arg1 = +$arg1;
 $arg2 = +$arg2;
 $arg3 = +$arg3;
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZN13NanoVGContext16quadraticCurveToEffff($self,$arg0,$arg1,$arg2,$arg3);
 return;
}
function _emscripten_bind_NanoVGContext_set_globalAlpha_1($self,$arg0) {
 $self = $self|0;
 $arg0 = +$arg0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZN13NanoVGContext15set_globalAlphaEf($self,$arg0);
 return;
}
function _emscripten_bind_NanoVGContext_setTransform_6($self,$arg0,$arg1,$arg2,$arg3,$arg4,$arg5) {
 $self = $self|0;
 $arg0 = +$arg0;
 $arg1 = +$arg1;
 $arg2 = +$arg2;
 $arg3 = +$arg3;
 $arg4 = +$arg4;
 $arg5 = +$arg5;
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZN13NanoVGContext12setTransformEffffff($self,$arg0,$arg1,$arg2,$arg3,$arg4,$arg5);
 return;
}
function _emscripten_bind_NanoVGContext_measureText_1($self,$arg0) {
 $self = $self|0;
 $arg0 = $arg0|0;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+__ZN13NanoVGContext11measureTextEPc($self,$arg0));
 return (+$0);
}
function _emscripten_bind_NanoVGContext_get_fillStyle_0($self) {
 $self = $self|0;
 var $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($self)) + 4|0);
 $1 = HEAP32[$0>>2]|0;
 return ($1|0);
}
function _emscripten_bind_NanoVGContext_set_fillStyle_1($self,$arg0) {
 $self = $self|0;
 $arg0 = $arg0|0;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($self)) + 4|0);
 HEAP32[$0>>2] = $arg0;
 return;
}
function _emscripten_bind_NanoVGContext_get_strokeStyle_0($self) {
 $self = $self|0;
 var $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($self)) + 8|0);
 $1 = HEAP32[$0>>2]|0;
 return ($1|0);
}
function _emscripten_bind_NanoVGContext_set_strokeStyle_1($self,$arg0) {
 $self = $self|0;
 $arg0 = $arg0|0;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($self)) + 8|0);
 HEAP32[$0>>2] = $arg0;
 return;
}
function _emscripten_bind_NanoVGContext_get_textAlign_0($self) {
 $self = $self|0;
 var $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($self)) + 16|0);
 $1 = HEAP32[$0>>2]|0;
 return ($1|0);
}
function _emscripten_bind_NanoVGContext_set_textAlign_1($self,$arg0) {
 $self = $self|0;
 $arg0 = $arg0|0;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($self)) + 16|0);
 HEAP32[$0>>2] = $arg0;
 return;
}
function _emscripten_bind_NanoVGContext_get_font_0($self) {
 $self = $self|0;
 var $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($self)) + 12|0);
 $1 = HEAP32[$0>>2]|0;
 return ($1|0);
}
function _emscripten_bind_NanoVGContext_set_font_1($self,$arg0) {
 $self = $self|0;
 $arg0 = $arg0|0;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($self)) + 12|0);
 HEAP32[$0>>2] = $arg0;
 return;
}
function _emscripten_bind_NanoVGContext_get_text_0($self) {
 $self = $self|0;
 var $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($self)) + 24|0);
 $1 = HEAP32[$0>>2]|0;
 return ($1|0);
}
function _emscripten_bind_NanoVGContext_set_text_1($self,$arg0) {
 $self = $self|0;
 $arg0 = $arg0|0;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($self)) + 24|0);
 HEAP32[$0>>2] = $arg0;
 return;
}
function _emscripten_bind_NanoVGContext_get_drawImageMapID_0($self) {
 $self = $self|0;
 var $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($self)) + 36|0);
 $1 = HEAP32[$0>>2]|0;
 return ($1|0);
}
function _emscripten_bind_NanoVGContext_set_drawImageMapID_1($self,$arg0) {
 $self = $self|0;
 $arg0 = $arg0|0;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($self)) + 36|0);
 HEAP32[$0>>2] = $arg0;
 return;
}
function _emscripten_bind_NanoVGContext_get_drawTextMapID_0($self) {
 $self = $self|0;
 var $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($self)) + 40|0);
 $1 = HEAP32[$0>>2]|0;
 return ($1|0);
}
function _emscripten_bind_NanoVGContext_set_drawTextMapID_1($self,$arg0) {
 $self = $self|0;
 $arg0 = $arg0|0;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($self)) + 40|0);
 HEAP32[$0>>2] = $arg0;
 return;
}
function _emscripten_bind_NanoVGContext___destroy___0($self) {
 $self = $self|0;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($self|0)==(0|0);
 if ($0) {
  return;
 }
 __ZN13NanoVGContextD2Ev($self);
 __ZdlPv($self);
 return;
}
function _emscripten_bind_VoidPtr___destroy___0($self) {
 $self = $self|0;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($self|0)==(0|0);
 if ($0) {
  return;
 }
 __ZdlPv($self);
 return;
}
function _rgba_init() {
 var $$cast = 0, $$lcssa = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0;
 var $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0;
 var $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0;
 var $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0;
 var $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0;
 var $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0;
 var $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0;
 var $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0;
 var $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0;
 var $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0;
 var $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0;
 var $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0;
 var $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0;
 var $330 = 0, $331 = 0, $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0;
 var $349 = 0, $35 = 0, $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0;
 var $367 = 0, $368 = 0, $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0;
 var $385 = 0, $386 = 0, $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0, $391 = 0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0, $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0, $401 = 0;
 var $402 = 0, $403 = 0, $404 = 0, $405 = 0, $406 = 0, $407 = 0, $408 = 0, $409 = 0, $41 = 0, $410 = 0, $411 = 0, $412 = 0, $413 = 0, $414 = 0, $415 = 0, $416 = 0, $417 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0;
 var $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0;
 var $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0;
 var $_he_bkt_i$031 = 0, $_he_thh$027 = 0, $_hj_i$0$lcssa = 0, $_hj_i$023 = 0, $_hj_i$1 = 0, $_hj_i$2 = 0, $_hj_i$3 = 0, $_hj_i$4 = 0, $_hj_j$0$lcssa = 0, $_hj_j$022 = 0, $_hj_j$1 = 0, $_hj_j$2 = 0, $_hj_j$3 = 0, $_hj_j$4 = 0, $_hj_j$5 = 0, $_hj_j$6 = 0, $_hj_j$7 = 0, $_hj_j$8 = 0, $_hj_k$0$lcssa = 0, $_hj_k$021 = 0;
 var $_hj_key$0$lcssa = 0, $_hj_key$020 = 0, $i$036 = 0, dest = 0, label = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 $0 = HEAP8[14430]|0;
 $1 = ($0<<24>>24)==(0);
 if (!($1)) {
  return;
 }
 HEAP8[14430] = 1;
 $2 = HEAP32[24]|0;
 $3 = ($2|0)==(0|0);
 if ($3) {
  return;
 } else {
  $7 = 96;$i$036 = 0;
 }
 while(1) {
  $4 = (((96 + (($i$036*52)|0)|0)) + 20|0);
  $5 = (((96 + (($i$036*52)|0)|0)) + 28|0);
  HEAP32[$5>>2] = 0;
  $6 = HEAP32[$7>>2]|0;
  $8 = (((96 + (($i$036*52)|0)|0)) + 40|0);
  HEAP32[$8>>2] = $6;
  $$cast = $6;
  $9 = (_strlen($$cast)|0);
  $10 = (((96 + (($i$036*52)|0)|0)) + 44|0);
  HEAP32[$10>>2] = $9;
  $11 = HEAP32[1961]|0;
  $12 = ($11|0)==(0|0);
  if ($12) {
   HEAP32[1961] = $7;
   $13 = (((96 + (($i$036*52)|0)|0)) + 24|0);
   HEAP32[$13>>2] = 0;
   $14 = (_malloc(44)|0);
   $15 = HEAP32[1961]|0;
   $16 = ((($15)) + 20|0);
   HEAP32[$16>>2] = $14;
   $17 = ($14|0)==(0|0);
   if ($17) {
    label = 5;
    break;
   }
   dest=$14; stop=dest+44|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
   $18 = HEAP32[1961]|0;
   $19 = ((($18)) + 20|0);
   $20 = HEAP32[$19>>2]|0;
   $21 = ((($20)) + 16|0);
   HEAP32[$21>>2] = $19;
   $22 = ((($18)) + 20|0);
   $23 = HEAP32[$22>>2]|0;
   $24 = ((($23)) + 4|0);
   HEAP32[$24>>2] = 32;
   $25 = HEAP32[1961]|0;
   $26 = ((($25)) + 20|0);
   $27 = HEAP32[$26>>2]|0;
   $28 = ((($27)) + 8|0);
   HEAP32[$28>>2] = 5;
   $29 = ((($25)) + 20|0);
   $30 = HEAP32[$29>>2]|0;
   $31 = ((($30)) + 20|0);
   HEAP32[$31>>2] = 20;
   $32 = (_malloc(384)|0);
   $33 = HEAP32[1961]|0;
   $34 = ((($33)) + 20|0);
   $35 = HEAP32[$34>>2]|0;
   HEAP32[$35>>2] = $32;
   $36 = ((($33)) + 20|0);
   $37 = HEAP32[$36>>2]|0;
   $38 = HEAP32[$37>>2]|0;
   $39 = ($38|0)==(0|0);
   if ($39) {
    label = 7;
    break;
   }
   _memset(($38|0),0,384)|0;
   $40 = HEAP32[1961]|0;
   $41 = ((($40)) + 20|0);
   $42 = HEAP32[$41>>2]|0;
   $43 = ((($42)) + 40|0);
   HEAP32[$43>>2] = -1609490463;
  } else {
   $44 = ((($11)) + 20|0);
   $45 = HEAP32[$44>>2]|0;
   $46 = ((($45)) + 16|0);
   $47 = HEAP32[$46>>2]|0;
   $48 = ((($47)) + 8|0);
   HEAP32[$48>>2] = $7;
   $49 = HEAP32[1961]|0;
   $50 = ((($49)) + 20|0);
   $51 = HEAP32[$50>>2]|0;
   $52 = ((($51)) + 16|0);
   $53 = HEAP32[$52>>2]|0;
   $54 = ((($51)) + 20|0);
   $55 = HEAP32[$54>>2]|0;
   $56 = (0 - ($55))|0;
   $57 = (($53) + ($56)|0);
   $58 = (((96 + (($i$036*52)|0)|0)) + 24|0);
   HEAP32[$58>>2] = $57;
   $59 = HEAP32[1961]|0;
   $60 = ((($59)) + 20|0);
   $61 = HEAP32[$60>>2]|0;
   $62 = ((($61)) + 16|0);
   HEAP32[$62>>2] = $4;
  }
  $63 = HEAP32[1961]|0;
  $64 = ((($63)) + 20|0);
  $65 = HEAP32[$64>>2]|0;
  $66 = ((($65)) + 12|0);
  $67 = HEAP32[$66>>2]|0;
  $68 = (($67) + 1)|0;
  HEAP32[$66>>2] = $68;
  $69 = HEAP32[1961]|0;
  $70 = ((($69)) + 20|0);
  $71 = HEAP32[$70>>2]|0;
  HEAP32[$4>>2] = $71;
  $72 = HEAP32[$7>>2]|0;
  $73 = (((96 + (($i$036*52)|0)|0)) + 48|0);
  HEAP32[$73>>2] = -17973521;
  $74 = (_strlen($72)|0);
  $75 = ($74>>>0)>(11);
  if ($75) {
   $_hj_i$023 = -1640531527;$_hj_j$022 = -1640531527;$_hj_k$021 = $74;$_hj_key$020 = $72;
   while(1) {
    $76 = HEAP8[$_hj_key$020>>0]|0;
    $77 = $76&255;
    $78 = ((($_hj_key$020)) + 1|0);
    $79 = HEAP8[$78>>0]|0;
    $80 = $79&255;
    $81 = $80 << 8;
    $82 = $81 | $77;
    $83 = ((($_hj_key$020)) + 2|0);
    $84 = HEAP8[$83>>0]|0;
    $85 = $84&255;
    $86 = $85 << 16;
    $87 = $82 | $86;
    $88 = ((($_hj_key$020)) + 3|0);
    $89 = HEAP8[$88>>0]|0;
    $90 = $89&255;
    $91 = $90 << 24;
    $92 = $87 | $91;
    $93 = (($92) + ($_hj_i$023))|0;
    $94 = ((($_hj_key$020)) + 4|0);
    $95 = HEAP8[$94>>0]|0;
    $96 = $95&255;
    $97 = ((($_hj_key$020)) + 5|0);
    $98 = HEAP8[$97>>0]|0;
    $99 = $98&255;
    $100 = $99 << 8;
    $101 = $100 | $96;
    $102 = ((($_hj_key$020)) + 6|0);
    $103 = HEAP8[$102>>0]|0;
    $104 = $103&255;
    $105 = $104 << 16;
    $106 = $101 | $105;
    $107 = ((($_hj_key$020)) + 7|0);
    $108 = HEAP8[$107>>0]|0;
    $109 = $108&255;
    $110 = $109 << 24;
    $111 = $106 | $110;
    $112 = (($111) + ($_hj_j$022))|0;
    $113 = ((($_hj_key$020)) + 8|0);
    $114 = HEAP8[$113>>0]|0;
    $115 = $114&255;
    $116 = ((($_hj_key$020)) + 9|0);
    $117 = HEAP8[$116>>0]|0;
    $118 = $117&255;
    $119 = $118 << 8;
    $120 = $119 | $115;
    $121 = ((($_hj_key$020)) + 10|0);
    $122 = HEAP8[$121>>0]|0;
    $123 = $122&255;
    $124 = $123 << 16;
    $125 = $120 | $124;
    $126 = ((($_hj_key$020)) + 11|0);
    $127 = HEAP8[$126>>0]|0;
    $128 = $127&255;
    $129 = $128 << 24;
    $130 = $125 | $129;
    $131 = HEAP32[$73>>2]|0;
    $132 = (($130) + ($131))|0;
    $133 = (($93) - ($112))|0;
    $134 = (($133) - ($132))|0;
    $135 = $132 >>> 13;
    $136 = $134 ^ $135;
    $137 = (($112) - ($132))|0;
    $138 = (($137) - ($136))|0;
    $139 = $136 << 8;
    $140 = $138 ^ $139;
    $141 = (($132) - ($136))|0;
    $142 = (($141) - ($140))|0;
    $143 = $140 >>> 13;
    $144 = $142 ^ $143;
    $145 = (($136) - ($140))|0;
    $146 = (($145) - ($144))|0;
    $147 = $144 >>> 12;
    $148 = $146 ^ $147;
    $149 = (($140) - ($144))|0;
    $150 = (($149) - ($148))|0;
    $151 = $148 << 16;
    $152 = $150 ^ $151;
    $153 = (($144) - ($148))|0;
    $154 = (($153) - ($152))|0;
    $155 = $152 >>> 5;
    $156 = $154 ^ $155;
    $157 = (($148) - ($152))|0;
    $158 = (($157) - ($156))|0;
    $159 = $156 >>> 3;
    $160 = $158 ^ $159;
    $161 = (($152) - ($156))|0;
    $162 = (($161) - ($160))|0;
    $163 = $160 << 10;
    $164 = $162 ^ $163;
    $165 = (($156) - ($160))|0;
    $166 = (($165) - ($164))|0;
    $167 = $164 >>> 15;
    $168 = $166 ^ $167;
    HEAP32[$73>>2] = $168;
    $169 = ((($_hj_key$020)) + 12|0);
    $170 = (($_hj_k$021) + -12)|0;
    $171 = ($170>>>0)>(11);
    if ($171) {
     $_hj_i$023 = $160;$_hj_j$022 = $164;$_hj_k$021 = $170;$_hj_key$020 = $169;
    } else {
     $_hj_i$0$lcssa = $160;$_hj_j$0$lcssa = $164;$_hj_k$0$lcssa = $170;$_hj_key$0$lcssa = $169;
     break;
    }
   }
  } else {
   $_hj_i$0$lcssa = -1640531527;$_hj_j$0$lcssa = -1640531527;$_hj_k$0$lcssa = $74;$_hj_key$0$lcssa = $72;
  }
  $172 = HEAP32[$7>>2]|0;
  $173 = (_strlen($172)|0);
  $174 = HEAP32[$73>>2]|0;
  $175 = (($174) + ($173))|0;
  HEAP32[$73>>2] = $175;
  switch ($_hj_k$0$lcssa|0) {
  case 11:  {
   $176 = ((($_hj_key$0$lcssa)) + 10|0);
   $177 = HEAP8[$176>>0]|0;
   $178 = $177&255;
   $179 = $178 << 24;
   $180 = (($179) + ($175))|0;
   HEAP32[$73>>2] = $180;
   label = 14;
   break;
  }
  case 10:  {
   label = 14;
   break;
  }
  case 9:  {
   label = 15;
   break;
  }
  case 8:  {
   label = 16;
   break;
  }
  case 7:  {
   $_hj_j$1 = $_hj_j$0$lcssa;
   label = 17;
   break;
  }
  case 6:  {
   $_hj_j$2 = $_hj_j$0$lcssa;
   label = 18;
   break;
  }
  case 5:  {
   $_hj_j$3 = $_hj_j$0$lcssa;
   label = 19;
   break;
  }
  case 4:  {
   $_hj_j$4 = $_hj_j$0$lcssa;
   label = 20;
   break;
  }
  case 3:  {
   $_hj_i$1 = $_hj_i$0$lcssa;$_hj_j$5 = $_hj_j$0$lcssa;
   label = 21;
   break;
  }
  case 2:  {
   $_hj_i$2 = $_hj_i$0$lcssa;$_hj_j$6 = $_hj_j$0$lcssa;
   label = 22;
   break;
  }
  case 1:  {
   $_hj_i$3 = $_hj_i$0$lcssa;$_hj_j$7 = $_hj_j$0$lcssa;
   label = 23;
   break;
  }
  default: {
   $_hj_i$4 = $_hj_i$0$lcssa;$_hj_j$8 = $_hj_j$0$lcssa;
  }
  }
  if ((label|0) == 14) {
   label = 0;
   $181 = ((($_hj_key$0$lcssa)) + 9|0);
   $182 = HEAP8[$181>>0]|0;
   $183 = $182&255;
   $184 = $183 << 16;
   $185 = HEAP32[$73>>2]|0;
   $186 = (($184) + ($185))|0;
   HEAP32[$73>>2] = $186;
   label = 15;
  }
  if ((label|0) == 15) {
   label = 0;
   $187 = ((($_hj_key$0$lcssa)) + 8|0);
   $188 = HEAP8[$187>>0]|0;
   $189 = $188&255;
   $190 = $189 << 8;
   $191 = HEAP32[$73>>2]|0;
   $192 = (($190) + ($191))|0;
   HEAP32[$73>>2] = $192;
   label = 16;
  }
  if ((label|0) == 16) {
   label = 0;
   $193 = ((($_hj_key$0$lcssa)) + 7|0);
   $194 = HEAP8[$193>>0]|0;
   $195 = $194&255;
   $196 = $195 << 24;
   $197 = (($196) + ($_hj_j$0$lcssa))|0;
   $_hj_j$1 = $197;
   label = 17;
  }
  if ((label|0) == 17) {
   label = 0;
   $198 = ((($_hj_key$0$lcssa)) + 6|0);
   $199 = HEAP8[$198>>0]|0;
   $200 = $199&255;
   $201 = $200 << 16;
   $202 = (($201) + ($_hj_j$1))|0;
   $_hj_j$2 = $202;
   label = 18;
  }
  if ((label|0) == 18) {
   label = 0;
   $203 = ((($_hj_key$0$lcssa)) + 5|0);
   $204 = HEAP8[$203>>0]|0;
   $205 = $204&255;
   $206 = $205 << 8;
   $207 = (($206) + ($_hj_j$2))|0;
   $_hj_j$3 = $207;
   label = 19;
  }
  if ((label|0) == 19) {
   label = 0;
   $208 = ((($_hj_key$0$lcssa)) + 4|0);
   $209 = HEAP8[$208>>0]|0;
   $210 = $209&255;
   $211 = (($210) + ($_hj_j$3))|0;
   $_hj_j$4 = $211;
   label = 20;
  }
  if ((label|0) == 20) {
   label = 0;
   $212 = ((($_hj_key$0$lcssa)) + 3|0);
   $213 = HEAP8[$212>>0]|0;
   $214 = $213&255;
   $215 = $214 << 24;
   $216 = (($215) + ($_hj_i$0$lcssa))|0;
   $_hj_i$1 = $216;$_hj_j$5 = $_hj_j$4;
   label = 21;
  }
  if ((label|0) == 21) {
   label = 0;
   $217 = ((($_hj_key$0$lcssa)) + 2|0);
   $218 = HEAP8[$217>>0]|0;
   $219 = $218&255;
   $220 = $219 << 16;
   $221 = (($220) + ($_hj_i$1))|0;
   $_hj_i$2 = $221;$_hj_j$6 = $_hj_j$5;
   label = 22;
  }
  if ((label|0) == 22) {
   label = 0;
   $222 = ((($_hj_key$0$lcssa)) + 1|0);
   $223 = HEAP8[$222>>0]|0;
   $224 = $223&255;
   $225 = $224 << 8;
   $226 = (($225) + ($_hj_i$2))|0;
   $_hj_i$3 = $226;$_hj_j$7 = $_hj_j$6;
   label = 23;
  }
  if ((label|0) == 23) {
   label = 0;
   $227 = HEAP8[$_hj_key$0$lcssa>>0]|0;
   $228 = $227&255;
   $229 = (($228) + ($_hj_i$3))|0;
   $_hj_i$4 = $229;$_hj_j$8 = $_hj_j$7;
  }
  $230 = (($_hj_i$4) - ($_hj_j$8))|0;
  $231 = HEAP32[$73>>2]|0;
  $232 = (($230) - ($231))|0;
  $233 = $231 >>> 13;
  $234 = $232 ^ $233;
  $235 = (($_hj_j$8) - ($231))|0;
  $236 = (($235) - ($234))|0;
  $237 = $234 << 8;
  $238 = $236 ^ $237;
  $239 = (($231) - ($234))|0;
  $240 = (($239) - ($238))|0;
  $241 = $238 >>> 13;
  $242 = $240 ^ $241;
  $243 = (($234) - ($238))|0;
  $244 = (($243) - ($242))|0;
  $245 = $242 >>> 12;
  $246 = $244 ^ $245;
  $247 = (($238) - ($242))|0;
  $248 = (($247) - ($246))|0;
  $249 = $246 << 16;
  $250 = $248 ^ $249;
  $251 = (($242) - ($246))|0;
  $252 = (($251) - ($250))|0;
  $253 = $250 >>> 5;
  $254 = $252 ^ $253;
  $255 = (($246) - ($250))|0;
  $256 = (($255) - ($254))|0;
  $257 = $254 >>> 3;
  $258 = $256 ^ $257;
  $259 = (($250) - ($254))|0;
  $260 = (($259) - ($258))|0;
  $261 = $258 << 10;
  $262 = $260 ^ $261;
  $263 = (($254) - ($258))|0;
  $264 = (($263) - ($262))|0;
  $265 = $262 >>> 15;
  $266 = $264 ^ $265;
  HEAP32[$73>>2] = $266;
  $267 = HEAP32[1961]|0;
  $268 = ((($267)) + 20|0);
  $269 = HEAP32[$268>>2]|0;
  $270 = ((($269)) + 4|0);
  $271 = HEAP32[$270>>2]|0;
  $272 = (($271) + -1)|0;
  $273 = $266 & $272;
  $274 = HEAP32[$269>>2]|0;
  $275 = (((($274) + (($273*12)|0)|0)) + 4|0);
  $276 = HEAP32[$275>>2]|0;
  $277 = (($276) + 1)|0;
  HEAP32[$275>>2] = $277;
  $278 = HEAP32[1961]|0;
  $279 = ((($278)) + 20|0);
  $280 = HEAP32[$279>>2]|0;
  $281 = HEAP32[$280>>2]|0;
  $282 = (($281) + (($273*12)|0)|0);
  $283 = HEAP32[$282>>2]|0;
  $284 = (((96 + (($i$036*52)|0)|0)) + 36|0);
  HEAP32[$284>>2] = $283;
  $285 = (((96 + (($i$036*52)|0)|0)) + 32|0);
  HEAP32[$285>>2] = 0;
  $286 = HEAP32[1961]|0;
  $287 = ((($286)) + 20|0);
  $288 = HEAP32[$287>>2]|0;
  $289 = HEAP32[$288>>2]|0;
  $290 = (($289) + (($273*12)|0)|0);
  $291 = HEAP32[$290>>2]|0;
  $292 = ($291|0)==(0|0);
  if (!($292)) {
   $293 = ((($291)) + 12|0);
   HEAP32[$293>>2] = $4;
  }
  $294 = HEAP32[1961]|0;
  $295 = ((($294)) + 20|0);
  $296 = HEAP32[$295>>2]|0;
  $297 = HEAP32[$296>>2]|0;
  $298 = (($297) + (($273*12)|0)|0);
  HEAP32[$298>>2] = $4;
  $299 = HEAP32[1961]|0;
  $300 = ((($299)) + 20|0);
  $301 = HEAP32[$300>>2]|0;
  $302 = HEAP32[$301>>2]|0;
  $303 = (((($302) + (($273*12)|0)|0)) + 4|0);
  $304 = HEAP32[$303>>2]|0;
  $305 = (((($302) + (($273*12)|0)|0)) + 8|0);
  $306 = HEAP32[$305>>2]|0;
  $307 = ($306*10)|0;
  $308 = (($307) + 10)|0;
  $309 = ($304>>>0)<($308>>>0);
  if (!($309)) {
   $310 = HEAP32[$4>>2]|0;
   $311 = ((($310)) + 36|0);
   $312 = HEAP32[$311>>2]|0;
   $313 = ($312|0)==(1);
   if (!($313)) {
    $314 = ((($310)) + 4|0);
    $315 = HEAP32[$314>>2]|0;
    $316 = ($315*24)|0;
    $317 = (_malloc($316)|0);
    $318 = ($317|0)==(0|0);
    if ($318) {
     label = 29;
     break;
    }
    $319 = HEAP32[$4>>2]|0;
    $320 = ((($319)) + 4|0);
    $321 = HEAP32[$320>>2]|0;
    $322 = ($321*24)|0;
    _memset(($317|0),0,($322|0))|0;
    $323 = ((($319)) + 12|0);
    $324 = HEAP32[$323>>2]|0;
    $325 = ((($319)) + 8|0);
    $326 = HEAP32[$325>>2]|0;
    $327 = (($326) + 1)|0;
    $328 = $324 >>> $327;
    $329 = ((($319)) + 4|0);
    $330 = HEAP32[$329>>2]|0;
    $331 = $330 << 1;
    $332 = (($331) + -1)|0;
    $333 = $332 & $324;
    $334 = ($333|0)!=(0);
    $335 = $334&1;
    $336 = (($335) + ($328))|0;
    $337 = ((($319)) + 24|0);
    HEAP32[$337>>2] = $336;
    $338 = HEAP32[$4>>2]|0;
    $339 = ((($338)) + 28|0);
    HEAP32[$339>>2] = 0;
    $340 = HEAP32[$4>>2]|0;
    $341 = ((($340)) + 4|0);
    $342 = HEAP32[$341>>2]|0;
    $343 = ($342|0)==(0);
    if ($343) {
     $$lcssa = $340;
    } else {
     $344 = HEAP32[$4>>2]|0;
     $345 = ((($344)) + 4|0);
     $346 = HEAP32[$345>>2]|0;
     $348 = $340;$_he_bkt_i$031 = 0;
     while(1) {
      $347 = HEAP32[$348>>2]|0;
      $349 = (($347) + (($_he_bkt_i$031*12)|0)|0);
      $350 = HEAP32[$349>>2]|0;
      $351 = ($350|0)==(0|0);
      if (!($351)) {
       $352 = HEAP32[$4>>2]|0;
       $353 = ((($352)) + 4|0);
       $354 = HEAP32[$353>>2]|0;
       $355 = $354 << 1;
       $356 = (($355) + -1)|0;
       $357 = ((($352)) + 24|0);
       $358 = HEAP32[$357>>2]|0;
       $359 = ((($352)) + 28|0);
       $_he_thh$027 = $350;
       while(1) {
        $360 = ((($_he_thh$027)) + 16|0);
        $361 = HEAP32[$360>>2]|0;
        $362 = ((($_he_thh$027)) + 28|0);
        $363 = HEAP32[$362>>2]|0;
        $364 = $356 & $363;
        $365 = (($317) + (($364*12)|0)|0);
        $366 = (((($317) + (($364*12)|0)|0)) + 4|0);
        $367 = HEAP32[$366>>2]|0;
        $368 = (($367) + 1)|0;
        HEAP32[$366>>2] = $368;
        $369 = ($368>>>0)>($358>>>0);
        if ($369) {
         $370 = HEAP32[$359>>2]|0;
         $371 = (($370) + 1)|0;
         HEAP32[$359>>2] = $371;
         $372 = HEAP32[$366>>2]|0;
         $373 = HEAP32[$4>>2]|0;
         $374 = ((($373)) + 24|0);
         $375 = HEAP32[$374>>2]|0;
         $376 = (($372>>>0) / ($375>>>0))&-1;
         $377 = (((($317) + (($364*12)|0)|0)) + 8|0);
         HEAP32[$377>>2] = $376;
        }
        $378 = ((($_he_thh$027)) + 12|0);
        HEAP32[$378>>2] = 0;
        $379 = HEAP32[$365>>2]|0;
        HEAP32[$360>>2] = $379;
        $380 = HEAP32[$365>>2]|0;
        $381 = ($380|0)==(0|0);
        if (!($381)) {
         $382 = ((($380)) + 12|0);
         HEAP32[$382>>2] = $_he_thh$027;
        }
        HEAP32[$365>>2] = $_he_thh$027;
        $383 = ($361|0)==(0|0);
        if ($383) {
         break;
        } else {
         $_he_thh$027 = $361;
        }
       }
      }
      $384 = (($_he_bkt_i$031) + 1)|0;
      $385 = ($384>>>0)<($346>>>0);
      if ($385) {
       $348 = $344;$_he_bkt_i$031 = $384;
      } else {
       $$lcssa = $344;
       break;
      }
     }
    }
    $386 = HEAP32[$$lcssa>>2]|0;
    _free($386);
    $387 = HEAP32[$4>>2]|0;
    $388 = ((($387)) + 4|0);
    $389 = HEAP32[$388>>2]|0;
    $390 = $389 << 1;
    HEAP32[$388>>2] = $390;
    $391 = HEAP32[$4>>2]|0;
    $392 = ((($391)) + 8|0);
    $393 = HEAP32[$392>>2]|0;
    $394 = (($393) + 1)|0;
    HEAP32[$392>>2] = $394;
    $395 = HEAP32[$4>>2]|0;
    HEAP32[$395>>2] = $317;
    $396 = HEAP32[$4>>2]|0;
    $397 = ((($396)) + 28|0);
    $398 = HEAP32[$397>>2]|0;
    $399 = ((($396)) + 12|0);
    $400 = HEAP32[$399>>2]|0;
    $401 = $400 >>> 1;
    $402 = ($398>>>0)>($401>>>0);
    if ($402) {
     $403 = ((($396)) + 32|0);
     $404 = HEAP32[$403>>2]|0;
     $405 = (($404) + 1)|0;
     $408 = $405;
    } else {
     $408 = 0;
    }
    $406 = HEAP32[$4>>2]|0;
    $407 = ((($406)) + 32|0);
    HEAP32[$407>>2] = $408;
    $409 = HEAP32[$4>>2]|0;
    $410 = ((($409)) + 32|0);
    $411 = HEAP32[$410>>2]|0;
    $412 = ($411>>>0)>(1);
    if ($412) {
     $413 = ((($409)) + 36|0);
     HEAP32[$413>>2] = 1;
    }
   }
  }
  $414 = (($i$036) + 1)|0;
  $415 = (96 + (($414*52)|0)|0);
  $416 = HEAP32[$415>>2]|0;
  $417 = ($416|0)==(0|0);
  if ($417) {
   label = 45;
   break;
  } else {
   $7 = $415;$i$036 = $414;
  }
 }
 if ((label|0) == 5) {
  _exit(-1);
  // unreachable;
 }
 else if ((label|0) == 7) {
  _exit(-1);
  // unreachable;
 }
 else if ((label|0) == 29) {
  _exit(-1);
  // unreachable;
 }
 else if ((label|0) == 45) {
  return;
 }
}
function _fonsCreateInternal($params) {
 $params = $params|0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0;
 var $26 = 0, $27 = 0, $28 = 0.0, $29 = 0.0, $3 = 0, $30 = 0, $31 = 0, $32 = 0.0, $33 = 0.0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0;
 var $44 = 0, $45 = 0, $46 = 0, $47 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, dest = 0, label = 0, sp = 0, src = 0, stop = 0;
 sp = STACKTOP;
 $0 = (_malloc(21064)|0);
 $1 = ($0|0)==(0|0);
 do {
  if (!($1)) {
   $2 = ((($0)) + 36|0);
   _memset(($2|0),0,21028)|0;
   dest=$0; src=$params; stop=dest+36|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
   $3 = (_malloc(16000)|0);
   $4 = ((($0)) + 20564|0);
   HEAP32[$4>>2] = $3;
   $5 = ($3|0)==(0|0);
   if (!($5)) {
    $6 = ((($0)) + 16|0);
    $7 = HEAP32[$6>>2]|0;
    $8 = ($7|0)==(0|0);
    if (!($8)) {
     $9 = ((($0)) + 12|0);
     $10 = HEAP32[$9>>2]|0;
     $11 = HEAP32[$0>>2]|0;
     $12 = ((($0)) + 4|0);
     $13 = HEAP32[$12>>2]|0;
     $14 = (FUNCTION_TABLE_iiii[$7 & 7]($10,$11,$13)|0);
     $15 = ($14|0)==(0);
     if ($15) {
      break;
     }
    }
    $16 = HEAP32[$0>>2]|0;
    $17 = ((($0)) + 4|0);
    $18 = HEAP32[$17>>2]|0;
    $19 = (_fons__allocAtlas($16,$18)|0);
    $20 = ((($0)) + 68|0);
    HEAP32[$20>>2] = $19;
    $21 = ($19|0)==(0|0);
    if (!($21)) {
     $22 = (_malloc(16)|0);
     $23 = ((($0)) + 64|0);
     HEAP32[$23>>2] = $22;
     $24 = ($22|0)==(0|0);
     if (!($24)) {
      ;HEAP32[$22>>2]=0|0;HEAP32[$22+4>>2]=0|0;HEAP32[$22+8>>2]=0|0;HEAP32[$22+12>>2]=0|0;
      $25 = ((($0)) + 72|0);
      HEAP32[$25>>2] = 4;
      $26 = ((($0)) + 76|0);
      HEAP32[$26>>2] = 0;
      $27 = HEAP32[$0>>2]|0;
      $28 = (+($27|0));
      $29 = 1.0 / $28;
      $30 = ((($0)) + 36|0);
      HEAPF32[$30>>2] = $29;
      $31 = HEAP32[$17>>2]|0;
      $32 = (+($31|0));
      $33 = 1.0 / $32;
      $34 = ((($0)) + 40|0);
      HEAPF32[$34>>2] = $33;
      $35 = HEAP32[$0>>2]|0;
      $36 = HEAP32[$17>>2]|0;
      $37 = Math_imul($36, $35)|0;
      $38 = (_malloc($37)|0);
      $39 = ((($0)) + 44|0);
      HEAP32[$39>>2] = $38;
      $40 = ($38|0)==(0|0);
      if (!($40)) {
       $41 = HEAP32[$0>>2]|0;
       $42 = HEAP32[$17>>2]|0;
       $43 = Math_imul($42, $41)|0;
       _memset(($38|0),0,($43|0))|0;
       $44 = ((($0)) + 48|0);
       HEAP32[$44>>2] = $41;
       $45 = ((($0)) + 52|0);
       HEAP32[$45>>2] = $42;
       $46 = ((($0)) + 56|0);
       HEAP32[$46>>2] = 0;
       $47 = ((($0)) + 60|0);
       HEAP32[$47>>2] = 0;
       _fons__addWhiteRect($0);
       _fonsPushState($0);
       _fonsClearState($0);
       $$0 = $0;
       return ($$0|0);
      }
     }
    }
   }
  }
 } while(0);
 _fonsDeleteInternal($0);
 $$0 = 0;
 return ($$0|0);
}
function _fonsPushState($stash) {
 $stash = $stash|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($stash)) + 21052|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)>(19);
 if ($2) {
  $3 = ((($stash)) + 21056|0);
  $4 = HEAP32[$3>>2]|0;
  $5 = ($4|0)==(0|0);
  if ($5) {
   return;
  }
  $6 = ((($stash)) + 21060|0);
  $7 = HEAP32[$6>>2]|0;
  FUNCTION_TABLE_viii[$4 & 1]($7,3,0);
  return;
 } else {
  $8 = ($1|0)>(0);
  if ($8) {
   $9 = (((($stash)) + 20572|0) + (($1*24)|0)|0);
   $10 = (($1) + -1)|0;
   $11 = (((($stash)) + 20572|0) + (($10*24)|0)|0);
   ;HEAP32[$9>>2]=HEAP32[$11>>2]|0;HEAP32[$9+4>>2]=HEAP32[$11+4>>2]|0;HEAP32[$9+8>>2]=HEAP32[$11+8>>2]|0;HEAP32[$9+12>>2]=HEAP32[$11+12>>2]|0;HEAP32[$9+16>>2]=HEAP32[$11+16>>2]|0;HEAP32[$9+20>>2]=HEAP32[$11+20>>2]|0;
  }
  $12 = HEAP32[$0>>2]|0;
  $13 = (($12) + 1)|0;
  HEAP32[$0>>2] = $13;
  return;
 }
}
function _fonsClearState($stash) {
 $stash = $stash|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (_fons__getState($stash)|0);
 $1 = ((($0)) + 8|0);
 HEAPF32[$1>>2] = 12.0;
 $2 = ((($0)) + 12|0);
 HEAP32[$2>>2] = -1;
 HEAP32[$0>>2] = 0;
 $3 = ((($0)) + 16|0);
 HEAPF32[$3>>2] = 0.0;
 $4 = ((($0)) + 20|0);
 HEAPF32[$4>>2] = 0.0;
 $5 = ((($0)) + 4|0);
 HEAP32[$5>>2] = 65;
 return;
}
function _fonsDeleteInternal($stash) {
 $stash = $stash|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $i$01 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($stash|0)==(0|0);
 if ($0) {
  return;
 }
 $1 = ((($stash)) + 32|0);
 $2 = HEAP32[$1>>2]|0;
 $3 = ($2|0)==(0|0);
 if (!($3)) {
  $4 = ((($stash)) + 12|0);
  $5 = HEAP32[$4>>2]|0;
  FUNCTION_TABLE_vi[$2 & 15]($5);
 }
 $6 = ((($stash)) + 76|0);
 $7 = HEAP32[$6>>2]|0;
 $8 = ($7|0)>(0);
 if ($8) {
  $9 = ((($stash)) + 64|0);
  $i$01 = 0;
  while(1) {
   $10 = HEAP32[$9>>2]|0;
   $11 = (($10) + ($i$01<<2)|0);
   $12 = HEAP32[$11>>2]|0;
   _fons__freeFont($12);
   $13 = (($i$01) + 1)|0;
   $14 = HEAP32[$6>>2]|0;
   $15 = ($13|0)<($14|0);
   if ($15) {
    $i$01 = $13;
   } else {
    break;
   }
  }
 }
 $16 = ((($stash)) + 68|0);
 $17 = HEAP32[$16>>2]|0;
 $18 = ($17|0)==(0|0);
 if (!($18)) {
  _fons__deleteAtlas($17);
 }
 $19 = ((($stash)) + 64|0);
 $20 = HEAP32[$19>>2]|0;
 $21 = ($20|0)==(0|0);
 if (!($21)) {
  _free($20);
 }
 $22 = ((($stash)) + 44|0);
 $23 = HEAP32[$22>>2]|0;
 $24 = ($23|0)==(0|0);
 if (!($24)) {
  _free($23);
 }
 $25 = ((($stash)) + 20564|0);
 $26 = HEAP32[$25>>2]|0;
 $27 = ($26|0)==(0|0);
 if (!($27)) {
  _free($26);
 }
 _free($stash);
 return;
}
function _nvgCreateInternal($params) {
 $params = $params|0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0;
 var $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $fontParams = 0, $scevgep = 0, dest = 0, label = 0;
 var sp = 0, src = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0;
 $fontParams = sp;
 $0 = (_malloc(8204)|0);
 $1 = ($0|0)==(0|0);
 if (!($1)) {
  $2 = ((($0)) + 56|0);
  _memset(($2|0),0,8148)|0;
  dest=$0; src=$params; stop=dest+56|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
  $scevgep = ((($0)) + 8168|0);
  ;HEAP32[$scevgep>>2]=0|0;HEAP32[$scevgep+4>>2]=0|0;HEAP32[$scevgep+8>>2]=0|0;HEAP32[$scevgep+12>>2]=0|0;
  $3 = (_malloc(1024)|0);
  $4 = ((($0)) + 56|0);
  HEAP32[$4>>2] = $3;
  $5 = ($3|0)==(0|0);
  if (!($5)) {
   $6 = ((($0)) + 64|0);
   HEAP32[$6>>2] = 0;
   $7 = ((($0)) + 60|0);
   HEAP32[$7>>2] = 256;
   $8 = (_nvg__allocPathCache()|0);
   $9 = ((($0)) + 8144|0);
   HEAP32[$9>>2] = $8;
   $10 = ($8|0)==(0|0);
   if (!($10)) {
    _nvgSave($0);
    _nvgReset($0);
    _nvg__setDevicePixelRatio($0,1.0);
    $11 = ((($0)) + 8|0);
    $12 = HEAP32[$11>>2]|0;
    $13 = HEAP32[$0>>2]|0;
    $14 = (FUNCTION_TABLE_ii[$12 & 3]($13)|0);
    $15 = ($14|0)==(0);
    if (!($15)) {
     ;HEAP32[$fontParams>>2]=0|0;HEAP32[$fontParams+4>>2]=0|0;HEAP32[$fontParams+8>>2]=0|0;HEAP32[$fontParams+12>>2]=0|0;HEAP32[$fontParams+16>>2]=0|0;HEAP32[$fontParams+20>>2]=0|0;HEAP32[$fontParams+24>>2]=0|0;HEAP32[$fontParams+28>>2]=0|0;
     HEAP32[$fontParams>>2] = 512;
     $16 = ((($fontParams)) + 4|0);
     HEAP32[$16>>2] = 512;
     $17 = ((($fontParams)) + 8|0);
     HEAP8[$17>>0] = 1;
     $18 = ((($fontParams)) + 16|0);
     HEAP32[$18>>2] = 0;
     $19 = ((($fontParams)) + 24|0);
     HEAP32[$19>>2] = 0;
     $20 = ((($fontParams)) + 28|0);
     HEAP32[$20>>2] = 0;
     $21 = ((($fontParams)) + 32|0);
     HEAP32[$21>>2] = 0;
     $22 = ((($fontParams)) + 12|0);
     HEAP32[$22>>2] = 0;
     $23 = (_fonsCreateInternal($fontParams)|0);
     $24 = ((($0)) + 8164|0);
     HEAP32[$24>>2] = $23;
     $25 = ($23|0)==(0|0);
     if (!($25)) {
      $26 = ((($0)) + 12|0);
      $27 = HEAP32[$26>>2]|0;
      $28 = HEAP32[$0>>2]|0;
      $29 = HEAP32[$fontParams>>2]|0;
      $30 = HEAP32[$16>>2]|0;
      $31 = (FUNCTION_TABLE_iiiiiii[$27 & 1]($28,1,$29,$30,0,0)|0);
      $32 = ((($0)) + 8168|0);
      HEAP32[$32>>2] = $31;
      $33 = ($31|0)==(0);
      if (!($33)) {
       $34 = ((($0)) + 8184|0);
       HEAP32[$34>>2] = 0;
       $$0 = $0;
       STACKTOP = sp;return ($$0|0);
      }
     }
    }
   }
  }
 }
 _nvgDeleteInternal($0);
 $$0 = 0;
 STACKTOP = sp;return ($$0|0);
}
function _nvgSave($ctx) {
 $ctx = $ctx|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($ctx)) + 8140|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)>(31);
 if ($2) {
  return;
 }
 $3 = ($1|0)>(0);
 if ($3) {
  $4 = (((($ctx)) + 76|0) + (($1*252)|0)|0);
  $5 = (($1) + -1)|0;
  $6 = (((($ctx)) + 76|0) + (($5*252)|0)|0);
  _memcpy(($4|0),($6|0),252)|0;
 }
 $7 = HEAP32[$0>>2]|0;
 $8 = (($7) + 1)|0;
 HEAP32[$0>>2] = $8;
 return;
}
function _nvgReset($ctx) {
 $ctx = $ctx|0;
 var $$byval_copy$1 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0;
 $$byval_copy$1 = sp + 32|0;
 $0 = sp + 16|0;
 $1 = sp;
 $2 = (_nvg__getState($ctx)|0);
 _memset(($2|0),0,252)|0;
 _nvgRGBA($0,-1,-1,-1,-1);
 ;HEAP32[$$byval_copy$1>>2]=HEAP32[$0>>2]|0;HEAP32[$$byval_copy$1+4>>2]=HEAP32[$0+4>>2]|0;HEAP32[$$byval_copy$1+8>>2]=HEAP32[$0+8>>2]|0;HEAP32[$$byval_copy$1+12>>2]=HEAP32[$0+12>>2]|0;
 _nvg__setPaintColor($2,$$byval_copy$1);
 $3 = ((($2)) + 76|0);
 _nvgRGBA($1,0,0,0,-1);
 ;HEAP32[$$byval_copy$1>>2]=HEAP32[$1>>2]|0;HEAP32[$$byval_copy$1+4>>2]=HEAP32[$1+4>>2]|0;HEAP32[$$byval_copy$1+8>>2]=HEAP32[$1+8>>2]|0;HEAP32[$$byval_copy$1+12>>2]=HEAP32[$1+12>>2]|0;
 _nvg__setPaintColor($3,$$byval_copy$1);
 $4 = ((($2)) + 152|0);
 HEAPF32[$4>>2] = 1.0;
 $5 = ((($2)) + 156|0);
 HEAPF32[$5>>2] = 10.0;
 $6 = ((($2)) + 164|0);
 HEAP32[$6>>2] = 0;
 $7 = ((($2)) + 160|0);
 HEAP32[$7>>2] = 4;
 $8 = ((($2)) + 168|0);
 HEAPF32[$8>>2] = 1.0;
 $9 = ((($2)) + 172|0);
 _nvgTransformIdentity($9);
 $10 = ((($2)) + 220|0);
 HEAPF32[$10>>2] = -1.0;
 $11 = ((($2)) + 224|0);
 HEAPF32[$11>>2] = -1.0;
 $12 = ((($2)) + 228|0);
 HEAPF32[$12>>2] = 16.0;
 $13 = ((($2)) + 232|0);
 HEAPF32[$13>>2] = 0.0;
 $14 = ((($2)) + 236|0);
 HEAPF32[$14>>2] = 1.0;
 $15 = ((($2)) + 240|0);
 HEAPF32[$15>>2] = 0.0;
 $16 = ((($2)) + 244|0);
 HEAP32[$16>>2] = 65;
 $17 = ((($2)) + 248|0);
 HEAP32[$17>>2] = 0;
 STACKTOP = sp;return;
}
function _nvgDeleteInternal($ctx) {
 $ctx = $ctx|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $3 = 0;
 var $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($ctx|0)==(0|0);
 if ($0) {
  return;
 }
 $1 = ((($ctx)) + 56|0);
 $2 = HEAP32[$1>>2]|0;
 $3 = ($2|0)==(0|0);
 if (!($3)) {
  _free($2);
 }
 $4 = ((($ctx)) + 8144|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = ($5|0)==(0|0);
 if (!($6)) {
  _nvg__deletePathCache($5);
 }
 $7 = ((($ctx)) + 8164|0);
 $8 = HEAP32[$7>>2]|0;
 $9 = ($8|0)==(0|0);
 if (!($9)) {
  _fonsDeleteInternal($8);
 }
 $10 = ((($ctx)) + 8168|0);
 $11 = HEAP32[$10>>2]|0;
 $12 = ($11|0)==(0);
 if (!($12)) {
  _nvgDeleteImage($ctx,$11);
  HEAP32[$10>>2] = 0;
 }
 $13 = ((($ctx)) + 8172|0);
 $14 = HEAP32[$13>>2]|0;
 $15 = ($14|0)==(0);
 if (!($15)) {
  _nvgDeleteImage($ctx,$14);
  HEAP32[$13>>2] = 0;
 }
 $18 = ((($ctx)) + 8176|0);
 $19 = HEAP32[$18>>2]|0;
 $20 = ($19|0)==(0);
 if (!($20)) {
  _nvgDeleteImage($ctx,$19);
  HEAP32[$18>>2] = 0;
 }
 $21 = ((($ctx)) + 8180|0);
 $22 = HEAP32[$21>>2]|0;
 $23 = ($22|0)==(0);
 if (!($23)) {
  _nvgDeleteImage($ctx,$22);
  HEAP32[$21>>2] = 0;
 }
 $24 = ((($ctx)) + 52|0);
 $17 = HEAP32[$24>>2]|0;
 $25 = ($17|0)==(0|0);
 if (!($25)) {
  $16 = HEAP32[$ctx>>2]|0;
  FUNCTION_TABLE_vi[$17 & 15]($16);
 }
 _free($ctx);
 return;
}
function _nvgDeleteImage($ctx,$image) {
 $ctx = $ctx|0;
 $image = $image|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($ctx)) + 16|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = HEAP32[$ctx>>2]|0;
 (FUNCTION_TABLE_iii[$1 & 1]($2,$image)|0);
 return;
}
function _nvgBeginFrame($ctx,$windowWidth,$windowHeight,$devicePixelRatio) {
 $ctx = $ctx|0;
 $windowWidth = $windowWidth|0;
 $windowHeight = $windowHeight|0;
 $devicePixelRatio = +$devicePixelRatio;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($ctx)) + 8140|0);
 HEAP32[$0>>2] = 0;
 _nvgSave($ctx);
 _nvgReset($ctx);
 _nvg__setDevicePixelRatio($ctx,$devicePixelRatio);
 $1 = ((($ctx)) + 28|0);
 $2 = HEAP32[$1>>2]|0;
 $3 = HEAP32[$ctx>>2]|0;
 FUNCTION_TABLE_viii[$2 & 1]($3,$windowWidth,$windowHeight);
 $4 = ((($ctx)) + 8188|0);
 ;HEAP32[$4>>2]=0|0;HEAP32[$4+4>>2]=0|0;HEAP32[$4+8>>2]=0|0;HEAP32[$4+12>>2]=0|0;
 return;
}
function _nvgEndFrame($ctx) {
 $ctx = $ctx|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $i$03 = 0, $i$1$1 = 0, $ih = 0, $iw = 0, $j$0$lcssa = 0;
 var $j$04 = 0, $j$1 = 0, $j$2 = 0, $nh = 0, $nw = 0, $uglygep = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0;
 $iw = sp + 12|0;
 $ih = sp + 8|0;
 $nw = sp + 4|0;
 $nh = sp;
 $0 = ((($ctx)) + 36|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = HEAP32[$ctx>>2]|0;
 FUNCTION_TABLE_vi[$1 & 15]($2);
 $3 = ((($ctx)) + 8184|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = ($4|0)==(0);
 if ($5) {
  STACKTOP = sp;return;
 }
 $6 = (((($ctx)) + 8168|0) + ($4<<2)|0);
 $7 = HEAP32[$6>>2]|0;
 $8 = ($7|0)==(0);
 if ($8) {
  STACKTOP = sp;return;
 }
 _nvgImageSize($ctx,$7,$iw,$ih);
 $9 = HEAP32[$3>>2]|0;
 $10 = ($9|0)>(0);
 if ($10) {
  $i$03 = 0;$j$04 = 0;
  while(1) {
   $11 = (((($ctx)) + 8168|0) + ($i$03<<2)|0);
   $12 = HEAP32[$11>>2]|0;
   $13 = ($12|0)==(0);
   if ($13) {
    $j$2 = $j$04;
   } else {
    $14 = HEAP32[$11>>2]|0;
    _nvgImageSize($ctx,$14,$nw,$nh);
    $15 = HEAP32[$nw>>2]|0;
    $16 = HEAP32[$iw>>2]|0;
    $17 = ($15|0)<($16|0);
    if ($17) {
     label = 8;
    } else {
     $18 = HEAP32[$nh>>2]|0;
     $19 = HEAP32[$ih>>2]|0;
     $20 = ($18|0)<($19|0);
     if ($20) {
      label = 8;
     } else {
      $22 = HEAP32[$11>>2]|0;
      $23 = (($j$04) + 1)|0;
      $24 = (((($ctx)) + 8168|0) + ($j$04<<2)|0);
      HEAP32[$24>>2] = $22;
      $j$1 = $23;
     }
    }
    if ((label|0) == 8) {
     label = 0;
     $21 = HEAP32[$11>>2]|0;
     _nvgDeleteImage($ctx,$21);
     $j$1 = $j$04;
    }
    $j$2 = $j$1;
   }
   $25 = (($i$03) + 1)|0;
   $26 = HEAP32[$3>>2]|0;
   $27 = ($25|0)<($26|0);
   if ($27) {
    $i$03 = $25;$j$04 = $j$2;
   } else {
    $j$0$lcssa = $j$2;
    break;
   }
  }
 } else {
  $j$0$lcssa = 0;
 }
 $28 = ((($ctx)) + 8168|0);
 $29 = HEAP32[$28>>2]|0;
 $30 = (((($ctx)) + 8168|0) + ($j$0$lcssa<<2)|0);
 HEAP32[$30>>2] = $29;
 HEAP32[$28>>2] = $7;
 HEAP32[$3>>2] = 0;
 $i$1$1 = (($j$0$lcssa) + 1)|0;
 $31 = ($i$1$1|0)<(4);
 if (!($31)) {
  STACKTOP = sp;return;
 }
 $32 = $j$0$lcssa << 2;
 $33 = (($32) + 8172)|0;
 $uglygep = (($ctx) + ($33)|0);
 $34 = (12 - ($32))|0;
 _memset(($uglygep|0),0,($34|0))|0;
 STACKTOP = sp;return;
}
function _nvgImageSize($ctx,$image,$w,$h) {
 $ctx = $ctx|0;
 $image = $image|0;
 $w = $w|0;
 $h = $h|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($ctx)) + 24|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = HEAP32[$ctx>>2]|0;
 (FUNCTION_TABLE_iiiii[$1 & 1]($2,$image,$w,$h)|0);
 return;
}
function _nvgRGB($agg$result,$r,$g,$b) {
 $agg$result = $agg$result|0;
 $r = $r|0;
 $g = $g|0;
 $b = $b|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 _nvgRGBA($agg$result,$r,$g,$b,-1);
 return;
}
function _nvgRGBA($agg$result,$r,$g,$b,$a) {
 $agg$result = $agg$result|0;
 $r = $r|0;
 $g = $g|0;
 $b = $b|0;
 $a = $a|0;
 var $0 = 0.0, $1 = 0.0, $10 = 0, $2 = 0.0, $3 = 0.0, $4 = 0.0, $5 = 0.0, $6 = 0.0, $7 = 0.0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+($r&255));
 $1 = $0 / 255.0;
 $2 = (+($g&255));
 $3 = $2 / 255.0;
 $4 = (+($b&255));
 $5 = $4 / 255.0;
 $6 = (+($a&255));
 $7 = $6 / 255.0;
 HEAPF32[$agg$result>>2] = $1;
 $8 = ((($agg$result)) + 4|0);
 HEAPF32[$8>>2] = $3;
 $9 = ((($agg$result)) + 8|0);
 HEAPF32[$9>>2] = $5;
 $10 = ((($agg$result)) + 12|0);
 HEAPF32[$10>>2] = $7;
 return;
}
function _nvgRGBAf($agg$result,$r,$g,$b,$a) {
 $agg$result = $agg$result|0;
 $r = +$r;
 $g = +$g;
 $b = +$b;
 $a = +$a;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 HEAPF32[$agg$result>>2] = $r;
 $0 = ((($agg$result)) + 4|0);
 HEAPF32[$0>>2] = $g;
 $1 = ((($agg$result)) + 8|0);
 HEAPF32[$1>>2] = $b;
 $2 = ((($agg$result)) + 12|0);
 HEAPF32[$2>>2] = $a;
 return;
}
function _nvgTransformIdentity($t) {
 $t = $t|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 HEAPF32[$t>>2] = 1.0;
 $0 = ((($t)) + 4|0);
 HEAPF32[$0>>2] = 0.0;
 $1 = ((($t)) + 8|0);
 HEAPF32[$1>>2] = 0.0;
 $2 = ((($t)) + 12|0);
 HEAPF32[$2>>2] = 1.0;
 $3 = ((($t)) + 16|0);
 HEAPF32[$3>>2] = 0.0;
 $4 = ((($t)) + 20|0);
 HEAPF32[$4>>2] = 0.0;
 return;
}
function _nvgTransformTranslate($t,$tx,$ty) {
 $t = $t|0;
 $tx = +$tx;
 $ty = +$ty;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 HEAPF32[$t>>2] = 1.0;
 $0 = ((($t)) + 4|0);
 HEAPF32[$0>>2] = 0.0;
 $1 = ((($t)) + 8|0);
 HEAPF32[$1>>2] = 0.0;
 $2 = ((($t)) + 12|0);
 HEAPF32[$2>>2] = 1.0;
 $3 = ((($t)) + 16|0);
 HEAPF32[$3>>2] = $tx;
 $4 = ((($t)) + 20|0);
 HEAPF32[$4>>2] = $ty;
 return;
}
function _nvgTransformScale($t,$sx,$sy) {
 $t = $t|0;
 $sx = +$sx;
 $sy = +$sy;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 HEAPF32[$t>>2] = $sx;
 $0 = ((($t)) + 4|0);
 HEAPF32[$0>>2] = 0.0;
 $1 = ((($t)) + 8|0);
 HEAPF32[$1>>2] = 0.0;
 $2 = ((($t)) + 12|0);
 HEAPF32[$2>>2] = $sy;
 $3 = ((($t)) + 16|0);
 HEAPF32[$3>>2] = 0.0;
 $4 = ((($t)) + 20|0);
 HEAPF32[$4>>2] = 0.0;
 return;
}
function _nvgTransformRotate($t,$a) {
 $t = $t|0;
 $a = +$a;
 var $0 = 0.0, $1 = 0.0, $2 = 0, $3 = 0.0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_nvg__cosf($a));
 $1 = (+_nvg__sinf($a));
 HEAPF32[$t>>2] = $0;
 $2 = ((($t)) + 4|0);
 HEAPF32[$2>>2] = $1;
 $3 = -$1;
 $4 = ((($t)) + 8|0);
 HEAPF32[$4>>2] = $3;
 $5 = ((($t)) + 12|0);
 HEAPF32[$5>>2] = $0;
 $6 = ((($t)) + 16|0);
 HEAPF32[$6>>2] = 0.0;
 $7 = ((($t)) + 20|0);
 HEAPF32[$7>>2] = 0.0;
 return;
}
function _nvgTransformMultiply($t,$s) {
 $t = $t|0;
 $s = $s|0;
 var $0 = 0.0, $1 = 0.0, $10 = 0.0, $11 = 0.0, $12 = 0, $13 = 0.0, $14 = 0.0, $15 = 0.0, $16 = 0, $17 = 0.0, $18 = 0.0, $19 = 0, $2 = 0.0, $20 = 0.0, $21 = 0.0, $22 = 0.0, $23 = 0, $24 = 0.0, $25 = 0.0, $26 = 0;
 var $27 = 0.0, $28 = 0.0, $29 = 0, $3 = 0, $30 = 0.0, $31 = 0.0, $32 = 0.0, $33 = 0.0, $34 = 0.0, $35 = 0.0, $36 = 0.0, $37 = 0.0, $38 = 0.0, $39 = 0.0, $4 = 0.0, $40 = 0.0, $41 = 0.0, $42 = 0.0, $43 = 0.0, $44 = 0.0;
 var $45 = 0.0, $46 = 0.0, $47 = 0, $48 = 0.0, $49 = 0.0, $5 = 0, $6 = 0.0, $7 = 0.0, $8 = 0.0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = +HEAPF32[$t>>2];
 $1 = +HEAPF32[$s>>2];
 $2 = $0 * $1;
 $3 = ((($t)) + 4|0);
 $4 = +HEAPF32[$3>>2];
 $5 = ((($s)) + 8|0);
 $6 = +HEAPF32[$5>>2];
 $7 = $4 * $6;
 $8 = $2 + $7;
 $9 = ((($t)) + 8|0);
 $10 = +HEAPF32[$9>>2];
 $11 = $1 * $10;
 $12 = ((($t)) + 12|0);
 $13 = +HEAPF32[$12>>2];
 $14 = $6 * $13;
 $15 = $11 + $14;
 $16 = ((($t)) + 16|0);
 $17 = +HEAPF32[$16>>2];
 $18 = $1 * $17;
 $19 = ((($t)) + 20|0);
 $20 = +HEAPF32[$19>>2];
 $21 = $6 * $20;
 $22 = $18 + $21;
 $23 = ((($s)) + 16|0);
 $24 = +HEAPF32[$23>>2];
 $25 = $24 + $22;
 $26 = ((($s)) + 4|0);
 $27 = +HEAPF32[$26>>2];
 $28 = $0 * $27;
 $29 = ((($s)) + 12|0);
 $30 = +HEAPF32[$29>>2];
 $31 = $4 * $30;
 $32 = $28 + $31;
 HEAPF32[$3>>2] = $32;
 $33 = +HEAPF32[$9>>2];
 $34 = +HEAPF32[$26>>2];
 $35 = $33 * $34;
 $36 = +HEAPF32[$12>>2];
 $37 = +HEAPF32[$29>>2];
 $38 = $36 * $37;
 $39 = $35 + $38;
 HEAPF32[$12>>2] = $39;
 $40 = +HEAPF32[$16>>2];
 $41 = +HEAPF32[$26>>2];
 $42 = $40 * $41;
 $43 = +HEAPF32[$19>>2];
 $44 = +HEAPF32[$29>>2];
 $45 = $43 * $44;
 $46 = $42 + $45;
 $47 = ((($s)) + 20|0);
 $48 = +HEAPF32[$47>>2];
 $49 = $48 + $46;
 HEAPF32[$19>>2] = $49;
 HEAPF32[$t>>2] = $8;
 HEAPF32[$9>>2] = $15;
 HEAPF32[$16>>2] = $25;
 return;
}
function _nvgTransformPremultiply($t,$s) {
 $t = $t|0;
 $s = $s|0;
 var $s2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0;
 $s2 = sp;
 ;HEAP32[$s2>>2]=HEAP32[$s>>2]|0;HEAP32[$s2+4>>2]=HEAP32[$s+4>>2]|0;HEAP32[$s2+8>>2]=HEAP32[$s+8>>2]|0;HEAP32[$s2+12>>2]=HEAP32[$s+12>>2]|0;HEAP32[$s2+16>>2]=HEAP32[$s+16>>2]|0;HEAP32[$s2+20>>2]=HEAP32[$s+20>>2]|0;
 _nvgTransformMultiply($s2,$t);
 ;HEAP32[$t>>2]=HEAP32[$s2>>2]|0;HEAP32[$t+4>>2]=HEAP32[$s2+4>>2]|0;HEAP32[$t+8>>2]=HEAP32[$s2+8>>2]|0;HEAP32[$t+12>>2]=HEAP32[$s2+12>>2]|0;HEAP32[$t+16>>2]=HEAP32[$s2+16>>2]|0;HEAP32[$t+20>>2]=HEAP32[$s2+20>>2]|0;
 STACKTOP = sp;return;
}
function _nvgTransformInverse($inv,$t) {
 $inv = $inv|0;
 $t = $t|0;
 var $$0 = 0, $0 = 0.0, $1 = 0.0, $10 = 0.0, $11 = 0.0, $12 = 0.0, $13 = 0.0, $14 = 0, $15 = 0, $16 = 0.0, $17 = 0.0, $18 = 0.0, $19 = 0.0, $2 = 0, $20 = 0.0, $21 = 0.0, $22 = 0.0, $23 = 0.0, $24 = 0, $25 = 0.0;
 var $26 = 0.0, $27 = 0, $28 = 0.0, $29 = 0.0, $3 = 0.0, $30 = 0.0, $31 = 0.0, $32 = 0.0, $33 = 0, $34 = 0.0, $35 = 0.0, $36 = 0.0, $37 = 0.0, $38 = 0.0, $39 = 0.0, $4 = 0.0, $40 = 0, $41 = 0.0, $42 = 0.0, $43 = 0.0;
 var $44 = 0.0, $45 = 0.0, $46 = 0, $47 = 0.0, $48 = 0.0, $49 = 0.0, $5 = 0.0, $50 = 0.0, $51 = 0, $52 = 0.0, $53 = 0.0, $54 = 0.0, $55 = 0.0, $56 = 0.0, $57 = 0.0, $58 = 0.0, $59 = 0.0, $6 = 0, $60 = 0.0, $61 = 0.0;
 var $62 = 0.0, $63 = 0.0, $64 = 0.0, $65 = 0, $7 = 0.0, $8 = 0.0, $9 = 0, $or$cond = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = +HEAPF32[$t>>2];
 $1 = $0;
 $2 = ((($t)) + 12|0);
 $3 = +HEAPF32[$2>>2];
 $4 = $3;
 $5 = $1 * $4;
 $6 = ((($t)) + 8|0);
 $7 = +HEAPF32[$6>>2];
 $8 = $7;
 $9 = ((($t)) + 4|0);
 $10 = +HEAPF32[$9>>2];
 $11 = $10;
 $12 = $8 * $11;
 $13 = $5 - $12;
 $14 = $13 > -9.9999999999999995E-7;
 $15 = $13 < 9.9999999999999995E-7;
 $or$cond = $14 & $15;
 if ($or$cond) {
  _nvgTransformIdentity($inv);
  $$0 = 0;
  return ($$0|0);
 } else {
  $16 = 1.0 / $13;
  $17 = $4 * $16;
  $18 = $17;
  HEAPF32[$inv>>2] = $18;
  $19 = +HEAPF32[$6>>2];
  $20 = -$19;
  $21 = $20;
  $22 = $16 * $21;
  $23 = $22;
  $24 = ((($inv)) + 8|0);
  HEAPF32[$24>>2] = $23;
  $25 = +HEAPF32[$6>>2];
  $26 = $25;
  $27 = ((($t)) + 20|0);
  $28 = +HEAPF32[$27>>2];
  $29 = $28;
  $30 = $26 * $29;
  $31 = +HEAPF32[$2>>2];
  $32 = $31;
  $33 = ((($t)) + 16|0);
  $34 = +HEAPF32[$33>>2];
  $35 = $34;
  $36 = $32 * $35;
  $37 = $30 - $36;
  $38 = $16 * $37;
  $39 = $38;
  $40 = ((($inv)) + 16|0);
  HEAPF32[$40>>2] = $39;
  $41 = +HEAPF32[$9>>2];
  $42 = -$41;
  $43 = $42;
  $44 = $16 * $43;
  $45 = $44;
  $46 = ((($inv)) + 4|0);
  HEAPF32[$46>>2] = $45;
  $47 = +HEAPF32[$t>>2];
  $48 = $47;
  $49 = $16 * $48;
  $50 = $49;
  $51 = ((($inv)) + 12|0);
  HEAPF32[$51>>2] = $50;
  $52 = +HEAPF32[$9>>2];
  $53 = $52;
  $54 = +HEAPF32[$33>>2];
  $55 = $54;
  $56 = $53 * $55;
  $57 = +HEAPF32[$t>>2];
  $58 = $57;
  $59 = +HEAPF32[$27>>2];
  $60 = $59;
  $61 = $58 * $60;
  $62 = $56 - $61;
  $63 = $16 * $62;
  $64 = $63;
  $65 = ((($inv)) + 20|0);
  HEAPF32[$65>>2] = $64;
  $$0 = 1;
  return ($$0|0);
 }
 return (0)|0;
}
function _nvgTransformPoint($dx,$dy,$t,$sx,$sy) {
 $dx = $dx|0;
 $dy = $dy|0;
 $t = $t|0;
 $sx = +$sx;
 $sy = +$sy;
 var $0 = 0.0, $1 = 0.0, $10 = 0.0, $11 = 0.0, $12 = 0, $13 = 0.0, $14 = 0.0, $15 = 0.0, $16 = 0, $17 = 0.0, $18 = 0.0, $2 = 0, $3 = 0.0, $4 = 0.0, $5 = 0.0, $6 = 0, $7 = 0.0, $8 = 0.0, $9 = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 $0 = +HEAPF32[$t>>2];
 $1 = $0 * $sx;
 $2 = ((($t)) + 8|0);
 $3 = +HEAPF32[$2>>2];
 $4 = $3 * $sy;
 $5 = $1 + $4;
 $6 = ((($t)) + 16|0);
 $7 = +HEAPF32[$6>>2];
 $8 = $7 + $5;
 HEAPF32[$dx>>2] = $8;
 $9 = ((($t)) + 4|0);
 $10 = +HEAPF32[$9>>2];
 $11 = $10 * $sx;
 $12 = ((($t)) + 12|0);
 $13 = +HEAPF32[$12>>2];
 $14 = $13 * $sy;
 $15 = $11 + $14;
 $16 = ((($t)) + 20|0);
 $17 = +HEAPF32[$16>>2];
 $18 = $17 + $15;
 HEAPF32[$dy>>2] = $18;
 return;
}
function _nvgRestore($ctx) {
 $ctx = $ctx|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($ctx)) + 8140|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)<(2);
 if ($2) {
  return;
 }
 $3 = (($1) + -1)|0;
 HEAP32[$0>>2] = $3;
 return;
}
function _nvgGlobalAlpha($ctx,$alpha) {
 $ctx = $ctx|0;
 $alpha = +$alpha;
 var $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (_nvg__getState($ctx)|0);
 $1 = ((($0)) + 168|0);
 HEAPF32[$1>>2] = $alpha;
 return;
}
function _nvgTransform($ctx,$a,$b,$c,$d,$e,$f) {
 $ctx = $ctx|0;
 $a = +$a;
 $b = +$b;
 $c = +$c;
 $d = +$d;
 $e = +$e;
 $f = +$f;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $t = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0;
 $t = sp;
 $0 = (_nvg__getState($ctx)|0);
 HEAPF32[$t>>2] = $a;
 $1 = ((($t)) + 4|0);
 HEAPF32[$1>>2] = $b;
 $2 = ((($t)) + 8|0);
 HEAPF32[$2>>2] = $c;
 $3 = ((($t)) + 12|0);
 HEAPF32[$3>>2] = $d;
 $4 = ((($t)) + 16|0);
 HEAPF32[$4>>2] = $e;
 $5 = ((($t)) + 20|0);
 HEAPF32[$5>>2] = $f;
 $6 = ((($0)) + 172|0);
 _nvgTransformPremultiply($6,$t);
 STACKTOP = sp;return;
}
function _nvgResetTransform($ctx) {
 $ctx = $ctx|0;
 var $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (_nvg__getState($ctx)|0);
 $1 = ((($0)) + 172|0);
 _nvgTransformIdentity($1);
 return;
}
function _nvgTranslate($ctx,$x,$y) {
 $ctx = $ctx|0;
 $x = +$x;
 $y = +$y;
 var $0 = 0, $1 = 0, $t = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0;
 $t = sp;
 $0 = (_nvg__getState($ctx)|0);
 _nvgTransformTranslate($t,$x,$y);
 $1 = ((($0)) + 172|0);
 _nvgTransformPremultiply($1,$t);
 STACKTOP = sp;return;
}
function _nvgRotate($ctx,$angle) {
 $ctx = $ctx|0;
 $angle = +$angle;
 var $0 = 0, $1 = 0, $t = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0;
 $t = sp;
 $0 = (_nvg__getState($ctx)|0);
 _nvgTransformRotate($t,$angle);
 $1 = ((($0)) + 172|0);
 _nvgTransformPremultiply($1,$t);
 STACKTOP = sp;return;
}
function _nvgScale($ctx,$x,$y) {
 $ctx = $ctx|0;
 $x = +$x;
 $y = +$y;
 var $0 = 0, $1 = 0, $t = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0;
 $t = sp;
 $0 = (_nvg__getState($ctx)|0);
 _nvgTransformScale($t,$x,$y);
 $1 = ((($0)) + 172|0);
 _nvgTransformPremultiply($1,$t);
 STACKTOP = sp;return;
}
function _nvgFillColor($ctx,$color) {
 $ctx = $ctx|0;
 $color = $color|0;
 var $0 = 0, $color$byval_copy = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0;
 $color$byval_copy = sp;
 $0 = (_nvg__getState($ctx)|0);
 ;HEAP32[$color$byval_copy>>2]=HEAP32[$color>>2]|0;HEAP32[$color$byval_copy+4>>2]=HEAP32[$color+4>>2]|0;HEAP32[$color$byval_copy+8>>2]=HEAP32[$color+8>>2]|0;HEAP32[$color$byval_copy+12>>2]=HEAP32[$color+12>>2]|0;
 _nvg__setPaintColor($0,$color$byval_copy);
 STACKTOP = sp;return;
}
function _nvgFillPaint($ctx,$paint) {
 $ctx = $ctx|0;
 $paint = $paint|0;
 var $0 = 0, $1 = 0, dest = 0, label = 0, sp = 0, src = 0, stop = 0;
 sp = STACKTOP;
 $0 = (_nvg__getState($ctx)|0);
 dest=$0; src=$paint; stop=dest+76|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
 $1 = ((($0)) + 172|0);
 _nvgTransformMultiply($0,$1);
 return;
}
function _nvgImagePattern($agg$result,$ctx,$cx,$cy,$w,$h,$angle,$image,$alpha) {
 $agg$result = $agg$result|0;
 $ctx = $ctx|0;
 $cx = +$cx;
 $cy = +$cy;
 $w = +$w;
 $h = +$h;
 $angle = +$angle;
 $image = $image|0;
 $alpha = +$alpha;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $p = 0, dest = 0, label = 0, sp = 0, src = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 96|0;
 $p = sp + 16|0;
 $0 = sp;
 dest=$p; stop=dest+76|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
 _nvgTransformRotate($p,$angle);
 $1 = ((($p)) + 16|0);
 HEAPF32[$1>>2] = $cx;
 $2 = ((($p)) + 20|0);
 HEAPF32[$2>>2] = $cy;
 $3 = ((($p)) + 24|0);
 HEAPF32[$3>>2] = $w;
 $4 = ((($p)) + 28|0);
 HEAPF32[$4>>2] = $h;
 $5 = ((($p)) + 72|0);
 HEAP32[$5>>2] = $image;
 $6 = ((($p)) + 40|0);
 $7 = ((($p)) + 56|0);
 _nvgRGBAf($0,1.0,1.0,1.0,$alpha);
 ;HEAP32[$7>>2]=HEAP32[$0>>2]|0;HEAP32[$7+4>>2]=HEAP32[$0+4>>2]|0;HEAP32[$7+8>>2]=HEAP32[$0+8>>2]|0;HEAP32[$7+12>>2]=HEAP32[$0+12>>2]|0;
 ;HEAP32[$6>>2]=HEAP32[$0>>2]|0;HEAP32[$6+4>>2]=HEAP32[$0+4>>2]|0;HEAP32[$6+8>>2]=HEAP32[$0+8>>2]|0;HEAP32[$6+12>>2]=HEAP32[$0+12>>2]|0;
 dest=$agg$result; src=$p; stop=dest+76|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
 STACKTOP = sp;return;
}
function _nvgScissor($ctx,$x,$y,$w,$h) {
 $ctx = $ctx|0;
 $x = +$x;
 $y = +$y;
 $w = +$w;
 $h = +$h;
 var $0 = 0, $1 = 0.0, $10 = 0, $11 = 0, $12 = 0, $2 = 0.0, $3 = 0, $4 = 0.0, $5 = 0.0, $6 = 0, $7 = 0.0, $8 = 0.0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (_nvg__getState($ctx)|0);
 $1 = (+_nvg__maxf(0.0,$w));
 $2 = (+_nvg__maxf(0.0,$h));
 $3 = ((($0)) + 196|0);
 _nvgTransformIdentity($3);
 $4 = $1 * 0.5;
 $5 = $4 + $x;
 $6 = ((($0)) + 212|0);
 HEAPF32[$6>>2] = $5;
 $7 = $2 * 0.5;
 $8 = $7 + $y;
 $9 = ((($0)) + 216|0);
 HEAPF32[$9>>2] = $8;
 $10 = ((($0)) + 172|0);
 _nvgTransformMultiply($3,$10);
 $11 = ((($0)) + 220|0);
 HEAPF32[$11>>2] = $4;
 $12 = ((($0)) + 224|0);
 HEAPF32[$12>>2] = $7;
 return;
}
function _nvgBeginPath($ctx) {
 $ctx = $ctx|0;
 var $0 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($ctx)) + 64|0);
 HEAP32[$0>>2] = 0;
 _nvg__clearPathCache($ctx);
 return;
}
function _nvgMoveTo($ctx,$x,$y) {
 $ctx = $ctx|0;
 $x = +$x;
 $y = +$y;
 var $0 = 0, $1 = 0, $vals = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0;
 $vals = sp;
 HEAPF32[$vals>>2] = 0.0;
 $0 = ((($vals)) + 4|0);
 HEAPF32[$0>>2] = $x;
 $1 = ((($vals)) + 8|0);
 HEAPF32[$1>>2] = $y;
 _nvg__appendCommands($ctx,$vals,3);
 STACKTOP = sp;return;
}
function _nvgLineTo($ctx,$x,$y) {
 $ctx = $ctx|0;
 $x = +$x;
 $y = +$y;
 var $0 = 0, $1 = 0, $vals = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0;
 $vals = sp;
 HEAPF32[$vals>>2] = 1.0;
 $0 = ((($vals)) + 4|0);
 HEAPF32[$0>>2] = $x;
 $1 = ((($vals)) + 8|0);
 HEAPF32[$1>>2] = $y;
 _nvg__appendCommands($ctx,$vals,3);
 STACKTOP = sp;return;
}
function _nvgBezierTo($ctx,$c1x,$c1y,$c2x,$c2y,$x,$y) {
 $ctx = $ctx|0;
 $c1x = +$c1x;
 $c1y = +$c1y;
 $c2x = +$c2x;
 $c2y = +$c2y;
 $x = +$x;
 $y = +$y;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $vals = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0;
 $vals = sp;
 HEAPF32[$vals>>2] = 2.0;
 $0 = ((($vals)) + 4|0);
 HEAPF32[$0>>2] = $c1x;
 $1 = ((($vals)) + 8|0);
 HEAPF32[$1>>2] = $c1y;
 $2 = ((($vals)) + 12|0);
 HEAPF32[$2>>2] = $c2x;
 $3 = ((($vals)) + 16|0);
 HEAPF32[$3>>2] = $c2y;
 $4 = ((($vals)) + 20|0);
 HEAPF32[$4>>2] = $x;
 $5 = ((($vals)) + 24|0);
 HEAPF32[$5>>2] = $y;
 _nvg__appendCommands($ctx,$vals,7);
 STACKTOP = sp;return;
}
function _nvgQuadTo($ctx,$cx,$cy,$x,$y) {
 $ctx = $ctx|0;
 $cx = +$cx;
 $cy = +$cy;
 $x = +$x;
 $y = +$y;
 var $0 = 0, $1 = 0.0, $10 = 0.0, $11 = 0.0, $12 = 0, $13 = 0.0, $14 = 0.0, $15 = 0.0, $16 = 0, $17 = 0.0, $18 = 0.0, $19 = 0.0, $2 = 0, $20 = 0, $21 = 0, $3 = 0.0, $4 = 0, $5 = 0.0, $6 = 0.0, $7 = 0.0;
 var $8 = 0, $9 = 0.0, $vals = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0;
 $vals = sp;
 $0 = ((($ctx)) + 68|0);
 $1 = +HEAPF32[$0>>2];
 $2 = ((($ctx)) + 72|0);
 $3 = +HEAPF32[$2>>2];
 HEAPF32[$vals>>2] = 2.0;
 $4 = ((($vals)) + 4|0);
 $5 = $cx - $1;
 $6 = $5 * 0.66666668653488159;
 $7 = $1 + $6;
 HEAPF32[$4>>2] = $7;
 $8 = ((($vals)) + 8|0);
 $9 = $cy - $3;
 $10 = $9 * 0.66666668653488159;
 $11 = $3 + $10;
 HEAPF32[$8>>2] = $11;
 $12 = ((($vals)) + 12|0);
 $13 = $cx - $x;
 $14 = $13 * 0.66666668653488159;
 $15 = $14 + $x;
 HEAPF32[$12>>2] = $15;
 $16 = ((($vals)) + 16|0);
 $17 = $cy - $y;
 $18 = $17 * 0.66666668653488159;
 $19 = $18 + $y;
 HEAPF32[$16>>2] = $19;
 $20 = ((($vals)) + 20|0);
 HEAPF32[$20>>2] = $x;
 $21 = ((($vals)) + 24|0);
 HEAPF32[$21>>2] = $y;
 _nvg__appendCommands($ctx,$vals,7);
 STACKTOP = sp;return;
}
function _nvgArcTo($ctx,$x1,$y1,$x2,$y2,$radius) {
 $ctx = $ctx|0;
 $x1 = +$x1;
 $y1 = +$y1;
 $x2 = +$x2;
 $y2 = +$y2;
 $radius = +$radius;
 var $0 = 0, $1 = 0.0, $10 = 0, $11 = 0, $12 = 0, $13 = 0.0, $14 = 0.0, $15 = 0, $16 = 0, $17 = 0.0, $18 = 0.0, $19 = 0.0, $2 = 0, $20 = 0.0, $21 = 0.0, $22 = 0.0, $23 = 0.0, $24 = 0.0, $25 = 0.0, $26 = 0.0;
 var $27 = 0.0, $28 = 0.0, $29 = 0.0, $3 = 0.0, $30 = 0.0, $31 = 0.0, $32 = 0, $33 = 0.0, $34 = 0, $35 = 0.0, $36 = 0.0, $37 = 0.0, $38 = 0.0, $39 = 0.0, $4 = 0, $40 = 0.0, $41 = 0.0, $42 = 0.0, $43 = 0.0, $44 = 0.0;
 var $45 = 0.0, $46 = 0.0, $47 = 0.0, $48 = 0.0, $49 = 0.0, $5 = 0, $50 = 0.0, $51 = 0.0, $52 = 0.0, $53 = 0.0, $54 = 0.0, $55 = 0.0, $6 = 0, $7 = 0, $8 = 0.0, $9 = 0, $a0$0 = 0.0, $a1$0 = 0.0, $cx$0 = 0.0, $cy$0 = 0.0;
 var $dir$0 = 0, $dx0 = 0, $dx1 = 0, $dy0 = 0, $dy1 = 0, $or$cond = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0;
 $dx0 = sp + 12|0;
 $dy0 = sp + 8|0;
 $dx1 = sp + 4|0;
 $dy1 = sp;
 $0 = ((($ctx)) + 68|0);
 $1 = +HEAPF32[$0>>2];
 $2 = ((($ctx)) + 72|0);
 $3 = +HEAPF32[$2>>2];
 $4 = ((($ctx)) + 64|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = ($5|0)==(0);
 if ($6) {
  STACKTOP = sp;return;
 }
 $7 = ((($ctx)) + 8152|0);
 $8 = +HEAPF32[$7>>2];
 $9 = (_nvg__ptEquals($1,$3,$x1,$y1,$8)|0);
 $10 = ($9|0)==(0);
 if ($10) {
  $11 = (_nvg__ptEquals($x1,$y1,$x2,$y2,$8)|0);
  $12 = ($11|0)==(0);
  if ($12) {
   $13 = (+_nvg__distPtSeg($x1,$y1,$1,$3,$x2,$y2));
   $14 = $8 * $8;
   $15 = $13 < $14;
   $16 = $8 > $radius;
   $or$cond = $16 | $15;
   if (!($or$cond)) {
    $17 = $1 - $x1;
    HEAPF32[$dx0>>2] = $17;
    $18 = $3 - $y1;
    HEAPF32[$dy0>>2] = $18;
    $19 = $x2 - $x1;
    HEAPF32[$dx1>>2] = $19;
    $20 = $y2 - $y1;
    HEAPF32[$dy1>>2] = $20;
    (+_nvg__normalize($dx0,$dy0));
    (+_nvg__normalize($dx1,$dy1));
    $21 = +HEAPF32[$dx0>>2];
    $22 = +HEAPF32[$dx1>>2];
    $23 = $21 * $22;
    $24 = +HEAPF32[$dy0>>2];
    $25 = +HEAPF32[$dy1>>2];
    $26 = $24 * $25;
    $27 = $23 + $26;
    $28 = (+_nvg__acosf($27));
    $29 = $28 * 0.5;
    $30 = (+_nvg__tanf($29));
    $31 = $radius / $30;
    $32 = $31 > 1.0E+4;
    if ($32) {
     _nvgLineTo($ctx,$x1,$y1);
     STACKTOP = sp;return;
    }
    $33 = (+_nvg__cross($21,$24,$22,$25));
    $34 = $33 > 0.0;
    $35 = $21 * $31;
    $36 = $35 + $x1;
    $37 = $24 * $radius;
    if ($34) {
     $38 = $37 + $36;
     $39 = $24 * $31;
     $40 = $39 + $y1;
     $41 = $21 * $radius;
     $42 = $40 - $41;
     $43 = -$24;
     $44 = (+_nvg__atan2f($21,$43));
     $45 = -$22;
     $46 = (+_nvg__atan2f($45,$25));
     $a0$0 = $44;$a1$0 = $46;$cx$0 = $38;$cy$0 = $42;$dir$0 = 2;
    } else {
     $47 = $36 - $37;
     $48 = $24 * $31;
     $49 = $48 + $y1;
     $50 = $21 * $radius;
     $51 = $50 + $49;
     $52 = -$21;
     $53 = (+_nvg__atan2f($52,$24));
     $54 = -$25;
     $55 = (+_nvg__atan2f($22,$54));
     $a0$0 = $53;$a1$0 = $55;$cx$0 = $47;$cy$0 = $51;$dir$0 = 1;
    }
    _nvgArc($ctx,$cx$0,$cy$0,$radius,$a0$0,$a1$0,$dir$0);
    STACKTOP = sp;return;
   }
  }
 }
 _nvgLineTo($ctx,$x1,$y1);
 STACKTOP = sp;return;
}
function _nvgArc($ctx,$cx,$cy,$r,$a0,$a1,$dir) {
 $ctx = $ctx|0;
 $cx = +$cx;
 $cy = +$cy;
 $r = +$r;
 $a0 = +$a0;
 $a1 = +$a1;
 $dir = $dir|0;
 var $$ = 0.0, $0 = 0, $1 = 0, $10 = 0, $11 = 0.0, $12 = 0, $13 = 0.0, $14 = 0.0, $15 = 0.0, $16 = 0, $17 = 0, $18 = 0, $19 = 0.0, $2 = 0, $20 = 0.0, $21 = 0.0, $22 = 0.0, $23 = 0.0, $24 = 0.0, $25 = 0.0;
 var $26 = 0.0, $27 = 0.0, $28 = 0, $29 = 0.0, $3 = 0.0, $30 = 0, $31 = 0.0, $32 = 0.0, $33 = 0.0, $34 = 0.0, $35 = 0.0, $36 = 0.0, $37 = 0.0, $38 = 0.0, $39 = 0.0, $4 = 0, $40 = 0.0, $41 = 0.0, $42 = 0.0, $43 = 0.0;
 var $44 = 0.0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0.0, $50 = 0, $51 = 0, $52 = 0.0, $53 = 0, $54 = 0, $55 = 0.0, $56 = 0, $57 = 0, $58 = 0.0, $59 = 0, $6 = 0, $60 = 0, $61 = 0.0;
 var $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $7 = 0, $8 = 0.0, $9 = 0, $da$09 = 0.0, $da$112 = 0.0, $da$2 = 0.0, $exitcond = 0, $i$07 = 0, $nvals$0$lcssa = 0, $nvals$08 = 0, $nvals$1 = 0, $ptanx$05 = 0.0, $ptany$06 = 0.0;
 var $px$03 = 0.0, $py$04 = 0.0, $vals = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 560|0;
 $vals = sp;
 $0 = ((($ctx)) + 64|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)>(0);
 $3 = $a1 - $a0;
 $4 = ($dir|0)==(2);
 $5 = (+_nvg__absf($3));
 $6 = $5 >= 6.2831854820251465;
 if ($4) {
  if ($6) {
   $da$2 = 6.2831854820251465;
  } else {
   $7 = $3 < 0.0;
   if ($7) {
    $da$09 = $3;
    while(1) {
     $8 = $da$09 + 6.2831854820251465;
     $9 = $8 < 0.0;
     if ($9) {
      $da$09 = $8;
     } else {
      $da$2 = $8;
      break;
     }
    }
   } else {
    $da$2 = $3;
   }
  }
 } else {
  if ($6) {
   $da$2 = -6.2831854820251465;
  } else {
   $10 = $3 > 0.0;
   if ($10) {
    $da$112 = $3;
    while(1) {
     $11 = $da$112 + -6.2831854820251465;
     $12 = $11 > 0.0;
     if ($12) {
      $da$112 = $11;
     } else {
      $da$2 = $11;
      break;
     }
    }
   } else {
    $da$2 = $3;
   }
  }
 }
 $13 = (+_nvg__absf($da$2));
 $14 = $13 / 1.5707963705062866;
 $15 = $14 + 0.5;
 $16 = (~~(($15)));
 $17 = (_nvg__mini($16)|0);
 $18 = (_nvg__maxi(1,$17)|0);
 $19 = (+($18|0));
 $20 = $da$2 / $19;
 $21 = $20 * 0.5;
 $22 = (+_nvg__cosf($21));
 $23 = 1.0 - $22;
 $24 = $23 * 1.3333333730697632;
 $25 = (+_nvg__sinf($21));
 $26 = $24 / $25;
 $27 = (+_nvg__absf($26));
 $28 = ($dir|0)==(1);
 $29 = -$27;
 $$ = $28 ? $29 : $27;
 $30 = ($18|0)<(0);
 if ($30) {
  $nvals$0$lcssa = 0;
  _nvg__appendCommands($ctx,$vals,$nvals$0$lcssa);
  STACKTOP = sp;return;
 }
 $31 = (+($2&1));
 $i$07 = 0;$nvals$08 = 0;$ptanx$05 = 0.0;$ptany$06 = 0.0;$px$03 = 0.0;$py$04 = 0.0;
 while(1) {
  $32 = (+($i$07|0));
  $33 = $32 / $19;
  $34 = $da$2 * $33;
  $35 = $34 + $a0;
  $36 = (+_nvg__cosf($35));
  $37 = (+_nvg__sinf($35));
  $38 = $36 * $r;
  $39 = $38 + $cx;
  $40 = $37 * $r;
  $41 = $40 + $cy;
  $42 = $$ * $40;
  $43 = -$42;
  $44 = $$ * $38;
  $45 = ($i$07|0)==(0);
  $46 = (($nvals$08) + 1)|0;
  $47 = (($vals) + ($nvals$08<<2)|0);
  if ($45) {
   HEAPF32[$47>>2] = $31;
   $48 = (($nvals$08) + 2)|0;
   $49 = (($vals) + ($46<<2)|0);
   HEAPF32[$49>>2] = $39;
   $50 = (($nvals$08) + 3)|0;
   $51 = (($vals) + ($48<<2)|0);
   HEAPF32[$51>>2] = $41;
   $nvals$1 = $50;
  } else {
   HEAPF32[$47>>2] = 2.0;
   $52 = $px$03 + $ptanx$05;
   $53 = (($nvals$08) + 2)|0;
   $54 = (($vals) + ($46<<2)|0);
   HEAPF32[$54>>2] = $52;
   $55 = $py$04 + $ptany$06;
   $56 = (($nvals$08) + 3)|0;
   $57 = (($vals) + ($53<<2)|0);
   HEAPF32[$57>>2] = $55;
   $58 = $39 + $42;
   $59 = (($nvals$08) + 4)|0;
   $60 = (($vals) + ($56<<2)|0);
   HEAPF32[$60>>2] = $58;
   $61 = $41 - $44;
   $62 = (($nvals$08) + 5)|0;
   $63 = (($vals) + ($59<<2)|0);
   HEAPF32[$63>>2] = $61;
   $64 = (($nvals$08) + 6)|0;
   $65 = (($vals) + ($62<<2)|0);
   HEAPF32[$65>>2] = $39;
   $66 = (($nvals$08) + 7)|0;
   $67 = (($vals) + ($64<<2)|0);
   HEAPF32[$67>>2] = $41;
   $nvals$1 = $66;
  }
  $68 = (($i$07) + 1)|0;
  $exitcond = ($i$07|0)==($18|0);
  if ($exitcond) {
   $nvals$0$lcssa = $nvals$1;
   break;
  } else {
   $i$07 = $68;$nvals$08 = $nvals$1;$ptanx$05 = $43;$ptany$06 = $44;$px$03 = $39;$py$04 = $41;
  }
 }
 _nvg__appendCommands($ctx,$vals,$nvals$0$lcssa);
 STACKTOP = sp;return;
}
function _nvgClosePath($ctx) {
 $ctx = $ctx|0;
 var $vals = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0;
 $vals = sp;
 HEAPF32[$vals>>2] = 3.0;
 _nvg__appendCommands($ctx,$vals,1);
 STACKTOP = sp;return;
}
function _nvgRect($ctx,$x,$y,$w,$h) {
 $ctx = $ctx|0;
 $x = +$x;
 $y = +$y;
 $w = +$w;
 $h = +$h;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0.0, $6 = 0, $7 = 0, $8 = 0.0, $9 = 0, $vals = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 64|0;
 $vals = sp;
 HEAPF32[$vals>>2] = 0.0;
 $0 = ((($vals)) + 4|0);
 HEAPF32[$0>>2] = $x;
 $1 = ((($vals)) + 8|0);
 HEAPF32[$1>>2] = $y;
 $2 = ((($vals)) + 12|0);
 HEAPF32[$2>>2] = 1.0;
 $3 = ((($vals)) + 16|0);
 HEAPF32[$3>>2] = $x;
 $4 = ((($vals)) + 20|0);
 $5 = $y + $h;
 HEAPF32[$4>>2] = $5;
 $6 = ((($vals)) + 24|0);
 HEAPF32[$6>>2] = 1.0;
 $7 = ((($vals)) + 28|0);
 $8 = $x + $w;
 HEAPF32[$7>>2] = $8;
 $9 = ((($vals)) + 32|0);
 HEAPF32[$9>>2] = $5;
 $10 = ((($vals)) + 36|0);
 HEAPF32[$10>>2] = 1.0;
 $11 = ((($vals)) + 40|0);
 HEAPF32[$11>>2] = $8;
 $12 = ((($vals)) + 44|0);
 HEAPF32[$12>>2] = $y;
 $13 = ((($vals)) + 48|0);
 HEAPF32[$13>>2] = 3.0;
 _nvg__appendCommands($ctx,$vals,13);
 STACKTOP = sp;return;
}
function _nvgFill($ctx) {
 $ctx = $ctx|0;
 var $$lcssa = 0, $$lcssa8 = 0, $$promoted = 0, $$promoted2 = 0, $0 = 0, $1 = 0, $10 = 0.0, $11 = 0.0, $12 = 0, $13 = 0.0, $14 = 0.0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0.0, $21 = 0, $22 = 0;
 var $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0;
 var $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0.0, $50 = 0, $51 = 0, $52 = 0, $6 = 0, $7 = 0.0, $8 = 0, $9 = 0.0, $fillPaint = 0, $i$01 = 0, dest = 0;
 var label = 0, sp = 0, src = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 80|0;
 $fillPaint = sp;
 $0 = (_nvg__getState($ctx)|0);
 dest=$fillPaint; src=$0; stop=dest+76|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
 _nvg__flattenPaths($ctx);
 $1 = ((($ctx)) + 4|0);
 $2 = HEAP32[$1>>2]|0;
 $3 = ($2|0)==(0);
 if ($3) {
  _nvg__expandFill($ctx,0.0);
 } else {
  $4 = ((($ctx)) + 8156|0);
  $5 = +HEAPF32[$4>>2];
  _nvg__expandFill($ctx,$5);
 }
 $6 = ((($0)) + 168|0);
 $7 = +HEAPF32[$6>>2];
 $8 = ((($fillPaint)) + 52|0);
 $9 = +HEAPF32[$8>>2];
 $10 = $7 * $9;
 HEAPF32[$8>>2] = $10;
 $11 = +HEAPF32[$6>>2];
 $12 = ((($fillPaint)) + 68|0);
 $13 = +HEAPF32[$12>>2];
 $14 = $11 * $13;
 HEAPF32[$12>>2] = $14;
 $15 = ((($ctx)) + 40|0);
 $16 = HEAP32[$15>>2]|0;
 $17 = HEAP32[$ctx>>2]|0;
 $18 = ((($0)) + 196|0);
 $19 = ((($ctx)) + 8156|0);
 $20 = +HEAPF32[$19>>2];
 $21 = ((($ctx)) + 8144|0);
 $22 = HEAP32[$21>>2]|0;
 $23 = ((($22)) + 36|0);
 $24 = ((($22)) + 12|0);
 $25 = HEAP32[$24>>2]|0;
 $26 = ((($22)) + 16|0);
 $27 = HEAP32[$26>>2]|0;
 FUNCTION_TABLE_viiidiii[$16 & 1]($17,$fillPaint,$18,$20,$23,$25,$27);
 $28 = HEAP32[$21>>2]|0;
 $29 = ((($28)) + 16|0);
 $30 = HEAP32[$29>>2]|0;
 $31 = ($30|0)>(0);
 if (!($31)) {
  STACKTOP = sp;return;
 }
 $32 = ((($ctx)) + 8192|0);
 $33 = ((($ctx)) + 8188|0);
 $34 = HEAP32[$21>>2]|0;
 $35 = ((($34)) + 16|0);
 $36 = HEAP32[$35>>2]|0;
 $$promoted = HEAP32[$32>>2]|0;
 $$promoted2 = HEAP32[$33>>2]|0;
 $38 = $28;$44 = $$promoted;$50 = $$promoted2;$i$01 = 0;
 while(1) {
  $37 = ((($38)) + 12|0);
  $39 = HEAP32[$37>>2]|0;
  $40 = (((($39) + (($i$01*40)|0)|0)) + 20|0);
  $41 = HEAP32[$40>>2]|0;
  $42 = (($41) + -2)|0;
  $43 = (($42) + ($44))|0;
  $45 = (((($39) + (($i$01*40)|0)|0)) + 28|0);
  $46 = HEAP32[$45>>2]|0;
  $47 = (($43) + -2)|0;
  $48 = (($47) + ($46))|0;
  $49 = (($50) + 2)|0;
  $51 = (($i$01) + 1)|0;
  $52 = ($51|0)<($36|0);
  if ($52) {
   $38 = $34;$44 = $48;$50 = $49;$i$01 = $51;
  } else {
   $$lcssa = $48;$$lcssa8 = $49;
   break;
  }
 }
 HEAP32[$32>>2] = $$lcssa;
 HEAP32[$33>>2] = $$lcssa8;
 STACKTOP = sp;return;
}
function _nvgStroke($ctx) {
 $ctx = $ctx|0;
 var $$lcssa = 0, $$lcssa8 = 0, $$promoted = 0, $$promoted2 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0.0, $12 = 0.0, $13 = 0.0, $14 = 0, $15 = 0.0, $16 = 0.0, $17 = 0, $18 = 0.0, $19 = 0.0, $2 = 0.0, $20 = 0.0, $21 = 0, $22 = 0.0;
 var $23 = 0, $24 = 0.0, $25 = 0.0, $26 = 0.0, $27 = 0, $28 = 0.0, $29 = 0.0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0.0, $34 = 0.0, $35 = 0.0, $36 = 0.0, $37 = 0, $38 = 0, $39 = 0, $4 = 0.0, $40 = 0;
 var $41 = 0, $42 = 0.0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0.0, $49 = 0, $5 = 0.0, $50 = 0, $51 = 0, $52 = 0, $53 = 0.0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0;
 var $6 = 0.0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0;
 var $78 = 0, $79 = 0, $8 = 0, $80 = 0, $9 = 0.0, $i$01 = 0, $strokePaint = 0, $strokeWidth$0 = 0.0, dest = 0, label = 0, sp = 0, src = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 80|0;
 $strokePaint = sp;
 $0 = (_nvg__getState($ctx)|0);
 $1 = ((($0)) + 172|0);
 $2 = (+_nvg__getAverageScale($1));
 $3 = ((($0)) + 152|0);
 $4 = +HEAPF32[$3>>2];
 $5 = $2 * $4;
 $6 = (+_nvg__clampf($5,200.0));
 $7 = ((($0)) + 76|0);
 dest=$strokePaint; src=$7; stop=dest+76|0; do { HEAP32[dest>>2]=HEAP32[src>>2]|0; dest=dest+4|0; src=src+4|0; } while ((dest|0) < (stop|0));
 $8 = ((($ctx)) + 8156|0);
 $9 = +HEAPF32[$8>>2];
 $10 = $6 < $9;
 if ($10) {
  $11 = $6 / $9;
  $12 = (+_nvg__clampf($11,1.0));
  $13 = $12 * $12;
  $14 = ((($strokePaint)) + 52|0);
  $15 = +HEAPF32[$14>>2];
  $16 = $15 * $13;
  HEAPF32[$14>>2] = $16;
  $17 = ((($strokePaint)) + 68|0);
  $18 = +HEAPF32[$17>>2];
  $19 = $13 * $18;
  HEAPF32[$17>>2] = $19;
  $20 = +HEAPF32[$8>>2];
  $strokeWidth$0 = $20;
 } else {
  $strokeWidth$0 = $6;
 }
 $21 = ((($0)) + 168|0);
 $22 = +HEAPF32[$21>>2];
 $23 = ((($strokePaint)) + 52|0);
 $24 = +HEAPF32[$23>>2];
 $25 = $22 * $24;
 HEAPF32[$23>>2] = $25;
 $26 = +HEAPF32[$21>>2];
 $27 = ((($strokePaint)) + 68|0);
 $28 = +HEAPF32[$27>>2];
 $29 = $26 * $28;
 HEAPF32[$27>>2] = $29;
 _nvg__flattenPaths($ctx);
 $30 = ((($ctx)) + 4|0);
 $31 = HEAP32[$30>>2]|0;
 $32 = ($31|0)==(0);
 $33 = $strokeWidth$0 * 0.5;
 if ($32) {
  $43 = ((($0)) + 164|0);
  $44 = HEAP32[$43>>2]|0;
  $45 = ((($0)) + 160|0);
  $46 = HEAP32[$45>>2]|0;
  $47 = ((($0)) + 156|0);
  $48 = +HEAPF32[$47>>2];
  _nvg__expandStroke($ctx,$33,$44,$46,$48);
 } else {
  $34 = +HEAPF32[$8>>2];
  $35 = $34 * 0.5;
  $36 = $33 + $35;
  $37 = ((($0)) + 164|0);
  $38 = HEAP32[$37>>2]|0;
  $39 = ((($0)) + 160|0);
  $40 = HEAP32[$39>>2]|0;
  $41 = ((($0)) + 156|0);
  $42 = +HEAPF32[$41>>2];
  _nvg__expandStroke($ctx,$36,$38,$40,$42);
 }
 $49 = ((($ctx)) + 44|0);
 $50 = HEAP32[$49>>2]|0;
 $51 = HEAP32[$ctx>>2]|0;
 $52 = ((($0)) + 196|0);
 $53 = +HEAPF32[$8>>2];
 $54 = ((($ctx)) + 8144|0);
 $55 = HEAP32[$54>>2]|0;
 $56 = ((($55)) + 12|0);
 $57 = HEAP32[$56>>2]|0;
 $58 = ((($55)) + 16|0);
 $59 = HEAP32[$58>>2]|0;
 FUNCTION_TABLE_viiiddii[$50 & 1]($51,$strokePaint,$52,$53,$strokeWidth$0,$57,$59);
 $60 = HEAP32[$54>>2]|0;
 $61 = ((($60)) + 16|0);
 $62 = HEAP32[$61>>2]|0;
 $63 = ($62|0)>(0);
 if (!($63)) {
  STACKTOP = sp;return;
 }
 $64 = ((($ctx)) + 8196|0);
 $65 = ((($ctx)) + 8188|0);
 $66 = HEAP32[$54>>2]|0;
 $67 = ((($66)) + 16|0);
 $68 = HEAP32[$67>>2]|0;
 $$promoted = HEAP32[$64>>2]|0;
 $$promoted2 = HEAP32[$65>>2]|0;
 $70 = $60;$76 = $$promoted;$78 = $$promoted2;$i$01 = 0;
 while(1) {
  $69 = ((($70)) + 12|0);
  $71 = HEAP32[$69>>2]|0;
  $72 = (((($71) + (($i$01*40)|0)|0)) + 28|0);
  $73 = HEAP32[$72>>2]|0;
  $74 = (($73) + -2)|0;
  $75 = (($74) + ($76))|0;
  $77 = (($78) + 1)|0;
  $79 = (($i$01) + 1)|0;
  $80 = ($79|0)<($68|0);
  if ($80) {
   $70 = $66;$76 = $75;$78 = $77;$i$01 = $79;
  } else {
   $$lcssa = $75;$$lcssa8 = $77;
   break;
  }
 }
 HEAP32[$64>>2] = $$lcssa;
 HEAP32[$65>>2] = $$lcssa8;
 STACKTOP = sp;return;
}
function _fons__allocAtlas($w,$h) {
 $w = $w|0;
 $h = $h|0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $cond = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (_malloc(20)|0);
 $cond = ($0|0)==(0|0);
 if ($cond) {
  $$0 = 0;
  return ($$0|0);
 }
 ;HEAP32[$0>>2]=0|0;HEAP32[$0+4>>2]=0|0;HEAP32[$0+8>>2]=0|0;HEAP32[$0+12>>2]=0|0;HEAP32[$0+16>>2]=0|0;
 HEAP32[$0>>2] = $w;
 $1 = ((($0)) + 4|0);
 HEAP32[$1>>2] = $h;
 $2 = (_malloc(1536)|0);
 $3 = ((($0)) + 8|0);
 HEAP32[$3>>2] = $2;
 $4 = ($2|0)==(0|0);
 if ($4) {
  _fons__deleteAtlas($0);
  $$0 = 0;
  return ($$0|0);
 } else {
  _memset(($2|0),0,1536)|0;
  $5 = ((($0)) + 12|0);
  HEAP32[$5>>2] = 0;
  $6 = ((($0)) + 16|0);
  HEAP32[$6>>2] = 256;
  $7 = HEAP32[$3>>2]|0;
  HEAP16[$7>>1] = 0;
  $8 = HEAP32[$3>>2]|0;
  $9 = ((($8)) + 2|0);
  HEAP16[$9>>1] = 0;
  $10 = $w&65535;
  $11 = HEAP32[$3>>2]|0;
  $12 = ((($11)) + 4|0);
  HEAP16[$12>>1] = $10;
  $13 = HEAP32[$5>>2]|0;
  $14 = (($13) + 1)|0;
  HEAP32[$5>>2] = $14;
  $$0 = $0;
  return ($$0|0);
 }
 return (0)|0;
}
function _fons__addWhiteRect($stash) {
 $stash = $stash|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $gx = 0, $gy = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0;
 $gx = sp + 4|0;
 $gy = sp;
 $0 = ((($stash)) + 68|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = (_fons__atlasAddRect($1,2,2,$gx,$gy)|0);
 $3 = ($2|0)==(0);
 if ($3) {
  STACKTOP = sp;return;
 }
 $4 = HEAP32[$gx>>2]|0;
 $5 = HEAP32[$gy>>2]|0;
 $6 = HEAP32[$stash>>2]|0;
 $7 = Math_imul($6, $5)|0;
 $8 = (($7) + ($4))|0;
 $9 = ((($stash)) + 44|0);
 $10 = HEAP32[$9>>2]|0;
 $11 = (($10) + ($8)|0);
 HEAP8[$11>>0]=-1&255;HEAP8[$11+1>>0]=-1>>8;
 $12 = HEAP32[$stash>>2]|0;
 $13 = (($11) + ($12)|0);
 HEAP8[$13>>0]=-1&255;HEAP8[$13+1>>0]=-1>>8;
 $14 = ((($stash)) + 48|0);
 $15 = HEAP32[$14>>2]|0;
 $16 = HEAP32[$gx>>2]|0;
 $17 = (_fons__mini($15,$16)|0);
 HEAP32[$14>>2] = $17;
 $18 = ((($stash)) + 52|0);
 $19 = HEAP32[$18>>2]|0;
 $20 = HEAP32[$gy>>2]|0;
 $21 = (_fons__mini($19,$20)|0);
 HEAP32[$18>>2] = $21;
 $22 = ((($stash)) + 56|0);
 $23 = HEAP32[$22>>2]|0;
 $24 = HEAP32[$gx>>2]|0;
 $25 = (($24) + 2)|0;
 $26 = (_fons__maxi($23,$25)|0);
 HEAP32[$22>>2] = $26;
 $27 = ((($stash)) + 60|0);
 $28 = HEAP32[$27>>2]|0;
 $29 = HEAP32[$gy>>2]|0;
 $30 = (($29) + 2)|0;
 $31 = (_fons__maxi($28,$30)|0);
 HEAP32[$27>>2] = $31;
 STACKTOP = sp;return;
}
function _fons__getState($stash) {
 $stash = $stash|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($stash)) + 21052|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = (($1) + -1)|0;
 $3 = (((($stash)) + 20572|0) + (($2*24)|0)|0);
 return ($3|0);
}
function _fons__freeFont($font) {
 $font = $font|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($font|0)==(0|0);
 if ($0) {
  return;
 }
 $1 = ((($font)) + 136|0);
 $2 = HEAP32[$1>>2]|0;
 $3 = ($2|0)==(0|0);
 if (!($3)) {
  _free($2);
 }
 $4 = ((($font)) + 120|0);
 $5 = HEAP8[$4>>0]|0;
 $6 = ($5<<24>>24)==(0);
 if (!($6)) {
  $7 = ((($font)) + 112|0);
  $8 = HEAP32[$7>>2]|0;
  $9 = ($8|0)==(0|0);
  if (!($9)) {
   _free($8);
  }
 }
 _free($font);
 return;
}
function _fons__deleteAtlas($atlas) {
 $atlas = $atlas|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($atlas|0)==(0|0);
 if ($0) {
  return;
 }
 $1 = ((($atlas)) + 8|0);
 $2 = HEAP32[$1>>2]|0;
 $3 = ($2|0)==(0|0);
 if (!($3)) {
  _free($2);
 }
 _free($atlas);
 return;
}
function _fons__maxi($a,$b) {
 $a = $a|0;
 $b = $b|0;
 var $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($a|0)>($b|0);
 $1 = $0 ? $a : $b;
 return ($1|0);
}
function _nvg__allocPathCache() {
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, dest = 0, label = 0, sp = 0;
 var stop = 0;
 sp = STACKTOP;
 $0 = (_malloc(52)|0);
 $1 = ($0|0)==(0|0);
 if (!($1)) {
  dest=$0; stop=dest+52|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
  $2 = (_malloc(4096)|0);
  HEAP32[$0>>2] = $2;
  $3 = ($2|0)==(0|0);
  if (!($3)) {
   $4 = ((($0)) + 4|0);
   HEAP32[$4>>2] = 0;
   $5 = ((($0)) + 8|0);
   HEAP32[$5>>2] = 128;
   $6 = (_malloc(640)|0);
   $7 = ((($0)) + 12|0);
   HEAP32[$7>>2] = $6;
   $8 = ($6|0)==(0|0);
   if (!($8)) {
    $9 = ((($0)) + 16|0);
    HEAP32[$9>>2] = 0;
    $10 = ((($0)) + 20|0);
    HEAP32[$10>>2] = 16;
    $11 = (_malloc(4096)|0);
    $12 = ((($0)) + 24|0);
    HEAP32[$12>>2] = $11;
    $13 = ($11|0)==(0|0);
    if (!($13)) {
     $14 = ((($0)) + 28|0);
     HEAP32[$14>>2] = 0;
     $15 = ((($0)) + 32|0);
     HEAP32[$15>>2] = 256;
     $$0 = $0;
     return ($$0|0);
    }
   }
  }
 }
 _nvg__deletePathCache($0);
 $$0 = 0;
 return ($$0|0);
}
function _nvg__setDevicePixelRatio($ctx,$ratio) {
 $ctx = $ctx|0;
 $ratio = +$ratio;
 var $0 = 0.0, $1 = 0, $2 = 0.0, $3 = 0, $4 = 0.0, $5 = 0, $6 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = 0.25 / $ratio;
 $1 = ((($ctx)) + 8148|0);
 HEAPF32[$1>>2] = $0;
 $2 = 0.0099999997764825821 / $ratio;
 $3 = ((($ctx)) + 8152|0);
 HEAPF32[$3>>2] = $2;
 $4 = 1.0 / $ratio;
 $5 = ((($ctx)) + 8156|0);
 HEAPF32[$5>>2] = $4;
 $6 = ((($ctx)) + 8160|0);
 HEAPF32[$6>>2] = $ratio;
 return;
}
function _nvg__getState($ctx) {
 $ctx = $ctx|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($ctx)) + 8140|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = (($1) + -1)|0;
 $3 = (((($ctx)) + 76|0) + (($2*252)|0)|0);
 return ($3|0);
}
function _nvg__setPaintColor($p,$color) {
 $p = $p|0;
 $color = $color|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, dest = 0, label = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 dest=$p; stop=dest+76|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
 _nvgTransformIdentity($p);
 $0 = ((($p)) + 32|0);
 HEAPF32[$0>>2] = 0.0;
 $1 = ((($p)) + 36|0);
 HEAPF32[$1>>2] = 1.0;
 $2 = ((($p)) + 40|0);
 ;HEAP32[$2>>2]=HEAP32[$color>>2]|0;HEAP32[$2+4>>2]=HEAP32[$color+4>>2]|0;HEAP32[$2+8>>2]=HEAP32[$color+8>>2]|0;HEAP32[$2+12>>2]=HEAP32[$color+12>>2]|0;
 $3 = ((($p)) + 56|0);
 ;HEAP32[$3>>2]=HEAP32[$color>>2]|0;HEAP32[$3+4>>2]=HEAP32[$color+4>>2]|0;HEAP32[$3+8>>2]=HEAP32[$color+8>>2]|0;HEAP32[$3+12>>2]=HEAP32[$color+12>>2]|0;
 return;
}
function _nvg__deletePathCache($c) {
 $c = $c|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($c|0)==(0|0);
 if ($0) {
  return;
 }
 $1 = HEAP32[$c>>2]|0;
 $2 = ($1|0)==(0|0);
 if (!($2)) {
  _free($1);
 }
 $3 = ((($c)) + 12|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = ($4|0)==(0|0);
 if (!($5)) {
  _free($4);
 }
 $6 = ((($c)) + 24|0);
 $7 = HEAP32[$6>>2]|0;
 $8 = ($7|0)==(0|0);
 if (!($8)) {
  _free($7);
 }
 _free($c);
 return;
}
function _nvg__clampf($a,$mx) {
 $a = +$a;
 $mx = +$mx;
 var $0 = 0, $1 = 0, $2 = 0.0, $3 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = $a < 0.0;
 $1 = $a > $mx;
 $2 = $1 ? $mx : $a;
 $3 = $0 ? 0.0 : $2;
 return (+$3);
}
function _nvg__cosf($a) {
 $a = +$a;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+Math_cos((+$a)));
 return (+$0);
}
function _nvg__sinf($a) {
 $a = +$a;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+Math_sin((+$a)));
 return (+$0);
}
function _nvg__tanf($a) {
 $a = +$a;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+Math_tan((+$a)));
 return (+$0);
}
function _nvg__maxf($a,$b) {
 $a = +$a;
 $b = +$b;
 var $0 = 0, $1 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = $a > $b;
 $1 = $0 ? $a : $b;
 return (+$1);
}
function _nvg__absf($a) {
 $a = +$a;
 var $0 = 0, $1 = 0.0, $2 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = $a >= 0.0;
 $1 = -$a;
 $2 = $0 ? $a : $1;
 return (+$2);
}
function _nvg__clearPathCache($ctx) {
 $ctx = $ctx|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($ctx)) + 8144|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ((($1)) + 4|0);
 HEAP32[$2>>2] = 0;
 $3 = HEAP32[$0>>2]|0;
 $4 = ((($3)) + 16|0);
 HEAP32[$4>>2] = 0;
 return;
}
function _nvg__appendCommands($ctx,$vals,$nvals) {
 $ctx = $ctx|0;
 $vals = $vals|0;
 $nvals = $nvals|0;
 var $$off = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0.0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0;
 var $26 = 0, $27 = 0, $28 = 0, $29 = 0.0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0.0, $36 = 0.0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0.0, $43 = 0.0;
 var $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0.0, $5 = 0, $50 = 0.0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0.0, $56 = 0.0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0.0;
 var $62 = 0.0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $8 = 0, $9 = 0, $i$0$be = 0, $i$01 = 0, $switch = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 $0 = (_nvg__getState($ctx)|0);
 $1 = ((($ctx)) + 64|0);
 $2 = HEAP32[$1>>2]|0;
 $3 = (($2) + ($nvals))|0;
 $4 = ((($ctx)) + 60|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = ($3|0)>($5|0);
 do {
  if ($6) {
   $7 = (($5|0) / 2)&-1;
   $8 = (($7) + ($3))|0;
   $9 = ((($ctx)) + 56|0);
   $10 = HEAP32[$9>>2]|0;
   $11 = $8 << 2;
   $12 = (_realloc($10,$11)|0);
   $13 = ($12|0)==(0|0);
   if ($13) {
    return;
   } else {
    HEAP32[$9>>2] = $12;
    HEAP32[$4>>2] = $8;
    break;
   }
  }
 } while(0);
 $14 = +HEAPF32[$vals>>2];
 $15 = (~~(($14)));
 $$off = (($15) + -3)|0;
 $switch = ($$off>>>0)<(2);
 if (!($switch)) {
  $16 = (($nvals) + -2)|0;
  $17 = (($vals) + ($16<<2)|0);
  $18 = HEAP32[$17>>2]|0;
  $19 = ((($ctx)) + 68|0);
  HEAP32[$19>>2] = $18;
  $20 = (($nvals) + -1)|0;
  $21 = (($vals) + ($20<<2)|0);
  $22 = HEAP32[$21>>2]|0;
  $23 = ((($ctx)) + 72|0);
  HEAP32[$23>>2] = $22;
 }
 $24 = ($nvals|0)>(0);
 L10: do {
  if ($24) {
   $25 = ((($0)) + 172|0);
   $26 = ((($0)) + 172|0);
   $27 = ((($0)) + 172|0);
   $i$01 = 0;
   while(1) {
    $28 = (($vals) + ($i$01<<2)|0);
    $29 = +HEAPF32[$28>>2];
    $30 = (~~(($29)));
    switch ($30|0) {
    case 0:  {
     $31 = (($i$01) + 1)|0;
     $32 = (($vals) + ($31<<2)|0);
     $33 = (($i$01) + 2)|0;
     $34 = (($vals) + ($33<<2)|0);
     $35 = +HEAPF32[$32>>2];
     $36 = +HEAPF32[$34>>2];
     _nvgTransformPoint($32,$34,$25,$35,$36);
     $37 = (($i$01) + 3)|0;
     $i$0$be = $37;
     break;
    }
    case 1:  {
     $38 = (($i$01) + 1)|0;
     $39 = (($vals) + ($38<<2)|0);
     $40 = (($i$01) + 2)|0;
     $41 = (($vals) + ($40<<2)|0);
     $42 = +HEAPF32[$39>>2];
     $43 = +HEAPF32[$41>>2];
     _nvgTransformPoint($39,$41,$26,$42,$43);
     $44 = (($i$01) + 3)|0;
     $i$0$be = $44;
     break;
    }
    case 2:  {
     $45 = (($i$01) + 1)|0;
     $46 = (($vals) + ($45<<2)|0);
     $47 = (($i$01) + 2)|0;
     $48 = (($vals) + ($47<<2)|0);
     $49 = +HEAPF32[$46>>2];
     $50 = +HEAPF32[$48>>2];
     _nvgTransformPoint($46,$48,$27,$49,$50);
     $51 = (($i$01) + 3)|0;
     $52 = (($vals) + ($51<<2)|0);
     $53 = (($i$01) + 4)|0;
     $54 = (($vals) + ($53<<2)|0);
     $55 = +HEAPF32[$52>>2];
     $56 = +HEAPF32[$54>>2];
     _nvgTransformPoint($52,$54,$27,$55,$56);
     $57 = (($i$01) + 5)|0;
     $58 = (($vals) + ($57<<2)|0);
     $59 = (($i$01) + 6)|0;
     $60 = (($vals) + ($59<<2)|0);
     $61 = +HEAPF32[$58>>2];
     $62 = +HEAPF32[$60>>2];
     _nvgTransformPoint($58,$60,$27,$61,$62);
     $63 = (($i$01) + 7)|0;
     $i$0$be = $63;
     break;
    }
    case 3:  {
     $64 = (($i$01) + 1)|0;
     $i$0$be = $64;
     break;
    }
    case 4:  {
     $65 = (($i$01) + 2)|0;
     $i$0$be = $65;
     break;
    }
    default: {
     $66 = (($i$01) + 1)|0;
     $i$0$be = $66;
    }
    }
    $67 = ($i$0$be|0)<($nvals|0);
    if ($67) {
     $i$01 = $i$0$be;
    } else {
     break L10;
    }
   }
  }
 } while(0);
 $68 = HEAP32[$1>>2]|0;
 $69 = ((($ctx)) + 56|0);
 $70 = HEAP32[$69>>2]|0;
 $71 = (($70) + ($68<<2)|0);
 $72 = $nvals << 2;
 _memcpy(($71|0),($vals|0),($72|0))|0;
 $73 = HEAP32[$1>>2]|0;
 $74 = (($73) + ($nvals))|0;
 HEAP32[$1>>2] = $74;
 return;
}
function _nvg__ptEquals($x1,$y1,$x2,$y2,$tol) {
 $x1 = +$x1;
 $y1 = +$y1;
 $x2 = +$x2;
 $y2 = +$y2;
 $tol = +$tol;
 var $0 = 0.0, $1 = 0.0, $2 = 0.0, $3 = 0.0, $4 = 0.0, $5 = 0.0, $6 = 0, $7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = $x2 - $x1;
 $1 = $y2 - $y1;
 $2 = $0 * $0;
 $3 = $1 * $1;
 $4 = $2 + $3;
 $5 = $tol * $tol;
 $6 = $4 < $5;
 $7 = $6&1;
 return ($7|0);
}
function _nvg__distPtSeg($x,$y,$px,$py,$qx,$qy) {
 $x = +$x;
 $y = +$y;
 $px = +$px;
 $py = +$py;
 $qx = +$qx;
 $qy = +$qy;
 var $0 = 0.0, $1 = 0.0, $10 = 0, $11 = 0.0, $12 = 0, $13 = 0, $14 = 0.0, $15 = 0.0, $16 = 0.0, $17 = 0.0, $18 = 0.0, $19 = 0.0, $2 = 0.0, $20 = 0.0, $21 = 0.0, $22 = 0.0, $3 = 0.0, $4 = 0.0, $5 = 0.0, $6 = 0.0;
 var $7 = 0.0, $8 = 0.0, $9 = 0.0, $t$0 = 0.0, $t$1 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = $qx - $px;
 $1 = $qy - $py;
 $2 = $x - $px;
 $3 = $y - $py;
 $4 = $0 * $0;
 $5 = $1 * $1;
 $6 = $4 + $5;
 $7 = $2 * $0;
 $8 = $3 * $1;
 $9 = $7 + $8;
 $10 = $6 > 0.0;
 if ($10) {
  $11 = $9 / $6;
  $t$0 = $11;
 } else {
  $t$0 = $9;
 }
 $12 = $t$0 < 0.0;
 if ($12) {
  $t$1 = 0.0;
 } else {
  $13 = $t$0 > 1.0;
  if ($13) {
   $t$1 = 1.0;
  } else {
   $t$1 = $t$0;
  }
 }
 $14 = $0 * $t$1;
 $15 = $14 + $px;
 $16 = $15 - $x;
 $17 = $1 * $t$1;
 $18 = $17 + $py;
 $19 = $18 - $y;
 $20 = $16 * $16;
 $21 = $19 * $19;
 $22 = $20 + $21;
 return (+$22);
}
function _nvg__normalize($x,$y) {
 $x = $x|0;
 $y = $y|0;
 var $0 = 0.0, $1 = 0.0, $10 = 0.0, $2 = 0.0, $3 = 0.0, $4 = 0.0, $5 = 0.0, $6 = 0, $7 = 0.0, $8 = 0.0, $9 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = +HEAPF32[$x>>2];
 $1 = $0 * $0;
 $2 = +HEAPF32[$y>>2];
 $3 = $2 * $2;
 $4 = $1 + $3;
 $5 = (+_nvg__sqrtf($4));
 $6 = $5 > 9.9999999747524271E-7;
 if (!($6)) {
  return (+$5);
 }
 $7 = 1.0 / $5;
 $8 = $0 * $7;
 HEAPF32[$x>>2] = $8;
 $9 = +HEAPF32[$y>>2];
 $10 = $7 * $9;
 HEAPF32[$y>>2] = $10;
 return (+$5);
}
function _nvg__acosf($a) {
 $a = +$a;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+Math_acos((+$a)));
 return (+$0);
}
function _nvg__cross($dx0,$dy0,$dx1,$dy1) {
 $dx0 = +$dx0;
 $dy0 = +$dy0;
 $dx1 = +$dx1;
 $dy1 = +$dy1;
 var $0 = 0.0, $1 = 0.0, $2 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = $dy0 * $dx1;
 $1 = $dx0 * $dy1;
 $2 = $0 - $1;
 return (+$2);
}
function _nvg__atan2f($a,$b) {
 $a = +$a;
 $b = +$b;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+Math_atan2((+$a),(+$b)));
 return (+$0);
}
function _nvg__mini($a) {
 $a = $a|0;
 var $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($a|0)<(5);
 $1 = $0 ? $a : 5;
 return ($1|0);
}
function _nvg__maxi($a,$b) {
 $a = $a|0;
 $b = $b|0;
 var $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($a|0)>($b|0);
 $1 = $0 ? $a : $b;
 return ($1|0);
}
function _nvg__minf($a,$b) {
 $a = +$a;
 $b = +$b;
 var $0 = 0, $1 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = $a < $b;
 $1 = $0 ? $a : $b;
 return (+$1);
}
function _nvg__flattenPaths($ctx) {
 $ctx = $ctx|0;
 var $$pr = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0.0, $101 = 0, $102 = 0, $103 = 0.0, $104 = 0, $105 = 0.0, $106 = 0.0, $107 = 0, $108 = 0.0, $109 = 0, $11 = 0.0, $110 = 0.0, $111 = 0.0, $112 = 0.0, $113 = 0.0, $114 = 0.0;
 var $115 = 0.0, $116 = 0.0, $117 = 0.0, $118 = 0.0, $119 = 0.0, $12 = 0, $120 = 0.0, $121 = 0.0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0.0, $17 = 0;
 var $18 = 0.0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0.0, $23 = 0, $24 = 0.0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0.0, $35 = 0;
 var $36 = 0.0, $37 = 0.0, $38 = 0, $39 = 0.0, $4 = 0, $40 = 0.0, $41 = 0, $42 = 0.0, $43 = 0.0, $44 = 0, $45 = 0.0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0.0, $51 = 0, $52 = 0, $53 = 0;
 var $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0;
 var $72 = 0, $73 = 0.0, $74 = 0, $75 = 0.0, $76 = 0.0, $77 = 0, $78 = 0.0, $79 = 0.0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0.0, $88 = 0, $89 = 0, $9 = 0;
 var $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0.0, $99 = 0.0, $i$0$be = 0, $i$011 = 0, $i$25 = 0, $j$08 = 0, $or$cond = 0, $or$cond3 = 0, $p0$0 = 0, $p0$17 = 0, $p0$17$phi = 0, $p1$06 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($ctx)) + 8144|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ((($1)) + 16|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = ($3|0)>(0);
 if ($4) {
  return;
 }
 $5 = ((($ctx)) + 64|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = ($6|0)>(0);
 L4: do {
  if ($7) {
   $8 = ((($ctx)) + 56|0);
   $i$011 = 0;
   while(1) {
    $9 = HEAP32[$8>>2]|0;
    $10 = (($9) + ($i$011<<2)|0);
    $11 = +HEAPF32[$10>>2];
    $12 = (~~(($11)));
    switch ($12|0) {
    case 0:  {
     _nvg__addPath($ctx);
     $13 = (($i$011) + 1)|0;
     $14 = HEAP32[$8>>2]|0;
     $15 = (($14) + ($13<<2)|0);
     $16 = +HEAPF32[$15>>2];
     $17 = ((($15)) + 4|0);
     $18 = +HEAPF32[$17>>2];
     _nvg__addPoint($ctx,$16,$18,1);
     $19 = (($i$011) + 3)|0;
     $i$0$be = $19;
     break;
    }
    case 1:  {
     $20 = (($i$011) + 1)|0;
     $21 = (($9) + ($20<<2)|0);
     $22 = +HEAPF32[$21>>2];
     $23 = ((($21)) + 4|0);
     $24 = +HEAPF32[$23>>2];
     _nvg__addPoint($ctx,$22,$24,1);
     $25 = (($i$011) + 3)|0;
     $i$0$be = $25;
     break;
    }
    case 2:  {
     $26 = (_nvg__lastPoint($ctx)|0);
     $27 = ($26|0)==(0|0);
     if (!($27)) {
      $28 = (($i$011) + 1)|0;
      $29 = (($9) + ($28<<2)|0);
      $30 = (($i$011) + 3)|0;
      $31 = (($9) + ($30<<2)|0);
      $32 = (($i$011) + 5)|0;
      $33 = (($9) + ($32<<2)|0);
      $34 = +HEAPF32[$26>>2];
      $35 = ((($26)) + 4|0);
      $36 = +HEAPF32[$35>>2];
      $37 = +HEAPF32[$29>>2];
      $38 = ((($29)) + 4|0);
      $39 = +HEAPF32[$38>>2];
      $40 = +HEAPF32[$31>>2];
      $41 = ((($31)) + 4|0);
      $42 = +HEAPF32[$41>>2];
      $43 = +HEAPF32[$33>>2];
      $44 = ((($33)) + 4|0);
      $45 = +HEAPF32[$44>>2];
      _nvg__tesselateBezier($ctx,$34,$36,$37,$39,$40,$42,$43,$45,0,1);
     }
     $46 = (($i$011) + 7)|0;
     $i$0$be = $46;
     break;
    }
    case 3:  {
     _nvg__closePath($ctx);
     $47 = (($i$011) + 1)|0;
     $i$0$be = $47;
     break;
    }
    case 4:  {
     $48 = (($i$011) + 1)|0;
     $49 = (($9) + ($48<<2)|0);
     $50 = +HEAPF32[$49>>2];
     $51 = (~~(($50)));
     _nvg__pathWinding($ctx,$51);
     $52 = (($i$011) + 2)|0;
     $i$0$be = $52;
     break;
    }
    default: {
     $53 = (($i$011) + 1)|0;
     $i$0$be = $53;
    }
    }
    $54 = HEAP32[$5>>2]|0;
    $55 = ($i$0$be|0)<($54|0);
    if ($55) {
     $i$011 = $i$0$be;
    } else {
     break L4;
    }
   }
  }
 } while(0);
 $56 = ((($1)) + 40|0);
 HEAPF32[$56>>2] = 1.0E+6;
 $57 = ((($1)) + 36|0);
 HEAPF32[$57>>2] = 1.0E+6;
 $58 = ((($1)) + 48|0);
 HEAPF32[$58>>2] = -1.0E+6;
 $59 = ((($1)) + 44|0);
 HEAPF32[$59>>2] = -1.0E+6;
 $60 = HEAP32[$2>>2]|0;
 $61 = ($60|0)>(0);
 if (!($61)) {
  return;
 }
 $62 = ((($1)) + 12|0);
 $63 = ((($ctx)) + 8152|0);
 $j$08 = 0;
 while(1) {
  $64 = HEAP32[$62>>2]|0;
  $65 = (($64) + (($j$08*40)|0)|0);
  $66 = HEAP32[$65>>2]|0;
  $67 = HEAP32[$1>>2]|0;
  $68 = (($67) + ($66<<5)|0);
  $69 = (((($64) + (($j$08*40)|0)|0)) + 4|0);
  $70 = HEAP32[$69>>2]|0;
  $71 = (($70) + -1)|0;
  $72 = (($68) + ($71<<5)|0);
  $73 = +HEAPF32[$72>>2];
  $74 = ((($72)) + 4|0);
  $75 = +HEAPF32[$74>>2];
  $76 = +HEAPF32[$68>>2];
  $77 = (((($67) + ($66<<5)|0)) + 4|0);
  $78 = +HEAPF32[$77>>2];
  $79 = +HEAPF32[$63>>2];
  $80 = (_nvg__ptEquals($73,$75,$76,$78,$79)|0);
  $81 = ($80|0)==(0);
  if ($81) {
   $p0$0 = $72;
  } else {
   HEAP32[$69>>2] = $71;
   $82 = (($70) + -2)|0;
   $83 = (($68) + ($82<<5)|0);
   $84 = (((($64) + (($j$08*40)|0)|0)) + 8|0);
   HEAP8[$84>>0] = 1;
   $p0$0 = $83;
  }
  $85 = HEAP32[$69>>2]|0;
  $86 = ($85|0)>(2);
  if ($86) {
   $87 = (+_nvg__polyArea($68,$85));
   $88 = (((($64) + (($j$08*40)|0)|0)) + 32|0);
   $89 = HEAP32[$88>>2]|0;
   $90 = ($89|0)==(1);
   $91 = $87 < 0.0;
   $or$cond = $91 & $90;
   if ($or$cond) {
    _nvg__polyReverse($68,$85);
   }
   $92 = HEAP32[$88>>2]|0;
   $93 = ($92|0)==(2);
   $94 = $87 > 0.0;
   $or$cond3 = $94 & $93;
   if ($or$cond3) {
    $95 = HEAP32[$69>>2]|0;
    _nvg__polyReverse($68,$95);
   }
   $$pr = HEAP32[$69>>2]|0;
   $97 = $$pr;
  } else {
   $97 = $85;
  }
  $96 = ($97|0)>(0);
  if ($96) {
   $i$25 = 0;$p0$17 = $p0$0;$p1$06 = $68;
   while(1) {
    $98 = +HEAPF32[$p1$06>>2];
    $99 = +HEAPF32[$p0$17>>2];
    $100 = $98 - $99;
    $101 = ((($p0$17)) + 8|0);
    HEAPF32[$101>>2] = $100;
    $102 = ((($p1$06)) + 4|0);
    $103 = +HEAPF32[$102>>2];
    $104 = ((($p0$17)) + 4|0);
    $105 = +HEAPF32[$104>>2];
    $106 = $103 - $105;
    $107 = ((($p0$17)) + 12|0);
    HEAPF32[$107>>2] = $106;
    $108 = (+_nvg__normalize($101,$107));
    $109 = ((($p0$17)) + 16|0);
    HEAPF32[$109>>2] = $108;
    $110 = +HEAPF32[$57>>2];
    $111 = +HEAPF32[$p0$17>>2];
    $112 = (+_nvg__minf($110,$111));
    HEAPF32[$57>>2] = $112;
    $113 = +HEAPF32[$56>>2];
    $114 = +HEAPF32[$104>>2];
    $115 = (+_nvg__minf($113,$114));
    HEAPF32[$56>>2] = $115;
    $116 = +HEAPF32[$59>>2];
    $117 = +HEAPF32[$p0$17>>2];
    $118 = (+_nvg__maxf($116,$117));
    HEAPF32[$59>>2] = $118;
    $119 = +HEAPF32[$58>>2];
    $120 = +HEAPF32[$104>>2];
    $121 = (+_nvg__maxf($119,$120));
    HEAPF32[$58>>2] = $121;
    $122 = ((($p1$06)) + 32|0);
    $123 = (($i$25) + 1)|0;
    $124 = HEAP32[$69>>2]|0;
    $125 = ($123|0)<($124|0);
    if ($125) {
     $p0$17$phi = $p1$06;$i$25 = $123;$p1$06 = $122;$p0$17 = $p0$17$phi;
    } else {
     break;
    }
   }
  }
  $126 = (($j$08) + 1)|0;
  $127 = HEAP32[$2>>2]|0;
  $128 = ($126|0)<($127|0);
  if ($128) {
   $j$08 = $126;
  } else {
   break;
  }
 }
 return;
}
function _nvg__expandFill($ctx,$w) {
 $ctx = $ctx|0;
 $w = +$w;
 var $$ = 0.0, $$1 = 0.0, $$pr = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0.0, $101 = 0, $102 = 0.0, $103 = 0.0, $104 = 0.0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0.0, $112 = 0;
 var $113 = 0.0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0;
 var $131 = 0, $132 = 0, $133 = 0, $134 = 0.0, $135 = 0, $136 = 0.0, $137 = 0.0, $138 = 0.0, $139 = 0, $14 = 0, $140 = 0.0, $141 = 0, $142 = 0.0, $143 = 0.0, $144 = 0.0, $145 = 0, $146 = 0.0, $147 = 0.0, $148 = 0.0, $149 = 0.0;
 var $15 = 0, $150 = 0.0, $151 = 0.0, $152 = 0.0, $153 = 0.0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0.0, $16 = 0, $160 = 0, $161 = 0.0, $162 = 0, $163 = 0, $164 = 0.0, $165 = 0, $166 = 0.0, $167 = 0;
 var $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0;
 var $28 = 0, $29 = 0, $3 = 0.0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0.0, $38 = 0.0, $39 = 0.0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0;
 var $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0.0, $62 = 0, $63 = 0.0;
 var $64 = 0.0, $65 = 0.0, $66 = 0, $67 = 0.0, $68 = 0, $69 = 0.0, $7 = 0, $70 = 0.0, $71 = 0.0, $72 = 0, $73 = 0, $74 = 0.0, $75 = 0, $76 = 0.0, $77 = 0, $78 = 0.0, $79 = 0, $8 = 0, $80 = 0.0, $81 = 0.0;
 var $82 = 0.0, $83 = 0.0, $84 = 0, $85 = 0.0, $86 = 0.0, $87 = 0.0, $88 = 0.0, $89 = 0.0, $9 = 0, $90 = 0.0, $91 = 0.0, $92 = 0, $93 = 0, $94 = 0.0, $95 = 0, $96 = 0.0, $97 = 0.0, $98 = 0.0, $99 = 0, $cverts$0$lcssa = 0;
 var $cverts$024 = 0, $cverts$1 = 0, $dst$09 = 0, $dst$2 = 0, $dst$35 = 0, $dst$4 = 0, $dst$5$lcssa = 0, $dst$515 = 0, $dst$6 = 0, $i$023 = 0, $i$118 = 0, $j$08 = 0, $j$14 = 0, $j$214 = 0, $p0$07 = 0, $p0$07$phi = 0, $p0$113 = 0, $p0$113$phi = 0, $p1$06 = 0, $p1$112 = 0;
 var $verts$020 = 0, $verts$1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($ctx)) + 8144|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ((($ctx)) + 8156|0);
 $3 = +HEAPF32[$2>>2];
 $4 = $w > 0.0;
 _nvg__calculateJoins($ctx,$w,4,2.4000000953674316);
 $5 = ((($1)) + 16|0);
 $6 = HEAP32[$5>>2]|0;
 $7 = ($6|0)>(0);
 if ($7) {
  $8 = ((($1)) + 12|0);
  $9 = HEAP32[$8>>2]|0;
  $10 = HEAP32[$5>>2]|0;
  $cverts$024 = 0;$i$023 = 0;
  while(1) {
   $11 = (((($9) + (($i$023*40)|0)|0)) + 4|0);
   $12 = HEAP32[$11>>2]|0;
   $13 = (((($9) + (($i$023*40)|0)|0)) + 12|0);
   $14 = HEAP32[$13>>2]|0;
   $15 = (($cverts$024) + 1)|0;
   $16 = (($15) + ($12))|0;
   $17 = (($16) + ($14))|0;
   if ($4) {
    $18 = ($14*5)|0;
    $19 = (($18) + ($12))|0;
    $20 = $19 << 1;
    $21 = (($20) + 2)|0;
    $22 = (($21) + ($17))|0;
    $cverts$1 = $22;
   } else {
    $cverts$1 = $17;
   }
   $23 = (($i$023) + 1)|0;
   $24 = ($23|0)<($10|0);
   if ($24) {
    $cverts$024 = $cverts$1;$i$023 = $23;
   } else {
    $cverts$0$lcssa = $cverts$1;
    break;
   }
  }
 } else {
  $cverts$0$lcssa = 0;
 }
 $25 = (_nvg__allocTempVerts($ctx,$cverts$0$lcssa)|0);
 $26 = ($25|0)==(0|0);
 if ($26) {
  return;
 }
 $27 = HEAP32[$5>>2]|0;
 $28 = ($27|0)==(1);
 if ($28) {
  $29 = ((($1)) + 12|0);
  $30 = HEAP32[$29>>2]|0;
  $31 = ((($30)) + 36|0);
  $32 = HEAP32[$31>>2]|0;
  $33 = ($32|0)!=(0);
  $$pr = HEAP32[$5>>2]|0;
  $35 = $$pr;$40 = $33;
 } else {
  $35 = $27;$40 = 0;
 }
 $34 = ($35|0)>(0);
 if (!($34)) {
  return;
 }
 $36 = ((($1)) + 12|0);
 $37 = $3 * 0.5;
 $38 = $37 + $w;
 $39 = $w - $37;
 $$ = $40 ? 0.5 : 0.0;
 $$1 = $40 ? $37 : $38;
 $i$118 = 0;$verts$020 = $25;
 while(1) {
  $41 = HEAP32[$36>>2]|0;
  $42 = (($41) + (($i$118*40)|0)|0);
  $43 = HEAP32[$42>>2]|0;
  $44 = HEAP32[$1>>2]|0;
  $45 = (($44) + ($43<<5)|0);
  $46 = (((($41) + (($i$118*40)|0)|0)) + 16|0);
  HEAP32[$46>>2] = $verts$020;
  $47 = (((($41) + (($i$118*40)|0)|0)) + 4|0);
  $48 = HEAP32[$47>>2]|0;
  if ($4) {
   $50 = HEAP32[$47>>2]|0;
   $51 = ($50|0)>(0);
   if ($51) {
    $52 = (($48) + -1)|0;
    $53 = (($45) + ($52<<5)|0);
    $dst$09 = $verts$020;$j$08 = 0;$p0$07 = $53;$p1$06 = $45;
    while(1) {
     $54 = ((($p1$06)) + 28|0);
     $55 = HEAP8[$54>>0]|0;
     $56 = $55&255;
     $57 = $56 & 4;
     $58 = ($57|0)==(0);
     do {
      if ($58) {
       $94 = +HEAPF32[$p1$06>>2];
       $95 = ((($p1$06)) + 20|0);
       $96 = +HEAPF32[$95>>2];
       $97 = $37 * $96;
       $98 = $94 + $97;
       $99 = ((($p1$06)) + 4|0);
       $100 = +HEAPF32[$99>>2];
       $101 = ((($p1$06)) + 24|0);
       $102 = +HEAPF32[$101>>2];
       $103 = $37 * $102;
       $104 = $100 + $103;
       _nvg__vset($dst$09,$98,$104,0.5,1.0);
       $105 = ((($dst$09)) + 16|0);
       $dst$2 = $105;
      } else {
       $59 = $56 & 2;
       $60 = ($59|0)==(0);
       if ($60) {
        $73 = ((($p1$06)) + 8|0);
        $74 = +HEAPF32[$73>>2];
        $75 = ((($p1$06)) + 12|0);
        $76 = +HEAPF32[$75>>2];
        $77 = ((($p0$07)) + 8|0);
        $78 = +HEAPF32[$77>>2];
        $79 = ((($p0$07)) + 12|0);
        $80 = +HEAPF32[$79>>2];
        $81 = +HEAPF32[$p1$06>>2];
        $82 = $37 * $80;
        $83 = $81 + $82;
        $84 = ((($p1$06)) + 4|0);
        $85 = +HEAPF32[$84>>2];
        $86 = $37 * $78;
        $87 = $85 - $86;
        $88 = $37 * $76;
        $89 = $88 + $81;
        $90 = $37 * $74;
        $91 = $85 - $90;
        _nvg__vset($dst$09,$83,$87,0.5,1.0);
        $92 = ((($dst$09)) + 16|0);
        _nvg__vset($92,$89,$91,0.5,1.0);
        $93 = ((($dst$09)) + 32|0);
        $dst$2 = $93;
        break;
       } else {
        $61 = +HEAPF32[$p1$06>>2];
        $62 = ((($p1$06)) + 20|0);
        $63 = +HEAPF32[$62>>2];
        $64 = $37 * $63;
        $65 = $61 + $64;
        $66 = ((($p1$06)) + 4|0);
        $67 = +HEAPF32[$66>>2];
        $68 = ((($p1$06)) + 24|0);
        $69 = +HEAPF32[$68>>2];
        $70 = $37 * $69;
        $71 = $67 + $70;
        _nvg__vset($dst$09,$65,$71,0.5,1.0);
        $72 = ((($dst$09)) + 16|0);
        $dst$2 = $72;
        break;
       }
      }
     } while(0);
     $106 = ((($p1$06)) + 32|0);
     $107 = (($j$08) + 1)|0;
     $108 = HEAP32[$47>>2]|0;
     $109 = ($107|0)<($108|0);
     if ($109) {
      $p0$07$phi = $p1$06;$dst$09 = $dst$2;$j$08 = $107;$p1$06 = $106;$p0$07 = $p0$07$phi;
     } else {
      $dst$4 = $dst$2;
      break;
     }
    }
   } else {
    $dst$4 = $verts$020;
   }
  } else {
   $49 = ($48|0)>(0);
   if ($49) {
    $dst$35 = $verts$020;$j$14 = 0;
    while(1) {
     $110 = (($45) + ($j$14<<5)|0);
     $111 = +HEAPF32[$110>>2];
     $112 = ((($110)) + 4|0);
     $113 = +HEAPF32[$112>>2];
     _nvg__vset($dst$35,$111,$113,0.5,1.0);
     $114 = ((($dst$35)) + 16|0);
     $115 = (($j$14) + 1)|0;
     $116 = HEAP32[$47>>2]|0;
     $117 = ($115|0)<($116|0);
     if ($117) {
      $dst$35 = $114;$j$14 = $115;
     } else {
      $dst$4 = $114;
      break;
     }
    }
   } else {
    $dst$4 = $verts$020;
   }
  }
  $118 = $dst$4;
  $119 = $verts$020;
  $120 = (($118) - ($119))|0;
  $121 = $120 >> 4;
  $122 = (((($41) + (($i$118*40)|0)|0)) + 20|0);
  HEAP32[$122>>2] = $121;
  $123 = (((($41) + (($i$118*40)|0)|0)) + 24|0);
  if ($4) {
   HEAP32[$123>>2] = $dst$4;
   $124 = (((($41) + (($i$118*40)|0)|0)) + 4|0);
   $125 = HEAP32[$124>>2]|0;
   $126 = ($125|0)>(0);
   if ($126) {
    $127 = (($125) + -1)|0;
    $128 = (($45) + ($127<<5)|0);
    $dst$515 = $dst$4;$j$214 = 0;$p0$113 = $128;$p1$112 = $45;
    while(1) {
     $129 = ((($p1$112)) + 28|0);
     $130 = HEAP8[$129>>0]|0;
     $131 = $130 & 12;
     $132 = ($131<<24>>24)==(0);
     if ($132) {
      $134 = +HEAPF32[$p1$112>>2];
      $135 = ((($p1$112)) + 20|0);
      $136 = +HEAPF32[$135>>2];
      $137 = $$1 * $136;
      $138 = $134 + $137;
      $139 = ((($p1$112)) + 4|0);
      $140 = +HEAPF32[$139>>2];
      $141 = ((($p1$112)) + 24|0);
      $142 = +HEAPF32[$141>>2];
      $143 = $$1 * $142;
      $144 = $140 + $143;
      _nvg__vset($dst$515,$138,$144,$$,1.0);
      $145 = ((($dst$515)) + 16|0);
      $146 = +HEAPF32[$p1$112>>2];
      $147 = +HEAPF32[$135>>2];
      $148 = $39 * $147;
      $149 = $146 - $148;
      $150 = +HEAPF32[$139>>2];
      $151 = +HEAPF32[$141>>2];
      $152 = $39 * $151;
      $153 = $150 - $152;
      _nvg__vset($145,$149,$153,1.0,1.0);
      $154 = ((($dst$515)) + 32|0);
      $dst$6 = $154;
     } else {
      $133 = (_nvg__bevelJoin($dst$515,$p0$113,$p1$112,$$1,$39,$$)|0);
      $dst$6 = $133;
     }
     $155 = ((($p1$112)) + 32|0);
     $156 = (($j$214) + 1)|0;
     $157 = HEAP32[$124>>2]|0;
     $158 = ($156|0)<($157|0);
     if ($158) {
      $p0$113$phi = $p1$112;$dst$515 = $dst$6;$j$214 = $156;$p1$112 = $155;$p0$113 = $p0$113$phi;
     } else {
      $dst$5$lcssa = $dst$6;
      break;
     }
    }
   } else {
    $dst$5$lcssa = $dst$4;
   }
   $159 = +HEAPF32[$dst$4>>2];
   $160 = ((($dst$4)) + 4|0);
   $161 = +HEAPF32[$160>>2];
   _nvg__vset($dst$5$lcssa,$159,$161,$$,1.0);
   $162 = ((($dst$5$lcssa)) + 16|0);
   $163 = ((($dst$4)) + 16|0);
   $164 = +HEAPF32[$163>>2];
   $165 = ((($dst$4)) + 20|0);
   $166 = +HEAPF32[$165>>2];
   _nvg__vset($162,$164,$166,1.0,1.0);
   $167 = ((($dst$5$lcssa)) + 32|0);
   $168 = $167;
   $169 = (($168) - ($118))|0;
   $170 = $169 >> 4;
   $171 = (((($41) + (($i$118*40)|0)|0)) + 28|0);
   HEAP32[$171>>2] = $170;
   $verts$1 = $167;
  } else {
   HEAP32[$123>>2] = 0;
   $172 = (((($41) + (($i$118*40)|0)|0)) + 28|0);
   HEAP32[$172>>2] = 0;
   $verts$1 = $dst$4;
  }
  $173 = (($i$118) + 1)|0;
  $174 = HEAP32[$5>>2]|0;
  $175 = ($173|0)<($174|0);
  if ($175) {
   $i$118 = $173;$verts$020 = $verts$1;
  } else {
   break;
  }
 }
 return;
}
function _nvg__getAverageScale($t) {
 $t = $t|0;
 var $0 = 0.0, $1 = 0.0, $10 = 0, $11 = 0.0, $12 = 0.0, $13 = 0.0, $14 = 0.0, $15 = 0.0, $16 = 0.0, $2 = 0, $3 = 0.0, $4 = 0.0, $5 = 0.0, $6 = 0.0, $7 = 0, $8 = 0.0, $9 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = +HEAPF32[$t>>2];
 $1 = $0 * $0;
 $2 = ((($t)) + 8|0);
 $3 = +HEAPF32[$2>>2];
 $4 = $3 * $3;
 $5 = $1 + $4;
 $6 = (+Math_sqrt((+$5)));
 $7 = ((($t)) + 4|0);
 $8 = +HEAPF32[$7>>2];
 $9 = $8 * $8;
 $10 = ((($t)) + 12|0);
 $11 = +HEAPF32[$10>>2];
 $12 = $11 * $11;
 $13 = $9 + $12;
 $14 = (+Math_sqrt((+$13)));
 $15 = $6 + $14;
 $16 = $15 * 0.5;
 return (+$16);
}
function _nvg__expandStroke($ctx,$w,$lineCap,$lineJoin,$miterLimit) {
 $ctx = $ctx|0;
 $w = +$w;
 $lineCap = $lineCap|0;
 $lineJoin = $lineJoin|0;
 $miterLimit = +$miterLimit;
 var $$pn = 0, $$pn$1 = 0, $$pn$2 = 0, $$pn$in = 0, $$pn$in$in = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0.0, $101 = 0.0, $102 = 0.0, $103 = 0, $104 = 0, $105 = 0, $106 = 0.0, $107 = 0, $108 = 0.0, $109 = 0, $11 = 0, $110 = 0;
 var $111 = 0.0, $112 = 0, $113 = 0.0, $114 = 0, $115 = 0.0, $116 = 0.0, $117 = 0.0, $118 = 0, $119 = 0.0, $12 = 0, $120 = 0, $121 = 0.0, $122 = 0.0, $123 = 0.0, $124 = 0.0, $125 = 0, $126 = 0.0, $127 = 0.0, $128 = 0, $129 = 0.0;
 var $13 = 0, $130 = 0.0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0;
 var $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0.0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0.0, $35 = 0.0, $36 = 0.0, $37 = 0.0, $38 = 0, $39 = 0, $4 = 0;
 var $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0.0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0.0;
 var $59 = 0.0, $6 = 0, $60 = 0.0, $61 = 0, $62 = 0.0, $63 = 0, $64 = 0.0, $65 = 0.0, $66 = 0.0, $67 = 0.0, $68 = 0, $69 = 0.0, $7 = 0, $70 = 0.0, $71 = 0, $72 = 0.0, $73 = 0.0, $74 = 0, $75 = 0, $76 = 0;
 var $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0.0, $84 = 0, $85 = 0.0, $86 = 0.0, $87 = 0.0, $88 = 0, $89 = 0.0, $9 = 0, $90 = 0, $91 = 0.0, $92 = 0.0, $93 = 0.0, $94 = 0;
 var $95 = 0.0, $96 = 0.0, $97 = 0.0, $98 = 0.0, $99 = 0.0, $cverts$0$lcssa = 0, $cverts$019 = 0, $cverts$1 = 0, $cverts$2 = 0, $dst$1$lcssa = 0, $dst$1$ph = 0, $dst$110 = 0, $dst$2 = 0, $dst$2$lcssa = 0, $dst$3 = 0, $dx = 0, $dy = 0, $e$06$ph = 0, $exitcond = 0, $i$018 = 0;
 var $i$115 = 0, $j$0$ph = 0, $j$09 = 0, $p0$1$lcssa = 0, $p0$1$ph = 0, $p0$111 = 0, $p0$111$phi = 0, $p1$1$lcssa = 0, $p1$1$ph = 0, $p1$112 = 0, $scevgep = 0, $scevgep25 = 0, $scevgep26 = 0, $verts$016 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0;
 $dx = sp + 4|0;
 $dy = sp;
 $0 = ((($ctx)) + 8144|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ((($ctx)) + 8156|0);
 $3 = +HEAPF32[$2>>2];
 $4 = ((($ctx)) + 8148|0);
 $5 = +HEAPF32[$4>>2];
 $6 = (_nvg__curveDivs($w,$5)|0);
 _nvg__calculateJoins($ctx,$w,$lineJoin,$miterLimit);
 $7 = ((($1)) + 16|0);
 $8 = HEAP32[$7>>2]|0;
 $9 = ($8|0)>(0);
 if ($9) {
  $10 = ((($1)) + 12|0);
  $11 = HEAP32[$10>>2]|0;
  $12 = ($lineJoin|0)==(1);
  $13 = (($6) + 2)|0;
  $$pn$2 = $12 ? $13 : 5;
  $14 = ($lineCap|0)==(1);
  $15 = $6 << 2;
  $16 = (($15) + 4)|0;
  $17 = HEAP32[$7>>2]|0;
  $cverts$019 = 0;$i$018 = 0;
  while(1) {
   $18 = (((($11) + (($i$018*40)|0)|0)) + 8|0);
   $19 = HEAP8[$18>>0]|0;
   $20 = ($19<<24>>24)==(0);
   $21 = (((($11) + (($i$018*40)|0)|0)) + 4|0);
   $22 = HEAP32[$21>>2]|0;
   $23 = (((($11) + (($i$018*40)|0)|0)) + 12|0);
   $24 = HEAP32[$23>>2]|0;
   $$pn$1 = Math_imul($24, $$pn$2)|0;
   $$pn$in$in = (($$pn$1) + ($22))|0;
   $$pn$in = $$pn$in$in << 1;
   $$pn = (($cverts$019) + 2)|0;
   $cverts$1 = (($$pn) + ($$pn$in))|0;
   do {
    if ($20) {
     if ($14) {
      $25 = (($16) + ($cverts$1))|0;
      $cverts$2 = $25;
      break;
     } else {
      $26 = (($cverts$1) + 12)|0;
      $cverts$2 = $26;
      break;
     }
    } else {
     $cverts$2 = $cverts$1;
    }
   } while(0);
   $27 = (($i$018) + 1)|0;
   $28 = ($27|0)<($17|0);
   if ($28) {
    $cverts$019 = $cverts$2;$i$018 = $27;
   } else {
    $cverts$0$lcssa = $cverts$2;
    break;
   }
  }
 } else {
  $cverts$0$lcssa = 0;
 }
 $29 = (_nvg__allocTempVerts($ctx,$cverts$0$lcssa)|0);
 $30 = ($29|0)==(0|0);
 if ($30) {
  STACKTOP = sp;return;
 }
 $31 = HEAP32[$7>>2]|0;
 $32 = ($31|0)>(0);
 if (!($32)) {
  STACKTOP = sp;return;
 }
 $33 = ((($1)) + 12|0);
 $34 = $3 * -0.5;
 $35 = $w - $3;
 $36 = $3 * -0.5;
 $37 = $w - $3;
 $38 = ($lineJoin|0)==(1);
 $i$115 = 0;$verts$016 = $29;
 while(1) {
  $39 = HEAP32[$33>>2]|0;
  $40 = (($39) + (($i$115*40)|0)|0);
  $41 = HEAP32[$40>>2]|0;
  $42 = HEAP32[$1>>2]|0;
  $43 = (($42) + ($41<<5)|0);
  $44 = (((($39) + (($i$115*40)|0)|0)) + 16|0);
  HEAP32[$44>>2] = 0;
  $45 = (((($39) + (($i$115*40)|0)|0)) + 20|0);
  HEAP32[$45>>2] = 0;
  $46 = (((($39) + (($i$115*40)|0)|0)) + 8|0);
  $47 = HEAP8[$46>>0]|0;
  $48 = ($47<<24>>24)==(0);
  $49 = (((($39) + (($i$115*40)|0)|0)) + 24|0);
  HEAP32[$49>>2] = $verts$016;
  L20: do {
   if ($48) {
    $54 = ((($43)) + 32|0);
    $55 = (((($39) + (($i$115*40)|0)|0)) + 4|0);
    $56 = HEAP32[$55>>2]|0;
    $57 = (($56) + -1)|0;
    $58 = +HEAPF32[$54>>2];
    $59 = +HEAPF32[$43>>2];
    $60 = $58 - $59;
    HEAPF32[$dx>>2] = $60;
    $61 = ((($54)) + 4|0);
    $62 = +HEAPF32[$61>>2];
    $63 = (((($42) + ($41<<5)|0)) + 4|0);
    $64 = +HEAPF32[$63>>2];
    $65 = $62 - $64;
    HEAPF32[$dy>>2] = $65;
    (+_nvg__normalize($dx,$dy));
    switch ($lineCap|0) {
    case 0:  {
     $66 = +HEAPF32[$dx>>2];
     $67 = +HEAPF32[$dy>>2];
     $68 = (_nvg__buttCapStart($verts$016,$43,$66,$67,$w,$34,$3)|0);
     $dst$1$ph = $68;$e$06$ph = $57;$j$0$ph = 1;$p0$1$ph = $43;$p1$1$ph = $54;
     break L20;
     break;
    }
    case 2:  {
     $69 = +HEAPF32[$dx>>2];
     $70 = +HEAPF32[$dy>>2];
     $71 = (_nvg__buttCapStart($verts$016,$43,$69,$70,$w,$35,$3)|0);
     $dst$1$ph = $71;$e$06$ph = $57;$j$0$ph = 1;$p0$1$ph = $43;$p1$1$ph = $54;
     break L20;
     break;
    }
    case 1:  {
     $72 = +HEAPF32[$dx>>2];
     $73 = +HEAPF32[$dy>>2];
     $74 = (_nvg__roundCapStart($verts$016,$43,$72,$73,$w,$6)|0);
     $dst$1$ph = $74;$e$06$ph = $57;$j$0$ph = 1;$p0$1$ph = $43;$p1$1$ph = $54;
     break L20;
     break;
    }
    default: {
     $dst$1$ph = $verts$016;$e$06$ph = $57;$j$0$ph = 1;$p0$1$ph = $43;$p1$1$ph = $54;
     break L20;
    }
    }
   } else {
    $50 = (((($39) + (($i$115*40)|0)|0)) + 4|0);
    $51 = HEAP32[$50>>2]|0;
    $52 = (($51) + -1)|0;
    $53 = (($43) + ($52<<5)|0);
    $dst$1$ph = $verts$016;$e$06$ph = $51;$j$0$ph = 0;$p0$1$ph = $53;$p1$1$ph = $43;
   }
  } while(0);
  $75 = ($e$06$ph|0)>($j$0$ph|0);
  if ($75) {
   $76 = (($e$06$ph) - ($j$0$ph))|0;
   $scevgep25 = ((($p1$1$ph)) + -32|0);
   $dst$110 = $dst$1$ph;$j$09 = $j$0$ph;$p0$111 = $p0$1$ph;$p1$112 = $p1$1$ph;
   while(1) {
    $77 = ((($p1$112)) + 28|0);
    $78 = HEAP8[$77>>0]|0;
    $79 = $78 & 12;
    $80 = ($79<<24>>24)==(0);
    do {
     if ($80) {
      $83 = +HEAPF32[$p1$112>>2];
      $84 = ((($p1$112)) + 20|0);
      $85 = +HEAPF32[$84>>2];
      $86 = $85 * $w;
      $87 = $83 + $86;
      $88 = ((($p1$112)) + 4|0);
      $89 = +HEAPF32[$88>>2];
      $90 = ((($p1$112)) + 24|0);
      $91 = +HEAPF32[$90>>2];
      $92 = $91 * $w;
      $93 = $89 + $92;
      _nvg__vset($dst$110,$87,$93,0.0,1.0);
      $94 = ((($dst$110)) + 16|0);
      $95 = +HEAPF32[$p1$112>>2];
      $96 = +HEAPF32[$84>>2];
      $97 = $96 * $w;
      $98 = $95 - $97;
      $99 = +HEAPF32[$88>>2];
      $100 = +HEAPF32[$90>>2];
      $101 = $100 * $w;
      $102 = $99 - $101;
      _nvg__vset($94,$98,$102,1.0,1.0);
      $103 = ((($dst$110)) + 32|0);
      $dst$2 = $103;
     } else {
      if ($38) {
       $81 = (_nvg__roundJoin($dst$110,$p0$111,$p1$112,$w,$w,$6)|0);
       $dst$2 = $81;
       break;
      } else {
       $82 = (_nvg__bevelJoin($dst$110,$p0$111,$p1$112,$w,$w,0.0)|0);
       $dst$2 = $82;
       break;
      }
     }
    } while(0);
    $104 = ((($p1$112)) + 32|0);
    $105 = (($j$09) + 1)|0;
    $exitcond = ($105|0)==($e$06$ph|0);
    if ($exitcond) {
     $dst$2$lcssa = $dst$2;
     break;
    } else {
     $p0$111$phi = $p1$112;$dst$110 = $dst$2;$j$09 = $105;$p1$112 = $104;$p0$111 = $p0$111$phi;
    }
   }
   $scevgep = (($p1$1$ph) + ($76<<5)|0);
   $scevgep26 = (($scevgep25) + ($76<<5)|0);
   $dst$1$lcssa = $dst$2$lcssa;$p0$1$lcssa = $scevgep26;$p1$1$lcssa = $scevgep;
  } else {
   $dst$1$lcssa = $dst$1$ph;$p0$1$lcssa = $p0$1$ph;$p1$1$lcssa = $p1$1$ph;
  }
  L41: do {
   if ($48) {
    $115 = +HEAPF32[$p1$1$lcssa>>2];
    $116 = +HEAPF32[$p0$1$lcssa>>2];
    $117 = $115 - $116;
    HEAPF32[$dx>>2] = $117;
    $118 = ((($p1$1$lcssa)) + 4|0);
    $119 = +HEAPF32[$118>>2];
    $120 = ((($p0$1$lcssa)) + 4|0);
    $121 = +HEAPF32[$120>>2];
    $122 = $119 - $121;
    HEAPF32[$dy>>2] = $122;
    (+_nvg__normalize($dx,$dy));
    switch ($lineCap|0) {
    case 0:  {
     $123 = +HEAPF32[$dx>>2];
     $124 = +HEAPF32[$dy>>2];
     $125 = (_nvg__buttCapEnd($dst$1$lcssa,$p1$1$lcssa,$123,$124,$w,$36,$3)|0);
     $dst$3 = $125;
     break L41;
     break;
    }
    case 2:  {
     $126 = +HEAPF32[$dx>>2];
     $127 = +HEAPF32[$dy>>2];
     $128 = (_nvg__buttCapEnd($dst$1$lcssa,$p1$1$lcssa,$126,$127,$w,$37,$3)|0);
     $dst$3 = $128;
     break L41;
     break;
    }
    case 1:  {
     $129 = +HEAPF32[$dx>>2];
     $130 = +HEAPF32[$dy>>2];
     $131 = (_nvg__roundCapEnd($dst$1$lcssa,$p1$1$lcssa,$129,$130,$w,$6)|0);
     $dst$3 = $131;
     break L41;
     break;
    }
    default: {
     $dst$3 = $dst$1$lcssa;
     break L41;
    }
    }
   } else {
    $106 = +HEAPF32[$verts$016>>2];
    $107 = ((($verts$016)) + 4|0);
    $108 = +HEAPF32[$107>>2];
    _nvg__vset($dst$1$lcssa,$106,$108,0.0,1.0);
    $109 = ((($dst$1$lcssa)) + 16|0);
    $110 = ((($verts$016)) + 16|0);
    $111 = +HEAPF32[$110>>2];
    $112 = ((($verts$016)) + 20|0);
    $113 = +HEAPF32[$112>>2];
    _nvg__vset($109,$111,$113,1.0,1.0);
    $114 = ((($dst$1$lcssa)) + 32|0);
    $dst$3 = $114;
   }
  } while(0);
  $132 = $dst$3;
  $133 = $verts$016;
  $134 = (($132) - ($133))|0;
  $135 = $134 >> 4;
  $136 = (((($39) + (($i$115*40)|0)|0)) + 28|0);
  HEAP32[$136>>2] = $135;
  $137 = (($i$115) + 1)|0;
  $138 = HEAP32[$7>>2]|0;
  $139 = ($137|0)<($138|0);
  if ($139) {
   $i$115 = $137;$verts$016 = $dst$3;
  } else {
   break;
  }
 }
 STACKTOP = sp;return;
}
function _nvg__allocTempVerts($ctx,$nverts) {
 $ctx = $ctx|0;
 $nverts = $nverts|0;
 var $$1 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($ctx)) + 8144|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ((($1)) + 32|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = ($3|0)<($nverts|0);
 do {
  if ($4) {
   $5 = (($nverts) + 255)|0;
   $6 = $5 & -256;
   $7 = ((($1)) + 24|0);
   $8 = HEAP32[$7>>2]|0;
   $9 = $6 << 4;
   $10 = (_realloc($8,$9)|0);
   $11 = ($10|0)==(0|0);
   if ($11) {
    $$1 = 0;
    return ($$1|0);
   } else {
    $12 = HEAP32[$0>>2]|0;
    $13 = ((($12)) + 24|0);
    HEAP32[$13>>2] = $10;
    $14 = HEAP32[$0>>2]|0;
    $15 = ((($14)) + 32|0);
    HEAP32[$15>>2] = $6;
    break;
   }
  }
 } while(0);
 $16 = HEAP32[$0>>2]|0;
 $17 = ((($16)) + 24|0);
 $18 = HEAP32[$17>>2]|0;
 $$1 = $18;
 return ($$1|0);
}
function _nvg__vset($vtx,$x,$y,$u,$v) {
 $vtx = $vtx|0;
 $x = +$x;
 $y = +$y;
 $u = +$u;
 $v = +$v;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 HEAPF32[$vtx>>2] = $x;
 $0 = ((($vtx)) + 4|0);
 HEAPF32[$0>>2] = $y;
 $1 = ((($vtx)) + 8|0);
 HEAPF32[$1>>2] = $u;
 $2 = ((($vtx)) + 12|0);
 HEAPF32[$2>>2] = $v;
 return;
}
function _nvg__curveDivs($r,$tol) {
 $r = +$r;
 $tol = +$tol;
 var $0 = 0.0, $1 = 0.0, $2 = 0.0, $3 = 0.0, $4 = 0.0, $5 = 0.0, $6 = 0, $7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = $r + $tol;
 $1 = $r / $0;
 $2 = (+Math_acos((+$1)));
 $3 = $2 * 2.0;
 $4 = 3.1415927410125732 / $3;
 $5 = (+Math_ceil((+$4)));
 $6 = (~~(($5)));
 $7 = (_nvg__maxi(2,$6)|0);
 return ($7|0);
}
function _nvg__calculateJoins($ctx,$w,$lineJoin,$miterLimit) {
 $ctx = $ctx|0;
 $w = +$w;
 $lineJoin = $lineJoin|0;
 $miterLimit = +$miterLimit;
 var $$lcssa = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0.0, $25 = 0;
 var $26 = 0.0, $27 = 0, $28 = 0.0, $29 = 0, $3 = 0.0, $30 = 0.0, $31 = 0.0, $32 = 0.0, $33 = 0.0, $34 = 0, $35 = 0.0, $36 = 0.0, $37 = 0, $38 = 0.0, $39 = 0.0, $4 = 0, $40 = 0.0, $41 = 0, $42 = 0.0, $43 = 0;
 var $44 = 0.0, $45 = 0.0, $46 = 0.0, $47 = 0.0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0.0, $52 = 0.0, $53 = 0.0, $54 = 0.0, $55 = 0.0, $56 = 0.0, $57 = 0.0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0;
 var $62 = 0, $63 = 0, $64 = 0.0, $65 = 0, $66 = 0.0, $67 = 0.0, $68 = 0.0, $69 = 0.0, $7 = 0, $70 = 0.0, $71 = 0.0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0;
 var $80 = 0, $81 = 0.0, $82 = 0.0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0;
 var $99 = 0, $i$09 = 0, $iw$0 = 0.0, $j$07 = 0, $nleft$0$lcssa = 0, $nleft$04 = 0, $nleft$1 = 0, $p0$06 = 0, $p0$06$phi = 0, $p1$05 = 0, $scale$0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($ctx)) + 8144|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = $w > 0.0;
 if ($2) {
  $3 = 1.0 / $w;
  $iw$0 = $3;
 } else {
  $iw$0 = 0.0;
 }
 $4 = ((($1)) + 16|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = ($5|0)>(0);
 if (!($6)) {
  return;
 }
 $7 = ((($1)) + 12|0);
 $8 = HEAP32[$7>>2]|0;
 $9 = HEAP32[$1>>2]|0;
 $10 = HEAP32[$4>>2]|0;
 $11 = $lineJoin & -3;
 $12 = ($11|0)==(1);
 $i$09 = 0;
 while(1) {
  $13 = (($8) + (($i$09*40)|0)|0);
  $14 = HEAP32[$13>>2]|0;
  $15 = (($9) + ($14<<5)|0);
  $16 = (((($8) + (($i$09*40)|0)|0)) + 4|0);
  $17 = HEAP32[$16>>2]|0;
  $18 = (((($8) + (($i$09*40)|0)|0)) + 12|0);
  HEAP32[$18>>2] = 0;
  $19 = ($17|0)>(0);
  if ($19) {
   $20 = (($17) + -1)|0;
   $21 = (($15) + ($20<<5)|0);
   $22 = HEAP32[$16>>2]|0;
   $j$07 = 0;$nleft$04 = 0;$p0$06 = $21;$p1$05 = $15;
   while(1) {
    $23 = ((($p0$06)) + 12|0);
    $24 = +HEAPF32[$23>>2];
    $25 = ((($p0$06)) + 8|0);
    $26 = +HEAPF32[$25>>2];
    $27 = ((($p1$05)) + 12|0);
    $28 = +HEAPF32[$27>>2];
    $29 = ((($p1$05)) + 8|0);
    $30 = +HEAPF32[$29>>2];
    $31 = -$30;
    $32 = $24 + $28;
    $33 = $32 * 0.5;
    $34 = ((($p1$05)) + 20|0);
    HEAPF32[$34>>2] = $33;
    $35 = $31 - $26;
    $36 = $35 * 0.5;
    $37 = ((($p1$05)) + 24|0);
    HEAPF32[$37>>2] = $36;
    $38 = $33 * $33;
    $39 = $36 * $36;
    $40 = $38 + $39;
    $41 = $40 > 9.9999999747524271E-7;
    if ($41) {
     $42 = 1.0 / $40;
     $43 = $42 > 600.0;
     $scale$0 = $43 ? 600.0 : $42;
     $44 = +HEAPF32[$34>>2];
     $45 = $scale$0 * $44;
     HEAPF32[$34>>2] = $45;
     $46 = +HEAPF32[$37>>2];
     $47 = $scale$0 * $46;
     HEAPF32[$37>>2] = $47;
    }
    $48 = ((($p1$05)) + 28|0);
    $49 = HEAP8[$48>>0]|0;
    $50 = $49 & 1;
    HEAP8[$48>>0] = $50;
    $51 = +HEAPF32[$29>>2];
    $52 = +HEAPF32[$23>>2];
    $53 = $51 * $52;
    $54 = +HEAPF32[$25>>2];
    $55 = +HEAPF32[$27>>2];
    $56 = $54 * $55;
    $57 = $53 - $56;
    $58 = $57 > 0.0;
    if ($58) {
     $59 = (($nleft$04) + 1)|0;
     $60 = $50&255;
     $61 = $60 | 2;
     $62 = $61&255;
     HEAP8[$48>>0] = $62;
     $nleft$1 = $59;
    } else {
     $nleft$1 = $nleft$04;
    }
    $63 = ((($p0$06)) + 16|0);
    $64 = +HEAPF32[$63>>2];
    $65 = ((($p1$05)) + 16|0);
    $66 = +HEAPF32[$65>>2];
    $67 = (+_nvg__minf($64,$66));
    $68 = $iw$0 * $67;
    $69 = (+_nvg__maxf(1.0099999904632568,$68));
    $70 = $40 * $69;
    $71 = $69 * $70;
    $72 = $71 < 1.0;
    if ($72) {
     $73 = HEAP8[$48>>0]|0;
     $74 = $73&255;
     $75 = $74 | 8;
     $76 = $75&255;
     HEAP8[$48>>0] = $76;
    }
    $77 = HEAP8[$48>>0]|0;
    $78 = $77&255;
    $79 = $78 & 1;
    $80 = ($79|0)==(0);
    if (!($80)) {
     $81 = $40 * $miterLimit;
     $82 = $81 * $miterLimit;
     $83 = $82 < 1.0;
     $84 = $12 | $83;
     if ($84) {
      $85 = $78 | 4;
      $86 = $85&255;
      HEAP8[$48>>0] = $86;
     }
    }
    $87 = HEAP8[$48>>0]|0;
    $88 = $87 & 12;
    $89 = ($88<<24>>24)==(0);
    if (!($89)) {
     $90 = HEAP32[$18>>2]|0;
     $91 = (($90) + 1)|0;
     HEAP32[$18>>2] = $91;
    }
    $92 = ((($p1$05)) + 32|0);
    $93 = (($j$07) + 1)|0;
    $94 = ($93|0)<($22|0);
    if ($94) {
     $p0$06$phi = $p1$05;$j$07 = $93;$nleft$04 = $nleft$1;$p1$05 = $92;$p0$06 = $p0$06$phi;
    } else {
     $$lcssa = $22;$nleft$0$lcssa = $nleft$1;
     break;
    }
   }
  } else {
   $$lcssa = $17;$nleft$0$lcssa = 0;
  }
  $95 = ($nleft$0$lcssa|0)==($$lcssa|0);
  $96 = $95&1;
  $97 = (((($8) + (($i$09*40)|0)|0)) + 36|0);
  HEAP32[$97>>2] = $96;
  $98 = (($i$09) + 1)|0;
  $99 = ($98|0)<($10|0);
  if ($99) {
   $i$09 = $98;
  } else {
   break;
  }
 }
 return;
}
function _nvg__buttCapStart($dst,$p,$dx,$dy,$w,$d,$aa) {
 $dst = $dst|0;
 $p = $p|0;
 $dx = +$dx;
 $dy = +$dy;
 $w = +$w;
 $d = +$d;
 $aa = +$aa;
 var $0 = 0.0, $1 = 0.0, $10 = 0.0, $11 = 0.0, $12 = 0.0, $13 = 0.0, $14 = 0.0, $15 = 0, $16 = 0.0, $17 = 0.0, $18 = 0.0, $19 = 0.0, $2 = 0.0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0.0, $5 = 0.0, $6 = 0.0;
 var $7 = 0.0, $8 = 0.0, $9 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = +HEAPF32[$p>>2];
 $1 = $dx * $d;
 $2 = $0 - $1;
 $3 = ((($p)) + 4|0);
 $4 = +HEAPF32[$3>>2];
 $5 = $dy * $d;
 $6 = $4 - $5;
 $7 = $dy * $w;
 $8 = $7 + $2;
 $9 = $dx * $aa;
 $10 = $8 - $9;
 $11 = $dx * $w;
 $12 = $6 - $11;
 $13 = $dy * $aa;
 $14 = $12 - $13;
 _nvg__vset($dst,$10,$14,0.0,0.0);
 $15 = ((($dst)) + 16|0);
 $16 = $2 - $7;
 $17 = $16 - $9;
 $18 = $11 + $6;
 $19 = $18 - $13;
 _nvg__vset($15,$17,$19,1.0,0.0);
 $20 = ((($dst)) + 32|0);
 _nvg__vset($20,$8,$12,0.0,1.0);
 $21 = ((($dst)) + 48|0);
 _nvg__vset($21,$16,$18,1.0,1.0);
 $22 = ((($dst)) + 64|0);
 return ($22|0);
}
function _nvg__roundCapStart($dst,$p,$dx,$dy,$w,$ncap) {
 $dst = $dst|0;
 $p = $p|0;
 $dx = +$dx;
 $dy = +$dy;
 $w = +$w;
 $ncap = $ncap|0;
 var $$0$lcssa = 0, $$02 = 0, $0 = 0.0, $1 = 0, $10 = 0.0, $11 = 0.0, $12 = 0.0, $13 = 0.0, $14 = 0.0, $15 = 0.0, $16 = 0.0, $17 = 0.0, $18 = 0.0, $19 = 0.0, $2 = 0.0, $20 = 0.0, $21 = 0.0, $22 = 0.0, $23 = 0, $24 = 0;
 var $25 = 0, $26 = 0.0, $27 = 0.0, $28 = 0.0, $29 = 0.0, $3 = 0.0, $30 = 0, $31 = 0.0, $32 = 0.0, $33 = 0, $4 = 0, $5 = 0, $6 = 0.0, $7 = 0, $8 = 0.0, $9 = 0.0, $exitcond = 0, $i$01 = 0, $scevgep = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 $0 = +HEAPF32[$p>>2];
 $1 = ((($p)) + 4|0);
 $2 = +HEAPF32[$1>>2];
 $3 = -$dx;
 $4 = ($ncap|0)>(0);
 if ($4) {
  $5 = (($ncap) + -1)|0;
  $6 = (+($5|0));
  $7 = $ncap << 1;
  $$02 = $dst;$i$01 = 0;
  while(1) {
   $8 = (+($i$01|0));
   $9 = $8 / $6;
   $10 = $9 * 3.1415927410125732;
   $11 = (+Math_cos((+$10)));
   $12 = $11 * $w;
   $13 = (+Math_sin((+$10)));
   $14 = $13 * $w;
   $15 = $12 * $dy;
   $16 = $0 - $15;
   $17 = $14 * $dx;
   $18 = $16 - $17;
   $19 = $12 * $3;
   $20 = $2 - $19;
   $21 = $14 * $dy;
   $22 = $20 - $21;
   _nvg__vset($$02,$18,$22,0.0,1.0);
   $23 = ((($$02)) + 16|0);
   _nvg__vset($23,$0,$2,0.5,1.0);
   $24 = ((($$02)) + 32|0);
   $25 = (($i$01) + 1)|0;
   $exitcond = ($25|0)==($ncap|0);
   if ($exitcond) {
    break;
   } else {
    $$02 = $24;$i$01 = $25;
   }
  }
  $scevgep = (($dst) + ($7<<4)|0);
  $$0$lcssa = $scevgep;
 } else {
  $$0$lcssa = $dst;
 }
 $26 = $dy * $w;
 $27 = $26 + $0;
 $28 = $3 * $w;
 $29 = $28 + $2;
 _nvg__vset($$0$lcssa,$27,$29,0.0,1.0);
 $30 = ((($$0$lcssa)) + 16|0);
 $31 = $0 - $26;
 $32 = $2 - $28;
 _nvg__vset($30,$31,$32,1.0,1.0);
 $33 = ((($$0$lcssa)) + 32|0);
 return ($33|0);
}
function _nvg__roundJoin($dst,$p0,$p1,$lw,$rw,$ncap) {
 $dst = $dst|0;
 $p0 = $p0|0;
 $p1 = $p1|0;
 $lw = +$lw;
 $rw = +$rw;
 $ncap = $ncap|0;
 var $$0 = 0, $$0$7 = 0, $$0$lcssa = 0, $$010 = 0, $$1 = 0, $$1$2 = 0, $$1$lcssa = 0, $$15 = 0, $$2 = 0, $0 = 0, $1 = 0.0, $10 = 0, $100 = 0.0, $101 = 0.0, $102 = 0.0, $103 = 0.0, $104 = 0.0, $105 = 0.0, $106 = 0.0, $107 = 0.0;
 var $108 = 0.0, $109 = 0.0, $11 = 0, $110 = 0.0, $111 = 0, $112 = 0.0, $113 = 0.0, $114 = 0, $115 = 0.0, $116 = 0.0, $117 = 0.0, $118 = 0.0, $119 = 0.0, $12 = 0, $120 = 0.0, $121 = 0, $122 = 0.0, $123 = 0.0, $13 = 0, $14 = 0;
 var $15 = 0, $16 = 0, $17 = 0.0, $18 = 0.0, $19 = 0.0, $2 = 0, $20 = 0.0, $21 = 0, $22 = 0.0, $23 = 0.0, $24 = 0.0, $25 = 0, $26 = 0.0, $27 = 0.0, $28 = 0.0, $29 = 0, $3 = 0.0, $30 = 0.0, $31 = 0.0, $32 = 0.0;
 var $33 = 0.0, $34 = 0.0, $35 = 0.0, $36 = 0.0, $37 = 0.0, $38 = 0, $39 = 0, $4 = 0.0, $40 = 0, $41 = 0, $42 = 0.0, $43 = 0.0, $44 = 0, $45 = 0, $46 = 0.0, $47 = 0.0, $48 = 0.0, $49 = 0.0, $5 = 0, $50 = 0.0;
 var $51 = 0.0, $52 = 0.0, $53 = 0.0, $54 = 0.0, $55 = 0.0, $56 = 0.0, $57 = 0.0, $58 = 0, $59 = 0, $6 = 0.0, $60 = 0.0, $61 = 0.0, $62 = 0, $63 = 0.0, $64 = 0.0, $65 = 0.0, $66 = 0.0, $67 = 0.0, $68 = 0.0, $69 = 0;
 var $7 = 0, $70 = 0, $71 = 0, $72 = 0.0, $73 = 0.0, $74 = 0.0, $75 = 0, $76 = 0.0, $77 = 0.0, $78 = 0.0, $79 = 0.0, $8 = 0.0, $80 = 0, $81 = 0.0, $82 = 0.0, $83 = 0.0, $84 = 0, $85 = 0.0, $86 = 0.0, $87 = 0.0;
 var $88 = 0.0, $89 = 0.0, $9 = 0.0, $90 = 0.0, $91 = 0.0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0.0, $97 = 0, $98 = 0, $99 = 0.0, $a1$0 = 0.0, $a12$0 = 0.0, $dst$pn$1$lcssa = 0, $dst$pn$1$pn = 0, $dst$pn$19 = 0, $dst$pn$19$phi = 0, $dst$pn$lcssa = 0;
 var $dst$pn4 = 0, $dst$pn4$phi = 0, $exitcond = 0, $exitcond21 = 0, $i$08 = 0, $i$13 = 0, $lx0 = 0, $lx1 = 0, $ly0 = 0, $ly1 = 0, $scevgep = 0, $scevgep18 = 0, $scevgep19 = 0, $scevgep20 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0;
 $lx0 = sp + 12|0;
 $ly0 = sp + 8|0;
 $lx1 = sp + 4|0;
 $ly1 = sp;
 $0 = ((($p0)) + 12|0);
 $1 = +HEAPF32[$0>>2];
 $2 = ((($p0)) + 8|0);
 $3 = +HEAPF32[$2>>2];
 $4 = -$3;
 $5 = ((($p1)) + 12|0);
 $6 = +HEAPF32[$5>>2];
 $7 = ((($p1)) + 8|0);
 $8 = +HEAPF32[$7>>2];
 $9 = -$8;
 $10 = ((($p1)) + 28|0);
 $11 = HEAP8[$10>>0]|0;
 $12 = $11 & 2;
 $13 = ($12<<24>>24)==(0);
 if ($13) {
  $69 = HEAP8[$10>>0]|0;
  $70 = $69&255;
  $71 = $70 & 8;
  $72 = -$rw;
  _nvg__chooseBevel($71,$p0,$p1,$72,$lx0,$ly0,$lx1,$ly1);
  $73 = (+Math_atan2((+$4),(+$1)));
  $74 = (+Math_atan2((+$9),(+$6)));
  $75 = $74 < $73;
  $76 = $74 + 6.2831854820251465;
  $a12$0 = $75 ? $76 : $74;
  $77 = +HEAPF32[$p1>>2];
  $78 = $1 * $rw;
  $79 = $78 + $77;
  $80 = ((($p1)) + 4|0);
  $81 = +HEAPF32[$80>>2];
  $82 = $rw * $4;
  $83 = $82 + $81;
  _nvg__vset($dst,$79,$83,0.0,1.0);
  $84 = ((($dst)) + 16|0);
  $85 = +HEAPF32[$lx0>>2];
  $86 = +HEAPF32[$ly0>>2];
  _nvg__vset($84,$85,$86,1.0,1.0);
  $87 = $a12$0 - $73;
  $88 = $87 / 3.1415927410125732;
  $89 = (+($ncap|0));
  $90 = $89 * $88;
  $91 = (+Math_ceil((+$90)));
  $92 = (~~(($91)));
  $93 = (_nvg__clampi($92,$ncap)|0);
  $$1$2 = ((($dst)) + 32|0);
  $94 = ($93|0)>(0);
  if ($94) {
   $95 = (($93) + -1)|0;
   $96 = (+($95|0));
   $97 = $93 << 1;
   $98 = (($97) + 2)|0;
   $scevgep = (($dst) + ($98<<4)|0);
   $$15 = $$1$2;$dst$pn4 = $dst;$i$13 = 0;
   while(1) {
    $99 = (+($i$13|0));
    $100 = $99 / $96;
    $101 = $87 * $100;
    $102 = $73 + $101;
    $103 = +HEAPF32[$p1>>2];
    $104 = (+Math_cos((+$102)));
    $105 = $104 * $lw;
    $106 = $103 + $105;
    $107 = +HEAPF32[$80>>2];
    $108 = (+Math_sin((+$102)));
    $109 = $108 * $lw;
    $110 = $107 + $109;
    _nvg__vset($$15,$106,$110,0.0,1.0);
    $111 = ((($dst$pn4)) + 48|0);
    $112 = +HEAPF32[$p1>>2];
    $113 = +HEAPF32[$80>>2];
    _nvg__vset($111,$112,$113,0.5,1.0);
    $114 = (($i$13) + 1)|0;
    $$1 = ((($$15)) + 32|0);
    $exitcond = ($114|0)==($93|0);
    if ($exitcond) {
     break;
    } else {
     $dst$pn4$phi = $$15;$$15 = $$1;$i$13 = $114;$dst$pn4 = $dst$pn4$phi;
    }
   }
   $scevgep18 = (($dst) + ($97<<4)|0);
   $$1$lcssa = $scevgep;$dst$pn$lcssa = $scevgep18;
  } else {
   $$1$lcssa = $$1$2;$dst$pn$lcssa = $dst;
  }
  $115 = +HEAPF32[$p1>>2];
  $116 = $6 * $rw;
  $117 = $116 + $115;
  $118 = +HEAPF32[$80>>2];
  $119 = $rw * $9;
  $120 = $119 + $118;
  _nvg__vset($$1$lcssa,$117,$120,0.0,1.0);
  $121 = ((($dst$pn$lcssa)) + 48|0);
  $122 = +HEAPF32[$lx1>>2];
  $123 = +HEAPF32[$ly1>>2];
  _nvg__vset($121,$122,$123,1.0,1.0);
  $dst$pn$1$pn = $dst$pn$lcssa;
  $$2 = ((($dst$pn$1$pn)) + 64|0);
  STACKTOP = sp;return ($$2|0);
 } else {
  $14 = HEAP8[$10>>0]|0;
  $15 = $14&255;
  $16 = $15 & 8;
  _nvg__chooseBevel($16,$p0,$p1,$lw,$lx0,$ly0,$lx1,$ly1);
  $17 = -$1;
  $18 = (+Math_atan2((+$3),(+$17)));
  $19 = -$6;
  $20 = (+Math_atan2((+$8),(+$19)));
  $21 = $20 > $18;
  $22 = $20 + -6.2831854820251465;
  $a1$0 = $21 ? $22 : $20;
  $23 = +HEAPF32[$lx0>>2];
  $24 = +HEAPF32[$ly0>>2];
  _nvg__vset($dst,$23,$24,0.0,1.0);
  $25 = ((($dst)) + 16|0);
  $26 = +HEAPF32[$p1>>2];
  $27 = $1 * $rw;
  $28 = $26 - $27;
  $29 = ((($p1)) + 4|0);
  $30 = +HEAPF32[$29>>2];
  $31 = $rw * $4;
  $32 = $30 - $31;
  _nvg__vset($25,$28,$32,1.0,1.0);
  $33 = $18 - $a1$0;
  $34 = $33 / 3.1415927410125732;
  $35 = (+($ncap|0));
  $36 = $35 * $34;
  $37 = (+Math_ceil((+$36)));
  $38 = (~~(($37)));
  $39 = (_nvg__clampi($38,$ncap)|0);
  $$0$7 = ((($dst)) + 32|0);
  $40 = ($39|0)>(0);
  if ($40) {
   $41 = (($39) + -1)|0;
   $42 = (+($41|0));
   $43 = $a1$0 - $18;
   $44 = $39 << 1;
   $45 = (($44) + 2)|0;
   $scevgep19 = (($dst) + ($45<<4)|0);
   $$010 = $$0$7;$dst$pn$19 = $dst;$i$08 = 0;
   while(1) {
    $46 = (+($i$08|0));
    $47 = $46 / $42;
    $48 = $43 * $47;
    $49 = $18 + $48;
    $50 = +HEAPF32[$p1>>2];
    $51 = (+Math_cos((+$49)));
    $52 = $51 * $rw;
    $53 = $50 + $52;
    $54 = +HEAPF32[$29>>2];
    $55 = (+Math_sin((+$49)));
    $56 = $55 * $rw;
    $57 = $54 + $56;
    _nvg__vset($$010,$50,$54,0.5,1.0);
    $58 = ((($dst$pn$19)) + 48|0);
    _nvg__vset($58,$53,$57,1.0,1.0);
    $59 = (($i$08) + 1)|0;
    $$0 = ((($$010)) + 32|0);
    $exitcond21 = ($59|0)==($39|0);
    if ($exitcond21) {
     break;
    } else {
     $dst$pn$19$phi = $$010;$$010 = $$0;$i$08 = $59;$dst$pn$19 = $dst$pn$19$phi;
    }
   }
   $scevgep20 = (($dst) + ($44<<4)|0);
   $$0$lcssa = $scevgep19;$dst$pn$1$lcssa = $scevgep20;
  } else {
   $$0$lcssa = $$0$7;$dst$pn$1$lcssa = $dst;
  }
  $60 = +HEAPF32[$lx1>>2];
  $61 = +HEAPF32[$ly1>>2];
  _nvg__vset($$0$lcssa,$60,$61,0.0,1.0);
  $62 = ((($dst$pn$1$lcssa)) + 48|0);
  $63 = +HEAPF32[$p1>>2];
  $64 = $6 * $rw;
  $65 = $63 - $64;
  $66 = +HEAPF32[$29>>2];
  $67 = $rw * $9;
  $68 = $66 - $67;
  _nvg__vset($62,$65,$68,1.0,1.0);
  $dst$pn$1$pn = $dst$pn$1$lcssa;
  $$2 = ((($dst$pn$1$pn)) + 64|0);
  STACKTOP = sp;return ($$2|0);
 }
 return (0)|0;
}
function _nvg__bevelJoin($dst,$p0,$p1,$lw,$rw,$lu) {
 $dst = $dst|0;
 $p0 = $p0|0;
 $p1 = $p1|0;
 $lw = +$lw;
 $rw = +$rw;
 $lu = +$lu;
 var $$0 = 0, $$0$pn = 0, $$1 = 0, $$2 = 0, $0 = 0, $1 = 0.0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0.0, $105 = 0.0, $106 = 0.0, $107 = 0.0, $108 = 0, $109 = 0.0, $11 = 0, $110 = 0.0, $111 = 0;
 var $112 = 0.0, $113 = 0.0, $114 = 0.0, $115 = 0.0, $116 = 0.0, $117 = 0.0, $118 = 0, $119 = 0.0, $12 = 0, $120 = 0.0, $121 = 0, $122 = 0, $123 = 0.0, $124 = 0.0, $125 = 0.0, $126 = 0.0, $127 = 0, $128 = 0.0, $129 = 0.0, $13 = 0;
 var $130 = 0.0, $131 = 0.0, $132 = 0.0, $133 = 0.0, $134 = 0.0, $135 = 0, $136 = 0.0, $137 = 0.0, $138 = 0, $139 = 0.0, $14 = 0, $140 = 0.0, $141 = 0, $142 = 0, $143 = 0.0, $144 = 0.0, $145 = 0.0, $146 = 0.0, $147 = 0.0, $148 = 0.0;
 var $149 = 0, $15 = 0, $150 = 0.0, $151 = 0.0, $152 = 0, $153 = 0.0, $154 = 0.0, $155 = 0.0, $156 = 0.0, $157 = 0.0, $158 = 0.0, $159 = 0, $16 = 0.0, $160 = 0.0, $161 = 0.0, $17 = 0.0, $18 = 0, $19 = 0.0, $2 = 0, $20 = 0.0;
 var $21 = 0.0, $22 = 0, $23 = 0.0, $24 = 0.0, $25 = 0.0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0.0, $30 = 0.0, $31 = 0.0, $32 = 0, $33 = 0.0, $34 = 0.0, $35 = 0.0, $36 = 0.0, $37 = 0, $38 = 0.0, $39 = 0.0;
 var $4 = 0.0, $40 = 0, $41 = 0.0, $42 = 0.0, $43 = 0.0, $44 = 0.0, $45 = 0.0, $46 = 0.0, $47 = 0, $48 = 0.0, $49 = 0, $5 = 0, $50 = 0.0, $51 = 0.0, $52 = 0.0, $53 = 0.0, $54 = 0, $55 = 0.0, $56 = 0.0, $57 = 0.0;
 var $58 = 0.0, $59 = 0.0, $6 = 0.0, $60 = 0, $61 = 0.0, $62 = 0.0, $63 = 0.0, $64 = 0.0, $65 = 0, $66 = 0.0, $67 = 0.0, $68 = 0, $69 = 0, $7 = 0, $70 = 0.0, $71 = 0.0, $72 = 0, $73 = 0.0, $74 = 0.0, $75 = 0.0;
 var $76 = 0.0, $77 = 0.0, $78 = 0.0, $79 = 0, $8 = 0.0, $80 = 0.0, $81 = 0.0, $82 = 0, $83 = 0.0, $84 = 0.0, $85 = 0.0, $86 = 0.0, $87 = 0.0, $88 = 0.0, $89 = 0.0, $9 = 0.0, $90 = 0.0, $91 = 0.0, $92 = 0.0, $93 = 0;
 var $94 = 0.0, $95 = 0.0, $96 = 0.0, $97 = 0, $98 = 0.0, $99 = 0.0, $lx0 = 0, $lx1 = 0, $ly0 = 0, $ly1 = 0, $rx0 = 0, $rx1 = 0, $ry0 = 0, $ry1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0;
 $rx0 = sp + 28|0;
 $ry0 = sp + 24|0;
 $rx1 = sp + 20|0;
 $ry1 = sp + 16|0;
 $lx0 = sp + 12|0;
 $ly0 = sp + 8|0;
 $lx1 = sp + 4|0;
 $ly1 = sp;
 $0 = ((($p0)) + 12|0);
 $1 = +HEAPF32[$0>>2];
 $2 = ((($p0)) + 8|0);
 $3 = +HEAPF32[$2>>2];
 $4 = -$3;
 $5 = ((($p1)) + 12|0);
 $6 = +HEAPF32[$5>>2];
 $7 = ((($p1)) + 8|0);
 $8 = +HEAPF32[$7>>2];
 $9 = -$8;
 $10 = ((($p1)) + 28|0);
 $11 = HEAP8[$10>>0]|0;
 $12 = $11&255;
 $13 = $12 & 2;
 $14 = ($13|0)==(0);
 $15 = $12 & 8;
 if ($14) {
  $89 = -$rw;
  _nvg__chooseBevel($15,$p0,$p1,$89,$rx0,$ry0,$rx1,$ry1);
  $90 = +HEAPF32[$p1>>2];
  $91 = $1 * $lw;
  $92 = $91 + $90;
  $93 = ((($p1)) + 4|0);
  $94 = +HEAPF32[$93>>2];
  $95 = $lw * $4;
  $96 = $95 + $94;
  _nvg__vset($dst,$92,$96,$lu,1.0);
  $97 = ((($dst)) + 16|0);
  $98 = +HEAPF32[$rx0>>2];
  $99 = +HEAPF32[$ry0>>2];
  _nvg__vset($97,$98,$99,1.0,1.0);
  $100 = ((($dst)) + 32|0);
  $101 = HEAP8[$10>>0]|0;
  $102 = $101 & 4;
  $103 = ($102<<24>>24)==(0);
  $104 = +HEAPF32[$p1>>2];
  if ($103) {
   $122 = ((($p1)) + 20|0);
   $123 = +HEAPF32[$122>>2];
   $124 = $123 * $lw;
   $125 = $104 + $124;
   HEAPF32[$lx0>>2] = $125;
   $126 = +HEAPF32[$93>>2];
   $127 = ((($p1)) + 24|0);
   $128 = +HEAPF32[$127>>2];
   $129 = $128 * $lw;
   $130 = $126 + $129;
   HEAPF32[$ly0>>2] = $130;
   $131 = +HEAPF32[$p1>>2];
   $132 = $91 + $131;
   $133 = +HEAPF32[$93>>2];
   $134 = $95 + $133;
   _nvg__vset($100,$132,$134,$lu,1.0);
   $135 = ((($dst)) + 48|0);
   $136 = +HEAPF32[$p1>>2];
   $137 = +HEAPF32[$93>>2];
   _nvg__vset($135,$136,$137,0.5,1.0);
   $138 = ((($dst)) + 64|0);
   $139 = +HEAPF32[$lx0>>2];
   $140 = +HEAPF32[$ly0>>2];
   _nvg__vset($138,$139,$140,$lu,1.0);
   $141 = ((($dst)) + 80|0);
   _nvg__vset($141,$139,$140,$lu,1.0);
   $142 = ((($dst)) + 96|0);
   $143 = +HEAPF32[$p1>>2];
   $144 = $6 * $lw;
   $145 = $144 + $143;
   $146 = +HEAPF32[$93>>2];
   $147 = $lw * $9;
   $148 = $147 + $146;
   _nvg__vset($142,$145,$148,$lu,1.0);
   $149 = ((($dst)) + 112|0);
   $150 = +HEAPF32[$p1>>2];
   $151 = +HEAPF32[$93>>2];
   _nvg__vset($149,$150,$151,0.5,1.0);
   $152 = ((($dst)) + 128|0);
   $$1 = $152;
  } else {
   $105 = $91 + $104;
   $106 = +HEAPF32[$93>>2];
   $107 = $95 + $106;
   _nvg__vset($100,$105,$107,$lu,1.0);
   $108 = ((($dst)) + 48|0);
   $109 = +HEAPF32[$rx0>>2];
   $110 = +HEAPF32[$ry0>>2];
   _nvg__vset($108,$109,$110,1.0,1.0);
   $111 = ((($dst)) + 64|0);
   $112 = +HEAPF32[$p1>>2];
   $113 = $6 * $lw;
   $114 = $113 + $112;
   $115 = +HEAPF32[$93>>2];
   $116 = $lw * $9;
   $117 = $116 + $115;
   _nvg__vset($111,$114,$117,$lu,1.0);
   $118 = ((($dst)) + 80|0);
   $119 = +HEAPF32[$rx1>>2];
   $120 = +HEAPF32[$ry1>>2];
   _nvg__vset($118,$119,$120,1.0,1.0);
   $121 = ((($dst)) + 96|0);
   $$1 = $121;
  }
  $153 = +HEAPF32[$p1>>2];
  $154 = $6 * $lw;
  $155 = $154 + $153;
  $156 = +HEAPF32[$93>>2];
  $157 = $lw * $9;
  $158 = $157 + $156;
  _nvg__vset($$1,$155,$158,$lu,1.0);
  $159 = ((($$1)) + 16|0);
  $160 = +HEAPF32[$rx1>>2];
  $161 = +HEAPF32[$ry1>>2];
  _nvg__vset($159,$160,$161,1.0,1.0);
  $$0$pn = $$1;
  $$2 = ((($$0$pn)) + 32|0);
  STACKTOP = sp;return ($$2|0);
 } else {
  _nvg__chooseBevel($15,$p0,$p1,$lw,$lx0,$ly0,$lx1,$ly1);
  $16 = +HEAPF32[$lx0>>2];
  $17 = +HEAPF32[$ly0>>2];
  _nvg__vset($dst,$16,$17,$lu,1.0);
  $18 = ((($dst)) + 16|0);
  $19 = +HEAPF32[$p1>>2];
  $20 = $1 * $rw;
  $21 = $19 - $20;
  $22 = ((($p1)) + 4|0);
  $23 = +HEAPF32[$22>>2];
  $24 = $rw * $4;
  $25 = $23 - $24;
  _nvg__vset($18,$21,$25,1.0,1.0);
  $26 = ((($dst)) + 32|0);
  $27 = HEAP8[$10>>0]|0;
  $28 = $27 & 4;
  $29 = ($28<<24>>24)==(0);
  if ($29) {
   $48 = +HEAPF32[$p1>>2];
   $49 = ((($p1)) + 20|0);
   $50 = +HEAPF32[$49>>2];
   $51 = $50 * $rw;
   $52 = $48 - $51;
   HEAPF32[$rx0>>2] = $52;
   $53 = +HEAPF32[$22>>2];
   $54 = ((($p1)) + 24|0);
   $55 = +HEAPF32[$54>>2];
   $56 = $55 * $rw;
   $57 = $53 - $56;
   HEAPF32[$ry0>>2] = $57;
   $58 = +HEAPF32[$p1>>2];
   $59 = +HEAPF32[$22>>2];
   _nvg__vset($26,$58,$59,0.5,1.0);
   $60 = ((($dst)) + 48|0);
   $61 = +HEAPF32[$p1>>2];
   $62 = $61 - $20;
   $63 = +HEAPF32[$22>>2];
   $64 = $63 - $24;
   _nvg__vset($60,$62,$64,1.0,1.0);
   $65 = ((($dst)) + 64|0);
   $66 = +HEAPF32[$rx0>>2];
   $67 = +HEAPF32[$ry0>>2];
   _nvg__vset($65,$66,$67,1.0,1.0);
   $68 = ((($dst)) + 80|0);
   _nvg__vset($68,$66,$67,1.0,1.0);
   $69 = ((($dst)) + 96|0);
   $70 = +HEAPF32[$p1>>2];
   $71 = +HEAPF32[$22>>2];
   _nvg__vset($69,$70,$71,0.5,1.0);
   $72 = ((($dst)) + 112|0);
   $73 = +HEAPF32[$p1>>2];
   $74 = $6 * $rw;
   $75 = $73 - $74;
   $76 = +HEAPF32[$22>>2];
   $77 = $rw * $9;
   $78 = $76 - $77;
   _nvg__vset($72,$75,$78,1.0,1.0);
   $79 = ((($dst)) + 128|0);
   $$0 = $79;
  } else {
   $30 = +HEAPF32[$lx0>>2];
   $31 = +HEAPF32[$ly0>>2];
   _nvg__vset($26,$30,$31,$lu,1.0);
   $32 = ((($dst)) + 48|0);
   $33 = +HEAPF32[$p1>>2];
   $34 = $33 - $20;
   $35 = +HEAPF32[$22>>2];
   $36 = $35 - $24;
   _nvg__vset($32,$34,$36,1.0,1.0);
   $37 = ((($dst)) + 64|0);
   $38 = +HEAPF32[$lx1>>2];
   $39 = +HEAPF32[$ly1>>2];
   _nvg__vset($37,$38,$39,$lu,1.0);
   $40 = ((($dst)) + 80|0);
   $41 = +HEAPF32[$p1>>2];
   $42 = $6 * $rw;
   $43 = $41 - $42;
   $44 = +HEAPF32[$22>>2];
   $45 = $rw * $9;
   $46 = $44 - $45;
   _nvg__vset($40,$43,$46,1.0,1.0);
   $47 = ((($dst)) + 96|0);
   $$0 = $47;
  }
  $80 = +HEAPF32[$lx1>>2];
  $81 = +HEAPF32[$ly1>>2];
  _nvg__vset($$0,$80,$81,$lu,1.0);
  $82 = ((($$0)) + 16|0);
  $83 = +HEAPF32[$p1>>2];
  $84 = $6 * $rw;
  $85 = $83 - $84;
  $86 = +HEAPF32[$22>>2];
  $87 = $rw * $9;
  $88 = $86 - $87;
  _nvg__vset($82,$85,$88,1.0,1.0);
  $$0$pn = $$0;
  $$2 = ((($$0$pn)) + 32|0);
  STACKTOP = sp;return ($$2|0);
 }
 return (0)|0;
}
function _nvg__buttCapEnd($dst,$p,$dx,$dy,$w,$d,$aa) {
 $dst = $dst|0;
 $p = $p|0;
 $dx = +$dx;
 $dy = +$dy;
 $w = +$w;
 $d = +$d;
 $aa = +$aa;
 var $0 = 0.0, $1 = 0.0, $10 = 0.0, $11 = 0, $12 = 0.0, $13 = 0.0, $14 = 0, $15 = 0.0, $16 = 0.0, $17 = 0.0, $18 = 0.0, $19 = 0, $2 = 0.0, $20 = 0.0, $21 = 0.0, $22 = 0, $3 = 0, $4 = 0.0, $5 = 0.0, $6 = 0.0;
 var $7 = 0.0, $8 = 0.0, $9 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = +HEAPF32[$p>>2];
 $1 = $dx * $d;
 $2 = $1 + $0;
 $3 = ((($p)) + 4|0);
 $4 = +HEAPF32[$3>>2];
 $5 = $dy * $d;
 $6 = $5 + $4;
 $7 = $dy * $w;
 $8 = $7 + $2;
 $9 = $dx * $w;
 $10 = $6 - $9;
 _nvg__vset($dst,$8,$10,0.0,1.0);
 $11 = ((($dst)) + 16|0);
 $12 = $2 - $7;
 $13 = $9 + $6;
 _nvg__vset($11,$12,$13,1.0,1.0);
 $14 = ((($dst)) + 32|0);
 $15 = $dx * $aa;
 $16 = $15 + $8;
 $17 = $dy * $aa;
 $18 = $17 + $10;
 _nvg__vset($14,$16,$18,0.0,0.0);
 $19 = ((($dst)) + 48|0);
 $20 = $15 + $12;
 $21 = $17 + $13;
 _nvg__vset($19,$20,$21,1.0,0.0);
 $22 = ((($dst)) + 64|0);
 return ($22|0);
}
function _nvg__roundCapEnd($dst,$p,$dx,$dy,$w,$ncap) {
 $dst = $dst|0;
 $p = $p|0;
 $dx = +$dx;
 $dy = +$dy;
 $w = +$w;
 $ncap = $ncap|0;
 var $$0 = 0, $$0$1 = 0, $$0$lcssa = 0, $$04 = 0, $0 = 0.0, $1 = 0, $10 = 0.0, $11 = 0, $12 = 0, $13 = 0.0, $14 = 0, $15 = 0, $16 = 0.0, $17 = 0.0, $18 = 0.0, $19 = 0.0, $2 = 0.0, $20 = 0.0, $21 = 0.0, $22 = 0.0;
 var $23 = 0, $24 = 0.0, $25 = 0.0, $26 = 0.0, $27 = 0.0, $28 = 0.0, $29 = 0.0, $3 = 0.0, $30 = 0.0, $31 = 0.0, $32 = 0, $4 = 0.0, $5 = 0.0, $6 = 0.0, $7 = 0.0, $8 = 0, $9 = 0.0, $dst$pn3 = 0, $dst$pn3$phi = 0, $exitcond = 0;
 var $i$02 = 0, $scevgep = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = +HEAPF32[$p>>2];
 $1 = ((($p)) + 4|0);
 $2 = +HEAPF32[$1>>2];
 $3 = -$dx;
 $4 = $dy * $w;
 $5 = $4 + $0;
 $6 = $3 * $w;
 $7 = $6 + $2;
 _nvg__vset($dst,$5,$7,0.0,1.0);
 $8 = ((($dst)) + 16|0);
 $9 = $0 - $4;
 $10 = $2 - $6;
 _nvg__vset($8,$9,$10,1.0,1.0);
 $$0$1 = ((($dst)) + 32|0);
 $11 = ($ncap|0)>(0);
 if (!($11)) {
  $$0$lcssa = $$0$1;
  return ($$0$lcssa|0);
 }
 $12 = (($ncap) + -1)|0;
 $13 = (+($12|0));
 $14 = $ncap << 1;
 $15 = (($14) + 2)|0;
 $$04 = $$0$1;$dst$pn3 = $dst;$i$02 = 0;
 while(1) {
  $16 = (+($i$02|0));
  $17 = $16 / $13;
  $18 = $17 * 3.1415927410125732;
  $19 = (+Math_cos((+$18)));
  $20 = $19 * $w;
  $21 = (+Math_sin((+$18)));
  $22 = $21 * $w;
  _nvg__vset($$04,$0,$2,0.5,1.0);
  $23 = ((($dst$pn3)) + 48|0);
  $24 = $20 * $dy;
  $25 = $0 - $24;
  $26 = $22 * $dx;
  $27 = $25 + $26;
  $28 = $20 * $3;
  $29 = $2 - $28;
  $30 = $22 * $dy;
  $31 = $29 + $30;
  _nvg__vset($23,$27,$31,0.0,1.0);
  $32 = (($i$02) + 1)|0;
  $$0 = ((($$04)) + 32|0);
  $exitcond = ($32|0)==($ncap|0);
  if ($exitcond) {
   break;
  } else {
   $dst$pn3$phi = $$04;$$04 = $$0;$i$02 = $32;$dst$pn3 = $dst$pn3$phi;
  }
 }
 $scevgep = (($dst) + ($15<<4)|0);
 $$0$lcssa = $scevgep;
 return ($$0$lcssa|0);
}
function _nvg__chooseBevel($bevel,$p0,$p1,$w,$x0,$y0,$x1,$y1) {
 $bevel = $bevel|0;
 $p0 = $p0|0;
 $p1 = $p1|0;
 $w = +$w;
 $x0 = $x0|0;
 $y0 = $y0|0;
 $x1 = $x1|0;
 $y1 = $y1|0;
 var $0 = 0, $1 = 0.0, $10 = 0.0, $11 = 0.0, $12 = 0.0, $13 = 0, $14 = 0.0, $15 = 0.0, $16 = 0.0, $17 = 0.0, $18 = 0, $19 = 0.0, $2 = 0, $20 = 0.0, $21 = 0.0, $22 = 0, $23 = 0.0, $24 = 0.0, $25 = 0.0, $26 = 0;
 var $27 = 0.0, $28 = 0, $29 = 0.0, $3 = 0.0, $30 = 0.0, $31 = 0.0, $32 = 0.0, $33 = 0.0, $34 = 0.0, $35 = 0.0, $36 = 0.0, $37 = 0.0, $38 = 0.0, $39 = 0.0, $4 = 0.0, $5 = 0.0, $6 = 0, $7 = 0.0, $8 = 0, $9 = 0.0;
 var $storemerge = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($bevel|0)==(0);
 $1 = +HEAPF32[$p1>>2];
 if ($0) {
  $22 = ((($p1)) + 20|0);
  $23 = +HEAPF32[$22>>2];
  $24 = $23 * $w;
  $25 = $1 + $24;
  HEAPF32[$x0>>2] = $25;
  $26 = ((($p1)) + 4|0);
  $27 = +HEAPF32[$26>>2];
  $28 = ((($p1)) + 24|0);
  $29 = +HEAPF32[$28>>2];
  $30 = $29 * $w;
  $31 = $27 + $30;
  HEAPF32[$y0>>2] = $31;
  $32 = +HEAPF32[$p1>>2];
  $33 = +HEAPF32[$22>>2];
  $34 = $33 * $w;
  $35 = $32 + $34;
  HEAPF32[$x1>>2] = $35;
  $36 = +HEAPF32[$26>>2];
  $37 = +HEAPF32[$28>>2];
  $38 = $37 * $w;
  $39 = $36 + $38;
  $storemerge = $39;
  HEAPF32[$y1>>2] = $storemerge;
  return;
 } else {
  $2 = ((($p0)) + 12|0);
  $3 = +HEAPF32[$2>>2];
  $4 = $3 * $w;
  $5 = $1 + $4;
  HEAPF32[$x0>>2] = $5;
  $6 = ((($p1)) + 4|0);
  $7 = +HEAPF32[$6>>2];
  $8 = ((($p0)) + 8|0);
  $9 = +HEAPF32[$8>>2];
  $10 = $9 * $w;
  $11 = $7 - $10;
  HEAPF32[$y0>>2] = $11;
  $12 = +HEAPF32[$p1>>2];
  $13 = ((($p1)) + 12|0);
  $14 = +HEAPF32[$13>>2];
  $15 = $14 * $w;
  $16 = $12 + $15;
  HEAPF32[$x1>>2] = $16;
  $17 = +HEAPF32[$6>>2];
  $18 = ((($p1)) + 8|0);
  $19 = +HEAPF32[$18>>2];
  $20 = $19 * $w;
  $21 = $17 - $20;
  $storemerge = $21;
  HEAPF32[$y1>>2] = $storemerge;
  return;
 }
}
function _nvg__clampi($a,$mx) {
 $a = $a|0;
 $mx = $mx|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($a|0)<(2);
 $1 = ($a|0)>($mx|0);
 $2 = $1 ? $mx : $a;
 $3 = $0 ? 2 : $2;
 return ($3|0);
}
function _nvg__addPath($ctx) {
 $ctx = $ctx|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, dest = 0, label = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 $0 = ((($ctx)) + 8144|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ((($1)) + 16|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = ((($1)) + 20|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = ($3|0)<($5|0);
 do {
  if (!($6)) {
   $7 = (($3) + 1)|0;
   $8 = (($5|0) / 2)&-1;
   $9 = (($7) + ($8))|0;
   $10 = ((($1)) + 12|0);
   $11 = HEAP32[$10>>2]|0;
   $12 = ($9*40)|0;
   $13 = (_realloc($11,$12)|0);
   $14 = ($13|0)==(0|0);
   if ($14) {
    return;
   } else {
    $15 = HEAP32[$0>>2]|0;
    $16 = ((($15)) + 12|0);
    HEAP32[$16>>2] = $13;
    $17 = HEAP32[$0>>2]|0;
    $18 = ((($17)) + 20|0);
    HEAP32[$18>>2] = $9;
    break;
   }
  }
 } while(0);
 $19 = HEAP32[$0>>2]|0;
 $20 = ((($19)) + 16|0);
 $21 = HEAP32[$20>>2]|0;
 $22 = ((($19)) + 12|0);
 $23 = HEAP32[$22>>2]|0;
 $24 = (($23) + (($21*40)|0)|0);
 dest=$24; stop=dest+40|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
 $25 = HEAP32[$0>>2]|0;
 $26 = ((($25)) + 4|0);
 $27 = HEAP32[$26>>2]|0;
 HEAP32[$24>>2] = $27;
 $28 = (((($23) + (($21*40)|0)|0)) + 32|0);
 HEAP32[$28>>2] = 1;
 $29 = HEAP32[$0>>2]|0;
 $30 = ((($29)) + 16|0);
 $31 = HEAP32[$30>>2]|0;
 $32 = (($31) + 1)|0;
 HEAP32[$30>>2] = $32;
 return;
}
function _nvg__addPoint($ctx,$x,$y,$flags) {
 $ctx = $ctx|0;
 $x = +$x;
 $y = +$y;
 $flags = $flags|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0.0, $12 = 0, $13 = 0.0, $14 = 0, $15 = 0.0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0;
 var $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (_nvg__lastPath($ctx)|0);
 $1 = ($0|0)==(0|0);
 if ($1) {
  return;
 }
 $2 = ((($0)) + 4|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = ($3|0)>(0);
 if ($4) {
  $5 = ((($ctx)) + 8144|0);
  $6 = HEAP32[$5>>2]|0;
  $7 = ((($6)) + 4|0);
  $8 = HEAP32[$7>>2]|0;
  $9 = ($8|0)>(0);
  if ($9) {
   $10 = (_nvg__lastPoint($ctx)|0);
   $11 = +HEAPF32[$10>>2];
   $12 = ((($10)) + 4|0);
   $13 = +HEAPF32[$12>>2];
   $14 = ((($ctx)) + 8152|0);
   $15 = +HEAPF32[$14>>2];
   $16 = (_nvg__ptEquals($11,$13,$x,$y,$15)|0);
   $17 = ($16|0)==(0);
   if (!($17)) {
    $18 = ((($10)) + 28|0);
    $19 = HEAP8[$18>>0]|0;
    $20 = $19&255;
    $21 = $20 | $flags;
    $22 = $21&255;
    HEAP8[$18>>0] = $22;
    return;
   }
  }
 }
 $23 = ((($ctx)) + 8144|0);
 $24 = HEAP32[$23>>2]|0;
 $25 = ((($24)) + 4|0);
 $26 = HEAP32[$25>>2]|0;
 $27 = ((($24)) + 8|0);
 $28 = HEAP32[$27>>2]|0;
 $29 = ($26|0)<($28|0);
 do {
  if (!($29)) {
   $30 = (($26) + 1)|0;
   $31 = (($28|0) / 2)&-1;
   $32 = (($30) + ($31))|0;
   $33 = HEAP32[$24>>2]|0;
   $34 = $32 << 5;
   $35 = (_realloc($33,$34)|0);
   $36 = ($35|0)==(0|0);
   if ($36) {
    return;
   } else {
    $37 = HEAP32[$23>>2]|0;
    HEAP32[$37>>2] = $35;
    $38 = HEAP32[$23>>2]|0;
    $39 = ((($38)) + 8|0);
    HEAP32[$39>>2] = $32;
    break;
   }
  }
 } while(0);
 $40 = HEAP32[$23>>2]|0;
 $41 = ((($40)) + 4|0);
 $42 = HEAP32[$41>>2]|0;
 $43 = HEAP32[$40>>2]|0;
 $44 = (($43) + ($42<<5)|0);
 ;HEAP32[$44>>2]=0|0;HEAP32[$44+4>>2]=0|0;HEAP32[$44+8>>2]=0|0;HEAP32[$44+12>>2]=0|0;HEAP32[$44+16>>2]=0|0;HEAP32[$44+20>>2]=0|0;HEAP32[$44+24>>2]=0|0;HEAP32[$44+28>>2]=0|0;
 HEAPF32[$44>>2] = $x;
 $45 = (((($43) + ($42<<5)|0)) + 4|0);
 HEAPF32[$45>>2] = $y;
 $46 = $flags&255;
 $47 = (((($43) + ($42<<5)|0)) + 28|0);
 HEAP8[$47>>0] = $46;
 $48 = HEAP32[$23>>2]|0;
 $49 = ((($48)) + 4|0);
 $50 = HEAP32[$49>>2]|0;
 $51 = (($50) + 1)|0;
 HEAP32[$49>>2] = $51;
 $52 = HEAP32[$2>>2]|0;
 $53 = (($52) + 1)|0;
 HEAP32[$2>>2] = $53;
 return;
}
function _nvg__lastPoint($ctx) {
 $ctx = $ctx|0;
 var $$0 = 0, $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($ctx)) + 8144|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ((($1)) + 4|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = ($3|0)>(0);
 if (!($4)) {
  $$0 = 0;
  return ($$0|0);
 }
 $5 = (($3) + -1)|0;
 $6 = HEAP32[$1>>2]|0;
 $7 = (($6) + ($5<<5)|0);
 $$0 = $7;
 return ($$0|0);
}
function _nvg__tesselateBezier($ctx,$x1,$y1,$x2,$y2,$x3,$y3,$x4,$y4,$level,$type) {
 $ctx = $ctx|0;
 $x1 = +$x1;
 $y1 = +$y1;
 $x2 = +$x2;
 $y2 = +$y2;
 $x3 = +$x3;
 $y3 = +$y3;
 $x4 = +$x4;
 $y4 = +$y4;
 $level = $level|0;
 $type = $type|0;
 var $0 = 0, $1 = 0, $10 = 0.0, $11 = 0.0, $12 = 0.0, $13 = 0.0, $14 = 0.0, $15 = 0.0, $16 = 0.0, $17 = 0.0, $18 = 0.0, $19 = 0.0, $2 = 0.0, $20 = 0.0, $21 = 0.0, $22 = 0.0, $23 = 0.0, $24 = 0.0, $25 = 0.0, $26 = 0.0;
 var $27 = 0.0, $28 = 0.0, $29 = 0.0, $3 = 0.0, $30 = 0.0, $31 = 0.0, $32 = 0.0, $33 = 0.0, $34 = 0.0, $35 = 0.0, $36 = 0.0, $37 = 0.0, $38 = 0.0, $39 = 0, $4 = 0.0, $40 = 0.0, $41 = 0.0, $42 = 0.0, $43 = 0.0, $44 = 0.0;
 var $45 = 0.0, $46 = 0.0, $47 = 0.0, $48 = 0, $49 = 0, $5 = 0.0, $6 = 0.0, $7 = 0.0, $8 = 0.0, $9 = 0.0, $level$tr7 = 0, $x1$tr1 = 0.0, $x2$tr3 = 0.0, $x3$tr5 = 0.0, $y1$tr2 = 0.0, $y2$tr4 = 0.0, $y3$tr6 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($level|0)>(10);
 if ($0) {
  return;
 }
 $1 = ((($ctx)) + 8148|0);
 $level$tr7 = $level;$x1$tr1 = $x1;$x2$tr3 = $x2;$x3$tr5 = $x3;$y1$tr2 = $y1;$y2$tr4 = $y2;$y3$tr6 = $y3;
 while(1) {
  $2 = $x1$tr1 + $x2$tr3;
  $3 = $2 * 0.5;
  $4 = $y1$tr2 + $y2$tr4;
  $5 = $4 * 0.5;
  $6 = $x2$tr3 + $x3$tr5;
  $7 = $6 * 0.5;
  $8 = $y2$tr4 + $y3$tr6;
  $9 = $8 * 0.5;
  $10 = $x3$tr5 + $x4;
  $11 = $10 * 0.5;
  $12 = $y3$tr6 + $y4;
  $13 = $12 * 0.5;
  $14 = $3 + $7;
  $15 = $14 * 0.5;
  $16 = $5 + $9;
  $17 = $16 * 0.5;
  $18 = $x4 - $x1$tr1;
  $19 = $y4 - $y1$tr2;
  $20 = $x2$tr3 - $x4;
  $21 = $19 * $20;
  $22 = $y2$tr4 - $y4;
  $23 = $18 * $22;
  $24 = $21 - $23;
  $25 = (+_nvg__absf($24));
  $26 = $x3$tr5 - $x4;
  $27 = $19 * $26;
  $28 = $y3$tr6 - $y4;
  $29 = $18 * $28;
  $30 = $27 - $29;
  $31 = (+_nvg__absf($30));
  $32 = $25 + $31;
  $33 = $32 * $32;
  $34 = +HEAPF32[$1>>2];
  $35 = $18 * $18;
  $36 = $19 * $19;
  $37 = $35 + $36;
  $38 = $37 * $34;
  $39 = $33 < $38;
  if ($39) {
   break;
  }
  $40 = $7 + $11;
  $41 = $40 * 0.5;
  $42 = $9 + $13;
  $43 = $42 * 0.5;
  $44 = $15 + $41;
  $45 = $44 * 0.5;
  $46 = $17 + $43;
  $47 = $46 * 0.5;
  $48 = (($level$tr7) + 1)|0;
  _nvg__tesselateBezier($ctx,$x1$tr1,$y1$tr2,$3,$5,$15,$17,$45,$47,$48,0);
  $49 = ($level$tr7|0)>(9);
  if ($49) {
   label = 6;
   break;
  } else {
   $level$tr7 = $48;$x1$tr1 = $45;$x2$tr3 = $41;$x3$tr5 = $11;$y1$tr2 = $47;$y2$tr4 = $43;$y3$tr6 = $13;
  }
 }
 if ((label|0) == 6) {
  return;
 }
 _nvg__addPoint($ctx,$x4,$y4,$type);
 return;
}
function _nvg__closePath($ctx) {
 $ctx = $ctx|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (_nvg__lastPath($ctx)|0);
 $1 = ($0|0)==(0|0);
 if ($1) {
  return;
 }
 $2 = ((($0)) + 8|0);
 HEAP8[$2>>0] = 1;
 return;
}
function _nvg__pathWinding($ctx,$winding) {
 $ctx = $ctx|0;
 $winding = $winding|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (_nvg__lastPath($ctx)|0);
 $1 = ($0|0)==(0|0);
 if ($1) {
  return;
 }
 $2 = ((($0)) + 32|0);
 HEAP32[$2>>2] = $winding;
 return;
}
function _nvg__polyArea($pts,$npts) {
 $pts = $pts|0;
 $npts = $npts|0;
 var $$lcssa = 0.0, $0 = 0, $1 = 0.0, $10 = 0.0, $11 = 0, $12 = 0.0, $13 = 0.0, $14 = 0.0, $15 = 0, $2 = 0, $3 = 0.0, $4 = 0, $5 = 0, $6 = 0.0, $7 = 0, $8 = 0.0, $9 = 0, $area$0$lcssa = 0.0, $area$01 = 0.0, $exitcond = 0;
 var $i$02 = 0, $phitmp = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($npts|0)>(2);
 if (!($0)) {
  $area$0$lcssa = 0.0;
  return (+$area$0$lcssa);
 }
 $1 = +HEAPF32[$pts>>2];
 $2 = ((($pts)) + 4|0);
 $3 = +HEAPF32[$2>>2];
 $area$01 = 0.0;$i$02 = 2;
 while(1) {
  $4 = (($i$02) + -1)|0;
  $5 = (($pts) + ($4<<5)|0);
  $6 = +HEAPF32[$5>>2];
  $7 = (((($pts) + ($4<<5)|0)) + 4|0);
  $8 = +HEAPF32[$7>>2];
  $9 = (($pts) + ($i$02<<5)|0);
  $10 = +HEAPF32[$9>>2];
  $11 = (((($pts) + ($i$02<<5)|0)) + 4|0);
  $12 = +HEAPF32[$11>>2];
  $13 = (+_nvg__triarea2($1,$3,$6,$8,$10,$12));
  $14 = $area$01 + $13;
  $15 = (($i$02) + 1)|0;
  $exitcond = ($15|0)==($npts|0);
  if ($exitcond) {
   $$lcssa = $14;
   break;
  } else {
   $area$01 = $14;$i$02 = $15;
  }
 }
 $phitmp = $$lcssa * 0.5;
 $area$0$lcssa = $phitmp;
 return (+$area$0$lcssa);
}
function _nvg__polyReverse($pts,$npts) {
 $pts = $pts|0;
 $npts = $npts|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $i$02 = 0, $j$0 = 0, $j$0$1 = 0, $j$03 = 0, $tmp = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0;
 $tmp = sp;
 $0 = ($npts|0)>(1);
 if (!($0)) {
  STACKTOP = sp;return;
 }
 $j$0$1 = (($npts) + -1)|0;
 $i$02 = 0;$j$03 = $j$0$1;
 while(1) {
  $1 = (($pts) + ($i$02<<5)|0);
  ;HEAP32[$tmp>>2]=HEAP32[$1>>2]|0;HEAP32[$tmp+4>>2]=HEAP32[$1+4>>2]|0;HEAP32[$tmp+8>>2]=HEAP32[$1+8>>2]|0;HEAP32[$tmp+12>>2]=HEAP32[$1+12>>2]|0;HEAP32[$tmp+16>>2]=HEAP32[$1+16>>2]|0;HEAP32[$tmp+20>>2]=HEAP32[$1+20>>2]|0;HEAP32[$tmp+24>>2]=HEAP32[$1+24>>2]|0;HEAP32[$tmp+28>>2]=HEAP32[$1+28>>2]|0;
  $2 = (($pts) + ($j$03<<5)|0);
  ;HEAP32[$1>>2]=HEAP32[$2>>2]|0;HEAP32[$1+4>>2]=HEAP32[$2+4>>2]|0;HEAP32[$1+8>>2]=HEAP32[$2+8>>2]|0;HEAP32[$1+12>>2]=HEAP32[$2+12>>2]|0;HEAP32[$1+16>>2]=HEAP32[$2+16>>2]|0;HEAP32[$1+20>>2]=HEAP32[$2+20>>2]|0;HEAP32[$1+24>>2]=HEAP32[$2+24>>2]|0;HEAP32[$1+28>>2]=HEAP32[$2+28>>2]|0;
  ;HEAP32[$2>>2]=HEAP32[$tmp>>2]|0;HEAP32[$2+4>>2]=HEAP32[$tmp+4>>2]|0;HEAP32[$2+8>>2]=HEAP32[$tmp+8>>2]|0;HEAP32[$2+12>>2]=HEAP32[$tmp+12>>2]|0;HEAP32[$2+16>>2]=HEAP32[$tmp+16>>2]|0;HEAP32[$2+20>>2]=HEAP32[$tmp+20>>2]|0;HEAP32[$2+24>>2]=HEAP32[$tmp+24>>2]|0;HEAP32[$2+28>>2]=HEAP32[$tmp+28>>2]|0;
  $3 = (($i$02) + 1)|0;
  $j$0 = (($j$03) + -1)|0;
  $4 = ($3|0)<($j$0|0);
  if ($4) {
   $i$02 = $3;$j$03 = $j$0;
  } else {
   break;
  }
 }
 STACKTOP = sp;return;
}
function _nvg__triarea2($ax,$ay,$bx,$by,$cx,$cy) {
 $ax = +$ax;
 $ay = +$ay;
 $bx = +$bx;
 $by = +$by;
 $cx = +$cx;
 $cy = +$cy;
 var $0 = 0.0, $1 = 0.0, $2 = 0.0, $3 = 0.0, $4 = 0.0, $5 = 0.0, $6 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = $bx - $ax;
 $1 = $by - $ay;
 $2 = $cx - $ax;
 $3 = $cy - $ay;
 $4 = $1 * $2;
 $5 = $0 * $3;
 $6 = $4 - $5;
 return (+$6);
}
function _nvg__lastPath($ctx) {
 $ctx = $ctx|0;
 var $$0 = 0, $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($ctx)) + 8144|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ((($1)) + 16|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = ($3|0)>(0);
 if (!($4)) {
  $$0 = 0;
  return ($$0|0);
 }
 $5 = (($3) + -1)|0;
 $6 = ((($1)) + 12|0);
 $7 = HEAP32[$6>>2]|0;
 $8 = (($7) + (($5*40)|0)|0);
 $$0 = $8;
 return ($$0|0);
}
function _nvg__sqrtf($a) {
 $a = +$a;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+Math_sqrt((+$a)));
 return (+$0);
}
function _fons__atlasInsertNode($atlas,$idx,$x,$y,$w) {
 $atlas = $atlas|0;
 $idx = $idx|0;
 $x = $x|0;
 $y = $y|0;
 $w = $w|0;
 var $$ = 0, $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0;
 var $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $i$01 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($atlas)) + 12|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ((($atlas)) + 16|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = ($1|0)<($3|0);
 if (!($4)) {
  $5 = ($3|0)==(0);
  $6 = $3 << 1;
  $$ = $5 ? 8 : $6;
  HEAP32[$2>>2] = $$;
  $7 = ((($atlas)) + 8|0);
  $8 = HEAP32[$7>>2]|0;
  $9 = ($$*6)|0;
  $10 = (_realloc($8,$9)|0);
  HEAP32[$7>>2] = $10;
  $11 = ($10|0)==(0|0);
  if ($11) {
   $$0 = 0;
   return ($$0|0);
  }
 }
 $12 = HEAP32[$0>>2]|0;
 $13 = ($12|0)>($idx|0);
 if ($13) {
  $14 = ((($atlas)) + 8|0);
  $i$01 = $12;
  while(1) {
   $15 = HEAP32[$14>>2]|0;
   $16 = (($15) + (($i$01*6)|0)|0);
   $17 = (($i$01) + -1)|0;
   $18 = (($15) + (($17*6)|0)|0);
   ;HEAP16[$16>>1]=HEAP16[$18>>1]|0;HEAP16[$16+2>>1]=HEAP16[$18+2>>1]|0;HEAP16[$16+4>>1]=HEAP16[$18+4>>1]|0;
   $19 = ($17|0)>($idx|0);
   if ($19) {
    $i$01 = $17;
   } else {
    break;
   }
  }
 }
 $20 = $x&65535;
 $21 = ((($atlas)) + 8|0);
 $22 = HEAP32[$21>>2]|0;
 $23 = (($22) + (($idx*6)|0)|0);
 HEAP16[$23>>1] = $20;
 $24 = $y&65535;
 $25 = HEAP32[$21>>2]|0;
 $26 = (((($25) + (($idx*6)|0)|0)) + 2|0);
 HEAP16[$26>>1] = $24;
 $27 = $w&65535;
 $28 = HEAP32[$21>>2]|0;
 $29 = (((($28) + (($idx*6)|0)|0)) + 4|0);
 HEAP16[$29>>1] = $27;
 $30 = HEAP32[$0>>2]|0;
 $31 = (($30) + 1)|0;
 HEAP32[$0>>2] = $31;
 $$0 = 1;
 return ($$0|0);
}
function _fons__atlasAddRect($atlas,$rw,$rh,$rx,$ry) {
 $atlas = $atlas|0;
 $rw = $rw|0;
 $rh = $rh|0;
 $rx = $rx|0;
 $ry = $ry|0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0;
 var $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $besth$01 = 0, $besth$1 = 0, $besti$03 = 0, $besti$1 = 0, $besti$1$lcssa = 0, $bestw$02 = 0, $bestw$1 = 0, $bestx$04 = 0;
 var $bestx$1 = 0, $bestx$1$lcssa = 0, $besty$05 = 0, $besty$1 = 0, $besty$1$lcssa = 0, $i$06 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($atlas)) + 12|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)>(0);
 if (!($2)) {
  $$0 = 0;
  return ($$0|0);
 }
 $3 = HEAP32[$atlas>>2]|0;
 $4 = ((($atlas)) + 4|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = HEAP32[$0>>2]|0;
 $7 = ((($atlas)) + 8|0);
 $8 = ((($atlas)) + 8|0);
 $besth$01 = $5;$besti$03 = -1;$bestw$02 = $3;$bestx$04 = -1;$besty$05 = -1;$i$06 = 0;
 while(1) {
  $9 = (_fons__atlasRectFits($atlas,$i$06,$rw,$rh)|0);
  $10 = ($9|0)==(-1);
  do {
   if ($10) {
    $besth$1 = $besth$01;$besti$1 = $besti$03;$bestw$1 = $bestw$02;$bestx$1 = $bestx$04;$besty$1 = $besty$05;
   } else {
    $11 = (($9) + ($rh))|0;
    $12 = ($11|0)<($besth$01|0);
    if (!($12)) {
     $13 = ($11|0)==($besth$01|0);
     if (!($13)) {
      $besth$1 = $besth$01;$besti$1 = $besti$03;$bestw$1 = $bestw$02;$bestx$1 = $bestx$04;$besty$1 = $besty$05;
      break;
     }
     $14 = HEAP32[$8>>2]|0;
     $15 = (((($14) + (($i$06*6)|0)|0)) + 4|0);
     $16 = HEAP16[$15>>1]|0;
     $17 = $16 << 16 >> 16;
     $18 = ($17|0)<($bestw$02|0);
     if (!($18)) {
      $besth$1 = $besth$01;$besti$1 = $besti$03;$bestw$1 = $bestw$02;$bestx$1 = $bestx$04;$besty$1 = $besty$05;
      break;
     }
    }
    $19 = HEAP32[$7>>2]|0;
    $20 = (((($19) + (($i$06*6)|0)|0)) + 4|0);
    $21 = HEAP16[$20>>1]|0;
    $22 = $21 << 16 >> 16;
    $23 = (($19) + (($i$06*6)|0)|0);
    $24 = HEAP16[$23>>1]|0;
    $25 = $24 << 16 >> 16;
    $besth$1 = $11;$besti$1 = $i$06;$bestw$1 = $22;$bestx$1 = $25;$besty$1 = $9;
   }
  } while(0);
  $26 = (($i$06) + 1)|0;
  $27 = ($26|0)<($6|0);
  if ($27) {
   $besth$01 = $besth$1;$besti$03 = $besti$1;$bestw$02 = $bestw$1;$bestx$04 = $bestx$1;$besty$05 = $besty$1;$i$06 = $26;
  } else {
   $besti$1$lcssa = $besti$1;$bestx$1$lcssa = $bestx$1;$besty$1$lcssa = $besty$1;
   break;
  }
 }
 $28 = ($besti$1$lcssa|0)==(-1);
 if ($28) {
  $$0 = 0;
  return ($$0|0);
 }
 $29 = (_fons__atlasAddSkylineLevel($atlas,$besti$1$lcssa,$bestx$1$lcssa,$besty$1$lcssa,$rw,$rh)|0);
 $30 = ($29|0)==(0);
 if ($30) {
  $$0 = 0;
  return ($$0|0);
 }
 HEAP32[$rx>>2] = $bestx$1$lcssa;
 HEAP32[$ry>>2] = $besty$1$lcssa;
 $$0 = 1;
 return ($$0|0);
}
function _fons__mini($a,$b) {
 $a = $a|0;
 $b = $b|0;
 var $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($a|0)<($b|0);
 $1 = $0 ? $a : $b;
 return ($1|0);
}
function _fons__atlasRectFits($atlas,$i,$w,$h) {
 $atlas = $atlas|0;
 $i = $i|0;
 $w = $w|0;
 $h = $h|0;
 var $$0 = 0, $$012 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0;
 var $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $spaceLeft$04 = 0, $y$03 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($atlas)) + 8|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = (($1) + (($i*6)|0)|0);
 $3 = HEAP16[$2>>1]|0;
 $4 = $3 << 16 >> 16;
 $5 = (($4) + ($w))|0;
 $6 = HEAP32[$atlas>>2]|0;
 $7 = ($5|0)>($6|0);
 if ($7) {
  $$0 = -1;
  return ($$0|0);
 }
 $8 = (((($1) + (($i*6)|0)|0)) + 2|0);
 $9 = HEAP16[$8>>1]|0;
 $10 = $9 << 16 >> 16;
 $11 = ($w|0)>(0);
 if (!($11)) {
  $$0 = $10;
  return ($$0|0);
 }
 $12 = ((($atlas)) + 12|0);
 $13 = HEAP32[$12>>2]|0;
 $14 = ((($atlas)) + 4|0);
 $$012 = $i;$spaceLeft$04 = $w;$y$03 = $10;
 while(1) {
  $15 = ($$012|0)==($13|0);
  if ($15) {
   $$0 = -1;
   label = 7;
   break;
  }
  $16 = HEAP32[$0>>2]|0;
  $17 = (((($16) + (($$012*6)|0)|0)) + 2|0);
  $18 = HEAP16[$17>>1]|0;
  $19 = $18 << 16 >> 16;
  $20 = (_fons__maxi($y$03,$19)|0);
  $21 = (($20) + ($h))|0;
  $22 = HEAP32[$14>>2]|0;
  $23 = ($21|0)>($22|0);
  if ($23) {
   $$0 = -1;
   label = 7;
   break;
  }
  $24 = (((($16) + (($$012*6)|0)|0)) + 4|0);
  $25 = HEAP16[$24>>1]|0;
  $26 = $25 << 16 >> 16;
  $27 = (($spaceLeft$04) - ($26))|0;
  $28 = (($$012) + 1)|0;
  $29 = ($27|0)>(0);
  if ($29) {
   $$012 = $28;$spaceLeft$04 = $27;$y$03 = $20;
  } else {
   $$0 = $20;
   label = 7;
   break;
  }
 }
 if ((label|0) == 7) {
  return ($$0|0);
 }
 return (0)|0;
}
function _fons__atlasAddSkylineLevel($atlas,$idx,$x,$y,$w,$h) {
 $atlas = $atlas|0;
 $idx = $idx|0;
 $x = $x|0;
 $y = $y|0;
 $w = $w|0;
 $h = $h|0;
 var $$0 = 0, $$pr = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0;
 var $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0;
 var $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0;
 var $i$0 = 0, $i$23 = 0, $i$3 = 0, $sext = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($h) + ($y))|0;
 $1 = (_fons__atlasInsertNode($atlas,$idx,$x,$0,$w)|0);
 $2 = ($1|0)==(0);
 if ($2) {
  $$0 = 0;
  return ($$0|0);
 }
 $3 = ((($atlas)) + 8|0);
 $i$0 = (($idx) + 1)|0;
 $4 = ((($atlas)) + 12|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = ($i$0|0)<($5|0);
 L4: do {
  if ($6) {
   while(1) {
    $7 = HEAP32[$3>>2]|0;
    $8 = (($7) + (($i$0*6)|0)|0);
    $9 = HEAP16[$8>>1]|0;
    $10 = $9 << 16 >> 16;
    $11 = (($7) + (($idx*6)|0)|0);
    $12 = HEAP16[$11>>1]|0;
    $13 = $12 << 16 >> 16;
    $14 = (((($7) + (($idx*6)|0)|0)) + 4|0);
    $15 = HEAP16[$14>>1]|0;
    $16 = $15 << 16 >> 16;
    $17 = (($16) + ($13))|0;
    $18 = ($17|0)>($10|0);
    if (!($18)) {
     break;
    }
    $19 = (($17) - ($10))|0;
    $sext = $19 << 16;
    $20 = $sext >> 16;
    $21 = (($20) + ($10))|0;
    $22 = $21&65535;
    HEAP16[$8>>1] = $22;
    $23 = HEAP32[$3>>2]|0;
    $24 = (((($23) + (($i$0*6)|0)|0)) + 4|0);
    $25 = HEAP16[$24>>1]|0;
    $26 = $25&65535;
    $27 = (($26) - ($20))|0;
    $28 = $27&65535;
    HEAP16[$24>>1] = $28;
    $29 = HEAP32[$3>>2]|0;
    $30 = (((($29) + (($i$0*6)|0)|0)) + 4|0);
    $31 = HEAP16[$30>>1]|0;
    $32 = ($31<<16>>16)<(1);
    if (!($32)) {
     break;
    }
    _fons__atlasRemoveNode($atlas,$i$0);
    $36 = HEAP32[$4>>2]|0;
    $37 = ($i$0|0)<($36|0);
    if (!($37)) {
     $34 = $36;
     break L4;
    }
   }
   $$pr = HEAP32[$4>>2]|0;
   $34 = $$pr;
  } else {
   $34 = $5;
  }
 } while(0);
 $33 = ($34|0)>(1);
 if (!($33)) {
  $$0 = 1;
  return ($$0|0);
 }
 $35 = ((($atlas)) + 8|0);
 $i$23 = 0;
 while(1) {
  $38 = HEAP32[$35>>2]|0;
  $39 = (((($38) + (($i$23*6)|0)|0)) + 2|0);
  $40 = HEAP16[$39>>1]|0;
  $41 = (($i$23) + 1)|0;
  $42 = (((($38) + (($41*6)|0)|0)) + 2|0);
  $43 = HEAP16[$42>>1]|0;
  $44 = ($40<<16>>16)==($43<<16>>16);
  if ($44) {
   $45 = (((($38) + (($41*6)|0)|0)) + 4|0);
   $46 = HEAP16[$45>>1]|0;
   $47 = $46&65535;
   $48 = (((($38) + (($i$23*6)|0)|0)) + 4|0);
   $49 = HEAP16[$48>>1]|0;
   $50 = $49&65535;
   $51 = (($50) + ($47))|0;
   $52 = $51&65535;
   HEAP16[$48>>1] = $52;
   _fons__atlasRemoveNode($atlas,$41);
   $53 = (($i$23) + -1)|0;
   $i$3 = $53;
  } else {
   $i$3 = $i$23;
  }
  $54 = (($i$3) + 1)|0;
  $55 = HEAP32[$4>>2]|0;
  $56 = (($55) + -1)|0;
  $57 = ($54|0)<($56|0);
  if ($57) {
   $i$23 = $54;
  } else {
   $$0 = 1;
   break;
  }
 }
 return ($$0|0);
}
function _fons__atlasRemoveNode($atlas,$idx) {
 $atlas = $atlas|0;
 $idx = $idx|0;
 var $$lcssa = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $i$01 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($atlas)) + 12|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)==(0);
 if ($2) {
  return;
 }
 $3 = HEAP32[$0>>2]|0;
 $4 = (($3) + -1)|0;
 $5 = ($4|0)>($idx|0);
 if ($5) {
  $6 = ((($atlas)) + 8|0);
  $i$01 = $idx;
  while(1) {
   $7 = HEAP32[$6>>2]|0;
   $8 = (($7) + (($i$01*6)|0)|0);
   $9 = (($i$01) + 1)|0;
   $10 = (($7) + (($9*6)|0)|0);
   ;HEAP16[$8>>1]=HEAP16[$10>>1]|0;HEAP16[$8+2>>1]=HEAP16[$10+2>>1]|0;HEAP16[$8+4>>1]=HEAP16[$10+4>>1]|0;
   $11 = HEAP32[$0>>2]|0;
   $12 = (($11) + -1)|0;
   $13 = ($9|0)<($12|0);
   if ($13) {
    $i$01 = $9;
   } else {
    $$lcssa = $12;
    break;
   }
  }
 } else {
  $$lcssa = $4;
 }
 HEAP32[$0>>2] = $$lcssa;
 return;
}
function __Znwj($size) {
 $size = $size|0;
 var $$lcssa = 0, $$size = 0, $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($size|0)==(0);
 $$size = $0 ? 1 : $size;
 while(1) {
  $1 = (_malloc($$size)|0);
  $2 = ($1|0)==(0|0);
  if (!($2)) {
   $$lcssa = $1;
   label = 6;
   break;
  }
  $3 = (__ZSt15get_new_handlerv()|0);
  $4 = ($3|0)==(0|0);
  if ($4) {
   label = 5;
   break;
  }
  FUNCTION_TABLE_v[$3 & 0]();
 }
 if ((label|0) == 5) {
  $5 = (___cxa_allocate_exception(4)|0);
  HEAP32[$5>>2] = (7856);
  ___cxa_throw(($5|0),(8|0),(1|0));
  // unreachable;
 }
 else if ((label|0) == 6) {
  return ($$lcssa|0);
 }
 return (0)|0;
}
function __ZdlPv($ptr) {
 $ptr = $ptr|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 _free($ptr);
 return;
}
function __ZNSt9bad_allocD2Ev($this) {
 $this = $this|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return;
}
function __ZNSt9bad_allocD0Ev($this) {
 $this = $this|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZdlPv($this);
 return;
}
function __ZNKSt9bad_alloc4whatEv($this) {
 $this = $this|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return (16042|0);
}
function __ZSt15get_new_handlerv() {
 var $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[1967]|0;HEAP32[1967] = (($0+0)|0);
 $1 = $0;
 return ($1|0);
}
function __ZNSt9exceptionD2Ev($this) {
 $this = $this|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return;
}
function __ZNSt9type_infoD2Ev($this) {
 $this = $this|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return;
}
function __ZN10__cxxabiv116__shim_type_infoD2Ev($this) {
 $this = $this|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return;
}
function __ZNK10__cxxabiv116__shim_type_info5noop1Ev($this) {
 $this = $this|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return;
}
function __ZNK10__cxxabiv116__shim_type_info5noop2Ev($this) {
 $this = $this|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return;
}
function __ZN10__cxxabiv117__class_type_infoD0Ev($this) {
 $this = $this|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZdlPv($this);
 return;
}
function __ZN10__cxxabiv120__si_class_type_infoD0Ev($this) {
 $this = $this|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 __ZdlPv($this);
 return;
}
function __ZNK10__cxxabiv117__class_type_info9can_catchEPKNS_16__shim_type_infoERPv($this,$thrown_type,$adjustedPtr) {
 $this = $this|0;
 $thrown_type = $thrown_type|0;
 $adjustedPtr = $adjustedPtr|0;
 var $$0 = 0, $$2 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $info = 0, dest = 0;
 var label = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 64|0;
 $info = sp;
 $0 = ($this|0)==($thrown_type|0);
 if ($0) {
  $$2 = 1;
 } else {
  $1 = ($thrown_type|0)==(0|0);
  if ($1) {
   $$2 = 0;
  } else {
   $2 = (___dynamic_cast($thrown_type,40,56,0)|0);
   $3 = ($2|0)==(0|0);
   if ($3) {
    $$2 = 0;
   } else {
    dest=$info; stop=dest+56|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
    HEAP32[$info>>2] = $2;
    $4 = ((($info)) + 8|0);
    HEAP32[$4>>2] = $this;
    $5 = ((($info)) + 12|0);
    HEAP32[$5>>2] = -1;
    $6 = ((($info)) + 48|0);
    HEAP32[$6>>2] = 1;
    $7 = HEAP32[$2>>2]|0;
    $8 = ((($7)) + 28|0);
    $9 = HEAP32[$8>>2]|0;
    $10 = HEAP32[$adjustedPtr>>2]|0;
    FUNCTION_TABLE_viiii[$9 & 3]($2,$info,$10,1);
    $11 = ((($info)) + 24|0);
    $12 = HEAP32[$11>>2]|0;
    $13 = ($12|0)==(1);
    if ($13) {
     $14 = ((($info)) + 16|0);
     $15 = HEAP32[$14>>2]|0;
     HEAP32[$adjustedPtr>>2] = $15;
     $$0 = 1;
    } else {
     $$0 = 0;
    }
    $$2 = $$0;
   }
  }
 }
 STACKTOP = sp;return ($$2|0);
}
function __ZNK10__cxxabiv117__class_type_info24process_found_base_classEPNS_19__dynamic_cast_infoEPvi($this,$info,$adjustedPtr,$path_below) {
 $this = $this|0;
 $info = $info|0;
 $adjustedPtr = $adjustedPtr|0;
 $path_below = $path_below|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($info)) + 16|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)==(0|0);
 do {
  if ($2) {
   HEAP32[$0>>2] = $adjustedPtr;
   $3 = ((($info)) + 24|0);
   HEAP32[$3>>2] = $path_below;
   $4 = ((($info)) + 36|0);
   HEAP32[$4>>2] = 1;
  } else {
   $5 = ($1|0)==($adjustedPtr|0);
   if (!($5)) {
    $9 = ((($info)) + 36|0);
    $10 = HEAP32[$9>>2]|0;
    $11 = (($10) + 1)|0;
    HEAP32[$9>>2] = $11;
    $12 = ((($info)) + 24|0);
    HEAP32[$12>>2] = 2;
    $13 = ((($info)) + 54|0);
    HEAP8[$13>>0] = 1;
    break;
   }
   $6 = ((($info)) + 24|0);
   $7 = HEAP32[$6>>2]|0;
   $8 = ($7|0)==(2);
   if ($8) {
    HEAP32[$6>>2] = $path_below;
   }
  }
 } while(0);
 return;
}
function __ZNK10__cxxabiv117__class_type_info27has_unambiguous_public_baseEPNS_19__dynamic_cast_infoEPvi($this,$info,$adjustedPtr,$path_below) {
 $this = $this|0;
 $info = $info|0;
 $adjustedPtr = $adjustedPtr|0;
 $path_below = $path_below|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($info)) + 8|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($this|0)==($1|0);
 if ($2) {
  __ZNK10__cxxabiv117__class_type_info24process_found_base_classEPNS_19__dynamic_cast_infoEPvi(0,$info,$adjustedPtr,$path_below);
 }
 return;
}
function __ZNK10__cxxabiv120__si_class_type_info27has_unambiguous_public_baseEPNS_19__dynamic_cast_infoEPvi($this,$info,$adjustedPtr,$path_below) {
 $this = $this|0;
 $info = $info|0;
 $adjustedPtr = $adjustedPtr|0;
 $path_below = $path_below|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($info)) + 8|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($this|0)==($1|0);
 if ($2) {
  __ZNK10__cxxabiv117__class_type_info24process_found_base_classEPNS_19__dynamic_cast_infoEPvi(0,$info,$adjustedPtr,$path_below);
 } else {
  $3 = ((($this)) + 8|0);
  $4 = HEAP32[$3>>2]|0;
  $5 = HEAP32[$4>>2]|0;
  $6 = ((($5)) + 28|0);
  $7 = HEAP32[$6>>2]|0;
  FUNCTION_TABLE_viiii[$7 & 3]($4,$info,$adjustedPtr,$path_below);
 }
 return;
}
function ___dynamic_cast($static_ptr,$static_type,$dst_type,$src2dst_offset) {
 $static_ptr = $static_ptr|0;
 $static_type = $static_type|0;
 $dst_type = $dst_type|0;
 $src2dst_offset = $src2dst_offset|0;
 var $$ = 0, $$8 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0;
 var $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0;
 var $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $dst_ptr$0 = 0, $info = 0, $or$cond = 0, $or$cond3 = 0, $or$cond5 = 0, $or$cond7 = 0, dest = 0, label = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 64|0;
 $info = sp;
 $0 = HEAP32[$static_ptr>>2]|0;
 $1 = ((($0)) + -8|0);
 $2 = HEAP32[$1>>2]|0;
 $3 = (($static_ptr) + ($2)|0);
 $4 = ((($0)) + -4|0);
 $5 = HEAP32[$4>>2]|0;
 HEAP32[$info>>2] = $dst_type;
 $6 = ((($info)) + 4|0);
 HEAP32[$6>>2] = $static_ptr;
 $7 = ((($info)) + 8|0);
 HEAP32[$7>>2] = $static_type;
 $8 = ((($info)) + 12|0);
 HEAP32[$8>>2] = $src2dst_offset;
 $9 = ((($info)) + 16|0);
 $10 = ((($info)) + 20|0);
 $11 = ((($info)) + 24|0);
 $12 = ((($info)) + 28|0);
 $13 = ((($info)) + 32|0);
 $14 = ((($info)) + 40|0);
 $15 = ($5|0)==($dst_type|0);
 dest=$9; stop=dest+36|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));HEAP16[$9+36>>1]=0|0;HEAP8[$9+38>>0]=0|0;
 L1: do {
  if ($15) {
   $16 = ((($info)) + 48|0);
   HEAP32[$16>>2] = 1;
   $17 = HEAP32[$dst_type>>2]|0;
   $18 = ((($17)) + 20|0);
   $19 = HEAP32[$18>>2]|0;
   FUNCTION_TABLE_viiiiii[$19 & 3]($dst_type,$info,$3,$3,1,0);
   $20 = HEAP32[$11>>2]|0;
   $21 = ($20|0)==(1);
   $$ = $21 ? $3 : 0;
   $dst_ptr$0 = $$;
  } else {
   $22 = ((($info)) + 36|0);
   $23 = HEAP32[$5>>2]|0;
   $24 = ((($23)) + 24|0);
   $25 = HEAP32[$24>>2]|0;
   FUNCTION_TABLE_viiiii[$25 & 3]($5,$info,$3,1,0);
   $26 = HEAP32[$22>>2]|0;
   switch ($26|0) {
   case 0:  {
    $27 = HEAP32[$14>>2]|0;
    $28 = ($27|0)==(1);
    $29 = HEAP32[$12>>2]|0;
    $30 = ($29|0)==(1);
    $or$cond = $28 & $30;
    $31 = HEAP32[$13>>2]|0;
    $32 = ($31|0)==(1);
    $or$cond3 = $or$cond & $32;
    $33 = HEAP32[$10>>2]|0;
    $$8 = $or$cond3 ? $33 : 0;
    $dst_ptr$0 = $$8;
    break L1;
    break;
   }
   case 1:  {
    break;
   }
   default: {
    $dst_ptr$0 = 0;
    break L1;
   }
   }
   $34 = HEAP32[$11>>2]|0;
   $35 = ($34|0)==(1);
   if (!($35)) {
    $36 = HEAP32[$14>>2]|0;
    $37 = ($36|0)==(0);
    $38 = HEAP32[$12>>2]|0;
    $39 = ($38|0)==(1);
    $or$cond5 = $37 & $39;
    $40 = HEAP32[$13>>2]|0;
    $41 = ($40|0)==(1);
    $or$cond7 = $or$cond5 & $41;
    if (!($or$cond7)) {
     $dst_ptr$0 = 0;
     break;
    }
   }
   $42 = HEAP32[$9>>2]|0;
   $dst_ptr$0 = $42;
  }
 } while(0);
 STACKTOP = sp;return ($dst_ptr$0|0);
}
function __ZNK10__cxxabiv117__class_type_info29process_static_type_above_dstEPNS_19__dynamic_cast_infoEPKvS4_i($this,$info,$dst_ptr,$current_ptr,$path_below) {
 $this = $this|0;
 $info = $info|0;
 $dst_ptr = $dst_ptr|0;
 $current_ptr = $current_ptr|0;
 $path_below = $path_below|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, $or$cond1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($info)) + 53|0);
 HEAP8[$0>>0] = 1;
 $1 = ((($info)) + 4|0);
 $2 = HEAP32[$1>>2]|0;
 $3 = ($2|0)==($current_ptr|0);
 do {
  if ($3) {
   $4 = ((($info)) + 52|0);
   HEAP8[$4>>0] = 1;
   $5 = ((($info)) + 16|0);
   $6 = HEAP32[$5>>2]|0;
   $7 = ($6|0)==(0|0);
   if ($7) {
    HEAP32[$5>>2] = $dst_ptr;
    $8 = ((($info)) + 24|0);
    HEAP32[$8>>2] = $path_below;
    $9 = ((($info)) + 36|0);
    HEAP32[$9>>2] = 1;
    $10 = ((($info)) + 48|0);
    $11 = HEAP32[$10>>2]|0;
    $12 = ($11|0)==(1);
    $13 = ($path_below|0)==(1);
    $or$cond = $12 & $13;
    if (!($or$cond)) {
     break;
    }
    $14 = ((($info)) + 54|0);
    HEAP8[$14>>0] = 1;
    break;
   }
   $15 = ($6|0)==($dst_ptr|0);
   if (!($15)) {
    $25 = ((($info)) + 36|0);
    $26 = HEAP32[$25>>2]|0;
    $27 = (($26) + 1)|0;
    HEAP32[$25>>2] = $27;
    $28 = ((($info)) + 54|0);
    HEAP8[$28>>0] = 1;
    break;
   }
   $16 = ((($info)) + 24|0);
   $17 = HEAP32[$16>>2]|0;
   $18 = ($17|0)==(2);
   if ($18) {
    HEAP32[$16>>2] = $path_below;
    $23 = $path_below;
   } else {
    $23 = $17;
   }
   $19 = ((($info)) + 48|0);
   $20 = HEAP32[$19>>2]|0;
   $21 = ($20|0)==(1);
   $22 = ($23|0)==(1);
   $or$cond1 = $21 & $22;
   if ($or$cond1) {
    $24 = ((($info)) + 54|0);
    HEAP8[$24>>0] = 1;
   }
  }
 } while(0);
 return;
}
function __ZNK10__cxxabiv120__si_class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib($this,$info,$current_ptr,$path_below,$use_strcmp) {
 $this = $this|0;
 $info = $info|0;
 $current_ptr = $current_ptr|0;
 $path_below = $path_below|0;
 $use_strcmp = $use_strcmp|0;
 var $$1 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0;
 var $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0;
 var $44 = 0, $45 = 0, $46 = 0, $47 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $is_dst_type_derived_from_static_type$0$off02 = 0, $is_dst_type_derived_from_static_type$0$off03 = 0, $not$ = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($info)) + 8|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($this|0)==($1|0);
 do {
  if ($2) {
   $3 = ((($info)) + 4|0);
   $4 = HEAP32[$3>>2]|0;
   $5 = ($4|0)==($current_ptr|0);
   if ($5) {
    $6 = ((($info)) + 28|0);
    $7 = HEAP32[$6>>2]|0;
    $8 = ($7|0)==(1);
    if (!($8)) {
     HEAP32[$6>>2] = $path_below;
    }
   }
  } else {
   $9 = HEAP32[$info>>2]|0;
   $10 = ($this|0)==($9|0);
   if (!($10)) {
    $43 = ((($this)) + 8|0);
    $44 = HEAP32[$43>>2]|0;
    $45 = HEAP32[$44>>2]|0;
    $46 = ((($45)) + 24|0);
    $47 = HEAP32[$46>>2]|0;
    FUNCTION_TABLE_viiiii[$47 & 3]($44,$info,$current_ptr,$path_below,$use_strcmp);
    break;
   }
   $11 = ((($info)) + 16|0);
   $12 = HEAP32[$11>>2]|0;
   $13 = ($12|0)==($current_ptr|0);
   if (!($13)) {
    $14 = ((($info)) + 20|0);
    $15 = HEAP32[$14>>2]|0;
    $16 = ($15|0)==($current_ptr|0);
    if (!($16)) {
     $19 = ((($info)) + 32|0);
     HEAP32[$19>>2] = $path_below;
     $20 = ((($info)) + 44|0);
     $21 = HEAP32[$20>>2]|0;
     $22 = ($21|0)==(4);
     if ($22) {
      break;
     }
     $23 = ((($info)) + 52|0);
     HEAP8[$23>>0] = 0;
     $24 = ((($info)) + 53|0);
     HEAP8[$24>>0] = 0;
     $25 = ((($this)) + 8|0);
     $26 = HEAP32[$25>>2]|0;
     $27 = HEAP32[$26>>2]|0;
     $28 = ((($27)) + 20|0);
     $29 = HEAP32[$28>>2]|0;
     FUNCTION_TABLE_viiiiii[$29 & 3]($26,$info,$current_ptr,$current_ptr,1,$use_strcmp);
     $30 = HEAP8[$24>>0]|0;
     $31 = ($30<<24>>24)==(0);
     if ($31) {
      $is_dst_type_derived_from_static_type$0$off02 = 0;
      label = 13;
     } else {
      $32 = HEAP8[$23>>0]|0;
      $not$ = ($32<<24>>24)==(0);
      if ($not$) {
       $is_dst_type_derived_from_static_type$0$off02 = 1;
       label = 13;
      } else {
       $is_dst_type_derived_from_static_type$0$off03 = 1;
      }
     }
     if ((label|0) == 13) {
      HEAP32[$14>>2] = $current_ptr;
      $33 = ((($info)) + 40|0);
      $34 = HEAP32[$33>>2]|0;
      $35 = (($34) + 1)|0;
      HEAP32[$33>>2] = $35;
      $36 = ((($info)) + 36|0);
      $37 = HEAP32[$36>>2]|0;
      $38 = ($37|0)==(1);
      if ($38) {
       $39 = ((($info)) + 24|0);
       $40 = HEAP32[$39>>2]|0;
       $41 = ($40|0)==(2);
       if ($41) {
        $42 = ((($info)) + 54|0);
        HEAP8[$42>>0] = 1;
        $is_dst_type_derived_from_static_type$0$off03 = $is_dst_type_derived_from_static_type$0$off02;
       } else {
        $is_dst_type_derived_from_static_type$0$off03 = $is_dst_type_derived_from_static_type$0$off02;
       }
      } else {
       $is_dst_type_derived_from_static_type$0$off03 = $is_dst_type_derived_from_static_type$0$off02;
      }
     }
     $$1 = $is_dst_type_derived_from_static_type$0$off03 ? 3 : 4;
     HEAP32[$20>>2] = $$1;
     break;
    }
   }
   $17 = ($path_below|0)==(1);
   if ($17) {
    $18 = ((($info)) + 32|0);
    HEAP32[$18>>2] = 1;
   }
  }
 } while(0);
 return;
}
function __ZNK10__cxxabiv117__class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib($this,$info,$current_ptr,$path_below,$use_strcmp) {
 $this = $this|0;
 $info = $info|0;
 $current_ptr = $current_ptr|0;
 $path_below = $path_below|0;
 $use_strcmp = $use_strcmp|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0;
 var $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($info)) + 8|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($this|0)==($1|0);
 do {
  if ($2) {
   $3 = ((($info)) + 4|0);
   $4 = HEAP32[$3>>2]|0;
   $5 = ($4|0)==($current_ptr|0);
   if ($5) {
    $6 = ((($info)) + 28|0);
    $7 = HEAP32[$6>>2]|0;
    $8 = ($7|0)==(1);
    if (!($8)) {
     HEAP32[$6>>2] = $path_below;
    }
   }
  } else {
   $9 = HEAP32[$info>>2]|0;
   $10 = ($this|0)==($9|0);
   if ($10) {
    $11 = ((($info)) + 16|0);
    $12 = HEAP32[$11>>2]|0;
    $13 = ($12|0)==($current_ptr|0);
    if (!($13)) {
     $14 = ((($info)) + 20|0);
     $15 = HEAP32[$14>>2]|0;
     $16 = ($15|0)==($current_ptr|0);
     if (!($16)) {
      $19 = ((($info)) + 32|0);
      HEAP32[$19>>2] = $path_below;
      HEAP32[$14>>2] = $current_ptr;
      $20 = ((($info)) + 40|0);
      $21 = HEAP32[$20>>2]|0;
      $22 = (($21) + 1)|0;
      HEAP32[$20>>2] = $22;
      $23 = ((($info)) + 36|0);
      $24 = HEAP32[$23>>2]|0;
      $25 = ($24|0)==(1);
      if ($25) {
       $26 = ((($info)) + 24|0);
       $27 = HEAP32[$26>>2]|0;
       $28 = ($27|0)==(2);
       if ($28) {
        $29 = ((($info)) + 54|0);
        HEAP8[$29>>0] = 1;
       }
      }
      $30 = ((($info)) + 44|0);
      HEAP32[$30>>2] = 4;
      break;
     }
    }
    $17 = ($path_below|0)==(1);
    if ($17) {
     $18 = ((($info)) + 32|0);
     HEAP32[$18>>2] = 1;
    }
   }
  }
 } while(0);
 return;
}
function __ZNK10__cxxabiv120__si_class_type_info16search_above_dstEPNS_19__dynamic_cast_infoEPKvS4_ib($this,$info,$dst_ptr,$current_ptr,$path_below,$use_strcmp) {
 $this = $this|0;
 $info = $info|0;
 $dst_ptr = $dst_ptr|0;
 $current_ptr = $current_ptr|0;
 $path_below = $path_below|0;
 $use_strcmp = $use_strcmp|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($info)) + 8|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($this|0)==($1|0);
 if ($2) {
  __ZNK10__cxxabiv117__class_type_info29process_static_type_above_dstEPNS_19__dynamic_cast_infoEPKvS4_i(0,$info,$dst_ptr,$current_ptr,$path_below);
 } else {
  $3 = ((($this)) + 8|0);
  $4 = HEAP32[$3>>2]|0;
  $5 = HEAP32[$4>>2]|0;
  $6 = ((($5)) + 20|0);
  $7 = HEAP32[$6>>2]|0;
  FUNCTION_TABLE_viiiiii[$7 & 3]($4,$info,$dst_ptr,$current_ptr,$path_below,$use_strcmp);
 }
 return;
}
function __ZNK10__cxxabiv117__class_type_info16search_above_dstEPNS_19__dynamic_cast_infoEPKvS4_ib($this,$info,$dst_ptr,$current_ptr,$path_below,$use_strcmp) {
 $this = $this|0;
 $info = $info|0;
 $dst_ptr = $dst_ptr|0;
 $current_ptr = $current_ptr|0;
 $path_below = $path_below|0;
 $use_strcmp = $use_strcmp|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($info)) + 8|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($this|0)==($1|0);
 if ($2) {
  __ZNK10__cxxabiv117__class_type_info29process_static_type_above_dstEPNS_19__dynamic_cast_infoEPKvS4_i(0,$info,$dst_ptr,$current_ptr,$path_below);
 }
 return;
}
function ___errno_location() {
 var $$0 = 0, $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = HEAP32[1988]|0;
 $1 = ($0|0)==(0|0);
 if ($1) {
  $$0 = 8004;
 } else {
  $2 = (_pthread_self()|0);
  $3 = ((($2)) + 60|0);
  $4 = HEAP32[$3>>2]|0;
  $$0 = $4;
 }
 return ($$0|0);
}
function _strerror($e) {
 $e = $e|0;
 var $$lcssa = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $i$03 = 0, $i$03$lcssa = 0, $i$12 = 0, $s$0$lcssa = 0, $s$01 = 0, $s$1 = 0, label = 0;
 var sp = 0;
 sp = STACKTOP;
 $i$03 = 0;
 while(1) {
  $1 = (16057 + ($i$03)|0);
  $2 = HEAP8[$1>>0]|0;
  $3 = $2&255;
  $4 = ($3|0)==($e|0);
  if ($4) {
   $i$03$lcssa = $i$03;
   label = 2;
   break;
  }
  $5 = (($i$03) + 1)|0;
  $6 = ($5|0)==(87);
  if ($6) {
   $i$12 = 87;$s$01 = 16145;
   label = 5;
   break;
  } else {
   $i$03 = $5;
  }
 }
 if ((label|0) == 2) {
  $0 = ($i$03$lcssa|0)==(0);
  if ($0) {
   $s$0$lcssa = 16145;
  } else {
   $i$12 = $i$03$lcssa;$s$01 = 16145;
   label = 5;
  }
 }
 if ((label|0) == 5) {
  while(1) {
   label = 0;
   $s$1 = $s$01;
   while(1) {
    $7 = HEAP8[$s$1>>0]|0;
    $8 = ($7<<24>>24)==(0);
    $9 = ((($s$1)) + 1|0);
    if ($8) {
     $$lcssa = $9;
     break;
    } else {
     $s$1 = $9;
    }
   }
   $10 = (($i$12) + -1)|0;
   $11 = ($10|0)==(0);
   if ($11) {
    $s$0$lcssa = $$lcssa;
    break;
   } else {
    $i$12 = $10;$s$01 = $$lcssa;
    label = 5;
   }
  }
 }
 return ($s$0$lcssa|0);
}
function ___syscall_ret($r) {
 $r = $r|0;
 var $$0 = 0, $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($r>>>0)>(4294963200);
 if ($0) {
  $1 = (0 - ($r))|0;
  $2 = (___errno_location()|0);
  HEAP32[$2>>2] = $1;
  $$0 = -1;
 } else {
  $$0 = $r;
 }
 return ($$0|0);
}
function _frexp($x,$e) {
 $x = +$x;
 $e = $e|0;
 var $$0 = 0.0, $$01 = 0.0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0.0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0.0, $7 = 0.0, $8 = 0, $9 = 0, $storemerge = 0, label = 0, sp = 0;
 sp = STACKTOP;
 HEAPF64[tempDoublePtr>>3] = $x;$0 = HEAP32[tempDoublePtr>>2]|0;
 $1 = HEAP32[tempDoublePtr+4>>2]|0;
 $2 = (_bitshift64Lshr(($0|0),($1|0),52)|0);
 $3 = tempRet0;
 $4 = $2 & 2047;
 switch ($4|0) {
 case 0:  {
  $5 = $x != 0.0;
  if ($5) {
   $6 = $x * 1.8446744073709552E+19;
   $7 = (+_frexp($6,$e));
   $8 = HEAP32[$e>>2]|0;
   $9 = (($8) + -64)|0;
   $$01 = $7;$storemerge = $9;
  } else {
   $$01 = $x;$storemerge = 0;
  }
  HEAP32[$e>>2] = $storemerge;
  $$0 = $$01;
  break;
 }
 case 2047:  {
  $$0 = $x;
  break;
 }
 default: {
  $10 = (($4) + -1022)|0;
  HEAP32[$e>>2] = $10;
  $11 = $1 & -2146435073;
  $12 = $11 | 1071644672;
  HEAP32[tempDoublePtr>>2] = $0;HEAP32[tempDoublePtr+4>>2] = $12;$13 = +HEAPF64[tempDoublePtr>>3];
  $$0 = $13;
 }
 }
 return (+$$0);
}
function _frexpl($x,$e) {
 $x = +$x;
 $e = $e|0;
 var $0 = 0.0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (+_frexp($x,$e));
 return (+$0);
}
function _wcrtomb($s,$wc,$st) {
 $s = $s|0;
 $wc = $wc|0;
 $st = $st|0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0;
 var $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0;
 var $44 = 0, $45 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($s|0)==(0|0);
 do {
  if ($0) {
   $$0 = 1;
  } else {
   $1 = ($wc>>>0)<(128);
   if ($1) {
    $2 = $wc&255;
    HEAP8[$s>>0] = $2;
    $$0 = 1;
    break;
   }
   $3 = ($wc>>>0)<(2048);
   if ($3) {
    $4 = $wc >>> 6;
    $5 = $4 | 192;
    $6 = $5&255;
    $7 = ((($s)) + 1|0);
    HEAP8[$s>>0] = $6;
    $8 = $wc & 63;
    $9 = $8 | 128;
    $10 = $9&255;
    HEAP8[$7>>0] = $10;
    $$0 = 2;
    break;
   }
   $11 = ($wc>>>0)<(55296);
   $12 = $wc & -8192;
   $13 = ($12|0)==(57344);
   $or$cond = $11 | $13;
   if ($or$cond) {
    $14 = $wc >>> 12;
    $15 = $14 | 224;
    $16 = $15&255;
    $17 = ((($s)) + 1|0);
    HEAP8[$s>>0] = $16;
    $18 = $wc >>> 6;
    $19 = $18 & 63;
    $20 = $19 | 128;
    $21 = $20&255;
    $22 = ((($s)) + 2|0);
    HEAP8[$17>>0] = $21;
    $23 = $wc & 63;
    $24 = $23 | 128;
    $25 = $24&255;
    HEAP8[$22>>0] = $25;
    $$0 = 3;
    break;
   }
   $26 = (($wc) + -65536)|0;
   $27 = ($26>>>0)<(1048576);
   if ($27) {
    $28 = $wc >>> 18;
    $29 = $28 | 240;
    $30 = $29&255;
    $31 = ((($s)) + 1|0);
    HEAP8[$s>>0] = $30;
    $32 = $wc >>> 12;
    $33 = $32 & 63;
    $34 = $33 | 128;
    $35 = $34&255;
    $36 = ((($s)) + 2|0);
    HEAP8[$31>>0] = $35;
    $37 = $wc >>> 6;
    $38 = $37 & 63;
    $39 = $38 | 128;
    $40 = $39&255;
    $41 = ((($s)) + 3|0);
    HEAP8[$36>>0] = $40;
    $42 = $wc & 63;
    $43 = $42 | 128;
    $44 = $43&255;
    HEAP8[$41>>0] = $44;
    $$0 = 4;
    break;
   } else {
    $45 = (___errno_location()|0);
    HEAP32[$45>>2] = 84;
    $$0 = -1;
    break;
   }
  }
 } while(0);
 return ($$0|0);
}
function _wctomb($s,$wc) {
 $s = $s|0;
 $wc = $wc|0;
 var $$0 = 0, $0 = 0, $1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($s|0)==(0|0);
 if ($0) {
  $$0 = 0;
 } else {
  $1 = (_wcrtomb($s,$wc,0)|0);
  $$0 = $1;
 }
 return ($$0|0);
}
function ___lockfile($f) {
 $f = $f|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return 0;
}
function ___unlockfile($f) {
 $f = $f|0;
 var label = 0, sp = 0;
 sp = STACKTOP;
 return;
}
function ___stdio_close($f) {
 $f = $f|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $vararg_buffer = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0;
 $vararg_buffer = sp;
 $0 = ((($f)) + 60|0);
 $1 = HEAP32[$0>>2]|0;
 HEAP32[$vararg_buffer>>2] = $1;
 $2 = (___syscall6(6,($vararg_buffer|0))|0);
 $3 = (___syscall_ret($2)|0);
 STACKTOP = sp;return ($3|0);
}
function ___stdio_seek($f,$off,$whence) {
 $f = $f|0;
 $off = $off|0;
 $whence = $whence|0;
 var $$pre = 0, $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $ret = 0, $vararg_buffer = 0, $vararg_ptr1 = 0, $vararg_ptr2 = 0, $vararg_ptr3 = 0, $vararg_ptr4 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 32|0;
 $vararg_buffer = sp;
 $ret = sp + 20|0;
 $0 = ((($f)) + 60|0);
 $1 = HEAP32[$0>>2]|0;
 HEAP32[$vararg_buffer>>2] = $1;
 $vararg_ptr1 = ((($vararg_buffer)) + 4|0);
 HEAP32[$vararg_ptr1>>2] = 0;
 $vararg_ptr2 = ((($vararg_buffer)) + 8|0);
 HEAP32[$vararg_ptr2>>2] = $off;
 $vararg_ptr3 = ((($vararg_buffer)) + 12|0);
 HEAP32[$vararg_ptr3>>2] = $ret;
 $vararg_ptr4 = ((($vararg_buffer)) + 16|0);
 HEAP32[$vararg_ptr4>>2] = $whence;
 $2 = (___syscall140(140,($vararg_buffer|0))|0);
 $3 = (___syscall_ret($2)|0);
 $4 = ($3|0)<(0);
 if ($4) {
  HEAP32[$ret>>2] = -1;
  $5 = -1;
 } else {
  $$pre = HEAP32[$ret>>2]|0;
  $5 = $$pre;
 }
 STACKTOP = sp;return ($5|0);
}
function ___stdio_write($f,$buf,$len) {
 $f = $f|0;
 $buf = $buf|0;
 $len = $len|0;
 var $$0 = 0, $$phi$trans$insert = 0, $$pre = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0;
 var $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0;
 var $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $cnt$0 = 0, $cnt$1 = 0, $iov$0 = 0, $iov$0$lcssa11 = 0, $iov$1 = 0, $iovcnt$0 = 0, $iovcnt$0$lcssa12 = 0;
 var $iovcnt$1 = 0, $iovs = 0, $rem$0 = 0, $vararg_buffer = 0, $vararg_buffer3 = 0, $vararg_ptr1 = 0, $vararg_ptr2 = 0, $vararg_ptr6 = 0, $vararg_ptr7 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 48|0;
 $vararg_buffer3 = sp + 16|0;
 $vararg_buffer = sp;
 $iovs = sp + 32|0;
 $0 = ((($f)) + 28|0);
 $1 = HEAP32[$0>>2]|0;
 HEAP32[$iovs>>2] = $1;
 $2 = ((($iovs)) + 4|0);
 $3 = ((($f)) + 20|0);
 $4 = HEAP32[$3>>2]|0;
 $5 = (($4) - ($1))|0;
 HEAP32[$2>>2] = $5;
 $6 = ((($iovs)) + 8|0);
 HEAP32[$6>>2] = $buf;
 $7 = ((($iovs)) + 12|0);
 HEAP32[$7>>2] = $len;
 $8 = (($5) + ($len))|0;
 $9 = ((($f)) + 60|0);
 $10 = ((($f)) + 44|0);
 $iov$0 = $iovs;$iovcnt$0 = 2;$rem$0 = $8;
 while(1) {
  $11 = HEAP32[1988]|0;
  $12 = ($11|0)==(0|0);
  if ($12) {
   $16 = HEAP32[$9>>2]|0;
   HEAP32[$vararg_buffer3>>2] = $16;
   $vararg_ptr6 = ((($vararg_buffer3)) + 4|0);
   HEAP32[$vararg_ptr6>>2] = $iov$0;
   $vararg_ptr7 = ((($vararg_buffer3)) + 8|0);
   HEAP32[$vararg_ptr7>>2] = $iovcnt$0;
   $17 = (___syscall146(146,($vararg_buffer3|0))|0);
   $18 = (___syscall_ret($17)|0);
   $cnt$0 = $18;
  } else {
   _pthread_cleanup_push((11|0),($f|0));
   $13 = HEAP32[$9>>2]|0;
   HEAP32[$vararg_buffer>>2] = $13;
   $vararg_ptr1 = ((($vararg_buffer)) + 4|0);
   HEAP32[$vararg_ptr1>>2] = $iov$0;
   $vararg_ptr2 = ((($vararg_buffer)) + 8|0);
   HEAP32[$vararg_ptr2>>2] = $iovcnt$0;
   $14 = (___syscall146(146,($vararg_buffer|0))|0);
   $15 = (___syscall_ret($14)|0);
   _pthread_cleanup_pop(0);
   $cnt$0 = $15;
  }
  $19 = ($rem$0|0)==($cnt$0|0);
  if ($19) {
   label = 6;
   break;
  }
  $26 = ($cnt$0|0)<(0);
  if ($26) {
   $iov$0$lcssa11 = $iov$0;$iovcnt$0$lcssa12 = $iovcnt$0;
   label = 8;
   break;
  }
  $34 = (($rem$0) - ($cnt$0))|0;
  $35 = ((($iov$0)) + 4|0);
  $36 = HEAP32[$35>>2]|0;
  $37 = ($cnt$0>>>0)>($36>>>0);
  if ($37) {
   $38 = HEAP32[$10>>2]|0;
   HEAP32[$0>>2] = $38;
   HEAP32[$3>>2] = $38;
   $39 = (($cnt$0) - ($36))|0;
   $40 = ((($iov$0)) + 8|0);
   $41 = (($iovcnt$0) + -1)|0;
   $$phi$trans$insert = ((($iov$0)) + 12|0);
   $$pre = HEAP32[$$phi$trans$insert>>2]|0;
   $49 = $$pre;$cnt$1 = $39;$iov$1 = $40;$iovcnt$1 = $41;
  } else {
   $42 = ($iovcnt$0|0)==(2);
   if ($42) {
    $43 = HEAP32[$0>>2]|0;
    $44 = (($43) + ($cnt$0)|0);
    HEAP32[$0>>2] = $44;
    $49 = $36;$cnt$1 = $cnt$0;$iov$1 = $iov$0;$iovcnt$1 = 2;
   } else {
    $49 = $36;$cnt$1 = $cnt$0;$iov$1 = $iov$0;$iovcnt$1 = $iovcnt$0;
   }
  }
  $45 = HEAP32[$iov$1>>2]|0;
  $46 = (($45) + ($cnt$1)|0);
  HEAP32[$iov$1>>2] = $46;
  $47 = ((($iov$1)) + 4|0);
  $48 = (($49) - ($cnt$1))|0;
  HEAP32[$47>>2] = $48;
  $iov$0 = $iov$1;$iovcnt$0 = $iovcnt$1;$rem$0 = $34;
 }
 if ((label|0) == 6) {
  $20 = HEAP32[$10>>2]|0;
  $21 = ((($f)) + 48|0);
  $22 = HEAP32[$21>>2]|0;
  $23 = (($20) + ($22)|0);
  $24 = ((($f)) + 16|0);
  HEAP32[$24>>2] = $23;
  $25 = $20;
  HEAP32[$0>>2] = $25;
  HEAP32[$3>>2] = $25;
  $$0 = $len;
 }
 else if ((label|0) == 8) {
  $27 = ((($f)) + 16|0);
  HEAP32[$27>>2] = 0;
  HEAP32[$0>>2] = 0;
  HEAP32[$3>>2] = 0;
  $28 = HEAP32[$f>>2]|0;
  $29 = $28 | 32;
  HEAP32[$f>>2] = $29;
  $30 = ($iovcnt$0$lcssa12|0)==(2);
  if ($30) {
   $$0 = 0;
  } else {
   $31 = ((($iov$0$lcssa11)) + 4|0);
   $32 = HEAP32[$31>>2]|0;
   $33 = (($len) - ($32))|0;
   $$0 = $33;
  }
 }
 STACKTOP = sp;return ($$0|0);
}
function ___stdout_write($f,$buf,$len) {
 $f = $f|0;
 $buf = $buf|0;
 $len = $len|0;
 var $0 = 0, $1 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $tio = 0, $vararg_buffer = 0, $vararg_ptr1 = 0, $vararg_ptr2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 80|0;
 $vararg_buffer = sp;
 $tio = sp + 12|0;
 $0 = ((($f)) + 36|0);
 HEAP32[$0>>2] = 4;
 $1 = HEAP32[$f>>2]|0;
 $2 = $1 & 64;
 $3 = ($2|0)==(0);
 if ($3) {
  $4 = ((($f)) + 60|0);
  $5 = HEAP32[$4>>2]|0;
  HEAP32[$vararg_buffer>>2] = $5;
  $vararg_ptr1 = ((($vararg_buffer)) + 4|0);
  HEAP32[$vararg_ptr1>>2] = 21505;
  $vararg_ptr2 = ((($vararg_buffer)) + 8|0);
  HEAP32[$vararg_ptr2>>2] = $tio;
  $6 = (___syscall54(54,($vararg_buffer|0))|0);
  $7 = ($6|0)==(0);
  if (!($7)) {
   $8 = ((($f)) + 75|0);
   HEAP8[$8>>0] = -1;
  }
 }
 $9 = (___stdio_write($f,$buf,$len)|0);
 STACKTOP = sp;return ($9|0);
}
function ___towrite($f) {
 $f = $f|0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0;
 var $8 = 0, $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($f)) + 74|0);
 $1 = HEAP8[$0>>0]|0;
 $2 = $1 << 24 >> 24;
 $3 = (($2) + 255)|0;
 $4 = $3 | $2;
 $5 = $4&255;
 HEAP8[$0>>0] = $5;
 $6 = HEAP32[$f>>2]|0;
 $7 = $6 & 8;
 $8 = ($7|0)==(0);
 if ($8) {
  $10 = ((($f)) + 8|0);
  HEAP32[$10>>2] = 0;
  $11 = ((($f)) + 4|0);
  HEAP32[$11>>2] = 0;
  $12 = ((($f)) + 44|0);
  $13 = HEAP32[$12>>2]|0;
  $14 = ((($f)) + 28|0);
  HEAP32[$14>>2] = $13;
  $15 = ((($f)) + 20|0);
  HEAP32[$15>>2] = $13;
  $16 = $13;
  $17 = ((($f)) + 48|0);
  $18 = HEAP32[$17>>2]|0;
  $19 = (($16) + ($18)|0);
  $20 = ((($f)) + 16|0);
  HEAP32[$20>>2] = $19;
  $$0 = 0;
 } else {
  $9 = $6 | 32;
  HEAP32[$f>>2] = $9;
  $$0 = -1;
 }
 return ($$0|0);
}
function _fflush($f) {
 $f = $f|0;
 var $$0 = 0, $$01 = 0, $$01$2 = 0, $$014 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0;
 var $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $phitmp = 0, $r$0$lcssa = 0, $r$03 = 0, $r$1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($f|0)==(0|0);
 do {
  if ($0) {
   $7 = HEAP32[2000]|0;
   $8 = ($7|0)==(0|0);
   if ($8) {
    $27 = 0;
   } else {
    $9 = HEAP32[2000]|0;
    $10 = (_fflush($9)|0);
    $27 = $10;
   }
   ___lock(((7980)|0));
   $$01$2 = HEAP32[(7976)>>2]|0;
   $11 = ($$01$2|0)==(0|0);
   if ($11) {
    $r$0$lcssa = $27;
   } else {
    $$014 = $$01$2;$r$03 = $27;
    while(1) {
     $12 = ((($$014)) + 76|0);
     $13 = HEAP32[$12>>2]|0;
     $14 = ($13|0)>(-1);
     if ($14) {
      $15 = (___lockfile($$014)|0);
      $24 = $15;
     } else {
      $24 = 0;
     }
     $16 = ((($$014)) + 20|0);
     $17 = HEAP32[$16>>2]|0;
     $18 = ((($$014)) + 28|0);
     $19 = HEAP32[$18>>2]|0;
     $20 = ($17>>>0)>($19>>>0);
     if ($20) {
      $21 = (___fflush_unlocked($$014)|0);
      $22 = $21 | $r$03;
      $r$1 = $22;
     } else {
      $r$1 = $r$03;
     }
     $23 = ($24|0)==(0);
     if (!($23)) {
      ___unlockfile($$014);
     }
     $25 = ((($$014)) + 56|0);
     $$01 = HEAP32[$25>>2]|0;
     $26 = ($$01|0)==(0|0);
     if ($26) {
      $r$0$lcssa = $r$1;
      break;
     } else {
      $$014 = $$01;$r$03 = $r$1;
     }
    }
   }
   ___unlock(((7980)|0));
   $$0 = $r$0$lcssa;
  } else {
   $1 = ((($f)) + 76|0);
   $2 = HEAP32[$1>>2]|0;
   $3 = ($2|0)>(-1);
   if (!($3)) {
    $4 = (___fflush_unlocked($f)|0);
    $$0 = $4;
    break;
   }
   $5 = (___lockfile($f)|0);
   $phitmp = ($5|0)==(0);
   $6 = (___fflush_unlocked($f)|0);
   if ($phitmp) {
    $$0 = $6;
   } else {
    ___unlockfile($f);
    $$0 = $6;
   }
  }
 } while(0);
 return ($$0|0);
}
function ___fwritex($s,$l,$f) {
 $s = $s|0;
 $l = $l|0;
 $f = $f|0;
 var $$0 = 0, $$01 = 0, $$02 = 0, $$pre = 0, $$pre6 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0;
 var $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $i$0 = 0, $i$0$lcssa12 = 0;
 var $i$1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($f)) + 16|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)==(0|0);
 if ($2) {
  $4 = (___towrite($f)|0);
  $5 = ($4|0)==(0);
  if ($5) {
   $$pre = HEAP32[$0>>2]|0;
   $9 = $$pre;
   label = 5;
  } else {
   $$0 = 0;
  }
 } else {
  $3 = $1;
  $9 = $3;
  label = 5;
 }
 L5: do {
  if ((label|0) == 5) {
   $6 = ((($f)) + 20|0);
   $7 = HEAP32[$6>>2]|0;
   $8 = (($9) - ($7))|0;
   $10 = ($8>>>0)<($l>>>0);
   $11 = $7;
   if ($10) {
    $12 = ((($f)) + 36|0);
    $13 = HEAP32[$12>>2]|0;
    $14 = (FUNCTION_TABLE_iiii[$13 & 7]($f,$s,$l)|0);
    $$0 = $14;
    break;
   }
   $15 = ((($f)) + 75|0);
   $16 = HEAP8[$15>>0]|0;
   $17 = ($16<<24>>24)>(-1);
   L10: do {
    if ($17) {
     $i$0 = $l;
     while(1) {
      $18 = ($i$0|0)==(0);
      if ($18) {
       $$01 = $l;$$02 = $s;$29 = $11;$i$1 = 0;
       break L10;
      }
      $19 = (($i$0) + -1)|0;
      $20 = (($s) + ($19)|0);
      $21 = HEAP8[$20>>0]|0;
      $22 = ($21<<24>>24)==(10);
      if ($22) {
       $i$0$lcssa12 = $i$0;
       break;
      } else {
       $i$0 = $19;
      }
     }
     $23 = ((($f)) + 36|0);
     $24 = HEAP32[$23>>2]|0;
     $25 = (FUNCTION_TABLE_iiii[$24 & 7]($f,$s,$i$0$lcssa12)|0);
     $26 = ($25>>>0)<($i$0$lcssa12>>>0);
     if ($26) {
      $$0 = $i$0$lcssa12;
      break L5;
     }
     $27 = (($s) + ($i$0$lcssa12)|0);
     $28 = (($l) - ($i$0$lcssa12))|0;
     $$pre6 = HEAP32[$6>>2]|0;
     $$01 = $28;$$02 = $27;$29 = $$pre6;$i$1 = $i$0$lcssa12;
    } else {
     $$01 = $l;$$02 = $s;$29 = $11;$i$1 = 0;
    }
   } while(0);
   _memcpy(($29|0),($$02|0),($$01|0))|0;
   $30 = HEAP32[$6>>2]|0;
   $31 = (($30) + ($$01)|0);
   HEAP32[$6>>2] = $31;
   $32 = (($i$1) + ($$01))|0;
   $$0 = $32;
  }
 } while(0);
 return ($$0|0);
}
function _printf($fmt,$varargs) {
 $fmt = $fmt|0;
 $varargs = $varargs|0;
 var $0 = 0, $1 = 0, $ap = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 16|0;
 $ap = sp;
 HEAP32[$ap>>2] = $varargs;
 $0 = HEAP32[1999]|0;
 $1 = (_vfprintf($0,$fmt,$ap)|0);
 STACKTOP = sp;return ($1|0);
}
function _vfprintf($f,$fmt,$ap) {
 $f = $f|0;
 $fmt = $fmt|0;
 $ap = $ap|0;
 var $$ = 0, $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0;
 var $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $ap2 = 0, $internal_buf = 0, $nl_arg = 0, $nl_type = 0;
 var $ret$1 = 0, $ret$1$ = 0, $vacopy_currentptr = 0, dest = 0, label = 0, sp = 0, stop = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 224|0;
 $ap2 = sp + 120|0;
 $nl_type = sp + 80|0;
 $nl_arg = sp;
 $internal_buf = sp + 136|0;
 dest=$nl_type; stop=dest+40|0; do { HEAP32[dest>>2]=0|0; dest=dest+4|0; } while ((dest|0) < (stop|0));
 $vacopy_currentptr = HEAP32[$ap>>2]|0;
 HEAP32[$ap2>>2] = $vacopy_currentptr;
 $0 = (_printf_core(0,$fmt,$ap2,$nl_arg,$nl_type)|0);
 $1 = ($0|0)<(0);
 if ($1) {
  $$0 = -1;
 } else {
  $2 = ((($f)) + 76|0);
  $3 = HEAP32[$2>>2]|0;
  $4 = ($3|0)>(-1);
  if ($4) {
   $5 = (___lockfile($f)|0);
   $33 = $5;
  } else {
   $33 = 0;
  }
  $6 = HEAP32[$f>>2]|0;
  $7 = $6 & 32;
  $8 = ((($f)) + 74|0);
  $9 = HEAP8[$8>>0]|0;
  $10 = ($9<<24>>24)<(1);
  if ($10) {
   $11 = $6 & -33;
   HEAP32[$f>>2] = $11;
  }
  $12 = ((($f)) + 48|0);
  $13 = HEAP32[$12>>2]|0;
  $14 = ($13|0)==(0);
  if ($14) {
   $16 = ((($f)) + 44|0);
   $17 = HEAP32[$16>>2]|0;
   HEAP32[$16>>2] = $internal_buf;
   $18 = ((($f)) + 28|0);
   HEAP32[$18>>2] = $internal_buf;
   $19 = ((($f)) + 20|0);
   HEAP32[$19>>2] = $internal_buf;
   HEAP32[$12>>2] = 80;
   $20 = ((($internal_buf)) + 80|0);
   $21 = ((($f)) + 16|0);
   HEAP32[$21>>2] = $20;
   $22 = (_printf_core($f,$fmt,$ap2,$nl_arg,$nl_type)|0);
   $23 = ($17|0)==(0|0);
   if ($23) {
    $ret$1 = $22;
   } else {
    $24 = ((($f)) + 36|0);
    $25 = HEAP32[$24>>2]|0;
    (FUNCTION_TABLE_iiii[$25 & 7]($f,0,0)|0);
    $26 = HEAP32[$19>>2]|0;
    $27 = ($26|0)==(0|0);
    $$ = $27 ? -1 : $22;
    HEAP32[$16>>2] = $17;
    HEAP32[$12>>2] = 0;
    HEAP32[$21>>2] = 0;
    HEAP32[$18>>2] = 0;
    HEAP32[$19>>2] = 0;
    $ret$1 = $$;
   }
  } else {
   $15 = (_printf_core($f,$fmt,$ap2,$nl_arg,$nl_type)|0);
   $ret$1 = $15;
  }
  $28 = HEAP32[$f>>2]|0;
  $29 = $28 & 32;
  $30 = ($29|0)==(0);
  $ret$1$ = $30 ? $ret$1 : -1;
  $31 = $28 | $7;
  HEAP32[$f>>2] = $31;
  $32 = ($33|0)==(0);
  if (!($32)) {
   ___unlockfile($f);
  }
  $$0 = $ret$1$;
 }
 STACKTOP = sp;return ($$0|0);
}
function _memchr($src,$c,$n) {
 $src = $src|0;
 $c = $c|0;
 $n = $n|0;
 var $$0$lcssa = 0, $$0$lcssa30 = 0, $$019 = 0, $$1$lcssa = 0, $$110 = 0, $$110$lcssa = 0, $$24 = 0, $$3 = 0, $$lcssa = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0;
 var $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0;
 var $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $or$cond = 0, $or$cond$18 = 0, $s$0$lcssa = 0, $s$0$lcssa29 = 0, $s$020 = 0, $s$15 = 0, $s$2 = 0, $w$0$lcssa = 0, $w$011 = 0, $w$011$lcssa = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = $c & 255;
 $1 = $src;
 $2 = $1 & 3;
 $3 = ($2|0)!=(0);
 $4 = ($n|0)!=(0);
 $or$cond$18 = $4 & $3;
 L1: do {
  if ($or$cond$18) {
   $5 = $c&255;
   $$019 = $n;$s$020 = $src;
   while(1) {
    $6 = HEAP8[$s$020>>0]|0;
    $7 = ($6<<24>>24)==($5<<24>>24);
    if ($7) {
     $$0$lcssa30 = $$019;$s$0$lcssa29 = $s$020;
     label = 6;
     break L1;
    }
    $8 = ((($s$020)) + 1|0);
    $9 = (($$019) + -1)|0;
    $10 = $8;
    $11 = $10 & 3;
    $12 = ($11|0)!=(0);
    $13 = ($9|0)!=(0);
    $or$cond = $13 & $12;
    if ($or$cond) {
     $$019 = $9;$s$020 = $8;
    } else {
     $$0$lcssa = $9;$$lcssa = $13;$s$0$lcssa = $8;
     label = 5;
     break;
    }
   }
  } else {
   $$0$lcssa = $n;$$lcssa = $4;$s$0$lcssa = $src;
   label = 5;
  }
 } while(0);
 if ((label|0) == 5) {
  if ($$lcssa) {
   $$0$lcssa30 = $$0$lcssa;$s$0$lcssa29 = $s$0$lcssa;
   label = 6;
  } else {
   $$3 = 0;$s$2 = $s$0$lcssa;
  }
 }
 L8: do {
  if ((label|0) == 6) {
   $14 = HEAP8[$s$0$lcssa29>>0]|0;
   $15 = $c&255;
   $16 = ($14<<24>>24)==($15<<24>>24);
   if ($16) {
    $$3 = $$0$lcssa30;$s$2 = $s$0$lcssa29;
   } else {
    $17 = Math_imul($0, 16843009)|0;
    $18 = ($$0$lcssa30>>>0)>(3);
    L11: do {
     if ($18) {
      $$110 = $$0$lcssa30;$w$011 = $s$0$lcssa29;
      while(1) {
       $19 = HEAP32[$w$011>>2]|0;
       $20 = $19 ^ $17;
       $21 = (($20) + -16843009)|0;
       $22 = $20 & -2139062144;
       $23 = $22 ^ -2139062144;
       $24 = $23 & $21;
       $25 = ($24|0)==(0);
       if (!($25)) {
        $$110$lcssa = $$110;$w$011$lcssa = $w$011;
        break;
       }
       $26 = ((($w$011)) + 4|0);
       $27 = (($$110) + -4)|0;
       $28 = ($27>>>0)>(3);
       if ($28) {
        $$110 = $27;$w$011 = $26;
       } else {
        $$1$lcssa = $27;$w$0$lcssa = $26;
        label = 11;
        break L11;
       }
      }
      $$24 = $$110$lcssa;$s$15 = $w$011$lcssa;
     } else {
      $$1$lcssa = $$0$lcssa30;$w$0$lcssa = $s$0$lcssa29;
      label = 11;
     }
    } while(0);
    if ((label|0) == 11) {
     $29 = ($$1$lcssa|0)==(0);
     if ($29) {
      $$3 = 0;$s$2 = $w$0$lcssa;
      break;
     } else {
      $$24 = $$1$lcssa;$s$15 = $w$0$lcssa;
     }
    }
    while(1) {
     $30 = HEAP8[$s$15>>0]|0;
     $31 = ($30<<24>>24)==($15<<24>>24);
     if ($31) {
      $$3 = $$24;$s$2 = $s$15;
      break L8;
     }
     $32 = ((($s$15)) + 1|0);
     $33 = (($$24) + -1)|0;
     $34 = ($33|0)==(0);
     if ($34) {
      $$3 = 0;$s$2 = $32;
      break;
     } else {
      $$24 = $33;$s$15 = $32;
     }
    }
   }
  }
 } while(0);
 $35 = ($$3|0)!=(0);
 $36 = $35 ? $s$2 : 0;
 return ($36|0);
}
function _strlen($s) {
 $s = $s|0;
 var $$0 = 0, $$01$lcssa = 0, $$014 = 0, $$1$lcssa = 0, $$lcssa20 = 0, $$pn = 0, $$pn$15 = 0, $$pre = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0;
 var $2 = 0, $20 = 0, $21 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $w$0 = 0, $w$0$lcssa = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = $s;
 $1 = $0 & 3;
 $2 = ($1|0)==(0);
 L1: do {
  if ($2) {
   $$01$lcssa = $s;
   label = 4;
  } else {
   $$014 = $s;$21 = $0;
   while(1) {
    $3 = HEAP8[$$014>>0]|0;
    $4 = ($3<<24>>24)==(0);
    if ($4) {
     $$pn = $21;
     break L1;
    }
    $5 = ((($$014)) + 1|0);
    $6 = $5;
    $7 = $6 & 3;
    $8 = ($7|0)==(0);
    if ($8) {
     $$01$lcssa = $5;
     label = 4;
     break;
    } else {
     $$014 = $5;$21 = $6;
    }
   }
  }
 } while(0);
 if ((label|0) == 4) {
  $w$0 = $$01$lcssa;
  while(1) {
   $9 = HEAP32[$w$0>>2]|0;
   $10 = (($9) + -16843009)|0;
   $11 = $9 & -2139062144;
   $12 = $11 ^ -2139062144;
   $13 = $12 & $10;
   $14 = ($13|0)==(0);
   $15 = ((($w$0)) + 4|0);
   if ($14) {
    $w$0 = $15;
   } else {
    $$lcssa20 = $9;$w$0$lcssa = $w$0;
    break;
   }
  }
  $16 = $$lcssa20&255;
  $17 = ($16<<24>>24)==(0);
  if ($17) {
   $$1$lcssa = $w$0$lcssa;
  } else {
   $$pn$15 = $w$0$lcssa;
   while(1) {
    $18 = ((($$pn$15)) + 1|0);
    $$pre = HEAP8[$18>>0]|0;
    $19 = ($$pre<<24>>24)==(0);
    if ($19) {
     $$1$lcssa = $18;
     break;
    } else {
     $$pn$15 = $18;
    }
   }
  }
  $20 = $$1$lcssa;
  $$pn = $20;
 }
 $$0 = (($$pn) - ($0))|0;
 return ($$0|0);
}
function _cleanup_391($p) {
 $p = $p|0;
 var $0 = 0, $1 = 0, $2 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($p)) + 68|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ($1|0)==(0);
 if ($2) {
  ___unlockfile($p);
 }
 return;
}
function ___fflush_unlocked($f) {
 $f = $f|0;
 var $$0 = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0;
 var $9 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($f)) + 20|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = ((($f)) + 28|0);
 $3 = HEAP32[$2>>2]|0;
 $4 = ($1>>>0)>($3>>>0);
 if ($4) {
  $5 = ((($f)) + 36|0);
  $6 = HEAP32[$5>>2]|0;
  (FUNCTION_TABLE_iiii[$6 & 7]($f,0,0)|0);
  $7 = HEAP32[$0>>2]|0;
  $8 = ($7|0)==(0|0);
  if ($8) {
   $$0 = -1;
  } else {
   label = 3;
  }
 } else {
  label = 3;
 }
 if ((label|0) == 3) {
  $9 = ((($f)) + 4|0);
  $10 = HEAP32[$9>>2]|0;
  $11 = ((($f)) + 8|0);
  $12 = HEAP32[$11>>2]|0;
  $13 = ($10>>>0)<($12>>>0);
  if ($13) {
   $14 = ((($f)) + 40|0);
   $15 = HEAP32[$14>>2]|0;
   $16 = $10;
   $17 = $12;
   $18 = (($16) - ($17))|0;
   (FUNCTION_TABLE_iiii[$15 & 7]($f,$18,1)|0);
  }
  $19 = ((($f)) + 16|0);
  HEAP32[$19>>2] = 0;
  HEAP32[$2>>2] = 0;
  HEAP32[$0>>2] = 0;
  HEAP32[$11>>2] = 0;
  HEAP32[$9>>2] = 0;
  $$0 = 0;
 }
 return ($$0|0);
}
function _printf_core($f,$fmt,$ap,$nl_arg,$nl_type) {
 $f = $f|0;
 $fmt = $fmt|0;
 $ap = $ap|0;
 $nl_arg = $nl_arg|0;
 $nl_type = $nl_type|0;
 var $$ = 0, $$$i = 0, $$0 = 0, $$0$i = 0, $$0$lcssa$i = 0, $$012$i = 0, $$013$i = 0, $$03$i$33 = 0, $$07$i = 0.0, $$1$i = 0.0, $$114$i = 0, $$2$i = 0.0, $$20$i = 0.0, $$210$$24$i = 0, $$210$$26$i = 0, $$210$i = 0, $$23$i = 0, $$25$i = 0, $$3$i = 0.0, $$311$i = 0;
 var $$33$i = 0, $$36$i = 0.0, $$4$i = 0.0, $$412$lcssa$i = 0, $$41278$i = 0, $$43 = 0, $$5$lcssa$i = 0, $$589$i = 0, $$a$3$191$i = 0, $$a$3$i = 0, $$a$3192$i = 0, $$fl$4 = 0, $$l10n$0 = 0, $$lcssa = 0, $$lcssa162$i = 0, $$lcssa293 = 0, $$lcssa298 = 0, $$lcssa299 = 0, $$lcssa300 = 0, $$lcssa301 = 0;
 var $$lcssa302 = 0, $$lcssa304 = 0, $$lcssa314 = 0, $$lcssa317 = 0.0, $$lcssa319 = 0, $$neg55$i = 0, $$neg56$i = 0, $$p$$i = 0, $$p$5 = 0, $$p$i = 0, $$pn$i = 0, $$pr$i = 0, $$pr50$i = 0, $$pre = 0, $$pre$i = 0, $$pre$phi190$iZ2D = 0, $$pre170 = 0, $$pre171 = 0, $$pre185$i = 0, $$pre188$i = 0;
 var $$pre189$i = 0, $$z$3$i = 0, $$z$4$i = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0;
 var $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0;
 var $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0;
 var $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0;
 var $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0;
 var $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0;
 var $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0;
 var $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0;
 var $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0;
 var $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0;
 var $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0;
 var $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0;
 var $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0, $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0;
 var $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0, $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0;
 var $348 = 0, $349 = 0, $35 = 0, $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0, $358 = 0.0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0.0, $363 = 0, $364 = 0, $365 = 0;
 var $366 = 0, $367 = 0, $368 = 0, $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0, $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0;
 var $384 = 0, $385 = 0, $386 = 0, $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0.0, $391 = 0.0, $392 = 0, $393 = 0, $394 = 0, $395 = 0, $396 = 0, $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0;
 var $401 = 0, $402 = 0, $403 = 0, $404 = 0, $405 = 0, $406 = 0.0, $407 = 0, $408 = 0, $409 = 0, $41 = 0, $410 = 0.0, $411 = 0.0, $412 = 0.0, $413 = 0.0, $414 = 0.0, $415 = 0.0, $416 = 0, $417 = 0, $418 = 0, $419 = 0;
 var $42 = 0, $420 = 0, $421 = 0, $422 = 0, $423 = 0, $424 = 0, $425 = 0, $426 = 0, $427 = 0, $428 = 0, $429 = 0, $43 = 0, $430 = 0, $431 = 0, $432 = 0, $433 = 0, $434 = 0, $435 = 0, $436 = 0, $437 = 0;
 var $438 = 0, $439 = 0, $44 = 0, $440 = 0, $441 = 0.0, $442 = 0.0, $443 = 0.0, $444 = 0, $445 = 0, $446 = 0, $447 = 0, $448 = 0, $449 = 0, $45 = 0, $450 = 0, $451 = 0, $452 = 0, $453 = 0, $454 = 0, $455 = 0;
 var $456 = 0, $457 = 0, $458 = 0, $459 = 0, $46 = 0, $460 = 0, $461 = 0, $462 = 0, $463 = 0, $464 = 0, $465 = 0, $466 = 0, $467 = 0, $468 = 0, $469 = 0, $47 = 0, $470 = 0, $471 = 0, $472 = 0, $473 = 0;
 var $474 = 0.0, $475 = 0, $476 = 0, $477 = 0, $478 = 0, $479 = 0, $48 = 0, $480 = 0, $481 = 0, $482 = 0.0, $483 = 0.0, $484 = 0.0, $485 = 0, $486 = 0, $487 = 0, $488 = 0, $489 = 0, $49 = 0, $490 = 0, $491 = 0;
 var $492 = 0, $493 = 0, $494 = 0, $495 = 0, $496 = 0, $497 = 0, $498 = 0, $499 = 0, $5 = 0, $50 = 0, $500 = 0, $501 = 0, $502 = 0, $503 = 0, $504 = 0, $505 = 0, $506 = 0, $507 = 0, $508 = 0, $509 = 0;
 var $51 = 0, $510 = 0, $511 = 0, $512 = 0, $513 = 0, $514 = 0, $515 = 0, $516 = 0, $517 = 0, $518 = 0, $519 = 0, $52 = 0, $520 = 0, $521 = 0, $522 = 0, $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0;
 var $528 = 0, $529 = 0, $53 = 0, $530 = 0, $531 = 0, $532 = 0, $533 = 0, $534 = 0, $535 = 0, $536 = 0, $537 = 0, $538 = 0, $539 = 0, $54 = 0, $540 = 0, $541 = 0, $542 = 0, $543 = 0, $544 = 0, $545 = 0;
 var $546 = 0, $547 = 0, $548 = 0, $549 = 0, $55 = 0, $550 = 0, $551 = 0, $552 = 0, $553 = 0, $554 = 0, $555 = 0, $556 = 0, $557 = 0, $558 = 0, $559 = 0, $56 = 0, $560 = 0, $561 = 0, $562 = 0, $563 = 0;
 var $564 = 0, $565 = 0, $566 = 0, $567 = 0, $568 = 0, $569 = 0, $57 = 0, $570 = 0, $571 = 0, $572 = 0, $573 = 0, $574 = 0, $575 = 0, $576 = 0, $577 = 0, $578 = 0, $579 = 0, $58 = 0, $580 = 0, $581 = 0;
 var $582 = 0, $583 = 0, $584 = 0, $585 = 0, $586 = 0, $587 = 0, $588 = 0, $589 = 0, $59 = 0, $590 = 0, $591 = 0, $592 = 0, $593 = 0.0, $594 = 0.0, $595 = 0, $596 = 0.0, $597 = 0, $598 = 0, $599 = 0, $6 = 0;
 var $60 = 0, $600 = 0, $601 = 0, $602 = 0, $603 = 0, $604 = 0, $605 = 0, $606 = 0, $607 = 0, $608 = 0, $609 = 0, $61 = 0, $610 = 0, $611 = 0, $612 = 0, $613 = 0, $614 = 0, $615 = 0, $616 = 0, $617 = 0;
 var $618 = 0, $619 = 0, $62 = 0, $620 = 0, $621 = 0, $622 = 0, $623 = 0, $624 = 0, $625 = 0, $626 = 0, $627 = 0, $628 = 0, $629 = 0, $63 = 0, $630 = 0, $631 = 0, $632 = 0, $633 = 0, $634 = 0, $635 = 0;
 var $636 = 0, $637 = 0, $638 = 0, $639 = 0, $64 = 0, $640 = 0, $641 = 0, $642 = 0, $643 = 0, $644 = 0, $645 = 0, $646 = 0, $647 = 0, $648 = 0, $649 = 0, $65 = 0, $650 = 0, $651 = 0, $652 = 0, $653 = 0;
 var $654 = 0, $655 = 0, $656 = 0, $657 = 0, $658 = 0, $659 = 0, $66 = 0, $660 = 0, $661 = 0, $662 = 0, $663 = 0, $664 = 0, $665 = 0, $666 = 0, $667 = 0, $668 = 0, $669 = 0, $67 = 0, $670 = 0, $671 = 0;
 var $672 = 0, $673 = 0, $674 = 0, $675 = 0, $676 = 0, $677 = 0, $678 = 0, $679 = 0, $68 = 0, $680 = 0, $681 = 0, $682 = 0, $683 = 0, $684 = 0, $685 = 0, $686 = 0, $687 = 0, $688 = 0, $689 = 0, $69 = 0;
 var $690 = 0, $691 = 0, $692 = 0, $693 = 0, $694 = 0, $695 = 0, $696 = 0, $697 = 0, $698 = 0, $699 = 0, $7 = 0, $70 = 0, $700 = 0, $701 = 0, $702 = 0, $703 = 0, $704 = 0, $705 = 0, $706 = 0, $707 = 0;
 var $708 = 0, $709 = 0, $71 = 0, $710 = 0, $711 = 0, $712 = 0, $713 = 0, $714 = 0, $715 = 0, $716 = 0, $717 = 0, $718 = 0, $719 = 0, $72 = 0, $720 = 0, $721 = 0, $722 = 0, $723 = 0, $724 = 0, $725 = 0;
 var $726 = 0, $727 = 0, $728 = 0, $729 = 0, $73 = 0, $730 = 0, $731 = 0, $732 = 0, $733 = 0, $734 = 0, $735 = 0, $736 = 0, $737 = 0, $738 = 0, $739 = 0, $74 = 0, $740 = 0, $741 = 0, $742 = 0, $743 = 0;
 var $744 = 0, $745 = 0, $746 = 0, $747 = 0, $748 = 0, $749 = 0, $75 = 0, $750 = 0, $751 = 0, $752 = 0, $753 = 0, $754 = 0, $755 = 0, $756 = 0, $757 = 0, $758 = 0, $759 = 0, $76 = 0, $760 = 0, $761 = 0;
 var $762 = 0, $763 = 0, $764 = 0, $765 = 0, $766 = 0, $767 = 0, $768 = 0, $769 = 0, $77 = 0, $770 = 0, $771 = 0, $772 = 0, $773 = 0, $774 = 0, $775 = 0, $776 = 0, $777 = 0, $778 = 0, $779 = 0, $78 = 0;
 var $780 = 0, $781 = 0, $782 = 0, $783 = 0, $784 = 0, $785 = 0, $786 = 0, $787 = 0, $788 = 0, $789 = 0, $79 = 0, $790 = 0, $791 = 0, $792 = 0, $793 = 0, $794 = 0, $795 = 0, $796 = 0, $797 = 0, $798 = 0;
 var $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0;
 var $98 = 0, $99 = 0, $a$0 = 0, $a$1 = 0, $a$1$lcssa$i = 0, $a$1149$i = 0, $a$2 = 0, $a$2$ph$i = 0, $a$3$lcssa$i = 0, $a$3136$i = 0, $a$5$lcssa$i = 0, $a$5111$i = 0, $a$6$i = 0, $a$8$i = 0, $a$9$ph$i = 0, $arg = 0, $arglist_current = 0, $arglist_current2 = 0, $arglist_next = 0, $arglist_next3 = 0;
 var $argpos$0 = 0, $big$i = 0, $buf = 0, $buf$i = 0, $carry$0142$i = 0, $carry3$0130$i = 0, $cnt$0 = 0, $cnt$1 = 0, $cnt$1$lcssa = 0, $d$0$141$i = 0, $d$0$i = 0, $d$0143$i = 0, $d$1129$i = 0, $d$2$lcssa$i = 0, $d$2110$i = 0, $d$4$i = 0, $d$584$i = 0, $d$677$i = 0, $d$788$i = 0, $e$0125$i = 0;
 var $e$1$i = 0, $e$2106$i = 0, $e$4$i = 0, $e$5$ph$i = 0, $e2$i = 0, $ebuf0$i = 0, $estr$0$i = 0, $estr$1$lcssa$i = 0, $estr$195$i = 0, $estr$2$i = 0, $exitcond$i = 0, $expanded = 0, $expanded10 = 0, $expanded11 = 0, $expanded13 = 0, $expanded14 = 0, $expanded15 = 0, $expanded4 = 0, $expanded6 = 0, $expanded7 = 0;
 var $expanded8 = 0, $fl$0100 = 0, $fl$053 = 0, $fl$1 = 0, $fl$1$ = 0, $fl$3 = 0, $fl$4 = 0, $fl$6 = 0, $i$0$lcssa = 0, $i$0$lcssa178 = 0, $i$0105 = 0, $i$0124$i = 0, $i$03$i = 0, $i$03$i$25 = 0, $i$1$lcssa$i = 0, $i$1116 = 0, $i$1118$i = 0, $i$2105$i = 0, $i$291 = 0, $i$291$lcssa = 0;
 var $i$3101$i = 0, $i$389 = 0, $isdigit = 0, $isdigit$2$i = 0, $isdigit$2$i$23 = 0, $isdigit$i = 0, $isdigit$i$27 = 0, $isdigit10 = 0, $isdigit12 = 0, $isdigittmp = 0, $isdigittmp$ = 0, $isdigittmp$1$i = 0, $isdigittmp$1$i$22 = 0, $isdigittmp$i = 0, $isdigittmp$i$26 = 0, $isdigittmp11 = 0, $isdigittmp4$i = 0, $isdigittmp4$i$24 = 0, $isdigittmp9 = 0, $j$0$117$i = 0;
 var $j$0$i = 0, $j$0119$i = 0, $j$1102$i = 0, $j$2$i = 0, $l$0 = 0, $l$0$i = 0, $l$1$i = 0, $l$1104 = 0, $l$2 = 0, $l10n$0 = 0, $l10n$0$lcssa = 0, $l10n$0$phi = 0, $l10n$1 = 0, $l10n$2 = 0, $l10n$3 = 0, $mb = 0, $notlhs$i = 0, $notrhs$i = 0, $or$cond = 0, $or$cond$i = 0;
 var $or$cond122 = 0, $or$cond15 = 0, $or$cond17 = 0, $or$cond18$i = 0, $or$cond20 = 0, $or$cond22$i = 0, $or$cond3$not$i = 0, $or$cond31$i = 0, $or$cond6$i = 0, $p$0 = 0, $p$0$ = 0, $p$1 = 0, $p$2 = 0, $p$2$ = 0, $p$3 = 0, $p$4176 = 0, $p$5 = 0, $pl$0 = 0, $pl$0$i = 0, $pl$1 = 0;
 var $pl$1$i = 0, $pl$2 = 0, $prefix$0 = 0, $prefix$0$$i = 0, $prefix$0$i = 0, $prefix$1 = 0, $prefix$2 = 0, $r$0$a$9$i = 0, $re$171$i = 0, $round$070$i = 0.0, $round6$1$i = 0.0, $s$0 = 0, $s$0$i = 0, $s$1 = 0, $s$1$i = 0, $s$1$i$lcssa = 0, $s$2$lcssa = 0, $s$292 = 0, $s$4 = 0, $s$6 = 0;
 var $s$7 = 0, $s$7$lcssa296 = 0, $s1$0$i = 0, $s7$081$i = 0, $s7$1$i = 0, $s8$0$lcssa$i = 0, $s8$072$i = 0, $s9$0$i = 0, $s9$185$i = 0, $s9$2$i = 0, $scevgep182$i = 0, $scevgep182183$i = 0, $small$0$i = 0.0, $small$1$i = 0.0, $st$0 = 0, $st$0$lcssa297 = 0, $storemerge = 0, $storemerge$13 = 0, $storemerge$851 = 0, $storemerge$899 = 0;
 var $sum = 0, $t$0 = 0, $t$1 = 0, $w$$i = 0, $w$0 = 0, $w$1 = 0, $w$2 = 0, $w$32$i = 0, $wc = 0, $ws$0106 = 0, $ws$1117 = 0, $z$0$i = 0, $z$0$lcssa = 0, $z$093 = 0, $z$1 = 0, $z$1$lcssa$i = 0, $z$1148$i = 0, $z$2 = 0, $z$2$i = 0, $z$2$i$lcssa = 0;
 var $z$3$lcssa$i = 0, $z$3135$i = 0, $z$4$i = 0, $z$7$$i = 0, $z$7$i = 0, $z$7$i$lcssa = 0, $z$7$ph$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 624|0;
 $big$i = sp + 24|0;
 $e2$i = sp + 16|0;
 $buf$i = sp + 588|0;
 $ebuf0$i = sp + 576|0;
 $arg = sp;
 $buf = sp + 536|0;
 $wc = sp + 8|0;
 $mb = sp + 528|0;
 $0 = ($f|0)!=(0|0);
 $1 = ((($buf)) + 40|0);
 $2 = $1;
 $3 = ((($buf)) + 39|0);
 $4 = ((($wc)) + 4|0);
 $5 = $buf$i;
 $6 = (0 - ($5))|0;
 $7 = ((($ebuf0$i)) + 12|0);
 $8 = ((($ebuf0$i)) + 11|0);
 $9 = $7;
 $10 = (($9) - ($5))|0;
 $11 = (-2 - ($5))|0;
 $12 = (($9) + 2)|0;
 $13 = ((($big$i)) + 288|0);
 $14 = ((($buf$i)) + 9|0);
 $15 = $14;
 $16 = ((($buf$i)) + 8|0);
 $cnt$0 = 0;$l$0 = 0;$l10n$0 = 0;$s$0 = $fmt;
 L1: while(1) {
  $17 = ($cnt$0|0)>(-1);
  do {
   if ($17) {
    $18 = (2147483647 - ($cnt$0))|0;
    $19 = ($l$0|0)>($18|0);
    if ($19) {
     $20 = (___errno_location()|0);
     HEAP32[$20>>2] = 75;
     $cnt$1 = -1;
     break;
    } else {
     $21 = (($l$0) + ($cnt$0))|0;
     $cnt$1 = $21;
     break;
    }
   } else {
    $cnt$1 = $cnt$0;
   }
  } while(0);
  $22 = HEAP8[$s$0>>0]|0;
  $23 = ($22<<24>>24)==(0);
  if ($23) {
   $cnt$1$lcssa = $cnt$1;$l10n$0$lcssa = $l10n$0;
   label = 244;
   break;
  } else {
   $24 = $22;$s$1 = $s$0;
  }
  L9: while(1) {
   switch ($24<<24>>24) {
   case 37:  {
    $s$292 = $s$1;$z$093 = $s$1;
    label = 9;
    break L9;
    break;
   }
   case 0:  {
    $s$2$lcssa = $s$1;$z$0$lcssa = $s$1;
    break L9;
    break;
   }
   default: {
   }
   }
   $25 = ((($s$1)) + 1|0);
   $$pre = HEAP8[$25>>0]|0;
   $24 = $$pre;$s$1 = $25;
  }
  L12: do {
   if ((label|0) == 9) {
    while(1) {
     label = 0;
     $26 = ((($s$292)) + 1|0);
     $27 = HEAP8[$26>>0]|0;
     $28 = ($27<<24>>24)==(37);
     if (!($28)) {
      $s$2$lcssa = $s$292;$z$0$lcssa = $z$093;
      break L12;
     }
     $29 = ((($z$093)) + 1|0);
     $30 = ((($s$292)) + 2|0);
     $31 = HEAP8[$30>>0]|0;
     $32 = ($31<<24>>24)==(37);
     if ($32) {
      $s$292 = $30;$z$093 = $29;
      label = 9;
     } else {
      $s$2$lcssa = $30;$z$0$lcssa = $29;
      break;
     }
    }
   }
  } while(0);
  $33 = $z$0$lcssa;
  $34 = $s$0;
  $35 = (($33) - ($34))|0;
  if ($0) {
   $36 = HEAP32[$f>>2]|0;
   $37 = $36 & 32;
   $38 = ($37|0)==(0);
   if ($38) {
    (___fwritex($s$0,$35,$f)|0);
   }
  }
  $39 = ($z$0$lcssa|0)==($s$0|0);
  if (!($39)) {
   $l10n$0$phi = $l10n$0;$cnt$0 = $cnt$1;$l$0 = $35;$s$0 = $s$2$lcssa;$l10n$0 = $l10n$0$phi;
   continue;
  }
  $40 = ((($s$2$lcssa)) + 1|0);
  $41 = HEAP8[$40>>0]|0;
  $42 = $41 << 24 >> 24;
  $isdigittmp = (($42) + -48)|0;
  $isdigit = ($isdigittmp>>>0)<(10);
  if ($isdigit) {
   $43 = ((($s$2$lcssa)) + 2|0);
   $44 = HEAP8[$43>>0]|0;
   $45 = ($44<<24>>24)==(36);
   $46 = ((($s$2$lcssa)) + 3|0);
   $$43 = $45 ? $46 : $40;
   $$l10n$0 = $45 ? 1 : $l10n$0;
   $isdigittmp$ = $45 ? $isdigittmp : -1;
   $$pre170 = HEAP8[$$43>>0]|0;
   $48 = $$pre170;$argpos$0 = $isdigittmp$;$l10n$1 = $$l10n$0;$storemerge = $$43;
  } else {
   $48 = $41;$argpos$0 = -1;$l10n$1 = $l10n$0;$storemerge = $40;
  }
  $47 = $48 << 24 >> 24;
  $49 = $47 & -32;
  $50 = ($49|0)==(32);
  L25: do {
   if ($50) {
    $52 = $47;$57 = $48;$fl$0100 = 0;$storemerge$899 = $storemerge;
    while(1) {
     $51 = (($52) + -32)|0;
     $53 = 1 << $51;
     $54 = $53 & 75913;
     $55 = ($54|0)==(0);
     if ($55) {
      $67 = $57;$fl$053 = $fl$0100;$storemerge$851 = $storemerge$899;
      break L25;
     }
     $56 = $57 << 24 >> 24;
     $58 = (($56) + -32)|0;
     $59 = 1 << $58;
     $60 = $59 | $fl$0100;
     $61 = ((($storemerge$899)) + 1|0);
     $62 = HEAP8[$61>>0]|0;
     $63 = $62 << 24 >> 24;
     $64 = $63 & -32;
     $65 = ($64|0)==(32);
     if ($65) {
      $52 = $63;$57 = $62;$fl$0100 = $60;$storemerge$899 = $61;
     } else {
      $67 = $62;$fl$053 = $60;$storemerge$851 = $61;
      break;
     }
    }
   } else {
    $67 = $48;$fl$053 = 0;$storemerge$851 = $storemerge;
   }
  } while(0);
  $66 = ($67<<24>>24)==(42);
  do {
   if ($66) {
    $68 = ((($storemerge$851)) + 1|0);
    $69 = HEAP8[$68>>0]|0;
    $70 = $69 << 24 >> 24;
    $isdigittmp11 = (($70) + -48)|0;
    $isdigit12 = ($isdigittmp11>>>0)<(10);
    if ($isdigit12) {
     $71 = ((($storemerge$851)) + 2|0);
     $72 = HEAP8[$71>>0]|0;
     $73 = ($72<<24>>24)==(36);
     if ($73) {
      $74 = (($nl_type) + ($isdigittmp11<<2)|0);
      HEAP32[$74>>2] = 10;
      $75 = HEAP8[$68>>0]|0;
      $76 = $75 << 24 >> 24;
      $77 = (($76) + -48)|0;
      $78 = (($nl_arg) + ($77<<3)|0);
      $79 = $78;
      $80 = $79;
      $81 = HEAP32[$80>>2]|0;
      $82 = (($79) + 4)|0;
      $83 = $82;
      $84 = HEAP32[$83>>2]|0;
      $85 = ((($storemerge$851)) + 3|0);
      $l10n$2 = 1;$storemerge$13 = $85;$w$0 = $81;
     } else {
      label = 24;
     }
    } else {
     label = 24;
    }
    if ((label|0) == 24) {
     label = 0;
     $86 = ($l10n$1|0)==(0);
     if (!($86)) {
      $$0 = -1;
      break L1;
     }
     if (!($0)) {
      $fl$1 = $fl$053;$l10n$3 = 0;$s$4 = $68;$w$1 = 0;
      break;
     }
     $arglist_current = HEAP32[$ap>>2]|0;
     $87 = $arglist_current;
     $88 = ((0) + 4|0);
     $expanded4 = $88;
     $expanded = (($expanded4) - 1)|0;
     $89 = (($87) + ($expanded))|0;
     $90 = ((0) + 4|0);
     $expanded8 = $90;
     $expanded7 = (($expanded8) - 1)|0;
     $expanded6 = $expanded7 ^ -1;
     $91 = $89 & $expanded6;
     $92 = $91;
     $93 = HEAP32[$92>>2]|0;
     $arglist_next = ((($92)) + 4|0);
     HEAP32[$ap>>2] = $arglist_next;
     $l10n$2 = 0;$storemerge$13 = $68;$w$0 = $93;
    }
    $94 = ($w$0|0)<(0);
    if ($94) {
     $95 = $fl$053 | 8192;
     $96 = (0 - ($w$0))|0;
     $fl$1 = $95;$l10n$3 = $l10n$2;$s$4 = $storemerge$13;$w$1 = $96;
    } else {
     $fl$1 = $fl$053;$l10n$3 = $l10n$2;$s$4 = $storemerge$13;$w$1 = $w$0;
    }
   } else {
    $97 = $67 << 24 >> 24;
    $isdigittmp$1$i = (($97) + -48)|0;
    $isdigit$2$i = ($isdigittmp$1$i>>>0)<(10);
    if ($isdigit$2$i) {
     $101 = $storemerge$851;$i$03$i = 0;$isdigittmp4$i = $isdigittmp$1$i;
     while(1) {
      $98 = ($i$03$i*10)|0;
      $99 = (($98) + ($isdigittmp4$i))|0;
      $100 = ((($101)) + 1|0);
      $102 = HEAP8[$100>>0]|0;
      $103 = $102 << 24 >> 24;
      $isdigittmp$i = (($103) + -48)|0;
      $isdigit$i = ($isdigittmp$i>>>0)<(10);
      if ($isdigit$i) {
       $101 = $100;$i$03$i = $99;$isdigittmp4$i = $isdigittmp$i;
      } else {
       $$lcssa = $99;$$lcssa293 = $100;
       break;
      }
     }
     $104 = ($$lcssa|0)<(0);
     if ($104) {
      $$0 = -1;
      break L1;
     } else {
      $fl$1 = $fl$053;$l10n$3 = $l10n$1;$s$4 = $$lcssa293;$w$1 = $$lcssa;
     }
    } else {
     $fl$1 = $fl$053;$l10n$3 = $l10n$1;$s$4 = $storemerge$851;$w$1 = 0;
    }
   }
  } while(0);
  $105 = HEAP8[$s$4>>0]|0;
  $106 = ($105<<24>>24)==(46);
  L46: do {
   if ($106) {
    $107 = ((($s$4)) + 1|0);
    $108 = HEAP8[$107>>0]|0;
    $109 = ($108<<24>>24)==(42);
    if (!($109)) {
     $136 = $108 << 24 >> 24;
     $isdigittmp$1$i$22 = (($136) + -48)|0;
     $isdigit$2$i$23 = ($isdigittmp$1$i$22>>>0)<(10);
     if ($isdigit$2$i$23) {
      $140 = $107;$i$03$i$25 = 0;$isdigittmp4$i$24 = $isdigittmp$1$i$22;
     } else {
      $p$0 = 0;$s$6 = $107;
      break;
     }
     while(1) {
      $137 = ($i$03$i$25*10)|0;
      $138 = (($137) + ($isdigittmp4$i$24))|0;
      $139 = ((($140)) + 1|0);
      $141 = HEAP8[$139>>0]|0;
      $142 = $141 << 24 >> 24;
      $isdigittmp$i$26 = (($142) + -48)|0;
      $isdigit$i$27 = ($isdigittmp$i$26>>>0)<(10);
      if ($isdigit$i$27) {
       $140 = $139;$i$03$i$25 = $138;$isdigittmp4$i$24 = $isdigittmp$i$26;
      } else {
       $p$0 = $138;$s$6 = $139;
       break L46;
      }
     }
    }
    $110 = ((($s$4)) + 2|0);
    $111 = HEAP8[$110>>0]|0;
    $112 = $111 << 24 >> 24;
    $isdigittmp9 = (($112) + -48)|0;
    $isdigit10 = ($isdigittmp9>>>0)<(10);
    if ($isdigit10) {
     $113 = ((($s$4)) + 3|0);
     $114 = HEAP8[$113>>0]|0;
     $115 = ($114<<24>>24)==(36);
     if ($115) {
      $116 = (($nl_type) + ($isdigittmp9<<2)|0);
      HEAP32[$116>>2] = 10;
      $117 = HEAP8[$110>>0]|0;
      $118 = $117 << 24 >> 24;
      $119 = (($118) + -48)|0;
      $120 = (($nl_arg) + ($119<<3)|0);
      $121 = $120;
      $122 = $121;
      $123 = HEAP32[$122>>2]|0;
      $124 = (($121) + 4)|0;
      $125 = $124;
      $126 = HEAP32[$125>>2]|0;
      $127 = ((($s$4)) + 4|0);
      $p$0 = $123;$s$6 = $127;
      break;
     }
    }
    $128 = ($l10n$3|0)==(0);
    if (!($128)) {
     $$0 = -1;
     break L1;
    }
    if ($0) {
     $arglist_current2 = HEAP32[$ap>>2]|0;
     $129 = $arglist_current2;
     $130 = ((0) + 4|0);
     $expanded11 = $130;
     $expanded10 = (($expanded11) - 1)|0;
     $131 = (($129) + ($expanded10))|0;
     $132 = ((0) + 4|0);
     $expanded15 = $132;
     $expanded14 = (($expanded15) - 1)|0;
     $expanded13 = $expanded14 ^ -1;
     $133 = $131 & $expanded13;
     $134 = $133;
     $135 = HEAP32[$134>>2]|0;
     $arglist_next3 = ((($134)) + 4|0);
     HEAP32[$ap>>2] = $arglist_next3;
     $p$0 = $135;$s$6 = $110;
    } else {
     $p$0 = 0;$s$6 = $110;
    }
   } else {
    $p$0 = -1;$s$6 = $s$4;
   }
  } while(0);
  $s$7 = $s$6;$st$0 = 0;
  while(1) {
   $143 = HEAP8[$s$7>>0]|0;
   $144 = $143 << 24 >> 24;
   $145 = (($144) + -65)|0;
   $146 = ($145>>>0)>(57);
   if ($146) {
    $$0 = -1;
    break L1;
   }
   $147 = ((($s$7)) + 1|0);
   $148 = ((18981 + (($st$0*58)|0)|0) + ($145)|0);
   $149 = HEAP8[$148>>0]|0;
   $150 = $149&255;
   $151 = (($150) + -1)|0;
   $152 = ($151>>>0)<(8);
   if ($152) {
    $s$7 = $147;$st$0 = $150;
   } else {
    $$lcssa298 = $147;$$lcssa299 = $149;$$lcssa300 = $150;$s$7$lcssa296 = $s$7;$st$0$lcssa297 = $st$0;
    break;
   }
  }
  $153 = ($$lcssa299<<24>>24)==(0);
  if ($153) {
   $$0 = -1;
   break;
  }
  $154 = ($$lcssa299<<24>>24)==(19);
  $155 = ($argpos$0|0)>(-1);
  do {
   if ($154) {
    if ($155) {
     $$0 = -1;
     break L1;
    } else {
     label = 52;
    }
   } else {
    if ($155) {
     $156 = (($nl_type) + ($argpos$0<<2)|0);
     HEAP32[$156>>2] = $$lcssa300;
     $157 = (($nl_arg) + ($argpos$0<<3)|0);
     $158 = $157;
     $159 = $158;
     $160 = HEAP32[$159>>2]|0;
     $161 = (($158) + 4)|0;
     $162 = $161;
     $163 = HEAP32[$162>>2]|0;
     $164 = $arg;
     $165 = $164;
     HEAP32[$165>>2] = $160;
     $166 = (($164) + 4)|0;
     $167 = $166;
     HEAP32[$167>>2] = $163;
     label = 52;
     break;
    }
    if (!($0)) {
     $$0 = 0;
     break L1;
    }
    _pop_arg($arg,$$lcssa300,$ap);
   }
  } while(0);
  if ((label|0) == 52) {
   label = 0;
   if (!($0)) {
    $cnt$0 = $cnt$1;$l$0 = $35;$l10n$0 = $l10n$3;$s$0 = $$lcssa298;
    continue;
   }
  }
  $168 = HEAP8[$s$7$lcssa296>>0]|0;
  $169 = $168 << 24 >> 24;
  $170 = ($st$0$lcssa297|0)!=(0);
  $171 = $169 & 15;
  $172 = ($171|0)==(3);
  $or$cond15 = $170 & $172;
  $173 = $169 & -33;
  $t$0 = $or$cond15 ? $173 : $169;
  $174 = $fl$1 & 8192;
  $175 = ($174|0)==(0);
  $176 = $fl$1 & -65537;
  $fl$1$ = $175 ? $fl$1 : $176;
  L75: do {
   switch ($t$0|0) {
   case 110:  {
    switch ($st$0$lcssa297|0) {
    case 0:  {
     $183 = HEAP32[$arg>>2]|0;
     HEAP32[$183>>2] = $cnt$1;
     $cnt$0 = $cnt$1;$l$0 = $35;$l10n$0 = $l10n$3;$s$0 = $$lcssa298;
     continue L1;
     break;
    }
    case 1:  {
     $184 = HEAP32[$arg>>2]|0;
     HEAP32[$184>>2] = $cnt$1;
     $cnt$0 = $cnt$1;$l$0 = $35;$l10n$0 = $l10n$3;$s$0 = $$lcssa298;
     continue L1;
     break;
    }
    case 2:  {
     $185 = ($cnt$1|0)<(0);
     $186 = $185 << 31 >> 31;
     $187 = HEAP32[$arg>>2]|0;
     $188 = $187;
     $189 = $188;
     HEAP32[$189>>2] = $cnt$1;
     $190 = (($188) + 4)|0;
     $191 = $190;
     HEAP32[$191>>2] = $186;
     $cnt$0 = $cnt$1;$l$0 = $35;$l10n$0 = $l10n$3;$s$0 = $$lcssa298;
     continue L1;
     break;
    }
    case 3:  {
     $192 = $cnt$1&65535;
     $193 = HEAP32[$arg>>2]|0;
     HEAP16[$193>>1] = $192;
     $cnt$0 = $cnt$1;$l$0 = $35;$l10n$0 = $l10n$3;$s$0 = $$lcssa298;
     continue L1;
     break;
    }
    case 4:  {
     $194 = $cnt$1&255;
     $195 = HEAP32[$arg>>2]|0;
     HEAP8[$195>>0] = $194;
     $cnt$0 = $cnt$1;$l$0 = $35;$l10n$0 = $l10n$3;$s$0 = $$lcssa298;
     continue L1;
     break;
    }
    case 6:  {
     $196 = HEAP32[$arg>>2]|0;
     HEAP32[$196>>2] = $cnt$1;
     $cnt$0 = $cnt$1;$l$0 = $35;$l10n$0 = $l10n$3;$s$0 = $$lcssa298;
     continue L1;
     break;
    }
    case 7:  {
     $197 = ($cnt$1|0)<(0);
     $198 = $197 << 31 >> 31;
     $199 = HEAP32[$arg>>2]|0;
     $200 = $199;
     $201 = $200;
     HEAP32[$201>>2] = $cnt$1;
     $202 = (($200) + 4)|0;
     $203 = $202;
     HEAP32[$203>>2] = $198;
     $cnt$0 = $cnt$1;$l$0 = $35;$l10n$0 = $l10n$3;$s$0 = $$lcssa298;
     continue L1;
     break;
    }
    default: {
     $cnt$0 = $cnt$1;$l$0 = $35;$l10n$0 = $l10n$3;$s$0 = $$lcssa298;
     continue L1;
    }
    }
    break;
   }
   case 112:  {
    $204 = ($p$0>>>0)>(8);
    $205 = $204 ? $p$0 : 8;
    $206 = $fl$1$ | 8;
    $fl$3 = $206;$p$1 = $205;$t$1 = 120;
    label = 64;
    break;
   }
   case 88: case 120:  {
    $fl$3 = $fl$1$;$p$1 = $p$0;$t$1 = $t$0;
    label = 64;
    break;
   }
   case 111:  {
    $244 = $arg;
    $245 = $244;
    $246 = HEAP32[$245>>2]|0;
    $247 = (($244) + 4)|0;
    $248 = $247;
    $249 = HEAP32[$248>>2]|0;
    $250 = ($246|0)==(0);
    $251 = ($249|0)==(0);
    $252 = $250 & $251;
    if ($252) {
     $$0$lcssa$i = $1;
    } else {
     $$03$i$33 = $1;$254 = $246;$258 = $249;
     while(1) {
      $253 = $254 & 7;
      $255 = $253 | 48;
      $256 = $255&255;
      $257 = ((($$03$i$33)) + -1|0);
      HEAP8[$257>>0] = $256;
      $259 = (_bitshift64Lshr(($254|0),($258|0),3)|0);
      $260 = tempRet0;
      $261 = ($259|0)==(0);
      $262 = ($260|0)==(0);
      $263 = $261 & $262;
      if ($263) {
       $$0$lcssa$i = $257;
       break;
      } else {
       $$03$i$33 = $257;$254 = $259;$258 = $260;
      }
     }
    }
    $264 = $fl$1$ & 8;
    $265 = ($264|0)==(0);
    if ($265) {
     $a$0 = $$0$lcssa$i;$fl$4 = $fl$1$;$p$2 = $p$0;$pl$1 = 0;$prefix$1 = 19461;
     label = 77;
    } else {
     $266 = $$0$lcssa$i;
     $267 = (($2) - ($266))|0;
     $268 = ($p$0|0)>($267|0);
     $269 = (($267) + 1)|0;
     $p$0$ = $268 ? $p$0 : $269;
     $a$0 = $$0$lcssa$i;$fl$4 = $fl$1$;$p$2 = $p$0$;$pl$1 = 0;$prefix$1 = 19461;
     label = 77;
    }
    break;
   }
   case 105: case 100:  {
    $270 = $arg;
    $271 = $270;
    $272 = HEAP32[$271>>2]|0;
    $273 = (($270) + 4)|0;
    $274 = $273;
    $275 = HEAP32[$274>>2]|0;
    $276 = ($275|0)<(0);
    if ($276) {
     $277 = (_i64Subtract(0,0,($272|0),($275|0))|0);
     $278 = tempRet0;
     $279 = $arg;
     $280 = $279;
     HEAP32[$280>>2] = $277;
     $281 = (($279) + 4)|0;
     $282 = $281;
     HEAP32[$282>>2] = $278;
     $287 = $277;$288 = $278;$pl$0 = 1;$prefix$0 = 19461;
     label = 76;
     break L75;
    }
    $283 = $fl$1$ & 2048;
    $284 = ($283|0)==(0);
    if ($284) {
     $285 = $fl$1$ & 1;
     $286 = ($285|0)==(0);
     $$ = $286 ? 19461 : (19463);
     $287 = $272;$288 = $275;$pl$0 = $285;$prefix$0 = $$;
     label = 76;
    } else {
     $287 = $272;$288 = $275;$pl$0 = 1;$prefix$0 = (19462);
     label = 76;
    }
    break;
   }
   case 117:  {
    $177 = $arg;
    $178 = $177;
    $179 = HEAP32[$178>>2]|0;
    $180 = (($177) + 4)|0;
    $181 = $180;
    $182 = HEAP32[$181>>2]|0;
    $287 = $179;$288 = $182;$pl$0 = 0;$prefix$0 = 19461;
    label = 76;
    break;
   }
   case 99:  {
    $308 = $arg;
    $309 = $308;
    $310 = HEAP32[$309>>2]|0;
    $311 = (($308) + 4)|0;
    $312 = $311;
    $313 = HEAP32[$312>>2]|0;
    $314 = $310&255;
    HEAP8[$3>>0] = $314;
    $a$2 = $3;$fl$6 = $176;$p$5 = 1;$pl$2 = 0;$prefix$2 = 19461;$z$2 = $1;
    break;
   }
   case 109:  {
    $315 = (___errno_location()|0);
    $316 = HEAP32[$315>>2]|0;
    $317 = (_strerror($316)|0);
    $a$1 = $317;
    label = 82;
    break;
   }
   case 115:  {
    $318 = HEAP32[$arg>>2]|0;
    $319 = ($318|0)!=(0|0);
    $320 = $319 ? $318 : 19471;
    $a$1 = $320;
    label = 82;
    break;
   }
   case 67:  {
    $327 = $arg;
    $328 = $327;
    $329 = HEAP32[$328>>2]|0;
    $330 = (($327) + 4)|0;
    $331 = $330;
    $332 = HEAP32[$331>>2]|0;
    HEAP32[$wc>>2] = $329;
    HEAP32[$4>>2] = 0;
    HEAP32[$arg>>2] = $wc;
    $798 = $wc;$p$4176 = -1;
    label = 86;
    break;
   }
   case 83:  {
    $$pre171 = HEAP32[$arg>>2]|0;
    $333 = ($p$0|0)==(0);
    if ($333) {
     _pad($f,32,$w$1,0,$fl$1$);
     $i$0$lcssa178 = 0;
     label = 97;
    } else {
     $798 = $$pre171;$p$4176 = $p$0;
     label = 86;
    }
    break;
   }
   case 65: case 71: case 70: case 69: case 97: case 103: case 102: case 101:  {
    $358 = +HEAPF64[$arg>>3];
    HEAP32[$e2$i>>2] = 0;
    HEAPF64[tempDoublePtr>>3] = $358;$359 = HEAP32[tempDoublePtr>>2]|0;
    $360 = HEAP32[tempDoublePtr+4>>2]|0;
    $361 = ($360|0)<(0);
    if ($361) {
     $362 = -$358;
     $$07$i = $362;$pl$0$i = 1;$prefix$0$i = 19478;
    } else {
     $363 = $fl$1$ & 2048;
     $364 = ($363|0)==(0);
     if ($364) {
      $365 = $fl$1$ & 1;
      $366 = ($365|0)==(0);
      $$$i = $366 ? (19479) : (19484);
      $$07$i = $358;$pl$0$i = $365;$prefix$0$i = $$$i;
     } else {
      $$07$i = $358;$pl$0$i = 1;$prefix$0$i = (19481);
     }
    }
    HEAPF64[tempDoublePtr>>3] = $$07$i;$367 = HEAP32[tempDoublePtr>>2]|0;
    $368 = HEAP32[tempDoublePtr+4>>2]|0;
    $369 = $368 & 2146435072;
    $370 = ($369>>>0)<(2146435072);
    $371 = (0)<(0);
    $372 = ($369|0)==(2146435072);
    $373 = $372 & $371;
    $374 = $370 | $373;
    do {
     if ($374) {
      $390 = (+_frexpl($$07$i,$e2$i));
      $391 = $390 * 2.0;
      $392 = $391 != 0.0;
      if ($392) {
       $393 = HEAP32[$e2$i>>2]|0;
       $394 = (($393) + -1)|0;
       HEAP32[$e2$i>>2] = $394;
      }
      $395 = $t$0 | 32;
      $396 = ($395|0)==(97);
      if ($396) {
       $397 = $t$0 & 32;
       $398 = ($397|0)==(0);
       $399 = ((($prefix$0$i)) + 9|0);
       $prefix$0$$i = $398 ? $prefix$0$i : $399;
       $400 = $pl$0$i | 2;
       $401 = ($p$0>>>0)>(11);
       $402 = (12 - ($p$0))|0;
       $403 = ($402|0)==(0);
       $404 = $401 | $403;
       do {
        if ($404) {
         $$1$i = $391;
        } else {
         $re$171$i = $402;$round$070$i = 8.0;
         while(1) {
          $405 = (($re$171$i) + -1)|0;
          $406 = $round$070$i * 16.0;
          $407 = ($405|0)==(0);
          if ($407) {
           $$lcssa317 = $406;
           break;
          } else {
           $re$171$i = $405;$round$070$i = $406;
          }
         }
         $408 = HEAP8[$prefix$0$$i>>0]|0;
         $409 = ($408<<24>>24)==(45);
         if ($409) {
          $410 = -$391;
          $411 = $410 - $$lcssa317;
          $412 = $$lcssa317 + $411;
          $413 = -$412;
          $$1$i = $413;
          break;
         } else {
          $414 = $391 + $$lcssa317;
          $415 = $414 - $$lcssa317;
          $$1$i = $415;
          break;
         }
        }
       } while(0);
       $416 = HEAP32[$e2$i>>2]|0;
       $417 = ($416|0)<(0);
       $418 = (0 - ($416))|0;
       $419 = $417 ? $418 : $416;
       $420 = ($419|0)<(0);
       $421 = $420 << 31 >> 31;
       $422 = (_fmt_u($419,$421,$7)|0);
       $423 = ($422|0)==($7|0);
       if ($423) {
        HEAP8[$8>>0] = 48;
        $estr$0$i = $8;
       } else {
        $estr$0$i = $422;
       }
       $424 = $416 >> 31;
       $425 = $424 & 2;
       $426 = (($425) + 43)|0;
       $427 = $426&255;
       $428 = ((($estr$0$i)) + -1|0);
       HEAP8[$428>>0] = $427;
       $429 = (($t$0) + 15)|0;
       $430 = $429&255;
       $431 = ((($estr$0$i)) + -2|0);
       HEAP8[$431>>0] = $430;
       $notrhs$i = ($p$0|0)<(1);
       $432 = $fl$1$ & 8;
       $433 = ($432|0)==(0);
       $$2$i = $$1$i;$s$0$i = $buf$i;
       while(1) {
        $434 = (~~(($$2$i)));
        $435 = (19445 + ($434)|0);
        $436 = HEAP8[$435>>0]|0;
        $437 = $436&255;
        $438 = $437 | $397;
        $439 = $438&255;
        $440 = ((($s$0$i)) + 1|0);
        HEAP8[$s$0$i>>0] = $439;
        $441 = (+($434|0));
        $442 = $$2$i - $441;
        $443 = $442 * 16.0;
        $444 = $440;
        $445 = (($444) - ($5))|0;
        $446 = ($445|0)==(1);
        do {
         if ($446) {
          $notlhs$i = $443 == 0.0;
          $or$cond3$not$i = $notrhs$i & $notlhs$i;
          $or$cond$i = $433 & $or$cond3$not$i;
          if ($or$cond$i) {
           $s$1$i = $440;
           break;
          }
          $447 = ((($s$0$i)) + 2|0);
          HEAP8[$440>>0] = 46;
          $s$1$i = $447;
         } else {
          $s$1$i = $440;
         }
        } while(0);
        $448 = $443 != 0.0;
        if ($448) {
         $$2$i = $443;$s$0$i = $s$1$i;
        } else {
         $s$1$i$lcssa = $s$1$i;
         break;
        }
       }
       $449 = ($p$0|0)!=(0);
       $$pre188$i = $s$1$i$lcssa;
       $450 = (($11) + ($$pre188$i))|0;
       $451 = ($450|0)<($p$0|0);
       $or$cond122 = $449 & $451;
       $452 = $431;
       $453 = (($12) + ($p$0))|0;
       $454 = (($453) - ($452))|0;
       $455 = (($10) - ($452))|0;
       $456 = (($455) + ($$pre188$i))|0;
       $l$0$i = $or$cond122 ? $454 : $456;
       $457 = (($l$0$i) + ($400))|0;
       _pad($f,32,$w$1,$457,$fl$1$);
       $458 = HEAP32[$f>>2]|0;
       $459 = $458 & 32;
       $460 = ($459|0)==(0);
       if ($460) {
        (___fwritex($prefix$0$$i,$400,$f)|0);
       }
       $461 = $fl$1$ ^ 65536;
       _pad($f,48,$w$1,$457,$461);
       $462 = (($$pre188$i) - ($5))|0;
       $463 = HEAP32[$f>>2]|0;
       $464 = $463 & 32;
       $465 = ($464|0)==(0);
       if ($465) {
        (___fwritex($buf$i,$462,$f)|0);
       }
       $466 = (($9) - ($452))|0;
       $sum = (($462) + ($466))|0;
       $467 = (($l$0$i) - ($sum))|0;
       _pad($f,48,$467,0,0);
       $468 = HEAP32[$f>>2]|0;
       $469 = $468 & 32;
       $470 = ($469|0)==(0);
       if ($470) {
        (___fwritex($431,$466,$f)|0);
       }
       $471 = $fl$1$ ^ 8192;
       _pad($f,32,$w$1,$457,$471);
       $472 = ($457|0)<($w$1|0);
       $w$$i = $472 ? $w$1 : $457;
       $$0$i = $w$$i;
       break;
      }
      $473 = ($p$0|0)<(0);
      $$p$i = $473 ? 6 : $p$0;
      if ($392) {
       $474 = $391 * 268435456.0;
       $475 = HEAP32[$e2$i>>2]|0;
       $476 = (($475) + -28)|0;
       HEAP32[$e2$i>>2] = $476;
       $$3$i = $474;$478 = $476;
      } else {
       $$pre185$i = HEAP32[$e2$i>>2]|0;
       $$3$i = $391;$478 = $$pre185$i;
      }
      $477 = ($478|0)<(0);
      $$33$i = $477 ? $big$i : $13;
      $479 = $$33$i;
      $$4$i = $$3$i;$z$0$i = $$33$i;
      while(1) {
       $480 = (~~(($$4$i))>>>0);
       HEAP32[$z$0$i>>2] = $480;
       $481 = ((($z$0$i)) + 4|0);
       $482 = (+($480>>>0));
       $483 = $$4$i - $482;
       $484 = $483 * 1.0E+9;
       $485 = $484 != 0.0;
       if ($485) {
        $$4$i = $484;$z$0$i = $481;
       } else {
        $$lcssa301 = $481;
        break;
       }
      }
      $$pr$i = HEAP32[$e2$i>>2]|0;
      $486 = ($$pr$i|0)>(0);
      if ($486) {
       $488 = $$pr$i;$a$1149$i = $$33$i;$z$1148$i = $$lcssa301;
       while(1) {
        $487 = ($488|0)>(29);
        $489 = $487 ? 29 : $488;
        $d$0$141$i = ((($z$1148$i)) + -4|0);
        $490 = ($d$0$141$i>>>0)<($a$1149$i>>>0);
        do {
         if ($490) {
          $a$2$ph$i = $a$1149$i;
         } else {
          $carry$0142$i = 0;$d$0143$i = $d$0$141$i;
          while(1) {
           $491 = HEAP32[$d$0143$i>>2]|0;
           $492 = (_bitshift64Shl(($491|0),0,($489|0))|0);
           $493 = tempRet0;
           $494 = (_i64Add(($492|0),($493|0),($carry$0142$i|0),0)|0);
           $495 = tempRet0;
           $496 = (___uremdi3(($494|0),($495|0),1000000000,0)|0);
           $497 = tempRet0;
           HEAP32[$d$0143$i>>2] = $496;
           $498 = (___udivdi3(($494|0),($495|0),1000000000,0)|0);
           $499 = tempRet0;
           $d$0$i = ((($d$0143$i)) + -4|0);
           $500 = ($d$0$i>>>0)<($a$1149$i>>>0);
           if ($500) {
            $$lcssa302 = $498;
            break;
           } else {
            $carry$0142$i = $498;$d$0143$i = $d$0$i;
           }
          }
          $501 = ($$lcssa302|0)==(0);
          if ($501) {
           $a$2$ph$i = $a$1149$i;
           break;
          }
          $502 = ((($a$1149$i)) + -4|0);
          HEAP32[$502>>2] = $$lcssa302;
          $a$2$ph$i = $502;
         }
        } while(0);
        $z$2$i = $z$1148$i;
        while(1) {
         $503 = ($z$2$i>>>0)>($a$2$ph$i>>>0);
         if (!($503)) {
          $z$2$i$lcssa = $z$2$i;
          break;
         }
         $504 = ((($z$2$i)) + -4|0);
         $505 = HEAP32[$504>>2]|0;
         $506 = ($505|0)==(0);
         if ($506) {
          $z$2$i = $504;
         } else {
          $z$2$i$lcssa = $z$2$i;
          break;
         }
        }
        $507 = HEAP32[$e2$i>>2]|0;
        $508 = (($507) - ($489))|0;
        HEAP32[$e2$i>>2] = $508;
        $509 = ($508|0)>(0);
        if ($509) {
         $488 = $508;$a$1149$i = $a$2$ph$i;$z$1148$i = $z$2$i$lcssa;
        } else {
         $$pr50$i = $508;$a$1$lcssa$i = $a$2$ph$i;$z$1$lcssa$i = $z$2$i$lcssa;
         break;
        }
       }
      } else {
       $$pr50$i = $$pr$i;$a$1$lcssa$i = $$33$i;$z$1$lcssa$i = $$lcssa301;
      }
      $510 = ($$pr50$i|0)<(0);
      if ($510) {
       $511 = (($$p$i) + 25)|0;
       $512 = (($511|0) / 9)&-1;
       $513 = (($512) + 1)|0;
       $514 = ($395|0)==(102);
       $516 = $$pr50$i;$a$3136$i = $a$1$lcssa$i;$z$3135$i = $z$1$lcssa$i;
       while(1) {
        $515 = (0 - ($516))|0;
        $517 = ($515|0)>(9);
        $518 = $517 ? 9 : $515;
        $519 = ($a$3136$i>>>0)<($z$3135$i>>>0);
        do {
         if ($519) {
          $523 = 1 << $518;
          $524 = (($523) + -1)|0;
          $525 = 1000000000 >>> $518;
          $carry3$0130$i = 0;$d$1129$i = $a$3136$i;
          while(1) {
           $526 = HEAP32[$d$1129$i>>2]|0;
           $527 = $526 & $524;
           $528 = $526 >>> $518;
           $529 = (($528) + ($carry3$0130$i))|0;
           HEAP32[$d$1129$i>>2] = $529;
           $530 = Math_imul($527, $525)|0;
           $531 = ((($d$1129$i)) + 4|0);
           $532 = ($531>>>0)<($z$3135$i>>>0);
           if ($532) {
            $carry3$0130$i = $530;$d$1129$i = $531;
           } else {
            $$lcssa304 = $530;
            break;
           }
          }
          $533 = HEAP32[$a$3136$i>>2]|0;
          $534 = ($533|0)==(0);
          $535 = ((($a$3136$i)) + 4|0);
          $$a$3$i = $534 ? $535 : $a$3136$i;
          $536 = ($$lcssa304|0)==(0);
          if ($536) {
           $$a$3192$i = $$a$3$i;$z$4$i = $z$3135$i;
           break;
          }
          $537 = ((($z$3135$i)) + 4|0);
          HEAP32[$z$3135$i>>2] = $$lcssa304;
          $$a$3192$i = $$a$3$i;$z$4$i = $537;
         } else {
          $520 = HEAP32[$a$3136$i>>2]|0;
          $521 = ($520|0)==(0);
          $522 = ((($a$3136$i)) + 4|0);
          $$a$3$191$i = $521 ? $522 : $a$3136$i;
          $$a$3192$i = $$a$3$191$i;$z$4$i = $z$3135$i;
         }
        } while(0);
        $538 = $514 ? $$33$i : $$a$3192$i;
        $539 = $z$4$i;
        $540 = $538;
        $541 = (($539) - ($540))|0;
        $542 = $541 >> 2;
        $543 = ($542|0)>($513|0);
        $544 = (($538) + ($513<<2)|0);
        $$z$4$i = $543 ? $544 : $z$4$i;
        $545 = HEAP32[$e2$i>>2]|0;
        $546 = (($545) + ($518))|0;
        HEAP32[$e2$i>>2] = $546;
        $547 = ($546|0)<(0);
        if ($547) {
         $516 = $546;$a$3136$i = $$a$3192$i;$z$3135$i = $$z$4$i;
        } else {
         $a$3$lcssa$i = $$a$3192$i;$z$3$lcssa$i = $$z$4$i;
         break;
        }
       }
      } else {
       $a$3$lcssa$i = $a$1$lcssa$i;$z$3$lcssa$i = $z$1$lcssa$i;
      }
      $548 = ($a$3$lcssa$i>>>0)<($z$3$lcssa$i>>>0);
      do {
       if ($548) {
        $549 = $a$3$lcssa$i;
        $550 = (($479) - ($549))|0;
        $551 = $550 >> 2;
        $552 = ($551*9)|0;
        $553 = HEAP32[$a$3$lcssa$i>>2]|0;
        $554 = ($553>>>0)<(10);
        if ($554) {
         $e$1$i = $552;
         break;
        } else {
         $e$0125$i = $552;$i$0124$i = 10;
        }
        while(1) {
         $555 = ($i$0124$i*10)|0;
         $556 = (($e$0125$i) + 1)|0;
         $557 = ($553>>>0)<($555>>>0);
         if ($557) {
          $e$1$i = $556;
          break;
         } else {
          $e$0125$i = $556;$i$0124$i = $555;
         }
        }
       } else {
        $e$1$i = 0;
       }
      } while(0);
      $558 = ($395|0)!=(102);
      $559 = $558 ? $e$1$i : 0;
      $560 = (($$p$i) - ($559))|0;
      $561 = ($395|0)==(103);
      $562 = ($$p$i|0)!=(0);
      $563 = $562 & $561;
      $$neg55$i = $563 << 31 >> 31;
      $564 = (($560) + ($$neg55$i))|0;
      $565 = $z$3$lcssa$i;
      $566 = (($565) - ($479))|0;
      $567 = $566 >> 2;
      $568 = ($567*9)|0;
      $569 = (($568) + -9)|0;
      $570 = ($564|0)<($569|0);
      if ($570) {
       $571 = ((($$33$i)) + 4|0);
       $572 = (($564) + 9216)|0;
       $573 = (($572|0) / 9)&-1;
       $574 = (($573) + -1024)|0;
       $575 = (($571) + ($574<<2)|0);
       $576 = (($572|0) % 9)&-1;
       $j$0$117$i = (($576) + 1)|0;
       $577 = ($j$0$117$i|0)<(9);
       if ($577) {
        $i$1118$i = 10;$j$0119$i = $j$0$117$i;
        while(1) {
         $578 = ($i$1118$i*10)|0;
         $j$0$i = (($j$0119$i) + 1)|0;
         $exitcond$i = ($j$0$i|0)==(9);
         if ($exitcond$i) {
          $i$1$lcssa$i = $578;
          break;
         } else {
          $i$1118$i = $578;$j$0119$i = $j$0$i;
         }
        }
       } else {
        $i$1$lcssa$i = 10;
       }
       $579 = HEAP32[$575>>2]|0;
       $580 = (($579>>>0) % ($i$1$lcssa$i>>>0))&-1;
       $581 = ($580|0)==(0);
       $582 = ((($575)) + 4|0);
       $583 = ($582|0)==($z$3$lcssa$i|0);
       $or$cond18$i = $583 & $581;
       do {
        if ($or$cond18$i) {
         $a$8$i = $a$3$lcssa$i;$d$4$i = $575;$e$4$i = $e$1$i;
        } else {
         $584 = (($579>>>0) / ($i$1$lcssa$i>>>0))&-1;
         $585 = $584 & 1;
         $586 = ($585|0)==(0);
         $$20$i = $586 ? 9007199254740992.0 : 9007199254740994.0;
         $587 = (($i$1$lcssa$i|0) / 2)&-1;
         $588 = ($580>>>0)<($587>>>0);
         if ($588) {
          $small$0$i = 0.5;
         } else {
          $589 = ($580|0)==($587|0);
          $or$cond22$i = $583 & $589;
          $$36$i = $or$cond22$i ? 1.0 : 1.5;
          $small$0$i = $$36$i;
         }
         $590 = ($pl$0$i|0)==(0);
         do {
          if ($590) {
           $round6$1$i = $$20$i;$small$1$i = $small$0$i;
          } else {
           $591 = HEAP8[$prefix$0$i>>0]|0;
           $592 = ($591<<24>>24)==(45);
           if (!($592)) {
            $round6$1$i = $$20$i;$small$1$i = $small$0$i;
            break;
           }
           $593 = -$$20$i;
           $594 = -$small$0$i;
           $round6$1$i = $593;$small$1$i = $594;
          }
         } while(0);
         $595 = (($579) - ($580))|0;
         HEAP32[$575>>2] = $595;
         $596 = $round6$1$i + $small$1$i;
         $597 = $596 != $round6$1$i;
         if (!($597)) {
          $a$8$i = $a$3$lcssa$i;$d$4$i = $575;$e$4$i = $e$1$i;
          break;
         }
         $598 = (($595) + ($i$1$lcssa$i))|0;
         HEAP32[$575>>2] = $598;
         $599 = ($598>>>0)>(999999999);
         if ($599) {
          $a$5111$i = $a$3$lcssa$i;$d$2110$i = $575;
          while(1) {
           $600 = ((($d$2110$i)) + -4|0);
           HEAP32[$d$2110$i>>2] = 0;
           $601 = ($600>>>0)<($a$5111$i>>>0);
           if ($601) {
            $602 = ((($a$5111$i)) + -4|0);
            HEAP32[$602>>2] = 0;
            $a$6$i = $602;
           } else {
            $a$6$i = $a$5111$i;
           }
           $603 = HEAP32[$600>>2]|0;
           $604 = (($603) + 1)|0;
           HEAP32[$600>>2] = $604;
           $605 = ($604>>>0)>(999999999);
           if ($605) {
            $a$5111$i = $a$6$i;$d$2110$i = $600;
           } else {
            $a$5$lcssa$i = $a$6$i;$d$2$lcssa$i = $600;
            break;
           }
          }
         } else {
          $a$5$lcssa$i = $a$3$lcssa$i;$d$2$lcssa$i = $575;
         }
         $606 = $a$5$lcssa$i;
         $607 = (($479) - ($606))|0;
         $608 = $607 >> 2;
         $609 = ($608*9)|0;
         $610 = HEAP32[$a$5$lcssa$i>>2]|0;
         $611 = ($610>>>0)<(10);
         if ($611) {
          $a$8$i = $a$5$lcssa$i;$d$4$i = $d$2$lcssa$i;$e$4$i = $609;
          break;
         } else {
          $e$2106$i = $609;$i$2105$i = 10;
         }
         while(1) {
          $612 = ($i$2105$i*10)|0;
          $613 = (($e$2106$i) + 1)|0;
          $614 = ($610>>>0)<($612>>>0);
          if ($614) {
           $a$8$i = $a$5$lcssa$i;$d$4$i = $d$2$lcssa$i;$e$4$i = $613;
           break;
          } else {
           $e$2106$i = $613;$i$2105$i = $612;
          }
         }
        }
       } while(0);
       $615 = ((($d$4$i)) + 4|0);
       $616 = ($z$3$lcssa$i>>>0)>($615>>>0);
       $$z$3$i = $616 ? $615 : $z$3$lcssa$i;
       $a$9$ph$i = $a$8$i;$e$5$ph$i = $e$4$i;$z$7$ph$i = $$z$3$i;
      } else {
       $a$9$ph$i = $a$3$lcssa$i;$e$5$ph$i = $e$1$i;$z$7$ph$i = $z$3$lcssa$i;
      }
      $617 = (0 - ($e$5$ph$i))|0;
      $z$7$i = $z$7$ph$i;
      while(1) {
       $618 = ($z$7$i>>>0)>($a$9$ph$i>>>0);
       if (!($618)) {
        $$lcssa162$i = 0;$z$7$i$lcssa = $z$7$i;
        break;
       }
       $619 = ((($z$7$i)) + -4|0);
       $620 = HEAP32[$619>>2]|0;
       $621 = ($620|0)==(0);
       if ($621) {
        $z$7$i = $619;
       } else {
        $$lcssa162$i = 1;$z$7$i$lcssa = $z$7$i;
        break;
       }
      }
      do {
       if ($561) {
        $622 = $562&1;
        $623 = $622 ^ 1;
        $$p$$i = (($623) + ($$p$i))|0;
        $624 = ($$p$$i|0)>($e$5$ph$i|0);
        $625 = ($e$5$ph$i|0)>(-5);
        $or$cond6$i = $624 & $625;
        if ($or$cond6$i) {
         $626 = (($t$0) + -1)|0;
         $$neg56$i = (($$p$$i) + -1)|0;
         $627 = (($$neg56$i) - ($e$5$ph$i))|0;
         $$013$i = $626;$$210$i = $627;
        } else {
         $628 = (($t$0) + -2)|0;
         $629 = (($$p$$i) + -1)|0;
         $$013$i = $628;$$210$i = $629;
        }
        $630 = $fl$1$ & 8;
        $631 = ($630|0)==(0);
        if (!($631)) {
         $$114$i = $$013$i;$$311$i = $$210$i;$$pre$phi190$iZ2D = $630;
         break;
        }
        do {
         if ($$lcssa162$i) {
          $632 = ((($z$7$i$lcssa)) + -4|0);
          $633 = HEAP32[$632>>2]|0;
          $634 = ($633|0)==(0);
          if ($634) {
           $j$2$i = 9;
           break;
          }
          $635 = (($633>>>0) % 10)&-1;
          $636 = ($635|0)==(0);
          if ($636) {
           $i$3101$i = 10;$j$1102$i = 0;
          } else {
           $j$2$i = 0;
           break;
          }
          while(1) {
           $637 = ($i$3101$i*10)|0;
           $638 = (($j$1102$i) + 1)|0;
           $639 = (($633>>>0) % ($637>>>0))&-1;
           $640 = ($639|0)==(0);
           if ($640) {
            $i$3101$i = $637;$j$1102$i = $638;
           } else {
            $j$2$i = $638;
            break;
           }
          }
         } else {
          $j$2$i = 9;
         }
        } while(0);
        $641 = $$013$i | 32;
        $642 = ($641|0)==(102);
        $643 = $z$7$i$lcssa;
        $644 = (($643) - ($479))|0;
        $645 = $644 >> 2;
        $646 = ($645*9)|0;
        $647 = (($646) + -9)|0;
        if ($642) {
         $648 = (($647) - ($j$2$i))|0;
         $649 = ($648|0)<(0);
         $$23$i = $649 ? 0 : $648;
         $650 = ($$210$i|0)<($$23$i|0);
         $$210$$24$i = $650 ? $$210$i : $$23$i;
         $$114$i = $$013$i;$$311$i = $$210$$24$i;$$pre$phi190$iZ2D = 0;
         break;
        } else {
         $651 = (($647) + ($e$5$ph$i))|0;
         $652 = (($651) - ($j$2$i))|0;
         $653 = ($652|0)<(0);
         $$25$i = $653 ? 0 : $652;
         $654 = ($$210$i|0)<($$25$i|0);
         $$210$$26$i = $654 ? $$210$i : $$25$i;
         $$114$i = $$013$i;$$311$i = $$210$$26$i;$$pre$phi190$iZ2D = 0;
         break;
        }
       } else {
        $$pre189$i = $fl$1$ & 8;
        $$114$i = $t$0;$$311$i = $$p$i;$$pre$phi190$iZ2D = $$pre189$i;
       }
      } while(0);
      $655 = $$311$i | $$pre$phi190$iZ2D;
      $656 = ($655|0)!=(0);
      $657 = $656&1;
      $658 = $$114$i | 32;
      $659 = ($658|0)==(102);
      if ($659) {
       $660 = ($e$5$ph$i|0)>(0);
       $661 = $660 ? $e$5$ph$i : 0;
       $$pn$i = $661;$estr$2$i = 0;
      } else {
       $662 = ($e$5$ph$i|0)<(0);
       $663 = $662 ? $617 : $e$5$ph$i;
       $664 = ($663|0)<(0);
       $665 = $664 << 31 >> 31;
       $666 = (_fmt_u($663,$665,$7)|0);
       $667 = $666;
       $668 = (($9) - ($667))|0;
       $669 = ($668|0)<(2);
       if ($669) {
        $estr$195$i = $666;
        while(1) {
         $670 = ((($estr$195$i)) + -1|0);
         HEAP8[$670>>0] = 48;
         $671 = $670;
         $672 = (($9) - ($671))|0;
         $673 = ($672|0)<(2);
         if ($673) {
          $estr$195$i = $670;
         } else {
          $estr$1$lcssa$i = $670;
          break;
         }
        }
       } else {
        $estr$1$lcssa$i = $666;
       }
       $674 = $e$5$ph$i >> 31;
       $675 = $674 & 2;
       $676 = (($675) + 43)|0;
       $677 = $676&255;
       $678 = ((($estr$1$lcssa$i)) + -1|0);
       HEAP8[$678>>0] = $677;
       $679 = $$114$i&255;
       $680 = ((($estr$1$lcssa$i)) + -2|0);
       HEAP8[$680>>0] = $679;
       $681 = $680;
       $682 = (($9) - ($681))|0;
       $$pn$i = $682;$estr$2$i = $680;
      }
      $683 = (($pl$0$i) + 1)|0;
      $684 = (($683) + ($$311$i))|0;
      $l$1$i = (($684) + ($657))|0;
      $685 = (($l$1$i) + ($$pn$i))|0;
      _pad($f,32,$w$1,$685,$fl$1$);
      $686 = HEAP32[$f>>2]|0;
      $687 = $686 & 32;
      $688 = ($687|0)==(0);
      if ($688) {
       (___fwritex($prefix$0$i,$pl$0$i,$f)|0);
      }
      $689 = $fl$1$ ^ 65536;
      _pad($f,48,$w$1,$685,$689);
      do {
       if ($659) {
        $690 = ($a$9$ph$i>>>0)>($$33$i>>>0);
        $r$0$a$9$i = $690 ? $$33$i : $a$9$ph$i;
        $d$584$i = $r$0$a$9$i;
        while(1) {
         $691 = HEAP32[$d$584$i>>2]|0;
         $692 = (_fmt_u($691,0,$14)|0);
         $693 = ($d$584$i|0)==($r$0$a$9$i|0);
         do {
          if ($693) {
           $699 = ($692|0)==($14|0);
           if (!($699)) {
            $s7$1$i = $692;
            break;
           }
           HEAP8[$16>>0] = 48;
           $s7$1$i = $16;
          } else {
           $694 = ($692>>>0)>($buf$i>>>0);
           if (!($694)) {
            $s7$1$i = $692;
            break;
           }
           $695 = $692;
           $696 = (($695) - ($5))|0;
           _memset(($buf$i|0),48,($696|0))|0;
           $s7$081$i = $692;
           while(1) {
            $697 = ((($s7$081$i)) + -1|0);
            $698 = ($697>>>0)>($buf$i>>>0);
            if ($698) {
             $s7$081$i = $697;
            } else {
             $s7$1$i = $697;
             break;
            }
           }
          }
         } while(0);
         $700 = HEAP32[$f>>2]|0;
         $701 = $700 & 32;
         $702 = ($701|0)==(0);
         if ($702) {
          $703 = $s7$1$i;
          $704 = (($15) - ($703))|0;
          (___fwritex($s7$1$i,$704,$f)|0);
         }
         $705 = ((($d$584$i)) + 4|0);
         $706 = ($705>>>0)>($$33$i>>>0);
         if ($706) {
          $$lcssa314 = $705;
          break;
         } else {
          $d$584$i = $705;
         }
        }
        $707 = ($655|0)==(0);
        do {
         if (!($707)) {
          $708 = HEAP32[$f>>2]|0;
          $709 = $708 & 32;
          $710 = ($709|0)==(0);
          if (!($710)) {
           break;
          }
          (___fwritex(19513,1,$f)|0);
         }
        } while(0);
        $711 = ($$lcssa314>>>0)<($z$7$i$lcssa>>>0);
        $712 = ($$311$i|0)>(0);
        $713 = $712 & $711;
        if ($713) {
         $$41278$i = $$311$i;$d$677$i = $$lcssa314;
         while(1) {
          $714 = HEAP32[$d$677$i>>2]|0;
          $715 = (_fmt_u($714,0,$14)|0);
          $716 = ($715>>>0)>($buf$i>>>0);
          if ($716) {
           $717 = $715;
           $718 = (($717) - ($5))|0;
           _memset(($buf$i|0),48,($718|0))|0;
           $s8$072$i = $715;
           while(1) {
            $719 = ((($s8$072$i)) + -1|0);
            $720 = ($719>>>0)>($buf$i>>>0);
            if ($720) {
             $s8$072$i = $719;
            } else {
             $s8$0$lcssa$i = $719;
             break;
            }
           }
          } else {
           $s8$0$lcssa$i = $715;
          }
          $721 = HEAP32[$f>>2]|0;
          $722 = $721 & 32;
          $723 = ($722|0)==(0);
          if ($723) {
           $724 = ($$41278$i|0)>(9);
           $725 = $724 ? 9 : $$41278$i;
           (___fwritex($s8$0$lcssa$i,$725,$f)|0);
          }
          $726 = ((($d$677$i)) + 4|0);
          $727 = (($$41278$i) + -9)|0;
          $728 = ($726>>>0)<($z$7$i$lcssa>>>0);
          $729 = ($$41278$i|0)>(9);
          $730 = $729 & $728;
          if ($730) {
           $$41278$i = $727;$d$677$i = $726;
          } else {
           $$412$lcssa$i = $727;
           break;
          }
         }
        } else {
         $$412$lcssa$i = $$311$i;
        }
        $731 = (($$412$lcssa$i) + 9)|0;
        _pad($f,48,$731,9,0);
       } else {
        $732 = ((($a$9$ph$i)) + 4|0);
        $z$7$$i = $$lcssa162$i ? $z$7$i$lcssa : $732;
        $733 = ($$311$i|0)>(-1);
        if ($733) {
         $734 = ($$pre$phi190$iZ2D|0)==(0);
         $$589$i = $$311$i;$d$788$i = $a$9$ph$i;
         while(1) {
          $735 = HEAP32[$d$788$i>>2]|0;
          $736 = (_fmt_u($735,0,$14)|0);
          $737 = ($736|0)==($14|0);
          if ($737) {
           HEAP8[$16>>0] = 48;
           $s9$0$i = $16;
          } else {
           $s9$0$i = $736;
          }
          $738 = ($d$788$i|0)==($a$9$ph$i|0);
          do {
           if ($738) {
            $742 = ((($s9$0$i)) + 1|0);
            $743 = HEAP32[$f>>2]|0;
            $744 = $743 & 32;
            $745 = ($744|0)==(0);
            if ($745) {
             (___fwritex($s9$0$i,1,$f)|0);
            }
            $746 = ($$589$i|0)<(1);
            $or$cond31$i = $734 & $746;
            if ($or$cond31$i) {
             $s9$2$i = $742;
             break;
            }
            $747 = HEAP32[$f>>2]|0;
            $748 = $747 & 32;
            $749 = ($748|0)==(0);
            if (!($749)) {
             $s9$2$i = $742;
             break;
            }
            (___fwritex(19513,1,$f)|0);
            $s9$2$i = $742;
           } else {
            $739 = ($s9$0$i>>>0)>($buf$i>>>0);
            if (!($739)) {
             $s9$2$i = $s9$0$i;
             break;
            }
            $scevgep182$i = (($s9$0$i) + ($6)|0);
            $scevgep182183$i = $scevgep182$i;
            _memset(($buf$i|0),48,($scevgep182183$i|0))|0;
            $s9$185$i = $s9$0$i;
            while(1) {
             $740 = ((($s9$185$i)) + -1|0);
             $741 = ($740>>>0)>($buf$i>>>0);
             if ($741) {
              $s9$185$i = $740;
             } else {
              $s9$2$i = $740;
              break;
             }
            }
           }
          } while(0);
          $750 = $s9$2$i;
          $751 = (($15) - ($750))|0;
          $752 = HEAP32[$f>>2]|0;
          $753 = $752 & 32;
          $754 = ($753|0)==(0);
          if ($754) {
           $755 = ($$589$i|0)>($751|0);
           $756 = $755 ? $751 : $$589$i;
           (___fwritex($s9$2$i,$756,$f)|0);
          }
          $757 = (($$589$i) - ($751))|0;
          $758 = ((($d$788$i)) + 4|0);
          $759 = ($758>>>0)<($z$7$$i>>>0);
          $760 = ($757|0)>(-1);
          $761 = $759 & $760;
          if ($761) {
           $$589$i = $757;$d$788$i = $758;
          } else {
           $$5$lcssa$i = $757;
           break;
          }
         }
        } else {
         $$5$lcssa$i = $$311$i;
        }
        $762 = (($$5$lcssa$i) + 18)|0;
        _pad($f,48,$762,18,0);
        $763 = HEAP32[$f>>2]|0;
        $764 = $763 & 32;
        $765 = ($764|0)==(0);
        if (!($765)) {
         break;
        }
        $766 = $estr$2$i;
        $767 = (($9) - ($766))|0;
        (___fwritex($estr$2$i,$767,$f)|0);
       }
      } while(0);
      $768 = $fl$1$ ^ 8192;
      _pad($f,32,$w$1,$685,$768);
      $769 = ($685|0)<($w$1|0);
      $w$32$i = $769 ? $w$1 : $685;
      $$0$i = $w$32$i;
     } else {
      $375 = $t$0 & 32;
      $376 = ($375|0)!=(0);
      $377 = $376 ? 19497 : 19501;
      $378 = ($$07$i != $$07$i) | (0.0 != 0.0);
      $379 = $376 ? 19505 : 19509;
      $pl$1$i = $378 ? 0 : $pl$0$i;
      $s1$0$i = $378 ? $379 : $377;
      $380 = (($pl$1$i) + 3)|0;
      _pad($f,32,$w$1,$380,$176);
      $381 = HEAP32[$f>>2]|0;
      $382 = $381 & 32;
      $383 = ($382|0)==(0);
      if ($383) {
       (___fwritex($prefix$0$i,$pl$1$i,$f)|0);
       $$pre$i = HEAP32[$f>>2]|0;
       $385 = $$pre$i;
      } else {
       $385 = $381;
      }
      $384 = $385 & 32;
      $386 = ($384|0)==(0);
      if ($386) {
       (___fwritex($s1$0$i,3,$f)|0);
      }
      $387 = $fl$1$ ^ 8192;
      _pad($f,32,$w$1,$380,$387);
      $388 = ($380|0)<($w$1|0);
      $389 = $388 ? $w$1 : $380;
      $$0$i = $389;
     }
    } while(0);
    $cnt$0 = $cnt$1;$l$0 = $$0$i;$l10n$0 = $l10n$3;$s$0 = $$lcssa298;
    continue L1;
    break;
   }
   default: {
    $a$2 = $s$0;$fl$6 = $fl$1$;$p$5 = $p$0;$pl$2 = 0;$prefix$2 = 19461;$z$2 = $1;
   }
   }
  } while(0);
  L311: do {
   if ((label|0) == 64) {
    label = 0;
    $207 = $arg;
    $208 = $207;
    $209 = HEAP32[$208>>2]|0;
    $210 = (($207) + 4)|0;
    $211 = $210;
    $212 = HEAP32[$211>>2]|0;
    $213 = $t$1 & 32;
    $214 = ($209|0)==(0);
    $215 = ($212|0)==(0);
    $216 = $214 & $215;
    if ($216) {
     $a$0 = $1;$fl$4 = $fl$3;$p$2 = $p$1;$pl$1 = 0;$prefix$1 = 19461;
     label = 77;
    } else {
     $$012$i = $1;$218 = $209;$225 = $212;
     while(1) {
      $217 = $218 & 15;
      $219 = (19445 + ($217)|0);
      $220 = HEAP8[$219>>0]|0;
      $221 = $220&255;
      $222 = $221 | $213;
      $223 = $222&255;
      $224 = ((($$012$i)) + -1|0);
      HEAP8[$224>>0] = $223;
      $226 = (_bitshift64Lshr(($218|0),($225|0),4)|0);
      $227 = tempRet0;
      $228 = ($226|0)==(0);
      $229 = ($227|0)==(0);
      $230 = $228 & $229;
      if ($230) {
       $$lcssa319 = $224;
       break;
      } else {
       $$012$i = $224;$218 = $226;$225 = $227;
      }
     }
     $231 = $arg;
     $232 = $231;
     $233 = HEAP32[$232>>2]|0;
     $234 = (($231) + 4)|0;
     $235 = $234;
     $236 = HEAP32[$235>>2]|0;
     $237 = ($233|0)==(0);
     $238 = ($236|0)==(0);
     $239 = $237 & $238;
     $240 = $fl$3 & 8;
     $241 = ($240|0)==(0);
     $or$cond17 = $241 | $239;
     if ($or$cond17) {
      $a$0 = $$lcssa319;$fl$4 = $fl$3;$p$2 = $p$1;$pl$1 = 0;$prefix$1 = 19461;
      label = 77;
     } else {
      $242 = $t$1 >> 4;
      $243 = (19461 + ($242)|0);
      $a$0 = $$lcssa319;$fl$4 = $fl$3;$p$2 = $p$1;$pl$1 = 2;$prefix$1 = $243;
      label = 77;
     }
    }
   }
   else if ((label|0) == 76) {
    label = 0;
    $289 = (_fmt_u($287,$288,$1)|0);
    $a$0 = $289;$fl$4 = $fl$1$;$p$2 = $p$0;$pl$1 = $pl$0;$prefix$1 = $prefix$0;
    label = 77;
   }
   else if ((label|0) == 82) {
    label = 0;
    $321 = (_memchr($a$1,0,$p$0)|0);
    $322 = ($321|0)==(0|0);
    $323 = $321;
    $324 = $a$1;
    $325 = (($323) - ($324))|0;
    $326 = (($a$1) + ($p$0)|0);
    $z$1 = $322 ? $326 : $321;
    $p$3 = $322 ? $p$0 : $325;
    $a$2 = $a$1;$fl$6 = $176;$p$5 = $p$3;$pl$2 = 0;$prefix$2 = 19461;$z$2 = $z$1;
   }
   else if ((label|0) == 86) {
    label = 0;
    $i$0105 = 0;$l$1104 = 0;$ws$0106 = $798;
    while(1) {
     $334 = HEAP32[$ws$0106>>2]|0;
     $335 = ($334|0)==(0);
     if ($335) {
      $i$0$lcssa = $i$0105;$l$2 = $l$1104;
      break;
     }
     $336 = (_wctomb($mb,$334)|0);
     $337 = ($336|0)<(0);
     $338 = (($p$4176) - ($i$0105))|0;
     $339 = ($336>>>0)>($338>>>0);
     $or$cond20 = $337 | $339;
     if ($or$cond20) {
      $i$0$lcssa = $i$0105;$l$2 = $336;
      break;
     }
     $340 = ((($ws$0106)) + 4|0);
     $341 = (($336) + ($i$0105))|0;
     $342 = ($p$4176>>>0)>($341>>>0);
     if ($342) {
      $i$0105 = $341;$l$1104 = $336;$ws$0106 = $340;
     } else {
      $i$0$lcssa = $341;$l$2 = $336;
      break;
     }
    }
    $343 = ($l$2|0)<(0);
    if ($343) {
     $$0 = -1;
     break L1;
    }
    _pad($f,32,$w$1,$i$0$lcssa,$fl$1$);
    $344 = ($i$0$lcssa|0)==(0);
    if ($344) {
     $i$0$lcssa178 = 0;
     label = 97;
    } else {
     $i$1116 = 0;$ws$1117 = $798;
     while(1) {
      $345 = HEAP32[$ws$1117>>2]|0;
      $346 = ($345|0)==(0);
      if ($346) {
       $i$0$lcssa178 = $i$0$lcssa;
       label = 97;
       break L311;
      }
      $347 = ((($ws$1117)) + 4|0);
      $348 = (_wctomb($mb,$345)|0);
      $349 = (($348) + ($i$1116))|0;
      $350 = ($349|0)>($i$0$lcssa|0);
      if ($350) {
       $i$0$lcssa178 = $i$0$lcssa;
       label = 97;
       break L311;
      }
      $351 = HEAP32[$f>>2]|0;
      $352 = $351 & 32;
      $353 = ($352|0)==(0);
      if ($353) {
       (___fwritex($mb,$348,$f)|0);
      }
      $354 = ($349>>>0)<($i$0$lcssa>>>0);
      if ($354) {
       $i$1116 = $349;$ws$1117 = $347;
      } else {
       $i$0$lcssa178 = $i$0$lcssa;
       label = 97;
       break;
      }
     }
    }
   }
  } while(0);
  if ((label|0) == 97) {
   label = 0;
   $355 = $fl$1$ ^ 8192;
   _pad($f,32,$w$1,$i$0$lcssa178,$355);
   $356 = ($w$1|0)>($i$0$lcssa178|0);
   $357 = $356 ? $w$1 : $i$0$lcssa178;
   $cnt$0 = $cnt$1;$l$0 = $357;$l10n$0 = $l10n$3;$s$0 = $$lcssa298;
   continue;
  }
  if ((label|0) == 77) {
   label = 0;
   $290 = ($p$2|0)>(-1);
   $291 = $fl$4 & -65537;
   $$fl$4 = $290 ? $291 : $fl$4;
   $292 = $arg;
   $293 = $292;
   $294 = HEAP32[$293>>2]|0;
   $295 = (($292) + 4)|0;
   $296 = $295;
   $297 = HEAP32[$296>>2]|0;
   $298 = ($294|0)!=(0);
   $299 = ($297|0)!=(0);
   $300 = $298 | $299;
   $301 = ($p$2|0)!=(0);
   $or$cond = $301 | $300;
   if ($or$cond) {
    $302 = $a$0;
    $303 = (($2) - ($302))|0;
    $304 = $300&1;
    $305 = $304 ^ 1;
    $306 = (($305) + ($303))|0;
    $307 = ($p$2|0)>($306|0);
    $p$2$ = $307 ? $p$2 : $306;
    $a$2 = $a$0;$fl$6 = $$fl$4;$p$5 = $p$2$;$pl$2 = $pl$1;$prefix$2 = $prefix$1;$z$2 = $1;
   } else {
    $a$2 = $1;$fl$6 = $$fl$4;$p$5 = 0;$pl$2 = $pl$1;$prefix$2 = $prefix$1;$z$2 = $1;
   }
  }
  $770 = $z$2;
  $771 = $a$2;
  $772 = (($770) - ($771))|0;
  $773 = ($p$5|0)<($772|0);
  $$p$5 = $773 ? $772 : $p$5;
  $774 = (($pl$2) + ($$p$5))|0;
  $775 = ($w$1|0)<($774|0);
  $w$2 = $775 ? $774 : $w$1;
  _pad($f,32,$w$2,$774,$fl$6);
  $776 = HEAP32[$f>>2]|0;
  $777 = $776 & 32;
  $778 = ($777|0)==(0);
  if ($778) {
   (___fwritex($prefix$2,$pl$2,$f)|0);
  }
  $779 = $fl$6 ^ 65536;
  _pad($f,48,$w$2,$774,$779);
  _pad($f,48,$$p$5,$772,0);
  $780 = HEAP32[$f>>2]|0;
  $781 = $780 & 32;
  $782 = ($781|0)==(0);
  if ($782) {
   (___fwritex($a$2,$772,$f)|0);
  }
  $783 = $fl$6 ^ 8192;
  _pad($f,32,$w$2,$774,$783);
  $cnt$0 = $cnt$1;$l$0 = $w$2;$l10n$0 = $l10n$3;$s$0 = $$lcssa298;
 }
 L345: do {
  if ((label|0) == 244) {
   $784 = ($f|0)==(0|0);
   if ($784) {
    $785 = ($l10n$0$lcssa|0)==(0);
    if ($785) {
     $$0 = 0;
    } else {
     $i$291 = 1;
     while(1) {
      $786 = (($nl_type) + ($i$291<<2)|0);
      $787 = HEAP32[$786>>2]|0;
      $788 = ($787|0)==(0);
      if ($788) {
       $i$291$lcssa = $i$291;
       break;
      }
      $790 = (($nl_arg) + ($i$291<<3)|0);
      _pop_arg($790,$787,$ap);
      $791 = (($i$291) + 1)|0;
      $792 = ($791|0)<(10);
      if ($792) {
       $i$291 = $791;
      } else {
       $$0 = 1;
       break L345;
      }
     }
     $789 = ($i$291$lcssa|0)<(10);
     if ($789) {
      $i$389 = $i$291$lcssa;
      while(1) {
       $795 = (($nl_type) + ($i$389<<2)|0);
       $796 = HEAP32[$795>>2]|0;
       $797 = ($796|0)==(0);
       $794 = (($i$389) + 1)|0;
       if (!($797)) {
        $$0 = -1;
        break L345;
       }
       $793 = ($794|0)<(10);
       if ($793) {
        $i$389 = $794;
       } else {
        $$0 = 1;
        break;
       }
      }
     } else {
      $$0 = 1;
     }
    }
   } else {
    $$0 = $cnt$1$lcssa;
   }
  }
 } while(0);
 STACKTOP = sp;return ($$0|0);
}
function _pop_arg($arg,$type,$ap) {
 $arg = $arg|0;
 $type = $type|0;
 $ap = $ap|0;
 var $$mask = 0, $$mask1 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0.0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0.0;
 var $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0;
 var $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0;
 var $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0;
 var $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0;
 var $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $arglist_current = 0, $arglist_current11 = 0, $arglist_current14 = 0, $arglist_current17 = 0;
 var $arglist_current2 = 0, $arglist_current20 = 0, $arglist_current23 = 0, $arglist_current26 = 0, $arglist_current5 = 0, $arglist_current8 = 0, $arglist_next = 0, $arglist_next12 = 0, $arglist_next15 = 0, $arglist_next18 = 0, $arglist_next21 = 0, $arglist_next24 = 0, $arglist_next27 = 0, $arglist_next3 = 0, $arglist_next6 = 0, $arglist_next9 = 0, $expanded = 0, $expanded28 = 0, $expanded30 = 0, $expanded31 = 0;
 var $expanded32 = 0, $expanded34 = 0, $expanded35 = 0, $expanded37 = 0, $expanded38 = 0, $expanded39 = 0, $expanded41 = 0, $expanded42 = 0, $expanded44 = 0, $expanded45 = 0, $expanded46 = 0, $expanded48 = 0, $expanded49 = 0, $expanded51 = 0, $expanded52 = 0, $expanded53 = 0, $expanded55 = 0, $expanded56 = 0, $expanded58 = 0, $expanded59 = 0;
 var $expanded60 = 0, $expanded62 = 0, $expanded63 = 0, $expanded65 = 0, $expanded66 = 0, $expanded67 = 0, $expanded69 = 0, $expanded70 = 0, $expanded72 = 0, $expanded73 = 0, $expanded74 = 0, $expanded76 = 0, $expanded77 = 0, $expanded79 = 0, $expanded80 = 0, $expanded81 = 0, $expanded83 = 0, $expanded84 = 0, $expanded86 = 0, $expanded87 = 0;
 var $expanded88 = 0, $expanded90 = 0, $expanded91 = 0, $expanded93 = 0, $expanded94 = 0, $expanded95 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($type>>>0)>(20);
 L1: do {
  if (!($0)) {
   do {
    switch ($type|0) {
    case 9:  {
     $arglist_current = HEAP32[$ap>>2]|0;
     $1 = $arglist_current;
     $2 = ((0) + 4|0);
     $expanded28 = $2;
     $expanded = (($expanded28) - 1)|0;
     $3 = (($1) + ($expanded))|0;
     $4 = ((0) + 4|0);
     $expanded32 = $4;
     $expanded31 = (($expanded32) - 1)|0;
     $expanded30 = $expanded31 ^ -1;
     $5 = $3 & $expanded30;
     $6 = $5;
     $7 = HEAP32[$6>>2]|0;
     $arglist_next = ((($6)) + 4|0);
     HEAP32[$ap>>2] = $arglist_next;
     HEAP32[$arg>>2] = $7;
     break L1;
     break;
    }
    case 10:  {
     $arglist_current2 = HEAP32[$ap>>2]|0;
     $8 = $arglist_current2;
     $9 = ((0) + 4|0);
     $expanded35 = $9;
     $expanded34 = (($expanded35) - 1)|0;
     $10 = (($8) + ($expanded34))|0;
     $11 = ((0) + 4|0);
     $expanded39 = $11;
     $expanded38 = (($expanded39) - 1)|0;
     $expanded37 = $expanded38 ^ -1;
     $12 = $10 & $expanded37;
     $13 = $12;
     $14 = HEAP32[$13>>2]|0;
     $arglist_next3 = ((($13)) + 4|0);
     HEAP32[$ap>>2] = $arglist_next3;
     $15 = ($14|0)<(0);
     $16 = $15 << 31 >> 31;
     $17 = $arg;
     $18 = $17;
     HEAP32[$18>>2] = $14;
     $19 = (($17) + 4)|0;
     $20 = $19;
     HEAP32[$20>>2] = $16;
     break L1;
     break;
    }
    case 11:  {
     $arglist_current5 = HEAP32[$ap>>2]|0;
     $21 = $arglist_current5;
     $22 = ((0) + 4|0);
     $expanded42 = $22;
     $expanded41 = (($expanded42) - 1)|0;
     $23 = (($21) + ($expanded41))|0;
     $24 = ((0) + 4|0);
     $expanded46 = $24;
     $expanded45 = (($expanded46) - 1)|0;
     $expanded44 = $expanded45 ^ -1;
     $25 = $23 & $expanded44;
     $26 = $25;
     $27 = HEAP32[$26>>2]|0;
     $arglist_next6 = ((($26)) + 4|0);
     HEAP32[$ap>>2] = $arglist_next6;
     $28 = $arg;
     $29 = $28;
     HEAP32[$29>>2] = $27;
     $30 = (($28) + 4)|0;
     $31 = $30;
     HEAP32[$31>>2] = 0;
     break L1;
     break;
    }
    case 12:  {
     $arglist_current8 = HEAP32[$ap>>2]|0;
     $32 = $arglist_current8;
     $33 = ((0) + 8|0);
     $expanded49 = $33;
     $expanded48 = (($expanded49) - 1)|0;
     $34 = (($32) + ($expanded48))|0;
     $35 = ((0) + 8|0);
     $expanded53 = $35;
     $expanded52 = (($expanded53) - 1)|0;
     $expanded51 = $expanded52 ^ -1;
     $36 = $34 & $expanded51;
     $37 = $36;
     $38 = $37;
     $39 = $38;
     $40 = HEAP32[$39>>2]|0;
     $41 = (($38) + 4)|0;
     $42 = $41;
     $43 = HEAP32[$42>>2]|0;
     $arglist_next9 = ((($37)) + 8|0);
     HEAP32[$ap>>2] = $arglist_next9;
     $44 = $arg;
     $45 = $44;
     HEAP32[$45>>2] = $40;
     $46 = (($44) + 4)|0;
     $47 = $46;
     HEAP32[$47>>2] = $43;
     break L1;
     break;
    }
    case 13:  {
     $arglist_current11 = HEAP32[$ap>>2]|0;
     $48 = $arglist_current11;
     $49 = ((0) + 4|0);
     $expanded56 = $49;
     $expanded55 = (($expanded56) - 1)|0;
     $50 = (($48) + ($expanded55))|0;
     $51 = ((0) + 4|0);
     $expanded60 = $51;
     $expanded59 = (($expanded60) - 1)|0;
     $expanded58 = $expanded59 ^ -1;
     $52 = $50 & $expanded58;
     $53 = $52;
     $54 = HEAP32[$53>>2]|0;
     $arglist_next12 = ((($53)) + 4|0);
     HEAP32[$ap>>2] = $arglist_next12;
     $55 = $54&65535;
     $56 = $55 << 16 >> 16;
     $57 = ($56|0)<(0);
     $58 = $57 << 31 >> 31;
     $59 = $arg;
     $60 = $59;
     HEAP32[$60>>2] = $56;
     $61 = (($59) + 4)|0;
     $62 = $61;
     HEAP32[$62>>2] = $58;
     break L1;
     break;
    }
    case 14:  {
     $arglist_current14 = HEAP32[$ap>>2]|0;
     $63 = $arglist_current14;
     $64 = ((0) + 4|0);
     $expanded63 = $64;
     $expanded62 = (($expanded63) - 1)|0;
     $65 = (($63) + ($expanded62))|0;
     $66 = ((0) + 4|0);
     $expanded67 = $66;
     $expanded66 = (($expanded67) - 1)|0;
     $expanded65 = $expanded66 ^ -1;
     $67 = $65 & $expanded65;
     $68 = $67;
     $69 = HEAP32[$68>>2]|0;
     $arglist_next15 = ((($68)) + 4|0);
     HEAP32[$ap>>2] = $arglist_next15;
     $$mask1 = $69 & 65535;
     $70 = $arg;
     $71 = $70;
     HEAP32[$71>>2] = $$mask1;
     $72 = (($70) + 4)|0;
     $73 = $72;
     HEAP32[$73>>2] = 0;
     break L1;
     break;
    }
    case 15:  {
     $arglist_current17 = HEAP32[$ap>>2]|0;
     $74 = $arglist_current17;
     $75 = ((0) + 4|0);
     $expanded70 = $75;
     $expanded69 = (($expanded70) - 1)|0;
     $76 = (($74) + ($expanded69))|0;
     $77 = ((0) + 4|0);
     $expanded74 = $77;
     $expanded73 = (($expanded74) - 1)|0;
     $expanded72 = $expanded73 ^ -1;
     $78 = $76 & $expanded72;
     $79 = $78;
     $80 = HEAP32[$79>>2]|0;
     $arglist_next18 = ((($79)) + 4|0);
     HEAP32[$ap>>2] = $arglist_next18;
     $81 = $80&255;
     $82 = $81 << 24 >> 24;
     $83 = ($82|0)<(0);
     $84 = $83 << 31 >> 31;
     $85 = $arg;
     $86 = $85;
     HEAP32[$86>>2] = $82;
     $87 = (($85) + 4)|0;
     $88 = $87;
     HEAP32[$88>>2] = $84;
     break L1;
     break;
    }
    case 16:  {
     $arglist_current20 = HEAP32[$ap>>2]|0;
     $89 = $arglist_current20;
     $90 = ((0) + 4|0);
     $expanded77 = $90;
     $expanded76 = (($expanded77) - 1)|0;
     $91 = (($89) + ($expanded76))|0;
     $92 = ((0) + 4|0);
     $expanded81 = $92;
     $expanded80 = (($expanded81) - 1)|0;
     $expanded79 = $expanded80 ^ -1;
     $93 = $91 & $expanded79;
     $94 = $93;
     $95 = HEAP32[$94>>2]|0;
     $arglist_next21 = ((($94)) + 4|0);
     HEAP32[$ap>>2] = $arglist_next21;
     $$mask = $95 & 255;
     $96 = $arg;
     $97 = $96;
     HEAP32[$97>>2] = $$mask;
     $98 = (($96) + 4)|0;
     $99 = $98;
     HEAP32[$99>>2] = 0;
     break L1;
     break;
    }
    case 17:  {
     $arglist_current23 = HEAP32[$ap>>2]|0;
     $100 = $arglist_current23;
     $101 = ((0) + 8|0);
     $expanded84 = $101;
     $expanded83 = (($expanded84) - 1)|0;
     $102 = (($100) + ($expanded83))|0;
     $103 = ((0) + 8|0);
     $expanded88 = $103;
     $expanded87 = (($expanded88) - 1)|0;
     $expanded86 = $expanded87 ^ -1;
     $104 = $102 & $expanded86;
     $105 = $104;
     $106 = +HEAPF64[$105>>3];
     $arglist_next24 = ((($105)) + 8|0);
     HEAP32[$ap>>2] = $arglist_next24;
     HEAPF64[$arg>>3] = $106;
     break L1;
     break;
    }
    case 18:  {
     $arglist_current26 = HEAP32[$ap>>2]|0;
     $107 = $arglist_current26;
     $108 = ((0) + 8|0);
     $expanded91 = $108;
     $expanded90 = (($expanded91) - 1)|0;
     $109 = (($107) + ($expanded90))|0;
     $110 = ((0) + 8|0);
     $expanded95 = $110;
     $expanded94 = (($expanded95) - 1)|0;
     $expanded93 = $expanded94 ^ -1;
     $111 = $109 & $expanded93;
     $112 = $111;
     $113 = +HEAPF64[$112>>3];
     $arglist_next27 = ((($112)) + 8|0);
     HEAP32[$ap>>2] = $arglist_next27;
     HEAPF64[$arg>>3] = $113;
     break L1;
     break;
    }
    default: {
     break L1;
    }
    }
   } while(0);
  }
 } while(0);
 return;
}
function _fmt_u($0,$1,$s) {
 $0 = $0|0;
 $1 = $1|0;
 $s = $s|0;
 var $$0$lcssa = 0, $$01$lcssa$off0 = 0, $$05 = 0, $$1$lcssa = 0, $$12 = 0, $$lcssa19 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0;
 var $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0, $29 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0, $8 = 0, $9 = 0, $y$03 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $2 = ($1>>>0)>(0);
 $3 = ($0>>>0)>(4294967295);
 $4 = ($1|0)==(0);
 $5 = $4 & $3;
 $6 = $2 | $5;
 if ($6) {
  $$05 = $s;$7 = $0;$8 = $1;
  while(1) {
   $9 = (___uremdi3(($7|0),($8|0),10,0)|0);
   $10 = tempRet0;
   $11 = $9 | 48;
   $12 = $11&255;
   $13 = ((($$05)) + -1|0);
   HEAP8[$13>>0] = $12;
   $14 = (___udivdi3(($7|0),($8|0),10,0)|0);
   $15 = tempRet0;
   $16 = ($8>>>0)>(9);
   $17 = ($7>>>0)>(4294967295);
   $18 = ($8|0)==(9);
   $19 = $18 & $17;
   $20 = $16 | $19;
   if ($20) {
    $$05 = $13;$7 = $14;$8 = $15;
   } else {
    $$lcssa19 = $13;$28 = $14;$29 = $15;
    break;
   }
  }
  $$0$lcssa = $$lcssa19;$$01$lcssa$off0 = $28;
 } else {
  $$0$lcssa = $s;$$01$lcssa$off0 = $0;
 }
 $21 = ($$01$lcssa$off0|0)==(0);
 if ($21) {
  $$1$lcssa = $$0$lcssa;
 } else {
  $$12 = $$0$lcssa;$y$03 = $$01$lcssa$off0;
  while(1) {
   $22 = (($y$03>>>0) % 10)&-1;
   $23 = $22 | 48;
   $24 = $23&255;
   $25 = ((($$12)) + -1|0);
   HEAP8[$25>>0] = $24;
   $26 = (($y$03>>>0) / 10)&-1;
   $27 = ($y$03>>>0)<(10);
   if ($27) {
    $$1$lcssa = $25;
    break;
   } else {
    $$12 = $25;$y$03 = $26;
   }
  }
 }
 return ($$1$lcssa|0);
}
function _pad($f,$c,$w,$l,$fl) {
 $f = $f|0;
 $c = $c|0;
 $w = $w|0;
 $l = $l|0;
 $fl = $fl|0;
 var $$0$lcssa6 = 0, $$02 = 0, $$pre = 0, $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $2 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0, $7 = 0;
 var $8 = 0, $9 = 0, $or$cond = 0, $pad = 0, label = 0, sp = 0;
 sp = STACKTOP;
 STACKTOP = STACKTOP + 256|0;
 $pad = sp;
 $0 = $fl & 73728;
 $1 = ($0|0)==(0);
 $2 = ($w|0)>($l|0);
 $or$cond = $2 & $1;
 do {
  if ($or$cond) {
   $3 = (($w) - ($l))|0;
   $4 = ($3>>>0)>(256);
   $5 = $4 ? 256 : $3;
   _memset(($pad|0),($c|0),($5|0))|0;
   $6 = ($3>>>0)>(255);
   $7 = HEAP32[$f>>2]|0;
   $8 = $7 & 32;
   $9 = ($8|0)==(0);
   if ($6) {
    $10 = (($w) - ($l))|0;
    $$02 = $3;$17 = $7;$18 = $9;
    while(1) {
     if ($18) {
      (___fwritex($pad,256,$f)|0);
      $$pre = HEAP32[$f>>2]|0;
      $14 = $$pre;
     } else {
      $14 = $17;
     }
     $11 = (($$02) + -256)|0;
     $12 = ($11>>>0)>(255);
     $13 = $14 & 32;
     $15 = ($13|0)==(0);
     if ($12) {
      $$02 = $11;$17 = $14;$18 = $15;
     } else {
      break;
     }
    }
    $16 = $10 & 255;
    if ($15) {
     $$0$lcssa6 = $16;
    } else {
     break;
    }
   } else {
    if ($9) {
     $$0$lcssa6 = $3;
    } else {
     break;
    }
   }
   (___fwritex($pad,$$0$lcssa6,$f)|0);
  }
 } while(0);
 STACKTOP = sp;return;
}
function _malloc($bytes) {
 $bytes = $bytes|0;
 var $$0 = 0, $$lcssa = 0, $$lcssa141 = 0, $$lcssa142 = 0, $$lcssa144 = 0, $$lcssa147 = 0, $$lcssa149 = 0, $$lcssa151 = 0, $$lcssa153 = 0, $$lcssa155 = 0, $$lcssa157 = 0, $$not$i = 0, $$pre = 0, $$pre$i = 0, $$pre$i$13 = 0, $$pre$i$16$i = 0, $$pre$i$i = 0, $$pre$phi$i$14Z2D = 0, $$pre$phi$i$17$iZ2D = 0, $$pre$phi$i$iZ2D = 0;
 var $$pre$phi$iZ2D = 0, $$pre$phi10$i$iZ2D = 0, $$pre$phiZ2D = 0, $$pre71 = 0, $$pre9$i$i = 0, $$rsize$0$i = 0, $$rsize$4$i = 0, $$v$0$i = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $1000 = 0, $1001 = 0, $1002 = 0, $1003 = 0, $1004 = 0, $1005 = 0, $1006 = 0, $1007 = 0;
 var $1008 = 0, $1009 = 0, $101 = 0, $1010 = 0, $1011 = 0, $1012 = 0, $1013 = 0, $1014 = 0, $1015 = 0, $1016 = 0, $1017 = 0, $1018 = 0, $1019 = 0, $102 = 0, $1020 = 0, $1021 = 0, $1022 = 0, $1023 = 0, $1024 = 0, $1025 = 0;
 var $1026 = 0, $1027 = 0, $1028 = 0, $1029 = 0, $103 = 0, $1030 = 0, $1031 = 0, $1032 = 0, $1033 = 0, $1034 = 0, $1035 = 0, $1036 = 0, $1037 = 0, $1038 = 0, $1039 = 0, $104 = 0, $1040 = 0, $1041 = 0, $1042 = 0, $1043 = 0;
 var $1044 = 0, $1045 = 0, $1046 = 0, $1047 = 0, $1048 = 0, $1049 = 0, $105 = 0, $1050 = 0, $1051 = 0, $1052 = 0, $1053 = 0, $1054 = 0, $1055 = 0, $1056 = 0, $1057 = 0, $1058 = 0, $1059 = 0, $106 = 0, $1060 = 0, $1061 = 0;
 var $1062 = 0, $1063 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0;
 var $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0;
 var $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0;
 var $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0;
 var $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0;
 var $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0;
 var $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0;
 var $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0;
 var $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0;
 var $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0;
 var $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0;
 var $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0, $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $320 = 0;
 var $321 = 0, $322 = 0, $323 = 0, $324 = 0, $325 = 0, $326 = 0, $327 = 0, $328 = 0, $329 = 0, $33 = 0, $330 = 0, $331 = 0, $332 = 0, $333 = 0, $334 = 0, $335 = 0, $336 = 0, $337 = 0, $338 = 0, $339 = 0;
 var $34 = 0, $340 = 0, $341 = 0, $342 = 0, $343 = 0, $344 = 0, $345 = 0, $346 = 0, $347 = 0, $348 = 0, $349 = 0, $35 = 0, $350 = 0, $351 = 0, $352 = 0, $353 = 0, $354 = 0, $355 = 0, $356 = 0, $357 = 0;
 var $358 = 0, $359 = 0, $36 = 0, $360 = 0, $361 = 0, $362 = 0, $363 = 0, $364 = 0, $365 = 0, $366 = 0, $367 = 0, $368 = 0, $369 = 0, $37 = 0, $370 = 0, $371 = 0, $372 = 0, $373 = 0, $374 = 0, $375 = 0;
 var $376 = 0, $377 = 0, $378 = 0, $379 = 0, $38 = 0, $380 = 0, $381 = 0, $382 = 0, $383 = 0, $384 = 0, $385 = 0, $386 = 0, $387 = 0, $388 = 0, $389 = 0, $39 = 0, $390 = 0, $391 = 0, $392 = 0, $393 = 0;
 var $394 = 0, $395 = 0, $396 = 0, $397 = 0, $398 = 0, $399 = 0, $4 = 0, $40 = 0, $400 = 0, $401 = 0, $402 = 0, $403 = 0, $404 = 0, $405 = 0, $406 = 0, $407 = 0, $408 = 0, $409 = 0, $41 = 0, $410 = 0;
 var $411 = 0, $412 = 0, $413 = 0, $414 = 0, $415 = 0, $416 = 0, $417 = 0, $418 = 0, $419 = 0, $42 = 0, $420 = 0, $421 = 0, $422 = 0, $423 = 0, $424 = 0, $425 = 0, $426 = 0, $427 = 0, $428 = 0, $429 = 0;
 var $43 = 0, $430 = 0, $431 = 0, $432 = 0, $433 = 0, $434 = 0, $435 = 0, $436 = 0, $437 = 0, $438 = 0, $439 = 0, $44 = 0, $440 = 0, $441 = 0, $442 = 0, $443 = 0, $444 = 0, $445 = 0, $446 = 0, $447 = 0;
 var $448 = 0, $449 = 0, $45 = 0, $450 = 0, $451 = 0, $452 = 0, $453 = 0, $454 = 0, $455 = 0, $456 = 0, $457 = 0, $458 = 0, $459 = 0, $46 = 0, $460 = 0, $461 = 0, $462 = 0, $463 = 0, $464 = 0, $465 = 0;
 var $466 = 0, $467 = 0, $468 = 0, $469 = 0, $47 = 0, $470 = 0, $471 = 0, $472 = 0, $473 = 0, $474 = 0, $475 = 0, $476 = 0, $477 = 0, $478 = 0, $479 = 0, $48 = 0, $480 = 0, $481 = 0, $482 = 0, $483 = 0;
 var $484 = 0, $485 = 0, $486 = 0, $487 = 0, $488 = 0, $489 = 0, $49 = 0, $490 = 0, $491 = 0, $492 = 0, $493 = 0, $494 = 0, $495 = 0, $496 = 0, $497 = 0, $498 = 0, $499 = 0, $5 = 0, $50 = 0, $500 = 0;
 var $501 = 0, $502 = 0, $503 = 0, $504 = 0, $505 = 0, $506 = 0, $507 = 0, $508 = 0, $509 = 0, $51 = 0, $510 = 0, $511 = 0, $512 = 0, $513 = 0, $514 = 0, $515 = 0, $516 = 0, $517 = 0, $518 = 0, $519 = 0;
 var $52 = 0, $520 = 0, $521 = 0, $522 = 0, $523 = 0, $524 = 0, $525 = 0, $526 = 0, $527 = 0, $528 = 0, $529 = 0, $53 = 0, $530 = 0, $531 = 0, $532 = 0, $533 = 0, $534 = 0, $535 = 0, $536 = 0, $537 = 0;
 var $538 = 0, $539 = 0, $54 = 0, $540 = 0, $541 = 0, $542 = 0, $543 = 0, $544 = 0, $545 = 0, $546 = 0, $547 = 0, $548 = 0, $549 = 0, $55 = 0, $550 = 0, $551 = 0, $552 = 0, $553 = 0, $554 = 0, $555 = 0;
 var $556 = 0, $557 = 0, $558 = 0, $559 = 0, $56 = 0, $560 = 0, $561 = 0, $562 = 0, $563 = 0, $564 = 0, $565 = 0, $566 = 0, $567 = 0, $568 = 0, $569 = 0, $57 = 0, $570 = 0, $571 = 0, $572 = 0, $573 = 0;
 var $574 = 0, $575 = 0, $576 = 0, $577 = 0, $578 = 0, $579 = 0, $58 = 0, $580 = 0, $581 = 0, $582 = 0, $583 = 0, $584 = 0, $585 = 0, $586 = 0, $587 = 0, $588 = 0, $589 = 0, $59 = 0, $590 = 0, $591 = 0;
 var $592 = 0, $593 = 0, $594 = 0, $595 = 0, $596 = 0, $597 = 0, $598 = 0, $599 = 0, $6 = 0, $60 = 0, $600 = 0, $601 = 0, $602 = 0, $603 = 0, $604 = 0, $605 = 0, $606 = 0, $607 = 0, $608 = 0, $609 = 0;
 var $61 = 0, $610 = 0, $611 = 0, $612 = 0, $613 = 0, $614 = 0, $615 = 0, $616 = 0, $617 = 0, $618 = 0, $619 = 0, $62 = 0, $620 = 0, $621 = 0, $622 = 0, $623 = 0, $624 = 0, $625 = 0, $626 = 0, $627 = 0;
 var $628 = 0, $629 = 0, $63 = 0, $630 = 0, $631 = 0, $632 = 0, $633 = 0, $634 = 0, $635 = 0, $636 = 0, $637 = 0, $638 = 0, $639 = 0, $64 = 0, $640 = 0, $641 = 0, $642 = 0, $643 = 0, $644 = 0, $645 = 0;
 var $646 = 0, $647 = 0, $648 = 0, $649 = 0, $65 = 0, $650 = 0, $651 = 0, $652 = 0, $653 = 0, $654 = 0, $655 = 0, $656 = 0, $657 = 0, $658 = 0, $659 = 0, $66 = 0, $660 = 0, $661 = 0, $662 = 0, $663 = 0;
 var $664 = 0, $665 = 0, $666 = 0, $667 = 0, $668 = 0, $669 = 0, $67 = 0, $670 = 0, $671 = 0, $672 = 0, $673 = 0, $674 = 0, $675 = 0, $676 = 0, $677 = 0, $678 = 0, $679 = 0, $68 = 0, $680 = 0, $681 = 0;
 var $682 = 0, $683 = 0, $684 = 0, $685 = 0, $686 = 0, $687 = 0, $688 = 0, $689 = 0, $69 = 0, $690 = 0, $691 = 0, $692 = 0, $693 = 0, $694 = 0, $695 = 0, $696 = 0, $697 = 0, $698 = 0, $699 = 0, $7 = 0;
 var $70 = 0, $700 = 0, $701 = 0, $702 = 0, $703 = 0, $704 = 0, $705 = 0, $706 = 0, $707 = 0, $708 = 0, $709 = 0, $71 = 0, $710 = 0, $711 = 0, $712 = 0, $713 = 0, $714 = 0, $715 = 0, $716 = 0, $717 = 0;
 var $718 = 0, $719 = 0, $72 = 0, $720 = 0, $721 = 0, $722 = 0, $723 = 0, $724 = 0, $725 = 0, $726 = 0, $727 = 0, $728 = 0, $729 = 0, $73 = 0, $730 = 0, $731 = 0, $732 = 0, $733 = 0, $734 = 0, $735 = 0;
 var $736 = 0, $737 = 0, $738 = 0, $739 = 0, $74 = 0, $740 = 0, $741 = 0, $742 = 0, $743 = 0, $744 = 0, $745 = 0, $746 = 0, $747 = 0, $748 = 0, $749 = 0, $75 = 0, $750 = 0, $751 = 0, $752 = 0, $753 = 0;
 var $754 = 0, $755 = 0, $756 = 0, $757 = 0, $758 = 0, $759 = 0, $76 = 0, $760 = 0, $761 = 0, $762 = 0, $763 = 0, $764 = 0, $765 = 0, $766 = 0, $767 = 0, $768 = 0, $769 = 0, $77 = 0, $770 = 0, $771 = 0;
 var $772 = 0, $773 = 0, $774 = 0, $775 = 0, $776 = 0, $777 = 0, $778 = 0, $779 = 0, $78 = 0, $780 = 0, $781 = 0, $782 = 0, $783 = 0, $784 = 0, $785 = 0, $786 = 0, $787 = 0, $788 = 0, $789 = 0, $79 = 0;
 var $790 = 0, $791 = 0, $792 = 0, $793 = 0, $794 = 0, $795 = 0, $796 = 0, $797 = 0, $798 = 0, $799 = 0, $8 = 0, $80 = 0, $800 = 0, $801 = 0, $802 = 0, $803 = 0, $804 = 0, $805 = 0, $806 = 0, $807 = 0;
 var $808 = 0, $809 = 0, $81 = 0, $810 = 0, $811 = 0, $812 = 0, $813 = 0, $814 = 0, $815 = 0, $816 = 0, $817 = 0, $818 = 0, $819 = 0, $82 = 0, $820 = 0, $821 = 0, $822 = 0, $823 = 0, $824 = 0, $825 = 0;
 var $826 = 0, $827 = 0, $828 = 0, $829 = 0, $83 = 0, $830 = 0, $831 = 0, $832 = 0, $833 = 0, $834 = 0, $835 = 0, $836 = 0, $837 = 0, $838 = 0, $839 = 0, $84 = 0, $840 = 0, $841 = 0, $842 = 0, $843 = 0;
 var $844 = 0, $845 = 0, $846 = 0, $847 = 0, $848 = 0, $849 = 0, $85 = 0, $850 = 0, $851 = 0, $852 = 0, $853 = 0, $854 = 0, $855 = 0, $856 = 0, $857 = 0, $858 = 0, $859 = 0, $86 = 0, $860 = 0, $861 = 0;
 var $862 = 0, $863 = 0, $864 = 0, $865 = 0, $866 = 0, $867 = 0, $868 = 0, $869 = 0, $87 = 0, $870 = 0, $871 = 0, $872 = 0, $873 = 0, $874 = 0, $875 = 0, $876 = 0, $877 = 0, $878 = 0, $879 = 0, $88 = 0;
 var $880 = 0, $881 = 0, $882 = 0, $883 = 0, $884 = 0, $885 = 0, $886 = 0, $887 = 0, $888 = 0, $889 = 0, $89 = 0, $890 = 0, $891 = 0, $892 = 0, $893 = 0, $894 = 0, $895 = 0, $896 = 0, $897 = 0, $898 = 0;
 var $899 = 0, $9 = 0, $90 = 0, $900 = 0, $901 = 0, $902 = 0, $903 = 0, $904 = 0, $905 = 0, $906 = 0, $907 = 0, $908 = 0, $909 = 0, $91 = 0, $910 = 0, $911 = 0, $912 = 0, $913 = 0, $914 = 0, $915 = 0;
 var $916 = 0, $917 = 0, $918 = 0, $919 = 0, $92 = 0, $920 = 0, $921 = 0, $922 = 0, $923 = 0, $924 = 0, $925 = 0, $926 = 0, $927 = 0, $928 = 0, $929 = 0, $93 = 0, $930 = 0, $931 = 0, $932 = 0, $933 = 0;
 var $934 = 0, $935 = 0, $936 = 0, $937 = 0, $938 = 0, $939 = 0, $94 = 0, $940 = 0, $941 = 0, $942 = 0, $943 = 0, $944 = 0, $945 = 0, $946 = 0, $947 = 0, $948 = 0, $949 = 0, $95 = 0, $950 = 0, $951 = 0;
 var $952 = 0, $953 = 0, $954 = 0, $955 = 0, $956 = 0, $957 = 0, $958 = 0, $959 = 0, $96 = 0, $960 = 0, $961 = 0, $962 = 0, $963 = 0, $964 = 0, $965 = 0, $966 = 0, $967 = 0, $968 = 0, $969 = 0, $97 = 0;
 var $970 = 0, $971 = 0, $972 = 0, $973 = 0, $974 = 0, $975 = 0, $976 = 0, $977 = 0, $978 = 0, $979 = 0, $98 = 0, $980 = 0, $981 = 0, $982 = 0, $983 = 0, $984 = 0, $985 = 0, $986 = 0, $987 = 0, $988 = 0;
 var $989 = 0, $99 = 0, $990 = 0, $991 = 0, $992 = 0, $993 = 0, $994 = 0, $995 = 0, $996 = 0, $997 = 0, $998 = 0, $999 = 0, $F$0$i$i = 0, $F1$0$i = 0, $F4$0 = 0, $F4$0$i$i = 0, $F5$0$i = 0, $I1$0$i$i = 0, $I7$0$i = 0, $I7$0$i$i = 0;
 var $K12$0$i = 0, $K2$0$i$i = 0, $K8$0$i$i = 0, $R$1$i = 0, $R$1$i$9 = 0, $R$1$i$9$lcssa = 0, $R$1$i$i = 0, $R$1$i$i$lcssa = 0, $R$1$i$lcssa = 0, $R$3$i = 0, $R$3$i$11 = 0, $R$3$i$i = 0, $RP$1$i = 0, $RP$1$i$8 = 0, $RP$1$i$8$lcssa = 0, $RP$1$i$i = 0, $RP$1$i$i$lcssa = 0, $RP$1$i$lcssa = 0, $T$0$i = 0, $T$0$i$18$i = 0;
 var $T$0$i$18$i$lcssa = 0, $T$0$i$18$i$lcssa139 = 0, $T$0$i$i = 0, $T$0$i$i$lcssa = 0, $T$0$i$i$lcssa140 = 0, $T$0$i$lcssa = 0, $T$0$i$lcssa156 = 0, $br$2$ph$i = 0, $cond$i = 0, $cond$i$12 = 0, $cond$i$i = 0, $exitcond$i$i = 0, $i$01$i$i = 0, $idx$0$i = 0, $nb$0 = 0, $not$$i$20$i = 0, $not$$i$i = 0, $not$7$i = 0, $oldfirst$0$i$i = 0, $or$cond$i = 0;
 var $or$cond$i$17 = 0, $or$cond1$i = 0, $or$cond1$i$16 = 0, $or$cond10$i = 0, $or$cond11$i = 0, $or$cond2$i = 0, $or$cond48$i = 0, $or$cond5$i = 0, $or$cond7$i = 0, $or$cond8$i = 0, $p$0$i$i = 0, $qsize$0$i$i = 0, $rsize$0$i = 0, $rsize$0$i$5 = 0, $rsize$0$i$lcssa = 0, $rsize$1$i = 0, $rsize$3$i = 0, $rsize$4$lcssa$i = 0, $rsize$412$i = 0, $rst$0$i = 0;
 var $rst$1$i = 0, $sizebits$0$$i = 0, $sizebits$0$i = 0, $sp$0$i$i = 0, $sp$0$i$i$i = 0, $sp$068$i = 0, $sp$068$i$lcssa = 0, $sp$167$i = 0, $sp$167$i$lcssa = 0, $ssize$0$i = 0, $ssize$2$ph$i = 0, $ssize$5$i = 0, $t$0$i = 0, $t$0$i$4 = 0, $t$2$i = 0, $t$4$ph$i = 0, $t$4$v$4$i = 0, $t$411$i = 0, $tbase$746$i = 0, $tsize$745$i = 0;
 var $v$0$i = 0, $v$0$i$6 = 0, $v$0$i$lcssa = 0, $v$1$i = 0, $v$3$i = 0, $v$4$lcssa$i = 0, $v$413$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($bytes>>>0)<(245);
 do {
  if ($0) {
   $1 = ($bytes>>>0)<(11);
   $2 = (($bytes) + 11)|0;
   $3 = $2 & -8;
   $4 = $1 ? 16 : $3;
   $5 = $4 >>> 3;
   $6 = HEAP32[2030]|0;
   $7 = $6 >>> $5;
   $8 = $7 & 3;
   $9 = ($8|0)==(0);
   if (!($9)) {
    $10 = $7 & 1;
    $11 = $10 ^ 1;
    $12 = (($11) + ($5))|0;
    $13 = $12 << 1;
    $14 = (8160 + ($13<<2)|0);
    $15 = ((($14)) + 8|0);
    $16 = HEAP32[$15>>2]|0;
    $17 = ((($16)) + 8|0);
    $18 = HEAP32[$17>>2]|0;
    $19 = ($14|0)==($18|0);
    do {
     if ($19) {
      $20 = 1 << $12;
      $21 = $20 ^ -1;
      $22 = $6 & $21;
      HEAP32[2030] = $22;
     } else {
      $23 = HEAP32[(8136)>>2]|0;
      $24 = ($18>>>0)<($23>>>0);
      if ($24) {
       _abort();
       // unreachable;
      }
      $25 = ((($18)) + 12|0);
      $26 = HEAP32[$25>>2]|0;
      $27 = ($26|0)==($16|0);
      if ($27) {
       HEAP32[$25>>2] = $14;
       HEAP32[$15>>2] = $18;
       break;
      } else {
       _abort();
       // unreachable;
      }
     }
    } while(0);
    $28 = $12 << 3;
    $29 = $28 | 3;
    $30 = ((($16)) + 4|0);
    HEAP32[$30>>2] = $29;
    $31 = (($16) + ($28)|0);
    $32 = ((($31)) + 4|0);
    $33 = HEAP32[$32>>2]|0;
    $34 = $33 | 1;
    HEAP32[$32>>2] = $34;
    $$0 = $17;
    return ($$0|0);
   }
   $35 = HEAP32[(8128)>>2]|0;
   $36 = ($4>>>0)>($35>>>0);
   if ($36) {
    $37 = ($7|0)==(0);
    if (!($37)) {
     $38 = $7 << $5;
     $39 = 2 << $5;
     $40 = (0 - ($39))|0;
     $41 = $39 | $40;
     $42 = $38 & $41;
     $43 = (0 - ($42))|0;
     $44 = $42 & $43;
     $45 = (($44) + -1)|0;
     $46 = $45 >>> 12;
     $47 = $46 & 16;
     $48 = $45 >>> $47;
     $49 = $48 >>> 5;
     $50 = $49 & 8;
     $51 = $50 | $47;
     $52 = $48 >>> $50;
     $53 = $52 >>> 2;
     $54 = $53 & 4;
     $55 = $51 | $54;
     $56 = $52 >>> $54;
     $57 = $56 >>> 1;
     $58 = $57 & 2;
     $59 = $55 | $58;
     $60 = $56 >>> $58;
     $61 = $60 >>> 1;
     $62 = $61 & 1;
     $63 = $59 | $62;
     $64 = $60 >>> $62;
     $65 = (($63) + ($64))|0;
     $66 = $65 << 1;
     $67 = (8160 + ($66<<2)|0);
     $68 = ((($67)) + 8|0);
     $69 = HEAP32[$68>>2]|0;
     $70 = ((($69)) + 8|0);
     $71 = HEAP32[$70>>2]|0;
     $72 = ($67|0)==($71|0);
     do {
      if ($72) {
       $73 = 1 << $65;
       $74 = $73 ^ -1;
       $75 = $6 & $74;
       HEAP32[2030] = $75;
       $90 = $35;
      } else {
       $76 = HEAP32[(8136)>>2]|0;
       $77 = ($71>>>0)<($76>>>0);
       if ($77) {
        _abort();
        // unreachable;
       }
       $78 = ((($71)) + 12|0);
       $79 = HEAP32[$78>>2]|0;
       $80 = ($79|0)==($69|0);
       if ($80) {
        HEAP32[$78>>2] = $67;
        HEAP32[$68>>2] = $71;
        $$pre = HEAP32[(8128)>>2]|0;
        $90 = $$pre;
        break;
       } else {
        _abort();
        // unreachable;
       }
      }
     } while(0);
     $81 = $65 << 3;
     $82 = (($81) - ($4))|0;
     $83 = $4 | 3;
     $84 = ((($69)) + 4|0);
     HEAP32[$84>>2] = $83;
     $85 = (($69) + ($4)|0);
     $86 = $82 | 1;
     $87 = ((($85)) + 4|0);
     HEAP32[$87>>2] = $86;
     $88 = (($85) + ($82)|0);
     HEAP32[$88>>2] = $82;
     $89 = ($90|0)==(0);
     if (!($89)) {
      $91 = HEAP32[(8140)>>2]|0;
      $92 = $90 >>> 3;
      $93 = $92 << 1;
      $94 = (8160 + ($93<<2)|0);
      $95 = HEAP32[2030]|0;
      $96 = 1 << $92;
      $97 = $95 & $96;
      $98 = ($97|0)==(0);
      if ($98) {
       $99 = $95 | $96;
       HEAP32[2030] = $99;
       $$pre71 = ((($94)) + 8|0);
       $$pre$phiZ2D = $$pre71;$F4$0 = $94;
      } else {
       $100 = ((($94)) + 8|0);
       $101 = HEAP32[$100>>2]|0;
       $102 = HEAP32[(8136)>>2]|0;
       $103 = ($101>>>0)<($102>>>0);
       if ($103) {
        _abort();
        // unreachable;
       } else {
        $$pre$phiZ2D = $100;$F4$0 = $101;
       }
      }
      HEAP32[$$pre$phiZ2D>>2] = $91;
      $104 = ((($F4$0)) + 12|0);
      HEAP32[$104>>2] = $91;
      $105 = ((($91)) + 8|0);
      HEAP32[$105>>2] = $F4$0;
      $106 = ((($91)) + 12|0);
      HEAP32[$106>>2] = $94;
     }
     HEAP32[(8128)>>2] = $82;
     HEAP32[(8140)>>2] = $85;
     $$0 = $70;
     return ($$0|0);
    }
    $107 = HEAP32[(8124)>>2]|0;
    $108 = ($107|0)==(0);
    if ($108) {
     $nb$0 = $4;
    } else {
     $109 = (0 - ($107))|0;
     $110 = $107 & $109;
     $111 = (($110) + -1)|0;
     $112 = $111 >>> 12;
     $113 = $112 & 16;
     $114 = $111 >>> $113;
     $115 = $114 >>> 5;
     $116 = $115 & 8;
     $117 = $116 | $113;
     $118 = $114 >>> $116;
     $119 = $118 >>> 2;
     $120 = $119 & 4;
     $121 = $117 | $120;
     $122 = $118 >>> $120;
     $123 = $122 >>> 1;
     $124 = $123 & 2;
     $125 = $121 | $124;
     $126 = $122 >>> $124;
     $127 = $126 >>> 1;
     $128 = $127 & 1;
     $129 = $125 | $128;
     $130 = $126 >>> $128;
     $131 = (($129) + ($130))|0;
     $132 = (8424 + ($131<<2)|0);
     $133 = HEAP32[$132>>2]|0;
     $134 = ((($133)) + 4|0);
     $135 = HEAP32[$134>>2]|0;
     $136 = $135 & -8;
     $137 = (($136) - ($4))|0;
     $rsize$0$i = $137;$t$0$i = $133;$v$0$i = $133;
     while(1) {
      $138 = ((($t$0$i)) + 16|0);
      $139 = HEAP32[$138>>2]|0;
      $140 = ($139|0)==(0|0);
      if ($140) {
       $141 = ((($t$0$i)) + 20|0);
       $142 = HEAP32[$141>>2]|0;
       $143 = ($142|0)==(0|0);
       if ($143) {
        $rsize$0$i$lcssa = $rsize$0$i;$v$0$i$lcssa = $v$0$i;
        break;
       } else {
        $145 = $142;
       }
      } else {
       $145 = $139;
      }
      $144 = ((($145)) + 4|0);
      $146 = HEAP32[$144>>2]|0;
      $147 = $146 & -8;
      $148 = (($147) - ($4))|0;
      $149 = ($148>>>0)<($rsize$0$i>>>0);
      $$rsize$0$i = $149 ? $148 : $rsize$0$i;
      $$v$0$i = $149 ? $145 : $v$0$i;
      $rsize$0$i = $$rsize$0$i;$t$0$i = $145;$v$0$i = $$v$0$i;
     }
     $150 = HEAP32[(8136)>>2]|0;
     $151 = ($v$0$i$lcssa>>>0)<($150>>>0);
     if ($151) {
      _abort();
      // unreachable;
     }
     $152 = (($v$0$i$lcssa) + ($4)|0);
     $153 = ($v$0$i$lcssa>>>0)<($152>>>0);
     if (!($153)) {
      _abort();
      // unreachable;
     }
     $154 = ((($v$0$i$lcssa)) + 24|0);
     $155 = HEAP32[$154>>2]|0;
     $156 = ((($v$0$i$lcssa)) + 12|0);
     $157 = HEAP32[$156>>2]|0;
     $158 = ($157|0)==($v$0$i$lcssa|0);
     do {
      if ($158) {
       $168 = ((($v$0$i$lcssa)) + 20|0);
       $169 = HEAP32[$168>>2]|0;
       $170 = ($169|0)==(0|0);
       if ($170) {
        $171 = ((($v$0$i$lcssa)) + 16|0);
        $172 = HEAP32[$171>>2]|0;
        $173 = ($172|0)==(0|0);
        if ($173) {
         $R$3$i = 0;
         break;
        } else {
         $R$1$i = $172;$RP$1$i = $171;
        }
       } else {
        $R$1$i = $169;$RP$1$i = $168;
       }
       while(1) {
        $174 = ((($R$1$i)) + 20|0);
        $175 = HEAP32[$174>>2]|0;
        $176 = ($175|0)==(0|0);
        if (!($176)) {
         $R$1$i = $175;$RP$1$i = $174;
         continue;
        }
        $177 = ((($R$1$i)) + 16|0);
        $178 = HEAP32[$177>>2]|0;
        $179 = ($178|0)==(0|0);
        if ($179) {
         $R$1$i$lcssa = $R$1$i;$RP$1$i$lcssa = $RP$1$i;
         break;
        } else {
         $R$1$i = $178;$RP$1$i = $177;
        }
       }
       $180 = ($RP$1$i$lcssa>>>0)<($150>>>0);
       if ($180) {
        _abort();
        // unreachable;
       } else {
        HEAP32[$RP$1$i$lcssa>>2] = 0;
        $R$3$i = $R$1$i$lcssa;
        break;
       }
      } else {
       $159 = ((($v$0$i$lcssa)) + 8|0);
       $160 = HEAP32[$159>>2]|0;
       $161 = ($160>>>0)<($150>>>0);
       if ($161) {
        _abort();
        // unreachable;
       }
       $162 = ((($160)) + 12|0);
       $163 = HEAP32[$162>>2]|0;
       $164 = ($163|0)==($v$0$i$lcssa|0);
       if (!($164)) {
        _abort();
        // unreachable;
       }
       $165 = ((($157)) + 8|0);
       $166 = HEAP32[$165>>2]|0;
       $167 = ($166|0)==($v$0$i$lcssa|0);
       if ($167) {
        HEAP32[$162>>2] = $157;
        HEAP32[$165>>2] = $160;
        $R$3$i = $157;
        break;
       } else {
        _abort();
        // unreachable;
       }
      }
     } while(0);
     $181 = ($155|0)==(0|0);
     do {
      if (!($181)) {
       $182 = ((($v$0$i$lcssa)) + 28|0);
       $183 = HEAP32[$182>>2]|0;
       $184 = (8424 + ($183<<2)|0);
       $185 = HEAP32[$184>>2]|0;
       $186 = ($v$0$i$lcssa|0)==($185|0);
       if ($186) {
        HEAP32[$184>>2] = $R$3$i;
        $cond$i = ($R$3$i|0)==(0|0);
        if ($cond$i) {
         $187 = 1 << $183;
         $188 = $187 ^ -1;
         $189 = HEAP32[(8124)>>2]|0;
         $190 = $189 & $188;
         HEAP32[(8124)>>2] = $190;
         break;
        }
       } else {
        $191 = HEAP32[(8136)>>2]|0;
        $192 = ($155>>>0)<($191>>>0);
        if ($192) {
         _abort();
         // unreachable;
        }
        $193 = ((($155)) + 16|0);
        $194 = HEAP32[$193>>2]|0;
        $195 = ($194|0)==($v$0$i$lcssa|0);
        if ($195) {
         HEAP32[$193>>2] = $R$3$i;
        } else {
         $196 = ((($155)) + 20|0);
         HEAP32[$196>>2] = $R$3$i;
        }
        $197 = ($R$3$i|0)==(0|0);
        if ($197) {
         break;
        }
       }
       $198 = HEAP32[(8136)>>2]|0;
       $199 = ($R$3$i>>>0)<($198>>>0);
       if ($199) {
        _abort();
        // unreachable;
       }
       $200 = ((($R$3$i)) + 24|0);
       HEAP32[$200>>2] = $155;
       $201 = ((($v$0$i$lcssa)) + 16|0);
       $202 = HEAP32[$201>>2]|0;
       $203 = ($202|0)==(0|0);
       do {
        if (!($203)) {
         $204 = ($202>>>0)<($198>>>0);
         if ($204) {
          _abort();
          // unreachable;
         } else {
          $205 = ((($R$3$i)) + 16|0);
          HEAP32[$205>>2] = $202;
          $206 = ((($202)) + 24|0);
          HEAP32[$206>>2] = $R$3$i;
          break;
         }
        }
       } while(0);
       $207 = ((($v$0$i$lcssa)) + 20|0);
       $208 = HEAP32[$207>>2]|0;
       $209 = ($208|0)==(0|0);
       if (!($209)) {
        $210 = HEAP32[(8136)>>2]|0;
        $211 = ($208>>>0)<($210>>>0);
        if ($211) {
         _abort();
         // unreachable;
        } else {
         $212 = ((($R$3$i)) + 20|0);
         HEAP32[$212>>2] = $208;
         $213 = ((($208)) + 24|0);
         HEAP32[$213>>2] = $R$3$i;
         break;
        }
       }
      }
     } while(0);
     $214 = ($rsize$0$i$lcssa>>>0)<(16);
     if ($214) {
      $215 = (($rsize$0$i$lcssa) + ($4))|0;
      $216 = $215 | 3;
      $217 = ((($v$0$i$lcssa)) + 4|0);
      HEAP32[$217>>2] = $216;
      $218 = (($v$0$i$lcssa) + ($215)|0);
      $219 = ((($218)) + 4|0);
      $220 = HEAP32[$219>>2]|0;
      $221 = $220 | 1;
      HEAP32[$219>>2] = $221;
     } else {
      $222 = $4 | 3;
      $223 = ((($v$0$i$lcssa)) + 4|0);
      HEAP32[$223>>2] = $222;
      $224 = $rsize$0$i$lcssa | 1;
      $225 = ((($152)) + 4|0);
      HEAP32[$225>>2] = $224;
      $226 = (($152) + ($rsize$0$i$lcssa)|0);
      HEAP32[$226>>2] = $rsize$0$i$lcssa;
      $227 = HEAP32[(8128)>>2]|0;
      $228 = ($227|0)==(0);
      if (!($228)) {
       $229 = HEAP32[(8140)>>2]|0;
       $230 = $227 >>> 3;
       $231 = $230 << 1;
       $232 = (8160 + ($231<<2)|0);
       $233 = HEAP32[2030]|0;
       $234 = 1 << $230;
       $235 = $233 & $234;
       $236 = ($235|0)==(0);
       if ($236) {
        $237 = $233 | $234;
        HEAP32[2030] = $237;
        $$pre$i = ((($232)) + 8|0);
        $$pre$phi$iZ2D = $$pre$i;$F1$0$i = $232;
       } else {
        $238 = ((($232)) + 8|0);
        $239 = HEAP32[$238>>2]|0;
        $240 = HEAP32[(8136)>>2]|0;
        $241 = ($239>>>0)<($240>>>0);
        if ($241) {
         _abort();
         // unreachable;
        } else {
         $$pre$phi$iZ2D = $238;$F1$0$i = $239;
        }
       }
       HEAP32[$$pre$phi$iZ2D>>2] = $229;
       $242 = ((($F1$0$i)) + 12|0);
       HEAP32[$242>>2] = $229;
       $243 = ((($229)) + 8|0);
       HEAP32[$243>>2] = $F1$0$i;
       $244 = ((($229)) + 12|0);
       HEAP32[$244>>2] = $232;
      }
      HEAP32[(8128)>>2] = $rsize$0$i$lcssa;
      HEAP32[(8140)>>2] = $152;
     }
     $245 = ((($v$0$i$lcssa)) + 8|0);
     $$0 = $245;
     return ($$0|0);
    }
   } else {
    $nb$0 = $4;
   }
  } else {
   $246 = ($bytes>>>0)>(4294967231);
   if ($246) {
    $nb$0 = -1;
   } else {
    $247 = (($bytes) + 11)|0;
    $248 = $247 & -8;
    $249 = HEAP32[(8124)>>2]|0;
    $250 = ($249|0)==(0);
    if ($250) {
     $nb$0 = $248;
    } else {
     $251 = (0 - ($248))|0;
     $252 = $247 >>> 8;
     $253 = ($252|0)==(0);
     if ($253) {
      $idx$0$i = 0;
     } else {
      $254 = ($248>>>0)>(16777215);
      if ($254) {
       $idx$0$i = 31;
      } else {
       $255 = (($252) + 1048320)|0;
       $256 = $255 >>> 16;
       $257 = $256 & 8;
       $258 = $252 << $257;
       $259 = (($258) + 520192)|0;
       $260 = $259 >>> 16;
       $261 = $260 & 4;
       $262 = $261 | $257;
       $263 = $258 << $261;
       $264 = (($263) + 245760)|0;
       $265 = $264 >>> 16;
       $266 = $265 & 2;
       $267 = $262 | $266;
       $268 = (14 - ($267))|0;
       $269 = $263 << $266;
       $270 = $269 >>> 15;
       $271 = (($268) + ($270))|0;
       $272 = $271 << 1;
       $273 = (($271) + 7)|0;
       $274 = $248 >>> $273;
       $275 = $274 & 1;
       $276 = $275 | $272;
       $idx$0$i = $276;
      }
     }
     $277 = (8424 + ($idx$0$i<<2)|0);
     $278 = HEAP32[$277>>2]|0;
     $279 = ($278|0)==(0|0);
     L123: do {
      if ($279) {
       $rsize$3$i = $251;$t$2$i = 0;$v$3$i = 0;
       label = 86;
      } else {
       $280 = ($idx$0$i|0)==(31);
       $281 = $idx$0$i >>> 1;
       $282 = (25 - ($281))|0;
       $283 = $280 ? 0 : $282;
       $284 = $248 << $283;
       $rsize$0$i$5 = $251;$rst$0$i = 0;$sizebits$0$i = $284;$t$0$i$4 = $278;$v$0$i$6 = 0;
       while(1) {
        $285 = ((($t$0$i$4)) + 4|0);
        $286 = HEAP32[$285>>2]|0;
        $287 = $286 & -8;
        $288 = (($287) - ($248))|0;
        $289 = ($288>>>0)<($rsize$0$i$5>>>0);
        if ($289) {
         $290 = ($287|0)==($248|0);
         if ($290) {
          $rsize$412$i = $288;$t$411$i = $t$0$i$4;$v$413$i = $t$0$i$4;
          label = 90;
          break L123;
         } else {
          $rsize$1$i = $288;$v$1$i = $t$0$i$4;
         }
        } else {
         $rsize$1$i = $rsize$0$i$5;$v$1$i = $v$0$i$6;
        }
        $291 = ((($t$0$i$4)) + 20|0);
        $292 = HEAP32[$291>>2]|0;
        $293 = $sizebits$0$i >>> 31;
        $294 = (((($t$0$i$4)) + 16|0) + ($293<<2)|0);
        $295 = HEAP32[$294>>2]|0;
        $296 = ($292|0)==(0|0);
        $297 = ($292|0)==($295|0);
        $or$cond1$i = $296 | $297;
        $rst$1$i = $or$cond1$i ? $rst$0$i : $292;
        $298 = ($295|0)==(0|0);
        $299 = $298&1;
        $300 = $299 ^ 1;
        $sizebits$0$$i = $sizebits$0$i << $300;
        if ($298) {
         $rsize$3$i = $rsize$1$i;$t$2$i = $rst$1$i;$v$3$i = $v$1$i;
         label = 86;
         break;
        } else {
         $rsize$0$i$5 = $rsize$1$i;$rst$0$i = $rst$1$i;$sizebits$0$i = $sizebits$0$$i;$t$0$i$4 = $295;$v$0$i$6 = $v$1$i;
        }
       }
      }
     } while(0);
     if ((label|0) == 86) {
      $301 = ($t$2$i|0)==(0|0);
      $302 = ($v$3$i|0)==(0|0);
      $or$cond$i = $301 & $302;
      if ($or$cond$i) {
       $303 = 2 << $idx$0$i;
       $304 = (0 - ($303))|0;
       $305 = $303 | $304;
       $306 = $249 & $305;
       $307 = ($306|0)==(0);
       if ($307) {
        $nb$0 = $248;
        break;
       }
       $308 = (0 - ($306))|0;
       $309 = $306 & $308;
       $310 = (($309) + -1)|0;
       $311 = $310 >>> 12;
       $312 = $311 & 16;
       $313 = $310 >>> $312;
       $314 = $313 >>> 5;
       $315 = $314 & 8;
       $316 = $315 | $312;
       $317 = $313 >>> $315;
       $318 = $317 >>> 2;
       $319 = $318 & 4;
       $320 = $316 | $319;
       $321 = $317 >>> $319;
       $322 = $321 >>> 1;
       $323 = $322 & 2;
       $324 = $320 | $323;
       $325 = $321 >>> $323;
       $326 = $325 >>> 1;
       $327 = $326 & 1;
       $328 = $324 | $327;
       $329 = $325 >>> $327;
       $330 = (($328) + ($329))|0;
       $331 = (8424 + ($330<<2)|0);
       $332 = HEAP32[$331>>2]|0;
       $t$4$ph$i = $332;
      } else {
       $t$4$ph$i = $t$2$i;
      }
      $333 = ($t$4$ph$i|0)==(0|0);
      if ($333) {
       $rsize$4$lcssa$i = $rsize$3$i;$v$4$lcssa$i = $v$3$i;
      } else {
       $rsize$412$i = $rsize$3$i;$t$411$i = $t$4$ph$i;$v$413$i = $v$3$i;
       label = 90;
      }
     }
     if ((label|0) == 90) {
      while(1) {
       label = 0;
       $334 = ((($t$411$i)) + 4|0);
       $335 = HEAP32[$334>>2]|0;
       $336 = $335 & -8;
       $337 = (($336) - ($248))|0;
       $338 = ($337>>>0)<($rsize$412$i>>>0);
       $$rsize$4$i = $338 ? $337 : $rsize$412$i;
       $t$4$v$4$i = $338 ? $t$411$i : $v$413$i;
       $339 = ((($t$411$i)) + 16|0);
       $340 = HEAP32[$339>>2]|0;
       $341 = ($340|0)==(0|0);
       if (!($341)) {
        $rsize$412$i = $$rsize$4$i;$t$411$i = $340;$v$413$i = $t$4$v$4$i;
        label = 90;
        continue;
       }
       $342 = ((($t$411$i)) + 20|0);
       $343 = HEAP32[$342>>2]|0;
       $344 = ($343|0)==(0|0);
       if ($344) {
        $rsize$4$lcssa$i = $$rsize$4$i;$v$4$lcssa$i = $t$4$v$4$i;
        break;
       } else {
        $rsize$412$i = $$rsize$4$i;$t$411$i = $343;$v$413$i = $t$4$v$4$i;
        label = 90;
       }
      }
     }
     $345 = ($v$4$lcssa$i|0)==(0|0);
     if ($345) {
      $nb$0 = $248;
     } else {
      $346 = HEAP32[(8128)>>2]|0;
      $347 = (($346) - ($248))|0;
      $348 = ($rsize$4$lcssa$i>>>0)<($347>>>0);
      if ($348) {
       $349 = HEAP32[(8136)>>2]|0;
       $350 = ($v$4$lcssa$i>>>0)<($349>>>0);
       if ($350) {
        _abort();
        // unreachable;
       }
       $351 = (($v$4$lcssa$i) + ($248)|0);
       $352 = ($v$4$lcssa$i>>>0)<($351>>>0);
       if (!($352)) {
        _abort();
        // unreachable;
       }
       $353 = ((($v$4$lcssa$i)) + 24|0);
       $354 = HEAP32[$353>>2]|0;
       $355 = ((($v$4$lcssa$i)) + 12|0);
       $356 = HEAP32[$355>>2]|0;
       $357 = ($356|0)==($v$4$lcssa$i|0);
       do {
        if ($357) {
         $367 = ((($v$4$lcssa$i)) + 20|0);
         $368 = HEAP32[$367>>2]|0;
         $369 = ($368|0)==(0|0);
         if ($369) {
          $370 = ((($v$4$lcssa$i)) + 16|0);
          $371 = HEAP32[$370>>2]|0;
          $372 = ($371|0)==(0|0);
          if ($372) {
           $R$3$i$11 = 0;
           break;
          } else {
           $R$1$i$9 = $371;$RP$1$i$8 = $370;
          }
         } else {
          $R$1$i$9 = $368;$RP$1$i$8 = $367;
         }
         while(1) {
          $373 = ((($R$1$i$9)) + 20|0);
          $374 = HEAP32[$373>>2]|0;
          $375 = ($374|0)==(0|0);
          if (!($375)) {
           $R$1$i$9 = $374;$RP$1$i$8 = $373;
           continue;
          }
          $376 = ((($R$1$i$9)) + 16|0);
          $377 = HEAP32[$376>>2]|0;
          $378 = ($377|0)==(0|0);
          if ($378) {
           $R$1$i$9$lcssa = $R$1$i$9;$RP$1$i$8$lcssa = $RP$1$i$8;
           break;
          } else {
           $R$1$i$9 = $377;$RP$1$i$8 = $376;
          }
         }
         $379 = ($RP$1$i$8$lcssa>>>0)<($349>>>0);
         if ($379) {
          _abort();
          // unreachable;
         } else {
          HEAP32[$RP$1$i$8$lcssa>>2] = 0;
          $R$3$i$11 = $R$1$i$9$lcssa;
          break;
         }
        } else {
         $358 = ((($v$4$lcssa$i)) + 8|0);
         $359 = HEAP32[$358>>2]|0;
         $360 = ($359>>>0)<($349>>>0);
         if ($360) {
          _abort();
          // unreachable;
         }
         $361 = ((($359)) + 12|0);
         $362 = HEAP32[$361>>2]|0;
         $363 = ($362|0)==($v$4$lcssa$i|0);
         if (!($363)) {
          _abort();
          // unreachable;
         }
         $364 = ((($356)) + 8|0);
         $365 = HEAP32[$364>>2]|0;
         $366 = ($365|0)==($v$4$lcssa$i|0);
         if ($366) {
          HEAP32[$361>>2] = $356;
          HEAP32[$364>>2] = $359;
          $R$3$i$11 = $356;
          break;
         } else {
          _abort();
          // unreachable;
         }
        }
       } while(0);
       $380 = ($354|0)==(0|0);
       do {
        if (!($380)) {
         $381 = ((($v$4$lcssa$i)) + 28|0);
         $382 = HEAP32[$381>>2]|0;
         $383 = (8424 + ($382<<2)|0);
         $384 = HEAP32[$383>>2]|0;
         $385 = ($v$4$lcssa$i|0)==($384|0);
         if ($385) {
          HEAP32[$383>>2] = $R$3$i$11;
          $cond$i$12 = ($R$3$i$11|0)==(0|0);
          if ($cond$i$12) {
           $386 = 1 << $382;
           $387 = $386 ^ -1;
           $388 = HEAP32[(8124)>>2]|0;
           $389 = $388 & $387;
           HEAP32[(8124)>>2] = $389;
           break;
          }
         } else {
          $390 = HEAP32[(8136)>>2]|0;
          $391 = ($354>>>0)<($390>>>0);
          if ($391) {
           _abort();
           // unreachable;
          }
          $392 = ((($354)) + 16|0);
          $393 = HEAP32[$392>>2]|0;
          $394 = ($393|0)==($v$4$lcssa$i|0);
          if ($394) {
           HEAP32[$392>>2] = $R$3$i$11;
          } else {
           $395 = ((($354)) + 20|0);
           HEAP32[$395>>2] = $R$3$i$11;
          }
          $396 = ($R$3$i$11|0)==(0|0);
          if ($396) {
           break;
          }
         }
         $397 = HEAP32[(8136)>>2]|0;
         $398 = ($R$3$i$11>>>0)<($397>>>0);
         if ($398) {
          _abort();
          // unreachable;
         }
         $399 = ((($R$3$i$11)) + 24|0);
         HEAP32[$399>>2] = $354;
         $400 = ((($v$4$lcssa$i)) + 16|0);
         $401 = HEAP32[$400>>2]|0;
         $402 = ($401|0)==(0|0);
         do {
          if (!($402)) {
           $403 = ($401>>>0)<($397>>>0);
           if ($403) {
            _abort();
            // unreachable;
           } else {
            $404 = ((($R$3$i$11)) + 16|0);
            HEAP32[$404>>2] = $401;
            $405 = ((($401)) + 24|0);
            HEAP32[$405>>2] = $R$3$i$11;
            break;
           }
          }
         } while(0);
         $406 = ((($v$4$lcssa$i)) + 20|0);
         $407 = HEAP32[$406>>2]|0;
         $408 = ($407|0)==(0|0);
         if (!($408)) {
          $409 = HEAP32[(8136)>>2]|0;
          $410 = ($407>>>0)<($409>>>0);
          if ($410) {
           _abort();
           // unreachable;
          } else {
           $411 = ((($R$3$i$11)) + 20|0);
           HEAP32[$411>>2] = $407;
           $412 = ((($407)) + 24|0);
           HEAP32[$412>>2] = $R$3$i$11;
           break;
          }
         }
        }
       } while(0);
       $413 = ($rsize$4$lcssa$i>>>0)<(16);
       do {
        if ($413) {
         $414 = (($rsize$4$lcssa$i) + ($248))|0;
         $415 = $414 | 3;
         $416 = ((($v$4$lcssa$i)) + 4|0);
         HEAP32[$416>>2] = $415;
         $417 = (($v$4$lcssa$i) + ($414)|0);
         $418 = ((($417)) + 4|0);
         $419 = HEAP32[$418>>2]|0;
         $420 = $419 | 1;
         HEAP32[$418>>2] = $420;
        } else {
         $421 = $248 | 3;
         $422 = ((($v$4$lcssa$i)) + 4|0);
         HEAP32[$422>>2] = $421;
         $423 = $rsize$4$lcssa$i | 1;
         $424 = ((($351)) + 4|0);
         HEAP32[$424>>2] = $423;
         $425 = (($351) + ($rsize$4$lcssa$i)|0);
         HEAP32[$425>>2] = $rsize$4$lcssa$i;
         $426 = $rsize$4$lcssa$i >>> 3;
         $427 = ($rsize$4$lcssa$i>>>0)<(256);
         if ($427) {
          $428 = $426 << 1;
          $429 = (8160 + ($428<<2)|0);
          $430 = HEAP32[2030]|0;
          $431 = 1 << $426;
          $432 = $430 & $431;
          $433 = ($432|0)==(0);
          if ($433) {
           $434 = $430 | $431;
           HEAP32[2030] = $434;
           $$pre$i$13 = ((($429)) + 8|0);
           $$pre$phi$i$14Z2D = $$pre$i$13;$F5$0$i = $429;
          } else {
           $435 = ((($429)) + 8|0);
           $436 = HEAP32[$435>>2]|0;
           $437 = HEAP32[(8136)>>2]|0;
           $438 = ($436>>>0)<($437>>>0);
           if ($438) {
            _abort();
            // unreachable;
           } else {
            $$pre$phi$i$14Z2D = $435;$F5$0$i = $436;
           }
          }
          HEAP32[$$pre$phi$i$14Z2D>>2] = $351;
          $439 = ((($F5$0$i)) + 12|0);
          HEAP32[$439>>2] = $351;
          $440 = ((($351)) + 8|0);
          HEAP32[$440>>2] = $F5$0$i;
          $441 = ((($351)) + 12|0);
          HEAP32[$441>>2] = $429;
          break;
         }
         $442 = $rsize$4$lcssa$i >>> 8;
         $443 = ($442|0)==(0);
         if ($443) {
          $I7$0$i = 0;
         } else {
          $444 = ($rsize$4$lcssa$i>>>0)>(16777215);
          if ($444) {
           $I7$0$i = 31;
          } else {
           $445 = (($442) + 1048320)|0;
           $446 = $445 >>> 16;
           $447 = $446 & 8;
           $448 = $442 << $447;
           $449 = (($448) + 520192)|0;
           $450 = $449 >>> 16;
           $451 = $450 & 4;
           $452 = $451 | $447;
           $453 = $448 << $451;
           $454 = (($453) + 245760)|0;
           $455 = $454 >>> 16;
           $456 = $455 & 2;
           $457 = $452 | $456;
           $458 = (14 - ($457))|0;
           $459 = $453 << $456;
           $460 = $459 >>> 15;
           $461 = (($458) + ($460))|0;
           $462 = $461 << 1;
           $463 = (($461) + 7)|0;
           $464 = $rsize$4$lcssa$i >>> $463;
           $465 = $464 & 1;
           $466 = $465 | $462;
           $I7$0$i = $466;
          }
         }
         $467 = (8424 + ($I7$0$i<<2)|0);
         $468 = ((($351)) + 28|0);
         HEAP32[$468>>2] = $I7$0$i;
         $469 = ((($351)) + 16|0);
         $470 = ((($469)) + 4|0);
         HEAP32[$470>>2] = 0;
         HEAP32[$469>>2] = 0;
         $471 = HEAP32[(8124)>>2]|0;
         $472 = 1 << $I7$0$i;
         $473 = $471 & $472;
         $474 = ($473|0)==(0);
         if ($474) {
          $475 = $471 | $472;
          HEAP32[(8124)>>2] = $475;
          HEAP32[$467>>2] = $351;
          $476 = ((($351)) + 24|0);
          HEAP32[$476>>2] = $467;
          $477 = ((($351)) + 12|0);
          HEAP32[$477>>2] = $351;
          $478 = ((($351)) + 8|0);
          HEAP32[$478>>2] = $351;
          break;
         }
         $479 = HEAP32[$467>>2]|0;
         $480 = ($I7$0$i|0)==(31);
         $481 = $I7$0$i >>> 1;
         $482 = (25 - ($481))|0;
         $483 = $480 ? 0 : $482;
         $484 = $rsize$4$lcssa$i << $483;
         $K12$0$i = $484;$T$0$i = $479;
         while(1) {
          $485 = ((($T$0$i)) + 4|0);
          $486 = HEAP32[$485>>2]|0;
          $487 = $486 & -8;
          $488 = ($487|0)==($rsize$4$lcssa$i|0);
          if ($488) {
           $T$0$i$lcssa = $T$0$i;
           label = 148;
           break;
          }
          $489 = $K12$0$i >>> 31;
          $490 = (((($T$0$i)) + 16|0) + ($489<<2)|0);
          $491 = $K12$0$i << 1;
          $492 = HEAP32[$490>>2]|0;
          $493 = ($492|0)==(0|0);
          if ($493) {
           $$lcssa157 = $490;$T$0$i$lcssa156 = $T$0$i;
           label = 145;
           break;
          } else {
           $K12$0$i = $491;$T$0$i = $492;
          }
         }
         if ((label|0) == 145) {
          $494 = HEAP32[(8136)>>2]|0;
          $495 = ($$lcssa157>>>0)<($494>>>0);
          if ($495) {
           _abort();
           // unreachable;
          } else {
           HEAP32[$$lcssa157>>2] = $351;
           $496 = ((($351)) + 24|0);
           HEAP32[$496>>2] = $T$0$i$lcssa156;
           $497 = ((($351)) + 12|0);
           HEAP32[$497>>2] = $351;
           $498 = ((($351)) + 8|0);
           HEAP32[$498>>2] = $351;
           break;
          }
         }
         else if ((label|0) == 148) {
          $499 = ((($T$0$i$lcssa)) + 8|0);
          $500 = HEAP32[$499>>2]|0;
          $501 = HEAP32[(8136)>>2]|0;
          $502 = ($500>>>0)>=($501>>>0);
          $not$7$i = ($T$0$i$lcssa>>>0)>=($501>>>0);
          $503 = $502 & $not$7$i;
          if ($503) {
           $504 = ((($500)) + 12|0);
           HEAP32[$504>>2] = $351;
           HEAP32[$499>>2] = $351;
           $505 = ((($351)) + 8|0);
           HEAP32[$505>>2] = $500;
           $506 = ((($351)) + 12|0);
           HEAP32[$506>>2] = $T$0$i$lcssa;
           $507 = ((($351)) + 24|0);
           HEAP32[$507>>2] = 0;
           break;
          } else {
           _abort();
           // unreachable;
          }
         }
        }
       } while(0);
       $508 = ((($v$4$lcssa$i)) + 8|0);
       $$0 = $508;
       return ($$0|0);
      } else {
       $nb$0 = $248;
      }
     }
    }
   }
  }
 } while(0);
 $509 = HEAP32[(8128)>>2]|0;
 $510 = ($509>>>0)<($nb$0>>>0);
 if (!($510)) {
  $511 = (($509) - ($nb$0))|0;
  $512 = HEAP32[(8140)>>2]|0;
  $513 = ($511>>>0)>(15);
  if ($513) {
   $514 = (($512) + ($nb$0)|0);
   HEAP32[(8140)>>2] = $514;
   HEAP32[(8128)>>2] = $511;
   $515 = $511 | 1;
   $516 = ((($514)) + 4|0);
   HEAP32[$516>>2] = $515;
   $517 = (($514) + ($511)|0);
   HEAP32[$517>>2] = $511;
   $518 = $nb$0 | 3;
   $519 = ((($512)) + 4|0);
   HEAP32[$519>>2] = $518;
  } else {
   HEAP32[(8128)>>2] = 0;
   HEAP32[(8140)>>2] = 0;
   $520 = $509 | 3;
   $521 = ((($512)) + 4|0);
   HEAP32[$521>>2] = $520;
   $522 = (($512) + ($509)|0);
   $523 = ((($522)) + 4|0);
   $524 = HEAP32[$523>>2]|0;
   $525 = $524 | 1;
   HEAP32[$523>>2] = $525;
  }
  $526 = ((($512)) + 8|0);
  $$0 = $526;
  return ($$0|0);
 }
 $527 = HEAP32[(8132)>>2]|0;
 $528 = ($527>>>0)>($nb$0>>>0);
 if ($528) {
  $529 = (($527) - ($nb$0))|0;
  HEAP32[(8132)>>2] = $529;
  $530 = HEAP32[(8144)>>2]|0;
  $531 = (($530) + ($nb$0)|0);
  HEAP32[(8144)>>2] = $531;
  $532 = $529 | 1;
  $533 = ((($531)) + 4|0);
  HEAP32[$533>>2] = $532;
  $534 = $nb$0 | 3;
  $535 = ((($530)) + 4|0);
  HEAP32[$535>>2] = $534;
  $536 = ((($530)) + 8|0);
  $$0 = $536;
  return ($$0|0);
 }
 $537 = HEAP32[2148]|0;
 $538 = ($537|0)==(0);
 do {
  if ($538) {
   $539 = (_sysconf(30)|0);
   $540 = (($539) + -1)|0;
   $541 = $540 & $539;
   $542 = ($541|0)==(0);
   if ($542) {
    HEAP32[(8600)>>2] = $539;
    HEAP32[(8596)>>2] = $539;
    HEAP32[(8604)>>2] = -1;
    HEAP32[(8608)>>2] = -1;
    HEAP32[(8612)>>2] = 0;
    HEAP32[(8564)>>2] = 0;
    $543 = (_time((0|0))|0);
    $544 = $543 & -16;
    $545 = $544 ^ 1431655768;
    HEAP32[2148] = $545;
    break;
   } else {
    _abort();
    // unreachable;
   }
  }
 } while(0);
 $546 = (($nb$0) + 48)|0;
 $547 = HEAP32[(8600)>>2]|0;
 $548 = (($nb$0) + 47)|0;
 $549 = (($547) + ($548))|0;
 $550 = (0 - ($547))|0;
 $551 = $549 & $550;
 $552 = ($551>>>0)>($nb$0>>>0);
 if (!($552)) {
  $$0 = 0;
  return ($$0|0);
 }
 $553 = HEAP32[(8560)>>2]|0;
 $554 = ($553|0)==(0);
 if (!($554)) {
  $555 = HEAP32[(8552)>>2]|0;
  $556 = (($555) + ($551))|0;
  $557 = ($556>>>0)<=($555>>>0);
  $558 = ($556>>>0)>($553>>>0);
  $or$cond1$i$16 = $557 | $558;
  if ($or$cond1$i$16) {
   $$0 = 0;
   return ($$0|0);
  }
 }
 $559 = HEAP32[(8564)>>2]|0;
 $560 = $559 & 4;
 $561 = ($560|0)==(0);
 L257: do {
  if ($561) {
   $562 = HEAP32[(8144)>>2]|0;
   $563 = ($562|0)==(0|0);
   L259: do {
    if ($563) {
     label = 173;
    } else {
     $sp$0$i$i = (8568);
     while(1) {
      $564 = HEAP32[$sp$0$i$i>>2]|0;
      $565 = ($564>>>0)>($562>>>0);
      if (!($565)) {
       $566 = ((($sp$0$i$i)) + 4|0);
       $567 = HEAP32[$566>>2]|0;
       $568 = (($564) + ($567)|0);
       $569 = ($568>>>0)>($562>>>0);
       if ($569) {
        $$lcssa153 = $sp$0$i$i;$$lcssa155 = $566;
        break;
       }
      }
      $570 = ((($sp$0$i$i)) + 8|0);
      $571 = HEAP32[$570>>2]|0;
      $572 = ($571|0)==(0|0);
      if ($572) {
       label = 173;
       break L259;
      } else {
       $sp$0$i$i = $571;
      }
     }
     $595 = HEAP32[(8132)>>2]|0;
     $596 = (($549) - ($595))|0;
     $597 = $596 & $550;
     $598 = ($597>>>0)<(2147483647);
     if ($598) {
      $599 = (_sbrk(($597|0))|0);
      $600 = HEAP32[$$lcssa153>>2]|0;
      $601 = HEAP32[$$lcssa155>>2]|0;
      $602 = (($600) + ($601)|0);
      $603 = ($599|0)==($602|0);
      if ($603) {
       $604 = ($599|0)==((-1)|0);
       if (!($604)) {
        $tbase$746$i = $599;$tsize$745$i = $597;
        label = 193;
        break L257;
       }
      } else {
       $br$2$ph$i = $599;$ssize$2$ph$i = $597;
       label = 183;
      }
     }
    }
   } while(0);
   do {
    if ((label|0) == 173) {
     $573 = (_sbrk(0)|0);
     $574 = ($573|0)==((-1)|0);
     if (!($574)) {
      $575 = $573;
      $576 = HEAP32[(8596)>>2]|0;
      $577 = (($576) + -1)|0;
      $578 = $577 & $575;
      $579 = ($578|0)==(0);
      if ($579) {
       $ssize$0$i = $551;
      } else {
       $580 = (($577) + ($575))|0;
       $581 = (0 - ($576))|0;
       $582 = $580 & $581;
       $583 = (($551) - ($575))|0;
       $584 = (($583) + ($582))|0;
       $ssize$0$i = $584;
      }
      $585 = HEAP32[(8552)>>2]|0;
      $586 = (($585) + ($ssize$0$i))|0;
      $587 = ($ssize$0$i>>>0)>($nb$0>>>0);
      $588 = ($ssize$0$i>>>0)<(2147483647);
      $or$cond$i$17 = $587 & $588;
      if ($or$cond$i$17) {
       $589 = HEAP32[(8560)>>2]|0;
       $590 = ($589|0)==(0);
       if (!($590)) {
        $591 = ($586>>>0)<=($585>>>0);
        $592 = ($586>>>0)>($589>>>0);
        $or$cond2$i = $591 | $592;
        if ($or$cond2$i) {
         break;
        }
       }
       $593 = (_sbrk(($ssize$0$i|0))|0);
       $594 = ($593|0)==($573|0);
       if ($594) {
        $tbase$746$i = $573;$tsize$745$i = $ssize$0$i;
        label = 193;
        break L257;
       } else {
        $br$2$ph$i = $593;$ssize$2$ph$i = $ssize$0$i;
        label = 183;
       }
      }
     }
    }
   } while(0);
   L279: do {
    if ((label|0) == 183) {
     $605 = (0 - ($ssize$2$ph$i))|0;
     $606 = ($br$2$ph$i|0)!=((-1)|0);
     $607 = ($ssize$2$ph$i>>>0)<(2147483647);
     $or$cond7$i = $607 & $606;
     $608 = ($546>>>0)>($ssize$2$ph$i>>>0);
     $or$cond8$i = $608 & $or$cond7$i;
     do {
      if ($or$cond8$i) {
       $609 = HEAP32[(8600)>>2]|0;
       $610 = (($548) - ($ssize$2$ph$i))|0;
       $611 = (($610) + ($609))|0;
       $612 = (0 - ($609))|0;
       $613 = $611 & $612;
       $614 = ($613>>>0)<(2147483647);
       if ($614) {
        $615 = (_sbrk(($613|0))|0);
        $616 = ($615|0)==((-1)|0);
        if ($616) {
         (_sbrk(($605|0))|0);
         break L279;
        } else {
         $617 = (($613) + ($ssize$2$ph$i))|0;
         $ssize$5$i = $617;
         break;
        }
       } else {
        $ssize$5$i = $ssize$2$ph$i;
       }
      } else {
       $ssize$5$i = $ssize$2$ph$i;
      }
     } while(0);
     $618 = ($br$2$ph$i|0)==((-1)|0);
     if (!($618)) {
      $tbase$746$i = $br$2$ph$i;$tsize$745$i = $ssize$5$i;
      label = 193;
      break L257;
     }
    }
   } while(0);
   $619 = HEAP32[(8564)>>2]|0;
   $620 = $619 | 4;
   HEAP32[(8564)>>2] = $620;
   label = 190;
  } else {
   label = 190;
  }
 } while(0);
 if ((label|0) == 190) {
  $621 = ($551>>>0)<(2147483647);
  if ($621) {
   $622 = (_sbrk(($551|0))|0);
   $623 = (_sbrk(0)|0);
   $624 = ($622|0)!=((-1)|0);
   $625 = ($623|0)!=((-1)|0);
   $or$cond5$i = $624 & $625;
   $626 = ($622>>>0)<($623>>>0);
   $or$cond10$i = $626 & $or$cond5$i;
   if ($or$cond10$i) {
    $627 = $623;
    $628 = $622;
    $629 = (($627) - ($628))|0;
    $630 = (($nb$0) + 40)|0;
    $$not$i = ($629>>>0)>($630>>>0);
    if ($$not$i) {
     $tbase$746$i = $622;$tsize$745$i = $629;
     label = 193;
    }
   }
  }
 }
 if ((label|0) == 193) {
  $631 = HEAP32[(8552)>>2]|0;
  $632 = (($631) + ($tsize$745$i))|0;
  HEAP32[(8552)>>2] = $632;
  $633 = HEAP32[(8556)>>2]|0;
  $634 = ($632>>>0)>($633>>>0);
  if ($634) {
   HEAP32[(8556)>>2] = $632;
  }
  $635 = HEAP32[(8144)>>2]|0;
  $636 = ($635|0)==(0|0);
  do {
   if ($636) {
    $637 = HEAP32[(8136)>>2]|0;
    $638 = ($637|0)==(0|0);
    $639 = ($tbase$746$i>>>0)<($637>>>0);
    $or$cond11$i = $638 | $639;
    if ($or$cond11$i) {
     HEAP32[(8136)>>2] = $tbase$746$i;
    }
    HEAP32[(8568)>>2] = $tbase$746$i;
    HEAP32[(8572)>>2] = $tsize$745$i;
    HEAP32[(8580)>>2] = 0;
    $640 = HEAP32[2148]|0;
    HEAP32[(8156)>>2] = $640;
    HEAP32[(8152)>>2] = -1;
    $i$01$i$i = 0;
    while(1) {
     $641 = $i$01$i$i << 1;
     $642 = (8160 + ($641<<2)|0);
     $643 = ((($642)) + 12|0);
     HEAP32[$643>>2] = $642;
     $644 = ((($642)) + 8|0);
     HEAP32[$644>>2] = $642;
     $645 = (($i$01$i$i) + 1)|0;
     $exitcond$i$i = ($645|0)==(32);
     if ($exitcond$i$i) {
      break;
     } else {
      $i$01$i$i = $645;
     }
    }
    $646 = (($tsize$745$i) + -40)|0;
    $647 = ((($tbase$746$i)) + 8|0);
    $648 = $647;
    $649 = $648 & 7;
    $650 = ($649|0)==(0);
    $651 = (0 - ($648))|0;
    $652 = $651 & 7;
    $653 = $650 ? 0 : $652;
    $654 = (($tbase$746$i) + ($653)|0);
    $655 = (($646) - ($653))|0;
    HEAP32[(8144)>>2] = $654;
    HEAP32[(8132)>>2] = $655;
    $656 = $655 | 1;
    $657 = ((($654)) + 4|0);
    HEAP32[$657>>2] = $656;
    $658 = (($654) + ($655)|0);
    $659 = ((($658)) + 4|0);
    HEAP32[$659>>2] = 40;
    $660 = HEAP32[(8608)>>2]|0;
    HEAP32[(8148)>>2] = $660;
   } else {
    $sp$068$i = (8568);
    while(1) {
     $661 = HEAP32[$sp$068$i>>2]|0;
     $662 = ((($sp$068$i)) + 4|0);
     $663 = HEAP32[$662>>2]|0;
     $664 = (($661) + ($663)|0);
     $665 = ($tbase$746$i|0)==($664|0);
     if ($665) {
      $$lcssa147 = $661;$$lcssa149 = $662;$$lcssa151 = $663;$sp$068$i$lcssa = $sp$068$i;
      label = 203;
      break;
     }
     $666 = ((($sp$068$i)) + 8|0);
     $667 = HEAP32[$666>>2]|0;
     $668 = ($667|0)==(0|0);
     if ($668) {
      break;
     } else {
      $sp$068$i = $667;
     }
    }
    if ((label|0) == 203) {
     $669 = ((($sp$068$i$lcssa)) + 12|0);
     $670 = HEAP32[$669>>2]|0;
     $671 = $670 & 8;
     $672 = ($671|0)==(0);
     if ($672) {
      $673 = ($635>>>0)>=($$lcssa147>>>0);
      $674 = ($635>>>0)<($tbase$746$i>>>0);
      $or$cond48$i = $674 & $673;
      if ($or$cond48$i) {
       $675 = (($$lcssa151) + ($tsize$745$i))|0;
       HEAP32[$$lcssa149>>2] = $675;
       $676 = HEAP32[(8132)>>2]|0;
       $677 = ((($635)) + 8|0);
       $678 = $677;
       $679 = $678 & 7;
       $680 = ($679|0)==(0);
       $681 = (0 - ($678))|0;
       $682 = $681 & 7;
       $683 = $680 ? 0 : $682;
       $684 = (($635) + ($683)|0);
       $685 = (($tsize$745$i) - ($683))|0;
       $686 = (($685) + ($676))|0;
       HEAP32[(8144)>>2] = $684;
       HEAP32[(8132)>>2] = $686;
       $687 = $686 | 1;
       $688 = ((($684)) + 4|0);
       HEAP32[$688>>2] = $687;
       $689 = (($684) + ($686)|0);
       $690 = ((($689)) + 4|0);
       HEAP32[$690>>2] = 40;
       $691 = HEAP32[(8608)>>2]|0;
       HEAP32[(8148)>>2] = $691;
       break;
      }
     }
    }
    $692 = HEAP32[(8136)>>2]|0;
    $693 = ($tbase$746$i>>>0)<($692>>>0);
    if ($693) {
     HEAP32[(8136)>>2] = $tbase$746$i;
     $757 = $tbase$746$i;
    } else {
     $757 = $692;
    }
    $694 = (($tbase$746$i) + ($tsize$745$i)|0);
    $sp$167$i = (8568);
    while(1) {
     $695 = HEAP32[$sp$167$i>>2]|0;
     $696 = ($695|0)==($694|0);
     if ($696) {
      $$lcssa144 = $sp$167$i;$sp$167$i$lcssa = $sp$167$i;
      label = 211;
      break;
     }
     $697 = ((($sp$167$i)) + 8|0);
     $698 = HEAP32[$697>>2]|0;
     $699 = ($698|0)==(0|0);
     if ($699) {
      $sp$0$i$i$i = (8568);
      break;
     } else {
      $sp$167$i = $698;
     }
    }
    if ((label|0) == 211) {
     $700 = ((($sp$167$i$lcssa)) + 12|0);
     $701 = HEAP32[$700>>2]|0;
     $702 = $701 & 8;
     $703 = ($702|0)==(0);
     if ($703) {
      HEAP32[$$lcssa144>>2] = $tbase$746$i;
      $704 = ((($sp$167$i$lcssa)) + 4|0);
      $705 = HEAP32[$704>>2]|0;
      $706 = (($705) + ($tsize$745$i))|0;
      HEAP32[$704>>2] = $706;
      $707 = ((($tbase$746$i)) + 8|0);
      $708 = $707;
      $709 = $708 & 7;
      $710 = ($709|0)==(0);
      $711 = (0 - ($708))|0;
      $712 = $711 & 7;
      $713 = $710 ? 0 : $712;
      $714 = (($tbase$746$i) + ($713)|0);
      $715 = ((($694)) + 8|0);
      $716 = $715;
      $717 = $716 & 7;
      $718 = ($717|0)==(0);
      $719 = (0 - ($716))|0;
      $720 = $719 & 7;
      $721 = $718 ? 0 : $720;
      $722 = (($694) + ($721)|0);
      $723 = $722;
      $724 = $714;
      $725 = (($723) - ($724))|0;
      $726 = (($714) + ($nb$0)|0);
      $727 = (($725) - ($nb$0))|0;
      $728 = $nb$0 | 3;
      $729 = ((($714)) + 4|0);
      HEAP32[$729>>2] = $728;
      $730 = ($722|0)==($635|0);
      do {
       if ($730) {
        $731 = HEAP32[(8132)>>2]|0;
        $732 = (($731) + ($727))|0;
        HEAP32[(8132)>>2] = $732;
        HEAP32[(8144)>>2] = $726;
        $733 = $732 | 1;
        $734 = ((($726)) + 4|0);
        HEAP32[$734>>2] = $733;
       } else {
        $735 = HEAP32[(8140)>>2]|0;
        $736 = ($722|0)==($735|0);
        if ($736) {
         $737 = HEAP32[(8128)>>2]|0;
         $738 = (($737) + ($727))|0;
         HEAP32[(8128)>>2] = $738;
         HEAP32[(8140)>>2] = $726;
         $739 = $738 | 1;
         $740 = ((($726)) + 4|0);
         HEAP32[$740>>2] = $739;
         $741 = (($726) + ($738)|0);
         HEAP32[$741>>2] = $738;
         break;
        }
        $742 = ((($722)) + 4|0);
        $743 = HEAP32[$742>>2]|0;
        $744 = $743 & 3;
        $745 = ($744|0)==(1);
        if ($745) {
         $746 = $743 & -8;
         $747 = $743 >>> 3;
         $748 = ($743>>>0)<(256);
         L331: do {
          if ($748) {
           $749 = ((($722)) + 8|0);
           $750 = HEAP32[$749>>2]|0;
           $751 = ((($722)) + 12|0);
           $752 = HEAP32[$751>>2]|0;
           $753 = $747 << 1;
           $754 = (8160 + ($753<<2)|0);
           $755 = ($750|0)==($754|0);
           do {
            if (!($755)) {
             $756 = ($750>>>0)<($757>>>0);
             if ($756) {
              _abort();
              // unreachable;
             }
             $758 = ((($750)) + 12|0);
             $759 = HEAP32[$758>>2]|0;
             $760 = ($759|0)==($722|0);
             if ($760) {
              break;
             }
             _abort();
             // unreachable;
            }
           } while(0);
           $761 = ($752|0)==($750|0);
           if ($761) {
            $762 = 1 << $747;
            $763 = $762 ^ -1;
            $764 = HEAP32[2030]|0;
            $765 = $764 & $763;
            HEAP32[2030] = $765;
            break;
           }
           $766 = ($752|0)==($754|0);
           do {
            if ($766) {
             $$pre9$i$i = ((($752)) + 8|0);
             $$pre$phi10$i$iZ2D = $$pre9$i$i;
            } else {
             $767 = ($752>>>0)<($757>>>0);
             if ($767) {
              _abort();
              // unreachable;
             }
             $768 = ((($752)) + 8|0);
             $769 = HEAP32[$768>>2]|0;
             $770 = ($769|0)==($722|0);
             if ($770) {
              $$pre$phi10$i$iZ2D = $768;
              break;
             }
             _abort();
             // unreachable;
            }
           } while(0);
           $771 = ((($750)) + 12|0);
           HEAP32[$771>>2] = $752;
           HEAP32[$$pre$phi10$i$iZ2D>>2] = $750;
          } else {
           $772 = ((($722)) + 24|0);
           $773 = HEAP32[$772>>2]|0;
           $774 = ((($722)) + 12|0);
           $775 = HEAP32[$774>>2]|0;
           $776 = ($775|0)==($722|0);
           do {
            if ($776) {
             $786 = ((($722)) + 16|0);
             $787 = ((($786)) + 4|0);
             $788 = HEAP32[$787>>2]|0;
             $789 = ($788|0)==(0|0);
             if ($789) {
              $790 = HEAP32[$786>>2]|0;
              $791 = ($790|0)==(0|0);
              if ($791) {
               $R$3$i$i = 0;
               break;
              } else {
               $R$1$i$i = $790;$RP$1$i$i = $786;
              }
             } else {
              $R$1$i$i = $788;$RP$1$i$i = $787;
             }
             while(1) {
              $792 = ((($R$1$i$i)) + 20|0);
              $793 = HEAP32[$792>>2]|0;
              $794 = ($793|0)==(0|0);
              if (!($794)) {
               $R$1$i$i = $793;$RP$1$i$i = $792;
               continue;
              }
              $795 = ((($R$1$i$i)) + 16|0);
              $796 = HEAP32[$795>>2]|0;
              $797 = ($796|0)==(0|0);
              if ($797) {
               $R$1$i$i$lcssa = $R$1$i$i;$RP$1$i$i$lcssa = $RP$1$i$i;
               break;
              } else {
               $R$1$i$i = $796;$RP$1$i$i = $795;
              }
             }
             $798 = ($RP$1$i$i$lcssa>>>0)<($757>>>0);
             if ($798) {
              _abort();
              // unreachable;
             } else {
              HEAP32[$RP$1$i$i$lcssa>>2] = 0;
              $R$3$i$i = $R$1$i$i$lcssa;
              break;
             }
            } else {
             $777 = ((($722)) + 8|0);
             $778 = HEAP32[$777>>2]|0;
             $779 = ($778>>>0)<($757>>>0);
             if ($779) {
              _abort();
              // unreachable;
             }
             $780 = ((($778)) + 12|0);
             $781 = HEAP32[$780>>2]|0;
             $782 = ($781|0)==($722|0);
             if (!($782)) {
              _abort();
              // unreachable;
             }
             $783 = ((($775)) + 8|0);
             $784 = HEAP32[$783>>2]|0;
             $785 = ($784|0)==($722|0);
             if ($785) {
              HEAP32[$780>>2] = $775;
              HEAP32[$783>>2] = $778;
              $R$3$i$i = $775;
              break;
             } else {
              _abort();
              // unreachable;
             }
            }
           } while(0);
           $799 = ($773|0)==(0|0);
           if ($799) {
            break;
           }
           $800 = ((($722)) + 28|0);
           $801 = HEAP32[$800>>2]|0;
           $802 = (8424 + ($801<<2)|0);
           $803 = HEAP32[$802>>2]|0;
           $804 = ($722|0)==($803|0);
           do {
            if ($804) {
             HEAP32[$802>>2] = $R$3$i$i;
             $cond$i$i = ($R$3$i$i|0)==(0|0);
             if (!($cond$i$i)) {
              break;
             }
             $805 = 1 << $801;
             $806 = $805 ^ -1;
             $807 = HEAP32[(8124)>>2]|0;
             $808 = $807 & $806;
             HEAP32[(8124)>>2] = $808;
             break L331;
            } else {
             $809 = HEAP32[(8136)>>2]|0;
             $810 = ($773>>>0)<($809>>>0);
             if ($810) {
              _abort();
              // unreachable;
             }
             $811 = ((($773)) + 16|0);
             $812 = HEAP32[$811>>2]|0;
             $813 = ($812|0)==($722|0);
             if ($813) {
              HEAP32[$811>>2] = $R$3$i$i;
             } else {
              $814 = ((($773)) + 20|0);
              HEAP32[$814>>2] = $R$3$i$i;
             }
             $815 = ($R$3$i$i|0)==(0|0);
             if ($815) {
              break L331;
             }
            }
           } while(0);
           $816 = HEAP32[(8136)>>2]|0;
           $817 = ($R$3$i$i>>>0)<($816>>>0);
           if ($817) {
            _abort();
            // unreachable;
           }
           $818 = ((($R$3$i$i)) + 24|0);
           HEAP32[$818>>2] = $773;
           $819 = ((($722)) + 16|0);
           $820 = HEAP32[$819>>2]|0;
           $821 = ($820|0)==(0|0);
           do {
            if (!($821)) {
             $822 = ($820>>>0)<($816>>>0);
             if ($822) {
              _abort();
              // unreachable;
             } else {
              $823 = ((($R$3$i$i)) + 16|0);
              HEAP32[$823>>2] = $820;
              $824 = ((($820)) + 24|0);
              HEAP32[$824>>2] = $R$3$i$i;
              break;
             }
            }
           } while(0);
           $825 = ((($819)) + 4|0);
           $826 = HEAP32[$825>>2]|0;
           $827 = ($826|0)==(0|0);
           if ($827) {
            break;
           }
           $828 = HEAP32[(8136)>>2]|0;
           $829 = ($826>>>0)<($828>>>0);
           if ($829) {
            _abort();
            // unreachable;
           } else {
            $830 = ((($R$3$i$i)) + 20|0);
            HEAP32[$830>>2] = $826;
            $831 = ((($826)) + 24|0);
            HEAP32[$831>>2] = $R$3$i$i;
            break;
           }
          }
         } while(0);
         $832 = (($722) + ($746)|0);
         $833 = (($746) + ($727))|0;
         $oldfirst$0$i$i = $832;$qsize$0$i$i = $833;
        } else {
         $oldfirst$0$i$i = $722;$qsize$0$i$i = $727;
        }
        $834 = ((($oldfirst$0$i$i)) + 4|0);
        $835 = HEAP32[$834>>2]|0;
        $836 = $835 & -2;
        HEAP32[$834>>2] = $836;
        $837 = $qsize$0$i$i | 1;
        $838 = ((($726)) + 4|0);
        HEAP32[$838>>2] = $837;
        $839 = (($726) + ($qsize$0$i$i)|0);
        HEAP32[$839>>2] = $qsize$0$i$i;
        $840 = $qsize$0$i$i >>> 3;
        $841 = ($qsize$0$i$i>>>0)<(256);
        if ($841) {
         $842 = $840 << 1;
         $843 = (8160 + ($842<<2)|0);
         $844 = HEAP32[2030]|0;
         $845 = 1 << $840;
         $846 = $844 & $845;
         $847 = ($846|0)==(0);
         do {
          if ($847) {
           $848 = $844 | $845;
           HEAP32[2030] = $848;
           $$pre$i$16$i = ((($843)) + 8|0);
           $$pre$phi$i$17$iZ2D = $$pre$i$16$i;$F4$0$i$i = $843;
          } else {
           $849 = ((($843)) + 8|0);
           $850 = HEAP32[$849>>2]|0;
           $851 = HEAP32[(8136)>>2]|0;
           $852 = ($850>>>0)<($851>>>0);
           if (!($852)) {
            $$pre$phi$i$17$iZ2D = $849;$F4$0$i$i = $850;
            break;
           }
           _abort();
           // unreachable;
          }
         } while(0);
         HEAP32[$$pre$phi$i$17$iZ2D>>2] = $726;
         $853 = ((($F4$0$i$i)) + 12|0);
         HEAP32[$853>>2] = $726;
         $854 = ((($726)) + 8|0);
         HEAP32[$854>>2] = $F4$0$i$i;
         $855 = ((($726)) + 12|0);
         HEAP32[$855>>2] = $843;
         break;
        }
        $856 = $qsize$0$i$i >>> 8;
        $857 = ($856|0)==(0);
        do {
         if ($857) {
          $I7$0$i$i = 0;
         } else {
          $858 = ($qsize$0$i$i>>>0)>(16777215);
          if ($858) {
           $I7$0$i$i = 31;
           break;
          }
          $859 = (($856) + 1048320)|0;
          $860 = $859 >>> 16;
          $861 = $860 & 8;
          $862 = $856 << $861;
          $863 = (($862) + 520192)|0;
          $864 = $863 >>> 16;
          $865 = $864 & 4;
          $866 = $865 | $861;
          $867 = $862 << $865;
          $868 = (($867) + 245760)|0;
          $869 = $868 >>> 16;
          $870 = $869 & 2;
          $871 = $866 | $870;
          $872 = (14 - ($871))|0;
          $873 = $867 << $870;
          $874 = $873 >>> 15;
          $875 = (($872) + ($874))|0;
          $876 = $875 << 1;
          $877 = (($875) + 7)|0;
          $878 = $qsize$0$i$i >>> $877;
          $879 = $878 & 1;
          $880 = $879 | $876;
          $I7$0$i$i = $880;
         }
        } while(0);
        $881 = (8424 + ($I7$0$i$i<<2)|0);
        $882 = ((($726)) + 28|0);
        HEAP32[$882>>2] = $I7$0$i$i;
        $883 = ((($726)) + 16|0);
        $884 = ((($883)) + 4|0);
        HEAP32[$884>>2] = 0;
        HEAP32[$883>>2] = 0;
        $885 = HEAP32[(8124)>>2]|0;
        $886 = 1 << $I7$0$i$i;
        $887 = $885 & $886;
        $888 = ($887|0)==(0);
        if ($888) {
         $889 = $885 | $886;
         HEAP32[(8124)>>2] = $889;
         HEAP32[$881>>2] = $726;
         $890 = ((($726)) + 24|0);
         HEAP32[$890>>2] = $881;
         $891 = ((($726)) + 12|0);
         HEAP32[$891>>2] = $726;
         $892 = ((($726)) + 8|0);
         HEAP32[$892>>2] = $726;
         break;
        }
        $893 = HEAP32[$881>>2]|0;
        $894 = ($I7$0$i$i|0)==(31);
        $895 = $I7$0$i$i >>> 1;
        $896 = (25 - ($895))|0;
        $897 = $894 ? 0 : $896;
        $898 = $qsize$0$i$i << $897;
        $K8$0$i$i = $898;$T$0$i$18$i = $893;
        while(1) {
         $899 = ((($T$0$i$18$i)) + 4|0);
         $900 = HEAP32[$899>>2]|0;
         $901 = $900 & -8;
         $902 = ($901|0)==($qsize$0$i$i|0);
         if ($902) {
          $T$0$i$18$i$lcssa = $T$0$i$18$i;
          label = 281;
          break;
         }
         $903 = $K8$0$i$i >>> 31;
         $904 = (((($T$0$i$18$i)) + 16|0) + ($903<<2)|0);
         $905 = $K8$0$i$i << 1;
         $906 = HEAP32[$904>>2]|0;
         $907 = ($906|0)==(0|0);
         if ($907) {
          $$lcssa = $904;$T$0$i$18$i$lcssa139 = $T$0$i$18$i;
          label = 278;
          break;
         } else {
          $K8$0$i$i = $905;$T$0$i$18$i = $906;
         }
        }
        if ((label|0) == 278) {
         $908 = HEAP32[(8136)>>2]|0;
         $909 = ($$lcssa>>>0)<($908>>>0);
         if ($909) {
          _abort();
          // unreachable;
         } else {
          HEAP32[$$lcssa>>2] = $726;
          $910 = ((($726)) + 24|0);
          HEAP32[$910>>2] = $T$0$i$18$i$lcssa139;
          $911 = ((($726)) + 12|0);
          HEAP32[$911>>2] = $726;
          $912 = ((($726)) + 8|0);
          HEAP32[$912>>2] = $726;
          break;
         }
        }
        else if ((label|0) == 281) {
         $913 = ((($T$0$i$18$i$lcssa)) + 8|0);
         $914 = HEAP32[$913>>2]|0;
         $915 = HEAP32[(8136)>>2]|0;
         $916 = ($914>>>0)>=($915>>>0);
         $not$$i$20$i = ($T$0$i$18$i$lcssa>>>0)>=($915>>>0);
         $917 = $916 & $not$$i$20$i;
         if ($917) {
          $918 = ((($914)) + 12|0);
          HEAP32[$918>>2] = $726;
          HEAP32[$913>>2] = $726;
          $919 = ((($726)) + 8|0);
          HEAP32[$919>>2] = $914;
          $920 = ((($726)) + 12|0);
          HEAP32[$920>>2] = $T$0$i$18$i$lcssa;
          $921 = ((($726)) + 24|0);
          HEAP32[$921>>2] = 0;
          break;
         } else {
          _abort();
          // unreachable;
         }
        }
       }
      } while(0);
      $1052 = ((($714)) + 8|0);
      $$0 = $1052;
      return ($$0|0);
     } else {
      $sp$0$i$i$i = (8568);
     }
    }
    while(1) {
     $922 = HEAP32[$sp$0$i$i$i>>2]|0;
     $923 = ($922>>>0)>($635>>>0);
     if (!($923)) {
      $924 = ((($sp$0$i$i$i)) + 4|0);
      $925 = HEAP32[$924>>2]|0;
      $926 = (($922) + ($925)|0);
      $927 = ($926>>>0)>($635>>>0);
      if ($927) {
       $$lcssa142 = $926;
       break;
      }
     }
     $928 = ((($sp$0$i$i$i)) + 8|0);
     $929 = HEAP32[$928>>2]|0;
     $sp$0$i$i$i = $929;
    }
    $930 = ((($$lcssa142)) + -47|0);
    $931 = ((($930)) + 8|0);
    $932 = $931;
    $933 = $932 & 7;
    $934 = ($933|0)==(0);
    $935 = (0 - ($932))|0;
    $936 = $935 & 7;
    $937 = $934 ? 0 : $936;
    $938 = (($930) + ($937)|0);
    $939 = ((($635)) + 16|0);
    $940 = ($938>>>0)<($939>>>0);
    $941 = $940 ? $635 : $938;
    $942 = ((($941)) + 8|0);
    $943 = ((($941)) + 24|0);
    $944 = (($tsize$745$i) + -40)|0;
    $945 = ((($tbase$746$i)) + 8|0);
    $946 = $945;
    $947 = $946 & 7;
    $948 = ($947|0)==(0);
    $949 = (0 - ($946))|0;
    $950 = $949 & 7;
    $951 = $948 ? 0 : $950;
    $952 = (($tbase$746$i) + ($951)|0);
    $953 = (($944) - ($951))|0;
    HEAP32[(8144)>>2] = $952;
    HEAP32[(8132)>>2] = $953;
    $954 = $953 | 1;
    $955 = ((($952)) + 4|0);
    HEAP32[$955>>2] = $954;
    $956 = (($952) + ($953)|0);
    $957 = ((($956)) + 4|0);
    HEAP32[$957>>2] = 40;
    $958 = HEAP32[(8608)>>2]|0;
    HEAP32[(8148)>>2] = $958;
    $959 = ((($941)) + 4|0);
    HEAP32[$959>>2] = 27;
    ;HEAP32[$942>>2]=HEAP32[(8568)>>2]|0;HEAP32[$942+4>>2]=HEAP32[(8568)+4>>2]|0;HEAP32[$942+8>>2]=HEAP32[(8568)+8>>2]|0;HEAP32[$942+12>>2]=HEAP32[(8568)+12>>2]|0;
    HEAP32[(8568)>>2] = $tbase$746$i;
    HEAP32[(8572)>>2] = $tsize$745$i;
    HEAP32[(8580)>>2] = 0;
    HEAP32[(8576)>>2] = $942;
    $p$0$i$i = $943;
    while(1) {
     $960 = ((($p$0$i$i)) + 4|0);
     HEAP32[$960>>2] = 7;
     $961 = ((($960)) + 4|0);
     $962 = ($961>>>0)<($$lcssa142>>>0);
     if ($962) {
      $p$0$i$i = $960;
     } else {
      break;
     }
    }
    $963 = ($941|0)==($635|0);
    if (!($963)) {
     $964 = $941;
     $965 = $635;
     $966 = (($964) - ($965))|0;
     $967 = HEAP32[$959>>2]|0;
     $968 = $967 & -2;
     HEAP32[$959>>2] = $968;
     $969 = $966 | 1;
     $970 = ((($635)) + 4|0);
     HEAP32[$970>>2] = $969;
     HEAP32[$941>>2] = $966;
     $971 = $966 >>> 3;
     $972 = ($966>>>0)<(256);
     if ($972) {
      $973 = $971 << 1;
      $974 = (8160 + ($973<<2)|0);
      $975 = HEAP32[2030]|0;
      $976 = 1 << $971;
      $977 = $975 & $976;
      $978 = ($977|0)==(0);
      if ($978) {
       $979 = $975 | $976;
       HEAP32[2030] = $979;
       $$pre$i$i = ((($974)) + 8|0);
       $$pre$phi$i$iZ2D = $$pre$i$i;$F$0$i$i = $974;
      } else {
       $980 = ((($974)) + 8|0);
       $981 = HEAP32[$980>>2]|0;
       $982 = HEAP32[(8136)>>2]|0;
       $983 = ($981>>>0)<($982>>>0);
       if ($983) {
        _abort();
        // unreachable;
       } else {
        $$pre$phi$i$iZ2D = $980;$F$0$i$i = $981;
       }
      }
      HEAP32[$$pre$phi$i$iZ2D>>2] = $635;
      $984 = ((($F$0$i$i)) + 12|0);
      HEAP32[$984>>2] = $635;
      $985 = ((($635)) + 8|0);
      HEAP32[$985>>2] = $F$0$i$i;
      $986 = ((($635)) + 12|0);
      HEAP32[$986>>2] = $974;
      break;
     }
     $987 = $966 >>> 8;
     $988 = ($987|0)==(0);
     if ($988) {
      $I1$0$i$i = 0;
     } else {
      $989 = ($966>>>0)>(16777215);
      if ($989) {
       $I1$0$i$i = 31;
      } else {
       $990 = (($987) + 1048320)|0;
       $991 = $990 >>> 16;
       $992 = $991 & 8;
       $993 = $987 << $992;
       $994 = (($993) + 520192)|0;
       $995 = $994 >>> 16;
       $996 = $995 & 4;
       $997 = $996 | $992;
       $998 = $993 << $996;
       $999 = (($998) + 245760)|0;
       $1000 = $999 >>> 16;
       $1001 = $1000 & 2;
       $1002 = $997 | $1001;
       $1003 = (14 - ($1002))|0;
       $1004 = $998 << $1001;
       $1005 = $1004 >>> 15;
       $1006 = (($1003) + ($1005))|0;
       $1007 = $1006 << 1;
       $1008 = (($1006) + 7)|0;
       $1009 = $966 >>> $1008;
       $1010 = $1009 & 1;
       $1011 = $1010 | $1007;
       $I1$0$i$i = $1011;
      }
     }
     $1012 = (8424 + ($I1$0$i$i<<2)|0);
     $1013 = ((($635)) + 28|0);
     HEAP32[$1013>>2] = $I1$0$i$i;
     $1014 = ((($635)) + 20|0);
     HEAP32[$1014>>2] = 0;
     HEAP32[$939>>2] = 0;
     $1015 = HEAP32[(8124)>>2]|0;
     $1016 = 1 << $I1$0$i$i;
     $1017 = $1015 & $1016;
     $1018 = ($1017|0)==(0);
     if ($1018) {
      $1019 = $1015 | $1016;
      HEAP32[(8124)>>2] = $1019;
      HEAP32[$1012>>2] = $635;
      $1020 = ((($635)) + 24|0);
      HEAP32[$1020>>2] = $1012;
      $1021 = ((($635)) + 12|0);
      HEAP32[$1021>>2] = $635;
      $1022 = ((($635)) + 8|0);
      HEAP32[$1022>>2] = $635;
      break;
     }
     $1023 = HEAP32[$1012>>2]|0;
     $1024 = ($I1$0$i$i|0)==(31);
     $1025 = $I1$0$i$i >>> 1;
     $1026 = (25 - ($1025))|0;
     $1027 = $1024 ? 0 : $1026;
     $1028 = $966 << $1027;
     $K2$0$i$i = $1028;$T$0$i$i = $1023;
     while(1) {
      $1029 = ((($T$0$i$i)) + 4|0);
      $1030 = HEAP32[$1029>>2]|0;
      $1031 = $1030 & -8;
      $1032 = ($1031|0)==($966|0);
      if ($1032) {
       $T$0$i$i$lcssa = $T$0$i$i;
       label = 307;
       break;
      }
      $1033 = $K2$0$i$i >>> 31;
      $1034 = (((($T$0$i$i)) + 16|0) + ($1033<<2)|0);
      $1035 = $K2$0$i$i << 1;
      $1036 = HEAP32[$1034>>2]|0;
      $1037 = ($1036|0)==(0|0);
      if ($1037) {
       $$lcssa141 = $1034;$T$0$i$i$lcssa140 = $T$0$i$i;
       label = 304;
       break;
      } else {
       $K2$0$i$i = $1035;$T$0$i$i = $1036;
      }
     }
     if ((label|0) == 304) {
      $1038 = HEAP32[(8136)>>2]|0;
      $1039 = ($$lcssa141>>>0)<($1038>>>0);
      if ($1039) {
       _abort();
       // unreachable;
      } else {
       HEAP32[$$lcssa141>>2] = $635;
       $1040 = ((($635)) + 24|0);
       HEAP32[$1040>>2] = $T$0$i$i$lcssa140;
       $1041 = ((($635)) + 12|0);
       HEAP32[$1041>>2] = $635;
       $1042 = ((($635)) + 8|0);
       HEAP32[$1042>>2] = $635;
       break;
      }
     }
     else if ((label|0) == 307) {
      $1043 = ((($T$0$i$i$lcssa)) + 8|0);
      $1044 = HEAP32[$1043>>2]|0;
      $1045 = HEAP32[(8136)>>2]|0;
      $1046 = ($1044>>>0)>=($1045>>>0);
      $not$$i$i = ($T$0$i$i$lcssa>>>0)>=($1045>>>0);
      $1047 = $1046 & $not$$i$i;
      if ($1047) {
       $1048 = ((($1044)) + 12|0);
       HEAP32[$1048>>2] = $635;
       HEAP32[$1043>>2] = $635;
       $1049 = ((($635)) + 8|0);
       HEAP32[$1049>>2] = $1044;
       $1050 = ((($635)) + 12|0);
       HEAP32[$1050>>2] = $T$0$i$i$lcssa;
       $1051 = ((($635)) + 24|0);
       HEAP32[$1051>>2] = 0;
       break;
      } else {
       _abort();
       // unreachable;
      }
     }
    }
   }
  } while(0);
  $1053 = HEAP32[(8132)>>2]|0;
  $1054 = ($1053>>>0)>($nb$0>>>0);
  if ($1054) {
   $1055 = (($1053) - ($nb$0))|0;
   HEAP32[(8132)>>2] = $1055;
   $1056 = HEAP32[(8144)>>2]|0;
   $1057 = (($1056) + ($nb$0)|0);
   HEAP32[(8144)>>2] = $1057;
   $1058 = $1055 | 1;
   $1059 = ((($1057)) + 4|0);
   HEAP32[$1059>>2] = $1058;
   $1060 = $nb$0 | 3;
   $1061 = ((($1056)) + 4|0);
   HEAP32[$1061>>2] = $1060;
   $1062 = ((($1056)) + 8|0);
   $$0 = $1062;
   return ($$0|0);
  }
 }
 $1063 = (___errno_location()|0);
 HEAP32[$1063>>2] = 12;
 $$0 = 0;
 return ($$0|0);
}
function _free($mem) {
 $mem = $mem|0;
 var $$lcssa = 0, $$pre = 0, $$pre$phi41Z2D = 0, $$pre$phi43Z2D = 0, $$pre$phiZ2D = 0, $$pre40 = 0, $$pre42 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0;
 var $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0;
 var $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0;
 var $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0;
 var $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0, $18 = 0, $180 = 0, $181 = 0;
 var $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0, $198 = 0, $199 = 0, $2 = 0;
 var $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0, $215 = 0, $216 = 0, $217 = 0;
 var $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0, $233 = 0, $234 = 0, $235 = 0;
 var $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0, $251 = 0, $252 = 0, $253 = 0;
 var $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0, $27 = 0, $270 = 0, $271 = 0;
 var $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0, $288 = 0, $289 = 0, $29 = 0;
 var $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0, $305 = 0, $306 = 0, $307 = 0;
 var $308 = 0, $309 = 0, $31 = 0, $310 = 0, $311 = 0, $312 = 0, $313 = 0, $314 = 0, $315 = 0, $316 = 0, $317 = 0, $318 = 0, $319 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0;
 var $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0;
 var $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0;
 var $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0;
 var $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $F18$0 = 0, $I20$0 = 0, $K21$0 = 0, $R$1 = 0, $R$1$lcssa = 0, $R$3 = 0, $R8$1 = 0, $R8$1$lcssa = 0, $R8$3 = 0, $RP$1 = 0, $RP$1$lcssa = 0, $RP10$1 = 0, $RP10$1$lcssa = 0;
 var $T$0 = 0, $T$0$lcssa = 0, $T$0$lcssa48 = 0, $cond20 = 0, $cond21 = 0, $not$ = 0, $p$1 = 0, $psize$1 = 0, $psize$2 = 0, $sp$0$i = 0, $sp$0$in$i = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($mem|0)==(0|0);
 if ($0) {
  return;
 }
 $1 = ((($mem)) + -8|0);
 $2 = HEAP32[(8136)>>2]|0;
 $3 = ($1>>>0)<($2>>>0);
 if ($3) {
  _abort();
  // unreachable;
 }
 $4 = ((($mem)) + -4|0);
 $5 = HEAP32[$4>>2]|0;
 $6 = $5 & 3;
 $7 = ($6|0)==(1);
 if ($7) {
  _abort();
  // unreachable;
 }
 $8 = $5 & -8;
 $9 = (($1) + ($8)|0);
 $10 = $5 & 1;
 $11 = ($10|0)==(0);
 do {
  if ($11) {
   $12 = HEAP32[$1>>2]|0;
   $13 = ($6|0)==(0);
   if ($13) {
    return;
   }
   $14 = (0 - ($12))|0;
   $15 = (($1) + ($14)|0);
   $16 = (($12) + ($8))|0;
   $17 = ($15>>>0)<($2>>>0);
   if ($17) {
    _abort();
    // unreachable;
   }
   $18 = HEAP32[(8140)>>2]|0;
   $19 = ($15|0)==($18|0);
   if ($19) {
    $104 = ((($9)) + 4|0);
    $105 = HEAP32[$104>>2]|0;
    $106 = $105 & 3;
    $107 = ($106|0)==(3);
    if (!($107)) {
     $p$1 = $15;$psize$1 = $16;
     break;
    }
    HEAP32[(8128)>>2] = $16;
    $108 = $105 & -2;
    HEAP32[$104>>2] = $108;
    $109 = $16 | 1;
    $110 = ((($15)) + 4|0);
    HEAP32[$110>>2] = $109;
    $111 = (($15) + ($16)|0);
    HEAP32[$111>>2] = $16;
    return;
   }
   $20 = $12 >>> 3;
   $21 = ($12>>>0)<(256);
   if ($21) {
    $22 = ((($15)) + 8|0);
    $23 = HEAP32[$22>>2]|0;
    $24 = ((($15)) + 12|0);
    $25 = HEAP32[$24>>2]|0;
    $26 = $20 << 1;
    $27 = (8160 + ($26<<2)|0);
    $28 = ($23|0)==($27|0);
    if (!($28)) {
     $29 = ($23>>>0)<($2>>>0);
     if ($29) {
      _abort();
      // unreachable;
     }
     $30 = ((($23)) + 12|0);
     $31 = HEAP32[$30>>2]|0;
     $32 = ($31|0)==($15|0);
     if (!($32)) {
      _abort();
      // unreachable;
     }
    }
    $33 = ($25|0)==($23|0);
    if ($33) {
     $34 = 1 << $20;
     $35 = $34 ^ -1;
     $36 = HEAP32[2030]|0;
     $37 = $36 & $35;
     HEAP32[2030] = $37;
     $p$1 = $15;$psize$1 = $16;
     break;
    }
    $38 = ($25|0)==($27|0);
    if ($38) {
     $$pre42 = ((($25)) + 8|0);
     $$pre$phi43Z2D = $$pre42;
    } else {
     $39 = ($25>>>0)<($2>>>0);
     if ($39) {
      _abort();
      // unreachable;
     }
     $40 = ((($25)) + 8|0);
     $41 = HEAP32[$40>>2]|0;
     $42 = ($41|0)==($15|0);
     if ($42) {
      $$pre$phi43Z2D = $40;
     } else {
      _abort();
      // unreachable;
     }
    }
    $43 = ((($23)) + 12|0);
    HEAP32[$43>>2] = $25;
    HEAP32[$$pre$phi43Z2D>>2] = $23;
    $p$1 = $15;$psize$1 = $16;
    break;
   }
   $44 = ((($15)) + 24|0);
   $45 = HEAP32[$44>>2]|0;
   $46 = ((($15)) + 12|0);
   $47 = HEAP32[$46>>2]|0;
   $48 = ($47|0)==($15|0);
   do {
    if ($48) {
     $58 = ((($15)) + 16|0);
     $59 = ((($58)) + 4|0);
     $60 = HEAP32[$59>>2]|0;
     $61 = ($60|0)==(0|0);
     if ($61) {
      $62 = HEAP32[$58>>2]|0;
      $63 = ($62|0)==(0|0);
      if ($63) {
       $R$3 = 0;
       break;
      } else {
       $R$1 = $62;$RP$1 = $58;
      }
     } else {
      $R$1 = $60;$RP$1 = $59;
     }
     while(1) {
      $64 = ((($R$1)) + 20|0);
      $65 = HEAP32[$64>>2]|0;
      $66 = ($65|0)==(0|0);
      if (!($66)) {
       $R$1 = $65;$RP$1 = $64;
       continue;
      }
      $67 = ((($R$1)) + 16|0);
      $68 = HEAP32[$67>>2]|0;
      $69 = ($68|0)==(0|0);
      if ($69) {
       $R$1$lcssa = $R$1;$RP$1$lcssa = $RP$1;
       break;
      } else {
       $R$1 = $68;$RP$1 = $67;
      }
     }
     $70 = ($RP$1$lcssa>>>0)<($2>>>0);
     if ($70) {
      _abort();
      // unreachable;
     } else {
      HEAP32[$RP$1$lcssa>>2] = 0;
      $R$3 = $R$1$lcssa;
      break;
     }
    } else {
     $49 = ((($15)) + 8|0);
     $50 = HEAP32[$49>>2]|0;
     $51 = ($50>>>0)<($2>>>0);
     if ($51) {
      _abort();
      // unreachable;
     }
     $52 = ((($50)) + 12|0);
     $53 = HEAP32[$52>>2]|0;
     $54 = ($53|0)==($15|0);
     if (!($54)) {
      _abort();
      // unreachable;
     }
     $55 = ((($47)) + 8|0);
     $56 = HEAP32[$55>>2]|0;
     $57 = ($56|0)==($15|0);
     if ($57) {
      HEAP32[$52>>2] = $47;
      HEAP32[$55>>2] = $50;
      $R$3 = $47;
      break;
     } else {
      _abort();
      // unreachable;
     }
    }
   } while(0);
   $71 = ($45|0)==(0|0);
   if ($71) {
    $p$1 = $15;$psize$1 = $16;
   } else {
    $72 = ((($15)) + 28|0);
    $73 = HEAP32[$72>>2]|0;
    $74 = (8424 + ($73<<2)|0);
    $75 = HEAP32[$74>>2]|0;
    $76 = ($15|0)==($75|0);
    if ($76) {
     HEAP32[$74>>2] = $R$3;
     $cond20 = ($R$3|0)==(0|0);
     if ($cond20) {
      $77 = 1 << $73;
      $78 = $77 ^ -1;
      $79 = HEAP32[(8124)>>2]|0;
      $80 = $79 & $78;
      HEAP32[(8124)>>2] = $80;
      $p$1 = $15;$psize$1 = $16;
      break;
     }
    } else {
     $81 = HEAP32[(8136)>>2]|0;
     $82 = ($45>>>0)<($81>>>0);
     if ($82) {
      _abort();
      // unreachable;
     }
     $83 = ((($45)) + 16|0);
     $84 = HEAP32[$83>>2]|0;
     $85 = ($84|0)==($15|0);
     if ($85) {
      HEAP32[$83>>2] = $R$3;
     } else {
      $86 = ((($45)) + 20|0);
      HEAP32[$86>>2] = $R$3;
     }
     $87 = ($R$3|0)==(0|0);
     if ($87) {
      $p$1 = $15;$psize$1 = $16;
      break;
     }
    }
    $88 = HEAP32[(8136)>>2]|0;
    $89 = ($R$3>>>0)<($88>>>0);
    if ($89) {
     _abort();
     // unreachable;
    }
    $90 = ((($R$3)) + 24|0);
    HEAP32[$90>>2] = $45;
    $91 = ((($15)) + 16|0);
    $92 = HEAP32[$91>>2]|0;
    $93 = ($92|0)==(0|0);
    do {
     if (!($93)) {
      $94 = ($92>>>0)<($88>>>0);
      if ($94) {
       _abort();
       // unreachable;
      } else {
       $95 = ((($R$3)) + 16|0);
       HEAP32[$95>>2] = $92;
       $96 = ((($92)) + 24|0);
       HEAP32[$96>>2] = $R$3;
       break;
      }
     }
    } while(0);
    $97 = ((($91)) + 4|0);
    $98 = HEAP32[$97>>2]|0;
    $99 = ($98|0)==(0|0);
    if ($99) {
     $p$1 = $15;$psize$1 = $16;
    } else {
     $100 = HEAP32[(8136)>>2]|0;
     $101 = ($98>>>0)<($100>>>0);
     if ($101) {
      _abort();
      // unreachable;
     } else {
      $102 = ((($R$3)) + 20|0);
      HEAP32[$102>>2] = $98;
      $103 = ((($98)) + 24|0);
      HEAP32[$103>>2] = $R$3;
      $p$1 = $15;$psize$1 = $16;
      break;
     }
    }
   }
  } else {
   $p$1 = $1;$psize$1 = $8;
  }
 } while(0);
 $112 = ($p$1>>>0)<($9>>>0);
 if (!($112)) {
  _abort();
  // unreachable;
 }
 $113 = ((($9)) + 4|0);
 $114 = HEAP32[$113>>2]|0;
 $115 = $114 & 1;
 $116 = ($115|0)==(0);
 if ($116) {
  _abort();
  // unreachable;
 }
 $117 = $114 & 2;
 $118 = ($117|0)==(0);
 if ($118) {
  $119 = HEAP32[(8144)>>2]|0;
  $120 = ($9|0)==($119|0);
  if ($120) {
   $121 = HEAP32[(8132)>>2]|0;
   $122 = (($121) + ($psize$1))|0;
   HEAP32[(8132)>>2] = $122;
   HEAP32[(8144)>>2] = $p$1;
   $123 = $122 | 1;
   $124 = ((($p$1)) + 4|0);
   HEAP32[$124>>2] = $123;
   $125 = HEAP32[(8140)>>2]|0;
   $126 = ($p$1|0)==($125|0);
   if (!($126)) {
    return;
   }
   HEAP32[(8140)>>2] = 0;
   HEAP32[(8128)>>2] = 0;
   return;
  }
  $127 = HEAP32[(8140)>>2]|0;
  $128 = ($9|0)==($127|0);
  if ($128) {
   $129 = HEAP32[(8128)>>2]|0;
   $130 = (($129) + ($psize$1))|0;
   HEAP32[(8128)>>2] = $130;
   HEAP32[(8140)>>2] = $p$1;
   $131 = $130 | 1;
   $132 = ((($p$1)) + 4|0);
   HEAP32[$132>>2] = $131;
   $133 = (($p$1) + ($130)|0);
   HEAP32[$133>>2] = $130;
   return;
  }
  $134 = $114 & -8;
  $135 = (($134) + ($psize$1))|0;
  $136 = $114 >>> 3;
  $137 = ($114>>>0)<(256);
  do {
   if ($137) {
    $138 = ((($9)) + 8|0);
    $139 = HEAP32[$138>>2]|0;
    $140 = ((($9)) + 12|0);
    $141 = HEAP32[$140>>2]|0;
    $142 = $136 << 1;
    $143 = (8160 + ($142<<2)|0);
    $144 = ($139|0)==($143|0);
    if (!($144)) {
     $145 = HEAP32[(8136)>>2]|0;
     $146 = ($139>>>0)<($145>>>0);
     if ($146) {
      _abort();
      // unreachable;
     }
     $147 = ((($139)) + 12|0);
     $148 = HEAP32[$147>>2]|0;
     $149 = ($148|0)==($9|0);
     if (!($149)) {
      _abort();
      // unreachable;
     }
    }
    $150 = ($141|0)==($139|0);
    if ($150) {
     $151 = 1 << $136;
     $152 = $151 ^ -1;
     $153 = HEAP32[2030]|0;
     $154 = $153 & $152;
     HEAP32[2030] = $154;
     break;
    }
    $155 = ($141|0)==($143|0);
    if ($155) {
     $$pre40 = ((($141)) + 8|0);
     $$pre$phi41Z2D = $$pre40;
    } else {
     $156 = HEAP32[(8136)>>2]|0;
     $157 = ($141>>>0)<($156>>>0);
     if ($157) {
      _abort();
      // unreachable;
     }
     $158 = ((($141)) + 8|0);
     $159 = HEAP32[$158>>2]|0;
     $160 = ($159|0)==($9|0);
     if ($160) {
      $$pre$phi41Z2D = $158;
     } else {
      _abort();
      // unreachable;
     }
    }
    $161 = ((($139)) + 12|0);
    HEAP32[$161>>2] = $141;
    HEAP32[$$pre$phi41Z2D>>2] = $139;
   } else {
    $162 = ((($9)) + 24|0);
    $163 = HEAP32[$162>>2]|0;
    $164 = ((($9)) + 12|0);
    $165 = HEAP32[$164>>2]|0;
    $166 = ($165|0)==($9|0);
    do {
     if ($166) {
      $177 = ((($9)) + 16|0);
      $178 = ((($177)) + 4|0);
      $179 = HEAP32[$178>>2]|0;
      $180 = ($179|0)==(0|0);
      if ($180) {
       $181 = HEAP32[$177>>2]|0;
       $182 = ($181|0)==(0|0);
       if ($182) {
        $R8$3 = 0;
        break;
       } else {
        $R8$1 = $181;$RP10$1 = $177;
       }
      } else {
       $R8$1 = $179;$RP10$1 = $178;
      }
      while(1) {
       $183 = ((($R8$1)) + 20|0);
       $184 = HEAP32[$183>>2]|0;
       $185 = ($184|0)==(0|0);
       if (!($185)) {
        $R8$1 = $184;$RP10$1 = $183;
        continue;
       }
       $186 = ((($R8$1)) + 16|0);
       $187 = HEAP32[$186>>2]|0;
       $188 = ($187|0)==(0|0);
       if ($188) {
        $R8$1$lcssa = $R8$1;$RP10$1$lcssa = $RP10$1;
        break;
       } else {
        $R8$1 = $187;$RP10$1 = $186;
       }
      }
      $189 = HEAP32[(8136)>>2]|0;
      $190 = ($RP10$1$lcssa>>>0)<($189>>>0);
      if ($190) {
       _abort();
       // unreachable;
      } else {
       HEAP32[$RP10$1$lcssa>>2] = 0;
       $R8$3 = $R8$1$lcssa;
       break;
      }
     } else {
      $167 = ((($9)) + 8|0);
      $168 = HEAP32[$167>>2]|0;
      $169 = HEAP32[(8136)>>2]|0;
      $170 = ($168>>>0)<($169>>>0);
      if ($170) {
       _abort();
       // unreachable;
      }
      $171 = ((($168)) + 12|0);
      $172 = HEAP32[$171>>2]|0;
      $173 = ($172|0)==($9|0);
      if (!($173)) {
       _abort();
       // unreachable;
      }
      $174 = ((($165)) + 8|0);
      $175 = HEAP32[$174>>2]|0;
      $176 = ($175|0)==($9|0);
      if ($176) {
       HEAP32[$171>>2] = $165;
       HEAP32[$174>>2] = $168;
       $R8$3 = $165;
       break;
      } else {
       _abort();
       // unreachable;
      }
     }
    } while(0);
    $191 = ($163|0)==(0|0);
    if (!($191)) {
     $192 = ((($9)) + 28|0);
     $193 = HEAP32[$192>>2]|0;
     $194 = (8424 + ($193<<2)|0);
     $195 = HEAP32[$194>>2]|0;
     $196 = ($9|0)==($195|0);
     if ($196) {
      HEAP32[$194>>2] = $R8$3;
      $cond21 = ($R8$3|0)==(0|0);
      if ($cond21) {
       $197 = 1 << $193;
       $198 = $197 ^ -1;
       $199 = HEAP32[(8124)>>2]|0;
       $200 = $199 & $198;
       HEAP32[(8124)>>2] = $200;
       break;
      }
     } else {
      $201 = HEAP32[(8136)>>2]|0;
      $202 = ($163>>>0)<($201>>>0);
      if ($202) {
       _abort();
       // unreachable;
      }
      $203 = ((($163)) + 16|0);
      $204 = HEAP32[$203>>2]|0;
      $205 = ($204|0)==($9|0);
      if ($205) {
       HEAP32[$203>>2] = $R8$3;
      } else {
       $206 = ((($163)) + 20|0);
       HEAP32[$206>>2] = $R8$3;
      }
      $207 = ($R8$3|0)==(0|0);
      if ($207) {
       break;
      }
     }
     $208 = HEAP32[(8136)>>2]|0;
     $209 = ($R8$3>>>0)<($208>>>0);
     if ($209) {
      _abort();
      // unreachable;
     }
     $210 = ((($R8$3)) + 24|0);
     HEAP32[$210>>2] = $163;
     $211 = ((($9)) + 16|0);
     $212 = HEAP32[$211>>2]|0;
     $213 = ($212|0)==(0|0);
     do {
      if (!($213)) {
       $214 = ($212>>>0)<($208>>>0);
       if ($214) {
        _abort();
        // unreachable;
       } else {
        $215 = ((($R8$3)) + 16|0);
        HEAP32[$215>>2] = $212;
        $216 = ((($212)) + 24|0);
        HEAP32[$216>>2] = $R8$3;
        break;
       }
      }
     } while(0);
     $217 = ((($211)) + 4|0);
     $218 = HEAP32[$217>>2]|0;
     $219 = ($218|0)==(0|0);
     if (!($219)) {
      $220 = HEAP32[(8136)>>2]|0;
      $221 = ($218>>>0)<($220>>>0);
      if ($221) {
       _abort();
       // unreachable;
      } else {
       $222 = ((($R8$3)) + 20|0);
       HEAP32[$222>>2] = $218;
       $223 = ((($218)) + 24|0);
       HEAP32[$223>>2] = $R8$3;
       break;
      }
     }
    }
   }
  } while(0);
  $224 = $135 | 1;
  $225 = ((($p$1)) + 4|0);
  HEAP32[$225>>2] = $224;
  $226 = (($p$1) + ($135)|0);
  HEAP32[$226>>2] = $135;
  $227 = HEAP32[(8140)>>2]|0;
  $228 = ($p$1|0)==($227|0);
  if ($228) {
   HEAP32[(8128)>>2] = $135;
   return;
  } else {
   $psize$2 = $135;
  }
 } else {
  $229 = $114 & -2;
  HEAP32[$113>>2] = $229;
  $230 = $psize$1 | 1;
  $231 = ((($p$1)) + 4|0);
  HEAP32[$231>>2] = $230;
  $232 = (($p$1) + ($psize$1)|0);
  HEAP32[$232>>2] = $psize$1;
  $psize$2 = $psize$1;
 }
 $233 = $psize$2 >>> 3;
 $234 = ($psize$2>>>0)<(256);
 if ($234) {
  $235 = $233 << 1;
  $236 = (8160 + ($235<<2)|0);
  $237 = HEAP32[2030]|0;
  $238 = 1 << $233;
  $239 = $237 & $238;
  $240 = ($239|0)==(0);
  if ($240) {
   $241 = $237 | $238;
   HEAP32[2030] = $241;
   $$pre = ((($236)) + 8|0);
   $$pre$phiZ2D = $$pre;$F18$0 = $236;
  } else {
   $242 = ((($236)) + 8|0);
   $243 = HEAP32[$242>>2]|0;
   $244 = HEAP32[(8136)>>2]|0;
   $245 = ($243>>>0)<($244>>>0);
   if ($245) {
    _abort();
    // unreachable;
   } else {
    $$pre$phiZ2D = $242;$F18$0 = $243;
   }
  }
  HEAP32[$$pre$phiZ2D>>2] = $p$1;
  $246 = ((($F18$0)) + 12|0);
  HEAP32[$246>>2] = $p$1;
  $247 = ((($p$1)) + 8|0);
  HEAP32[$247>>2] = $F18$0;
  $248 = ((($p$1)) + 12|0);
  HEAP32[$248>>2] = $236;
  return;
 }
 $249 = $psize$2 >>> 8;
 $250 = ($249|0)==(0);
 if ($250) {
  $I20$0 = 0;
 } else {
  $251 = ($psize$2>>>0)>(16777215);
  if ($251) {
   $I20$0 = 31;
  } else {
   $252 = (($249) + 1048320)|0;
   $253 = $252 >>> 16;
   $254 = $253 & 8;
   $255 = $249 << $254;
   $256 = (($255) + 520192)|0;
   $257 = $256 >>> 16;
   $258 = $257 & 4;
   $259 = $258 | $254;
   $260 = $255 << $258;
   $261 = (($260) + 245760)|0;
   $262 = $261 >>> 16;
   $263 = $262 & 2;
   $264 = $259 | $263;
   $265 = (14 - ($264))|0;
   $266 = $260 << $263;
   $267 = $266 >>> 15;
   $268 = (($265) + ($267))|0;
   $269 = $268 << 1;
   $270 = (($268) + 7)|0;
   $271 = $psize$2 >>> $270;
   $272 = $271 & 1;
   $273 = $272 | $269;
   $I20$0 = $273;
  }
 }
 $274 = (8424 + ($I20$0<<2)|0);
 $275 = ((($p$1)) + 28|0);
 HEAP32[$275>>2] = $I20$0;
 $276 = ((($p$1)) + 16|0);
 $277 = ((($p$1)) + 20|0);
 HEAP32[$277>>2] = 0;
 HEAP32[$276>>2] = 0;
 $278 = HEAP32[(8124)>>2]|0;
 $279 = 1 << $I20$0;
 $280 = $278 & $279;
 $281 = ($280|0)==(0);
 do {
  if ($281) {
   $282 = $278 | $279;
   HEAP32[(8124)>>2] = $282;
   HEAP32[$274>>2] = $p$1;
   $283 = ((($p$1)) + 24|0);
   HEAP32[$283>>2] = $274;
   $284 = ((($p$1)) + 12|0);
   HEAP32[$284>>2] = $p$1;
   $285 = ((($p$1)) + 8|0);
   HEAP32[$285>>2] = $p$1;
  } else {
   $286 = HEAP32[$274>>2]|0;
   $287 = ($I20$0|0)==(31);
   $288 = $I20$0 >>> 1;
   $289 = (25 - ($288))|0;
   $290 = $287 ? 0 : $289;
   $291 = $psize$2 << $290;
   $K21$0 = $291;$T$0 = $286;
   while(1) {
    $292 = ((($T$0)) + 4|0);
    $293 = HEAP32[$292>>2]|0;
    $294 = $293 & -8;
    $295 = ($294|0)==($psize$2|0);
    if ($295) {
     $T$0$lcssa = $T$0;
     label = 130;
     break;
    }
    $296 = $K21$0 >>> 31;
    $297 = (((($T$0)) + 16|0) + ($296<<2)|0);
    $298 = $K21$0 << 1;
    $299 = HEAP32[$297>>2]|0;
    $300 = ($299|0)==(0|0);
    if ($300) {
     $$lcssa = $297;$T$0$lcssa48 = $T$0;
     label = 127;
     break;
    } else {
     $K21$0 = $298;$T$0 = $299;
    }
   }
   if ((label|0) == 127) {
    $301 = HEAP32[(8136)>>2]|0;
    $302 = ($$lcssa>>>0)<($301>>>0);
    if ($302) {
     _abort();
     // unreachable;
    } else {
     HEAP32[$$lcssa>>2] = $p$1;
     $303 = ((($p$1)) + 24|0);
     HEAP32[$303>>2] = $T$0$lcssa48;
     $304 = ((($p$1)) + 12|0);
     HEAP32[$304>>2] = $p$1;
     $305 = ((($p$1)) + 8|0);
     HEAP32[$305>>2] = $p$1;
     break;
    }
   }
   else if ((label|0) == 130) {
    $306 = ((($T$0$lcssa)) + 8|0);
    $307 = HEAP32[$306>>2]|0;
    $308 = HEAP32[(8136)>>2]|0;
    $309 = ($307>>>0)>=($308>>>0);
    $not$ = ($T$0$lcssa>>>0)>=($308>>>0);
    $310 = $309 & $not$;
    if ($310) {
     $311 = ((($307)) + 12|0);
     HEAP32[$311>>2] = $p$1;
     HEAP32[$306>>2] = $p$1;
     $312 = ((($p$1)) + 8|0);
     HEAP32[$312>>2] = $307;
     $313 = ((($p$1)) + 12|0);
     HEAP32[$313>>2] = $T$0$lcssa;
     $314 = ((($p$1)) + 24|0);
     HEAP32[$314>>2] = 0;
     break;
    } else {
     _abort();
     // unreachable;
    }
   }
  }
 } while(0);
 $315 = HEAP32[(8152)>>2]|0;
 $316 = (($315) + -1)|0;
 HEAP32[(8152)>>2] = $316;
 $317 = ($316|0)==(0);
 if ($317) {
  $sp$0$in$i = (8576);
 } else {
  return;
 }
 while(1) {
  $sp$0$i = HEAP32[$sp$0$in$i>>2]|0;
  $318 = ($sp$0$i|0)==(0|0);
  $319 = ((($sp$0$i)) + 8|0);
  if ($318) {
   break;
  } else {
   $sp$0$in$i = $319;
  }
 }
 HEAP32[(8152)>>2] = -1;
 return;
}
function _realloc($oldmem,$bytes) {
 $oldmem = $oldmem|0;
 $bytes = $bytes|0;
 var $0 = 0, $1 = 0, $10 = 0, $11 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $16 = 0, $17 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $3 = 0, $4 = 0, $5 = 0, $6 = 0;
 var $7 = 0, $8 = 0, $9 = 0, $mem$1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ($oldmem|0)==(0|0);
 if ($0) {
  $1 = (_malloc($bytes)|0);
  $mem$1 = $1;
  return ($mem$1|0);
 }
 $2 = ($bytes>>>0)>(4294967231);
 if ($2) {
  $3 = (___errno_location()|0);
  HEAP32[$3>>2] = 12;
  $mem$1 = 0;
  return ($mem$1|0);
 }
 $4 = ($bytes>>>0)<(11);
 $5 = (($bytes) + 11)|0;
 $6 = $5 & -8;
 $7 = $4 ? 16 : $6;
 $8 = ((($oldmem)) + -8|0);
 $9 = (_try_realloc_chunk($8,$7)|0);
 $10 = ($9|0)==(0|0);
 if (!($10)) {
  $11 = ((($9)) + 8|0);
  $mem$1 = $11;
  return ($mem$1|0);
 }
 $12 = (_malloc($bytes)|0);
 $13 = ($12|0)==(0|0);
 if ($13) {
  $mem$1 = 0;
  return ($mem$1|0);
 }
 $14 = ((($oldmem)) + -4|0);
 $15 = HEAP32[$14>>2]|0;
 $16 = $15 & -8;
 $17 = $15 & 3;
 $18 = ($17|0)==(0);
 $19 = $18 ? 8 : 4;
 $20 = (($16) - ($19))|0;
 $21 = ($20>>>0)<($bytes>>>0);
 $22 = $21 ? $20 : $bytes;
 _memcpy(($12|0),($oldmem|0),($22|0))|0;
 _free($oldmem);
 $mem$1 = $12;
 return ($mem$1|0);
}
function _try_realloc_chunk($p,$nb) {
 $p = $p|0;
 $nb = $nb|0;
 var $$pre = 0, $$pre$phiZ2D = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0, $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0;
 var $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0, $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0;
 var $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0, $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0;
 var $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0, $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0;
 var $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $18 = 0, $19 = 0, $2 = 0, $20 = 0, $21 = 0, $22 = 0, $23 = 0, $24 = 0, $25 = 0, $26 = 0, $27 = 0, $28 = 0;
 var $29 = 0, $3 = 0, $30 = 0, $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0;
 var $47 = 0, $48 = 0, $49 = 0, $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0;
 var $65 = 0, $66 = 0, $67 = 0, $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0;
 var $83 = 0, $84 = 0, $85 = 0, $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $R$1 = 0, $R$1$lcssa = 0;
 var $R$3 = 0, $RP$1 = 0, $RP$1$lcssa = 0, $cond = 0, $newp$2 = 0, $notlhs = 0, $notrhs = 0, $or$cond$not = 0, $or$cond3 = 0, $storemerge = 0, $storemerge$1 = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = ((($p)) + 4|0);
 $1 = HEAP32[$0>>2]|0;
 $2 = $1 & -8;
 $3 = (($p) + ($2)|0);
 $4 = HEAP32[(8136)>>2]|0;
 $5 = $1 & 3;
 $notlhs = ($p>>>0)>=($4>>>0);
 $notrhs = ($5|0)!=(1);
 $or$cond$not = $notrhs & $notlhs;
 $6 = ($p>>>0)<($3>>>0);
 $or$cond3 = $or$cond$not & $6;
 if (!($or$cond3)) {
  _abort();
  // unreachable;
 }
 $7 = ((($3)) + 4|0);
 $8 = HEAP32[$7>>2]|0;
 $9 = $8 & 1;
 $10 = ($9|0)==(0);
 if ($10) {
  _abort();
  // unreachable;
 }
 $11 = ($5|0)==(0);
 if ($11) {
  $12 = ($nb>>>0)<(256);
  if ($12) {
   $newp$2 = 0;
   return ($newp$2|0);
  }
  $13 = (($nb) + 4)|0;
  $14 = ($2>>>0)<($13>>>0);
  if (!($14)) {
   $15 = (($2) - ($nb))|0;
   $16 = HEAP32[(8600)>>2]|0;
   $17 = $16 << 1;
   $18 = ($15>>>0)>($17>>>0);
   if (!($18)) {
    $newp$2 = $p;
    return ($newp$2|0);
   }
  }
  $newp$2 = 0;
  return ($newp$2|0);
 }
 $19 = ($2>>>0)<($nb>>>0);
 if (!($19)) {
  $20 = (($2) - ($nb))|0;
  $21 = ($20>>>0)>(15);
  if (!($21)) {
   $newp$2 = $p;
   return ($newp$2|0);
  }
  $22 = (($p) + ($nb)|0);
  $23 = $1 & 1;
  $24 = $23 | $nb;
  $25 = $24 | 2;
  HEAP32[$0>>2] = $25;
  $26 = ((($22)) + 4|0);
  $27 = $20 | 3;
  HEAP32[$26>>2] = $27;
  $28 = (($22) + ($20)|0);
  $29 = ((($28)) + 4|0);
  $30 = HEAP32[$29>>2]|0;
  $31 = $30 | 1;
  HEAP32[$29>>2] = $31;
  _dispose_chunk($22,$20);
  $newp$2 = $p;
  return ($newp$2|0);
 }
 $32 = HEAP32[(8144)>>2]|0;
 $33 = ($3|0)==($32|0);
 if ($33) {
  $34 = HEAP32[(8132)>>2]|0;
  $35 = (($34) + ($2))|0;
  $36 = ($35>>>0)>($nb>>>0);
  if (!($36)) {
   $newp$2 = 0;
   return ($newp$2|0);
  }
  $37 = (($35) - ($nb))|0;
  $38 = (($p) + ($nb)|0);
  $39 = $1 & 1;
  $40 = $39 | $nb;
  $41 = $40 | 2;
  HEAP32[$0>>2] = $41;
  $42 = ((($38)) + 4|0);
  $43 = $37 | 1;
  HEAP32[$42>>2] = $43;
  HEAP32[(8144)>>2] = $38;
  HEAP32[(8132)>>2] = $37;
  $newp$2 = $p;
  return ($newp$2|0);
 }
 $44 = HEAP32[(8140)>>2]|0;
 $45 = ($3|0)==($44|0);
 if ($45) {
  $46 = HEAP32[(8128)>>2]|0;
  $47 = (($46) + ($2))|0;
  $48 = ($47>>>0)<($nb>>>0);
  if ($48) {
   $newp$2 = 0;
   return ($newp$2|0);
  }
  $49 = (($47) - ($nb))|0;
  $50 = ($49>>>0)>(15);
  if ($50) {
   $51 = (($p) + ($nb)|0);
   $52 = (($51) + ($49)|0);
   $53 = $1 & 1;
   $54 = $53 | $nb;
   $55 = $54 | 2;
   HEAP32[$0>>2] = $55;
   $56 = ((($51)) + 4|0);
   $57 = $49 | 1;
   HEAP32[$56>>2] = $57;
   HEAP32[$52>>2] = $49;
   $58 = ((($52)) + 4|0);
   $59 = HEAP32[$58>>2]|0;
   $60 = $59 & -2;
   HEAP32[$58>>2] = $60;
   $storemerge = $51;$storemerge$1 = $49;
  } else {
   $61 = $1 & 1;
   $62 = $61 | $47;
   $63 = $62 | 2;
   HEAP32[$0>>2] = $63;
   $64 = (($p) + ($47)|0);
   $65 = ((($64)) + 4|0);
   $66 = HEAP32[$65>>2]|0;
   $67 = $66 | 1;
   HEAP32[$65>>2] = $67;
   $storemerge = 0;$storemerge$1 = 0;
  }
  HEAP32[(8128)>>2] = $storemerge$1;
  HEAP32[(8140)>>2] = $storemerge;
  $newp$2 = $p;
  return ($newp$2|0);
 }
 $68 = $8 & 2;
 $69 = ($68|0)==(0);
 if (!($69)) {
  $newp$2 = 0;
  return ($newp$2|0);
 }
 $70 = $8 & -8;
 $71 = (($70) + ($2))|0;
 $72 = ($71>>>0)<($nb>>>0);
 if ($72) {
  $newp$2 = 0;
  return ($newp$2|0);
 }
 $73 = (($71) - ($nb))|0;
 $74 = $8 >>> 3;
 $75 = ($8>>>0)<(256);
 do {
  if ($75) {
   $76 = ((($3)) + 8|0);
   $77 = HEAP32[$76>>2]|0;
   $78 = ((($3)) + 12|0);
   $79 = HEAP32[$78>>2]|0;
   $80 = $74 << 1;
   $81 = (8160 + ($80<<2)|0);
   $82 = ($77|0)==($81|0);
   if (!($82)) {
    $83 = ($77>>>0)<($4>>>0);
    if ($83) {
     _abort();
     // unreachable;
    }
    $84 = ((($77)) + 12|0);
    $85 = HEAP32[$84>>2]|0;
    $86 = ($85|0)==($3|0);
    if (!($86)) {
     _abort();
     // unreachable;
    }
   }
   $87 = ($79|0)==($77|0);
   if ($87) {
    $88 = 1 << $74;
    $89 = $88 ^ -1;
    $90 = HEAP32[2030]|0;
    $91 = $90 & $89;
    HEAP32[2030] = $91;
    break;
   }
   $92 = ($79|0)==($81|0);
   if ($92) {
    $$pre = ((($79)) + 8|0);
    $$pre$phiZ2D = $$pre;
   } else {
    $93 = ($79>>>0)<($4>>>0);
    if ($93) {
     _abort();
     // unreachable;
    }
    $94 = ((($79)) + 8|0);
    $95 = HEAP32[$94>>2]|0;
    $96 = ($95|0)==($3|0);
    if ($96) {
     $$pre$phiZ2D = $94;
    } else {
     _abort();
     // unreachable;
    }
   }
   $97 = ((($77)) + 12|0);
   HEAP32[$97>>2] = $79;
   HEAP32[$$pre$phiZ2D>>2] = $77;
  } else {
   $98 = ((($3)) + 24|0);
   $99 = HEAP32[$98>>2]|0;
   $100 = ((($3)) + 12|0);
   $101 = HEAP32[$100>>2]|0;
   $102 = ($101|0)==($3|0);
   do {
    if ($102) {
     $112 = ((($3)) + 16|0);
     $113 = ((($112)) + 4|0);
     $114 = HEAP32[$113>>2]|0;
     $115 = ($114|0)==(0|0);
     if ($115) {
      $116 = HEAP32[$112>>2]|0;
      $117 = ($116|0)==(0|0);
      if ($117) {
       $R$3 = 0;
       break;
      } else {
       $R$1 = $116;$RP$1 = $112;
      }
     } else {
      $R$1 = $114;$RP$1 = $113;
     }
     while(1) {
      $118 = ((($R$1)) + 20|0);
      $119 = HEAP32[$118>>2]|0;
      $120 = ($119|0)==(0|0);
      if (!($120)) {
       $R$1 = $119;$RP$1 = $118;
       continue;
      }
      $121 = ((($R$1)) + 16|0);
      $122 = HEAP32[$121>>2]|0;
      $123 = ($122|0)==(0|0);
      if ($123) {
       $R$1$lcssa = $R$1;$RP$1$lcssa = $RP$1;
       break;
      } else {
       $R$1 = $122;$RP$1 = $121;
      }
     }
     $124 = ($RP$1$lcssa>>>0)<($4>>>0);
     if ($124) {
      _abort();
      // unreachable;
     } else {
      HEAP32[$RP$1$lcssa>>2] = 0;
      $R$3 = $R$1$lcssa;
      break;
     }
    } else {
     $103 = ((($3)) + 8|0);
     $104 = HEAP32[$103>>2]|0;
     $105 = ($104>>>0)<($4>>>0);
     if ($105) {
      _abort();
      // unreachable;
     }
     $106 = ((($104)) + 12|0);
     $107 = HEAP32[$106>>2]|0;
     $108 = ($107|0)==($3|0);
     if (!($108)) {
      _abort();
      // unreachable;
     }
     $109 = ((($101)) + 8|0);
     $110 = HEAP32[$109>>2]|0;
     $111 = ($110|0)==($3|0);
     if ($111) {
      HEAP32[$106>>2] = $101;
      HEAP32[$109>>2] = $104;
      $R$3 = $101;
      break;
     } else {
      _abort();
      // unreachable;
     }
    }
   } while(0);
   $125 = ($99|0)==(0|0);
   if (!($125)) {
    $126 = ((($3)) + 28|0);
    $127 = HEAP32[$126>>2]|0;
    $128 = (8424 + ($127<<2)|0);
    $129 = HEAP32[$128>>2]|0;
    $130 = ($3|0)==($129|0);
    if ($130) {
     HEAP32[$128>>2] = $R$3;
     $cond = ($R$3|0)==(0|0);
     if ($cond) {
      $131 = 1 << $127;
      $132 = $131 ^ -1;
      $133 = HEAP32[(8124)>>2]|0;
      $134 = $133 & $132;
      HEAP32[(8124)>>2] = $134;
      break;
     }
    } else {
     $135 = HEAP32[(8136)>>2]|0;
     $136 = ($99>>>0)<($135>>>0);
     if ($136) {
      _abort();
      // unreachable;
     }
     $137 = ((($99)) + 16|0);
     $138 = HEAP32[$137>>2]|0;
     $139 = ($138|0)==($3|0);
     if ($139) {
      HEAP32[$137>>2] = $R$3;
     } else {
      $140 = ((($99)) + 20|0);
      HEAP32[$140>>2] = $R$3;
     }
     $141 = ($R$3|0)==(0|0);
     if ($141) {
      break;
     }
    }
    $142 = HEAP32[(8136)>>2]|0;
    $143 = ($R$3>>>0)<($142>>>0);
    if ($143) {
     _abort();
     // unreachable;
    }
    $144 = ((($R$3)) + 24|0);
    HEAP32[$144>>2] = $99;
    $145 = ((($3)) + 16|0);
    $146 = HEAP32[$145>>2]|0;
    $147 = ($146|0)==(0|0);
    do {
     if (!($147)) {
      $148 = ($146>>>0)<($142>>>0);
      if ($148) {
       _abort();
       // unreachable;
      } else {
       $149 = ((($R$3)) + 16|0);
       HEAP32[$149>>2] = $146;
       $150 = ((($146)) + 24|0);
       HEAP32[$150>>2] = $R$3;
       break;
      }
     }
    } while(0);
    $151 = ((($145)) + 4|0);
    $152 = HEAP32[$151>>2]|0;
    $153 = ($152|0)==(0|0);
    if (!($153)) {
     $154 = HEAP32[(8136)>>2]|0;
     $155 = ($152>>>0)<($154>>>0);
     if ($155) {
      _abort();
      // unreachable;
     } else {
      $156 = ((($R$3)) + 20|0);
      HEAP32[$156>>2] = $152;
      $157 = ((($152)) + 24|0);
      HEAP32[$157>>2] = $R$3;
      break;
     }
    }
   }
  }
 } while(0);
 $158 = ($73>>>0)<(16);
 if ($158) {
  $159 = $1 & 1;
  $160 = $71 | $159;
  $161 = $160 | 2;
  HEAP32[$0>>2] = $161;
  $162 = (($p) + ($71)|0);
  $163 = ((($162)) + 4|0);
  $164 = HEAP32[$163>>2]|0;
  $165 = $164 | 1;
  HEAP32[$163>>2] = $165;
  $newp$2 = $p;
  return ($newp$2|0);
 } else {
  $166 = (($p) + ($nb)|0);
  $167 = $1 & 1;
  $168 = $167 | $nb;
  $169 = $168 | 2;
  HEAP32[$0>>2] = $169;
  $170 = ((($166)) + 4|0);
  $171 = $73 | 3;
  HEAP32[$170>>2] = $171;
  $172 = (($166) + ($73)|0);
  $173 = ((($172)) + 4|0);
  $174 = HEAP32[$173>>2]|0;
  $175 = $174 | 1;
  HEAP32[$173>>2] = $175;
  _dispose_chunk($166,$73);
  $newp$2 = $p;
  return ($newp$2|0);
 }
 return (0)|0;
}
function _dispose_chunk($p,$psize) {
 $p = $p|0;
 $psize = $psize|0;
 var $$1 = 0, $$14 = 0, $$2 = 0, $$lcssa = 0, $$pre = 0, $$pre$phi22Z2D = 0, $$pre$phi24Z2D = 0, $$pre$phiZ2D = 0, $$pre21 = 0, $$pre23 = 0, $0 = 0, $1 = 0, $10 = 0, $100 = 0, $101 = 0, $102 = 0, $103 = 0, $104 = 0, $105 = 0, $106 = 0;
 var $107 = 0, $108 = 0, $109 = 0, $11 = 0, $110 = 0, $111 = 0, $112 = 0, $113 = 0, $114 = 0, $115 = 0, $116 = 0, $117 = 0, $118 = 0, $119 = 0, $12 = 0, $120 = 0, $121 = 0, $122 = 0, $123 = 0, $124 = 0;
 var $125 = 0, $126 = 0, $127 = 0, $128 = 0, $129 = 0, $13 = 0, $130 = 0, $131 = 0, $132 = 0, $133 = 0, $134 = 0, $135 = 0, $136 = 0, $137 = 0, $138 = 0, $139 = 0, $14 = 0, $140 = 0, $141 = 0, $142 = 0;
 var $143 = 0, $144 = 0, $145 = 0, $146 = 0, $147 = 0, $148 = 0, $149 = 0, $15 = 0, $150 = 0, $151 = 0, $152 = 0, $153 = 0, $154 = 0, $155 = 0, $156 = 0, $157 = 0, $158 = 0, $159 = 0, $16 = 0, $160 = 0;
 var $161 = 0, $162 = 0, $163 = 0, $164 = 0, $165 = 0, $166 = 0, $167 = 0, $168 = 0, $169 = 0, $17 = 0, $170 = 0, $171 = 0, $172 = 0, $173 = 0, $174 = 0, $175 = 0, $176 = 0, $177 = 0, $178 = 0, $179 = 0;
 var $18 = 0, $180 = 0, $181 = 0, $182 = 0, $183 = 0, $184 = 0, $185 = 0, $186 = 0, $187 = 0, $188 = 0, $189 = 0, $19 = 0, $190 = 0, $191 = 0, $192 = 0, $193 = 0, $194 = 0, $195 = 0, $196 = 0, $197 = 0;
 var $198 = 0, $199 = 0, $2 = 0, $20 = 0, $200 = 0, $201 = 0, $202 = 0, $203 = 0, $204 = 0, $205 = 0, $206 = 0, $207 = 0, $208 = 0, $209 = 0, $21 = 0, $210 = 0, $211 = 0, $212 = 0, $213 = 0, $214 = 0;
 var $215 = 0, $216 = 0, $217 = 0, $218 = 0, $219 = 0, $22 = 0, $220 = 0, $221 = 0, $222 = 0, $223 = 0, $224 = 0, $225 = 0, $226 = 0, $227 = 0, $228 = 0, $229 = 0, $23 = 0, $230 = 0, $231 = 0, $232 = 0;
 var $233 = 0, $234 = 0, $235 = 0, $236 = 0, $237 = 0, $238 = 0, $239 = 0, $24 = 0, $240 = 0, $241 = 0, $242 = 0, $243 = 0, $244 = 0, $245 = 0, $246 = 0, $247 = 0, $248 = 0, $249 = 0, $25 = 0, $250 = 0;
 var $251 = 0, $252 = 0, $253 = 0, $254 = 0, $255 = 0, $256 = 0, $257 = 0, $258 = 0, $259 = 0, $26 = 0, $260 = 0, $261 = 0, $262 = 0, $263 = 0, $264 = 0, $265 = 0, $266 = 0, $267 = 0, $268 = 0, $269 = 0;
 var $27 = 0, $270 = 0, $271 = 0, $272 = 0, $273 = 0, $274 = 0, $275 = 0, $276 = 0, $277 = 0, $278 = 0, $279 = 0, $28 = 0, $280 = 0, $281 = 0, $282 = 0, $283 = 0, $284 = 0, $285 = 0, $286 = 0, $287 = 0;
 var $288 = 0, $289 = 0, $29 = 0, $290 = 0, $291 = 0, $292 = 0, $293 = 0, $294 = 0, $295 = 0, $296 = 0, $297 = 0, $298 = 0, $299 = 0, $3 = 0, $30 = 0, $300 = 0, $301 = 0, $302 = 0, $303 = 0, $304 = 0;
 var $31 = 0, $32 = 0, $33 = 0, $34 = 0, $35 = 0, $36 = 0, $37 = 0, $38 = 0, $39 = 0, $4 = 0, $40 = 0, $41 = 0, $42 = 0, $43 = 0, $44 = 0, $45 = 0, $46 = 0, $47 = 0, $48 = 0, $49 = 0;
 var $5 = 0, $50 = 0, $51 = 0, $52 = 0, $53 = 0, $54 = 0, $55 = 0, $56 = 0, $57 = 0, $58 = 0, $59 = 0, $6 = 0, $60 = 0, $61 = 0, $62 = 0, $63 = 0, $64 = 0, $65 = 0, $66 = 0, $67 = 0;
 var $68 = 0, $69 = 0, $7 = 0, $70 = 0, $71 = 0, $72 = 0, $73 = 0, $74 = 0, $75 = 0, $76 = 0, $77 = 0, $78 = 0, $79 = 0, $8 = 0, $80 = 0, $81 = 0, $82 = 0, $83 = 0, $84 = 0, $85 = 0;
 var $86 = 0, $87 = 0, $88 = 0, $89 = 0, $9 = 0, $90 = 0, $91 = 0, $92 = 0, $93 = 0, $94 = 0, $95 = 0, $96 = 0, $97 = 0, $98 = 0, $99 = 0, $F17$0 = 0, $I20$0 = 0, $K21$0 = 0, $R$1 = 0, $R$1$lcssa = 0;
 var $R$3 = 0, $R7$1 = 0, $R7$1$lcssa = 0, $R7$3 = 0, $RP$1 = 0, $RP$1$lcssa = 0, $RP9$1 = 0, $RP9$1$lcssa = 0, $T$0 = 0, $T$0$lcssa = 0, $T$0$lcssa30 = 0, $cond = 0, $cond16 = 0, $not$ = 0, label = 0, sp = 0;
 sp = STACKTOP;
 $0 = (($p) + ($psize)|0);
 $1 = ((($p)) + 4|0);
 $2 = HEAP32[$1>>2]|0;
 $3 = $2 & 1;
 $4 = ($3|0)==(0);
 do {
  if ($4) {
   $5 = HEAP32[$p>>2]|0;
   $6 = $2 & 3;
   $7 = ($6|0)==(0);
   if ($7) {
    return;
   }
   $8 = (0 - ($5))|0;
   $9 = (($p) + ($8)|0);
   $10 = (($5) + ($psize))|0;
   $11 = HEAP32[(8136)>>2]|0;
   $12 = ($9>>>0)<($11>>>0);
   if ($12) {
    _abort();
    // unreachable;
   }
   $13 = HEAP32[(8140)>>2]|0;
   $14 = ($9|0)==($13|0);
   if ($14) {
    $99 = ((($0)) + 4|0);
    $100 = HEAP32[$99>>2]|0;
    $101 = $100 & 3;
    $102 = ($101|0)==(3);
    if (!($102)) {
     $$1 = $9;$$14 = $10;
     break;
    }
    HEAP32[(8128)>>2] = $10;
    $103 = $100 & -2;
    HEAP32[$99>>2] = $103;
    $104 = $10 | 1;
    $105 = ((($9)) + 4|0);
    HEAP32[$105>>2] = $104;
    $106 = (($9) + ($10)|0);
    HEAP32[$106>>2] = $10;
    return;
   }
   $15 = $5 >>> 3;
   $16 = ($5>>>0)<(256);
   if ($16) {
    $17 = ((($9)) + 8|0);
    $18 = HEAP32[$17>>2]|0;
    $19 = ((($9)) + 12|0);
    $20 = HEAP32[$19>>2]|0;
    $21 = $15 << 1;
    $22 = (8160 + ($21<<2)|0);
    $23 = ($18|0)==($22|0);
    if (!($23)) {
     $24 = ($18>>>0)<($11>>>0);
     if ($24) {
      _abort();
      // unreachable;
     }
     $25 = ((($18)) + 12|0);
     $26 = HEAP32[$25>>2]|0;
     $27 = ($26|0)==($9|0);
     if (!($27)) {
      _abort();
      // unreachable;
     }
    }
    $28 = ($20|0)==($18|0);
    if ($28) {
     $29 = 1 << $15;
     $30 = $29 ^ -1;
     $31 = HEAP32[2030]|0;
     $32 = $31 & $30;
     HEAP32[2030] = $32;
     $$1 = $9;$$14 = $10;
     break;
    }
    $33 = ($20|0)==($22|0);
    if ($33) {
     $$pre23 = ((($20)) + 8|0);
     $$pre$phi24Z2D = $$pre23;
    } else {
     $34 = ($20>>>0)<($11>>>0);
     if ($34) {
      _abort();
      // unreachable;
     }
     $35 = ((($20)) + 8|0);
     $36 = HEAP32[$35>>2]|0;
     $37 = ($36|0)==($9|0);
     if ($37) {
      $$pre$phi24Z2D = $35;
     } else {
      _abort();
      // unreachable;
     }
    }
    $38 = ((($18)) + 12|0);
    HEAP32[$38>>2] = $20;
    HEAP32[$$pre$phi24Z2D>>2] = $18;
    $$1 = $9;$$14 = $10;
    break;
   }
   $39 = ((($9)) + 24|0);
   $40 = HEAP32[$39>>2]|0;
   $41 = ((($9)) + 12|0);
   $42 = HEAP32[$41>>2]|0;
   $43 = ($42|0)==($9|0);
   do {
    if ($43) {
     $53 = ((($9)) + 16|0);
     $54 = ((($53)) + 4|0);
     $55 = HEAP32[$54>>2]|0;
     $56 = ($55|0)==(0|0);
     if ($56) {
      $57 = HEAP32[$53>>2]|0;
      $58 = ($57|0)==(0|0);
      if ($58) {
       $R$3 = 0;
       break;
      } else {
       $R$1 = $57;$RP$1 = $53;
      }
     } else {
      $R$1 = $55;$RP$1 = $54;
     }
     while(1) {
      $59 = ((($R$1)) + 20|0);
      $60 = HEAP32[$59>>2]|0;
      $61 = ($60|0)==(0|0);
      if (!($61)) {
       $R$1 = $60;$RP$1 = $59;
       continue;
      }
      $62 = ((($R$1)) + 16|0);
      $63 = HEAP32[$62>>2]|0;
      $64 = ($63|0)==(0|0);
      if ($64) {
       $R$1$lcssa = $R$1;$RP$1$lcssa = $RP$1;
       break;
      } else {
       $R$1 = $63;$RP$1 = $62;
      }
     }
     $65 = ($RP$1$lcssa>>>0)<($11>>>0);
     if ($65) {
      _abort();
      // unreachable;
     } else {
      HEAP32[$RP$1$lcssa>>2] = 0;
      $R$3 = $R$1$lcssa;
      break;
     }
    } else {
     $44 = ((($9)) + 8|0);
     $45 = HEAP32[$44>>2]|0;
     $46 = ($45>>>0)<($11>>>0);
     if ($46) {
      _abort();
      // unreachable;
     }
     $47 = ((($45)) + 12|0);
     $48 = HEAP32[$47>>2]|0;
     $49 = ($48|0)==($9|0);
     if (!($49)) {
      _abort();
      // unreachable;
     }
     $50 = ((($42)) + 8|0);
     $51 = HEAP32[$50>>2]|0;
     $52 = ($51|0)==($9|0);
     if ($52) {
      HEAP32[$47>>2] = $42;
      HEAP32[$50>>2] = $45;
      $R$3 = $42;
      break;
     } else {
      _abort();
      // unreachable;
     }
    }
   } while(0);
   $66 = ($40|0)==(0|0);
   if ($66) {
    $$1 = $9;$$14 = $10;
   } else {
    $67 = ((($9)) + 28|0);
    $68 = HEAP32[$67>>2]|0;
    $69 = (8424 + ($68<<2)|0);
    $70 = HEAP32[$69>>2]|0;
    $71 = ($9|0)==($70|0);
    if ($71) {
     HEAP32[$69>>2] = $R$3;
     $cond = ($R$3|0)==(0|0);
     if ($cond) {
      $72 = 1 << $68;
      $73 = $72 ^ -1;
      $74 = HEAP32[(8124)>>2]|0;
      $75 = $74 & $73;
      HEAP32[(8124)>>2] = $75;
      $$1 = $9;$$14 = $10;
      break;
     }
    } else {
     $76 = HEAP32[(8136)>>2]|0;
     $77 = ($40>>>0)<($76>>>0);
     if ($77) {
      _abort();
      // unreachable;
     }
     $78 = ((($40)) + 16|0);
     $79 = HEAP32[$78>>2]|0;
     $80 = ($79|0)==($9|0);
     if ($80) {
      HEAP32[$78>>2] = $R$3;
     } else {
      $81 = ((($40)) + 20|0);
      HEAP32[$81>>2] = $R$3;
     }
     $82 = ($R$3|0)==(0|0);
     if ($82) {
      $$1 = $9;$$14 = $10;
      break;
     }
    }
    $83 = HEAP32[(8136)>>2]|0;
    $84 = ($R$3>>>0)<($83>>>0);
    if ($84) {
     _abort();
     // unreachable;
    }
    $85 = ((($R$3)) + 24|0);
    HEAP32[$85>>2] = $40;
    $86 = ((($9)) + 16|0);
    $87 = HEAP32[$86>>2]|0;
    $88 = ($87|0)==(0|0);
    do {
     if (!($88)) {
      $89 = ($87>>>0)<($83>>>0);
      if ($89) {
       _abort();
       // unreachable;
      } else {
       $90 = ((($R$3)) + 16|0);
       HEAP32[$90>>2] = $87;
       $91 = ((($87)) + 24|0);
       HEAP32[$91>>2] = $R$3;
       break;
      }
     }
    } while(0);
    $92 = ((($86)) + 4|0);
    $93 = HEAP32[$92>>2]|0;
    $94 = ($93|0)==(0|0);
    if ($94) {
     $$1 = $9;$$14 = $10;
    } else {
     $95 = HEAP32[(8136)>>2]|0;
     $96 = ($93>>>0)<($95>>>0);
     if ($96) {
      _abort();
      // unreachable;
     } else {
      $97 = ((($R$3)) + 20|0);
      HEAP32[$97>>2] = $93;
      $98 = ((($93)) + 24|0);
      HEAP32[$98>>2] = $R$3;
      $$1 = $9;$$14 = $10;
      break;
     }
    }
   }
  } else {
   $$1 = $p;$$14 = $psize;
  }
 } while(0);
 $107 = HEAP32[(8136)>>2]|0;
 $108 = ($0>>>0)<($107>>>0);
 if ($108) {
  _abort();
  // unreachable;
 }
 $109 = ((($0)) + 4|0);
 $110 = HEAP32[$109>>2]|0;
 $111 = $110 & 2;
 $112 = ($111|0)==(0);
 if ($112) {
  $113 = HEAP32[(8144)>>2]|0;
  $114 = ($0|0)==($113|0);
  if ($114) {
   $115 = HEAP32[(8132)>>2]|0;
   $116 = (($115) + ($$14))|0;
   HEAP32[(8132)>>2] = $116;
   HEAP32[(8144)>>2] = $$1;
   $117 = $116 | 1;
   $118 = ((($$1)) + 4|0);
   HEAP32[$118>>2] = $117;
   $119 = HEAP32[(8140)>>2]|0;
   $120 = ($$1|0)==($119|0);
   if (!($120)) {
    return;
   }
   HEAP32[(8140)>>2] = 0;
   HEAP32[(8128)>>2] = 0;
   return;
  }
  $121 = HEAP32[(8140)>>2]|0;
  $122 = ($0|0)==($121|0);
  if ($122) {
   $123 = HEAP32[(8128)>>2]|0;
   $124 = (($123) + ($$14))|0;
   HEAP32[(8128)>>2] = $124;
   HEAP32[(8140)>>2] = $$1;
   $125 = $124 | 1;
   $126 = ((($$1)) + 4|0);
   HEAP32[$126>>2] = $125;
   $127 = (($$1) + ($124)|0);
   HEAP32[$127>>2] = $124;
   return;
  }
  $128 = $110 & -8;
  $129 = (($128) + ($$14))|0;
  $130 = $110 >>> 3;
  $131 = ($110>>>0)<(256);
  do {
   if ($131) {
    $132 = ((($0)) + 8|0);
    $133 = HEAP32[$132>>2]|0;
    $134 = ((($0)) + 12|0);
    $135 = HEAP32[$134>>2]|0;
    $136 = $130 << 1;
    $137 = (8160 + ($136<<2)|0);
    $138 = ($133|0)==($137|0);
    if (!($138)) {
     $139 = ($133>>>0)<($107>>>0);
     if ($139) {
      _abort();
      // unreachable;
     }
     $140 = ((($133)) + 12|0);
     $141 = HEAP32[$140>>2]|0;
     $142 = ($141|0)==($0|0);
     if (!($142)) {
      _abort();
      // unreachable;
     }
    }
    $143 = ($135|0)==($133|0);
    if ($143) {
     $144 = 1 << $130;
     $145 = $144 ^ -1;
     $146 = HEAP32[2030]|0;
     $147 = $146 & $145;
     HEAP32[2030] = $147;
     break;
    }
    $148 = ($135|0)==($137|0);
    if ($148) {
     $$pre21 = ((($135)) + 8|0);
     $$pre$phi22Z2D = $$pre21;
    } else {
     $149 = ($135>>>0)<($107>>>0);
     if ($149) {
      _abort();
      // unreachable;
     }
     $150 = ((($135)) + 8|0);
     $151 = HEAP32[$150>>2]|0;
     $152 = ($151|0)==($0|0);
     if ($152) {
      $$pre$phi22Z2D = $150;
     } else {
      _abort();
      // unreachable;
     }
    }
    $153 = ((($133)) + 12|0);
    HEAP32[$153>>2] = $135;
    HEAP32[$$pre$phi22Z2D>>2] = $133;
   } else {
    $154 = ((($0)) + 24|0);
    $155 = HEAP32[$154>>2]|0;
    $156 = ((($0)) + 12|0);
    $157 = HEAP32[$156>>2]|0;
    $158 = ($157|0)==($0|0);
    do {
     if ($158) {
      $168 = ((($0)) + 16|0);
      $169 = ((($168)) + 4|0);
      $170 = HEAP32[$169>>2]|0;
      $171 = ($170|0)==(0|0);
      if ($171) {
       $172 = HEAP32[$168>>2]|0;
       $173 = ($172|0)==(0|0);
       if ($173) {
        $R7$3 = 0;
        break;
       } else {
        $R7$1 = $172;$RP9$1 = $168;
       }
      } else {
       $R7$1 = $170;$RP9$1 = $169;
      }
      while(1) {
       $174 = ((($R7$1)) + 20|0);
       $175 = HEAP32[$174>>2]|0;
       $176 = ($175|0)==(0|0);
       if (!($176)) {
        $R7$1 = $175;$RP9$1 = $174;
        continue;
       }
       $177 = ((($R7$1)) + 16|0);
       $178 = HEAP32[$177>>2]|0;
       $179 = ($178|0)==(0|0);
       if ($179) {
        $R7$1$lcssa = $R7$1;$RP9$1$lcssa = $RP9$1;
        break;
       } else {
        $R7$1 = $178;$RP9$1 = $177;
       }
      }
      $180 = ($RP9$1$lcssa>>>0)<($107>>>0);
      if ($180) {
       _abort();
       // unreachable;
      } else {
       HEAP32[$RP9$1$lcssa>>2] = 0;
       $R7$3 = $R7$1$lcssa;
       break;
      }
     } else {
      $159 = ((($0)) + 8|0);
      $160 = HEAP32[$159>>2]|0;
      $161 = ($160>>>0)<($107>>>0);
      if ($161) {
       _abort();
       // unreachable;
      }
      $162 = ((($160)) + 12|0);
      $163 = HEAP32[$162>>2]|0;
      $164 = ($163|0)==($0|0);
      if (!($164)) {
       _abort();
       // unreachable;
      }
      $165 = ((($157)) + 8|0);
      $166 = HEAP32[$165>>2]|0;
      $167 = ($166|0)==($0|0);
      if ($167) {
       HEAP32[$162>>2] = $157;
       HEAP32[$165>>2] = $160;
       $R7$3 = $157;
       break;
      } else {
       _abort();
       // unreachable;
      }
     }
    } while(0);
    $181 = ($155|0)==(0|0);
    if (!($181)) {
     $182 = ((($0)) + 28|0);
     $183 = HEAP32[$182>>2]|0;
     $184 = (8424 + ($183<<2)|0);
     $185 = HEAP32[$184>>2]|0;
     $186 = ($0|0)==($185|0);
     if ($186) {
      HEAP32[$184>>2] = $R7$3;
      $cond16 = ($R7$3|0)==(0|0);
      if ($cond16) {
       $187 = 1 << $183;
       $188 = $187 ^ -1;
       $189 = HEAP32[(8124)>>2]|0;
       $190 = $189 & $188;
       HEAP32[(8124)>>2] = $190;
       break;
      }
     } else {
      $191 = HEAP32[(8136)>>2]|0;
      $192 = ($155>>>0)<($191>>>0);
      if ($192) {
       _abort();
       // unreachable;
      }
      $193 = ((($155)) + 16|0);
      $194 = HEAP32[$193>>2]|0;
      $195 = ($194|0)==($0|0);
      if ($195) {
       HEAP32[$193>>2] = $R7$3;
      } else {
       $196 = ((($155)) + 20|0);
       HEAP32[$196>>2] = $R7$3;
      }
      $197 = ($R7$3|0)==(0|0);
      if ($197) {
       break;
      }
     }
     $198 = HEAP32[(8136)>>2]|0;
     $199 = ($R7$3>>>0)<($198>>>0);
     if ($199) {
      _abort();
      // unreachable;
     }
     $200 = ((($R7$3)) + 24|0);
     HEAP32[$200>>2] = $155;
     $201 = ((($0)) + 16|0);
     $202 = HEAP32[$201>>2]|0;
     $203 = ($202|0)==(0|0);
     do {
      if (!($203)) {
       $204 = ($202>>>0)<($198>>>0);
       if ($204) {
        _abort();
        // unreachable;
       } else {
        $205 = ((($R7$3)) + 16|0);
        HEAP32[$205>>2] = $202;
        $206 = ((($202)) + 24|0);
        HEAP32[$206>>2] = $R7$3;
        break;
       }
      }
     } while(0);
     $207 = ((($201)) + 4|0);
     $208 = HEAP32[$207>>2]|0;
     $209 = ($208|0)==(0|0);
     if (!($209)) {
      $210 = HEAP32[(8136)>>2]|0;
      $211 = ($208>>>0)<($210>>>0);
      if ($211) {
       _abort();
       // unreachable;
      } else {
       $212 = ((($R7$3)) + 20|0);
       HEAP32[$212>>2] = $208;
       $213 = ((($208)) + 24|0);
       HEAP32[$213>>2] = $R7$3;
       break;
      }
     }
    }
   }
  } while(0);
  $214 = $129 | 1;
  $215 = ((($$1)) + 4|0);
  HEAP32[$215>>2] = $214;
  $216 = (($$1) + ($129)|0);
  HEAP32[$216>>2] = $129;
  $217 = HEAP32[(8140)>>2]|0;
  $218 = ($$1|0)==($217|0);
  if ($218) {
   HEAP32[(8128)>>2] = $129;
   return;
  } else {
   $$2 = $129;
  }
 } else {
  $219 = $110 & -2;
  HEAP32[$109>>2] = $219;
  $220 = $$14 | 1;
  $221 = ((($$1)) + 4|0);
  HEAP32[$221>>2] = $220;
  $222 = (($$1) + ($$14)|0);
  HEAP32[$222>>2] = $$14;
  $$2 = $$14;
 }
 $223 = $$2 >>> 3;
 $224 = ($$2>>>0)<(256);
 if ($224) {
  $225 = $223 << 1;
  $226 = (8160 + ($225<<2)|0);
  $227 = HEAP32[2030]|0;
  $228 = 1 << $223;
  $229 = $227 & $228;
  $230 = ($229|0)==(0);
  if ($230) {
   $231 = $227 | $228;
   HEAP32[2030] = $231;
   $$pre = ((($226)) + 8|0);
   $$pre$phiZ2D = $$pre;$F17$0 = $226;
  } else {
   $232 = ((($226)) + 8|0);
   $233 = HEAP32[$232>>2]|0;
   $234 = HEAP32[(8136)>>2]|0;
   $235 = ($233>>>0)<($234>>>0);
   if ($235) {
    _abort();
    // unreachable;
   } else {
    $$pre$phiZ2D = $232;$F17$0 = $233;
   }
  }
  HEAP32[$$pre$phiZ2D>>2] = $$1;
  $236 = ((($F17$0)) + 12|0);
  HEAP32[$236>>2] = $$1;
  $237 = ((($$1)) + 8|0);
  HEAP32[$237>>2] = $F17$0;
  $238 = ((($$1)) + 12|0);
  HEAP32[$238>>2] = $226;
  return;
 }
 $239 = $$2 >>> 8;
 $240 = ($239|0)==(0);
 if ($240) {
  $I20$0 = 0;
 } else {
  $241 = ($$2>>>0)>(16777215);
  if ($241) {
   $I20$0 = 31;
  } else {
   $242 = (($239) + 1048320)|0;
   $243 = $242 >>> 16;
   $244 = $243 & 8;
   $245 = $239 << $244;
   $246 = (($245) + 520192)|0;
   $247 = $246 >>> 16;
   $248 = $247 & 4;
   $249 = $248 | $244;
   $250 = $245 << $248;
   $251 = (($250) + 245760)|0;
   $252 = $251 >>> 16;
   $253 = $252 & 2;
   $254 = $249 | $253;
   $255 = (14 - ($254))|0;
   $256 = $250 << $253;
   $257 = $256 >>> 15;
   $258 = (($255) + ($257))|0;
   $259 = $258 << 1;
   $260 = (($258) + 7)|0;
   $261 = $$2 >>> $260;
   $262 = $261 & 1;
   $263 = $262 | $259;
   $I20$0 = $263;
  }
 }
 $264 = (8424 + ($I20$0<<2)|0);
 $265 = ((($$1)) + 28|0);
 HEAP32[$265>>2] = $I20$0;
 $266 = ((($$1)) + 16|0);
 $267 = ((($$1)) + 20|0);
 HEAP32[$267>>2] = 0;
 HEAP32[$266>>2] = 0;
 $268 = HEAP32[(8124)>>2]|0;
 $269 = 1 << $I20$0;
 $270 = $268 & $269;
 $271 = ($270|0)==(0);
 if ($271) {
  $272 = $268 | $269;
  HEAP32[(8124)>>2] = $272;
  HEAP32[$264>>2] = $$1;
  $273 = ((($$1)) + 24|0);
  HEAP32[$273>>2] = $264;
  $274 = ((($$1)) + 12|0);
  HEAP32[$274>>2] = $$1;
  $275 = ((($$1)) + 8|0);
  HEAP32[$275>>2] = $$1;
  return;
 }
 $276 = HEAP32[$264>>2]|0;
 $277 = ($I20$0|0)==(31);
 $278 = $I20$0 >>> 1;
 $279 = (25 - ($278))|0;
 $280 = $277 ? 0 : $279;
 $281 = $$2 << $280;
 $K21$0 = $281;$T$0 = $276;
 while(1) {
  $282 = ((($T$0)) + 4|0);
  $283 = HEAP32[$282>>2]|0;
  $284 = $283 & -8;
  $285 = ($284|0)==($$2|0);
  if ($285) {
   $T$0$lcssa = $T$0;
   label = 127;
   break;
  }
  $286 = $K21$0 >>> 31;
  $287 = (((($T$0)) + 16|0) + ($286<<2)|0);
  $288 = $K21$0 << 1;
  $289 = HEAP32[$287>>2]|0;
  $290 = ($289|0)==(0|0);
  if ($290) {
   $$lcssa = $287;$T$0$lcssa30 = $T$0;
   label = 124;
   break;
  } else {
   $K21$0 = $288;$T$0 = $289;
  }
 }
 if ((label|0) == 124) {
  $291 = HEAP32[(8136)>>2]|0;
  $292 = ($$lcssa>>>0)<($291>>>0);
  if ($292) {
   _abort();
   // unreachable;
  }
  HEAP32[$$lcssa>>2] = $$1;
  $293 = ((($$1)) + 24|0);
  HEAP32[$293>>2] = $T$0$lcssa30;
  $294 = ((($$1)) + 12|0);
  HEAP32[$294>>2] = $$1;
  $295 = ((($$1)) + 8|0);
  HEAP32[$295>>2] = $$1;
  return;
 }
 else if ((label|0) == 127) {
  $296 = ((($T$0$lcssa)) + 8|0);
  $297 = HEAP32[$296>>2]|0;
  $298 = HEAP32[(8136)>>2]|0;
  $299 = ($297>>>0)>=($298>>>0);
  $not$ = ($T$0$lcssa>>>0)>=($298>>>0);
  $300 = $299 & $not$;
  if (!($300)) {
   _abort();
   // unreachable;
  }
  $301 = ((($297)) + 12|0);
  HEAP32[$301>>2] = $$1;
  HEAP32[$296>>2] = $$1;
  $302 = ((($$1)) + 8|0);
  HEAP32[$302>>2] = $297;
  $303 = ((($$1)) + 12|0);
  HEAP32[$303>>2] = $T$0$lcssa;
  $304 = ((($$1)) + 24|0);
  HEAP32[$304>>2] = 0;
  return;
 }
}
function runPostSets() {
}
function _i64Subtract(a, b, c, d) {
    a = a|0; b = b|0; c = c|0; d = d|0;
    var l = 0, h = 0;
    l = (a - c)>>>0;
    h = (b - d)>>>0;
    h = (b - d - (((c>>>0) > (a>>>0))|0))>>>0; // Borrow one from high word to low word on underflow.
    return ((tempRet0 = h,l|0)|0);
}
function _i64Add(a, b, c, d) {
    /*
      x = a + b*2^32
      y = c + d*2^32
      result = l + h*2^32
    */
    a = a|0; b = b|0; c = c|0; d = d|0;
    var l = 0, h = 0;
    l = (a + c)>>>0;
    h = (b + d + (((l>>>0) < (a>>>0))|0))>>>0; // Add carry from low word to high word on overflow.
    return ((tempRet0 = h,l|0)|0);
}
function _memcpy(dest, src, num) {
    dest = dest|0; src = src|0; num = num|0;
    var ret = 0;
    if ((num|0) >= 4096) return _emscripten_memcpy_big(dest|0, src|0, num|0)|0;
    ret = dest|0;
    if ((dest&3) == (src&3)) {
      while (dest & 3) {
        if ((num|0) == 0) return ret|0;
        HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
        dest = (dest+1)|0;
        src = (src+1)|0;
        num = (num-1)|0;
      }
      while ((num|0) >= 4) {
        HEAP32[((dest)>>2)]=((HEAP32[((src)>>2)])|0);
        dest = (dest+4)|0;
        src = (src+4)|0;
        num = (num-4)|0;
      }
    }
    while ((num|0) > 0) {
      HEAP8[((dest)>>0)]=((HEAP8[((src)>>0)])|0);
      dest = (dest+1)|0;
      src = (src+1)|0;
      num = (num-1)|0;
    }
    return ret|0;
}
function _memset(ptr, value, num) {
    ptr = ptr|0; value = value|0; num = num|0;
    var stop = 0, value4 = 0, stop4 = 0, unaligned = 0;
    stop = (ptr + num)|0;
    if ((num|0) >= 20) {
      // This is unaligned, but quite large, so work hard to get to aligned settings
      value = value & 0xff;
      unaligned = ptr & 3;
      value4 = value | (value << 8) | (value << 16) | (value << 24);
      stop4 = stop & ~3;
      if (unaligned) {
        unaligned = (ptr + 4 - unaligned)|0;
        while ((ptr|0) < (unaligned|0)) { // no need to check for stop, since we have large num
          HEAP8[((ptr)>>0)]=value;
          ptr = (ptr+1)|0;
        }
      }
      while ((ptr|0) < (stop4|0)) {
        HEAP32[((ptr)>>2)]=value4;
        ptr = (ptr+4)|0;
      }
    }
    while ((ptr|0) < (stop|0)) {
      HEAP8[((ptr)>>0)]=value;
      ptr = (ptr+1)|0;
    }
    return (ptr-num)|0;
}
function _bitshift64Lshr(low, high, bits) {
    low = low|0; high = high|0; bits = bits|0;
    var ander = 0;
    if ((bits|0) < 32) {
      ander = ((1 << bits) - 1)|0;
      tempRet0 = high >>> bits;
      return (low >>> bits) | ((high&ander) << (32 - bits));
    }
    tempRet0 = 0;
    return (high >>> (bits - 32))|0;
}
function _bitshift64Shl(low, high, bits) {
    low = low|0; high = high|0; bits = bits|0;
    var ander = 0;
    if ((bits|0) < 32) {
      ander = ((1 << bits) - 1)|0;
      tempRet0 = (high << bits) | ((low&(ander << (32 - bits))) >>> (32 - bits));
      return low << bits;
    }
    tempRet0 = low << (bits - 32);
    return 0;
}
function _bitshift64Ashr(low, high, bits) {
    low = low|0; high = high|0; bits = bits|0;
    var ander = 0;
    if ((bits|0) < 32) {
      ander = ((1 << bits) - 1)|0;
      tempRet0 = high >> bits;
      return (low >>> bits) | ((high&ander) << (32 - bits));
    }
    tempRet0 = (high|0) < 0 ? -1 : 0;
    return (high >> (bits - 32))|0;
  }
function _llvm_cttz_i32(x) {
    x = x|0;
    var ret = 0;
    ret = ((HEAP8[(((cttz_i8)+(x & 0xff))>>0)])|0);
    if ((ret|0) < 8) return ret|0;
    ret = ((HEAP8[(((cttz_i8)+((x >> 8)&0xff))>>0)])|0);
    if ((ret|0) < 8) return (ret + 8)|0;
    ret = ((HEAP8[(((cttz_i8)+((x >> 16)&0xff))>>0)])|0);
    if ((ret|0) < 8) return (ret + 16)|0;
    return (((HEAP8[(((cttz_i8)+(x >>> 24))>>0)])|0) + 24)|0;
  }

// ======== compiled code from system/lib/compiler-rt , see readme therein
function ___muldsi3($a, $b) {
  $a = $a | 0;
  $b = $b | 0;
  var $1 = 0, $2 = 0, $3 = 0, $6 = 0, $8 = 0, $11 = 0, $12 = 0;
  $1 = $a & 65535;
  $2 = $b & 65535;
  $3 = Math_imul($2, $1) | 0;
  $6 = $a >>> 16;
  $8 = ($3 >>> 16) + (Math_imul($2, $6) | 0) | 0;
  $11 = $b >>> 16;
  $12 = Math_imul($11, $1) | 0;
  return (tempRet0 = (($8 >>> 16) + (Math_imul($11, $6) | 0) | 0) + ((($8 & 65535) + $12 | 0) >>> 16) | 0, 0 | ($8 + $12 << 16 | $3 & 65535)) | 0;
}
function ___divdi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $1$0 = 0, $1$1 = 0, $2$0 = 0, $2$1 = 0, $4$0 = 0, $4$1 = 0, $6$0 = 0, $7$0 = 0, $7$1 = 0, $8$0 = 0, $10$0 = 0;
  $1$0 = $a$1 >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
  $1$1 = (($a$1 | 0) < 0 ? -1 : 0) >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
  $2$0 = $b$1 >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
  $2$1 = (($b$1 | 0) < 0 ? -1 : 0) >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
  $4$0 = _i64Subtract($1$0 ^ $a$0, $1$1 ^ $a$1, $1$0, $1$1) | 0;
  $4$1 = tempRet0;
  $6$0 = _i64Subtract($2$0 ^ $b$0, $2$1 ^ $b$1, $2$0, $2$1) | 0;
  $7$0 = $2$0 ^ $1$0;
  $7$1 = $2$1 ^ $1$1;
  $8$0 = ___udivmoddi4($4$0, $4$1, $6$0, tempRet0, 0) | 0;
  $10$0 = _i64Subtract($8$0 ^ $7$0, tempRet0 ^ $7$1, $7$0, $7$1) | 0;
  return $10$0 | 0;
}
function ___remdi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $rem = 0, $1$0 = 0, $1$1 = 0, $2$0 = 0, $2$1 = 0, $4$0 = 0, $4$1 = 0, $6$0 = 0, $10$0 = 0, $10$1 = 0, __stackBase__ = 0;
  __stackBase__ = STACKTOP;
  STACKTOP = STACKTOP + 16 | 0;
  $rem = __stackBase__ | 0;
  $1$0 = $a$1 >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
  $1$1 = (($a$1 | 0) < 0 ? -1 : 0) >> 31 | (($a$1 | 0) < 0 ? -1 : 0) << 1;
  $2$0 = $b$1 >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
  $2$1 = (($b$1 | 0) < 0 ? -1 : 0) >> 31 | (($b$1 | 0) < 0 ? -1 : 0) << 1;
  $4$0 = _i64Subtract($1$0 ^ $a$0, $1$1 ^ $a$1, $1$0, $1$1) | 0;
  $4$1 = tempRet0;
  $6$0 = _i64Subtract($2$0 ^ $b$0, $2$1 ^ $b$1, $2$0, $2$1) | 0;
  ___udivmoddi4($4$0, $4$1, $6$0, tempRet0, $rem) | 0;
  $10$0 = _i64Subtract(HEAP32[$rem >> 2] ^ $1$0, HEAP32[$rem + 4 >> 2] ^ $1$1, $1$0, $1$1) | 0;
  $10$1 = tempRet0;
  STACKTOP = __stackBase__;
  return (tempRet0 = $10$1, $10$0) | 0;
}
function ___muldi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $x_sroa_0_0_extract_trunc = 0, $y_sroa_0_0_extract_trunc = 0, $1$0 = 0, $1$1 = 0, $2 = 0;
  $x_sroa_0_0_extract_trunc = $a$0;
  $y_sroa_0_0_extract_trunc = $b$0;
  $1$0 = ___muldsi3($x_sroa_0_0_extract_trunc, $y_sroa_0_0_extract_trunc) | 0;
  $1$1 = tempRet0;
  $2 = Math_imul($a$1, $y_sroa_0_0_extract_trunc) | 0;
  return (tempRet0 = ((Math_imul($b$1, $x_sroa_0_0_extract_trunc) | 0) + $2 | 0) + $1$1 | $1$1 & 0, 0 | $1$0 & -1) | 0;
}
function ___udivdi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $1$0 = 0;
  $1$0 = ___udivmoddi4($a$0, $a$1, $b$0, $b$1, 0) | 0;
  return $1$0 | 0;
}
function ___uremdi3($a$0, $a$1, $b$0, $b$1) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  var $rem = 0, __stackBase__ = 0;
  __stackBase__ = STACKTOP;
  STACKTOP = STACKTOP + 16 | 0;
  $rem = __stackBase__ | 0;
  ___udivmoddi4($a$0, $a$1, $b$0, $b$1, $rem) | 0;
  STACKTOP = __stackBase__;
  return (tempRet0 = HEAP32[$rem + 4 >> 2] | 0, HEAP32[$rem >> 2] | 0) | 0;
}
function ___udivmoddi4($a$0, $a$1, $b$0, $b$1, $rem) {
  $a$0 = $a$0 | 0;
  $a$1 = $a$1 | 0;
  $b$0 = $b$0 | 0;
  $b$1 = $b$1 | 0;
  $rem = $rem | 0;
  var $n_sroa_0_0_extract_trunc = 0, $n_sroa_1_4_extract_shift$0 = 0, $n_sroa_1_4_extract_trunc = 0, $d_sroa_0_0_extract_trunc = 0, $d_sroa_1_4_extract_shift$0 = 0, $d_sroa_1_4_extract_trunc = 0, $4 = 0, $17 = 0, $37 = 0, $49 = 0, $51 = 0, $57 = 0, $58 = 0, $66 = 0, $78 = 0, $86 = 0, $88 = 0, $89 = 0, $91 = 0, $92 = 0, $95 = 0, $105 = 0, $117 = 0, $119 = 0, $125 = 0, $126 = 0, $130 = 0, $q_sroa_1_1_ph = 0, $q_sroa_0_1_ph = 0, $r_sroa_1_1_ph = 0, $r_sroa_0_1_ph = 0, $sr_1_ph = 0, $d_sroa_0_0_insert_insert99$0 = 0, $d_sroa_0_0_insert_insert99$1 = 0, $137$0 = 0, $137$1 = 0, $carry_0203 = 0, $sr_1202 = 0, $r_sroa_0_1201 = 0, $r_sroa_1_1200 = 0, $q_sroa_0_1199 = 0, $q_sroa_1_1198 = 0, $147 = 0, $149 = 0, $r_sroa_0_0_insert_insert42$0 = 0, $r_sroa_0_0_insert_insert42$1 = 0, $150$1 = 0, $151$0 = 0, $152 = 0, $154$0 = 0, $r_sroa_0_0_extract_trunc = 0, $r_sroa_1_4_extract_trunc = 0, $155 = 0, $carry_0_lcssa$0 = 0, $carry_0_lcssa$1 = 0, $r_sroa_0_1_lcssa = 0, $r_sroa_1_1_lcssa = 0, $q_sroa_0_1_lcssa = 0, $q_sroa_1_1_lcssa = 0, $q_sroa_0_0_insert_ext75$0 = 0, $q_sroa_0_0_insert_ext75$1 = 0, $q_sroa_0_0_insert_insert77$1 = 0, $_0$0 = 0, $_0$1 = 0;
  $n_sroa_0_0_extract_trunc = $a$0;
  $n_sroa_1_4_extract_shift$0 = $a$1;
  $n_sroa_1_4_extract_trunc = $n_sroa_1_4_extract_shift$0;
  $d_sroa_0_0_extract_trunc = $b$0;
  $d_sroa_1_4_extract_shift$0 = $b$1;
  $d_sroa_1_4_extract_trunc = $d_sroa_1_4_extract_shift$0;
  if (($n_sroa_1_4_extract_trunc | 0) == 0) {
    $4 = ($rem | 0) != 0;
    if (($d_sroa_1_4_extract_trunc | 0) == 0) {
      if ($4) {
        HEAP32[$rem >> 2] = ($n_sroa_0_0_extract_trunc >>> 0) % ($d_sroa_0_0_extract_trunc >>> 0);
        HEAP32[$rem + 4 >> 2] = 0;
      }
      $_0$1 = 0;
      $_0$0 = ($n_sroa_0_0_extract_trunc >>> 0) / ($d_sroa_0_0_extract_trunc >>> 0) >>> 0;
      return (tempRet0 = $_0$1, $_0$0) | 0;
    } else {
      if (!$4) {
        $_0$1 = 0;
        $_0$0 = 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      HEAP32[$rem >> 2] = $a$0 & -1;
      HEAP32[$rem + 4 >> 2] = $a$1 & 0;
      $_0$1 = 0;
      $_0$0 = 0;
      return (tempRet0 = $_0$1, $_0$0) | 0;
    }
  }
  $17 = ($d_sroa_1_4_extract_trunc | 0) == 0;
  do {
    if (($d_sroa_0_0_extract_trunc | 0) == 0) {
      if ($17) {
        if (($rem | 0) != 0) {
          HEAP32[$rem >> 2] = ($n_sroa_1_4_extract_trunc >>> 0) % ($d_sroa_0_0_extract_trunc >>> 0);
          HEAP32[$rem + 4 >> 2] = 0;
        }
        $_0$1 = 0;
        $_0$0 = ($n_sroa_1_4_extract_trunc >>> 0) / ($d_sroa_0_0_extract_trunc >>> 0) >>> 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      if (($n_sroa_0_0_extract_trunc | 0) == 0) {
        if (($rem | 0) != 0) {
          HEAP32[$rem >> 2] = 0;
          HEAP32[$rem + 4 >> 2] = ($n_sroa_1_4_extract_trunc >>> 0) % ($d_sroa_1_4_extract_trunc >>> 0);
        }
        $_0$1 = 0;
        $_0$0 = ($n_sroa_1_4_extract_trunc >>> 0) / ($d_sroa_1_4_extract_trunc >>> 0) >>> 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      $37 = $d_sroa_1_4_extract_trunc - 1 | 0;
      if (($37 & $d_sroa_1_4_extract_trunc | 0) == 0) {
        if (($rem | 0) != 0) {
          HEAP32[$rem >> 2] = 0 | $a$0 & -1;
          HEAP32[$rem + 4 >> 2] = $37 & $n_sroa_1_4_extract_trunc | $a$1 & 0;
        }
        $_0$1 = 0;
        $_0$0 = $n_sroa_1_4_extract_trunc >>> ((_llvm_cttz_i32($d_sroa_1_4_extract_trunc | 0) | 0) >>> 0);
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      $49 = Math_clz32($d_sroa_1_4_extract_trunc | 0) | 0;
      $51 = $49 - (Math_clz32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
      if ($51 >>> 0 <= 30) {
        $57 = $51 + 1 | 0;
        $58 = 31 - $51 | 0;
        $sr_1_ph = $57;
        $r_sroa_0_1_ph = $n_sroa_1_4_extract_trunc << $58 | $n_sroa_0_0_extract_trunc >>> ($57 >>> 0);
        $r_sroa_1_1_ph = $n_sroa_1_4_extract_trunc >>> ($57 >>> 0);
        $q_sroa_0_1_ph = 0;
        $q_sroa_1_1_ph = $n_sroa_0_0_extract_trunc << $58;
        break;
      }
      if (($rem | 0) == 0) {
        $_0$1 = 0;
        $_0$0 = 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      HEAP32[$rem >> 2] = 0 | $a$0 & -1;
      HEAP32[$rem + 4 >> 2] = $n_sroa_1_4_extract_shift$0 | $a$1 & 0;
      $_0$1 = 0;
      $_0$0 = 0;
      return (tempRet0 = $_0$1, $_0$0) | 0;
    } else {
      if (!$17) {
        $117 = Math_clz32($d_sroa_1_4_extract_trunc | 0) | 0;
        $119 = $117 - (Math_clz32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
        if ($119 >>> 0 <= 31) {
          $125 = $119 + 1 | 0;
          $126 = 31 - $119 | 0;
          $130 = $119 - 31 >> 31;
          $sr_1_ph = $125;
          $r_sroa_0_1_ph = $n_sroa_0_0_extract_trunc >>> ($125 >>> 0) & $130 | $n_sroa_1_4_extract_trunc << $126;
          $r_sroa_1_1_ph = $n_sroa_1_4_extract_trunc >>> ($125 >>> 0) & $130;
          $q_sroa_0_1_ph = 0;
          $q_sroa_1_1_ph = $n_sroa_0_0_extract_trunc << $126;
          break;
        }
        if (($rem | 0) == 0) {
          $_0$1 = 0;
          $_0$0 = 0;
          return (tempRet0 = $_0$1, $_0$0) | 0;
        }
        HEAP32[$rem >> 2] = 0 | $a$0 & -1;
        HEAP32[$rem + 4 >> 2] = $n_sroa_1_4_extract_shift$0 | $a$1 & 0;
        $_0$1 = 0;
        $_0$0 = 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
      $66 = $d_sroa_0_0_extract_trunc - 1 | 0;
      if (($66 & $d_sroa_0_0_extract_trunc | 0) != 0) {
        $86 = (Math_clz32($d_sroa_0_0_extract_trunc | 0) | 0) + 33 | 0;
        $88 = $86 - (Math_clz32($n_sroa_1_4_extract_trunc | 0) | 0) | 0;
        $89 = 64 - $88 | 0;
        $91 = 32 - $88 | 0;
        $92 = $91 >> 31;
        $95 = $88 - 32 | 0;
        $105 = $95 >> 31;
        $sr_1_ph = $88;
        $r_sroa_0_1_ph = $91 - 1 >> 31 & $n_sroa_1_4_extract_trunc >>> ($95 >>> 0) | ($n_sroa_1_4_extract_trunc << $91 | $n_sroa_0_0_extract_trunc >>> ($88 >>> 0)) & $105;
        $r_sroa_1_1_ph = $105 & $n_sroa_1_4_extract_trunc >>> ($88 >>> 0);
        $q_sroa_0_1_ph = $n_sroa_0_0_extract_trunc << $89 & $92;
        $q_sroa_1_1_ph = ($n_sroa_1_4_extract_trunc << $89 | $n_sroa_0_0_extract_trunc >>> ($95 >>> 0)) & $92 | $n_sroa_0_0_extract_trunc << $91 & $88 - 33 >> 31;
        break;
      }
      if (($rem | 0) != 0) {
        HEAP32[$rem >> 2] = $66 & $n_sroa_0_0_extract_trunc;
        HEAP32[$rem + 4 >> 2] = 0;
      }
      if (($d_sroa_0_0_extract_trunc | 0) == 1) {
        $_0$1 = $n_sroa_1_4_extract_shift$0 | $a$1 & 0;
        $_0$0 = 0 | $a$0 & -1;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      } else {
        $78 = _llvm_cttz_i32($d_sroa_0_0_extract_trunc | 0) | 0;
        $_0$1 = 0 | $n_sroa_1_4_extract_trunc >>> ($78 >>> 0);
        $_0$0 = $n_sroa_1_4_extract_trunc << 32 - $78 | $n_sroa_0_0_extract_trunc >>> ($78 >>> 0) | 0;
        return (tempRet0 = $_0$1, $_0$0) | 0;
      }
    }
  } while (0);
  if (($sr_1_ph | 0) == 0) {
    $q_sroa_1_1_lcssa = $q_sroa_1_1_ph;
    $q_sroa_0_1_lcssa = $q_sroa_0_1_ph;
    $r_sroa_1_1_lcssa = $r_sroa_1_1_ph;
    $r_sroa_0_1_lcssa = $r_sroa_0_1_ph;
    $carry_0_lcssa$1 = 0;
    $carry_0_lcssa$0 = 0;
  } else {
    $d_sroa_0_0_insert_insert99$0 = 0 | $b$0 & -1;
    $d_sroa_0_0_insert_insert99$1 = $d_sroa_1_4_extract_shift$0 | $b$1 & 0;
    $137$0 = _i64Add($d_sroa_0_0_insert_insert99$0 | 0, $d_sroa_0_0_insert_insert99$1 | 0, -1, -1) | 0;
    $137$1 = tempRet0;
    $q_sroa_1_1198 = $q_sroa_1_1_ph;
    $q_sroa_0_1199 = $q_sroa_0_1_ph;
    $r_sroa_1_1200 = $r_sroa_1_1_ph;
    $r_sroa_0_1201 = $r_sroa_0_1_ph;
    $sr_1202 = $sr_1_ph;
    $carry_0203 = 0;
    while (1) {
      $147 = $q_sroa_0_1199 >>> 31 | $q_sroa_1_1198 << 1;
      $149 = $carry_0203 | $q_sroa_0_1199 << 1;
      $r_sroa_0_0_insert_insert42$0 = 0 | ($r_sroa_0_1201 << 1 | $q_sroa_1_1198 >>> 31);
      $r_sroa_0_0_insert_insert42$1 = $r_sroa_0_1201 >>> 31 | $r_sroa_1_1200 << 1 | 0;
      _i64Subtract($137$0, $137$1, $r_sroa_0_0_insert_insert42$0, $r_sroa_0_0_insert_insert42$1) | 0;
      $150$1 = tempRet0;
      $151$0 = $150$1 >> 31 | (($150$1 | 0) < 0 ? -1 : 0) << 1;
      $152 = $151$0 & 1;
      $154$0 = _i64Subtract($r_sroa_0_0_insert_insert42$0, $r_sroa_0_0_insert_insert42$1, $151$0 & $d_sroa_0_0_insert_insert99$0, ((($150$1 | 0) < 0 ? -1 : 0) >> 31 | (($150$1 | 0) < 0 ? -1 : 0) << 1) & $d_sroa_0_0_insert_insert99$1) | 0;
      $r_sroa_0_0_extract_trunc = $154$0;
      $r_sroa_1_4_extract_trunc = tempRet0;
      $155 = $sr_1202 - 1 | 0;
      if (($155 | 0) == 0) {
        break;
      } else {
        $q_sroa_1_1198 = $147;
        $q_sroa_0_1199 = $149;
        $r_sroa_1_1200 = $r_sroa_1_4_extract_trunc;
        $r_sroa_0_1201 = $r_sroa_0_0_extract_trunc;
        $sr_1202 = $155;
        $carry_0203 = $152;
      }
    }
    $q_sroa_1_1_lcssa = $147;
    $q_sroa_0_1_lcssa = $149;
    $r_sroa_1_1_lcssa = $r_sroa_1_4_extract_trunc;
    $r_sroa_0_1_lcssa = $r_sroa_0_0_extract_trunc;
    $carry_0_lcssa$1 = 0;
    $carry_0_lcssa$0 = $152;
  }
  $q_sroa_0_0_insert_ext75$0 = $q_sroa_0_1_lcssa;
  $q_sroa_0_0_insert_ext75$1 = 0;
  $q_sroa_0_0_insert_insert77$1 = $q_sroa_1_1_lcssa | $q_sroa_0_0_insert_ext75$1;
  if (($rem | 0) != 0) {
    HEAP32[$rem >> 2] = 0 | $r_sroa_0_1_lcssa;
    HEAP32[$rem + 4 >> 2] = $r_sroa_1_1_lcssa | 0;
  }
  $_0$1 = (0 | $q_sroa_0_0_insert_ext75$0) >>> 31 | $q_sroa_0_0_insert_insert77$1 << 1 | ($q_sroa_0_0_insert_ext75$1 << 1 | $q_sroa_0_0_insert_ext75$0 >>> 31) & 0 | $carry_0_lcssa$1;
  $_0$0 = ($q_sroa_0_0_insert_ext75$0 << 1 | 0 >>> 31) & -2 | $carry_0_lcssa$0;
  return (tempRet0 = $_0$1, $_0$0) | 0;
}
// =======================================================================



  
function dynCall_iiiiiiii(index,a1,a2,a3,a4,a5,a6,a7) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=a3|0; a4=a4|0; a5=a5|0; a6=a6|0; a7=a7|0;
  return FUNCTION_TABLE_iiiiiiii[index&1](a1|0,a2|0,a3|0,a4|0,a5|0,a6|0,a7|0)|0;
}


function dynCall_iiii(index,a1,a2,a3) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=a3|0;
  return FUNCTION_TABLE_iiii[index&7](a1|0,a2|0,a3|0)|0;
}


function dynCall_viiiiii(index,a1,a2,a3,a4,a5,a6) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=a3|0; a4=a4|0; a5=a5|0; a6=a6|0;
  FUNCTION_TABLE_viiiiii[index&3](a1|0,a2|0,a3|0,a4|0,a5|0,a6|0);
}


function dynCall_viiidiii(index,a1,a2,a3,a4,a5,a6,a7) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=a3|0; a4=+a4; a5=a5|0; a6=a6|0; a7=a7|0;
  FUNCTION_TABLE_viiidiii[index&1](a1|0,a2|0,a3|0,+a4,a5|0,a6|0,a7|0);
}


function dynCall_viiiii(index,a1,a2,a3,a4,a5) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=a3|0; a4=a4|0; a5=a5|0;
  FUNCTION_TABLE_viiiii[index&3](a1|0,a2|0,a3|0,a4|0,a5|0);
}


function dynCall_vi(index,a1) {
  index = index|0;
  a1=a1|0;
  FUNCTION_TABLE_vi[index&15](a1|0);
}


function dynCall_iiiiiii(index,a1,a2,a3,a4,a5,a6) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=a3|0; a4=a4|0; a5=a5|0; a6=a6|0;
  return FUNCTION_TABLE_iiiiiii[index&1](a1|0,a2|0,a3|0,a4|0,a5|0,a6|0)|0;
}


function dynCall_ii(index,a1) {
  index = index|0;
  a1=a1|0;
  return FUNCTION_TABLE_ii[index&3](a1|0)|0;
}


function dynCall_viii(index,a1,a2,a3) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=a3|0;
  FUNCTION_TABLE_viii[index&1](a1|0,a2|0,a3|0);
}


function dynCall_v(index) {
  index = index|0;
  
  FUNCTION_TABLE_v[index&0]();
}


function dynCall_iiiii(index,a1,a2,a3,a4) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=a3|0; a4=a4|0;
  return FUNCTION_TABLE_iiiii[index&1](a1|0,a2|0,a3|0,a4|0)|0;
}


function dynCall_viiii(index,a1,a2,a3,a4) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=a3|0; a4=a4|0;
  FUNCTION_TABLE_viiii[index&3](a1|0,a2|0,a3|0,a4|0);
}


function dynCall_iii(index,a1,a2) {
  index = index|0;
  a1=a1|0; a2=a2|0;
  return FUNCTION_TABLE_iii[index&1](a1|0,a2|0)|0;
}


function dynCall_viiiddii(index,a1,a2,a3,a4,a5,a6,a7) {
  index = index|0;
  a1=a1|0; a2=a2|0; a3=a3|0; a4=+a4; a5=+a5; a6=a6|0; a7=a7|0;
  FUNCTION_TABLE_viiiddii[index&1](a1|0,a2|0,a3|0,+a4,+a5,a6|0,a7|0);
}

function b0(p0,p1,p2,p3,p4,p5,p6) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0;p5 = p5|0;p6 = p6|0; abort(0);return 0;
}
function b1(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; abort(1);return 0;
}
function b2(p0,p1,p2,p3,p4,p5) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0;p5 = p5|0; abort(2);
}
function b3(p0,p1,p2,p3,p4,p5,p6) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = +p3;p4 = p4|0;p5 = p5|0;p6 = p6|0; abort(3);
}
function b4(p0,p1,p2,p3,p4) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0; abort(4);
}
function b5(p0) {
 p0 = p0|0; abort(5);
}
function b6(p0,p1,p2,p3,p4,p5) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0;p4 = p4|0;p5 = p5|0; abort(6);return 0;
}
function b7(p0) {
 p0 = p0|0; abort(7);return 0;
}
function b8(p0,p1,p2) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0; abort(8);
}
function b9() {
 ; abort(9);
}
function b10(p0,p1,p2,p3) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0; abort(10);return 0;
}
function b11(p0,p1,p2,p3) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = p3|0; abort(11);
}
function b12(p0,p1) {
 p0 = p0|0;p1 = p1|0; abort(12);return 0;
}
function b13(p0,p1,p2,p3,p4,p5,p6) {
 p0 = p0|0;p1 = p1|0;p2 = p2|0;p3 = +p3;p4 = +p4;p5 = p5|0;p6 = p6|0; abort(13);
}

// EMSCRIPTEN_END_FUNCS
var FUNCTION_TABLE_iiiiiiii = [b0,__ZL26glnvg__renderUpdateTexturePviiiiiPKh];
var FUNCTION_TABLE_iiii = [b1,__ZNK10__cxxabiv117__class_type_info9can_catchEPKNS_16__shim_type_infoERPv,___stdout_write,___stdio_seek,___stdio_write,b1,b1,b1];
var FUNCTION_TABLE_viiiiii = [b2,__ZNK10__cxxabiv117__class_type_info16search_above_dstEPNS_19__dynamic_cast_infoEPKvS4_ib,__ZNK10__cxxabiv120__si_class_type_info16search_above_dstEPNS_19__dynamic_cast_infoEPKvS4_ib,b2];
var FUNCTION_TABLE_viiidiii = [b3,__ZL17glnvg__renderFillPvP8NVGpaintP10NVGscissorfPKfPK7NVGpathi];
var FUNCTION_TABLE_viiiii = [b4,__ZNK10__cxxabiv117__class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib,__ZNK10__cxxabiv120__si_class_type_info16search_below_dstEPNS_19__dynamic_cast_infoEPKvib,__ZL22glnvg__renderTrianglesPvP8NVGpaintP10NVGscissorPK9NVGvertexi];
var FUNCTION_TABLE_vi = [b5,__ZNSt9bad_allocD2Ev,__ZNSt9bad_allocD0Ev,__ZN10__cxxabiv116__shim_type_infoD2Ev,__ZN10__cxxabiv117__class_type_infoD0Ev,__ZNK10__cxxabiv116__shim_type_info5noop1Ev,__ZNK10__cxxabiv116__shim_type_info5noop2Ev,__ZN10__cxxabiv120__si_class_type_infoD0Ev,__ZL19glnvg__renderCancelPv,__ZL18glnvg__renderFlushPv,__ZL19glnvg__renderDeletePv,_cleanup_391,b5,b5,b5,b5];
var FUNCTION_TABLE_iiiiiii = [b6,__ZL26glnvg__renderCreateTexturePviiiiPKh];
var FUNCTION_TABLE_ii = [b7,__ZNKSt9bad_alloc4whatEv,___stdio_close,__ZL19glnvg__renderCreatePv];
var FUNCTION_TABLE_viii = [b8,__ZL21glnvg__renderViewportPvii];
var FUNCTION_TABLE_v = [b9];
var FUNCTION_TABLE_iiiii = [b10,__ZL27glnvg__renderGetTextureSizePviPiS0_];
var FUNCTION_TABLE_viiii = [b11,__ZNK10__cxxabiv117__class_type_info27has_unambiguous_public_baseEPNS_19__dynamic_cast_infoEPvi,__ZNK10__cxxabiv120__si_class_type_info27has_unambiguous_public_baseEPNS_19__dynamic_cast_infoEPvi,b11];
var FUNCTION_TABLE_iii = [b12,__ZL26glnvg__renderDeleteTexturePvi];
var FUNCTION_TABLE_viiiddii = [b13,__ZL19glnvg__renderStrokePvP8NVGpaintP10NVGscissorffPK7NVGpathi];

  return { _emscripten_bind_NanoVGContext_get_drawImageMapID_0: _emscripten_bind_NanoVGContext_get_drawImageMapID_0, _emscripten_bind_NanoVGContext_setTransform_6: _emscripten_bind_NanoVGContext_setTransform_6, _emscripten_bind_NanoVGContext_get_drawTextMapID_0: _emscripten_bind_NanoVGContext_get_drawTextMapID_0, _emscripten_bind_VoidPtr___destroy___0: _emscripten_bind_VoidPtr___destroy___0, _emscripten_bind_NanoVGContext_closePath_0: _emscripten_bind_NanoVGContext_closePath_0, _emscripten_bind_NanoVGContext_set_strokeStyle_1: _emscripten_bind_NanoVGContext_set_strokeStyle_1, _emscripten_bind_NanoVGContext_get_strokeStyle_0: _emscripten_bind_NanoVGContext_get_strokeStyle_0, _emscripten_bind_NanoVGContext_set_globalAlpha_1: _emscripten_bind_NanoVGContext_set_globalAlpha_1, _bitshift64Lshr: _bitshift64Lshr, _emscripten_bind_NanoVGContext_NanoVGContext_2: _emscripten_bind_NanoVGContext_NanoVGContext_2, _memcpy: _memcpy, _emscripten_bind_NanoVGContext_strokeRect_4: _emscripten_bind_NanoVGContext_strokeRect_4, _emscripten_bind_NanoVGContext_bezierCurveTo_6: _emscripten_bind_NanoVGContext_bezierCurveTo_6, _bitshift64Shl: _bitshift64Shl, _emscripten_bind_NanoVGContext_restore_0: _emscripten_bind_NanoVGContext_restore_0, _emscripten_bind_NanoVGContext_clearRect_4: _emscripten_bind_NanoVGContext_clearRect_4, _fflush: _fflush, _emscripten_bind_NanoVGContext_fillRect_4: _emscripten_bind_NanoVGContext_fillRect_4, _emscripten_bind_NanoVGContext_rotate_1: _emscripten_bind_NanoVGContext_rotate_1, _emscripten_bind_NanoVGContext_quadraticCurveTo_4: _emscripten_bind_NanoVGContext_quadraticCurveTo_4, _emscripten_bind_NanoVGContext_set_fillStyle_1: _emscripten_bind_NanoVGContext_set_fillStyle_1, _memset: _memset, _emscripten_bind_NanoVGContext_moveTo_2: _emscripten_bind_NanoVGContext_moveTo_2, _emscripten_bind_NanoVGContext_scissor_4: _emscripten_bind_NanoVGContext_scissor_4, _emscripten_bind_NanoVGContext_get_font_0: _emscripten_bind_NanoVGContext_get_font_0, _emscripten_bind_NanoVGContext_glEndLoop_0: _emscripten_bind_NanoVGContext_glEndLoop_0, _emscripten_bind_NanoVGContext_get_text_0: _emscripten_bind_NanoVGContext_get_text_0, _emscripten_bind_NanoVGContext_save_0: _emscripten_bind_NanoVGContext_save_0, _i64Subtract: _i64Subtract, _emscripten_bind_NanoVGContext_strokeText_3: _emscripten_bind_NanoVGContext_strokeText_3, _emscripten_bind_NanoVGContext_beginPath_0: _emscripten_bind_NanoVGContext_beginPath_0, _emscripten_bind_NanoVGContext_drawImage_12: _emscripten_bind_NanoVGContext_drawImage_12, _i64Add: _i64Add, _emscripten_bind_NanoVGContext_stroke_0: _emscripten_bind_NanoVGContext_stroke_0, _emscripten_bind_NanoVGContext_set_drawTextMapID_1: _emscripten_bind_NanoVGContext_set_drawTextMapID_1, _emscripten_bind_NanoVGContext_scale_2: _emscripten_bind_NanoVGContext_scale_2, _emscripten_bind_NanoVGContext_fill_0: _emscripten_bind_NanoVGContext_fill_0, _emscripten_bind_NanoVGContext_set_drawImageMapID_1: _emscripten_bind_NanoVGContext_set_drawImageMapID_1, _emscripten_bind_NanoVGContext_fillText_3: _emscripten_bind_NanoVGContext_fillText_3, ___errno_location: ___errno_location, _emscripten_bind_NanoVGContext_createTextureFromImage_2: _emscripten_bind_NanoVGContext_createTextureFromImage_2, _emscripten_bind_NanoVGContext_set_font_1: _emscripten_bind_NanoVGContext_set_font_1, _free: _free, _emscripten_bind_NanoVGContext_translate_2: _emscripten_bind_NanoVGContext_translate_2, _emscripten_bind_NanoVGContext_glBeginLoop_0: _emscripten_bind_NanoVGContext_glBeginLoop_0, _emscripten_bind_NanoVGContext_measureText_1: _emscripten_bind_NanoVGContext_measureText_1, _emscripten_bind_NanoVGContext_set_textAlign_1: _emscripten_bind_NanoVGContext_set_textAlign_1, _emscripten_bind_NanoVGContext_set_text_1: _emscripten_bind_NanoVGContext_set_text_1, _emscripten_bind_NanoVGContext_lineTo_2: _emscripten_bind_NanoVGContext_lineTo_2, _malloc: _malloc, _emscripten_bind_NanoVGContext_get_fillStyle_0: _emscripten_bind_NanoVGContext_get_fillStyle_0, _emscripten_bind_NanoVGContext_arc_6: _emscripten_bind_NanoVGContext_arc_6, _emscripten_bind_NanoVGContext_arcTo_5: _emscripten_bind_NanoVGContext_arcTo_5, _emscripten_bind_NanoVGContext_rect_4: _emscripten_bind_NanoVGContext_rect_4, _emscripten_bind_NanoVGContext___destroy___0: _emscripten_bind_NanoVGContext___destroy___0, _emscripten_bind_NanoVGContext_get_textAlign_0: _emscripten_bind_NanoVGContext_get_textAlign_0, runPostSets: runPostSets, stackAlloc: stackAlloc, stackSave: stackSave, stackRestore: stackRestore, establishStackSpace: establishStackSpace, setThrew: setThrew, setTempRet0: setTempRet0, getTempRet0: getTempRet0, dynCall_iiiiiiii: dynCall_iiiiiiii, dynCall_iiii: dynCall_iiii, dynCall_viiiiii: dynCall_viiiiii, dynCall_viiidiii: dynCall_viiidiii, dynCall_viiiii: dynCall_viiiii, dynCall_vi: dynCall_vi, dynCall_iiiiiii: dynCall_iiiiiii, dynCall_ii: dynCall_ii, dynCall_viii: dynCall_viii, dynCall_v: dynCall_v, dynCall_iiiii: dynCall_iiiii, dynCall_viiii: dynCall_viiii, dynCall_iii: dynCall_iii, dynCall_viiiddii: dynCall_viiiddii };
})
// EMSCRIPTEN_END_ASM
(Module.asmGlobalArg, Module.asmLibraryArg, buffer);
var _emscripten_bind_NanoVGContext_get_drawImageMapID_0 = Module["_emscripten_bind_NanoVGContext_get_drawImageMapID_0"] = asm["_emscripten_bind_NanoVGContext_get_drawImageMapID_0"];
var _emscripten_bind_NanoVGContext_setTransform_6 = Module["_emscripten_bind_NanoVGContext_setTransform_6"] = asm["_emscripten_bind_NanoVGContext_setTransform_6"];
var _emscripten_bind_NanoVGContext_set_strokeStyle_1 = Module["_emscripten_bind_NanoVGContext_set_strokeStyle_1"] = asm["_emscripten_bind_NanoVGContext_set_strokeStyle_1"];
var _emscripten_bind_VoidPtr___destroy___0 = Module["_emscripten_bind_VoidPtr___destroy___0"] = asm["_emscripten_bind_VoidPtr___destroy___0"];
var _emscripten_bind_NanoVGContext_closePath_0 = Module["_emscripten_bind_NanoVGContext_closePath_0"] = asm["_emscripten_bind_NanoVGContext_closePath_0"];
var _emscripten_bind_NanoVGContext_get_strokeStyle_0 = Module["_emscripten_bind_NanoVGContext_get_strokeStyle_0"] = asm["_emscripten_bind_NanoVGContext_get_strokeStyle_0"];
var _emscripten_bind_NanoVGContext_set_globalAlpha_1 = Module["_emscripten_bind_NanoVGContext_set_globalAlpha_1"] = asm["_emscripten_bind_NanoVGContext_set_globalAlpha_1"];
var _bitshift64Lshr = Module["_bitshift64Lshr"] = asm["_bitshift64Lshr"];
var _emscripten_bind_NanoVGContext_NanoVGContext_2 = Module["_emscripten_bind_NanoVGContext_NanoVGContext_2"] = asm["_emscripten_bind_NanoVGContext_NanoVGContext_2"];
var _emscripten_bind_NanoVGContext_strokeRect_4 = Module["_emscripten_bind_NanoVGContext_strokeRect_4"] = asm["_emscripten_bind_NanoVGContext_strokeRect_4"];
var _emscripten_bind_NanoVGContext_bezierCurveTo_6 = Module["_emscripten_bind_NanoVGContext_bezierCurveTo_6"] = asm["_emscripten_bind_NanoVGContext_bezierCurveTo_6"];
var _bitshift64Shl = Module["_bitshift64Shl"] = asm["_bitshift64Shl"];
var _emscripten_bind_NanoVGContext_restore_0 = Module["_emscripten_bind_NanoVGContext_restore_0"] = asm["_emscripten_bind_NanoVGContext_restore_0"];
var _emscripten_bind_NanoVGContext_clearRect_4 = Module["_emscripten_bind_NanoVGContext_clearRect_4"] = asm["_emscripten_bind_NanoVGContext_clearRect_4"];
var _fflush = Module["_fflush"] = asm["_fflush"];
var _emscripten_bind_NanoVGContext_fillRect_4 = Module["_emscripten_bind_NanoVGContext_fillRect_4"] = asm["_emscripten_bind_NanoVGContext_fillRect_4"];
var _emscripten_bind_NanoVGContext_rotate_1 = Module["_emscripten_bind_NanoVGContext_rotate_1"] = asm["_emscripten_bind_NanoVGContext_rotate_1"];
var _emscripten_bind_NanoVGContext_quadraticCurveTo_4 = Module["_emscripten_bind_NanoVGContext_quadraticCurveTo_4"] = asm["_emscripten_bind_NanoVGContext_quadraticCurveTo_4"];
var _emscripten_bind_NanoVGContext_set_fillStyle_1 = Module["_emscripten_bind_NanoVGContext_set_fillStyle_1"] = asm["_emscripten_bind_NanoVGContext_set_fillStyle_1"];
var _memset = Module["_memset"] = asm["_memset"];
var _memcpy = Module["_memcpy"] = asm["_memcpy"];
var _emscripten_bind_NanoVGContext_scissor_4 = Module["_emscripten_bind_NanoVGContext_scissor_4"] = asm["_emscripten_bind_NanoVGContext_scissor_4"];
var _emscripten_bind_NanoVGContext_get_font_0 = Module["_emscripten_bind_NanoVGContext_get_font_0"] = asm["_emscripten_bind_NanoVGContext_get_font_0"];
var _emscripten_bind_NanoVGContext_glEndLoop_0 = Module["_emscripten_bind_NanoVGContext_glEndLoop_0"] = asm["_emscripten_bind_NanoVGContext_glEndLoop_0"];
var _emscripten_bind_NanoVGContext_get_text_0 = Module["_emscripten_bind_NanoVGContext_get_text_0"] = asm["_emscripten_bind_NanoVGContext_get_text_0"];
var _emscripten_bind_NanoVGContext_save_0 = Module["_emscripten_bind_NanoVGContext_save_0"] = asm["_emscripten_bind_NanoVGContext_save_0"];
var _i64Subtract = Module["_i64Subtract"] = asm["_i64Subtract"];
var _emscripten_bind_NanoVGContext_strokeText_3 = Module["_emscripten_bind_NanoVGContext_strokeText_3"] = asm["_emscripten_bind_NanoVGContext_strokeText_3"];
var _emscripten_bind_NanoVGContext_beginPath_0 = Module["_emscripten_bind_NanoVGContext_beginPath_0"] = asm["_emscripten_bind_NanoVGContext_beginPath_0"];
var _emscripten_bind_NanoVGContext_drawImage_12 = Module["_emscripten_bind_NanoVGContext_drawImage_12"] = asm["_emscripten_bind_NanoVGContext_drawImage_12"];
var _i64Add = Module["_i64Add"] = asm["_i64Add"];
var _emscripten_bind_NanoVGContext_rect_4 = Module["_emscripten_bind_NanoVGContext_rect_4"] = asm["_emscripten_bind_NanoVGContext_rect_4"];
var _emscripten_bind_NanoVGContext_set_drawTextMapID_1 = Module["_emscripten_bind_NanoVGContext_set_drawTextMapID_1"] = asm["_emscripten_bind_NanoVGContext_set_drawTextMapID_1"];
var _emscripten_bind_NanoVGContext_scale_2 = Module["_emscripten_bind_NanoVGContext_scale_2"] = asm["_emscripten_bind_NanoVGContext_scale_2"];
var runPostSets = Module["runPostSets"] = asm["runPostSets"];
var _emscripten_bind_NanoVGContext_fill_0 = Module["_emscripten_bind_NanoVGContext_fill_0"] = asm["_emscripten_bind_NanoVGContext_fill_0"];
var _emscripten_bind_NanoVGContext_set_drawImageMapID_1 = Module["_emscripten_bind_NanoVGContext_set_drawImageMapID_1"] = asm["_emscripten_bind_NanoVGContext_set_drawImageMapID_1"];
var _emscripten_bind_NanoVGContext_get_drawTextMapID_0 = Module["_emscripten_bind_NanoVGContext_get_drawTextMapID_0"] = asm["_emscripten_bind_NanoVGContext_get_drawTextMapID_0"];
var _emscripten_bind_NanoVGContext_fillText_3 = Module["_emscripten_bind_NanoVGContext_fillText_3"] = asm["_emscripten_bind_NanoVGContext_fillText_3"];
var ___errno_location = Module["___errno_location"] = asm["___errno_location"];
var _emscripten_bind_NanoVGContext_createTextureFromImage_2 = Module["_emscripten_bind_NanoVGContext_createTextureFromImage_2"] = asm["_emscripten_bind_NanoVGContext_createTextureFromImage_2"];
var _emscripten_bind_NanoVGContext_set_font_1 = Module["_emscripten_bind_NanoVGContext_set_font_1"] = asm["_emscripten_bind_NanoVGContext_set_font_1"];
var _free = Module["_free"] = asm["_free"];
var _emscripten_bind_NanoVGContext_glBeginLoop_0 = Module["_emscripten_bind_NanoVGContext_glBeginLoop_0"] = asm["_emscripten_bind_NanoVGContext_glBeginLoop_0"];
var _emscripten_bind_NanoVGContext_translate_2 = Module["_emscripten_bind_NanoVGContext_translate_2"] = asm["_emscripten_bind_NanoVGContext_translate_2"];
var _emscripten_bind_NanoVGContext_measureText_1 = Module["_emscripten_bind_NanoVGContext_measureText_1"] = asm["_emscripten_bind_NanoVGContext_measureText_1"];
var _emscripten_bind_NanoVGContext_set_textAlign_1 = Module["_emscripten_bind_NanoVGContext_set_textAlign_1"] = asm["_emscripten_bind_NanoVGContext_set_textAlign_1"];
var _emscripten_bind_NanoVGContext_set_text_1 = Module["_emscripten_bind_NanoVGContext_set_text_1"] = asm["_emscripten_bind_NanoVGContext_set_text_1"];
var _emscripten_bind_NanoVGContext_lineTo_2 = Module["_emscripten_bind_NanoVGContext_lineTo_2"] = asm["_emscripten_bind_NanoVGContext_lineTo_2"];
var _malloc = Module["_malloc"] = asm["_malloc"];
var _emscripten_bind_NanoVGContext_get_fillStyle_0 = Module["_emscripten_bind_NanoVGContext_get_fillStyle_0"] = asm["_emscripten_bind_NanoVGContext_get_fillStyle_0"];
var _emscripten_bind_NanoVGContext___destroy___0 = Module["_emscripten_bind_NanoVGContext___destroy___0"] = asm["_emscripten_bind_NanoVGContext___destroy___0"];
var _emscripten_bind_NanoVGContext_arcTo_5 = Module["_emscripten_bind_NanoVGContext_arcTo_5"] = asm["_emscripten_bind_NanoVGContext_arcTo_5"];
var _emscripten_bind_NanoVGContext_stroke_0 = Module["_emscripten_bind_NanoVGContext_stroke_0"] = asm["_emscripten_bind_NanoVGContext_stroke_0"];
var _emscripten_bind_NanoVGContext_moveTo_2 = Module["_emscripten_bind_NanoVGContext_moveTo_2"] = asm["_emscripten_bind_NanoVGContext_moveTo_2"];
var _emscripten_bind_NanoVGContext_arc_6 = Module["_emscripten_bind_NanoVGContext_arc_6"] = asm["_emscripten_bind_NanoVGContext_arc_6"];
var _emscripten_bind_NanoVGContext_get_textAlign_0 = Module["_emscripten_bind_NanoVGContext_get_textAlign_0"] = asm["_emscripten_bind_NanoVGContext_get_textAlign_0"];
var dynCall_iiiiiiii = Module["dynCall_iiiiiiii"] = asm["dynCall_iiiiiiii"];
var dynCall_iiii = Module["dynCall_iiii"] = asm["dynCall_iiii"];
var dynCall_viiiiii = Module["dynCall_viiiiii"] = asm["dynCall_viiiiii"];
var dynCall_viiidiii = Module["dynCall_viiidiii"] = asm["dynCall_viiidiii"];
var dynCall_viiiii = Module["dynCall_viiiii"] = asm["dynCall_viiiii"];
var dynCall_vi = Module["dynCall_vi"] = asm["dynCall_vi"];
var dynCall_iiiiiii = Module["dynCall_iiiiiii"] = asm["dynCall_iiiiiii"];
var dynCall_ii = Module["dynCall_ii"] = asm["dynCall_ii"];
var dynCall_viii = Module["dynCall_viii"] = asm["dynCall_viii"];
var dynCall_v = Module["dynCall_v"] = asm["dynCall_v"];
var dynCall_iiiii = Module["dynCall_iiiii"] = asm["dynCall_iiiii"];
var dynCall_viiii = Module["dynCall_viiii"] = asm["dynCall_viiii"];
var dynCall_iii = Module["dynCall_iii"] = asm["dynCall_iii"];
var dynCall_viiiddii = Module["dynCall_viiiddii"] = asm["dynCall_viiiddii"];
;

Runtime.stackAlloc = asm['stackAlloc'];
Runtime.stackSave = asm['stackSave'];
Runtime.stackRestore = asm['stackRestore'];
Runtime.establishStackSpace = asm['establishStackSpace'];

Runtime.setTempRet0 = asm['setTempRet0'];
Runtime.getTempRet0 = asm['getTempRet0'];



// === Auto-generated postamble setup entry stuff ===


function ExitStatus(status) {
  this.name = "ExitStatus";
  this.message = "Program terminated with exit(" + status + ")";
  this.status = status;
};
ExitStatus.prototype = new Error();
ExitStatus.prototype.constructor = ExitStatus;

var initialStackTop;
var preloadStartTime = null;
var calledMain = false;

dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!Module['calledRun']) run();
  if (!Module['calledRun']) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
}

Module['callMain'] = Module.callMain = function callMain(args) {
  assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on __ATMAIN__)');
  assert(__ATPRERUN__.length == 0, 'cannot call main when preRun functions remain to be called');

  args = args || [];

  ensureInitRuntime();

  var argc = args.length+1;
  function pad() {
    for (var i = 0; i < 4-1; i++) {
      argv.push(0);
    }
  }
  var argv = [allocate(intArrayFromString(Module['thisProgram']), 'i8', ALLOC_NORMAL) ];
  pad();
  for (var i = 0; i < argc-1; i = i + 1) {
    argv.push(allocate(intArrayFromString(args[i]), 'i8', ALLOC_NORMAL));
    pad();
  }
  argv.push(0);
  argv = allocate(argv, 'i32', ALLOC_NORMAL);


  try {

    var ret = Module['_main'](argc, argv, 0);


    // if we're not running an evented main loop, it's time to exit
    exit(ret, /* implicit = */ true);
  }
  catch(e) {
    if (e instanceof ExitStatus) {
      // exit() throws this once it's done to make sure execution
      // has been stopped completely
      return;
    } else if (e == 'SimulateInfiniteLoop') {
      // running an evented main loop, don't immediately exit
      Module['noExitRuntime'] = true;
      return;
    } else {
      if (e && typeof e === 'object' && e.stack) Module.printErr('exception thrown: ' + [e, e.stack]);
      throw e;
    }
  } finally {
    calledMain = true;
  }
}




function run(args) {
  args = args || Module['arguments'];

  if (preloadStartTime === null) preloadStartTime = Date.now();

  if (runDependencies > 0) {
    return;
  }

  preRun();

  if (runDependencies > 0) return; // a preRun added a dependency, run will be called later
  if (Module['calledRun']) return; // run may have just been called through dependencies being fulfilled just in this very frame

  function doRun() {
    if (Module['calledRun']) return; // run may have just been called while the async setStatus time below was happening
    Module['calledRun'] = true;

    if (ABORT) return; 

    ensureInitRuntime();

    preMain();


    if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']();

    if (Module['_main'] && shouldRunNow) Module['callMain'](args);

    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      doRun();
    }, 1);
  } else {
    doRun();
  }
}
Module['run'] = Module.run = run;

function exit(status, implicit) {
  if (implicit && Module['noExitRuntime']) {
    return;
  }

  if (Module['noExitRuntime']) {
  } else {

    ABORT = true;
    EXITSTATUS = status;
    STACKTOP = initialStackTop;

    exitRuntime();

    if (Module['onExit']) Module['onExit'](status);
  }

  if (ENVIRONMENT_IS_NODE) {
    // Work around a node.js bug where stdout buffer is not flushed at process exit:
    // Instead of process.exit() directly, wait for stdout flush event.
    // See https://github.com/joyent/node/issues/1669 and https://github.com/kripken/emscripten/issues/2582
    // Workaround is based on https://github.com/RReverser/acorn/commit/50ab143cecc9ed71a2d66f78b4aec3bb2e9844f6
    process['stdout']['once']('drain', function () {
      process['exit'](status);
    });
    console.log(' '); // Make sure to print something to force the drain event to occur, in case the stdout buffer was empty.
    // Work around another node bug where sometimes 'drain' is never fired - make another effort
    // to emit the exit status, after a significant delay (if node hasn't fired drain by then, give up)
    setTimeout(function() {
      process['exit'](status);
    }, 500);
  } else
  if (ENVIRONMENT_IS_SHELL && typeof quit === 'function') {
    quit(status);
  }
  // if we reach here, we must throw an exception to halt the current execution
  throw new ExitStatus(status);
}
Module['exit'] = Module.exit = exit;

var abortDecorators = [];

function abort(what) {
  if (what !== undefined) {
    Module.print(what);
    Module.printErr(what);
    what = JSON.stringify(what)
  } else {
    what = '';
  }

  ABORT = true;
  EXITSTATUS = 1;

  var extra = '\nIf this abort() is unexpected, build with -s ASSERTIONS=1 which can give more information.';

  var output = 'abort(' + what + ') at ' + stackTrace() + extra;
  if (abortDecorators) {
    abortDecorators.forEach(function(decorator) {
      output = decorator(output, what);
    });
  }
  throw output;
}
Module['abort'] = Module.abort = abort;

// {{PRE_RUN_ADDITIONS}}

if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}

// shouldRunNow refers to calling main(), not run().
var shouldRunNow = true;
if (Module['noInitialRun']) {
  shouldRunNow = false;
}


run();

// {{POST_RUN_ADDITIONS}}






// {{MODULE_ADDITIONS}}




// Bindings utilities

function WrapperObject() {
}
WrapperObject.prototype = Object.create(WrapperObject.prototype);
WrapperObject.prototype.constructor = WrapperObject;
WrapperObject.prototype.__class__ = WrapperObject;
WrapperObject.__cache__ = {};
Module['WrapperObject'] = WrapperObject;

function getCache(__class__) {
  return (__class__ || WrapperObject).__cache__;
}
Module['getCache'] = getCache;

function wrapPointer(ptr, __class__) {
  var cache = getCache(__class__);
  var ret = cache[ptr];
  if (ret) return ret;
  ret = Object.create((__class__ || WrapperObject).prototype);
  ret.ptr = ptr;
  return cache[ptr] = ret;
}
Module['wrapPointer'] = wrapPointer;

function castObject(obj, __class__) {
  return wrapPointer(obj.ptr, __class__);
}
Module['castObject'] = castObject;

Module['NULL'] = wrapPointer(0);

function destroy(obj) {
  if (!obj['__destroy__']) throw 'Error: Cannot destroy object. (Did you create it yourself?)';
  obj['__destroy__']();
  // Remove from cache, so the object can be GC'd and refs added onto it released
  delete getCache(obj.__class__)[obj.ptr];
}
Module['destroy'] = destroy;

function compare(obj1, obj2) {
  return obj1.ptr === obj2.ptr;
}
Module['compare'] = compare;

function getPointer(obj) {
  return obj.ptr;
}
Module['getPointer'] = getPointer;

function getClass(obj) {
  return obj.__class__;
}
Module['getClass'] = getClass;

// Converts a value into a C-style string, storing it in temporary space

var ensureStringCache = {
  buffer: 0,  // the main buffer of temporary storage
  size: 0,   // the size of buffer
  pos: 0,    // the next free offset in buffer
  temps: [], // extra allocations
  needed: 0, // the total size we need next time

  prepare: function() {
    if (this.needed) {
      // clear the temps
      for (var i = 0; i < this.temps.length; i++) {
        Module['_free'](this.temps[i]);
      }
      this.temps.length = 0;
      // prepare to allocate a bigger buffer
      Module['_free'](this.buffer);
      this.buffer = 0;
      this.size += this.needed;
      // clean up
      this.needed = 0;
    }
    if (!this.buffer) { // happens first time, or when we need to grow
      this.size += 100; // heuristic, avoid many small grow events
      this.buffer = Module['_malloc'](this.size);
      assert(this.buffer);
    }
    this.pos = 0;
  },
  alloc: function(value) {
    assert(this.buffer);
    var array = intArrayFromString(value);
    var len = array.length;
    var ret;
    if (this.pos + len >= this.size) {
      // we failed to allocate in the buffer, this time around :(
      assert(len > 0); // null terminator, at least
      this.needed += len;
      ret = Module['_malloc'](len);
      this.temps.push(ret);
    } else {
      // we can allocate in the buffer
      ret = this.buffer + this.pos;
      this.pos += len;
    }
    writeArrayToMemory(array, ret);
    return ret;
  },
};

function ensureString(value) {
  if (typeof value === 'string') return ensureStringCache.alloc(value);
  return value;
}


// NanoVGContext
function NanoVGContext(arg0, arg1) {
  if (arg0 && typeof arg0 === 'object') arg0 = arg0.ptr;
  if (arg1 && typeof arg1 === 'object') arg1 = arg1.ptr;
  this.ptr = _emscripten_bind_NanoVGContext_NanoVGContext_2(arg0, arg1);
  getCache(NanoVGContext)[this.ptr] = this;
};;
NanoVGContext.prototype = Object.create(WrapperObject.prototype);
NanoVGContext.prototype.constructor = NanoVGContext;
NanoVGContext.prototype.__class__ = NanoVGContext;
NanoVGContext.__cache__ = {};
Module['NanoVGContext'] = NanoVGContext;

NanoVGContext.prototype['createTextureFromImage'] = NanoVGContext.prototype.createTextureFromImage = function(arg0, arg1) {
  var self = this.ptr;
  if (arg0 && typeof arg0 === 'object') arg0 = arg0.ptr;
  if (arg1 && typeof arg1 === 'object') arg1 = arg1.ptr;
  _emscripten_bind_NanoVGContext_createTextureFromImage_2(self, arg0, arg1);
};;

NanoVGContext.prototype['glBeginLoop'] = NanoVGContext.prototype.glBeginLoop = function() {
  var self = this.ptr;
  _emscripten_bind_NanoVGContext_glBeginLoop_0(self);
};;

NanoVGContext.prototype['glEndLoop'] = NanoVGContext.prototype.glEndLoop = function() {
  var self = this.ptr;
  _emscripten_bind_NanoVGContext_glEndLoop_0(self);
};;

NanoVGContext.prototype['save'] = NanoVGContext.prototype.save = function() {
  var self = this.ptr;
  _emscripten_bind_NanoVGContext_save_0(self);
};;

NanoVGContext.prototype['restore'] = NanoVGContext.prototype.restore = function() {
  var self = this.ptr;
  _emscripten_bind_NanoVGContext_restore_0(self);
};;

NanoVGContext.prototype['translate'] = NanoVGContext.prototype.translate = function(arg0, arg1) {
  var self = this.ptr;
  if (arg0 && typeof arg0 === 'object') arg0 = arg0.ptr;
  if (arg1 && typeof arg1 === 'object') arg1 = arg1.ptr;
  _emscripten_bind_NanoVGContext_translate_2(self, arg0, arg1);
};;

NanoVGContext.prototype['rect'] = NanoVGContext.prototype.rect = function(arg0, arg1, arg2, arg3) {
  var self = this.ptr;
  if (arg0 && typeof arg0 === 'object') arg0 = arg0.ptr;
  if (arg1 && typeof arg1 === 'object') arg1 = arg1.ptr;
  if (arg2 && typeof arg2 === 'object') arg2 = arg2.ptr;
  if (arg3 && typeof arg3 === 'object') arg3 = arg3.ptr;
  _emscripten_bind_NanoVGContext_rect_4(self, arg0, arg1, arg2, arg3);
};;

NanoVGContext.prototype['rotate'] = NanoVGContext.prototype.rotate = function(arg0) {
  var self = this.ptr;
  if (arg0 && typeof arg0 === 'object') arg0 = arg0.ptr;
  _emscripten_bind_NanoVGContext_rotate_1(self, arg0);
};;

NanoVGContext.prototype['scale'] = NanoVGContext.prototype.scale = function(arg0, arg1) {
  var self = this.ptr;
  if (arg0 && typeof arg0 === 'object') arg0 = arg0.ptr;
  if (arg1 && typeof arg1 === 'object') arg1 = arg1.ptr;
  _emscripten_bind_NanoVGContext_scale_2(self, arg0, arg1);
};;

NanoVGContext.prototype['scissor'] = NanoVGContext.prototype.scissor = function(arg0, arg1, arg2, arg3) {
  var self = this.ptr;
  if (arg0 && typeof arg0 === 'object') arg0 = arg0.ptr;
  if (arg1 && typeof arg1 === 'object') arg1 = arg1.ptr;
  if (arg2 && typeof arg2 === 'object') arg2 = arg2.ptr;
  if (arg3 && typeof arg3 === 'object') arg3 = arg3.ptr;
  _emscripten_bind_NanoVGContext_scissor_4(self, arg0, arg1, arg2, arg3);
};;

NanoVGContext.prototype['drawImage'] = NanoVGContext.prototype.drawImage = function(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11) {
  var self = this.ptr;
  if (arg0 && typeof arg0 === 'object') arg0 = arg0.ptr;
  if (arg1 && typeof arg1 === 'object') arg1 = arg1.ptr;
  if (arg2 && typeof arg2 === 'object') arg2 = arg2.ptr;
  if (arg3 && typeof arg3 === 'object') arg3 = arg3.ptr;
  if (arg4 && typeof arg4 === 'object') arg4 = arg4.ptr;
  if (arg5 && typeof arg5 === 'object') arg5 = arg5.ptr;
  if (arg6 && typeof arg6 === 'object') arg6 = arg6.ptr;
  if (arg7 && typeof arg7 === 'object') arg7 = arg7.ptr;
  if (arg8 && typeof arg8 === 'object') arg8 = arg8.ptr;
  if (arg9 && typeof arg9 === 'object') arg9 = arg9.ptr;
  if (arg10 && typeof arg10 === 'object') arg10 = arg10.ptr;
  if (arg11 && typeof arg11 === 'object') arg11 = arg11.ptr;
  _emscripten_bind_NanoVGContext_drawImage_12(self, arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11);
};;

NanoVGContext.prototype['beginPath'] = NanoVGContext.prototype.beginPath = function() {
  var self = this.ptr;
  _emscripten_bind_NanoVGContext_beginPath_0(self);
};;

NanoVGContext.prototype['closePath'] = NanoVGContext.prototype.closePath = function() {
  var self = this.ptr;
  _emscripten_bind_NanoVGContext_closePath_0(self);
};;

NanoVGContext.prototype['stroke'] = NanoVGContext.prototype.stroke = function() {
  var self = this.ptr;
  _emscripten_bind_NanoVGContext_stroke_0(self);
};;

NanoVGContext.prototype['moveTo'] = NanoVGContext.prototype.moveTo = function(arg0, arg1) {
  var self = this.ptr;
  if (arg0 && typeof arg0 === 'object') arg0 = arg0.ptr;
  if (arg1 && typeof arg1 === 'object') arg1 = arg1.ptr;
  _emscripten_bind_NanoVGContext_moveTo_2(self, arg0, arg1);
};;

NanoVGContext.prototype['lineTo'] = NanoVGContext.prototype.lineTo = function(arg0, arg1) {
  var self = this.ptr;
  if (arg0 && typeof arg0 === 'object') arg0 = arg0.ptr;
  if (arg1 && typeof arg1 === 'object') arg1 = arg1.ptr;
  _emscripten_bind_NanoVGContext_lineTo_2(self, arg0, arg1);
};;

NanoVGContext.prototype['fillRect'] = NanoVGContext.prototype.fillRect = function(arg0, arg1, arg2, arg3) {
  var self = this.ptr;
  if (arg0 && typeof arg0 === 'object') arg0 = arg0.ptr;
  if (arg1 && typeof arg1 === 'object') arg1 = arg1.ptr;
  if (arg2 && typeof arg2 === 'object') arg2 = arg2.ptr;
  if (arg3 && typeof arg3 === 'object') arg3 = arg3.ptr;
  _emscripten_bind_NanoVGContext_fillRect_4(self, arg0, arg1, arg2, arg3);
};;

NanoVGContext.prototype['strokeRect'] = NanoVGContext.prototype.strokeRect = function(arg0, arg1, arg2, arg3) {
  var self = this.ptr;
  if (arg0 && typeof arg0 === 'object') arg0 = arg0.ptr;
  if (arg1 && typeof arg1 === 'object') arg1 = arg1.ptr;
  if (arg2 && typeof arg2 === 'object') arg2 = arg2.ptr;
  if (arg3 && typeof arg3 === 'object') arg3 = arg3.ptr;
  _emscripten_bind_NanoVGContext_strokeRect_4(self, arg0, arg1, arg2, arg3);
};;

NanoVGContext.prototype['clearRect'] = NanoVGContext.prototype.clearRect = function(arg0, arg1, arg2, arg3) {
  var self = this.ptr;
  if (arg0 && typeof arg0 === 'object') arg0 = arg0.ptr;
  if (arg1 && typeof arg1 === 'object') arg1 = arg1.ptr;
  if (arg2 && typeof arg2 === 'object') arg2 = arg2.ptr;
  if (arg3 && typeof arg3 === 'object') arg3 = arg3.ptr;
  _emscripten_bind_NanoVGContext_clearRect_4(self, arg0, arg1, arg2, arg3);
};;

NanoVGContext.prototype['fill'] = NanoVGContext.prototype.fill = function() {
  var self = this.ptr;
  _emscripten_bind_NanoVGContext_fill_0(self);
};;

NanoVGContext.prototype['fillText'] = NanoVGContext.prototype.fillText = function(arg0, arg1, arg2) {
  var self = this.ptr;
  ensureStringCache.prepare();
  if (arg0 && typeof arg0 === 'object') arg0 = arg0.ptr;
  else arg0 = ensureString(arg0);
  if (arg1 && typeof arg1 === 'object') arg1 = arg1.ptr;
  if (arg2 && typeof arg2 === 'object') arg2 = arg2.ptr;
  _emscripten_bind_NanoVGContext_fillText_3(self, arg0, arg1, arg2);
};;

NanoVGContext.prototype['strokeText'] = NanoVGContext.prototype.strokeText = function(arg0, arg1, arg2) {
  var self = this.ptr;
  ensureStringCache.prepare();
  if (arg0 && typeof arg0 === 'object') arg0 = arg0.ptr;
  else arg0 = ensureString(arg0);
  if (arg1 && typeof arg1 === 'object') arg1 = arg1.ptr;
  if (arg2 && typeof arg2 === 'object') arg2 = arg2.ptr;
  _emscripten_bind_NanoVGContext_strokeText_3(self, arg0, arg1, arg2);
};;

NanoVGContext.prototype['arc'] = NanoVGContext.prototype.arc = function(arg0, arg1, arg2, arg3, arg4, arg5) {
  var self = this.ptr;
  if (arg0 && typeof arg0 === 'object') arg0 = arg0.ptr;
  if (arg1 && typeof arg1 === 'object') arg1 = arg1.ptr;
  if (arg2 && typeof arg2 === 'object') arg2 = arg2.ptr;
  if (arg3 && typeof arg3 === 'object') arg3 = arg3.ptr;
  if (arg4 && typeof arg4 === 'object') arg4 = arg4.ptr;
  if (arg5 && typeof arg5 === 'object') arg5 = arg5.ptr;
  _emscripten_bind_NanoVGContext_arc_6(self, arg0, arg1, arg2, arg3, arg4, arg5);
};;

NanoVGContext.prototype['arcTo'] = NanoVGContext.prototype.arcTo = function(arg0, arg1, arg2, arg3, arg4) {
  var self = this.ptr;
  if (arg0 && typeof arg0 === 'object') arg0 = arg0.ptr;
  if (arg1 && typeof arg1 === 'object') arg1 = arg1.ptr;
  if (arg2 && typeof arg2 === 'object') arg2 = arg2.ptr;
  if (arg3 && typeof arg3 === 'object') arg3 = arg3.ptr;
  if (arg4 && typeof arg4 === 'object') arg4 = arg4.ptr;
  _emscripten_bind_NanoVGContext_arcTo_5(self, arg0, arg1, arg2, arg3, arg4);
};;

NanoVGContext.prototype['bezierCurveTo'] = NanoVGContext.prototype.bezierCurveTo = function(arg0, arg1, arg2, arg3, arg4, arg5) {
  var self = this.ptr;
  if (arg0 && typeof arg0 === 'object') arg0 = arg0.ptr;
  if (arg1 && typeof arg1 === 'object') arg1 = arg1.ptr;
  if (arg2 && typeof arg2 === 'object') arg2 = arg2.ptr;
  if (arg3 && typeof arg3 === 'object') arg3 = arg3.ptr;
  if (arg4 && typeof arg4 === 'object') arg4 = arg4.ptr;
  if (arg5 && typeof arg5 === 'object') arg5 = arg5.ptr;
  _emscripten_bind_NanoVGContext_bezierCurveTo_6(self, arg0, arg1, arg2, arg3, arg4, arg5);
};;

NanoVGContext.prototype['quadraticCurveTo'] = NanoVGContext.prototype.quadraticCurveTo = function(arg0, arg1, arg2, arg3) {
  var self = this.ptr;
  if (arg0 && typeof arg0 === 'object') arg0 = arg0.ptr;
  if (arg1 && typeof arg1 === 'object') arg1 = arg1.ptr;
  if (arg2 && typeof arg2 === 'object') arg2 = arg2.ptr;
  if (arg3 && typeof arg3 === 'object') arg3 = arg3.ptr;
  _emscripten_bind_NanoVGContext_quadraticCurveTo_4(self, arg0, arg1, arg2, arg3);
};;

NanoVGContext.prototype['set_globalAlpha'] = NanoVGContext.prototype.set_globalAlpha = function(arg0) {
  var self = this.ptr;
  if (arg0 && typeof arg0 === 'object') arg0 = arg0.ptr;
  _emscripten_bind_NanoVGContext_set_globalAlpha_1(self, arg0);
};;

NanoVGContext.prototype['setTransform'] = NanoVGContext.prototype.setTransform = function(arg0, arg1, arg2, arg3, arg4, arg5) {
  var self = this.ptr;
  if (arg0 && typeof arg0 === 'object') arg0 = arg0.ptr;
  if (arg1 && typeof arg1 === 'object') arg1 = arg1.ptr;
  if (arg2 && typeof arg2 === 'object') arg2 = arg2.ptr;
  if (arg3 && typeof arg3 === 'object') arg3 = arg3.ptr;
  if (arg4 && typeof arg4 === 'object') arg4 = arg4.ptr;
  if (arg5 && typeof arg5 === 'object') arg5 = arg5.ptr;
  _emscripten_bind_NanoVGContext_setTransform_6(self, arg0, arg1, arg2, arg3, arg4, arg5);
};;

NanoVGContext.prototype['measureText'] = NanoVGContext.prototype.measureText = function(arg0) {
  var self = this.ptr;
  ensureStringCache.prepare();
  if (arg0 && typeof arg0 === 'object') arg0 = arg0.ptr;
  else arg0 = ensureString(arg0);
  return _emscripten_bind_NanoVGContext_measureText_1(self, arg0);
};;

  NanoVGContext.prototype['get_fillStyle'] = NanoVGContext.prototype.get_fillStyle = function() {
  var self = this.ptr;
  return Pointer_stringify(_emscripten_bind_NanoVGContext_get_fillStyle_0(self));
};
    NanoVGContext.prototype['set_fillStyle'] = NanoVGContext.prototype.set_fillStyle = function(arg0) {
  var self = this.ptr;
  ensureStringCache.prepare();
  if (arg0 && typeof arg0 === 'object') arg0 = arg0.ptr;
  else arg0 = ensureString(arg0);
  _emscripten_bind_NanoVGContext_set_fillStyle_1(self, arg0);
};
  NanoVGContext.prototype['get_strokeStyle'] = NanoVGContext.prototype.get_strokeStyle = function() {
  var self = this.ptr;
  return Pointer_stringify(_emscripten_bind_NanoVGContext_get_strokeStyle_0(self));
};
    NanoVGContext.prototype['set_strokeStyle'] = NanoVGContext.prototype.set_strokeStyle = function(arg0) {
  var self = this.ptr;
  ensureStringCache.prepare();
  if (arg0 && typeof arg0 === 'object') arg0 = arg0.ptr;
  else arg0 = ensureString(arg0);
  _emscripten_bind_NanoVGContext_set_strokeStyle_1(self, arg0);
};
  NanoVGContext.prototype['get_textAlign'] = NanoVGContext.prototype.get_textAlign = function() {
  var self = this.ptr;
  return Pointer_stringify(_emscripten_bind_NanoVGContext_get_textAlign_0(self));
};
    NanoVGContext.prototype['set_textAlign'] = NanoVGContext.prototype.set_textAlign = function(arg0) {
  var self = this.ptr;
  ensureStringCache.prepare();
  if (arg0 && typeof arg0 === 'object') arg0 = arg0.ptr;
  else arg0 = ensureString(arg0);
  _emscripten_bind_NanoVGContext_set_textAlign_1(self, arg0);
};
  NanoVGContext.prototype['get_font'] = NanoVGContext.prototype.get_font = function() {
  var self = this.ptr;
  return Pointer_stringify(_emscripten_bind_NanoVGContext_get_font_0(self));
};
    NanoVGContext.prototype['set_font'] = NanoVGContext.prototype.set_font = function(arg0) {
  var self = this.ptr;
  ensureStringCache.prepare();
  if (arg0 && typeof arg0 === 'object') arg0 = arg0.ptr;
  else arg0 = ensureString(arg0);
  _emscripten_bind_NanoVGContext_set_font_1(self, arg0);
};
  NanoVGContext.prototype['get_text'] = NanoVGContext.prototype.get_text = function() {
  var self = this.ptr;
  return Pointer_stringify(_emscripten_bind_NanoVGContext_get_text_0(self));
};
    NanoVGContext.prototype['set_text'] = NanoVGContext.prototype.set_text = function(arg0) {
  var self = this.ptr;
  ensureStringCache.prepare();
  if (arg0 && typeof arg0 === 'object') arg0 = arg0.ptr;
  else arg0 = ensureString(arg0);
  _emscripten_bind_NanoVGContext_set_text_1(self, arg0);
};
  NanoVGContext.prototype['get_drawImageMapID'] = NanoVGContext.prototype.get_drawImageMapID = function() {
  var self = this.ptr;
  return _emscripten_bind_NanoVGContext_get_drawImageMapID_0(self);
};
    NanoVGContext.prototype['set_drawImageMapID'] = NanoVGContext.prototype.set_drawImageMapID = function(arg0) {
  var self = this.ptr;
  if (arg0 && typeof arg0 === 'object') arg0 = arg0.ptr;
  _emscripten_bind_NanoVGContext_set_drawImageMapID_1(self, arg0);
};
  NanoVGContext.prototype['get_drawTextMapID'] = NanoVGContext.prototype.get_drawTextMapID = function() {
  var self = this.ptr;
  return _emscripten_bind_NanoVGContext_get_drawTextMapID_0(self);
};
    NanoVGContext.prototype['set_drawTextMapID'] = NanoVGContext.prototype.set_drawTextMapID = function(arg0) {
  var self = this.ptr;
  if (arg0 && typeof arg0 === 'object') arg0 = arg0.ptr;
  _emscripten_bind_NanoVGContext_set_drawTextMapID_1(self, arg0);
};
  NanoVGContext.prototype['__destroy__'] = NanoVGContext.prototype.__destroy__ = function() {
  var self = this.ptr;
  _emscripten_bind_NanoVGContext___destroy___0(self);
};
// VoidPtr
function VoidPtr() { throw "cannot construct a VoidPtr, no constructor in IDL" }
VoidPtr.prototype = Object.create(WrapperObject.prototype);
VoidPtr.prototype.constructor = VoidPtr;
VoidPtr.prototype.__class__ = VoidPtr;
VoidPtr.__cache__ = {};
Module['VoidPtr'] = VoidPtr;

  VoidPtr.prototype['__destroy__'] = VoidPtr.prototype.__destroy__ = function() {
  var self = this.ptr;
  _emscripten_bind_VoidPtr___destroy___0(self);
};
(function() {
  function setupEnums() {
    
  }
  if (Module['calledRun']) setupEnums();
  else addOnPreMain(setupEnums);
})();
})();
var __instance = null;
exports = {
  get: function(rWidth, rHeight) {
    if (!__instance) {
      __instance = new GLOBAL.Module.NanoVGContext(rWidth, rHeight);
      __instance.canvas = Module.canvas;
    }
    return __instance;
  }
}


import { createRequire } from "node:module";
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
function __accessProp(key) {
  return this[key];
}
var __toESMCache_node;
var __toESMCache_esm;
var __toESM = (mod, isNodeMode, target) => {
  var canCache = mod != null && typeof mod === "object";
  if (canCache) {
    var cache = isNodeMode ? __toESMCache_node ??= new WeakMap : __toESMCache_esm ??= new WeakMap;
    var cached = cache.get(mod);
    if (cached)
      return cached;
  }
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: __accessProp.bind(mod, key),
        enumerable: true
      });
  if (canCache)
    cache.set(mod, to);
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __returnValue = (v) => v;
function __exportSetter(name, newValue) {
  this[name] = __returnValue.bind(null, newValue);
}
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: __exportSetter.bind(all, name)
    });
};
var __esm = (fn, res) => () => (fn && (res = fn(fn = 0)), res);
var __require = /* @__PURE__ */ createRequire(import.meta.url);

// node_modules/gl-matrix/cjs/common.js
var require_common = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.RANDOM = exports.EPSILON = exports.ARRAY_TYPE = exports.ANGLE_ORDER = undefined;
  exports.equals = equals;
  exports.round = round;
  exports.setMatrixArrayType = setMatrixArrayType;
  exports.toDegree = toDegree;
  exports.toRadian = toRadian;
  var EPSILON = exports.EPSILON = 0.000001;
  var ARRAY_TYPE = exports.ARRAY_TYPE = typeof Float32Array !== "undefined" ? Float32Array : Array;
  var RANDOM = exports.RANDOM = Math.random;
  var ANGLE_ORDER = exports.ANGLE_ORDER = "zyx";
  function round(a) {
    if (a >= 0)
      return Math.round(a);
    return a % 0.5 === 0 ? Math.floor(a) : Math.round(a);
  }
  function setMatrixArrayType(type) {
    exports.ARRAY_TYPE = ARRAY_TYPE = type;
  }
  var degree = Math.PI / 180;
  var radian = 180 / Math.PI;
  function toRadian(a) {
    return a * degree;
  }
  function toDegree(a) {
    return a * radian;
  }
  function equals(a, b) {
    var tolerance = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : EPSILON;
    return Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(a), Math.abs(b));
  }
});

// node_modules/gl-matrix/cjs/mat2.js
var require_mat2 = __commonJS((exports) => {
  function _typeof(o) {
    "@babel/helpers - typeof";
    return _typeof = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(o2) {
      return typeof o2;
    } : function(o2) {
      return o2 && typeof Symbol == "function" && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
    }, _typeof(o);
  }
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.LDU = LDU;
  exports.add = add;
  exports.adjoint = adjoint;
  exports.clone = clone;
  exports.copy = copy;
  exports.create = create;
  exports.determinant = determinant;
  exports.equals = equals;
  exports.exactEquals = exactEquals;
  exports.frob = frob;
  exports.fromRotation = fromRotation;
  exports.fromScaling = fromScaling;
  exports.fromValues = fromValues;
  exports.identity = identity;
  exports.invert = invert;
  exports.mul = undefined;
  exports.multiply = multiply;
  exports.multiplyScalar = multiplyScalar;
  exports.multiplyScalarAndAdd = multiplyScalarAndAdd;
  exports.rotate = rotate;
  exports.scale = scale;
  exports.set = set;
  exports.str = str;
  exports.sub = undefined;
  exports.subtract = subtract;
  exports.transpose = transpose;
  var glMatrix = _interopRequireWildcard(require_common());
  function _interopRequireWildcard(e, t) {
    if (typeof WeakMap == "function")
      var r = new WeakMap, n = new WeakMap;
    return (_interopRequireWildcard = function _interopRequireWildcard2(e2, t2) {
      if (!t2 && e2 && e2.__esModule)
        return e2;
      var o, i, f = { __proto__: null, default: e2 };
      if (e2 === null || _typeof(e2) != "object" && typeof e2 != "function")
        return f;
      if (o = t2 ? n : r) {
        if (o.has(e2))
          return o.get(e2);
        o.set(e2, f);
      }
      for (var _t in e2)
        _t !== "default" && {}.hasOwnProperty.call(e2, _t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e2, _t)) && (i.get || i.set) ? o(f, _t, i) : f[_t] = e2[_t]);
      return f;
    })(e, t);
  }
  function create() {
    var out = new glMatrix.ARRAY_TYPE(4);
    if (glMatrix.ARRAY_TYPE != Float32Array) {
      out[1] = 0;
      out[2] = 0;
    }
    out[0] = 1;
    out[3] = 1;
    return out;
  }
  function clone(a) {
    var out = new glMatrix.ARRAY_TYPE(4);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    return out;
  }
  function copy(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    return out;
  }
  function identity(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    return out;
  }
  function fromValues(m00, m01, m10, m11) {
    var out = new glMatrix.ARRAY_TYPE(4);
    out[0] = m00;
    out[1] = m01;
    out[2] = m10;
    out[3] = m11;
    return out;
  }
  function set(out, m00, m01, m10, m11) {
    out[0] = m00;
    out[1] = m01;
    out[2] = m10;
    out[3] = m11;
    return out;
  }
  function transpose(out, a) {
    if (out === a) {
      var a1 = a[1];
      out[1] = a[2];
      out[2] = a1;
    } else {
      out[0] = a[0];
      out[1] = a[2];
      out[2] = a[1];
      out[3] = a[3];
    }
    return out;
  }
  function invert(out, a) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3];
    var det = a0 * a3 - a2 * a1;
    if (!det) {
      return null;
    }
    det = 1 / det;
    out[0] = a3 * det;
    out[1] = -a1 * det;
    out[2] = -a2 * det;
    out[3] = a0 * det;
    return out;
  }
  function adjoint(out, a) {
    var a0 = a[0];
    out[0] = a[3];
    out[1] = -a[1];
    out[2] = -a[2];
    out[3] = a0;
    return out;
  }
  function determinant(a) {
    return a[0] * a[3] - a[2] * a[1];
  }
  function multiply(out, a, b) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3];
    var b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
    out[0] = a0 * b0 + a2 * b1;
    out[1] = a1 * b0 + a3 * b1;
    out[2] = a0 * b2 + a2 * b3;
    out[3] = a1 * b2 + a3 * b3;
    return out;
  }
  function rotate(out, a, rad) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3];
    var s = Math.sin(rad);
    var c = Math.cos(rad);
    out[0] = a0 * c + a2 * s;
    out[1] = a1 * c + a3 * s;
    out[2] = a0 * -s + a2 * c;
    out[3] = a1 * -s + a3 * c;
    return out;
  }
  function scale(out, a, v) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3];
    var v0 = v[0], v1 = v[1];
    out[0] = a0 * v0;
    out[1] = a1 * v0;
    out[2] = a2 * v1;
    out[3] = a3 * v1;
    return out;
  }
  function fromRotation(out, rad) {
    var s = Math.sin(rad);
    var c = Math.cos(rad);
    out[0] = c;
    out[1] = s;
    out[2] = -s;
    out[3] = c;
    return out;
  }
  function fromScaling(out, v) {
    out[0] = v[0];
    out[1] = 0;
    out[2] = 0;
    out[3] = v[1];
    return out;
  }
  function str(a) {
    return "mat2(" + a[0] + ", " + a[1] + ", " + a[2] + ", " + a[3] + ")";
  }
  function frob(a) {
    return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2] + a[3] * a[3]);
  }
  function LDU(L, D, U, a) {
    L[2] = a[2] / a[0];
    U[0] = a[0];
    U[1] = a[1];
    U[3] = a[3] - L[2] * U[1];
    return [L, D, U];
  }
  function add(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    out[3] = a[3] + b[3];
    return out;
  }
  function subtract(out, a, b) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    out[3] = a[3] - b[3];
    return out;
  }
  function exactEquals(a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
  }
  function equals(a, b) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3];
    var b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
    return Math.abs(a0 - b0) <= glMatrix.EPSILON * Math.max(1, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= glMatrix.EPSILON * Math.max(1, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= glMatrix.EPSILON * Math.max(1, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= glMatrix.EPSILON * Math.max(1, Math.abs(a3), Math.abs(b3));
  }
  function multiplyScalar(out, a, b) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    out[2] = a[2] * b;
    out[3] = a[3] * b;
    return out;
  }
  function multiplyScalarAndAdd(out, a, b, scale2) {
    out[0] = a[0] + b[0] * scale2;
    out[1] = a[1] + b[1] * scale2;
    out[2] = a[2] + b[2] * scale2;
    out[3] = a[3] + b[3] * scale2;
    return out;
  }
  var mul = exports.mul = multiply;
  var sub = exports.sub = subtract;
});

// node_modules/gl-matrix/cjs/mat2d.js
var require_mat2d = __commonJS((exports) => {
  function _typeof(o) {
    "@babel/helpers - typeof";
    return _typeof = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(o2) {
      return typeof o2;
    } : function(o2) {
      return o2 && typeof Symbol == "function" && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
    }, _typeof(o);
  }
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.add = add;
  exports.clone = clone;
  exports.copy = copy;
  exports.create = create;
  exports.determinant = determinant;
  exports.equals = equals;
  exports.exactEquals = exactEquals;
  exports.frob = frob;
  exports.fromRotation = fromRotation;
  exports.fromScaling = fromScaling;
  exports.fromTranslation = fromTranslation;
  exports.fromValues = fromValues;
  exports.identity = identity;
  exports.invert = invert;
  exports.mul = undefined;
  exports.multiply = multiply;
  exports.multiplyScalar = multiplyScalar;
  exports.multiplyScalarAndAdd = multiplyScalarAndAdd;
  exports.rotate = rotate;
  exports.scale = scale;
  exports.set = set;
  exports.str = str;
  exports.sub = undefined;
  exports.subtract = subtract;
  exports.translate = translate;
  var glMatrix = _interopRequireWildcard(require_common());
  function _interopRequireWildcard(e, t) {
    if (typeof WeakMap == "function")
      var r = new WeakMap, n = new WeakMap;
    return (_interopRequireWildcard = function _interopRequireWildcard2(e2, t2) {
      if (!t2 && e2 && e2.__esModule)
        return e2;
      var o, i, f = { __proto__: null, default: e2 };
      if (e2 === null || _typeof(e2) != "object" && typeof e2 != "function")
        return f;
      if (o = t2 ? n : r) {
        if (o.has(e2))
          return o.get(e2);
        o.set(e2, f);
      }
      for (var _t in e2)
        _t !== "default" && {}.hasOwnProperty.call(e2, _t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e2, _t)) && (i.get || i.set) ? o(f, _t, i) : f[_t] = e2[_t]);
      return f;
    })(e, t);
  }
  function create() {
    var out = new glMatrix.ARRAY_TYPE(6);
    if (glMatrix.ARRAY_TYPE != Float32Array) {
      out[1] = 0;
      out[2] = 0;
      out[4] = 0;
      out[5] = 0;
    }
    out[0] = 1;
    out[3] = 1;
    return out;
  }
  function clone(a) {
    var out = new glMatrix.ARRAY_TYPE(6);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    return out;
  }
  function copy(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    return out;
  }
  function identity(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    out[4] = 0;
    out[5] = 0;
    return out;
  }
  function fromValues(a, b, c, d, tx, ty) {
    var out = new glMatrix.ARRAY_TYPE(6);
    out[0] = a;
    out[1] = b;
    out[2] = c;
    out[3] = d;
    out[4] = tx;
    out[5] = ty;
    return out;
  }
  function set(out, a, b, c, d, tx, ty) {
    out[0] = a;
    out[1] = b;
    out[2] = c;
    out[3] = d;
    out[4] = tx;
    out[5] = ty;
    return out;
  }
  function invert(out, a) {
    var aa = a[0], ab = a[1], ac = a[2], ad = a[3];
    var atx = a[4], aty = a[5];
    var det = aa * ad - ab * ac;
    if (!det) {
      return null;
    }
    det = 1 / det;
    out[0] = ad * det;
    out[1] = -ab * det;
    out[2] = -ac * det;
    out[3] = aa * det;
    out[4] = (ac * aty - ad * atx) * det;
    out[5] = (ab * atx - aa * aty) * det;
    return out;
  }
  function determinant(a) {
    return a[0] * a[3] - a[1] * a[2];
  }
  function multiply(out, a, b) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5];
    var b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3], b4 = b[4], b5 = b[5];
    out[0] = a0 * b0 + a2 * b1;
    out[1] = a1 * b0 + a3 * b1;
    out[2] = a0 * b2 + a2 * b3;
    out[3] = a1 * b2 + a3 * b3;
    out[4] = a0 * b4 + a2 * b5 + a4;
    out[5] = a1 * b4 + a3 * b5 + a5;
    return out;
  }
  function rotate(out, a, rad) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5];
    var s = Math.sin(rad);
    var c = Math.cos(rad);
    out[0] = a0 * c + a2 * s;
    out[1] = a1 * c + a3 * s;
    out[2] = a0 * -s + a2 * c;
    out[3] = a1 * -s + a3 * c;
    out[4] = a4;
    out[5] = a5;
    return out;
  }
  function scale(out, a, v) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5];
    var v0 = v[0], v1 = v[1];
    out[0] = a0 * v0;
    out[1] = a1 * v0;
    out[2] = a2 * v1;
    out[3] = a3 * v1;
    out[4] = a4;
    out[5] = a5;
    return out;
  }
  function translate(out, a, v) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5];
    var v0 = v[0], v1 = v[1];
    out[0] = a0;
    out[1] = a1;
    out[2] = a2;
    out[3] = a3;
    out[4] = a0 * v0 + a2 * v1 + a4;
    out[5] = a1 * v0 + a3 * v1 + a5;
    return out;
  }
  function fromRotation(out, rad) {
    var s = Math.sin(rad), c = Math.cos(rad);
    out[0] = c;
    out[1] = s;
    out[2] = -s;
    out[3] = c;
    out[4] = 0;
    out[5] = 0;
    return out;
  }
  function fromScaling(out, v) {
    out[0] = v[0];
    out[1] = 0;
    out[2] = 0;
    out[3] = v[1];
    out[4] = 0;
    out[5] = 0;
    return out;
  }
  function fromTranslation(out, v) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    out[4] = v[0];
    out[5] = v[1];
    return out;
  }
  function str(a) {
    return "mat2d(" + a[0] + ", " + a[1] + ", " + a[2] + ", " + a[3] + ", " + a[4] + ", " + a[5] + ")";
  }
  function frob(a) {
    return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2] + a[3] * a[3] + a[4] * a[4] + a[5] * a[5] + 1);
  }
  function add(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    out[3] = a[3] + b[3];
    out[4] = a[4] + b[4];
    out[5] = a[5] + b[5];
    return out;
  }
  function subtract(out, a, b) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    out[3] = a[3] - b[3];
    out[4] = a[4] - b[4];
    out[5] = a[5] - b[5];
    return out;
  }
  function multiplyScalar(out, a, b) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    out[2] = a[2] * b;
    out[3] = a[3] * b;
    out[4] = a[4] * b;
    out[5] = a[5] * b;
    return out;
  }
  function multiplyScalarAndAdd(out, a, b, scale2) {
    out[0] = a[0] + b[0] * scale2;
    out[1] = a[1] + b[1] * scale2;
    out[2] = a[2] + b[2] * scale2;
    out[3] = a[3] + b[3] * scale2;
    out[4] = a[4] + b[4] * scale2;
    out[5] = a[5] + b[5] * scale2;
    return out;
  }
  function exactEquals(a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3] && a[4] === b[4] && a[5] === b[5];
  }
  function equals(a, b) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5];
    var b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3], b4 = b[4], b5 = b[5];
    return Math.abs(a0 - b0) <= glMatrix.EPSILON * Math.max(1, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= glMatrix.EPSILON * Math.max(1, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= glMatrix.EPSILON * Math.max(1, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= glMatrix.EPSILON * Math.max(1, Math.abs(a3), Math.abs(b3)) && Math.abs(a4 - b4) <= glMatrix.EPSILON * Math.max(1, Math.abs(a4), Math.abs(b4)) && Math.abs(a5 - b5) <= glMatrix.EPSILON * Math.max(1, Math.abs(a5), Math.abs(b5));
  }
  var mul = exports.mul = multiply;
  var sub = exports.sub = subtract;
});

// node_modules/gl-matrix/cjs/mat3.js
var require_mat3 = __commonJS((exports) => {
  function _typeof(o) {
    "@babel/helpers - typeof";
    return _typeof = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(o2) {
      return typeof o2;
    } : function(o2) {
      return o2 && typeof Symbol == "function" && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
    }, _typeof(o);
  }
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.add = add;
  exports.adjoint = adjoint;
  exports.clone = clone;
  exports.copy = copy;
  exports.create = create;
  exports.determinant = determinant;
  exports.equals = equals;
  exports.exactEquals = exactEquals;
  exports.frob = frob;
  exports.fromMat2d = fromMat2d;
  exports.fromMat4 = fromMat4;
  exports.fromQuat = fromQuat;
  exports.fromRotation = fromRotation;
  exports.fromScaling = fromScaling;
  exports.fromTranslation = fromTranslation;
  exports.fromValues = fromValues;
  exports.identity = identity;
  exports.invert = invert;
  exports.mul = undefined;
  exports.multiply = multiply;
  exports.multiplyScalar = multiplyScalar;
  exports.multiplyScalarAndAdd = multiplyScalarAndAdd;
  exports.normalFromMat4 = normalFromMat4;
  exports.projection = projection;
  exports.rotate = rotate;
  exports.scale = scale;
  exports.set = set;
  exports.str = str;
  exports.sub = undefined;
  exports.subtract = subtract;
  exports.translate = translate;
  exports.transpose = transpose;
  var glMatrix = _interopRequireWildcard(require_common());
  function _interopRequireWildcard(e, t) {
    if (typeof WeakMap == "function")
      var r = new WeakMap, n = new WeakMap;
    return (_interopRequireWildcard = function _interopRequireWildcard2(e2, t2) {
      if (!t2 && e2 && e2.__esModule)
        return e2;
      var o, i, f = { __proto__: null, default: e2 };
      if (e2 === null || _typeof(e2) != "object" && typeof e2 != "function")
        return f;
      if (o = t2 ? n : r) {
        if (o.has(e2))
          return o.get(e2);
        o.set(e2, f);
      }
      for (var _t in e2)
        _t !== "default" && {}.hasOwnProperty.call(e2, _t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e2, _t)) && (i.get || i.set) ? o(f, _t, i) : f[_t] = e2[_t]);
      return f;
    })(e, t);
  }
  function create() {
    var out = new glMatrix.ARRAY_TYPE(9);
    if (glMatrix.ARRAY_TYPE != Float32Array) {
      out[1] = 0;
      out[2] = 0;
      out[3] = 0;
      out[5] = 0;
      out[6] = 0;
      out[7] = 0;
    }
    out[0] = 1;
    out[4] = 1;
    out[8] = 1;
    return out;
  }
  function fromMat4(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[4];
    out[4] = a[5];
    out[5] = a[6];
    out[6] = a[8];
    out[7] = a[9];
    out[8] = a[10];
    return out;
  }
  function clone(a) {
    var out = new glMatrix.ARRAY_TYPE(9);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    return out;
  }
  function copy(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    return out;
  }
  function fromValues(m00, m01, m02, m10, m11, m12, m20, m21, m22) {
    var out = new glMatrix.ARRAY_TYPE(9);
    out[0] = m00;
    out[1] = m01;
    out[2] = m02;
    out[3] = m10;
    out[4] = m11;
    out[5] = m12;
    out[6] = m20;
    out[7] = m21;
    out[8] = m22;
    return out;
  }
  function set(out, m00, m01, m02, m10, m11, m12, m20, m21, m22) {
    out[0] = m00;
    out[1] = m01;
    out[2] = m02;
    out[3] = m10;
    out[4] = m11;
    out[5] = m12;
    out[6] = m20;
    out[7] = m21;
    out[8] = m22;
    return out;
  }
  function identity(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 1;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 1;
    return out;
  }
  function transpose(out, a) {
    if (out === a) {
      var a01 = a[1], a02 = a[2], a12 = a[5];
      out[1] = a[3];
      out[2] = a[6];
      out[3] = a01;
      out[5] = a[7];
      out[6] = a02;
      out[7] = a12;
    } else {
      out[0] = a[0];
      out[1] = a[3];
      out[2] = a[6];
      out[3] = a[1];
      out[4] = a[4];
      out[5] = a[7];
      out[6] = a[2];
      out[7] = a[5];
      out[8] = a[8];
    }
    return out;
  }
  function invert(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2];
    var a10 = a[3], a11 = a[4], a12 = a[5];
    var a20 = a[6], a21 = a[7], a22 = a[8];
    var b01 = a22 * a11 - a12 * a21;
    var b11 = -a22 * a10 + a12 * a20;
    var b21 = a21 * a10 - a11 * a20;
    var det = a00 * b01 + a01 * b11 + a02 * b21;
    if (!det) {
      return null;
    }
    det = 1 / det;
    out[0] = b01 * det;
    out[1] = (-a22 * a01 + a02 * a21) * det;
    out[2] = (a12 * a01 - a02 * a11) * det;
    out[3] = b11 * det;
    out[4] = (a22 * a00 - a02 * a20) * det;
    out[5] = (-a12 * a00 + a02 * a10) * det;
    out[6] = b21 * det;
    out[7] = (-a21 * a00 + a01 * a20) * det;
    out[8] = (a11 * a00 - a01 * a10) * det;
    return out;
  }
  function adjoint(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2];
    var a10 = a[3], a11 = a[4], a12 = a[5];
    var a20 = a[6], a21 = a[7], a22 = a[8];
    out[0] = a11 * a22 - a12 * a21;
    out[1] = a02 * a21 - a01 * a22;
    out[2] = a01 * a12 - a02 * a11;
    out[3] = a12 * a20 - a10 * a22;
    out[4] = a00 * a22 - a02 * a20;
    out[5] = a02 * a10 - a00 * a12;
    out[6] = a10 * a21 - a11 * a20;
    out[7] = a01 * a20 - a00 * a21;
    out[8] = a00 * a11 - a01 * a10;
    return out;
  }
  function determinant(a) {
    var a00 = a[0], a01 = a[1], a02 = a[2];
    var a10 = a[3], a11 = a[4], a12 = a[5];
    var a20 = a[6], a21 = a[7], a22 = a[8];
    return a00 * (a22 * a11 - a12 * a21) + a01 * (-a22 * a10 + a12 * a20) + a02 * (a21 * a10 - a11 * a20);
  }
  function multiply(out, a, b) {
    var a00 = a[0], a01 = a[1], a02 = a[2];
    var a10 = a[3], a11 = a[4], a12 = a[5];
    var a20 = a[6], a21 = a[7], a22 = a[8];
    var b00 = b[0], b01 = b[1], b02 = b[2];
    var b10 = b[3], b11 = b[4], b12 = b[5];
    var b20 = b[6], b21 = b[7], b22 = b[8];
    out[0] = b00 * a00 + b01 * a10 + b02 * a20;
    out[1] = b00 * a01 + b01 * a11 + b02 * a21;
    out[2] = b00 * a02 + b01 * a12 + b02 * a22;
    out[3] = b10 * a00 + b11 * a10 + b12 * a20;
    out[4] = b10 * a01 + b11 * a11 + b12 * a21;
    out[5] = b10 * a02 + b11 * a12 + b12 * a22;
    out[6] = b20 * a00 + b21 * a10 + b22 * a20;
    out[7] = b20 * a01 + b21 * a11 + b22 * a21;
    out[8] = b20 * a02 + b21 * a12 + b22 * a22;
    return out;
  }
  function translate(out, a, v) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a10 = a[3], a11 = a[4], a12 = a[5], a20 = a[6], a21 = a[7], a22 = a[8], x = v[0], y = v[1];
    out[0] = a00;
    out[1] = a01;
    out[2] = a02;
    out[3] = a10;
    out[4] = a11;
    out[5] = a12;
    out[6] = x * a00 + y * a10 + a20;
    out[7] = x * a01 + y * a11 + a21;
    out[8] = x * a02 + y * a12 + a22;
    return out;
  }
  function rotate(out, a, rad) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a10 = a[3], a11 = a[4], a12 = a[5], a20 = a[6], a21 = a[7], a22 = a[8], s = Math.sin(rad), c = Math.cos(rad);
    out[0] = c * a00 + s * a10;
    out[1] = c * a01 + s * a11;
    out[2] = c * a02 + s * a12;
    out[3] = c * a10 - s * a00;
    out[4] = c * a11 - s * a01;
    out[5] = c * a12 - s * a02;
    out[6] = a20;
    out[7] = a21;
    out[8] = a22;
    return out;
  }
  function scale(out, a, v) {
    var x = v[0], y = v[1];
    out[0] = x * a[0];
    out[1] = x * a[1];
    out[2] = x * a[2];
    out[3] = y * a[3];
    out[4] = y * a[4];
    out[5] = y * a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    return out;
  }
  function fromTranslation(out, v) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 1;
    out[5] = 0;
    out[6] = v[0];
    out[7] = v[1];
    out[8] = 1;
    return out;
  }
  function fromRotation(out, rad) {
    var s = Math.sin(rad), c = Math.cos(rad);
    out[0] = c;
    out[1] = s;
    out[2] = 0;
    out[3] = -s;
    out[4] = c;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 1;
    return out;
  }
  function fromScaling(out, v) {
    out[0] = v[0];
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = v[1];
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 1;
    return out;
  }
  function fromMat2d(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = 0;
    out[3] = a[2];
    out[4] = a[3];
    out[5] = 0;
    out[6] = a[4];
    out[7] = a[5];
    out[8] = 1;
    return out;
  }
  function fromQuat(out, q) {
    var x = q[0], y = q[1], z = q[2], w = q[3];
    var x2 = x + x;
    var y2 = y + y;
    var z2 = z + z;
    var xx = x * x2;
    var yx = y * x2;
    var yy = y * y2;
    var zx = z * x2;
    var zy = z * y2;
    var zz = z * z2;
    var wx = w * x2;
    var wy = w * y2;
    var wz = w * z2;
    out[0] = 1 - yy - zz;
    out[3] = yx - wz;
    out[6] = zx + wy;
    out[1] = yx + wz;
    out[4] = 1 - xx - zz;
    out[7] = zy - wx;
    out[2] = zx - wy;
    out[5] = zy + wx;
    out[8] = 1 - xx - yy;
    return out;
  }
  function normalFromMat4(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    var a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    var a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    var a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    var b00 = a00 * a11 - a01 * a10;
    var b01 = a00 * a12 - a02 * a10;
    var b02 = a00 * a13 - a03 * a10;
    var b03 = a01 * a12 - a02 * a11;
    var b04 = a01 * a13 - a03 * a11;
    var b05 = a02 * a13 - a03 * a12;
    var b06 = a20 * a31 - a21 * a30;
    var b07 = a20 * a32 - a22 * a30;
    var b08 = a20 * a33 - a23 * a30;
    var b09 = a21 * a32 - a22 * a31;
    var b10 = a21 * a33 - a23 * a31;
    var b11 = a22 * a33 - a23 * a32;
    var det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) {
      return null;
    }
    det = 1 / det;
    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[2] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[3] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[4] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[5] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[6] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[7] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[8] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    return out;
  }
  function projection(out, width, height) {
    out[0] = 2 / width;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = -2 / height;
    out[5] = 0;
    out[6] = -1;
    out[7] = 1;
    out[8] = 1;
    return out;
  }
  function str(a) {
    return "mat3(" + a[0] + ", " + a[1] + ", " + a[2] + ", " + a[3] + ", " + a[4] + ", " + a[5] + ", " + a[6] + ", " + a[7] + ", " + a[8] + ")";
  }
  function frob(a) {
    return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2] + a[3] * a[3] + a[4] * a[4] + a[5] * a[5] + a[6] * a[6] + a[7] * a[7] + a[8] * a[8]);
  }
  function add(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    out[3] = a[3] + b[3];
    out[4] = a[4] + b[4];
    out[5] = a[5] + b[5];
    out[6] = a[6] + b[6];
    out[7] = a[7] + b[7];
    out[8] = a[8] + b[8];
    return out;
  }
  function subtract(out, a, b) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    out[3] = a[3] - b[3];
    out[4] = a[4] - b[4];
    out[5] = a[5] - b[5];
    out[6] = a[6] - b[6];
    out[7] = a[7] - b[7];
    out[8] = a[8] - b[8];
    return out;
  }
  function multiplyScalar(out, a, b) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    out[2] = a[2] * b;
    out[3] = a[3] * b;
    out[4] = a[4] * b;
    out[5] = a[5] * b;
    out[6] = a[6] * b;
    out[7] = a[7] * b;
    out[8] = a[8] * b;
    return out;
  }
  function multiplyScalarAndAdd(out, a, b, scale2) {
    out[0] = a[0] + b[0] * scale2;
    out[1] = a[1] + b[1] * scale2;
    out[2] = a[2] + b[2] * scale2;
    out[3] = a[3] + b[3] * scale2;
    out[4] = a[4] + b[4] * scale2;
    out[5] = a[5] + b[5] * scale2;
    out[6] = a[6] + b[6] * scale2;
    out[7] = a[7] + b[7] * scale2;
    out[8] = a[8] + b[8] * scale2;
    return out;
  }
  function exactEquals(a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3] && a[4] === b[4] && a[5] === b[5] && a[6] === b[6] && a[7] === b[7] && a[8] === b[8];
  }
  function equals(a, b) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5], a6 = a[6], a7 = a[7], a8 = a[8];
    var b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3], b4 = b[4], b5 = b[5], b6 = b[6], b7 = b[7], b8 = b[8];
    return Math.abs(a0 - b0) <= glMatrix.EPSILON * Math.max(1, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= glMatrix.EPSILON * Math.max(1, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= glMatrix.EPSILON * Math.max(1, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= glMatrix.EPSILON * Math.max(1, Math.abs(a3), Math.abs(b3)) && Math.abs(a4 - b4) <= glMatrix.EPSILON * Math.max(1, Math.abs(a4), Math.abs(b4)) && Math.abs(a5 - b5) <= glMatrix.EPSILON * Math.max(1, Math.abs(a5), Math.abs(b5)) && Math.abs(a6 - b6) <= glMatrix.EPSILON * Math.max(1, Math.abs(a6), Math.abs(b6)) && Math.abs(a7 - b7) <= glMatrix.EPSILON * Math.max(1, Math.abs(a7), Math.abs(b7)) && Math.abs(a8 - b8) <= glMatrix.EPSILON * Math.max(1, Math.abs(a8), Math.abs(b8));
  }
  var mul = exports.mul = multiply;
  var sub = exports.sub = subtract;
});

// node_modules/gl-matrix/cjs/mat4.js
var require_mat4 = __commonJS((exports) => {
  function _typeof(o) {
    "@babel/helpers - typeof";
    return _typeof = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(o2) {
      return typeof o2;
    } : function(o2) {
      return o2 && typeof Symbol == "function" && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
    }, _typeof(o);
  }
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.add = add;
  exports.adjoint = adjoint;
  exports.clone = clone;
  exports.copy = copy;
  exports.create = create;
  exports.decompose = decompose;
  exports.determinant = determinant;
  exports.equals = equals;
  exports.exactEquals = exactEquals;
  exports.frob = frob;
  exports.fromQuat = fromQuat;
  exports.fromQuat2 = fromQuat2;
  exports.fromRotation = fromRotation;
  exports.fromRotationTranslation = fromRotationTranslation;
  exports.fromRotationTranslationScale = fromRotationTranslationScale;
  exports.fromRotationTranslationScaleOrigin = fromRotationTranslationScaleOrigin;
  exports.fromScaling = fromScaling;
  exports.fromTranslation = fromTranslation;
  exports.fromValues = fromValues;
  exports.fromXRotation = fromXRotation;
  exports.fromYRotation = fromYRotation;
  exports.fromZRotation = fromZRotation;
  exports.frustum = frustum;
  exports.getRotation = getRotation;
  exports.getScaling = getScaling;
  exports.getTranslation = getTranslation;
  exports.identity = identity;
  exports.invert = invert;
  exports.lookAt = lookAt;
  exports.mul = undefined;
  exports.multiply = multiply;
  exports.multiplyScalar = multiplyScalar;
  exports.multiplyScalarAndAdd = multiplyScalarAndAdd;
  exports.ortho = undefined;
  exports.orthoNO = orthoNO;
  exports.orthoZO = orthoZO;
  exports.perspective = undefined;
  exports.perspectiveFromFieldOfView = perspectiveFromFieldOfView;
  exports.perspectiveNO = perspectiveNO;
  exports.perspectiveZO = perspectiveZO;
  exports.rotate = rotate;
  exports.rotateX = rotateX;
  exports.rotateY = rotateY;
  exports.rotateZ = rotateZ;
  exports.scale = scale;
  exports.set = set;
  exports.str = str;
  exports.sub = undefined;
  exports.subtract = subtract;
  exports.targetTo = targetTo;
  exports.translate = translate;
  exports.transpose = transpose;
  var glMatrix = _interopRequireWildcard(require_common());
  function _interopRequireWildcard(e, t) {
    if (typeof WeakMap == "function")
      var r = new WeakMap, n = new WeakMap;
    return (_interopRequireWildcard = function _interopRequireWildcard2(e2, t2) {
      if (!t2 && e2 && e2.__esModule)
        return e2;
      var o, i, f = { __proto__: null, default: e2 };
      if (e2 === null || _typeof(e2) != "object" && typeof e2 != "function")
        return f;
      if (o = t2 ? n : r) {
        if (o.has(e2))
          return o.get(e2);
        o.set(e2, f);
      }
      for (var _t in e2)
        _t !== "default" && {}.hasOwnProperty.call(e2, _t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e2, _t)) && (i.get || i.set) ? o(f, _t, i) : f[_t] = e2[_t]);
      return f;
    })(e, t);
  }
  function create() {
    var out = new glMatrix.ARRAY_TYPE(16);
    if (glMatrix.ARRAY_TYPE != Float32Array) {
      out[1] = 0;
      out[2] = 0;
      out[3] = 0;
      out[4] = 0;
      out[6] = 0;
      out[7] = 0;
      out[8] = 0;
      out[9] = 0;
      out[11] = 0;
      out[12] = 0;
      out[13] = 0;
      out[14] = 0;
    }
    out[0] = 1;
    out[5] = 1;
    out[10] = 1;
    out[15] = 1;
    return out;
  }
  function clone(a) {
    var out = new glMatrix.ARRAY_TYPE(16);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
  }
  function copy(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
  }
  function fromValues(m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33) {
    var out = new glMatrix.ARRAY_TYPE(16);
    out[0] = m00;
    out[1] = m01;
    out[2] = m02;
    out[3] = m03;
    out[4] = m10;
    out[5] = m11;
    out[6] = m12;
    out[7] = m13;
    out[8] = m20;
    out[9] = m21;
    out[10] = m22;
    out[11] = m23;
    out[12] = m30;
    out[13] = m31;
    out[14] = m32;
    out[15] = m33;
    return out;
  }
  function set(out, m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33) {
    out[0] = m00;
    out[1] = m01;
    out[2] = m02;
    out[3] = m03;
    out[4] = m10;
    out[5] = m11;
    out[6] = m12;
    out[7] = m13;
    out[8] = m20;
    out[9] = m21;
    out[10] = m22;
    out[11] = m23;
    out[12] = m30;
    out[13] = m31;
    out[14] = m32;
    out[15] = m33;
    return out;
  }
  function identity(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }
  function transpose(out, a) {
    if (out === a) {
      var a01 = a[1], a02 = a[2], a03 = a[3];
      var a12 = a[6], a13 = a[7];
      var a23 = a[11];
      out[1] = a[4];
      out[2] = a[8];
      out[3] = a[12];
      out[4] = a01;
      out[6] = a[9];
      out[7] = a[13];
      out[8] = a02;
      out[9] = a12;
      out[11] = a[14];
      out[12] = a03;
      out[13] = a13;
      out[14] = a23;
    } else {
      out[0] = a[0];
      out[1] = a[4];
      out[2] = a[8];
      out[3] = a[12];
      out[4] = a[1];
      out[5] = a[5];
      out[6] = a[9];
      out[7] = a[13];
      out[8] = a[2];
      out[9] = a[6];
      out[10] = a[10];
      out[11] = a[14];
      out[12] = a[3];
      out[13] = a[7];
      out[14] = a[11];
      out[15] = a[15];
    }
    return out;
  }
  function invert(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    var a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    var a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    var a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    var b00 = a00 * a11 - a01 * a10;
    var b01 = a00 * a12 - a02 * a10;
    var b02 = a00 * a13 - a03 * a10;
    var b03 = a01 * a12 - a02 * a11;
    var b04 = a01 * a13 - a03 * a11;
    var b05 = a02 * a13 - a03 * a12;
    var b06 = a20 * a31 - a21 * a30;
    var b07 = a20 * a32 - a22 * a30;
    var b08 = a20 * a33 - a23 * a30;
    var b09 = a21 * a32 - a22 * a31;
    var b10 = a21 * a33 - a23 * a31;
    var b11 = a22 * a33 - a23 * a32;
    var det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) {
      return null;
    }
    det = 1 / det;
    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
    return out;
  }
  function adjoint(out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    var a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    var a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    var a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    var b00 = a00 * a11 - a01 * a10;
    var b01 = a00 * a12 - a02 * a10;
    var b02 = a00 * a13 - a03 * a10;
    var b03 = a01 * a12 - a02 * a11;
    var b04 = a01 * a13 - a03 * a11;
    var b05 = a02 * a13 - a03 * a12;
    var b06 = a20 * a31 - a21 * a30;
    var b07 = a20 * a32 - a22 * a30;
    var b08 = a20 * a33 - a23 * a30;
    var b09 = a21 * a32 - a22 * a31;
    var b10 = a21 * a33 - a23 * a31;
    var b11 = a22 * a33 - a23 * a32;
    out[0] = a11 * b11 - a12 * b10 + a13 * b09;
    out[1] = a02 * b10 - a01 * b11 - a03 * b09;
    out[2] = a31 * b05 - a32 * b04 + a33 * b03;
    out[3] = a22 * b04 - a21 * b05 - a23 * b03;
    out[4] = a12 * b08 - a10 * b11 - a13 * b07;
    out[5] = a00 * b11 - a02 * b08 + a03 * b07;
    out[6] = a32 * b02 - a30 * b05 - a33 * b01;
    out[7] = a20 * b05 - a22 * b02 + a23 * b01;
    out[8] = a10 * b10 - a11 * b08 + a13 * b06;
    out[9] = a01 * b08 - a00 * b10 - a03 * b06;
    out[10] = a30 * b04 - a31 * b02 + a33 * b00;
    out[11] = a21 * b02 - a20 * b04 - a23 * b00;
    out[12] = a11 * b07 - a10 * b09 - a12 * b06;
    out[13] = a00 * b09 - a01 * b07 + a02 * b06;
    out[14] = a31 * b01 - a30 * b03 - a32 * b00;
    out[15] = a20 * b03 - a21 * b01 + a22 * b00;
    return out;
  }
  function determinant(a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    var a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    var a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    var a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    var b0 = a00 * a11 - a01 * a10;
    var b1 = a00 * a12 - a02 * a10;
    var b2 = a01 * a12 - a02 * a11;
    var b3 = a20 * a31 - a21 * a30;
    var b4 = a20 * a32 - a22 * a30;
    var b5 = a21 * a32 - a22 * a31;
    var b6 = a00 * b5 - a01 * b4 + a02 * b3;
    var b7 = a10 * b5 - a11 * b4 + a12 * b3;
    var b8 = a20 * b2 - a21 * b1 + a22 * b0;
    var b9 = a30 * b2 - a31 * b1 + a32 * b0;
    return a13 * b6 - a03 * b7 + a33 * b8 - a23 * b9;
  }
  function multiply(out, a, b) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    var a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    var a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    var a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    var b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
    out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[4];
    b1 = b[5];
    b2 = b[6];
    b3 = b[7];
    out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[8];
    b1 = b[9];
    b2 = b[10];
    b3 = b[11];
    out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[12];
    b1 = b[13];
    b2 = b[14];
    b3 = b[15];
    out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    return out;
  }
  function translate(out, a, v) {
    var x = v[0], y = v[1], z = v[2];
    var a00, a01, a02, a03;
    var a10, a11, a12, a13;
    var a20, a21, a22, a23;
    if (a === out) {
      out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
      out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
      out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
      out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
    } else {
      a00 = a[0];
      a01 = a[1];
      a02 = a[2];
      a03 = a[3];
      a10 = a[4];
      a11 = a[5];
      a12 = a[6];
      a13 = a[7];
      a20 = a[8];
      a21 = a[9];
      a22 = a[10];
      a23 = a[11];
      out[0] = a00;
      out[1] = a01;
      out[2] = a02;
      out[3] = a03;
      out[4] = a10;
      out[5] = a11;
      out[6] = a12;
      out[7] = a13;
      out[8] = a20;
      out[9] = a21;
      out[10] = a22;
      out[11] = a23;
      out[12] = a00 * x + a10 * y + a20 * z + a[12];
      out[13] = a01 * x + a11 * y + a21 * z + a[13];
      out[14] = a02 * x + a12 * y + a22 * z + a[14];
      out[15] = a03 * x + a13 * y + a23 * z + a[15];
    }
    return out;
  }
  function scale(out, a, v) {
    var x = v[0], y = v[1], z = v[2];
    out[0] = a[0] * x;
    out[1] = a[1] * x;
    out[2] = a[2] * x;
    out[3] = a[3] * x;
    out[4] = a[4] * y;
    out[5] = a[5] * y;
    out[6] = a[6] * y;
    out[7] = a[7] * y;
    out[8] = a[8] * z;
    out[9] = a[9] * z;
    out[10] = a[10] * z;
    out[11] = a[11] * z;
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
  }
  function rotate(out, a, rad, axis) {
    var x = axis[0], y = axis[1], z = axis[2];
    var len = Math.sqrt(x * x + y * y + z * z);
    var s, c, t;
    var a00, a01, a02, a03;
    var a10, a11, a12, a13;
    var a20, a21, a22, a23;
    var b00, b01, b02;
    var b10, b11, b12;
    var b20, b21, b22;
    if (len < glMatrix.EPSILON) {
      return null;
    }
    len = 1 / len;
    x *= len;
    y *= len;
    z *= len;
    s = Math.sin(rad);
    c = Math.cos(rad);
    t = 1 - c;
    a00 = a[0];
    a01 = a[1];
    a02 = a[2];
    a03 = a[3];
    a10 = a[4];
    a11 = a[5];
    a12 = a[6];
    a13 = a[7];
    a20 = a[8];
    a21 = a[9];
    a22 = a[10];
    a23 = a[11];
    b00 = x * x * t + c;
    b01 = y * x * t + z * s;
    b02 = z * x * t - y * s;
    b10 = x * y * t - z * s;
    b11 = y * y * t + c;
    b12 = z * y * t + x * s;
    b20 = x * z * t + y * s;
    b21 = y * z * t - x * s;
    b22 = z * z * t + c;
    out[0] = a00 * b00 + a10 * b01 + a20 * b02;
    out[1] = a01 * b00 + a11 * b01 + a21 * b02;
    out[2] = a02 * b00 + a12 * b01 + a22 * b02;
    out[3] = a03 * b00 + a13 * b01 + a23 * b02;
    out[4] = a00 * b10 + a10 * b11 + a20 * b12;
    out[5] = a01 * b10 + a11 * b11 + a21 * b12;
    out[6] = a02 * b10 + a12 * b11 + a22 * b12;
    out[7] = a03 * b10 + a13 * b11 + a23 * b12;
    out[8] = a00 * b20 + a10 * b21 + a20 * b22;
    out[9] = a01 * b20 + a11 * b21 + a21 * b22;
    out[10] = a02 * b20 + a12 * b21 + a22 * b22;
    out[11] = a03 * b20 + a13 * b21 + a23 * b22;
    if (a !== out) {
      out[12] = a[12];
      out[13] = a[13];
      out[14] = a[14];
      out[15] = a[15];
    }
    return out;
  }
  function rotateX(out, a, rad) {
    var s = Math.sin(rad);
    var c = Math.cos(rad);
    var a10 = a[4];
    var a11 = a[5];
    var a12 = a[6];
    var a13 = a[7];
    var a20 = a[8];
    var a21 = a[9];
    var a22 = a[10];
    var a23 = a[11];
    if (a !== out) {
      out[0] = a[0];
      out[1] = a[1];
      out[2] = a[2];
      out[3] = a[3];
      out[12] = a[12];
      out[13] = a[13];
      out[14] = a[14];
      out[15] = a[15];
    }
    out[4] = a10 * c + a20 * s;
    out[5] = a11 * c + a21 * s;
    out[6] = a12 * c + a22 * s;
    out[7] = a13 * c + a23 * s;
    out[8] = a20 * c - a10 * s;
    out[9] = a21 * c - a11 * s;
    out[10] = a22 * c - a12 * s;
    out[11] = a23 * c - a13 * s;
    return out;
  }
  function rotateY(out, a, rad) {
    var s = Math.sin(rad);
    var c = Math.cos(rad);
    var a00 = a[0];
    var a01 = a[1];
    var a02 = a[2];
    var a03 = a[3];
    var a20 = a[8];
    var a21 = a[9];
    var a22 = a[10];
    var a23 = a[11];
    if (a !== out) {
      out[4] = a[4];
      out[5] = a[5];
      out[6] = a[6];
      out[7] = a[7];
      out[12] = a[12];
      out[13] = a[13];
      out[14] = a[14];
      out[15] = a[15];
    }
    out[0] = a00 * c - a20 * s;
    out[1] = a01 * c - a21 * s;
    out[2] = a02 * c - a22 * s;
    out[3] = a03 * c - a23 * s;
    out[8] = a00 * s + a20 * c;
    out[9] = a01 * s + a21 * c;
    out[10] = a02 * s + a22 * c;
    out[11] = a03 * s + a23 * c;
    return out;
  }
  function rotateZ(out, a, rad) {
    var s = Math.sin(rad);
    var c = Math.cos(rad);
    var a00 = a[0];
    var a01 = a[1];
    var a02 = a[2];
    var a03 = a[3];
    var a10 = a[4];
    var a11 = a[5];
    var a12 = a[6];
    var a13 = a[7];
    if (a !== out) {
      out[8] = a[8];
      out[9] = a[9];
      out[10] = a[10];
      out[11] = a[11];
      out[12] = a[12];
      out[13] = a[13];
      out[14] = a[14];
      out[15] = a[15];
    }
    out[0] = a00 * c + a10 * s;
    out[1] = a01 * c + a11 * s;
    out[2] = a02 * c + a12 * s;
    out[3] = a03 * c + a13 * s;
    out[4] = a10 * c - a00 * s;
    out[5] = a11 * c - a01 * s;
    out[6] = a12 * c - a02 * s;
    out[7] = a13 * c - a03 * s;
    return out;
  }
  function fromTranslation(out, v) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = v[0];
    out[13] = v[1];
    out[14] = v[2];
    out[15] = 1;
    return out;
  }
  function fromScaling(out, v) {
    out[0] = v[0];
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = v[1];
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = v[2];
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }
  function fromRotation(out, rad, axis) {
    var x = axis[0], y = axis[1], z = axis[2];
    var len = Math.sqrt(x * x + y * y + z * z);
    var s, c, t;
    if (len < glMatrix.EPSILON) {
      return null;
    }
    len = 1 / len;
    x *= len;
    y *= len;
    z *= len;
    s = Math.sin(rad);
    c = Math.cos(rad);
    t = 1 - c;
    out[0] = x * x * t + c;
    out[1] = y * x * t + z * s;
    out[2] = z * x * t - y * s;
    out[3] = 0;
    out[4] = x * y * t - z * s;
    out[5] = y * y * t + c;
    out[6] = z * y * t + x * s;
    out[7] = 0;
    out[8] = x * z * t + y * s;
    out[9] = y * z * t - x * s;
    out[10] = z * z * t + c;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }
  function fromXRotation(out, rad) {
    var s = Math.sin(rad);
    var c = Math.cos(rad);
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = c;
    out[6] = s;
    out[7] = 0;
    out[8] = 0;
    out[9] = -s;
    out[10] = c;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }
  function fromYRotation(out, rad) {
    var s = Math.sin(rad);
    var c = Math.cos(rad);
    out[0] = c;
    out[1] = 0;
    out[2] = -s;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = s;
    out[9] = 0;
    out[10] = c;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }
  function fromZRotation(out, rad) {
    var s = Math.sin(rad);
    var c = Math.cos(rad);
    out[0] = c;
    out[1] = s;
    out[2] = 0;
    out[3] = 0;
    out[4] = -s;
    out[5] = c;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }
  function fromRotationTranslation(out, q, v) {
    var x = q[0], y = q[1], z = q[2], w = q[3];
    var x2 = x + x;
    var y2 = y + y;
    var z2 = z + z;
    var xx = x * x2;
    var xy = x * y2;
    var xz = x * z2;
    var yy = y * y2;
    var yz = y * z2;
    var zz = z * z2;
    var wx = w * x2;
    var wy = w * y2;
    var wz = w * z2;
    out[0] = 1 - (yy + zz);
    out[1] = xy + wz;
    out[2] = xz - wy;
    out[3] = 0;
    out[4] = xy - wz;
    out[5] = 1 - (xx + zz);
    out[6] = yz + wx;
    out[7] = 0;
    out[8] = xz + wy;
    out[9] = yz - wx;
    out[10] = 1 - (xx + yy);
    out[11] = 0;
    out[12] = v[0];
    out[13] = v[1];
    out[14] = v[2];
    out[15] = 1;
    return out;
  }
  function fromQuat2(out, a) {
    var translation = new glMatrix.ARRAY_TYPE(3);
    var bx = -a[0], by = -a[1], bz = -a[2], bw = a[3], ax = a[4], ay = a[5], az = a[6], aw = a[7];
    var magnitude = bx * bx + by * by + bz * bz + bw * bw;
    if (magnitude > 0) {
      translation[0] = (ax * bw + aw * bx + ay * bz - az * by) * 2 / magnitude;
      translation[1] = (ay * bw + aw * by + az * bx - ax * bz) * 2 / magnitude;
      translation[2] = (az * bw + aw * bz + ax * by - ay * bx) * 2 / magnitude;
    } else {
      translation[0] = (ax * bw + aw * bx + ay * bz - az * by) * 2;
      translation[1] = (ay * bw + aw * by + az * bx - ax * bz) * 2;
      translation[2] = (az * bw + aw * bz + ax * by - ay * bx) * 2;
    }
    fromRotationTranslation(out, a, translation);
    return out;
  }
  function getTranslation(out, mat) {
    out[0] = mat[12];
    out[1] = mat[13];
    out[2] = mat[14];
    return out;
  }
  function getScaling(out, mat) {
    var m11 = mat[0];
    var m12 = mat[1];
    var m13 = mat[2];
    var m21 = mat[4];
    var m22 = mat[5];
    var m23 = mat[6];
    var m31 = mat[8];
    var m32 = mat[9];
    var m33 = mat[10];
    out[0] = Math.sqrt(m11 * m11 + m12 * m12 + m13 * m13);
    out[1] = Math.sqrt(m21 * m21 + m22 * m22 + m23 * m23);
    out[2] = Math.sqrt(m31 * m31 + m32 * m32 + m33 * m33);
    return out;
  }
  function getRotation(out, mat) {
    var scaling = new glMatrix.ARRAY_TYPE(3);
    getScaling(scaling, mat);
    var is1 = 1 / scaling[0];
    var is2 = 1 / scaling[1];
    var is3 = 1 / scaling[2];
    var sm11 = mat[0] * is1;
    var sm12 = mat[1] * is2;
    var sm13 = mat[2] * is3;
    var sm21 = mat[4] * is1;
    var sm22 = mat[5] * is2;
    var sm23 = mat[6] * is3;
    var sm31 = mat[8] * is1;
    var sm32 = mat[9] * is2;
    var sm33 = mat[10] * is3;
    var trace = sm11 + sm22 + sm33;
    var S = 0;
    if (trace > 0) {
      S = Math.sqrt(trace + 1) * 2;
      out[3] = 0.25 * S;
      out[0] = (sm23 - sm32) / S;
      out[1] = (sm31 - sm13) / S;
      out[2] = (sm12 - sm21) / S;
    } else if (sm11 > sm22 && sm11 > sm33) {
      S = Math.sqrt(1 + sm11 - sm22 - sm33) * 2;
      out[3] = (sm23 - sm32) / S;
      out[0] = 0.25 * S;
      out[1] = (sm12 + sm21) / S;
      out[2] = (sm31 + sm13) / S;
    } else if (sm22 > sm33) {
      S = Math.sqrt(1 + sm22 - sm11 - sm33) * 2;
      out[3] = (sm31 - sm13) / S;
      out[0] = (sm12 + sm21) / S;
      out[1] = 0.25 * S;
      out[2] = (sm23 + sm32) / S;
    } else {
      S = Math.sqrt(1 + sm33 - sm11 - sm22) * 2;
      out[3] = (sm12 - sm21) / S;
      out[0] = (sm31 + sm13) / S;
      out[1] = (sm23 + sm32) / S;
      out[2] = 0.25 * S;
    }
    return out;
  }
  function decompose(out_r, out_t, out_s, mat) {
    out_t[0] = mat[12];
    out_t[1] = mat[13];
    out_t[2] = mat[14];
    var m11 = mat[0];
    var m12 = mat[1];
    var m13 = mat[2];
    var m21 = mat[4];
    var m22 = mat[5];
    var m23 = mat[6];
    var m31 = mat[8];
    var m32 = mat[9];
    var m33 = mat[10];
    out_s[0] = Math.sqrt(m11 * m11 + m12 * m12 + m13 * m13);
    out_s[1] = Math.sqrt(m21 * m21 + m22 * m22 + m23 * m23);
    out_s[2] = Math.sqrt(m31 * m31 + m32 * m32 + m33 * m33);
    var is1 = 1 / out_s[0];
    var is2 = 1 / out_s[1];
    var is3 = 1 / out_s[2];
    var sm11 = m11 * is1;
    var sm12 = m12 * is2;
    var sm13 = m13 * is3;
    var sm21 = m21 * is1;
    var sm22 = m22 * is2;
    var sm23 = m23 * is3;
    var sm31 = m31 * is1;
    var sm32 = m32 * is2;
    var sm33 = m33 * is3;
    var trace = sm11 + sm22 + sm33;
    var S = 0;
    if (trace > 0) {
      S = Math.sqrt(trace + 1) * 2;
      out_r[3] = 0.25 * S;
      out_r[0] = (sm23 - sm32) / S;
      out_r[1] = (sm31 - sm13) / S;
      out_r[2] = (sm12 - sm21) / S;
    } else if (sm11 > sm22 && sm11 > sm33) {
      S = Math.sqrt(1 + sm11 - sm22 - sm33) * 2;
      out_r[3] = (sm23 - sm32) / S;
      out_r[0] = 0.25 * S;
      out_r[1] = (sm12 + sm21) / S;
      out_r[2] = (sm31 + sm13) / S;
    } else if (sm22 > sm33) {
      S = Math.sqrt(1 + sm22 - sm11 - sm33) * 2;
      out_r[3] = (sm31 - sm13) / S;
      out_r[0] = (sm12 + sm21) / S;
      out_r[1] = 0.25 * S;
      out_r[2] = (sm23 + sm32) / S;
    } else {
      S = Math.sqrt(1 + sm33 - sm11 - sm22) * 2;
      out_r[3] = (sm12 - sm21) / S;
      out_r[0] = (sm31 + sm13) / S;
      out_r[1] = (sm23 + sm32) / S;
      out_r[2] = 0.25 * S;
    }
    return out_r;
  }
  function fromRotationTranslationScale(out, q, v, s) {
    var x = q[0], y = q[1], z = q[2], w = q[3];
    var x2 = x + x;
    var y2 = y + y;
    var z2 = z + z;
    var xx = x * x2;
    var xy = x * y2;
    var xz = x * z2;
    var yy = y * y2;
    var yz = y * z2;
    var zz = z * z2;
    var wx = w * x2;
    var wy = w * y2;
    var wz = w * z2;
    var sx = s[0];
    var sy = s[1];
    var sz = s[2];
    out[0] = (1 - (yy + zz)) * sx;
    out[1] = (xy + wz) * sx;
    out[2] = (xz - wy) * sx;
    out[3] = 0;
    out[4] = (xy - wz) * sy;
    out[5] = (1 - (xx + zz)) * sy;
    out[6] = (yz + wx) * sy;
    out[7] = 0;
    out[8] = (xz + wy) * sz;
    out[9] = (yz - wx) * sz;
    out[10] = (1 - (xx + yy)) * sz;
    out[11] = 0;
    out[12] = v[0];
    out[13] = v[1];
    out[14] = v[2];
    out[15] = 1;
    return out;
  }
  function fromRotationTranslationScaleOrigin(out, q, v, s, o) {
    var x = q[0], y = q[1], z = q[2], w = q[3];
    var x2 = x + x;
    var y2 = y + y;
    var z2 = z + z;
    var xx = x * x2;
    var xy = x * y2;
    var xz = x * z2;
    var yy = y * y2;
    var yz = y * z2;
    var zz = z * z2;
    var wx = w * x2;
    var wy = w * y2;
    var wz = w * z2;
    var sx = s[0];
    var sy = s[1];
    var sz = s[2];
    var ox = o[0];
    var oy = o[1];
    var oz = o[2];
    var out0 = (1 - (yy + zz)) * sx;
    var out1 = (xy + wz) * sx;
    var out2 = (xz - wy) * sx;
    var out4 = (xy - wz) * sy;
    var out5 = (1 - (xx + zz)) * sy;
    var out6 = (yz + wx) * sy;
    var out8 = (xz + wy) * sz;
    var out9 = (yz - wx) * sz;
    var out10 = (1 - (xx + yy)) * sz;
    out[0] = out0;
    out[1] = out1;
    out[2] = out2;
    out[3] = 0;
    out[4] = out4;
    out[5] = out5;
    out[6] = out6;
    out[7] = 0;
    out[8] = out8;
    out[9] = out9;
    out[10] = out10;
    out[11] = 0;
    out[12] = v[0] + ox - (out0 * ox + out4 * oy + out8 * oz);
    out[13] = v[1] + oy - (out1 * ox + out5 * oy + out9 * oz);
    out[14] = v[2] + oz - (out2 * ox + out6 * oy + out10 * oz);
    out[15] = 1;
    return out;
  }
  function fromQuat(out, q) {
    var x = q[0], y = q[1], z = q[2], w = q[3];
    var x2 = x + x;
    var y2 = y + y;
    var z2 = z + z;
    var xx = x * x2;
    var yx = y * x2;
    var yy = y * y2;
    var zx = z * x2;
    var zy = z * y2;
    var zz = z * z2;
    var wx = w * x2;
    var wy = w * y2;
    var wz = w * z2;
    out[0] = 1 - yy - zz;
    out[1] = yx + wz;
    out[2] = zx - wy;
    out[3] = 0;
    out[4] = yx - wz;
    out[5] = 1 - xx - zz;
    out[6] = zy + wx;
    out[7] = 0;
    out[8] = zx + wy;
    out[9] = zy - wx;
    out[10] = 1 - xx - yy;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }
  function frustum(out, left, right, bottom, top, near, far) {
    var rl = 1 / (right - left);
    var tb = 1 / (top - bottom);
    var nf = 1 / (near - far);
    out[0] = near * 2 * rl;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = near * 2 * tb;
    out[6] = 0;
    out[7] = 0;
    out[8] = (right + left) * rl;
    out[9] = (top + bottom) * tb;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = far * near * 2 * nf;
    out[15] = 0;
    return out;
  }
  function perspectiveNO(out, fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2);
    out[0] = f / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = f;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[15] = 0;
    if (far != null && far !== Infinity) {
      var nf = 1 / (near - far);
      out[10] = (far + near) * nf;
      out[14] = 2 * far * near * nf;
    } else {
      out[10] = -1;
      out[14] = -2 * near;
    }
    return out;
  }
  var perspective = exports.perspective = perspectiveNO;
  function perspectiveZO(out, fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2);
    out[0] = f / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = f;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[15] = 0;
    if (far != null && far !== Infinity) {
      var nf = 1 / (near - far);
      out[10] = far * nf;
      out[14] = far * near * nf;
    } else {
      out[10] = -1;
      out[14] = -near;
    }
    return out;
  }
  function perspectiveFromFieldOfView(out, fov, near, far) {
    var upTan = Math.tan(fov.upDegrees * Math.PI / 180);
    var downTan = Math.tan(fov.downDegrees * Math.PI / 180);
    var leftTan = Math.tan(fov.leftDegrees * Math.PI / 180);
    var rightTan = Math.tan(fov.rightDegrees * Math.PI / 180);
    var xScale = 2 / (leftTan + rightTan);
    var yScale = 2 / (upTan + downTan);
    out[0] = xScale;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = yScale;
    out[6] = 0;
    out[7] = 0;
    out[8] = -((leftTan - rightTan) * xScale * 0.5);
    out[9] = (upTan - downTan) * yScale * 0.5;
    out[10] = far / (near - far);
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = far * near / (near - far);
    out[15] = 0;
    return out;
  }
  function orthoNO(out, left, right, bottom, top, near, far) {
    var lr = 1 / (left - right);
    var bt = 1 / (bottom - top);
    var nf = 1 / (near - far);
    out[0] = -2 * lr;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = -2 * bt;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 2 * nf;
    out[11] = 0;
    out[12] = (left + right) * lr;
    out[13] = (top + bottom) * bt;
    out[14] = (far + near) * nf;
    out[15] = 1;
    return out;
  }
  var ortho = exports.ortho = orthoNO;
  function orthoZO(out, left, right, bottom, top, near, far) {
    var lr = 1 / (left - right);
    var bt = 1 / (bottom - top);
    var nf = 1 / (near - far);
    out[0] = -2 * lr;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = -2 * bt;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = nf;
    out[11] = 0;
    out[12] = (left + right) * lr;
    out[13] = (top + bottom) * bt;
    out[14] = near * nf;
    out[15] = 1;
    return out;
  }
  function lookAt(out, eye, center, up) {
    var x0, x1, x2, y0, y1, y2, z0, z1, z2, len;
    var eyex = eye[0];
    var eyey = eye[1];
    var eyez = eye[2];
    var upx = up[0];
    var upy = up[1];
    var upz = up[2];
    var centerx = center[0];
    var centery = center[1];
    var centerz = center[2];
    if (Math.abs(eyex - centerx) < glMatrix.EPSILON && Math.abs(eyey - centery) < glMatrix.EPSILON && Math.abs(eyez - centerz) < glMatrix.EPSILON) {
      return identity(out);
    }
    z0 = eyex - centerx;
    z1 = eyey - centery;
    z2 = eyez - centerz;
    len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
    z0 *= len;
    z1 *= len;
    z2 *= len;
    x0 = upy * z2 - upz * z1;
    x1 = upz * z0 - upx * z2;
    x2 = upx * z1 - upy * z0;
    len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
    if (!len) {
      x0 = 0;
      x1 = 0;
      x2 = 0;
    } else {
      len = 1 / len;
      x0 *= len;
      x1 *= len;
      x2 *= len;
    }
    y0 = z1 * x2 - z2 * x1;
    y1 = z2 * x0 - z0 * x2;
    y2 = z0 * x1 - z1 * x0;
    len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
    if (!len) {
      y0 = 0;
      y1 = 0;
      y2 = 0;
    } else {
      len = 1 / len;
      y0 *= len;
      y1 *= len;
      y2 *= len;
    }
    out[0] = x0;
    out[1] = y0;
    out[2] = z0;
    out[3] = 0;
    out[4] = x1;
    out[5] = y1;
    out[6] = z1;
    out[7] = 0;
    out[8] = x2;
    out[9] = y2;
    out[10] = z2;
    out[11] = 0;
    out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
    out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
    out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
    out[15] = 1;
    return out;
  }
  function targetTo(out, eye, target, up) {
    var eyex = eye[0], eyey = eye[1], eyez = eye[2], upx = up[0], upy = up[1], upz = up[2];
    var z0 = eyex - target[0], z1 = eyey - target[1], z2 = eyez - target[2];
    var len = z0 * z0 + z1 * z1 + z2 * z2;
    if (len > 0) {
      len = 1 / Math.sqrt(len);
      z0 *= len;
      z1 *= len;
      z2 *= len;
    }
    var x0 = upy * z2 - upz * z1, x1 = upz * z0 - upx * z2, x2 = upx * z1 - upy * z0;
    len = x0 * x0 + x1 * x1 + x2 * x2;
    if (len > 0) {
      len = 1 / Math.sqrt(len);
      x0 *= len;
      x1 *= len;
      x2 *= len;
    }
    out[0] = x0;
    out[1] = x1;
    out[2] = x2;
    out[3] = 0;
    out[4] = z1 * x2 - z2 * x1;
    out[5] = z2 * x0 - z0 * x2;
    out[6] = z0 * x1 - z1 * x0;
    out[7] = 0;
    out[8] = z0;
    out[9] = z1;
    out[10] = z2;
    out[11] = 0;
    out[12] = eyex;
    out[13] = eyey;
    out[14] = eyez;
    out[15] = 1;
    return out;
  }
  function str(a) {
    return "mat4(" + a[0] + ", " + a[1] + ", " + a[2] + ", " + a[3] + ", " + a[4] + ", " + a[5] + ", " + a[6] + ", " + a[7] + ", " + a[8] + ", " + a[9] + ", " + a[10] + ", " + a[11] + ", " + a[12] + ", " + a[13] + ", " + a[14] + ", " + a[15] + ")";
  }
  function frob(a) {
    return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2] + a[3] * a[3] + a[4] * a[4] + a[5] * a[5] + a[6] * a[6] + a[7] * a[7] + a[8] * a[8] + a[9] * a[9] + a[10] * a[10] + a[11] * a[11] + a[12] * a[12] + a[13] * a[13] + a[14] * a[14] + a[15] * a[15]);
  }
  function add(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    out[3] = a[3] + b[3];
    out[4] = a[4] + b[4];
    out[5] = a[5] + b[5];
    out[6] = a[6] + b[6];
    out[7] = a[7] + b[7];
    out[8] = a[8] + b[8];
    out[9] = a[9] + b[9];
    out[10] = a[10] + b[10];
    out[11] = a[11] + b[11];
    out[12] = a[12] + b[12];
    out[13] = a[13] + b[13];
    out[14] = a[14] + b[14];
    out[15] = a[15] + b[15];
    return out;
  }
  function subtract(out, a, b) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    out[3] = a[3] - b[3];
    out[4] = a[4] - b[4];
    out[5] = a[5] - b[5];
    out[6] = a[6] - b[6];
    out[7] = a[7] - b[7];
    out[8] = a[8] - b[8];
    out[9] = a[9] - b[9];
    out[10] = a[10] - b[10];
    out[11] = a[11] - b[11];
    out[12] = a[12] - b[12];
    out[13] = a[13] - b[13];
    out[14] = a[14] - b[14];
    out[15] = a[15] - b[15];
    return out;
  }
  function multiplyScalar(out, a, b) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    out[2] = a[2] * b;
    out[3] = a[3] * b;
    out[4] = a[4] * b;
    out[5] = a[5] * b;
    out[6] = a[6] * b;
    out[7] = a[7] * b;
    out[8] = a[8] * b;
    out[9] = a[9] * b;
    out[10] = a[10] * b;
    out[11] = a[11] * b;
    out[12] = a[12] * b;
    out[13] = a[13] * b;
    out[14] = a[14] * b;
    out[15] = a[15] * b;
    return out;
  }
  function multiplyScalarAndAdd(out, a, b, scale2) {
    out[0] = a[0] + b[0] * scale2;
    out[1] = a[1] + b[1] * scale2;
    out[2] = a[2] + b[2] * scale2;
    out[3] = a[3] + b[3] * scale2;
    out[4] = a[4] + b[4] * scale2;
    out[5] = a[5] + b[5] * scale2;
    out[6] = a[6] + b[6] * scale2;
    out[7] = a[7] + b[7] * scale2;
    out[8] = a[8] + b[8] * scale2;
    out[9] = a[9] + b[9] * scale2;
    out[10] = a[10] + b[10] * scale2;
    out[11] = a[11] + b[11] * scale2;
    out[12] = a[12] + b[12] * scale2;
    out[13] = a[13] + b[13] * scale2;
    out[14] = a[14] + b[14] * scale2;
    out[15] = a[15] + b[15] * scale2;
    return out;
  }
  function exactEquals(a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3] && a[4] === b[4] && a[5] === b[5] && a[6] === b[6] && a[7] === b[7] && a[8] === b[8] && a[9] === b[9] && a[10] === b[10] && a[11] === b[11] && a[12] === b[12] && a[13] === b[13] && a[14] === b[14] && a[15] === b[15];
  }
  function equals(a, b) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3];
    var a4 = a[4], a5 = a[5], a6 = a[6], a7 = a[7];
    var a8 = a[8], a9 = a[9], a10 = a[10], a11 = a[11];
    var a12 = a[12], a13 = a[13], a14 = a[14], a15 = a[15];
    var b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
    var b4 = b[4], b5 = b[5], b6 = b[6], b7 = b[7];
    var b8 = b[8], b9 = b[9], b10 = b[10], b11 = b[11];
    var b12 = b[12], b13 = b[13], b14 = b[14], b15 = b[15];
    return Math.abs(a0 - b0) <= glMatrix.EPSILON * Math.max(1, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= glMatrix.EPSILON * Math.max(1, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= glMatrix.EPSILON * Math.max(1, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= glMatrix.EPSILON * Math.max(1, Math.abs(a3), Math.abs(b3)) && Math.abs(a4 - b4) <= glMatrix.EPSILON * Math.max(1, Math.abs(a4), Math.abs(b4)) && Math.abs(a5 - b5) <= glMatrix.EPSILON * Math.max(1, Math.abs(a5), Math.abs(b5)) && Math.abs(a6 - b6) <= glMatrix.EPSILON * Math.max(1, Math.abs(a6), Math.abs(b6)) && Math.abs(a7 - b7) <= glMatrix.EPSILON * Math.max(1, Math.abs(a7), Math.abs(b7)) && Math.abs(a8 - b8) <= glMatrix.EPSILON * Math.max(1, Math.abs(a8), Math.abs(b8)) && Math.abs(a9 - b9) <= glMatrix.EPSILON * Math.max(1, Math.abs(a9), Math.abs(b9)) && Math.abs(a10 - b10) <= glMatrix.EPSILON * Math.max(1, Math.abs(a10), Math.abs(b10)) && Math.abs(a11 - b11) <= glMatrix.EPSILON * Math.max(1, Math.abs(a11), Math.abs(b11)) && Math.abs(a12 - b12) <= glMatrix.EPSILON * Math.max(1, Math.abs(a12), Math.abs(b12)) && Math.abs(a13 - b13) <= glMatrix.EPSILON * Math.max(1, Math.abs(a13), Math.abs(b13)) && Math.abs(a14 - b14) <= glMatrix.EPSILON * Math.max(1, Math.abs(a14), Math.abs(b14)) && Math.abs(a15 - b15) <= glMatrix.EPSILON * Math.max(1, Math.abs(a15), Math.abs(b15));
  }
  var mul = exports.mul = multiply;
  var sub = exports.sub = subtract;
});

// node_modules/gl-matrix/cjs/vec3.js
var require_vec3 = __commonJS((exports) => {
  function _typeof(o) {
    "@babel/helpers - typeof";
    return _typeof = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(o2) {
      return typeof o2;
    } : function(o2) {
      return o2 && typeof Symbol == "function" && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
    }, _typeof(o);
  }
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.add = add;
  exports.angle = angle;
  exports.bezier = bezier;
  exports.ceil = ceil;
  exports.clone = clone;
  exports.copy = copy;
  exports.create = create;
  exports.cross = cross;
  exports.dist = undefined;
  exports.distance = distance;
  exports.div = undefined;
  exports.divide = divide;
  exports.dot = dot;
  exports.equals = equals;
  exports.exactEquals = exactEquals;
  exports.floor = floor;
  exports.forEach = undefined;
  exports.fromValues = fromValues;
  exports.hermite = hermite;
  exports.inverse = inverse;
  exports.len = undefined;
  exports.length = length;
  exports.lerp = lerp;
  exports.max = max;
  exports.min = min;
  exports.mul = undefined;
  exports.multiply = multiply;
  exports.negate = negate;
  exports.normalize = normalize;
  exports.random = random;
  exports.rotateX = rotateX;
  exports.rotateY = rotateY;
  exports.rotateZ = rotateZ;
  exports.round = round;
  exports.scale = scale;
  exports.scaleAndAdd = scaleAndAdd;
  exports.set = set;
  exports.slerp = slerp;
  exports.sqrLen = exports.sqrDist = undefined;
  exports.squaredDistance = squaredDistance;
  exports.squaredLength = squaredLength;
  exports.str = str;
  exports.sub = undefined;
  exports.subtract = subtract;
  exports.transformMat3 = transformMat3;
  exports.transformMat4 = transformMat4;
  exports.transformQuat = transformQuat;
  exports.zero = zero;
  var glMatrix = _interopRequireWildcard(require_common());
  function _interopRequireWildcard(e, t) {
    if (typeof WeakMap == "function")
      var r = new WeakMap, n = new WeakMap;
    return (_interopRequireWildcard = function _interopRequireWildcard2(e2, t2) {
      if (!t2 && e2 && e2.__esModule)
        return e2;
      var o, i, f = { __proto__: null, default: e2 };
      if (e2 === null || _typeof(e2) != "object" && typeof e2 != "function")
        return f;
      if (o = t2 ? n : r) {
        if (o.has(e2))
          return o.get(e2);
        o.set(e2, f);
      }
      for (var _t in e2)
        _t !== "default" && {}.hasOwnProperty.call(e2, _t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e2, _t)) && (i.get || i.set) ? o(f, _t, i) : f[_t] = e2[_t]);
      return f;
    })(e, t);
  }
  function create() {
    var out = new glMatrix.ARRAY_TYPE(3);
    if (glMatrix.ARRAY_TYPE != Float32Array) {
      out[0] = 0;
      out[1] = 0;
      out[2] = 0;
    }
    return out;
  }
  function clone(a) {
    var out = new glMatrix.ARRAY_TYPE(3);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    return out;
  }
  function length(a) {
    var x = a[0];
    var y = a[1];
    var z = a[2];
    return Math.sqrt(x * x + y * y + z * z);
  }
  function fromValues(x, y, z) {
    var out = new glMatrix.ARRAY_TYPE(3);
    out[0] = x;
    out[1] = y;
    out[2] = z;
    return out;
  }
  function copy(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    return out;
  }
  function set(out, x, y, z) {
    out[0] = x;
    out[1] = y;
    out[2] = z;
    return out;
  }
  function add(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    return out;
  }
  function subtract(out, a, b) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    return out;
  }
  function multiply(out, a, b) {
    out[0] = a[0] * b[0];
    out[1] = a[1] * b[1];
    out[2] = a[2] * b[2];
    return out;
  }
  function divide(out, a, b) {
    out[0] = a[0] / b[0];
    out[1] = a[1] / b[1];
    out[2] = a[2] / b[2];
    return out;
  }
  function ceil(out, a) {
    out[0] = Math.ceil(a[0]);
    out[1] = Math.ceil(a[1]);
    out[2] = Math.ceil(a[2]);
    return out;
  }
  function floor(out, a) {
    out[0] = Math.floor(a[0]);
    out[1] = Math.floor(a[1]);
    out[2] = Math.floor(a[2]);
    return out;
  }
  function min(out, a, b) {
    out[0] = Math.min(a[0], b[0]);
    out[1] = Math.min(a[1], b[1]);
    out[2] = Math.min(a[2], b[2]);
    return out;
  }
  function max(out, a, b) {
    out[0] = Math.max(a[0], b[0]);
    out[1] = Math.max(a[1], b[1]);
    out[2] = Math.max(a[2], b[2]);
    return out;
  }
  function round(out, a) {
    out[0] = glMatrix.round(a[0]);
    out[1] = glMatrix.round(a[1]);
    out[2] = glMatrix.round(a[2]);
    return out;
  }
  function scale(out, a, b) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    out[2] = a[2] * b;
    return out;
  }
  function scaleAndAdd(out, a, b, scale2) {
    out[0] = a[0] + b[0] * scale2;
    out[1] = a[1] + b[1] * scale2;
    out[2] = a[2] + b[2] * scale2;
    return out;
  }
  function distance(a, b) {
    var x = b[0] - a[0];
    var y = b[1] - a[1];
    var z = b[2] - a[2];
    return Math.sqrt(x * x + y * y + z * z);
  }
  function squaredDistance(a, b) {
    var x = b[0] - a[0];
    var y = b[1] - a[1];
    var z = b[2] - a[2];
    return x * x + y * y + z * z;
  }
  function squaredLength(a) {
    var x = a[0];
    var y = a[1];
    var z = a[2];
    return x * x + y * y + z * z;
  }
  function negate(out, a) {
    out[0] = -a[0];
    out[1] = -a[1];
    out[2] = -a[2];
    return out;
  }
  function inverse(out, a) {
    out[0] = 1 / a[0];
    out[1] = 1 / a[1];
    out[2] = 1 / a[2];
    return out;
  }
  function normalize(out, a) {
    var x = a[0];
    var y = a[1];
    var z = a[2];
    var len2 = x * x + y * y + z * z;
    if (len2 > 0) {
      len2 = 1 / Math.sqrt(len2);
    }
    out[0] = a[0] * len2;
    out[1] = a[1] * len2;
    out[2] = a[2] * len2;
    return out;
  }
  function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }
  function cross(out, a, b) {
    var ax = a[0], ay = a[1], az = a[2];
    var bx = b[0], by = b[1], bz = b[2];
    out[0] = ay * bz - az * by;
    out[1] = az * bx - ax * bz;
    out[2] = ax * by - ay * bx;
    return out;
  }
  function lerp(out, a, b, t) {
    var ax = a[0];
    var ay = a[1];
    var az = a[2];
    out[0] = ax + t * (b[0] - ax);
    out[1] = ay + t * (b[1] - ay);
    out[2] = az + t * (b[2] - az);
    return out;
  }
  function slerp(out, a, b, t) {
    var angle2 = Math.acos(Math.min(Math.max(dot(a, b), -1), 1));
    var sinTotal = Math.sin(angle2);
    var ratioA = Math.sin((1 - t) * angle2) / sinTotal;
    var ratioB = Math.sin(t * angle2) / sinTotal;
    out[0] = ratioA * a[0] + ratioB * b[0];
    out[1] = ratioA * a[1] + ratioB * b[1];
    out[2] = ratioA * a[2] + ratioB * b[2];
    return out;
  }
  function hermite(out, a, b, c, d, t) {
    var factorTimes2 = t * t;
    var factor1 = factorTimes2 * (2 * t - 3) + 1;
    var factor2 = factorTimes2 * (t - 2) + t;
    var factor3 = factorTimes2 * (t - 1);
    var factor4 = factorTimes2 * (3 - 2 * t);
    out[0] = a[0] * factor1 + b[0] * factor2 + c[0] * factor3 + d[0] * factor4;
    out[1] = a[1] * factor1 + b[1] * factor2 + c[1] * factor3 + d[1] * factor4;
    out[2] = a[2] * factor1 + b[2] * factor2 + c[2] * factor3 + d[2] * factor4;
    return out;
  }
  function bezier(out, a, b, c, d, t) {
    var inverseFactor = 1 - t;
    var inverseFactorTimesTwo = inverseFactor * inverseFactor;
    var factorTimes2 = t * t;
    var factor1 = inverseFactorTimesTwo * inverseFactor;
    var factor2 = 3 * t * inverseFactorTimesTwo;
    var factor3 = 3 * factorTimes2 * inverseFactor;
    var factor4 = factorTimes2 * t;
    out[0] = a[0] * factor1 + b[0] * factor2 + c[0] * factor3 + d[0] * factor4;
    out[1] = a[1] * factor1 + b[1] * factor2 + c[1] * factor3 + d[1] * factor4;
    out[2] = a[2] * factor1 + b[2] * factor2 + c[2] * factor3 + d[2] * factor4;
    return out;
  }
  function random(out, scale2) {
    scale2 = scale2 === undefined ? 1 : scale2;
    var r = glMatrix.RANDOM() * 2 * Math.PI;
    var z = glMatrix.RANDOM() * 2 - 1;
    var zScale = Math.sqrt(1 - z * z) * scale2;
    out[0] = Math.cos(r) * zScale;
    out[1] = Math.sin(r) * zScale;
    out[2] = z * scale2;
    return out;
  }
  function transformMat4(out, a, m) {
    var x = a[0], y = a[1], z = a[2];
    var w = m[3] * x + m[7] * y + m[11] * z + m[15];
    w = w || 1;
    out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
    out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
    out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
    return out;
  }
  function transformMat3(out, a, m) {
    var x = a[0], y = a[1], z = a[2];
    out[0] = x * m[0] + y * m[3] + z * m[6];
    out[1] = x * m[1] + y * m[4] + z * m[7];
    out[2] = x * m[2] + y * m[5] + z * m[8];
    return out;
  }
  function transformQuat(out, a, q) {
    var qx = q[0], qy = q[1], qz = q[2], qw = q[3];
    var vx = a[0], vy = a[1], vz = a[2];
    var tx = qy * vz - qz * vy;
    var ty = qz * vx - qx * vz;
    var tz = qx * vy - qy * vx;
    tx = tx + tx;
    ty = ty + ty;
    tz = tz + tz;
    out[0] = vx + qw * tx + qy * tz - qz * ty;
    out[1] = vy + qw * ty + qz * tx - qx * tz;
    out[2] = vz + qw * tz + qx * ty - qy * tx;
    return out;
  }
  function rotateX(out, a, b, rad) {
    var p = [], r = [];
    p[0] = a[0] - b[0];
    p[1] = a[1] - b[1];
    p[2] = a[2] - b[2];
    r[0] = p[0];
    r[1] = p[1] * Math.cos(rad) - p[2] * Math.sin(rad);
    r[2] = p[1] * Math.sin(rad) + p[2] * Math.cos(rad);
    out[0] = r[0] + b[0];
    out[1] = r[1] + b[1];
    out[2] = r[2] + b[2];
    return out;
  }
  function rotateY(out, a, b, rad) {
    var p = [], r = [];
    p[0] = a[0] - b[0];
    p[1] = a[1] - b[1];
    p[2] = a[2] - b[2];
    r[0] = p[2] * Math.sin(rad) + p[0] * Math.cos(rad);
    r[1] = p[1];
    r[2] = p[2] * Math.cos(rad) - p[0] * Math.sin(rad);
    out[0] = r[0] + b[0];
    out[1] = r[1] + b[1];
    out[2] = r[2] + b[2];
    return out;
  }
  function rotateZ(out, a, b, rad) {
    var p = [], r = [];
    p[0] = a[0] - b[0];
    p[1] = a[1] - b[1];
    p[2] = a[2] - b[2];
    r[0] = p[0] * Math.cos(rad) - p[1] * Math.sin(rad);
    r[1] = p[0] * Math.sin(rad) + p[1] * Math.cos(rad);
    r[2] = p[2];
    out[0] = r[0] + b[0];
    out[1] = r[1] + b[1];
    out[2] = r[2] + b[2];
    return out;
  }
  function angle(a, b) {
    var ax = a[0], ay = a[1], az = a[2], bx = b[0], by = b[1], bz = b[2], mag = Math.sqrt((ax * ax + ay * ay + az * az) * (bx * bx + by * by + bz * bz)), cosine = mag && dot(a, b) / mag;
    return Math.acos(Math.min(Math.max(cosine, -1), 1));
  }
  function zero(out) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    return out;
  }
  function str(a) {
    return "vec3(" + a[0] + ", " + a[1] + ", " + a[2] + ")";
  }
  function exactEquals(a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
  }
  function equals(a, b) {
    var a0 = a[0], a1 = a[1], a2 = a[2];
    var b0 = b[0], b1 = b[1], b2 = b[2];
    return Math.abs(a0 - b0) <= glMatrix.EPSILON * Math.max(1, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= glMatrix.EPSILON * Math.max(1, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= glMatrix.EPSILON * Math.max(1, Math.abs(a2), Math.abs(b2));
  }
  var sub = exports.sub = subtract;
  var mul = exports.mul = multiply;
  var div = exports.div = divide;
  var dist = exports.dist = distance;
  var sqrDist = exports.sqrDist = squaredDistance;
  var len = exports.len = length;
  var sqrLen = exports.sqrLen = squaredLength;
  var forEach = exports.forEach = function() {
    var vec = create();
    return function(a, stride, offset, count, fn, arg) {
      var i, l;
      if (!stride) {
        stride = 3;
      }
      if (!offset) {
        offset = 0;
      }
      if (count) {
        l = Math.min(count * stride + offset, a.length);
      } else {
        l = a.length;
      }
      for (i = offset;i < l; i += stride) {
        vec[0] = a[i];
        vec[1] = a[i + 1];
        vec[2] = a[i + 2];
        fn(vec, vec, arg);
        a[i] = vec[0];
        a[i + 1] = vec[1];
        a[i + 2] = vec[2];
      }
      return a;
    };
  }();
});

// node_modules/gl-matrix/cjs/vec4.js
var require_vec4 = __commonJS((exports) => {
  function _typeof(o) {
    "@babel/helpers - typeof";
    return _typeof = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(o2) {
      return typeof o2;
    } : function(o2) {
      return o2 && typeof Symbol == "function" && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
    }, _typeof(o);
  }
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.add = add;
  exports.ceil = ceil;
  exports.clone = clone;
  exports.copy = copy;
  exports.create = create;
  exports.cross = cross;
  exports.dist = undefined;
  exports.distance = distance;
  exports.div = undefined;
  exports.divide = divide;
  exports.dot = dot;
  exports.equals = equals;
  exports.exactEquals = exactEquals;
  exports.floor = floor;
  exports.forEach = undefined;
  exports.fromValues = fromValues;
  exports.inverse = inverse;
  exports.len = undefined;
  exports.length = length;
  exports.lerp = lerp;
  exports.max = max;
  exports.min = min;
  exports.mul = undefined;
  exports.multiply = multiply;
  exports.negate = negate;
  exports.normalize = normalize;
  exports.random = random;
  exports.round = round;
  exports.scale = scale;
  exports.scaleAndAdd = scaleAndAdd;
  exports.set = set;
  exports.sqrLen = exports.sqrDist = undefined;
  exports.squaredDistance = squaredDistance;
  exports.squaredLength = squaredLength;
  exports.str = str;
  exports.sub = undefined;
  exports.subtract = subtract;
  exports.transformMat4 = transformMat4;
  exports.transformQuat = transformQuat;
  exports.zero = zero;
  var glMatrix = _interopRequireWildcard(require_common());
  function _interopRequireWildcard(e, t) {
    if (typeof WeakMap == "function")
      var r = new WeakMap, n = new WeakMap;
    return (_interopRequireWildcard = function _interopRequireWildcard2(e2, t2) {
      if (!t2 && e2 && e2.__esModule)
        return e2;
      var o, i, f = { __proto__: null, default: e2 };
      if (e2 === null || _typeof(e2) != "object" && typeof e2 != "function")
        return f;
      if (o = t2 ? n : r) {
        if (o.has(e2))
          return o.get(e2);
        o.set(e2, f);
      }
      for (var _t in e2)
        _t !== "default" && {}.hasOwnProperty.call(e2, _t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e2, _t)) && (i.get || i.set) ? o(f, _t, i) : f[_t] = e2[_t]);
      return f;
    })(e, t);
  }
  function create() {
    var out = new glMatrix.ARRAY_TYPE(4);
    if (glMatrix.ARRAY_TYPE != Float32Array) {
      out[0] = 0;
      out[1] = 0;
      out[2] = 0;
      out[3] = 0;
    }
    return out;
  }
  function clone(a) {
    var out = new glMatrix.ARRAY_TYPE(4);
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    return out;
  }
  function fromValues(x, y, z, w) {
    var out = new glMatrix.ARRAY_TYPE(4);
    out[0] = x;
    out[1] = y;
    out[2] = z;
    out[3] = w;
    return out;
  }
  function copy(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    return out;
  }
  function set(out, x, y, z, w) {
    out[0] = x;
    out[1] = y;
    out[2] = z;
    out[3] = w;
    return out;
  }
  function add(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    out[3] = a[3] + b[3];
    return out;
  }
  function subtract(out, a, b) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    out[3] = a[3] - b[3];
    return out;
  }
  function multiply(out, a, b) {
    out[0] = a[0] * b[0];
    out[1] = a[1] * b[1];
    out[2] = a[2] * b[2];
    out[3] = a[3] * b[3];
    return out;
  }
  function divide(out, a, b) {
    out[0] = a[0] / b[0];
    out[1] = a[1] / b[1];
    out[2] = a[2] / b[2];
    out[3] = a[3] / b[3];
    return out;
  }
  function ceil(out, a) {
    out[0] = Math.ceil(a[0]);
    out[1] = Math.ceil(a[1]);
    out[2] = Math.ceil(a[2]);
    out[3] = Math.ceil(a[3]);
    return out;
  }
  function floor(out, a) {
    out[0] = Math.floor(a[0]);
    out[1] = Math.floor(a[1]);
    out[2] = Math.floor(a[2]);
    out[3] = Math.floor(a[3]);
    return out;
  }
  function min(out, a, b) {
    out[0] = Math.min(a[0], b[0]);
    out[1] = Math.min(a[1], b[1]);
    out[2] = Math.min(a[2], b[2]);
    out[3] = Math.min(a[3], b[3]);
    return out;
  }
  function max(out, a, b) {
    out[0] = Math.max(a[0], b[0]);
    out[1] = Math.max(a[1], b[1]);
    out[2] = Math.max(a[2], b[2]);
    out[3] = Math.max(a[3], b[3]);
    return out;
  }
  function round(out, a) {
    out[0] = glMatrix.round(a[0]);
    out[1] = glMatrix.round(a[1]);
    out[2] = glMatrix.round(a[2]);
    out[3] = glMatrix.round(a[3]);
    return out;
  }
  function scale(out, a, b) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    out[2] = a[2] * b;
    out[3] = a[3] * b;
    return out;
  }
  function scaleAndAdd(out, a, b, scale2) {
    out[0] = a[0] + b[0] * scale2;
    out[1] = a[1] + b[1] * scale2;
    out[2] = a[2] + b[2] * scale2;
    out[3] = a[3] + b[3] * scale2;
    return out;
  }
  function distance(a, b) {
    var x = b[0] - a[0];
    var y = b[1] - a[1];
    var z = b[2] - a[2];
    var w = b[3] - a[3];
    return Math.sqrt(x * x + y * y + z * z + w * w);
  }
  function squaredDistance(a, b) {
    var x = b[0] - a[0];
    var y = b[1] - a[1];
    var z = b[2] - a[2];
    var w = b[3] - a[3];
    return x * x + y * y + z * z + w * w;
  }
  function length(a) {
    var x = a[0];
    var y = a[1];
    var z = a[2];
    var w = a[3];
    return Math.sqrt(x * x + y * y + z * z + w * w);
  }
  function squaredLength(a) {
    var x = a[0];
    var y = a[1];
    var z = a[2];
    var w = a[3];
    return x * x + y * y + z * z + w * w;
  }
  function negate(out, a) {
    out[0] = -a[0];
    out[1] = -a[1];
    out[2] = -a[2];
    out[3] = -a[3];
    return out;
  }
  function inverse(out, a) {
    out[0] = 1 / a[0];
    out[1] = 1 / a[1];
    out[2] = 1 / a[2];
    out[3] = 1 / a[3];
    return out;
  }
  function normalize(out, a) {
    var x = a[0];
    var y = a[1];
    var z = a[2];
    var w = a[3];
    var len2 = x * x + y * y + z * z + w * w;
    if (len2 > 0) {
      len2 = 1 / Math.sqrt(len2);
    }
    out[0] = x * len2;
    out[1] = y * len2;
    out[2] = z * len2;
    out[3] = w * len2;
    return out;
  }
  function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  }
  function cross(out, u, v, w) {
    var A = v[0] * w[1] - v[1] * w[0], B = v[0] * w[2] - v[2] * w[0], C = v[0] * w[3] - v[3] * w[0], D = v[1] * w[2] - v[2] * w[1], E = v[1] * w[3] - v[3] * w[1], F = v[2] * w[3] - v[3] * w[2];
    var G = u[0];
    var H = u[1];
    var I = u[2];
    var J = u[3];
    out[0] = H * F - I * E + J * D;
    out[1] = -(G * F) + I * C - J * B;
    out[2] = G * E - H * C + J * A;
    out[3] = -(G * D) + H * B - I * A;
    return out;
  }
  function lerp(out, a, b, t) {
    var ax = a[0];
    var ay = a[1];
    var az = a[2];
    var aw = a[3];
    out[0] = ax + t * (b[0] - ax);
    out[1] = ay + t * (b[1] - ay);
    out[2] = az + t * (b[2] - az);
    out[3] = aw + t * (b[3] - aw);
    return out;
  }
  function random(out, scale2) {
    scale2 = scale2 === undefined ? 1 : scale2;
    var v1, v2, v3, v4;
    var s1, s2;
    var rand;
    rand = glMatrix.RANDOM();
    v1 = rand * 2 - 1;
    v2 = (4 * glMatrix.RANDOM() - 2) * Math.sqrt(rand * -rand + rand);
    s1 = v1 * v1 + v2 * v2;
    rand = glMatrix.RANDOM();
    v3 = rand * 2 - 1;
    v4 = (4 * glMatrix.RANDOM() - 2) * Math.sqrt(rand * -rand + rand);
    s2 = v3 * v3 + v4 * v4;
    var d = Math.sqrt((1 - s1) / s2);
    out[0] = scale2 * v1;
    out[1] = scale2 * v2;
    out[2] = scale2 * v3 * d;
    out[3] = scale2 * v4 * d;
    return out;
  }
  function transformMat4(out, a, m) {
    var x = a[0], y = a[1], z = a[2], w = a[3];
    out[0] = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
    out[1] = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
    out[2] = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
    out[3] = m[3] * x + m[7] * y + m[11] * z + m[15] * w;
    return out;
  }
  function transformQuat(out, a, q) {
    var qx = q[0], qy = q[1], qz = q[2], qw = q[3];
    var vx = a[0], vy = a[1], vz = a[2];
    var tx = qy * vz - qz * vy;
    var ty = qz * vx - qx * vz;
    var tz = qx * vy - qy * vx;
    tx = tx + tx;
    ty = ty + ty;
    tz = tz + tz;
    out[0] = vx + qw * tx + qy * tz - qz * ty;
    out[1] = vy + qw * ty + qz * tx - qx * tz;
    out[2] = vz + qw * tz + qx * ty - qy * tx;
    out[3] = a[3];
    return out;
  }
  function zero(out) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    return out;
  }
  function str(a) {
    return "vec4(" + a[0] + ", " + a[1] + ", " + a[2] + ", " + a[3] + ")";
  }
  function exactEquals(a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
  }
  function equals(a, b) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3];
    var b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
    return Math.abs(a0 - b0) <= glMatrix.EPSILON * Math.max(1, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= glMatrix.EPSILON * Math.max(1, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= glMatrix.EPSILON * Math.max(1, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= glMatrix.EPSILON * Math.max(1, Math.abs(a3), Math.abs(b3));
  }
  var sub = exports.sub = subtract;
  var mul = exports.mul = multiply;
  var div = exports.div = divide;
  var dist = exports.dist = distance;
  var sqrDist = exports.sqrDist = squaredDistance;
  var len = exports.len = length;
  var sqrLen = exports.sqrLen = squaredLength;
  var forEach = exports.forEach = function() {
    var vec = create();
    return function(a, stride, offset, count, fn, arg) {
      var i, l;
      if (!stride) {
        stride = 4;
      }
      if (!offset) {
        offset = 0;
      }
      if (count) {
        l = Math.min(count * stride + offset, a.length);
      } else {
        l = a.length;
      }
      for (i = offset;i < l; i += stride) {
        vec[0] = a[i];
        vec[1] = a[i + 1];
        vec[2] = a[i + 2];
        vec[3] = a[i + 3];
        fn(vec, vec, arg);
        a[i] = vec[0];
        a[i + 1] = vec[1];
        a[i + 2] = vec[2];
        a[i + 3] = vec[3];
      }
      return a;
    };
  }();
});

// node_modules/gl-matrix/cjs/quat.js
var require_quat = __commonJS((exports) => {
  function _typeof(o) {
    "@babel/helpers - typeof";
    return _typeof = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(o2) {
      return typeof o2;
    } : function(o2) {
      return o2 && typeof Symbol == "function" && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
    }, _typeof(o);
  }
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.add = undefined;
  exports.calculateW = calculateW;
  exports.clone = undefined;
  exports.conjugate = conjugate;
  exports.copy = undefined;
  exports.create = create;
  exports.dot = undefined;
  exports.equals = equals;
  exports.exactEquals = undefined;
  exports.exp = exp;
  exports.fromEuler = fromEuler;
  exports.fromMat3 = fromMat3;
  exports.fromValues = undefined;
  exports.getAngle = getAngle;
  exports.getAxisAngle = getAxisAngle;
  exports.identity = identity;
  exports.invert = invert;
  exports.lerp = exports.length = exports.len = undefined;
  exports.ln = ln;
  exports.mul = undefined;
  exports.multiply = multiply;
  exports.normalize = undefined;
  exports.pow = pow;
  exports.random = random;
  exports.rotateX = rotateX;
  exports.rotateY = rotateY;
  exports.rotateZ = rotateZ;
  exports.setAxes = exports.set = exports.scale = exports.rotationTo = undefined;
  exports.setAxisAngle = setAxisAngle;
  exports.slerp = slerp;
  exports.squaredLength = exports.sqrLen = exports.sqlerp = undefined;
  exports.str = str;
  var glMatrix = _interopRequireWildcard(require_common());
  var mat3 = _interopRequireWildcard(require_mat3());
  var vec3 = _interopRequireWildcard(require_vec3());
  var vec4 = _interopRequireWildcard(require_vec4());
  function _interopRequireWildcard(e, t) {
    if (typeof WeakMap == "function")
      var r = new WeakMap, n = new WeakMap;
    return (_interopRequireWildcard = function _interopRequireWildcard2(e2, t2) {
      if (!t2 && e2 && e2.__esModule)
        return e2;
      var o, i, f = { __proto__: null, default: e2 };
      if (e2 === null || _typeof(e2) != "object" && typeof e2 != "function")
        return f;
      if (o = t2 ? n : r) {
        if (o.has(e2))
          return o.get(e2);
        o.set(e2, f);
      }
      for (var _t in e2)
        _t !== "default" && {}.hasOwnProperty.call(e2, _t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e2, _t)) && (i.get || i.set) ? o(f, _t, i) : f[_t] = e2[_t]);
      return f;
    })(e, t);
  }
  function create() {
    var out = new glMatrix.ARRAY_TYPE(4);
    if (glMatrix.ARRAY_TYPE != Float32Array) {
      out[0] = 0;
      out[1] = 0;
      out[2] = 0;
    }
    out[3] = 1;
    return out;
  }
  function identity(out) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    return out;
  }
  function setAxisAngle(out, axis, rad) {
    rad = rad * 0.5;
    var s = Math.sin(rad);
    out[0] = s * axis[0];
    out[1] = s * axis[1];
    out[2] = s * axis[2];
    out[3] = Math.cos(rad);
    return out;
  }
  function getAxisAngle(out_axis, q) {
    var rad = Math.acos(q[3]) * 2;
    var s = Math.sin(rad / 2);
    if (s > glMatrix.EPSILON) {
      out_axis[0] = q[0] / s;
      out_axis[1] = q[1] / s;
      out_axis[2] = q[2] / s;
    } else {
      out_axis[0] = 1;
      out_axis[1] = 0;
      out_axis[2] = 0;
    }
    return rad;
  }
  function getAngle(a, b) {
    var dotproduct = dot(a, b);
    return Math.acos(2 * dotproduct * dotproduct - 1);
  }
  function multiply(out, a, b) {
    var ax = a[0], ay = a[1], az = a[2], aw = a[3];
    var bx = b[0], by = b[1], bz = b[2], bw = b[3];
    out[0] = ax * bw + aw * bx + ay * bz - az * by;
    out[1] = ay * bw + aw * by + az * bx - ax * bz;
    out[2] = az * bw + aw * bz + ax * by - ay * bx;
    out[3] = aw * bw - ax * bx - ay * by - az * bz;
    return out;
  }
  function rotateX(out, a, rad) {
    rad *= 0.5;
    var ax = a[0], ay = a[1], az = a[2], aw = a[3];
    var bx = Math.sin(rad), bw = Math.cos(rad);
    out[0] = ax * bw + aw * bx;
    out[1] = ay * bw + az * bx;
    out[2] = az * bw - ay * bx;
    out[3] = aw * bw - ax * bx;
    return out;
  }
  function rotateY(out, a, rad) {
    rad *= 0.5;
    var ax = a[0], ay = a[1], az = a[2], aw = a[3];
    var by = Math.sin(rad), bw = Math.cos(rad);
    out[0] = ax * bw - az * by;
    out[1] = ay * bw + aw * by;
    out[2] = az * bw + ax * by;
    out[3] = aw * bw - ay * by;
    return out;
  }
  function rotateZ(out, a, rad) {
    rad *= 0.5;
    var ax = a[0], ay = a[1], az = a[2], aw = a[3];
    var bz = Math.sin(rad), bw = Math.cos(rad);
    out[0] = ax * bw + ay * bz;
    out[1] = ay * bw - ax * bz;
    out[2] = az * bw + aw * bz;
    out[3] = aw * bw - az * bz;
    return out;
  }
  function calculateW(out, a) {
    var x = a[0], y = a[1], z = a[2];
    out[0] = x;
    out[1] = y;
    out[2] = z;
    out[3] = Math.sqrt(Math.abs(1 - x * x - y * y - z * z));
    return out;
  }
  function exp(out, a) {
    var x = a[0], y = a[1], z = a[2], w = a[3];
    var r = Math.sqrt(x * x + y * y + z * z);
    var et = Math.exp(w);
    var s = r > 0 ? et * Math.sin(r) / r : 0;
    out[0] = x * s;
    out[1] = y * s;
    out[2] = z * s;
    out[3] = et * Math.cos(r);
    return out;
  }
  function ln(out, a) {
    var x = a[0], y = a[1], z = a[2], w = a[3];
    var r = Math.sqrt(x * x + y * y + z * z);
    var t = r > 0 ? Math.atan2(r, w) / r : 0;
    out[0] = x * t;
    out[1] = y * t;
    out[2] = z * t;
    out[3] = 0.5 * Math.log(x * x + y * y + z * z + w * w);
    return out;
  }
  function pow(out, a, b) {
    ln(out, a);
    scale(out, out, b);
    exp(out, out);
    return out;
  }
  function slerp(out, a, b, t) {
    var ax = a[0], ay = a[1], az = a[2], aw = a[3];
    var bx = b[0], by = b[1], bz = b[2], bw = b[3];
    var omega, cosom, sinom, scale0, scale1;
    cosom = ax * bx + ay * by + az * bz + aw * bw;
    if (cosom < 0) {
      cosom = -cosom;
      bx = -bx;
      by = -by;
      bz = -bz;
      bw = -bw;
    }
    if (1 - cosom > glMatrix.EPSILON) {
      omega = Math.acos(cosom);
      sinom = Math.sin(omega);
      scale0 = Math.sin((1 - t) * omega) / sinom;
      scale1 = Math.sin(t * omega) / sinom;
    } else {
      scale0 = 1 - t;
      scale1 = t;
    }
    out[0] = scale0 * ax + scale1 * bx;
    out[1] = scale0 * ay + scale1 * by;
    out[2] = scale0 * az + scale1 * bz;
    out[3] = scale0 * aw + scale1 * bw;
    return out;
  }
  function random(out) {
    var u1 = glMatrix.RANDOM();
    var u2 = glMatrix.RANDOM();
    var u3 = glMatrix.RANDOM();
    var sqrt1MinusU1 = Math.sqrt(1 - u1);
    var sqrtU1 = Math.sqrt(u1);
    out[0] = sqrt1MinusU1 * Math.sin(2 * Math.PI * u2);
    out[1] = sqrt1MinusU1 * Math.cos(2 * Math.PI * u2);
    out[2] = sqrtU1 * Math.sin(2 * Math.PI * u3);
    out[3] = sqrtU1 * Math.cos(2 * Math.PI * u3);
    return out;
  }
  function invert(out, a) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3];
    var dot2 = a0 * a0 + a1 * a1 + a2 * a2 + a3 * a3;
    var invDot = dot2 ? 1 / dot2 : 0;
    out[0] = -a0 * invDot;
    out[1] = -a1 * invDot;
    out[2] = -a2 * invDot;
    out[3] = a3 * invDot;
    return out;
  }
  function conjugate(out, a) {
    out[0] = -a[0];
    out[1] = -a[1];
    out[2] = -a[2];
    out[3] = a[3];
    return out;
  }
  function fromMat3(out, m) {
    var fTrace = m[0] + m[4] + m[8];
    var fRoot;
    if (fTrace > 0) {
      fRoot = Math.sqrt(fTrace + 1);
      out[3] = 0.5 * fRoot;
      fRoot = 0.5 / fRoot;
      out[0] = (m[5] - m[7]) * fRoot;
      out[1] = (m[6] - m[2]) * fRoot;
      out[2] = (m[1] - m[3]) * fRoot;
    } else {
      var i = 0;
      if (m[4] > m[0])
        i = 1;
      if (m[8] > m[i * 3 + i])
        i = 2;
      var j = (i + 1) % 3;
      var k = (i + 2) % 3;
      fRoot = Math.sqrt(m[i * 3 + i] - m[j * 3 + j] - m[k * 3 + k] + 1);
      out[i] = 0.5 * fRoot;
      fRoot = 0.5 / fRoot;
      out[3] = (m[j * 3 + k] - m[k * 3 + j]) * fRoot;
      out[j] = (m[j * 3 + i] + m[i * 3 + j]) * fRoot;
      out[k] = (m[k * 3 + i] + m[i * 3 + k]) * fRoot;
    }
    return out;
  }
  function fromEuler(out, x, y, z) {
    var order = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : glMatrix.ANGLE_ORDER;
    var halfToRad = Math.PI / 360;
    x *= halfToRad;
    z *= halfToRad;
    y *= halfToRad;
    var sx = Math.sin(x);
    var cx = Math.cos(x);
    var sy = Math.sin(y);
    var cy = Math.cos(y);
    var sz = Math.sin(z);
    var cz = Math.cos(z);
    switch (order) {
      case "xyz":
        out[0] = sx * cy * cz + cx * sy * sz;
        out[1] = cx * sy * cz - sx * cy * sz;
        out[2] = cx * cy * sz + sx * sy * cz;
        out[3] = cx * cy * cz - sx * sy * sz;
        break;
      case "xzy":
        out[0] = sx * cy * cz - cx * sy * sz;
        out[1] = cx * sy * cz - sx * cy * sz;
        out[2] = cx * cy * sz + sx * sy * cz;
        out[3] = cx * cy * cz + sx * sy * sz;
        break;
      case "yxz":
        out[0] = sx * cy * cz + cx * sy * sz;
        out[1] = cx * sy * cz - sx * cy * sz;
        out[2] = cx * cy * sz - sx * sy * cz;
        out[3] = cx * cy * cz + sx * sy * sz;
        break;
      case "yzx":
        out[0] = sx * cy * cz + cx * sy * sz;
        out[1] = cx * sy * cz + sx * cy * sz;
        out[2] = cx * cy * sz - sx * sy * cz;
        out[3] = cx * cy * cz - sx * sy * sz;
        break;
      case "zxy":
        out[0] = sx * cy * cz - cx * sy * sz;
        out[1] = cx * sy * cz + sx * cy * sz;
        out[2] = cx * cy * sz + sx * sy * cz;
        out[3] = cx * cy * cz - sx * sy * sz;
        break;
      case "zyx":
        out[0] = sx * cy * cz - cx * sy * sz;
        out[1] = cx * sy * cz + sx * cy * sz;
        out[2] = cx * cy * sz - sx * sy * cz;
        out[3] = cx * cy * cz + sx * sy * sz;
        break;
      default:
        throw new Error("Unknown angle order " + order);
    }
    return out;
  }
  function str(a) {
    return "quat(" + a[0] + ", " + a[1] + ", " + a[2] + ", " + a[3] + ")";
  }
  var clone = exports.clone = vec4.clone;
  var fromValues = exports.fromValues = vec4.fromValues;
  var copy = exports.copy = vec4.copy;
  var set = exports.set = vec4.set;
  var add = exports.add = vec4.add;
  var mul = exports.mul = multiply;
  var scale = exports.scale = vec4.scale;
  var dot = exports.dot = vec4.dot;
  var lerp = exports.lerp = vec4.lerp;
  var length = exports.length = vec4.length;
  var len = exports.len = length;
  var squaredLength = exports.squaredLength = vec4.squaredLength;
  var sqrLen = exports.sqrLen = squaredLength;
  var normalize = exports.normalize = vec4.normalize;
  var exactEquals = exports.exactEquals = vec4.exactEquals;
  function equals(a, b) {
    return Math.abs(vec4.dot(a, b)) >= 1 - glMatrix.EPSILON;
  }
  var rotationTo = exports.rotationTo = function() {
    var tmpvec3 = vec3.create();
    var xUnitVec3 = vec3.fromValues(1, 0, 0);
    var yUnitVec3 = vec3.fromValues(0, 1, 0);
    return function(out, a, b) {
      var dot2 = vec3.dot(a, b);
      if (dot2 < -0.999999) {
        vec3.cross(tmpvec3, xUnitVec3, a);
        if (vec3.len(tmpvec3) < 0.000001)
          vec3.cross(tmpvec3, yUnitVec3, a);
        vec3.normalize(tmpvec3, tmpvec3);
        setAxisAngle(out, tmpvec3, Math.PI);
        return out;
      } else if (dot2 > 0.999999) {
        out[0] = 0;
        out[1] = 0;
        out[2] = 0;
        out[3] = 1;
        return out;
      } else {
        vec3.cross(tmpvec3, a, b);
        out[0] = tmpvec3[0];
        out[1] = tmpvec3[1];
        out[2] = tmpvec3[2];
        out[3] = 1 + dot2;
        return normalize(out, out);
      }
    };
  }();
  var sqlerp = exports.sqlerp = function() {
    var temp1 = create();
    var temp2 = create();
    return function(out, a, b, c, d, t) {
      slerp(temp1, a, d, t);
      slerp(temp2, b, c, t);
      slerp(out, temp1, temp2, 2 * t * (1 - t));
      return out;
    };
  }();
  var setAxes = exports.setAxes = function() {
    var matr = mat3.create();
    return function(out, view, right, up) {
      matr[0] = right[0];
      matr[3] = right[1];
      matr[6] = right[2];
      matr[1] = up[0];
      matr[4] = up[1];
      matr[7] = up[2];
      matr[2] = -view[0];
      matr[5] = -view[1];
      matr[8] = -view[2];
      return normalize(out, fromMat3(out, matr));
    };
  }();
});

// node_modules/gl-matrix/cjs/quat2.js
var require_quat2 = __commonJS((exports) => {
  function _typeof(o) {
    "@babel/helpers - typeof";
    return _typeof = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(o2) {
      return typeof o2;
    } : function(o2) {
      return o2 && typeof Symbol == "function" && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
    }, _typeof(o);
  }
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.add = add;
  exports.clone = clone;
  exports.conjugate = conjugate;
  exports.copy = copy;
  exports.create = create;
  exports.dot = undefined;
  exports.equals = equals;
  exports.exactEquals = exactEquals;
  exports.fromMat4 = fromMat4;
  exports.fromRotation = fromRotation;
  exports.fromRotationTranslation = fromRotationTranslation;
  exports.fromRotationTranslationValues = fromRotationTranslationValues;
  exports.fromTranslation = fromTranslation;
  exports.fromValues = fromValues;
  exports.getDual = getDual;
  exports.getReal = undefined;
  exports.getTranslation = getTranslation;
  exports.identity = identity;
  exports.invert = invert;
  exports.length = exports.len = undefined;
  exports.lerp = lerp;
  exports.mul = undefined;
  exports.multiply = multiply;
  exports.normalize = normalize;
  exports.rotateAroundAxis = rotateAroundAxis;
  exports.rotateByQuatAppend = rotateByQuatAppend;
  exports.rotateByQuatPrepend = rotateByQuatPrepend;
  exports.rotateX = rotateX;
  exports.rotateY = rotateY;
  exports.rotateZ = rotateZ;
  exports.scale = scale;
  exports.set = set;
  exports.setDual = setDual;
  exports.squaredLength = exports.sqrLen = exports.setReal = undefined;
  exports.str = str;
  exports.translate = translate;
  var glMatrix = _interopRequireWildcard(require_common());
  var quat = _interopRequireWildcard(require_quat());
  var mat4 = _interopRequireWildcard(require_mat4());
  function _interopRequireWildcard(e, t) {
    if (typeof WeakMap == "function")
      var r = new WeakMap, n = new WeakMap;
    return (_interopRequireWildcard = function _interopRequireWildcard2(e2, t2) {
      if (!t2 && e2 && e2.__esModule)
        return e2;
      var o, i, f = { __proto__: null, default: e2 };
      if (e2 === null || _typeof(e2) != "object" && typeof e2 != "function")
        return f;
      if (o = t2 ? n : r) {
        if (o.has(e2))
          return o.get(e2);
        o.set(e2, f);
      }
      for (var _t in e2)
        _t !== "default" && {}.hasOwnProperty.call(e2, _t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e2, _t)) && (i.get || i.set) ? o(f, _t, i) : f[_t] = e2[_t]);
      return f;
    })(e, t);
  }
  function create() {
    var dq = new glMatrix.ARRAY_TYPE(8);
    if (glMatrix.ARRAY_TYPE != Float32Array) {
      dq[0] = 0;
      dq[1] = 0;
      dq[2] = 0;
      dq[4] = 0;
      dq[5] = 0;
      dq[6] = 0;
      dq[7] = 0;
    }
    dq[3] = 1;
    return dq;
  }
  function clone(a) {
    var dq = new glMatrix.ARRAY_TYPE(8);
    dq[0] = a[0];
    dq[1] = a[1];
    dq[2] = a[2];
    dq[3] = a[3];
    dq[4] = a[4];
    dq[5] = a[5];
    dq[6] = a[6];
    dq[7] = a[7];
    return dq;
  }
  function fromValues(x1, y1, z1, w1, x2, y2, z2, w2) {
    var dq = new glMatrix.ARRAY_TYPE(8);
    dq[0] = x1;
    dq[1] = y1;
    dq[2] = z1;
    dq[3] = w1;
    dq[4] = x2;
    dq[5] = y2;
    dq[6] = z2;
    dq[7] = w2;
    return dq;
  }
  function fromRotationTranslationValues(x1, y1, z1, w1, x2, y2, z2) {
    var dq = new glMatrix.ARRAY_TYPE(8);
    dq[0] = x1;
    dq[1] = y1;
    dq[2] = z1;
    dq[3] = w1;
    var ax = x2 * 0.5, ay = y2 * 0.5, az = z2 * 0.5;
    dq[4] = ax * w1 + ay * z1 - az * y1;
    dq[5] = ay * w1 + az * x1 - ax * z1;
    dq[6] = az * w1 + ax * y1 - ay * x1;
    dq[7] = -ax * x1 - ay * y1 - az * z1;
    return dq;
  }
  function fromRotationTranslation(out, q, t) {
    var ax = t[0] * 0.5, ay = t[1] * 0.5, az = t[2] * 0.5, bx = q[0], by = q[1], bz = q[2], bw = q[3];
    out[0] = bx;
    out[1] = by;
    out[2] = bz;
    out[3] = bw;
    out[4] = ax * bw + ay * bz - az * by;
    out[5] = ay * bw + az * bx - ax * bz;
    out[6] = az * bw + ax * by - ay * bx;
    out[7] = -ax * bx - ay * by - az * bz;
    return out;
  }
  function fromTranslation(out, t) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    out[4] = t[0] * 0.5;
    out[5] = t[1] * 0.5;
    out[6] = t[2] * 0.5;
    out[7] = 0;
    return out;
  }
  function fromRotation(out, q) {
    out[0] = q[0];
    out[1] = q[1];
    out[2] = q[2];
    out[3] = q[3];
    out[4] = 0;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
    return out;
  }
  function fromMat4(out, a) {
    var outer = quat.create();
    mat4.getRotation(outer, a);
    var t = new glMatrix.ARRAY_TYPE(3);
    mat4.getTranslation(t, a);
    fromRotationTranslation(out, outer, t);
    return out;
  }
  function copy(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    return out;
  }
  function identity(out) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    out[4] = 0;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
    return out;
  }
  function set(out, x1, y1, z1, w1, x2, y2, z2, w2) {
    out[0] = x1;
    out[1] = y1;
    out[2] = z1;
    out[3] = w1;
    out[4] = x2;
    out[5] = y2;
    out[6] = z2;
    out[7] = w2;
    return out;
  }
  var getReal = exports.getReal = quat.copy;
  function getDual(out, a) {
    out[0] = a[4];
    out[1] = a[5];
    out[2] = a[6];
    out[3] = a[7];
    return out;
  }
  var setReal = exports.setReal = quat.copy;
  function setDual(out, q) {
    out[4] = q[0];
    out[5] = q[1];
    out[6] = q[2];
    out[7] = q[3];
    return out;
  }
  function getTranslation(out, a) {
    var ax = a[4], ay = a[5], az = a[6], aw = a[7], bx = -a[0], by = -a[1], bz = -a[2], bw = a[3];
    out[0] = (ax * bw + aw * bx + ay * bz - az * by) * 2;
    out[1] = (ay * bw + aw * by + az * bx - ax * bz) * 2;
    out[2] = (az * bw + aw * bz + ax * by - ay * bx) * 2;
    return out;
  }
  function translate(out, a, v) {
    var ax1 = a[0], ay1 = a[1], az1 = a[2], aw1 = a[3], bx1 = v[0] * 0.5, by1 = v[1] * 0.5, bz1 = v[2] * 0.5, ax2 = a[4], ay2 = a[5], az2 = a[6], aw2 = a[7];
    out[0] = ax1;
    out[1] = ay1;
    out[2] = az1;
    out[3] = aw1;
    out[4] = aw1 * bx1 + ay1 * bz1 - az1 * by1 + ax2;
    out[5] = aw1 * by1 + az1 * bx1 - ax1 * bz1 + ay2;
    out[6] = aw1 * bz1 + ax1 * by1 - ay1 * bx1 + az2;
    out[7] = -ax1 * bx1 - ay1 * by1 - az1 * bz1 + aw2;
    return out;
  }
  function rotateX(out, a, rad) {
    var bx = -a[0], by = -a[1], bz = -a[2], bw = a[3], ax = a[4], ay = a[5], az = a[6], aw = a[7], ax1 = ax * bw + aw * bx + ay * bz - az * by, ay1 = ay * bw + aw * by + az * bx - ax * bz, az1 = az * bw + aw * bz + ax * by - ay * bx, aw1 = aw * bw - ax * bx - ay * by - az * bz;
    quat.rotateX(out, a, rad);
    bx = out[0];
    by = out[1];
    bz = out[2];
    bw = out[3];
    out[4] = ax1 * bw + aw1 * bx + ay1 * bz - az1 * by;
    out[5] = ay1 * bw + aw1 * by + az1 * bx - ax1 * bz;
    out[6] = az1 * bw + aw1 * bz + ax1 * by - ay1 * bx;
    out[7] = aw1 * bw - ax1 * bx - ay1 * by - az1 * bz;
    return out;
  }
  function rotateY(out, a, rad) {
    var bx = -a[0], by = -a[1], bz = -a[2], bw = a[3], ax = a[4], ay = a[5], az = a[6], aw = a[7], ax1 = ax * bw + aw * bx + ay * bz - az * by, ay1 = ay * bw + aw * by + az * bx - ax * bz, az1 = az * bw + aw * bz + ax * by - ay * bx, aw1 = aw * bw - ax * bx - ay * by - az * bz;
    quat.rotateY(out, a, rad);
    bx = out[0];
    by = out[1];
    bz = out[2];
    bw = out[3];
    out[4] = ax1 * bw + aw1 * bx + ay1 * bz - az1 * by;
    out[5] = ay1 * bw + aw1 * by + az1 * bx - ax1 * bz;
    out[6] = az1 * bw + aw1 * bz + ax1 * by - ay1 * bx;
    out[7] = aw1 * bw - ax1 * bx - ay1 * by - az1 * bz;
    return out;
  }
  function rotateZ(out, a, rad) {
    var bx = -a[0], by = -a[1], bz = -a[2], bw = a[3], ax = a[4], ay = a[5], az = a[6], aw = a[7], ax1 = ax * bw + aw * bx + ay * bz - az * by, ay1 = ay * bw + aw * by + az * bx - ax * bz, az1 = az * bw + aw * bz + ax * by - ay * bx, aw1 = aw * bw - ax * bx - ay * by - az * bz;
    quat.rotateZ(out, a, rad);
    bx = out[0];
    by = out[1];
    bz = out[2];
    bw = out[3];
    out[4] = ax1 * bw + aw1 * bx + ay1 * bz - az1 * by;
    out[5] = ay1 * bw + aw1 * by + az1 * bx - ax1 * bz;
    out[6] = az1 * bw + aw1 * bz + ax1 * by - ay1 * bx;
    out[7] = aw1 * bw - ax1 * bx - ay1 * by - az1 * bz;
    return out;
  }
  function rotateByQuatAppend(out, a, q) {
    var qx = q[0], qy = q[1], qz = q[2], qw = q[3], ax = a[0], ay = a[1], az = a[2], aw = a[3];
    out[0] = ax * qw + aw * qx + ay * qz - az * qy;
    out[1] = ay * qw + aw * qy + az * qx - ax * qz;
    out[2] = az * qw + aw * qz + ax * qy - ay * qx;
    out[3] = aw * qw - ax * qx - ay * qy - az * qz;
    ax = a[4];
    ay = a[5];
    az = a[6];
    aw = a[7];
    out[4] = ax * qw + aw * qx + ay * qz - az * qy;
    out[5] = ay * qw + aw * qy + az * qx - ax * qz;
    out[6] = az * qw + aw * qz + ax * qy - ay * qx;
    out[7] = aw * qw - ax * qx - ay * qy - az * qz;
    return out;
  }
  function rotateByQuatPrepend(out, q, a) {
    var qx = q[0], qy = q[1], qz = q[2], qw = q[3], bx = a[0], by = a[1], bz = a[2], bw = a[3];
    out[0] = qx * bw + qw * bx + qy * bz - qz * by;
    out[1] = qy * bw + qw * by + qz * bx - qx * bz;
    out[2] = qz * bw + qw * bz + qx * by - qy * bx;
    out[3] = qw * bw - qx * bx - qy * by - qz * bz;
    bx = a[4];
    by = a[5];
    bz = a[6];
    bw = a[7];
    out[4] = qx * bw + qw * bx + qy * bz - qz * by;
    out[5] = qy * bw + qw * by + qz * bx - qx * bz;
    out[6] = qz * bw + qw * bz + qx * by - qy * bx;
    out[7] = qw * bw - qx * bx - qy * by - qz * bz;
    return out;
  }
  function rotateAroundAxis(out, a, axis, rad) {
    if (Math.abs(rad) < glMatrix.EPSILON) {
      return copy(out, a);
    }
    var axisLength = Math.sqrt(axis[0] * axis[0] + axis[1] * axis[1] + axis[2] * axis[2]);
    rad = rad * 0.5;
    var s = Math.sin(rad);
    var bx = s * axis[0] / axisLength;
    var by = s * axis[1] / axisLength;
    var bz = s * axis[2] / axisLength;
    var bw = Math.cos(rad);
    var ax1 = a[0], ay1 = a[1], az1 = a[2], aw1 = a[3];
    out[0] = ax1 * bw + aw1 * bx + ay1 * bz - az1 * by;
    out[1] = ay1 * bw + aw1 * by + az1 * bx - ax1 * bz;
    out[2] = az1 * bw + aw1 * bz + ax1 * by - ay1 * bx;
    out[3] = aw1 * bw - ax1 * bx - ay1 * by - az1 * bz;
    var ax = a[4], ay = a[5], az = a[6], aw = a[7];
    out[4] = ax * bw + aw * bx + ay * bz - az * by;
    out[5] = ay * bw + aw * by + az * bx - ax * bz;
    out[6] = az * bw + aw * bz + ax * by - ay * bx;
    out[7] = aw * bw - ax * bx - ay * by - az * bz;
    return out;
  }
  function add(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    out[3] = a[3] + b[3];
    out[4] = a[4] + b[4];
    out[5] = a[5] + b[5];
    out[6] = a[6] + b[6];
    out[7] = a[7] + b[7];
    return out;
  }
  function multiply(out, a, b) {
    var ax0 = a[0], ay0 = a[1], az0 = a[2], aw0 = a[3], bx1 = b[4], by1 = b[5], bz1 = b[6], bw1 = b[7], ax1 = a[4], ay1 = a[5], az1 = a[6], aw1 = a[7], bx0 = b[0], by0 = b[1], bz0 = b[2], bw0 = b[3];
    out[0] = ax0 * bw0 + aw0 * bx0 + ay0 * bz0 - az0 * by0;
    out[1] = ay0 * bw0 + aw0 * by0 + az0 * bx0 - ax0 * bz0;
    out[2] = az0 * bw0 + aw0 * bz0 + ax0 * by0 - ay0 * bx0;
    out[3] = aw0 * bw0 - ax0 * bx0 - ay0 * by0 - az0 * bz0;
    out[4] = ax0 * bw1 + aw0 * bx1 + ay0 * bz1 - az0 * by1 + ax1 * bw0 + aw1 * bx0 + ay1 * bz0 - az1 * by0;
    out[5] = ay0 * bw1 + aw0 * by1 + az0 * bx1 - ax0 * bz1 + ay1 * bw0 + aw1 * by0 + az1 * bx0 - ax1 * bz0;
    out[6] = az0 * bw1 + aw0 * bz1 + ax0 * by1 - ay0 * bx1 + az1 * bw0 + aw1 * bz0 + ax1 * by0 - ay1 * bx0;
    out[7] = aw0 * bw1 - ax0 * bx1 - ay0 * by1 - az0 * bz1 + aw1 * bw0 - ax1 * bx0 - ay1 * by0 - az1 * bz0;
    return out;
  }
  var mul = exports.mul = multiply;
  function scale(out, a, b) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    out[2] = a[2] * b;
    out[3] = a[3] * b;
    out[4] = a[4] * b;
    out[5] = a[5] * b;
    out[6] = a[6] * b;
    out[7] = a[7] * b;
    return out;
  }
  var dot = exports.dot = quat.dot;
  function lerp(out, a, b, t) {
    var mt = 1 - t;
    if (dot(a, b) < 0)
      t = -t;
    out[0] = a[0] * mt + b[0] * t;
    out[1] = a[1] * mt + b[1] * t;
    out[2] = a[2] * mt + b[2] * t;
    out[3] = a[3] * mt + b[3] * t;
    out[4] = a[4] * mt + b[4] * t;
    out[5] = a[5] * mt + b[5] * t;
    out[6] = a[6] * mt + b[6] * t;
    out[7] = a[7] * mt + b[7] * t;
    return out;
  }
  function invert(out, a) {
    var sqlen = squaredLength(a);
    out[0] = -a[0] / sqlen;
    out[1] = -a[1] / sqlen;
    out[2] = -a[2] / sqlen;
    out[3] = a[3] / sqlen;
    out[4] = -a[4] / sqlen;
    out[5] = -a[5] / sqlen;
    out[6] = -a[6] / sqlen;
    out[7] = a[7] / sqlen;
    return out;
  }
  function conjugate(out, a) {
    out[0] = -a[0];
    out[1] = -a[1];
    out[2] = -a[2];
    out[3] = a[3];
    out[4] = -a[4];
    out[5] = -a[5];
    out[6] = -a[6];
    out[7] = a[7];
    return out;
  }
  var length = exports.length = quat.length;
  var len = exports.len = length;
  var squaredLength = exports.squaredLength = quat.squaredLength;
  var sqrLen = exports.sqrLen = squaredLength;
  function normalize(out, a) {
    var magnitude = squaredLength(a);
    if (magnitude > 0) {
      magnitude = Math.sqrt(magnitude);
      var a0 = a[0] / magnitude;
      var a1 = a[1] / magnitude;
      var a2 = a[2] / magnitude;
      var a3 = a[3] / magnitude;
      var b0 = a[4];
      var b1 = a[5];
      var b2 = a[6];
      var b3 = a[7];
      var a_dot_b = a0 * b0 + a1 * b1 + a2 * b2 + a3 * b3;
      out[0] = a0;
      out[1] = a1;
      out[2] = a2;
      out[3] = a3;
      out[4] = (b0 - a0 * a_dot_b) / magnitude;
      out[5] = (b1 - a1 * a_dot_b) / magnitude;
      out[6] = (b2 - a2 * a_dot_b) / magnitude;
      out[7] = (b3 - a3 * a_dot_b) / magnitude;
    }
    return out;
  }
  function str(a) {
    return "quat2(" + a[0] + ", " + a[1] + ", " + a[2] + ", " + a[3] + ", " + a[4] + ", " + a[5] + ", " + a[6] + ", " + a[7] + ")";
  }
  function exactEquals(a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3] && a[4] === b[4] && a[5] === b[5] && a[6] === b[6] && a[7] === b[7];
  }
  function equals(a, b) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3], a4 = a[4], a5 = a[5], a6 = a[6], a7 = a[7];
    var b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3], b4 = b[4], b5 = b[5], b6 = b[6], b7 = b[7];
    return Math.abs(a0 - b0) <= glMatrix.EPSILON * Math.max(1, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= glMatrix.EPSILON * Math.max(1, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= glMatrix.EPSILON * Math.max(1, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= glMatrix.EPSILON * Math.max(1, Math.abs(a3), Math.abs(b3)) && Math.abs(a4 - b4) <= glMatrix.EPSILON * Math.max(1, Math.abs(a4), Math.abs(b4)) && Math.abs(a5 - b5) <= glMatrix.EPSILON * Math.max(1, Math.abs(a5), Math.abs(b5)) && Math.abs(a6 - b6) <= glMatrix.EPSILON * Math.max(1, Math.abs(a6), Math.abs(b6)) && Math.abs(a7 - b7) <= glMatrix.EPSILON * Math.max(1, Math.abs(a7), Math.abs(b7));
  }
});

// node_modules/gl-matrix/cjs/vec2.js
var require_vec2 = __commonJS((exports) => {
  function _typeof(o) {
    "@babel/helpers - typeof";
    return _typeof = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(o2) {
      return typeof o2;
    } : function(o2) {
      return o2 && typeof Symbol == "function" && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
    }, _typeof(o);
  }
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.add = add;
  exports.angle = angle;
  exports.ceil = ceil;
  exports.clone = clone;
  exports.copy = copy;
  exports.create = create;
  exports.cross = cross;
  exports.dist = undefined;
  exports.distance = distance;
  exports.div = undefined;
  exports.divide = divide;
  exports.dot = dot;
  exports.equals = equals;
  exports.exactEquals = exactEquals;
  exports.floor = floor;
  exports.forEach = undefined;
  exports.fromValues = fromValues;
  exports.inverse = inverse;
  exports.len = undefined;
  exports.length = length;
  exports.lerp = lerp;
  exports.max = max;
  exports.min = min;
  exports.mul = undefined;
  exports.multiply = multiply;
  exports.negate = negate;
  exports.normalize = normalize;
  exports.random = random;
  exports.rotate = rotate;
  exports.round = round;
  exports.scale = scale;
  exports.scaleAndAdd = scaleAndAdd;
  exports.set = set;
  exports.signedAngle = signedAngle;
  exports.sqrLen = exports.sqrDist = undefined;
  exports.squaredDistance = squaredDistance;
  exports.squaredLength = squaredLength;
  exports.str = str;
  exports.sub = undefined;
  exports.subtract = subtract;
  exports.transformMat2 = transformMat2;
  exports.transformMat2d = transformMat2d;
  exports.transformMat3 = transformMat3;
  exports.transformMat4 = transformMat4;
  exports.zero = zero;
  var glMatrix = _interopRequireWildcard(require_common());
  function _interopRequireWildcard(e, t) {
    if (typeof WeakMap == "function")
      var r = new WeakMap, n = new WeakMap;
    return (_interopRequireWildcard = function _interopRequireWildcard2(e2, t2) {
      if (!t2 && e2 && e2.__esModule)
        return e2;
      var o, i, f = { __proto__: null, default: e2 };
      if (e2 === null || _typeof(e2) != "object" && typeof e2 != "function")
        return f;
      if (o = t2 ? n : r) {
        if (o.has(e2))
          return o.get(e2);
        o.set(e2, f);
      }
      for (var _t in e2)
        _t !== "default" && {}.hasOwnProperty.call(e2, _t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e2, _t)) && (i.get || i.set) ? o(f, _t, i) : f[_t] = e2[_t]);
      return f;
    })(e, t);
  }
  function create() {
    var out = new glMatrix.ARRAY_TYPE(2);
    if (glMatrix.ARRAY_TYPE != Float32Array) {
      out[0] = 0;
      out[1] = 0;
    }
    return out;
  }
  function clone(a) {
    var out = new glMatrix.ARRAY_TYPE(2);
    out[0] = a[0];
    out[1] = a[1];
    return out;
  }
  function fromValues(x, y) {
    var out = new glMatrix.ARRAY_TYPE(2);
    out[0] = x;
    out[1] = y;
    return out;
  }
  function copy(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    return out;
  }
  function set(out, x, y) {
    out[0] = x;
    out[1] = y;
    return out;
  }
  function add(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    return out;
  }
  function subtract(out, a, b) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    return out;
  }
  function multiply(out, a, b) {
    out[0] = a[0] * b[0];
    out[1] = a[1] * b[1];
    return out;
  }
  function divide(out, a, b) {
    out[0] = a[0] / b[0];
    out[1] = a[1] / b[1];
    return out;
  }
  function ceil(out, a) {
    out[0] = Math.ceil(a[0]);
    out[1] = Math.ceil(a[1]);
    return out;
  }
  function floor(out, a) {
    out[0] = Math.floor(a[0]);
    out[1] = Math.floor(a[1]);
    return out;
  }
  function min(out, a, b) {
    out[0] = Math.min(a[0], b[0]);
    out[1] = Math.min(a[1], b[1]);
    return out;
  }
  function max(out, a, b) {
    out[0] = Math.max(a[0], b[0]);
    out[1] = Math.max(a[1], b[1]);
    return out;
  }
  function round(out, a) {
    out[0] = glMatrix.round(a[0]);
    out[1] = glMatrix.round(a[1]);
    return out;
  }
  function scale(out, a, b) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    return out;
  }
  function scaleAndAdd(out, a, b, scale2) {
    out[0] = a[0] + b[0] * scale2;
    out[1] = a[1] + b[1] * scale2;
    return out;
  }
  function distance(a, b) {
    var x = b[0] - a[0], y = b[1] - a[1];
    return Math.sqrt(x * x + y * y);
  }
  function squaredDistance(a, b) {
    var x = b[0] - a[0], y = b[1] - a[1];
    return x * x + y * y;
  }
  function length(a) {
    var x = a[0], y = a[1];
    return Math.sqrt(x * x + y * y);
  }
  function squaredLength(a) {
    var x = a[0], y = a[1];
    return x * x + y * y;
  }
  function negate(out, a) {
    out[0] = -a[0];
    out[1] = -a[1];
    return out;
  }
  function inverse(out, a) {
    out[0] = 1 / a[0];
    out[1] = 1 / a[1];
    return out;
  }
  function normalize(out, a) {
    var x = a[0], y = a[1];
    var len2 = x * x + y * y;
    if (len2 > 0) {
      len2 = 1 / Math.sqrt(len2);
    }
    out[0] = a[0] * len2;
    out[1] = a[1] * len2;
    return out;
  }
  function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1];
  }
  function cross(out, a, b) {
    var z = a[0] * b[1] - a[1] * b[0];
    out[0] = out[1] = 0;
    out[2] = z;
    return out;
  }
  function lerp(out, a, b, t) {
    var ax = a[0], ay = a[1];
    out[0] = ax + t * (b[0] - ax);
    out[1] = ay + t * (b[1] - ay);
    return out;
  }
  function random(out, scale2) {
    scale2 = scale2 === undefined ? 1 : scale2;
    var r = glMatrix.RANDOM() * 2 * Math.PI;
    out[0] = Math.cos(r) * scale2;
    out[1] = Math.sin(r) * scale2;
    return out;
  }
  function transformMat2(out, a, m) {
    var x = a[0], y = a[1];
    out[0] = m[0] * x + m[2] * y;
    out[1] = m[1] * x + m[3] * y;
    return out;
  }
  function transformMat2d(out, a, m) {
    var x = a[0], y = a[1];
    out[0] = m[0] * x + m[2] * y + m[4];
    out[1] = m[1] * x + m[3] * y + m[5];
    return out;
  }
  function transformMat3(out, a, m) {
    var x = a[0], y = a[1];
    out[0] = m[0] * x + m[3] * y + m[6];
    out[1] = m[1] * x + m[4] * y + m[7];
    return out;
  }
  function transformMat4(out, a, m) {
    var x = a[0];
    var y = a[1];
    out[0] = m[0] * x + m[4] * y + m[12];
    out[1] = m[1] * x + m[5] * y + m[13];
    return out;
  }
  function rotate(out, a, b, rad) {
    var p0 = a[0] - b[0], p1 = a[1] - b[1], sinC = Math.sin(rad), cosC = Math.cos(rad);
    out[0] = p0 * cosC - p1 * sinC + b[0];
    out[1] = p0 * sinC + p1 * cosC + b[1];
    return out;
  }
  function angle(a, b) {
    var ax = a[0], ay = a[1], bx = b[0], by = b[1];
    return Math.abs(Math.atan2(ay * bx - ax * by, ax * bx + ay * by));
  }
  function signedAngle(a, b) {
    var ax = a[0], ay = a[1], bx = b[0], by = b[1];
    return Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
  }
  function zero(out) {
    out[0] = 0;
    out[1] = 0;
    return out;
  }
  function str(a) {
    return "vec2(" + a[0] + ", " + a[1] + ")";
  }
  function exactEquals(a, b) {
    return a[0] === b[0] && a[1] === b[1];
  }
  function equals(a, b) {
    var a0 = a[0], a1 = a[1];
    var b0 = b[0], b1 = b[1];
    return Math.abs(a0 - b0) <= glMatrix.EPSILON * Math.max(1, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= glMatrix.EPSILON * Math.max(1, Math.abs(a1), Math.abs(b1));
  }
  var len = exports.len = length;
  var sub = exports.sub = subtract;
  var mul = exports.mul = multiply;
  var div = exports.div = divide;
  var dist = exports.dist = distance;
  var sqrDist = exports.sqrDist = squaredDistance;
  var sqrLen = exports.sqrLen = squaredLength;
  var forEach = exports.forEach = function() {
    var vec = create();
    return function(a, stride, offset, count, fn, arg) {
      var i, l;
      if (!stride) {
        stride = 2;
      }
      if (!offset) {
        offset = 0;
      }
      if (count) {
        l = Math.min(count * stride + offset, a.length);
      } else {
        l = a.length;
      }
      for (i = offset;i < l; i += stride) {
        vec[0] = a[i];
        vec[1] = a[i + 1];
        fn(vec, vec, arg);
        a[i] = vec[0];
        a[i + 1] = vec[1];
      }
      return a;
    };
  }();
});

// node_modules/gl-matrix/cjs/index.js
var require_cjs = __commonJS((exports) => {
  function _typeof(o) {
    "@babel/helpers - typeof";
    return _typeof = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(o2) {
      return typeof o2;
    } : function(o2) {
      return o2 && typeof Symbol == "function" && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
    }, _typeof(o);
  }
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.vec4 = exports.vec3 = exports.vec2 = exports.quat2 = exports.quat = exports.mat4 = exports.mat3 = exports.mat2d = exports.mat2 = exports.glMatrix = undefined;
  var glMatrix = _interopRequireWildcard(require_common());
  exports.glMatrix = glMatrix;
  var mat2 = _interopRequireWildcard(require_mat2());
  exports.mat2 = mat2;
  var mat2d = _interopRequireWildcard(require_mat2d());
  exports.mat2d = mat2d;
  var mat3 = _interopRequireWildcard(require_mat3());
  exports.mat3 = mat3;
  var mat4 = _interopRequireWildcard(require_mat4());
  exports.mat4 = mat4;
  var quat = _interopRequireWildcard(require_quat());
  exports.quat = quat;
  var quat2 = _interopRequireWildcard(require_quat2());
  exports.quat2 = quat2;
  var vec2 = _interopRequireWildcard(require_vec2());
  exports.vec2 = vec2;
  var vec3 = _interopRequireWildcard(require_vec3());
  exports.vec3 = vec3;
  var vec4 = _interopRequireWildcard(require_vec4());
  exports.vec4 = vec4;
  function _interopRequireWildcard(e, t) {
    if (typeof WeakMap == "function")
      var r = new WeakMap, n = new WeakMap;
    return (_interopRequireWildcard = function _interopRequireWildcard2(e2, t2) {
      if (!t2 && e2 && e2.__esModule)
        return e2;
      var o, i, f = { __proto__: null, default: e2 };
      if (e2 === null || _typeof(e2) != "object" && typeof e2 != "function")
        return f;
      if (o = t2 ? n : r) {
        if (o.has(e2))
          return o.get(e2);
        o.set(e2, f);
      }
      for (var _t in e2)
        _t !== "default" && {}.hasOwnProperty.call(e2, _t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e2, _t)) && (i.get || i.set) ? o(f, _t, i) : f[_t] = e2[_t]);
      return f;
    })(e, t);
  }
});

// node_modules/fflate/esm/index.mjs
import { createRequire as createRequire2 } from "module";
function deflateSync(data, opts) {
  return dopt(data, opts || {}, 0, 0);
}
function zlibSync(data, opts) {
  if (!opts)
    opts = {};
  var a = adler();
  a.p(data);
  var d = dopt(data, opts, opts.dictionary ? 6 : 2, 4);
  return zlh(d, opts), wbytes(d, d.length - 4, a.d()), d;
}
function unzlibSync(data, opts) {
  return inflt(data.subarray(zls(data, opts && opts.dictionary), -4), { i: 2 }, opts && opts.out, opts && opts.dictionary);
}
function strToU8(str, latin1) {
  if (latin1) {
    var ar_1 = new u8(str.length);
    for (var i2 = 0;i2 < str.length; ++i2)
      ar_1[i2] = str.charCodeAt(i2);
    return ar_1;
  }
  if (te)
    return te.encode(str);
  var l = str.length;
  var ar = new u8(str.length + (str.length >> 1));
  var ai = 0;
  var w = function(v) {
    ar[ai++] = v;
  };
  for (var i2 = 0;i2 < l; ++i2) {
    if (ai + 5 > ar.length) {
      var n = new u8(ai + 8 + (l - i2 << 1));
      n.set(ar);
      ar = n;
    }
    var c = str.charCodeAt(i2);
    if (c < 128 || latin1)
      w(c);
    else if (c < 2048)
      w(192 | c >> 6), w(128 | c & 63);
    else if (c > 55295 && c < 57344)
      c = 65536 + (c & 1023 << 10) | str.charCodeAt(++i2) & 1023, w(240 | c >> 18), w(128 | c >> 12 & 63), w(128 | c >> 6 & 63), w(128 | c & 63);
    else
      w(224 | c >> 12), w(128 | c >> 6 & 63), w(128 | c & 63);
  }
  return slc(ar, 0, ai);
}
function zipSync(data, opts) {
  if (!opts)
    opts = {};
  var r = {};
  var files = [];
  fltn(data, "", r, opts);
  var o = 0;
  var tot = 0;
  for (var fn in r) {
    var _a2 = r[fn], file = _a2[0], p = _a2[1];
    var compression = p.level == 0 ? 0 : 8;
    var f = strToU8(fn), s = f.length;
    var com = p.comment, m = com && strToU8(com), ms = m && m.length;
    var exl = exfl(p.extra);
    if (s > 65535)
      err(11);
    var d = compression ? deflateSync(file, p) : file, l = d.length;
    var c = crc();
    c.p(file);
    files.push(mrg(p, {
      size: file.length,
      crc: c.d(),
      c: d,
      f,
      m,
      u: s != fn.length || m && com.length != ms,
      o,
      compression
    }));
    o += 30 + s + exl + l;
    tot += 76 + 2 * (s + exl) + (ms || 0) + l;
  }
  var out = new u8(tot + 22), oe = o, cdl = tot - o;
  for (var i2 = 0;i2 < files.length; ++i2) {
    var f = files[i2];
    wzh(out, f.o, f, f.f, f.u, f.c.length);
    var badd = 30 + f.f.length + exfl(f.extra);
    out.set(f.c, f.o + badd);
    wzh(out, o, f, f.f, f.u, f.c.length, f.o, f.m), o += 16 + badd + (f.m ? f.m.length : 0);
  }
  wzf(out, o, files.length, cdl, oe);
  return out;
}
var require2, _a, Worker, isMarkedAsUntransferable, u8, u16, i32, fleb, fdeb, clim, freb = function(eb, start) {
  var b = new u16(31);
  for (var i = 0;i < 31; ++i) {
    b[i] = start += 1 << eb[i - 1];
  }
  var r = new i32(b[30]);
  for (var i = 1;i < 30; ++i) {
    for (var j = b[i];j < b[i + 1]; ++j) {
      r[j] = j - b[i] << 5 | i;
    }
  }
  return { b, r };
}, _a, fl, revfl, _b, fd, revfd, rev, x, i, hMap = function(cd, mb, r) {
  var s = cd.length;
  var i2 = 0;
  var l = new u16(mb);
  for (;i2 < s; ++i2) {
    if (cd[i2])
      ++l[cd[i2] - 1];
  }
  var le = new u16(mb);
  for (i2 = 1;i2 < mb; ++i2) {
    le[i2] = le[i2 - 1] + l[i2 - 1] << 1;
  }
  var co;
  if (r) {
    co = new u16(1 << mb);
    var rvb = 15 - mb;
    for (i2 = 0;i2 < s; ++i2) {
      if (cd[i2]) {
        var sv = i2 << 4 | cd[i2];
        var r_1 = mb - cd[i2];
        var v = le[cd[i2] - 1]++ << r_1;
        for (var m = v | (1 << r_1) - 1;v <= m; ++v) {
          co[rev[v] >> rvb] = sv;
        }
      }
    }
  } else {
    co = new u16(s);
    for (i2 = 0;i2 < s; ++i2) {
      if (cd[i2]) {
        co[i2] = rev[le[cd[i2] - 1]++] >> 15 - cd[i2];
      }
    }
  }
  return co;
}, flt, i, i, i, i, fdt, i, flm, flrm, fdm, fdrm, max = function(a) {
  var m = a[0];
  for (var i2 = 1;i2 < a.length; ++i2) {
    if (a[i2] > m)
      m = a[i2];
  }
  return m;
}, bits = function(d, p, m) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8) >> (p & 7) & m;
}, bits16 = function(d, p) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8 | d[o + 2] << 16) >> (p & 7);
}, shft = function(p) {
  return (p + 7) / 8 | 0;
}, slc = function(v, s, e) {
  if (s == null || s < 0)
    s = 0;
  if (e == null || e > v.length)
    e = v.length;
  return new u8(v.subarray(s, e));
}, ec, err = function(ind, msg, nt) {
  var e = new Error(msg || ec[ind]);
  e.code = ind;
  if (Error.captureStackTrace)
    Error.captureStackTrace(e, err);
  if (!nt)
    throw e;
  return e;
}, inflt = function(dat, st, buf, dict) {
  var sl = dat.length, dl = dict ? dict.length : 0;
  if (!sl || st.f && !st.l)
    return buf || new u8(0);
  var noBuf = !buf;
  var resize = noBuf || st.i != 2;
  var noSt = st.i;
  if (noBuf)
    buf = new u8(sl * 3);
  var cbuf = function(l2) {
    var bl = buf.length;
    if (l2 > bl) {
      var nbuf = new u8(Math.max(bl * 2, l2));
      nbuf.set(buf);
      buf = nbuf;
    }
  };
  var final = st.f || 0, pos = st.p || 0, bt = st.b || 0, lm = st.l, dm = st.d, lbt = st.m, dbt = st.n;
  var tbts = sl * 8;
  do {
    if (!lm) {
      final = bits(dat, pos, 1);
      var type = bits(dat, pos + 1, 3);
      pos += 3;
      if (!type) {
        var s = shft(pos) + 4, l = dat[s - 4] | dat[s - 3] << 8, t = s + l;
        if (t > sl) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + l);
        buf.set(dat.subarray(s, t), bt);
        st.b = bt += l, st.p = pos = t * 8, st.f = final;
        continue;
      } else if (type == 1)
        lm = flrm, dm = fdrm, lbt = 9, dbt = 5;
      else if (type == 2) {
        var hLit = bits(dat, pos, 31) + 257, hcLen = bits(dat, pos + 10, 15) + 4;
        var tl = hLit + bits(dat, pos + 5, 31) + 1;
        pos += 14;
        var ldt = new u8(tl);
        var clt = new u8(19);
        for (var i2 = 0;i2 < hcLen; ++i2) {
          clt[clim[i2]] = bits(dat, pos + i2 * 3, 7);
        }
        pos += hcLen * 3;
        var clb = max(clt), clbmsk = (1 << clb) - 1;
        var clm = hMap(clt, clb, 1);
        for (var i2 = 0;i2 < tl; ) {
          var r = clm[bits(dat, pos, clbmsk)];
          pos += r & 15;
          var s = r >> 4;
          if (s < 16) {
            ldt[i2++] = s;
          } else {
            var c = 0, n = 0;
            if (s == 16)
              n = 3 + bits(dat, pos, 3), pos += 2, c = ldt[i2 - 1];
            else if (s == 17)
              n = 3 + bits(dat, pos, 7), pos += 3;
            else if (s == 18)
              n = 11 + bits(dat, pos, 127), pos += 7;
            while (n--)
              ldt[i2++] = c;
          }
        }
        var lt = ldt.subarray(0, hLit), dt = ldt.subarray(hLit);
        lbt = max(lt);
        dbt = max(dt);
        lm = hMap(lt, lbt, 1);
        dm = hMap(dt, dbt, 1);
      } else
        err(1);
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
    }
    if (resize)
      cbuf(bt + 131072);
    var lms = (1 << lbt) - 1, dms = (1 << dbt) - 1;
    var lpos = pos;
    for (;; lpos = pos) {
      var c = lm[bits16(dat, pos) & lms], sym = c >> 4;
      pos += c & 15;
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
      if (!c)
        err(2);
      if (sym < 256)
        buf[bt++] = sym;
      else if (sym == 256) {
        lpos = pos, lm = null;
        break;
      } else {
        var add = sym - 254;
        if (sym > 264) {
          var i2 = sym - 257, b = fleb[i2];
          add = bits(dat, pos, (1 << b) - 1) + fl[i2];
          pos += b;
        }
        var d = dm[bits16(dat, pos) & dms], dsym = d >> 4;
        if (!d)
          err(3);
        pos += d & 15;
        var dt = fd[dsym];
        if (dsym > 3) {
          var b = fdeb[dsym];
          dt += bits16(dat, pos) & (1 << b) - 1, pos += b;
        }
        if (pos > tbts) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + 131072);
        var end = bt + add;
        if (bt < dt) {
          var shift = dl - dt, dend = Math.min(dt, end);
          if (shift + bt < 0)
            err(3);
          for (;bt < dend; ++bt)
            buf[bt] = dict[shift + bt];
        }
        for (;bt < end; ++bt)
          buf[bt] = buf[bt - dt];
      }
    }
    st.l = lm, st.p = lpos, st.b = bt, st.f = final;
    if (lm)
      final = 1, st.m = lbt, st.d = dm, st.n = dbt;
  } while (!final);
  return bt != buf.length && noBuf ? slc(buf, 0, bt) : buf.subarray(0, bt);
}, wbits = function(d, p, v) {
  v <<= p & 7;
  var o = p / 8 | 0;
  d[o] |= v;
  d[o + 1] |= v >> 8;
}, wbits16 = function(d, p, v) {
  v <<= p & 7;
  var o = p / 8 | 0;
  d[o] |= v;
  d[o + 1] |= v >> 8;
  d[o + 2] |= v >> 16;
}, hTree = function(d, mb) {
  var t = [];
  for (var i2 = 0;i2 < d.length; ++i2) {
    if (d[i2])
      t.push({ s: i2, f: d[i2] });
  }
  var s = t.length;
  var t2 = t.slice();
  if (!s)
    return { t: et, l: 0 };
  if (s == 1) {
    var v = new u8(t[0].s + 1);
    v[t[0].s] = 1;
    return { t: v, l: 1 };
  }
  t.sort(function(a, b) {
    return a.f - b.f;
  });
  t.push({ s: -1, f: 25001 });
  var l = t[0], r = t[1], i0 = 0, i1 = 1, i22 = 2;
  t[0] = { s: -1, f: l.f + r.f, l, r };
  while (i1 != s - 1) {
    l = t[t[i0].f < t[i22].f ? i0++ : i22++];
    r = t[i0 != i1 && t[i0].f < t[i22].f ? i0++ : i22++];
    t[i1++] = { s: -1, f: l.f + r.f, l, r };
  }
  var maxSym = t2[0].s;
  for (var i2 = 1;i2 < s; ++i2) {
    if (t2[i2].s > maxSym)
      maxSym = t2[i2].s;
  }
  var tr = new u16(maxSym + 1);
  var mbt = ln(t[i1 - 1], tr, 0);
  if (mbt > mb) {
    var i2 = 0, dt = 0;
    var lft = mbt - mb, cst = 1 << lft;
    t2.sort(function(a, b) {
      return tr[b.s] - tr[a.s] || a.f - b.f;
    });
    for (;i2 < s; ++i2) {
      var i2_1 = t2[i2].s;
      if (tr[i2_1] > mb) {
        dt += cst - (1 << mbt - tr[i2_1]);
        tr[i2_1] = mb;
      } else
        break;
    }
    dt >>= lft;
    while (dt > 0) {
      var i2_2 = t2[i2].s;
      if (tr[i2_2] < mb)
        dt -= 1 << mb - tr[i2_2]++ - 1;
      else
        ++i2;
    }
    for (;i2 >= 0 && dt; --i2) {
      var i2_3 = t2[i2].s;
      if (tr[i2_3] == mb) {
        --tr[i2_3];
        ++dt;
      }
    }
    mbt = mb;
  }
  return { t: new u8(tr), l: mbt };
}, ln = function(n, l, d) {
  return n.s == -1 ? Math.max(ln(n.l, l, d + 1), ln(n.r, l, d + 1)) : l[n.s] = d;
}, lc = function(c) {
  var s = c.length;
  while (s && !c[--s])
    ;
  var cl = new u16(++s);
  var cli = 0, cln = c[0], cls = 1;
  var w = function(v) {
    cl[cli++] = v;
  };
  for (var i2 = 1;i2 <= s; ++i2) {
    if (c[i2] == cln && i2 != s)
      ++cls;
    else {
      if (!cln && cls > 2) {
        for (;cls > 138; cls -= 138)
          w(32754);
        if (cls > 2) {
          w(cls > 10 ? cls - 11 << 5 | 28690 : cls - 3 << 5 | 12305);
          cls = 0;
        }
      } else if (cls > 3) {
        w(cln), --cls;
        for (;cls > 6; cls -= 6)
          w(8304);
        if (cls > 2)
          w(cls - 3 << 5 | 8208), cls = 0;
      }
      while (cls--)
        w(cln);
      cls = 1;
      cln = c[i2];
    }
  }
  return { c: cl.subarray(0, cli), n: s };
}, clen = function(cf, cl) {
  var l = 0;
  for (var i2 = 0;i2 < cl.length; ++i2)
    l += cf[i2] * cl[i2];
  return l;
}, wfblk = function(out, pos, dat) {
  var s = dat.length;
  var o = shft(pos + 2);
  out[o] = s & 255;
  out[o + 1] = s >> 8;
  out[o + 2] = out[o] ^ 255;
  out[o + 3] = out[o + 1] ^ 255;
  for (var i2 = 0;i2 < s; ++i2)
    out[o + i2 + 4] = dat[i2];
  return (o + 4 + s) * 8;
}, wblk = function(dat, out, final, syms, lf, df, eb, li, bs, bl, p) {
  wbits(out, p++, final);
  ++lf[256];
  var _a2 = hTree(lf, 15), dlt = _a2.t, mlb = _a2.l;
  var _b2 = hTree(df, 15), ddt = _b2.t, mdb = _b2.l;
  var _c = lc(dlt), lclt = _c.c, nlc = _c.n;
  var _d = lc(ddt), lcdt = _d.c, ndc = _d.n;
  var lcfreq = new u16(19);
  for (var i2 = 0;i2 < lclt.length; ++i2)
    ++lcfreq[lclt[i2] & 31];
  for (var i2 = 0;i2 < lcdt.length; ++i2)
    ++lcfreq[lcdt[i2] & 31];
  var _e = hTree(lcfreq, 7), lct = _e.t, mlcb = _e.l;
  var nlcc = 19;
  for (;nlcc > 4 && !lct[clim[nlcc - 1]]; --nlcc)
    ;
  var flen = bl + 5 << 3;
  var ftlen = clen(lf, flt) + clen(df, fdt) + eb;
  var dtlen = clen(lf, dlt) + clen(df, ddt) + eb + 14 + 3 * nlcc + clen(lcfreq, lct) + 2 * lcfreq[16] + 3 * lcfreq[17] + 7 * lcfreq[18];
  if (bs >= 0 && flen <= ftlen && flen <= dtlen)
    return wfblk(out, p, dat.subarray(bs, bs + bl));
  var lm, ll, dm, dl;
  wbits(out, p, 1 + (dtlen < ftlen)), p += 2;
  if (dtlen < ftlen) {
    lm = hMap(dlt, mlb, 0), ll = dlt, dm = hMap(ddt, mdb, 0), dl = ddt;
    var llm = hMap(lct, mlcb, 0);
    wbits(out, p, nlc - 257);
    wbits(out, p + 5, ndc - 1);
    wbits(out, p + 10, nlcc - 4);
    p += 14;
    for (var i2 = 0;i2 < nlcc; ++i2)
      wbits(out, p + 3 * i2, lct[clim[i2]]);
    p += 3 * nlcc;
    var lcts = [lclt, lcdt];
    for (var it = 0;it < 2; ++it) {
      var clct = lcts[it];
      for (var i2 = 0;i2 < clct.length; ++i2) {
        var len = clct[i2] & 31;
        wbits(out, p, llm[len]), p += lct[len];
        if (len > 15)
          wbits(out, p, clct[i2] >> 5 & 127), p += clct[i2] >> 12;
      }
    }
  } else {
    lm = flm, ll = flt, dm = fdm, dl = fdt;
  }
  for (var i2 = 0;i2 < li; ++i2) {
    var sym = syms[i2];
    if (sym > 255) {
      var len = sym >> 18 & 31;
      wbits16(out, p, lm[len + 257]), p += ll[len + 257];
      if (len > 7)
        wbits(out, p, sym >> 23 & 31), p += fleb[len];
      var dst = sym & 31;
      wbits16(out, p, dm[dst]), p += dl[dst];
      if (dst > 3)
        wbits16(out, p, sym >> 5 & 8191), p += fdeb[dst];
    } else {
      wbits16(out, p, lm[sym]), p += ll[sym];
    }
  }
  wbits16(out, p, lm[256]);
  return p + ll[256];
}, deo, et, dflt = function(dat, lvl, plvl, pre, post, st) {
  var s = st.z || dat.length;
  var o = new u8(pre + s + 5 * (1 + Math.ceil(s / 7000)) + post);
  var w = o.subarray(pre, o.length - post);
  var lst = st.l;
  var pos = (st.r || 0) & 7;
  if (lvl) {
    if (pos)
      w[0] = st.r >> 3;
    var opt = deo[lvl - 1];
    var n = opt >> 13, c = opt & 8191;
    var msk_1 = (1 << plvl) - 1;
    var prev = st.p || new u16(32768), head = st.h || new u16(msk_1 + 1);
    var bs1_1 = Math.ceil(plvl / 3), bs2_1 = 2 * bs1_1;
    var hsh = function(i3) {
      return (dat[i3] ^ dat[i3 + 1] << bs1_1 ^ dat[i3 + 2] << bs2_1) & msk_1;
    };
    var syms = new i32(25000);
    var lf = new u16(288), df = new u16(32);
    var lc_1 = 0, eb = 0, i2 = st.i || 0, li = 0, wi = st.w || 0, bs = 0;
    for (;i2 + 2 < s; ++i2) {
      var hv = hsh(i2);
      var imod = i2 & 32767, pimod = head[hv];
      prev[imod] = pimod;
      head[hv] = imod;
      if (wi <= i2) {
        var rem = s - i2;
        if ((lc_1 > 7000 || li > 24576) && (rem > 423 || !lst)) {
          pos = wblk(dat, w, 0, syms, lf, df, eb, li, bs, i2 - bs, pos);
          li = lc_1 = eb = 0, bs = i2;
          for (var j = 0;j < 286; ++j)
            lf[j] = 0;
          for (var j = 0;j < 30; ++j)
            df[j] = 0;
        }
        var l = 2, d = 0, ch_1 = c, dif = imod - pimod & 32767;
        if (rem > 2 && hv == hsh(i2 - dif)) {
          var maxn = Math.min(n, rem) - 1;
          var maxd = Math.min(32767, i2);
          var ml = Math.min(258, rem);
          while (dif <= maxd && --ch_1 && imod != pimod) {
            if (dat[i2 + l] == dat[i2 + l - dif]) {
              var nl = 0;
              for (;nl < ml && dat[i2 + nl] == dat[i2 + nl - dif]; ++nl)
                ;
              if (nl > l) {
                l = nl, d = dif;
                if (nl > maxn)
                  break;
                var mmd = Math.min(dif, nl - 2);
                var md = 0;
                for (var j = 0;j < mmd; ++j) {
                  var ti = i2 - dif + j & 32767;
                  var pti = prev[ti];
                  var cd = ti - pti & 32767;
                  if (cd > md)
                    md = cd, pimod = ti;
                }
              }
            }
            imod = pimod, pimod = prev[imod];
            dif += imod - pimod & 32767;
          }
        }
        if (d) {
          syms[li++] = 268435456 | revfl[l] << 18 | revfd[d];
          var lin = revfl[l] & 31, din = revfd[d] & 31;
          eb += fleb[lin] + fdeb[din];
          ++lf[257 + lin];
          ++df[din];
          wi = i2 + l;
          ++lc_1;
        } else {
          syms[li++] = dat[i2];
          ++lf[dat[i2]];
        }
      }
    }
    for (i2 = Math.max(i2, wi);i2 < s; ++i2) {
      syms[li++] = dat[i2];
      ++lf[dat[i2]];
    }
    pos = wblk(dat, w, lst, syms, lf, df, eb, li, bs, i2 - bs, pos);
    if (!lst) {
      st.r = pos & 7 | w[pos / 8 | 0] << 3;
      pos -= 7;
      st.h = head, st.p = prev, st.i = i2, st.w = wi;
    }
  } else {
    for (var i2 = st.w || 0;i2 < s + lst; i2 += 65535) {
      var e = i2 + 65535;
      if (e >= s) {
        w[pos / 8 | 0] = lst;
        e = s;
      }
      pos = wfblk(w, pos + 1, dat.subarray(i2, e));
    }
    st.i = s;
  }
  return slc(o, 0, pre + shft(pos) + post);
}, crct, crc = function() {
  var c = -1;
  return {
    p: function(d) {
      var cr = c;
      for (var i2 = 0;i2 < d.length; ++i2)
        cr = crct[cr & 255 ^ d[i2]] ^ cr >>> 8;
      c = cr;
    },
    d: function() {
      return ~c;
    }
  };
}, adler = function() {
  var a = 1, b = 0;
  return {
    p: function(d) {
      var n = a, m = b;
      var l = d.length | 0;
      for (var i2 = 0;i2 != l; ) {
        var e = Math.min(i2 + 2655, l);
        for (;i2 < e; ++i2)
          m += n += d[i2];
        n = (n & 65535) + 15 * (n >> 16), m = (m & 65535) + 15 * (m >> 16);
      }
      a = n, b = m;
    },
    d: function() {
      a %= 65521, b %= 65521;
      return (a & 255) << 24 | (a & 65280) << 8 | (b & 255) << 8 | b >> 8;
    }
  };
}, dopt = function(dat, opt, pre, post, st) {
  if (!st) {
    st = { l: 1 };
    if (opt.dictionary) {
      var dict = opt.dictionary.subarray(-32768);
      var newDat = new u8(dict.length + dat.length);
      newDat.set(dict);
      newDat.set(dat, dict.length);
      dat = newDat;
      st.w = dict.length;
    }
  }
  return dflt(dat, opt.level == null ? 6 : opt.level, opt.mem == null ? st.l ? Math.ceil(Math.max(8, Math.min(13, Math.log(dat.length))) * 1.5) : 20 : 12 + opt.mem, pre, post, st);
}, mrg = function(a, b) {
  var o = {};
  for (var k in a)
    o[k] = a[k];
  for (var k in b)
    o[k] = b[k];
  return o;
}, wbytes = function(d, b, v) {
  for (;v; ++b)
    d[b] = v, v >>>= 8;
}, zlh = function(c, o) {
  var lv = o.level, fl2 = lv == 0 ? 0 : lv < 6 ? 1 : lv == 9 ? 3 : 2;
  c[0] = 120, c[1] = fl2 << 6 | (o.dictionary && 32);
  c[1] |= 31 - (c[0] << 8 | c[1]) % 31;
  if (o.dictionary) {
    var h = adler();
    h.p(o.dictionary);
    wbytes(c, 2, h.d());
  }
}, zls = function(d, dict) {
  if ((d[0] & 15) != 8 || d[0] >> 4 > 7 || (d[0] << 8 | d[1]) % 31)
    err(6, "invalid zlib data");
  if ((d[1] >> 5 & 1) == +!dict)
    err(6, "invalid zlib data: " + (d[1] & 32 ? "need" : "unexpected") + " dictionary");
  return (d[1] >> 3 & 4) + 2;
}, Inflate, Unzlib, fltn = function(d, p, t, o) {
  for (var k in d) {
    var val = d[k], n = p + k, op = o;
    if (Array.isArray(val))
      op = mrg(o, val[1]), val = val[0];
    if (ArrayBuffer.isView(val))
      t[n] = [val, op];
    else {
      t[n += "/"] = [new u8(0), op];
      fltn(val, n, t, o);
    }
  }
}, te, td, tds = 0, exfl = function(ex) {
  var le = 0;
  if (ex) {
    for (var k in ex) {
      var l = ex[k].length;
      if (l > 65535)
        err(9);
      le += l + 4;
    }
  }
  return le;
}, wzh = function(d, b, f, fn, u, c, ce, co) {
  var fl2 = fn.length, ex = f.extra, col = co && co.length;
  var exl = exfl(ex);
  wbytes(d, b, ce != null ? 33639248 : 67324752), b += 4;
  if (ce != null)
    d[b++] = 20, d[b++] = f.os;
  d[b] = 20, b += 2;
  d[b++] = f.flag << 1 | (c < 0 && 8), d[b++] = u && 8;
  d[b++] = f.compression & 255, d[b++] = f.compression >> 8;
  var dt = new Date(f.mtime == null ? Date.now() : f.mtime), y = dt.getFullYear() - 1980;
  if (y < 0 || y > 119)
    err(10);
  wbytes(d, b, y << 25 | dt.getMonth() + 1 << 21 | dt.getDate() << 16 | dt.getHours() << 11 | dt.getMinutes() << 5 | dt.getSeconds() >> 1), b += 4;
  if (c != -1) {
    wbytes(d, b, f.crc);
    wbytes(d, b + 4, c < 0 ? -c - 2 : c);
    wbytes(d, b + 8, f.size);
  }
  wbytes(d, b + 12, fl2);
  wbytes(d, b + 14, exl), b += 16;
  if (ce != null) {
    wbytes(d, b, col);
    wbytes(d, b + 6, f.attrs);
    wbytes(d, b + 10, ce), b += 14;
  }
  d.set(fn, b);
  b += fl2;
  if (exl) {
    for (var k in ex) {
      var exf = ex[k], l = exf.length;
      wbytes(d, b, +k);
      wbytes(d, b + 2, l);
      d.set(exf, b + 4), b += 4 + l;
    }
  }
  if (col)
    d.set(co, b), b += col;
  return b;
}, wzf = function(o, b, c, d, e) {
  wbytes(o, b, 101010256);
  wbytes(o, b + 8, c);
  wbytes(o, b + 10, c);
  wbytes(o, b + 12, d);
  wbytes(o, b + 16, e);
};
var init_esm = __esm(() => {
  require2 = createRequire2("/");
  try {
    _a = require2("worker_threads"), Worker = _a.Worker, isMarkedAsUntransferable = _a.isMarkedAsUntransferable;
  } catch (e) {}
  u8 = Uint8Array;
  u16 = Uint16Array;
  i32 = Int32Array;
  fleb = new u8([0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, 0, 0, 0]);
  fdeb = new u8([0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, 0, 0]);
  clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
  _a = freb(fleb, 2);
  fl = _a.b;
  revfl = _a.r;
  fl[28] = 258, revfl[258] = 28;
  _b = freb(fdeb, 0);
  fd = _b.b;
  revfd = _b.r;
  rev = new u16(32768);
  for (i = 0;i < 32768; ++i) {
    x = (i & 43690) >> 1 | (i & 21845) << 1;
    x = (x & 52428) >> 2 | (x & 13107) << 2;
    x = (x & 61680) >> 4 | (x & 3855) << 4;
    rev[i] = ((x & 65280) >> 8 | (x & 255) << 8) >> 1;
  }
  flt = new u8(288);
  for (i = 0;i < 144; ++i)
    flt[i] = 8;
  for (i = 144;i < 256; ++i)
    flt[i] = 9;
  for (i = 256;i < 280; ++i)
    flt[i] = 7;
  for (i = 280;i < 288; ++i)
    flt[i] = 8;
  fdt = new u8(32);
  for (i = 0;i < 32; ++i)
    fdt[i] = 5;
  flm = /* @__PURE__ */ hMap(flt, 9, 0);
  flrm = /* @__PURE__ */ hMap(flt, 9, 1);
  fdm = /* @__PURE__ */ hMap(fdt, 5, 0);
  fdrm = /* @__PURE__ */ hMap(fdt, 5, 1);
  ec = [
    "unexpected EOF",
    "invalid block type",
    "invalid length/literal",
    "invalid distance",
    "stream finished",
    "no stream handler",
    ,
    "no callback",
    "invalid UTF-8 data",
    "extra field too long",
    "date not in range 1980-2099",
    "filename too long",
    "stream finishing",
    "invalid zip data"
  ];
  deo = /* @__PURE__ */ new i32([65540, 131080, 131088, 131104, 262176, 1048704, 1048832, 2114560, 2117632]);
  et = /* @__PURE__ */ new u8(0);
  crct = /* @__PURE__ */ function() {
    var t = new Int32Array(256);
    for (var i2 = 0;i2 < 256; ++i2) {
      var c = i2, k = 9;
      while (--k)
        c = (c & 1 && -306674912) ^ c >>> 1;
      t[i2] = c;
    }
    return t;
  }();
  Inflate = /* @__PURE__ */ function() {
    function Inflate2(opts, cb) {
      if (typeof opts == "function")
        cb = opts, opts = {};
      this.ondata = cb;
      var dict = opts && opts.dictionary && opts.dictionary.subarray(-32768);
      this.s = { i: 0, b: dict ? dict.length : 0 };
      this.o = new u8(32768);
      this.p = new u8(0);
      if (dict)
        this.o.set(dict);
    }
    Inflate2.prototype.e = function(c) {
      if (!this.ondata)
        err(5);
      if (this.d)
        err(4);
      if (!this.p.length)
        this.p = c;
      else if (c.length) {
        var n = new u8(this.p.length + c.length);
        n.set(this.p), n.set(c, this.p.length), this.p = n;
      }
    };
    Inflate2.prototype.c = function(final) {
      this.s.i = +(this.d = final || false);
      var bts = this.s.b;
      var dt = inflt(this.p, this.s, this.o);
      this.ondata(slc(dt, bts, this.s.b), this.d);
      this.o = slc(dt, this.s.b - 32768), this.s.b = this.o.length;
      this.p = slc(this.p, this.s.p / 8 | 0), this.s.p &= 7;
    };
    Inflate2.prototype.push = function(chunk, final) {
      this.e(chunk), this.c(final);
    };
    return Inflate2;
  }();
  Unzlib = /* @__PURE__ */ function() {
    function Unzlib2(opts, cb) {
      Inflate.call(this, opts, cb);
      this.v = opts && opts.dictionary ? 2 : 1;
    }
    Unzlib2.prototype.push = function(chunk, final) {
      Inflate.prototype.e.call(this, chunk);
      if (this.v) {
        if (this.p.length < 6 && !final)
          return;
        this.p = this.p.subarray(zls(this.p, this.v - 1)), this.v = 0;
      }
      if (final) {
        if (this.p.length < 4)
          err(6, "invalid zlib data");
        this.p = this.p.subarray(0, -4);
      }
      Inflate.prototype.c.call(this, final);
    };
    return Unzlib2;
  }();
  te = typeof TextEncoder != "undefined" && /* @__PURE__ */ new TextEncoder;
  td = typeof TextDecoder != "undefined" && /* @__PURE__ */ new TextDecoder;
  try {
    td.decode(et, { stream: true });
    tds = 1;
  } catch (e) {}
});

// node_modules/iobuffer/lib/text.js
function decode(bytes, encoding = "utf8") {
  const decoder = new TextDecoder(encoding);
  return decoder.decode(bytes);
}
function encode(str) {
  return encoder.encode(str);
}
var encoder;
var init_text = __esm(() => {
  encoder = new TextEncoder;
});

// node_modules/iobuffer/lib/iobuffer.js
class IOBuffer {
  buffer;
  byteLength;
  byteOffset;
  length;
  offset;
  lastWrittenByte;
  littleEndian;
  _data;
  _mark;
  _marks;
  constructor(data = defaultByteLength, options = {}) {
    let dataIsGiven = false;
    if (typeof data === "number") {
      data = new ArrayBuffer(data);
    } else {
      dataIsGiven = true;
      this.lastWrittenByte = data.byteLength;
    }
    const offset = options.offset ? options.offset >>> 0 : 0;
    const byteLength = data.byteLength - offset;
    let dvOffset = offset;
    if (ArrayBuffer.isView(data) || data instanceof IOBuffer) {
      if (data.byteLength !== data.buffer.byteLength) {
        dvOffset = data.byteOffset + offset;
      }
      data = data.buffer;
    }
    if (dataIsGiven) {
      this.lastWrittenByte = byteLength;
    } else {
      this.lastWrittenByte = 0;
    }
    this.buffer = data;
    this.length = byteLength;
    this.byteLength = byteLength;
    this.byteOffset = dvOffset;
    this.offset = 0;
    this.littleEndian = true;
    this._data = new DataView(this.buffer, dvOffset, byteLength);
    this._mark = 0;
    this._marks = [];
  }
  available(byteLength = 1) {
    return this.offset + byteLength <= this.length;
  }
  isLittleEndian() {
    return this.littleEndian;
  }
  setLittleEndian() {
    this.littleEndian = true;
    return this;
  }
  isBigEndian() {
    return !this.littleEndian;
  }
  setBigEndian() {
    this.littleEndian = false;
    return this;
  }
  skip(n = 1) {
    this.offset += n;
    return this;
  }
  back(n = 1) {
    this.offset -= n;
    return this;
  }
  seek(offset) {
    this.offset = offset;
    return this;
  }
  mark() {
    this._mark = this.offset;
    return this;
  }
  reset() {
    this.offset = this._mark;
    return this;
  }
  pushMark() {
    this._marks.push(this.offset);
    return this;
  }
  popMark() {
    const offset = this._marks.pop();
    if (offset === undefined) {
      throw new Error("Mark stack empty");
    }
    this.seek(offset);
    return this;
  }
  rewind() {
    this.offset = 0;
    return this;
  }
  ensureAvailable(byteLength = 1) {
    if (!this.available(byteLength)) {
      const lengthNeeded = this.offset + byteLength;
      const newLength = lengthNeeded * 2;
      const newArray = new Uint8Array(newLength);
      newArray.set(new Uint8Array(this.buffer));
      this.buffer = newArray.buffer;
      this.length = newLength;
      this.byteLength = newLength;
      this._data = new DataView(this.buffer);
    }
    return this;
  }
  readBoolean() {
    return this.readUint8() !== 0;
  }
  readInt8() {
    return this._data.getInt8(this.offset++);
  }
  readUint8() {
    return this._data.getUint8(this.offset++);
  }
  readByte() {
    return this.readUint8();
  }
  readBytes(n = 1) {
    return this.readArray(n, "uint8");
  }
  readArray(size, type) {
    const bytes = typedArrays[type].BYTES_PER_ELEMENT * size;
    const offset = this.byteOffset + this.offset;
    const slice = this.buffer.slice(offset, offset + bytes);
    if (this.littleEndian === hostBigEndian && type !== "uint8" && type !== "int8") {
      const slice2 = new Uint8Array(this.buffer.slice(offset, offset + bytes));
      slice2.reverse();
      const returnArray2 = new typedArrays[type](slice2.buffer);
      this.offset += bytes;
      returnArray2.reverse();
      return returnArray2;
    }
    const returnArray = new typedArrays[type](slice);
    this.offset += bytes;
    return returnArray;
  }
  readInt16() {
    const value = this._data.getInt16(this.offset, this.littleEndian);
    this.offset += 2;
    return value;
  }
  readUint16() {
    const value = this._data.getUint16(this.offset, this.littleEndian);
    this.offset += 2;
    return value;
  }
  readInt32() {
    const value = this._data.getInt32(this.offset, this.littleEndian);
    this.offset += 4;
    return value;
  }
  readUint32() {
    const value = this._data.getUint32(this.offset, this.littleEndian);
    this.offset += 4;
    return value;
  }
  readFloat32() {
    const value = this._data.getFloat32(this.offset, this.littleEndian);
    this.offset += 4;
    return value;
  }
  readFloat64() {
    const value = this._data.getFloat64(this.offset, this.littleEndian);
    this.offset += 8;
    return value;
  }
  readBigInt64() {
    const value = this._data.getBigInt64(this.offset, this.littleEndian);
    this.offset += 8;
    return value;
  }
  readBigUint64() {
    const value = this._data.getBigUint64(this.offset, this.littleEndian);
    this.offset += 8;
    return value;
  }
  readChar() {
    return String.fromCharCode(this.readInt8());
  }
  readChars(n = 1) {
    let result = "";
    for (let i2 = 0;i2 < n; i2++) {
      result += this.readChar();
    }
    return result;
  }
  readUtf8(n = 1) {
    return decode(this.readBytes(n));
  }
  decodeText(n = 1, encoding = "utf8") {
    return decode(this.readBytes(n), encoding);
  }
  writeBoolean(value) {
    this.writeUint8(value ? 255 : 0);
    return this;
  }
  writeInt8(value) {
    this.ensureAvailable(1);
    this._data.setInt8(this.offset++, value);
    this._updateLastWrittenByte();
    return this;
  }
  writeUint8(value) {
    this.ensureAvailable(1);
    this._data.setUint8(this.offset++, value);
    this._updateLastWrittenByte();
    return this;
  }
  writeByte(value) {
    return this.writeUint8(value);
  }
  writeBytes(bytes) {
    this.ensureAvailable(bytes.length);
    for (let i2 = 0;i2 < bytes.length; i2++) {
      this._data.setUint8(this.offset++, bytes[i2]);
    }
    this._updateLastWrittenByte();
    return this;
  }
  writeInt16(value) {
    this.ensureAvailable(2);
    this._data.setInt16(this.offset, value, this.littleEndian);
    this.offset += 2;
    this._updateLastWrittenByte();
    return this;
  }
  writeUint16(value) {
    this.ensureAvailable(2);
    this._data.setUint16(this.offset, value, this.littleEndian);
    this.offset += 2;
    this._updateLastWrittenByte();
    return this;
  }
  writeInt32(value) {
    this.ensureAvailable(4);
    this._data.setInt32(this.offset, value, this.littleEndian);
    this.offset += 4;
    this._updateLastWrittenByte();
    return this;
  }
  writeUint32(value) {
    this.ensureAvailable(4);
    this._data.setUint32(this.offset, value, this.littleEndian);
    this.offset += 4;
    this._updateLastWrittenByte();
    return this;
  }
  writeFloat32(value) {
    this.ensureAvailable(4);
    this._data.setFloat32(this.offset, value, this.littleEndian);
    this.offset += 4;
    this._updateLastWrittenByte();
    return this;
  }
  writeFloat64(value) {
    this.ensureAvailable(8);
    this._data.setFloat64(this.offset, value, this.littleEndian);
    this.offset += 8;
    this._updateLastWrittenByte();
    return this;
  }
  writeBigInt64(value) {
    this.ensureAvailable(8);
    this._data.setBigInt64(this.offset, value, this.littleEndian);
    this.offset += 8;
    this._updateLastWrittenByte();
    return this;
  }
  writeBigUint64(value) {
    this.ensureAvailable(8);
    this._data.setBigUint64(this.offset, value, this.littleEndian);
    this.offset += 8;
    this._updateLastWrittenByte();
    return this;
  }
  writeChar(str) {
    return this.writeUint8(str.charCodeAt(0));
  }
  writeChars(str) {
    for (let i2 = 0;i2 < str.length; i2++) {
      this.writeUint8(str.charCodeAt(i2));
    }
    return this;
  }
  writeUtf8(str) {
    return this.writeBytes(encode(str));
  }
  toArray() {
    return new Uint8Array(this.buffer, this.byteOffset, this.lastWrittenByte);
  }
  getWrittenByteLength() {
    return this.lastWrittenByte - this.byteOffset;
  }
  _updateLastWrittenByte() {
    if (this.offset > this.lastWrittenByte) {
      this.lastWrittenByte = this.offset;
    }
  }
}
var defaultByteLength, hostBigEndian, typedArrays;
var init_iobuffer = __esm(() => {
  init_text();
  defaultByteLength = 1024 * 8;
  hostBigEndian = (() => {
    const array = new Uint8Array(4);
    const view = new Uint32Array(array.buffer);
    return !((view[0] = 1) & array[0]);
  })();
  typedArrays = {
    int8: globalThis.Int8Array,
    uint8: globalThis.Uint8Array,
    int16: globalThis.Int16Array,
    uint16: globalThis.Uint16Array,
    int32: globalThis.Int32Array,
    uint32: globalThis.Uint32Array,
    uint64: globalThis.BigUint64Array,
    int64: globalThis.BigInt64Array,
    float32: globalThis.Float32Array,
    float64: globalThis.Float64Array
  };
});

// node_modules/fast-png/lib/helpers/crc.js
function updateCrc(currentCrc, data, length) {
  let c = currentCrc;
  for (let n = 0;n < length; n++) {
    c = crcTable[(c ^ data[n]) & 255] ^ c >>> 8;
  }
  return c;
}
function crc2(data, length) {
  return (updateCrc(initialCrc, data, length) ^ initialCrc) >>> 0;
}
function checkCrc(buffer, crcLength, chunkName) {
  const expectedCrc = buffer.readUint32();
  const actualCrc = crc2(new Uint8Array(buffer.buffer, buffer.byteOffset + buffer.offset - crcLength - 4, crcLength), crcLength);
  if (actualCrc !== expectedCrc) {
    throw new Error(`CRC mismatch for chunk ${chunkName}. Expected ${expectedCrc}, found ${actualCrc}`);
  }
}
function writeCrc(buffer, length) {
  buffer.writeUint32(crc2(new Uint8Array(buffer.buffer, buffer.byteOffset + buffer.offset - length, length), length));
}
var crcTable, initialCrc = 4294967295;
var init_crc = __esm(() => {
  crcTable = [];
  for (let n = 0;n < 256; n++) {
    let c = n;
    for (let k = 0;k < 8; k++) {
      if (c & 1) {
        c = 3988292384 ^ c >>> 1;
      } else {
        c = c >>> 1;
      }
    }
    crcTable[n] = c;
  }
});

// node_modules/fast-png/lib/helpers/unfilter.js
function unfilterNone(currentLine, newLine, bytesPerLine) {
  for (let i2 = 0;i2 < bytesPerLine; i2++) {
    newLine[i2] = currentLine[i2];
  }
}
function unfilterSub(currentLine, newLine, bytesPerLine, bytesPerPixel) {
  let i2 = 0;
  for (;i2 < bytesPerPixel; i2++) {
    newLine[i2] = currentLine[i2];
  }
  for (;i2 < bytesPerLine; i2++) {
    newLine[i2] = currentLine[i2] + newLine[i2 - bytesPerPixel] & 255;
  }
}
function unfilterUp(currentLine, newLine, prevLine, bytesPerLine) {
  let i2 = 0;
  if (prevLine.length === 0) {
    for (;i2 < bytesPerLine; i2++) {
      newLine[i2] = currentLine[i2];
    }
  } else {
    for (;i2 < bytesPerLine; i2++) {
      newLine[i2] = currentLine[i2] + prevLine[i2] & 255;
    }
  }
}
function unfilterAverage(currentLine, newLine, prevLine, bytesPerLine, bytesPerPixel) {
  let i2 = 0;
  if (prevLine.length === 0) {
    for (;i2 < bytesPerPixel; i2++) {
      newLine[i2] = currentLine[i2];
    }
    for (;i2 < bytesPerLine; i2++) {
      newLine[i2] = currentLine[i2] + (newLine[i2 - bytesPerPixel] >> 1) & 255;
    }
  } else {
    for (;i2 < bytesPerPixel; i2++) {
      newLine[i2] = currentLine[i2] + (prevLine[i2] >> 1) & 255;
    }
    for (;i2 < bytesPerLine; i2++) {
      newLine[i2] = currentLine[i2] + (newLine[i2 - bytesPerPixel] + prevLine[i2] >> 1) & 255;
    }
  }
}
function unfilterPaeth(currentLine, newLine, prevLine, bytesPerLine, bytesPerPixel) {
  let i2 = 0;
  if (prevLine.length === 0) {
    for (;i2 < bytesPerPixel; i2++) {
      newLine[i2] = currentLine[i2];
    }
    for (;i2 < bytesPerLine; i2++) {
      newLine[i2] = currentLine[i2] + newLine[i2 - bytesPerPixel] & 255;
    }
  } else {
    for (;i2 < bytesPerPixel; i2++) {
      newLine[i2] = currentLine[i2] + prevLine[i2] & 255;
    }
    for (;i2 < bytesPerLine; i2++) {
      newLine[i2] = currentLine[i2] + paethPredictor(newLine[i2 - bytesPerPixel], prevLine[i2], prevLine[i2 - bytesPerPixel]) & 255;
    }
  }
}
function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc)
    return a;
  else if (pb <= pc)
    return b;
  else
    return c;
}

// node_modules/fast-png/lib/helpers/apply_unfilter.js
function applyUnfilter(filterType, currentLine, newLine, prevLine, passLineBytes, bytesPerPixel) {
  switch (filterType) {
    case 0:
      unfilterNone(currentLine, newLine, passLineBytes);
      break;
    case 1:
      unfilterSub(currentLine, newLine, passLineBytes, bytesPerPixel);
      break;
    case 2:
      unfilterUp(currentLine, newLine, prevLine, passLineBytes);
      break;
    case 3:
      unfilterAverage(currentLine, newLine, prevLine, passLineBytes, bytesPerPixel);
      break;
    case 4:
      unfilterPaeth(currentLine, newLine, prevLine, passLineBytes, bytesPerPixel);
      break;
    default:
      throw new Error(`Unsupported filter: ${filterType}`);
  }
}
var init_apply_unfilter = () => {};

// node_modules/fast-png/lib/helpers/decode_interlace_adam7.js
function decodeInterlaceAdam7(params) {
  const { data, width, height, channels, depth } = params;
  const passes = [
    { x: 0, y: 0, xStep: 8, yStep: 8 },
    { x: 4, y: 0, xStep: 8, yStep: 8 },
    { x: 0, y: 4, xStep: 4, yStep: 8 },
    { x: 2, y: 0, xStep: 4, yStep: 4 },
    { x: 0, y: 2, xStep: 2, yStep: 4 },
    { x: 1, y: 0, xStep: 2, yStep: 2 },
    { x: 0, y: 1, xStep: 1, yStep: 2 }
  ];
  const bytesPerPixel = Math.ceil(depth / 8) * channels;
  const resultData = new Uint8Array(height * width * bytesPerPixel);
  let offset = 0;
  for (let passIndex = 0;passIndex < 7; passIndex++) {
    const pass = passes[passIndex];
    const passWidth = Math.ceil((width - pass.x) / pass.xStep);
    const passHeight = Math.ceil((height - pass.y) / pass.yStep);
    if (passWidth <= 0 || passHeight <= 0)
      continue;
    const passLineBytes = passWidth * bytesPerPixel;
    const prevLine = new Uint8Array(passLineBytes);
    for (let y = 0;y < passHeight; y++) {
      const filterType = data[offset++];
      const currentLine = data.subarray(offset, offset + passLineBytes);
      offset += passLineBytes;
      const newLine = new Uint8Array(passLineBytes);
      applyUnfilter(filterType, currentLine, newLine, prevLine, passLineBytes, bytesPerPixel);
      prevLine.set(newLine);
      for (let x2 = 0;x2 < passWidth; x2++) {
        const outputX = pass.x + x2 * pass.xStep;
        const outputY = pass.y + y * pass.yStep;
        if (outputX >= width || outputY >= height)
          continue;
        for (let i2 = 0;i2 < bytesPerPixel; i2++) {
          resultData[(outputY * width + outputX) * bytesPerPixel + i2] = newLine[x2 * bytesPerPixel + i2];
        }
      }
    }
  }
  if (depth === 16) {
    const uint16Data = new Uint16Array(resultData.buffer);
    if (osIsLittleEndian) {
      for (let k = 0;k < uint16Data.length; k++) {
        uint16Data[k] = swap16(uint16Data[k]);
      }
    }
    return uint16Data;
  } else {
    return resultData;
  }
}
function swap16(val) {
  return (val & 255) << 8 | val >> 8 & 255;
}
var uint16, uint8, osIsLittleEndian;
var init_decode_interlace_adam7 = __esm(() => {
  init_apply_unfilter();
  uint16 = new Uint16Array([255]);
  uint8 = new Uint8Array(uint16.buffer);
  osIsLittleEndian = uint8[0] === 255;
});

// node_modules/fast-png/lib/helpers/decode_interlace_null.js
function decodeInterlaceNull(params) {
  const { data, width, height, channels, depth } = params;
  const bytesPerPixel = Math.ceil(depth / 8) * channels;
  const bytesPerLine = Math.ceil(depth / 8 * channels * width);
  const newData = new Uint8Array(height * bytesPerLine);
  let prevLine = empty;
  let offset = 0;
  let currentLine;
  let newLine;
  for (let i2 = 0;i2 < height; i2++) {
    currentLine = data.subarray(offset + 1, offset + 1 + bytesPerLine);
    newLine = newData.subarray(i2 * bytesPerLine, (i2 + 1) * bytesPerLine);
    switch (data[offset]) {
      case 0:
        unfilterNone(currentLine, newLine, bytesPerLine);
        break;
      case 1:
        unfilterSub(currentLine, newLine, bytesPerLine, bytesPerPixel);
        break;
      case 2:
        unfilterUp(currentLine, newLine, prevLine, bytesPerLine);
        break;
      case 3:
        unfilterAverage(currentLine, newLine, prevLine, bytesPerLine, bytesPerPixel);
        break;
      case 4:
        unfilterPaeth(currentLine, newLine, prevLine, bytesPerLine, bytesPerPixel);
        break;
      default:
        throw new Error(`Unsupported filter: ${data[offset]}`);
    }
    prevLine = newLine;
    offset += bytesPerLine + 1;
  }
  if (depth === 16) {
    const uint16Data = new Uint16Array(newData.buffer);
    if (osIsLittleEndian2) {
      for (let k = 0;k < uint16Data.length; k++) {
        uint16Data[k] = swap162(uint16Data[k]);
      }
    }
    return uint16Data;
  } else {
    return newData;
  }
}
function swap162(val) {
  return (val & 255) << 8 | val >> 8 & 255;
}
var uint162, uint82, osIsLittleEndian2, empty;
var init_decode_interlace_null = __esm(() => {
  uint162 = new Uint16Array([255]);
  uint82 = new Uint8Array(uint162.buffer);
  osIsLittleEndian2 = uint82[0] === 255;
  empty = new Uint8Array(0);
});

// node_modules/fast-png/lib/helpers/signature.js
function writeSignature(buffer) {
  buffer.writeBytes(pngSignature);
}
function checkSignature(buffer) {
  if (!hasPngSignature(buffer.readBytes(pngSignature.length))) {
    throw new Error("wrong PNG signature");
  }
}
function hasPngSignature(array) {
  if (array.length < pngSignature.length) {
    return false;
  }
  for (let i2 = 0;i2 < pngSignature.length; i2++) {
    if (array[i2] !== pngSignature[i2]) {
      return false;
    }
  }
  return true;
}
var pngSignature;
var init_signature = __esm(() => {
  pngSignature = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10);
});

// node_modules/fast-png/lib/helpers/text.js
function validateKeyword(keyword) {
  validateLatin1(keyword);
  if (keyword.length === 0 || keyword.length > 79) {
    throw new Error("keyword length must be between 1 and 79");
  }
}
function validateLatin1(text) {
  if (!latin1Regex.test(text)) {
    throw new Error("invalid latin1 text");
  }
}
function decodetEXt(text, buffer, length) {
  const keyword = readKeyword(buffer);
  text[keyword] = readLatin1(buffer, length - keyword.length - 1);
}
function encodetEXt(buffer, keyword, text) {
  validateKeyword(keyword);
  validateLatin1(text);
  const length = keyword.length + 1 + text.length;
  buffer.writeUint32(length);
  buffer.writeChars(textChunkName);
  buffer.writeChars(keyword);
  buffer.writeByte(NULL);
  buffer.writeChars(text);
  writeCrc(buffer, length + 4);
}
function readKeyword(buffer) {
  buffer.mark();
  while (buffer.readByte() !== NULL) {}
  const end = buffer.offset;
  buffer.reset();
  const keyword = latin1Decoder.decode(buffer.readBytes(end - buffer.offset - 1));
  buffer.skip(1);
  validateKeyword(keyword);
  return keyword;
}
function readLatin1(buffer, length) {
  return latin1Decoder.decode(buffer.readBytes(length));
}
var textChunkName = "tEXt", NULL = 0, latin1Decoder, latin1Regex;
var init_text2 = __esm(() => {
  init_crc();
  latin1Decoder = new TextDecoder("latin1");
  latin1Regex = /^[\u0000-\u00FF]*$/;
});

// node_modules/fast-png/lib/internal_types.js
var ColorType, CompressionMethod, FilterMethod, InterlaceMethod, DisposeOpType, BlendOpType;
var init_internal_types = __esm(() => {
  ColorType = {
    UNKNOWN: -1,
    GREYSCALE: 0,
    TRUECOLOUR: 2,
    INDEXED_COLOUR: 3,
    GREYSCALE_ALPHA: 4,
    TRUECOLOUR_ALPHA: 6
  };
  CompressionMethod = {
    UNKNOWN: -1,
    DEFLATE: 0
  };
  FilterMethod = {
    UNKNOWN: -1,
    ADAPTIVE: 0
  };
  InterlaceMethod = {
    UNKNOWN: -1,
    NO_INTERLACE: 0,
    ADAM7: 1
  };
  DisposeOpType = {
    NONE: 0,
    BACKGROUND: 1,
    PREVIOUS: 2
  };
  BlendOpType = {
    SOURCE: 0,
    OVER: 1
  };
});

// node_modules/fast-png/lib/png_decoder.js
function checkBitDepth(value) {
  if (value !== 1 && value !== 2 && value !== 4 && value !== 8 && value !== 16) {
    throw new Error(`invalid bit depth: ${value}`);
  }
  return value;
}
var PngDecoder;
var init_png_decoder = __esm(() => {
  init_esm();
  init_iobuffer();
  init_crc();
  init_decode_interlace_adam7();
  init_decode_interlace_null();
  init_signature();
  init_text2();
  init_internal_types();
  PngDecoder = class PngDecoder extends IOBuffer {
    _checkCrc;
    _inflator;
    _png;
    _apng;
    _end;
    _hasPalette;
    _palette;
    _hasTransparency;
    _transparency;
    _compressionMethod;
    _filterMethod;
    _interlaceMethod;
    _colorType;
    _isAnimated;
    _numberOfFrames;
    _numberOfPlays;
    _frames;
    _writingDataChunks;
    _chunks;
    _inflatorResult;
    constructor(data, options = {}) {
      super(data);
      const { checkCrc: checkCrc2 = false } = options;
      this._checkCrc = checkCrc2;
      this._inflator = new Unzlib((chunk, final) => {
        this._chunks.push(chunk);
        if (final) {
          const totalLength = this._chunks.reduce((sum, c) => sum + c.length, 0);
          this._inflatorResult = new Uint8Array(totalLength);
          let offset = 0;
          for (const chunk2 of this._chunks) {
            this._inflatorResult.set(chunk2, offset);
            offset += chunk2.length;
          }
          this._chunks = [];
        }
      });
      this._chunks = [];
      this._png = {
        width: -1,
        height: -1,
        channels: -1,
        data: new Uint8Array(0),
        depth: 1,
        text: {}
      };
      this._apng = {
        width: -1,
        height: -1,
        channels: -1,
        depth: 1,
        numberOfFrames: 1,
        numberOfPlays: 0,
        text: {},
        frames: []
      };
      this._end = false;
      this._hasPalette = false;
      this._palette = [];
      this._hasTransparency = false;
      this._transparency = new Uint16Array(0);
      this._compressionMethod = CompressionMethod.UNKNOWN;
      this._filterMethod = FilterMethod.UNKNOWN;
      this._interlaceMethod = InterlaceMethod.UNKNOWN;
      this._colorType = ColorType.UNKNOWN;
      this._isAnimated = false;
      this._numberOfFrames = 1;
      this._numberOfPlays = 0;
      this._frames = [];
      this._writingDataChunks = false;
      this._inflatorResult = new Uint8Array(0);
      this.setBigEndian();
    }
    decode() {
      checkSignature(this);
      while (!this._end) {
        const length = this.readUint32();
        const type = this.readChars(4);
        this.decodeChunk(length, type);
      }
      this._inflator.push(new Uint8Array(0), true);
      this.decodeImage();
      return this._png;
    }
    decodeApng() {
      checkSignature(this);
      while (!this._end) {
        const length = this.readUint32();
        const type = this.readChars(4);
        this.decodeApngChunk(length, type);
      }
      this.decodeApngImage();
      return this._apng;
    }
    decodeChunk(length, type) {
      const offset = this.offset;
      switch (type) {
        case "IHDR":
          this.decodeIHDR();
          break;
        case "PLTE":
          this.decodePLTE(length);
          break;
        case "IDAT":
          this.decodeIDAT(length);
          break;
        case "IEND":
          this._end = true;
          break;
        case "tRNS":
          this.decodetRNS(length);
          break;
        case "iCCP":
          this.decodeiCCP(length);
          break;
        case textChunkName:
          decodetEXt(this._png.text, this, length);
          break;
        case "pHYs":
          this.decodepHYs();
          break;
        default:
          this.skip(length);
          break;
      }
      if (this.offset - offset !== length) {
        throw new Error(`Length mismatch while decoding chunk ${type}`);
      }
      if (this._checkCrc) {
        checkCrc(this, length + 4, type);
      } else {
        this.skip(4);
      }
    }
    decodeApngChunk(length, type) {
      const offset = this.offset;
      if (type !== "fdAT" && type !== "IDAT" && this._writingDataChunks) {
        this.pushDataToFrame();
      }
      switch (type) {
        case "acTL":
          this.decodeACTL();
          break;
        case "fcTL":
          this.decodeFCTL();
          break;
        case "fdAT":
          this.decodeFDAT(length);
          break;
        default:
          this.decodeChunk(length, type);
          this.offset = offset + length;
          break;
      }
      if (this.offset - offset !== length) {
        throw new Error(`Length mismatch while decoding chunk ${type}`);
      }
      if (this._checkCrc) {
        checkCrc(this, length + 4, type);
      } else {
        this.skip(4);
      }
    }
    decodeIHDR() {
      const image = this._png;
      image.width = this.readUint32();
      image.height = this.readUint32();
      image.depth = checkBitDepth(this.readUint8());
      const colorType = this.readUint8();
      this._colorType = colorType;
      let channels;
      switch (colorType) {
        case ColorType.GREYSCALE:
          channels = 1;
          break;
        case ColorType.TRUECOLOUR:
          channels = 3;
          break;
        case ColorType.INDEXED_COLOUR:
          channels = 1;
          break;
        case ColorType.GREYSCALE_ALPHA:
          channels = 2;
          break;
        case ColorType.TRUECOLOUR_ALPHA:
          channels = 4;
          break;
        case ColorType.UNKNOWN:
        default:
          throw new Error(`Unknown color type: ${colorType}`);
      }
      this._png.channels = channels;
      this._compressionMethod = this.readUint8();
      if (this._compressionMethod !== CompressionMethod.DEFLATE) {
        throw new Error(`Unsupported compression method: ${this._compressionMethod}`);
      }
      this._filterMethod = this.readUint8();
      this._interlaceMethod = this.readUint8();
    }
    decodeACTL() {
      this._numberOfFrames = this.readUint32();
      this._numberOfPlays = this.readUint32();
      this._isAnimated = true;
    }
    decodeFCTL() {
      const image = {
        sequenceNumber: this.readUint32(),
        width: this.readUint32(),
        height: this.readUint32(),
        xOffset: this.readUint32(),
        yOffset: this.readUint32(),
        delayNumber: this.readUint16(),
        delayDenominator: this.readUint16(),
        disposeOp: this.readUint8(),
        blendOp: this.readUint8(),
        data: new Uint8Array(0)
      };
      this._frames.push(image);
    }
    decodePLTE(length) {
      if (length % 3 !== 0) {
        throw new RangeError(`PLTE field length must be a multiple of 3. Got ${length}`);
      }
      const l = length / 3;
      this._hasPalette = true;
      const palette = [];
      this._palette = palette;
      for (let i2 = 0;i2 < l; i2++) {
        palette.push([this.readUint8(), this.readUint8(), this.readUint8()]);
      }
    }
    decodeIDAT(length) {
      this._writingDataChunks = true;
      const dataLength = length;
      const dataOffset = this.offset + this.byteOffset;
      try {
        this._inflator.push(new Uint8Array(this.buffer, dataOffset, dataLength), false);
      } catch (error) {
        throw new Error("Error while decompressing the data:", { cause: error });
      }
      this.skip(length);
    }
    decodeFDAT(length) {
      this._writingDataChunks = true;
      let dataLength = length;
      let dataOffset = this.offset + this.byteOffset;
      dataOffset += 4;
      dataLength -= 4;
      try {
        this._inflator.push(new Uint8Array(this.buffer, dataOffset, dataLength), false);
      } catch (error) {
        throw new Error("Error while decompressing the data:", { cause: error });
      }
      this.skip(length);
    }
    decodetRNS(length) {
      switch (this._colorType) {
        case ColorType.GREYSCALE:
        case ColorType.TRUECOLOUR: {
          if (length % 2 !== 0) {
            throw new RangeError(`tRNS chunk length must be a multiple of 2. Got ${length}`);
          }
          if (length / 2 > this._png.width * this._png.height) {
            throw new Error(`tRNS chunk contains more alpha values than there are pixels (${length / 2} vs ${this._png.width * this._png.height})`);
          }
          this._hasTransparency = true;
          this._transparency = new Uint16Array(length / 2);
          for (let i2 = 0;i2 < length / 2; i2++) {
            this._transparency[i2] = this.readUint16();
          }
          break;
        }
        case ColorType.INDEXED_COLOUR: {
          if (length > this._palette.length) {
            throw new Error(`tRNS chunk contains more alpha values than there are palette colors (${length} vs ${this._palette.length})`);
          }
          let i2 = 0;
          for (;i2 < length; i2++) {
            const alpha = this.readByte();
            this._palette[i2].push(alpha);
          }
          for (;i2 < this._palette.length; i2++) {
            this._palette[i2].push(255);
          }
          break;
        }
        case ColorType.UNKNOWN:
        case ColorType.GREYSCALE_ALPHA:
        case ColorType.TRUECOLOUR_ALPHA:
        default: {
          throw new Error(`tRNS chunk is not supported for color type ${this._colorType}`);
        }
      }
    }
    decodeiCCP(length) {
      const name = readKeyword(this);
      const compressionMethod = this.readUint8();
      if (compressionMethod !== CompressionMethod.DEFLATE) {
        throw new Error(`Unsupported iCCP compression method: ${compressionMethod}`);
      }
      const compressedProfile = this.readBytes(length - name.length - 2);
      this._png.iccEmbeddedProfile = {
        name,
        profile: unzlibSync(compressedProfile)
      };
    }
    decodepHYs() {
      const ppuX = this.readUint32();
      const ppuY = this.readUint32();
      const unitSpecifier = this.readByte();
      this._png.resolution = {
        x: ppuX,
        y: ppuY,
        unit: unitSpecifier
      };
    }
    decodeApngImage() {
      this._apng.width = this._png.width;
      this._apng.height = this._png.height;
      this._apng.channels = this._png.channels;
      this._apng.depth = this._png.depth;
      this._apng.numberOfFrames = this._numberOfFrames;
      this._apng.numberOfPlays = this._numberOfPlays;
      this._apng.text = this._png.text;
      this._apng.resolution = this._png.resolution;
      for (let i2 = 0;i2 < this._numberOfFrames; i2++) {
        const newFrame = {
          sequenceNumber: this._frames[i2].sequenceNumber,
          delayNumber: this._frames[i2].delayNumber,
          delayDenominator: this._frames[i2].delayDenominator,
          data: this._apng.depth === 8 ? new Uint8Array(this._apng.width * this._apng.height * this._apng.channels) : new Uint16Array(this._apng.width * this._apng.height * this._apng.channels)
        };
        const frame = this._frames.at(i2);
        if (frame) {
          frame.data = decodeInterlaceNull({
            data: frame.data,
            width: frame.width,
            height: frame.height,
            channels: this._apng.channels,
            depth: this._apng.depth
          });
          if (this._hasPalette) {
            this._apng.palette = this._palette;
          }
          if (this._hasTransparency) {
            this._apng.transparency = this._transparency;
          }
          if (i2 === 0 || frame.xOffset === 0 && frame.yOffset === 0 && frame.width === this._png.width && frame.height === this._png.height) {
            newFrame.data = frame.data;
          } else {
            const prevFrame = this._apng.frames.at(i2 - 1);
            this.disposeFrame(frame, prevFrame, newFrame);
            this.addFrameDataToCanvas(newFrame, frame);
          }
          this._apng.frames.push(newFrame);
        }
      }
      return this._apng;
    }
    disposeFrame(frame, prevFrame, imageFrame) {
      switch (frame.disposeOp) {
        case DisposeOpType.NONE:
          break;
        case DisposeOpType.BACKGROUND:
          for (let row = 0;row < this._png.height; row++) {
            for (let col = 0;col < this._png.width; col++) {
              const index = (row * frame.width + col) * this._png.channels;
              for (let channel = 0;channel < this._png.channels; channel++) {
                imageFrame.data[index + channel] = 0;
              }
            }
          }
          break;
        case DisposeOpType.PREVIOUS:
          imageFrame.data.set(prevFrame.data);
          break;
        default:
          throw new Error("Unknown disposeOp");
      }
    }
    addFrameDataToCanvas(imageFrame, frame) {
      const maxValue = 1 << this._png.depth;
      const calculatePixelIndices = (row, col) => {
        const index = ((row + frame.yOffset) * this._png.width + frame.xOffset + col) * this._png.channels;
        const frameIndex = (row * frame.width + col) * this._png.channels;
        return { index, frameIndex };
      };
      switch (frame.blendOp) {
        case BlendOpType.SOURCE:
          for (let row = 0;row < frame.height; row++) {
            for (let col = 0;col < frame.width; col++) {
              const { index, frameIndex } = calculatePixelIndices(row, col);
              for (let channel = 0;channel < this._png.channels; channel++) {
                imageFrame.data[index + channel] = frame.data[frameIndex + channel];
              }
            }
          }
          break;
        case BlendOpType.OVER:
          for (let row = 0;row < frame.height; row++) {
            for (let col = 0;col < frame.width; col++) {
              const { index, frameIndex } = calculatePixelIndices(row, col);
              for (let channel = 0;channel < this._png.channels; channel++) {
                const sourceAlpha = frame.data[frameIndex + this._png.channels - 1] / maxValue;
                const foregroundValue = channel % (this._png.channels - 1) === 0 ? 1 : frame.data[frameIndex + channel];
                const value = Math.floor(sourceAlpha * foregroundValue + (1 - sourceAlpha) * imageFrame.data[index + channel]);
                imageFrame.data[index + channel] += value;
              }
            }
          }
          break;
        default:
          throw new Error("Unknown blendOp");
      }
    }
    decodeImage() {
      const data = this._inflatorResult;
      if (this._filterMethod !== FilterMethod.ADAPTIVE) {
        throw new Error(`Filter method ${this._filterMethod} not supported`);
      }
      if (this._interlaceMethod === InterlaceMethod.NO_INTERLACE) {
        this._png.data = decodeInterlaceNull({
          data,
          width: this._png.width,
          height: this._png.height,
          channels: this._png.channels,
          depth: this._png.depth
        });
      } else if (this._interlaceMethod === InterlaceMethod.ADAM7) {
        this._png.data = decodeInterlaceAdam7({
          data,
          width: this._png.width,
          height: this._png.height,
          channels: this._png.channels,
          depth: this._png.depth
        });
      } else {
        throw new Error(`Interlace method ${this._interlaceMethod} not supported`);
      }
      if (this._hasPalette) {
        this._png.palette = this._palette;
      }
      if (this._hasTransparency) {
        this._png.transparency = this._transparency;
      }
    }
    pushDataToFrame() {
      this._inflator.push(new Uint8Array(0), true);
      const result = this._inflatorResult;
      const lastFrame = this._frames.at(-1);
      if (lastFrame) {
        lastFrame.data = result;
      } else {
        this._frames.push({
          sequenceNumber: 0,
          width: this._png.width,
          height: this._png.height,
          xOffset: 0,
          yOffset: 0,
          delayNumber: 0,
          delayDenominator: 0,
          disposeOp: DisposeOpType.NONE,
          blendOp: BlendOpType.SOURCE,
          data: result
        });
      }
      this._inflator = new Unzlib((chunk, final) => {
        this._chunks.push(chunk);
        if (final) {
          const totalLength = this._chunks.reduce((sum, c) => sum + c.length, 0);
          this._inflatorResult = new Uint8Array(totalLength);
          let offset = 0;
          for (const chunk2 of this._chunks) {
            this._inflatorResult.set(chunk2, offset);
            offset += chunk2.length;
          }
          this._chunks = [];
        }
      });
      this._chunks = [];
      this._writingDataChunks = false;
    }
  };
});

// node_modules/fast-png/lib/png_encoder.js
function checkInteger(value, name) {
  if (Number.isInteger(value) && value > 0) {
    return value;
  }
  throw new TypeError(`${name} must be a positive integer`);
}
function getColorType(data, palette) {
  const { channels = 4, depth = 8 } = data;
  if (channels !== 4 && channels !== 3 && channels !== 2 && channels !== 1) {
    throw new RangeError(`unsupported number of channels: ${channels}`);
  }
  const returnValue = {
    channels,
    depth,
    colorType: ColorType.UNKNOWN
  };
  switch (channels) {
    case 4:
      returnValue.colorType = ColorType.TRUECOLOUR_ALPHA;
      break;
    case 3:
      returnValue.colorType = ColorType.TRUECOLOUR;
      break;
    case 1:
      if (palette) {
        returnValue.colorType = ColorType.INDEXED_COLOUR;
      } else {
        returnValue.colorType = ColorType.GREYSCALE;
      }
      break;
    case 2:
      returnValue.colorType = ColorType.GREYSCALE_ALPHA;
      break;
    default:
      throw new Error("unsupported number of channels");
  }
  return returnValue;
}
function writeDataBytes(data, newData, slotsPerLine, offset) {
  for (let j = 0;j < slotsPerLine; j++) {
    newData.writeByte(data[offset++]);
  }
  return offset;
}
function writeDataInterlaced(imageData, data, newData, offset) {
  const passes = [
    { x: 0, y: 0, xStep: 8, yStep: 8 },
    { x: 4, y: 0, xStep: 8, yStep: 8 },
    { x: 0, y: 4, xStep: 4, yStep: 8 },
    { x: 2, y: 0, xStep: 4, yStep: 4 },
    { x: 0, y: 2, xStep: 2, yStep: 4 },
    { x: 1, y: 0, xStep: 2, yStep: 2 },
    { x: 0, y: 1, xStep: 1, yStep: 2 }
  ];
  const { width, height, channels, depth } = imageData;
  let pixelSize;
  if (depth === 16) {
    pixelSize = channels * depth / 8 / 2;
  } else {
    pixelSize = channels * depth / 8;
  }
  for (let passIndex = 0;passIndex < 7; passIndex++) {
    const pass = passes[passIndex];
    const passWidth = Math.floor((width - pass.x + pass.xStep - 1) / pass.xStep);
    const passHeight = Math.floor((height - pass.y + pass.yStep - 1) / pass.yStep);
    if (passWidth <= 0 || passHeight <= 0)
      continue;
    const passLineBytes = passWidth * pixelSize;
    for (let y = 0;y < passHeight; y++) {
      const imageY = pass.y + y * pass.yStep;
      const rawScanline = depth <= 8 ? new Uint8Array(passLineBytes) : new Uint16Array(passLineBytes);
      let rawOffset = 0;
      for (let x2 = 0;x2 < passWidth; x2++) {
        const imageX = pass.x + x2 * pass.xStep;
        if (imageX < width && imageY < height) {
          const srcPos = (imageY * width + imageX) * pixelSize;
          for (let i2 = 0;i2 < pixelSize; i2++) {
            rawScanline[rawOffset++] = data[srcPos + i2];
          }
        }
      }
      newData.writeByte(0);
      if (depth === 8) {
        newData.writeBytes(rawScanline);
      } else if (depth === 16) {
        for (const value of rawScanline) {
          newData.writeByte(value >> 8 & 255);
          newData.writeByte(value & 255);
        }
      }
    }
  }
  return offset;
}
function writeDataUint16(data, newData, slotsPerLine, offset) {
  for (let j = 0;j < slotsPerLine; j++) {
    newData.writeUint16(data[offset++]);
  }
  return offset;
}
var defaultZlibOptions, PngEncoder;
var init_png_encoder = __esm(() => {
  init_esm();
  init_iobuffer();
  init_crc();
  init_signature();
  init_text2();
  init_internal_types();
  defaultZlibOptions = {
    level: 3
  };
  PngEncoder = class PngEncoder extends IOBuffer {
    _png;
    _zlibOptions;
    _colorType;
    _interlaceMethod;
    constructor(data, options = {}) {
      super();
      this._colorType = ColorType.UNKNOWN;
      this._zlibOptions = { ...defaultZlibOptions, ...options.zlib };
      this._png = this._checkData(data);
      this._interlaceMethod = (options.interlace === "Adam7" ? InterlaceMethod.ADAM7 : InterlaceMethod.NO_INTERLACE) ?? InterlaceMethod.NO_INTERLACE;
      this.setBigEndian();
    }
    encode() {
      writeSignature(this);
      this.encodeIHDR();
      if (this._png.palette) {
        this.encodePLTE();
        if (this._png.palette[0].length === 4) {
          this.encodeTRNS();
        }
      }
      this.encodeData();
      if (this._png.text) {
        for (const [keyword, text] of Object.entries(this._png.text)) {
          encodetEXt(this, keyword, text);
        }
      }
      this.encodeIEND();
      return this.toArray();
    }
    encodeIHDR() {
      this.writeUint32(13);
      this.writeChars("IHDR");
      this.writeUint32(this._png.width);
      this.writeUint32(this._png.height);
      this.writeByte(this._png.depth);
      this.writeByte(this._colorType);
      this.writeByte(CompressionMethod.DEFLATE);
      this.writeByte(FilterMethod.ADAPTIVE);
      this.writeByte(this._interlaceMethod);
      writeCrc(this, 17);
    }
    encodeIEND() {
      this.writeUint32(0);
      this.writeChars("IEND");
      writeCrc(this, 4);
    }
    encodePLTE() {
      const paletteLength = this._png.palette?.length * 3;
      this.writeUint32(paletteLength);
      this.writeChars("PLTE");
      for (const color of this._png.palette) {
        this.writeByte(color[0]);
        this.writeByte(color[1]);
        this.writeByte(color[2]);
      }
      writeCrc(this, 4 + paletteLength);
    }
    encodeTRNS() {
      const alpha = this._png.palette.filter((color) => {
        return color.at(-1) !== 255;
      });
      this.writeUint32(alpha.length);
      this.writeChars("tRNS");
      for (const el of alpha) {
        this.writeByte(el.at(-1));
      }
      writeCrc(this, 4 + alpha.length);
    }
    encodeIDAT(data) {
      this.writeUint32(data.length);
      this.writeChars("IDAT");
      this.writeBytes(data);
      writeCrc(this, data.length + 4);
    }
    encodeData() {
      const { width, height, channels, depth, data } = this._png;
      const slotsPerLine = depth <= 8 ? Math.ceil(width * depth / 8) * channels : Math.ceil(width * depth / 8 * channels / 2);
      const newData = new IOBuffer().setBigEndian();
      let offset = 0;
      if (this._interlaceMethod === InterlaceMethod.NO_INTERLACE) {
        for (let i2 = 0;i2 < height; i2++) {
          newData.writeByte(0);
          if (depth === 16) {
            offset = writeDataUint16(data, newData, slotsPerLine, offset);
          } else {
            offset = writeDataBytes(data, newData, slotsPerLine, offset);
          }
        }
      } else if (this._interlaceMethod === InterlaceMethod.ADAM7) {
        offset = writeDataInterlaced(this._png, data, newData, offset);
      }
      const buffer = newData.toArray();
      const compressed = zlibSync(buffer, this._zlibOptions);
      this.encodeIDAT(compressed);
    }
    _checkData(data) {
      const { colorType, channels, depth } = getColorType(data, data.palette);
      const png = {
        width: checkInteger(data.width, "width"),
        height: checkInteger(data.height, "height"),
        channels,
        data: data.data,
        depth,
        text: data.text,
        palette: data.palette
      };
      this._colorType = colorType;
      const expectedSize = depth < 8 ? Math.ceil(png.width * depth / 8) * png.height * channels : png.width * png.height * channels;
      if (png.data.length !== expectedSize) {
        throw new RangeError(`wrong data size. Found ${png.data.length}, expected ${expectedSize}`);
      }
      return png;
    }
  };
});

// node_modules/fast-png/lib/types.js
var init_types = () => {};
// node_modules/fast-png/lib/index.js
function decodePng(data, options) {
  const decoder = new PngDecoder(data, options);
  return decoder.decode();
}
function encodePng(png, options) {
  const encoder2 = new PngEncoder(png, options);
  return encoder2.encode();
}
var init_lib = __esm(() => {
  init_png_decoder();
  init_png_encoder();
  init_signature();
  init_types();
});

// node_modules/poppygl/node_modules/readable-stream/lib/ours/primordials.js
var require_primordials = __commonJS((exports, module) => {
  class AggregateError extends Error {
    constructor(errors) {
      if (!Array.isArray(errors)) {
        throw new TypeError(`Expected input to be an Array, got ${typeof errors}`);
      }
      let message = "";
      for (let i2 = 0;i2 < errors.length; i2++) {
        message += `    ${errors[i2].stack}
`;
      }
      super(message);
      this.name = "AggregateError";
      this.errors = errors;
    }
  }
  module.exports = {
    AggregateError,
    ArrayIsArray(self) {
      return Array.isArray(self);
    },
    ArrayPrototypeIncludes(self, el) {
      return self.includes(el);
    },
    ArrayPrototypeIndexOf(self, el) {
      return self.indexOf(el);
    },
    ArrayPrototypeJoin(self, sep) {
      return self.join(sep);
    },
    ArrayPrototypeMap(self, fn) {
      return self.map(fn);
    },
    ArrayPrototypePop(self, el) {
      return self.pop(el);
    },
    ArrayPrototypePush(self, el) {
      return self.push(el);
    },
    ArrayPrototypeSlice(self, start, end) {
      return self.slice(start, end);
    },
    Error,
    FunctionPrototypeCall(fn, thisArgs, ...args) {
      return fn.call(thisArgs, ...args);
    },
    FunctionPrototypeSymbolHasInstance(self, instance) {
      return Function.prototype[Symbol.hasInstance].call(self, instance);
    },
    MathFloor: Math.floor,
    Number,
    NumberIsInteger: Number.isInteger,
    NumberIsNaN: Number.isNaN,
    NumberMAX_SAFE_INTEGER: Number.MAX_SAFE_INTEGER,
    NumberMIN_SAFE_INTEGER: Number.MIN_SAFE_INTEGER,
    NumberParseInt: Number.parseInt,
    ObjectDefineProperties(self, props) {
      return Object.defineProperties(self, props);
    },
    ObjectDefineProperty(self, name, prop) {
      return Object.defineProperty(self, name, prop);
    },
    ObjectGetOwnPropertyDescriptor(self, name) {
      return Object.getOwnPropertyDescriptor(self, name);
    },
    ObjectKeys(obj) {
      return Object.keys(obj);
    },
    ObjectSetPrototypeOf(target, proto) {
      return Object.setPrototypeOf(target, proto);
    },
    Promise,
    PromisePrototypeCatch(self, fn) {
      return self.catch(fn);
    },
    PromisePrototypeThen(self, thenFn, catchFn) {
      return self.then(thenFn, catchFn);
    },
    PromiseReject(err2) {
      return Promise.reject(err2);
    },
    PromiseResolve(val) {
      return Promise.resolve(val);
    },
    ReflectApply: Reflect.apply,
    RegExpPrototypeTest(self, value) {
      return self.test(value);
    },
    SafeSet: Set,
    String,
    StringPrototypeSlice(self, start, end) {
      return self.slice(start, end);
    },
    StringPrototypeToLowerCase(self) {
      return self.toLowerCase();
    },
    StringPrototypeToUpperCase(self) {
      return self.toUpperCase();
    },
    StringPrototypeTrim(self) {
      return self.trim();
    },
    Symbol,
    SymbolFor: Symbol.for,
    SymbolAsyncIterator: Symbol.asyncIterator,
    SymbolHasInstance: Symbol.hasInstance,
    SymbolIterator: Symbol.iterator,
    SymbolDispose: Symbol.dispose || Symbol("Symbol.dispose"),
    SymbolAsyncDispose: Symbol.asyncDispose || Symbol("Symbol.asyncDispose"),
    TypedArrayPrototypeSet(self, buf, len) {
      return self.set(buf, len);
    },
    Boolean,
    Uint8Array
  };
});

// node_modules/poppygl/node_modules/readable-stream/lib/ours/util/inspect.js
var require_inspect = __commonJS((exports, module) => {
  module.exports = {
    format(format, ...args) {
      return format.replace(/%([sdifj])/g, function(...[_unused, type]) {
        const replacement = args.shift();
        if (type === "f") {
          return replacement.toFixed(6);
        } else if (type === "j") {
          return JSON.stringify(replacement);
        } else if (type === "s" && typeof replacement === "object") {
          const ctor = replacement.constructor !== Object ? replacement.constructor.name : "";
          return `${ctor} {}`.trim();
        } else {
          return replacement.toString();
        }
      });
    },
    inspect(value) {
      switch (typeof value) {
        case "string":
          if (value.includes("'")) {
            if (!value.includes('"')) {
              return `"${value}"`;
            } else if (!value.includes("`") && !value.includes("${")) {
              return `\`${value}\``;
            }
          }
          return `'${value}'`;
        case "number":
          if (isNaN(value)) {
            return "NaN";
          } else if (Object.is(value, -0)) {
            return String(value);
          }
          return value;
        case "bigint":
          return `${String(value)}n`;
        case "boolean":
        case "undefined":
          return String(value);
        case "object":
          return "{}";
      }
    }
  };
});

// node_modules/poppygl/node_modules/readable-stream/lib/ours/errors.js
var require_errors = __commonJS((exports, module) => {
  var { format, inspect } = require_inspect();
  var { AggregateError: CustomAggregateError } = require_primordials();
  var AggregateError = globalThis.AggregateError || CustomAggregateError;
  var kIsNodeError = Symbol("kIsNodeError");
  var kTypes = [
    "string",
    "function",
    "number",
    "object",
    "Function",
    "Object",
    "boolean",
    "bigint",
    "symbol"
  ];
  var classRegExp = /^([A-Z][a-z0-9]*)+$/;
  var nodeInternalPrefix = "__node_internal_";
  var codes = {};
  function assert(value, message) {
    if (!value) {
      throw new codes.ERR_INTERNAL_ASSERTION(message);
    }
  }
  function addNumericalSeparator(val) {
    let res = "";
    let i2 = val.length;
    const start = val[0] === "-" ? 1 : 0;
    for (;i2 >= start + 4; i2 -= 3) {
      res = `_${val.slice(i2 - 3, i2)}${res}`;
    }
    return `${val.slice(0, i2)}${res}`;
  }
  function getMessage(key, msg, args) {
    if (typeof msg === "function") {
      assert(msg.length <= args.length, `Code: ${key}; The provided arguments length (${args.length}) does not match the required ones (${msg.length}).`);
      return msg(...args);
    }
    const expectedLength = (msg.match(/%[dfijoOs]/g) || []).length;
    assert(expectedLength === args.length, `Code: ${key}; The provided arguments length (${args.length}) does not match the required ones (${expectedLength}).`);
    if (args.length === 0) {
      return msg;
    }
    return format(msg, ...args);
  }
  function E(code, message, Base) {
    if (!Base) {
      Base = Error;
    }

    class NodeError extends Base {
      constructor(...args) {
        super(getMessage(code, message, args));
      }
      toString() {
        return `${this.name} [${code}]: ${this.message}`;
      }
    }
    Object.defineProperties(NodeError.prototype, {
      name: {
        value: Base.name,
        writable: true,
        enumerable: false,
        configurable: true
      },
      toString: {
        value() {
          return `${this.name} [${code}]: ${this.message}`;
        },
        writable: true,
        enumerable: false,
        configurable: true
      }
    });
    NodeError.prototype.code = code;
    NodeError.prototype[kIsNodeError] = true;
    codes[code] = NodeError;
  }
  function hideStackFrames(fn) {
    const hidden = nodeInternalPrefix + fn.name;
    Object.defineProperty(fn, "name", {
      value: hidden
    });
    return fn;
  }
  function aggregateTwoErrors(innerError, outerError) {
    if (innerError && outerError && innerError !== outerError) {
      if (Array.isArray(outerError.errors)) {
        outerError.errors.push(innerError);
        return outerError;
      }
      const err2 = new AggregateError([outerError, innerError], outerError.message);
      err2.code = outerError.code;
      return err2;
    }
    return innerError || outerError;
  }

  class AbortError extends Error {
    constructor(message = "The operation was aborted", options = undefined) {
      if (options !== undefined && typeof options !== "object") {
        throw new codes.ERR_INVALID_ARG_TYPE("options", "Object", options);
      }
      super(message, options);
      this.code = "ABORT_ERR";
      this.name = "AbortError";
    }
  }
  E("ERR_ASSERTION", "%s", Error);
  E("ERR_INVALID_ARG_TYPE", (name, expected, actual) => {
    assert(typeof name === "string", "'name' must be a string");
    if (!Array.isArray(expected)) {
      expected = [expected];
    }
    let msg = "The ";
    if (name.endsWith(" argument")) {
      msg += `${name} `;
    } else {
      msg += `"${name}" ${name.includes(".") ? "property" : "argument"} `;
    }
    msg += "must be ";
    const types2 = [];
    const instances = [];
    const other = [];
    for (const value of expected) {
      assert(typeof value === "string", "All expected entries have to be of type string");
      if (kTypes.includes(value)) {
        types2.push(value.toLowerCase());
      } else if (classRegExp.test(value)) {
        instances.push(value);
      } else {
        assert(value !== "object", 'The value "object" should be written as "Object"');
        other.push(value);
      }
    }
    if (instances.length > 0) {
      const pos = types2.indexOf("object");
      if (pos !== -1) {
        types2.splice(types2, pos, 1);
        instances.push("Object");
      }
    }
    if (types2.length > 0) {
      switch (types2.length) {
        case 1:
          msg += `of type ${types2[0]}`;
          break;
        case 2:
          msg += `one of type ${types2[0]} or ${types2[1]}`;
          break;
        default: {
          const last = types2.pop();
          msg += `one of type ${types2.join(", ")}, or ${last}`;
        }
      }
      if (instances.length > 0 || other.length > 0) {
        msg += " or ";
      }
    }
    if (instances.length > 0) {
      switch (instances.length) {
        case 1:
          msg += `an instance of ${instances[0]}`;
          break;
        case 2:
          msg += `an instance of ${instances[0]} or ${instances[1]}`;
          break;
        default: {
          const last = instances.pop();
          msg += `an instance of ${instances.join(", ")}, or ${last}`;
        }
      }
      if (other.length > 0) {
        msg += " or ";
      }
    }
    switch (other.length) {
      case 0:
        break;
      case 1:
        if (other[0].toLowerCase() !== other[0]) {
          msg += "an ";
        }
        msg += `${other[0]}`;
        break;
      case 2:
        msg += `one of ${other[0]} or ${other[1]}`;
        break;
      default: {
        const last = other.pop();
        msg += `one of ${other.join(", ")}, or ${last}`;
      }
    }
    if (actual == null) {
      msg += `. Received ${actual}`;
    } else if (typeof actual === "function" && actual.name) {
      msg += `. Received function ${actual.name}`;
    } else if (typeof actual === "object") {
      var _actual$constructor;
      if ((_actual$constructor = actual.constructor) !== null && _actual$constructor !== undefined && _actual$constructor.name) {
        msg += `. Received an instance of ${actual.constructor.name}`;
      } else {
        const inspected = inspect(actual, {
          depth: -1
        });
        msg += `. Received ${inspected}`;
      }
    } else {
      let inspected = inspect(actual, {
        colors: false
      });
      if (inspected.length > 25) {
        inspected = `${inspected.slice(0, 25)}...`;
      }
      msg += `. Received type ${typeof actual} (${inspected})`;
    }
    return msg;
  }, TypeError);
  E("ERR_INVALID_ARG_VALUE", (name, value, reason = "is invalid") => {
    let inspected = inspect(value);
    if (inspected.length > 128) {
      inspected = inspected.slice(0, 128) + "...";
    }
    const type = name.includes(".") ? "property" : "argument";
    return `The ${type} '${name}' ${reason}. Received ${inspected}`;
  }, TypeError);
  E("ERR_INVALID_RETURN_VALUE", (input, name, value) => {
    var _value$constructor;
    const type = value !== null && value !== undefined && (_value$constructor = value.constructor) !== null && _value$constructor !== undefined && _value$constructor.name ? `instance of ${value.constructor.name}` : `type ${typeof value}`;
    return `Expected ${input} to be returned from the "${name}"` + ` function but got ${type}.`;
  }, TypeError);
  E("ERR_MISSING_ARGS", (...args) => {
    assert(args.length > 0, "At least one arg needs to be specified");
    let msg;
    const len = args.length;
    args = (Array.isArray(args) ? args : [args]).map((a) => `"${a}"`).join(" or ");
    switch (len) {
      case 1:
        msg += `The ${args[0]} argument`;
        break;
      case 2:
        msg += `The ${args[0]} and ${args[1]} arguments`;
        break;
      default:
        {
          const last = args.pop();
          msg += `The ${args.join(", ")}, and ${last} arguments`;
        }
        break;
    }
    return `${msg} must be specified`;
  }, TypeError);
  E("ERR_OUT_OF_RANGE", (str, range, input) => {
    assert(range, 'Missing "range" argument');
    let received;
    if (Number.isInteger(input) && Math.abs(input) > 2 ** 32) {
      received = addNumericalSeparator(String(input));
    } else if (typeof input === "bigint") {
      received = String(input);
      const limit = BigInt(2) ** BigInt(32);
      if (input > limit || input < -limit) {
        received = addNumericalSeparator(received);
      }
      received += "n";
    } else {
      received = inspect(input);
    }
    return `The value of "${str}" is out of range. It must be ${range}. Received ${received}`;
  }, RangeError);
  E("ERR_MULTIPLE_CALLBACK", "Callback called multiple times", Error);
  E("ERR_METHOD_NOT_IMPLEMENTED", "The %s method is not implemented", Error);
  E("ERR_STREAM_ALREADY_FINISHED", "Cannot call %s after a stream was finished", Error);
  E("ERR_STREAM_CANNOT_PIPE", "Cannot pipe, not readable", Error);
  E("ERR_STREAM_DESTROYED", "Cannot call %s after a stream was destroyed", Error);
  E("ERR_STREAM_NULL_VALUES", "May not write null values to stream", TypeError);
  E("ERR_STREAM_PREMATURE_CLOSE", "Premature close", Error);
  E("ERR_STREAM_PUSH_AFTER_EOF", "stream.push() after EOF", Error);
  E("ERR_STREAM_UNSHIFT_AFTER_END_EVENT", "stream.unshift() after end event", Error);
  E("ERR_STREAM_WRITE_AFTER_END", "write after end", Error);
  E("ERR_UNKNOWN_ENCODING", "Unknown encoding: %s", TypeError);
  module.exports = {
    AbortError,
    aggregateTwoErrors: hideStackFrames(aggregateTwoErrors),
    hideStackFrames,
    codes
  };
});

// node_modules/event-target-shim/dist/event-target-shim.js
var require_event_target_shim = __commonJS((exports, module) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  var privateData = new WeakMap;
  var wrappers = new WeakMap;
  function pd(event) {
    const retv = privateData.get(event);
    console.assert(retv != null, "'this' is expected an Event object, but got", event);
    return retv;
  }
  function setCancelFlag(data) {
    if (data.passiveListener != null) {
      if (typeof console !== "undefined" && typeof console.error === "function") {
        console.error("Unable to preventDefault inside passive event listener invocation.", data.passiveListener);
      }
      return;
    }
    if (!data.event.cancelable) {
      return;
    }
    data.canceled = true;
    if (typeof data.event.preventDefault === "function") {
      data.event.preventDefault();
    }
  }
  function Event(eventTarget, event) {
    privateData.set(this, {
      eventTarget,
      event,
      eventPhase: 2,
      currentTarget: eventTarget,
      canceled: false,
      stopped: false,
      immediateStopped: false,
      passiveListener: null,
      timeStamp: event.timeStamp || Date.now()
    });
    Object.defineProperty(this, "isTrusted", { value: false, enumerable: true });
    const keys = Object.keys(event);
    for (let i2 = 0;i2 < keys.length; ++i2) {
      const key = keys[i2];
      if (!(key in this)) {
        Object.defineProperty(this, key, defineRedirectDescriptor(key));
      }
    }
  }
  Event.prototype = {
    get type() {
      return pd(this).event.type;
    },
    get target() {
      return pd(this).eventTarget;
    },
    get currentTarget() {
      return pd(this).currentTarget;
    },
    composedPath() {
      const currentTarget = pd(this).currentTarget;
      if (currentTarget == null) {
        return [];
      }
      return [currentTarget];
    },
    get NONE() {
      return 0;
    },
    get CAPTURING_PHASE() {
      return 1;
    },
    get AT_TARGET() {
      return 2;
    },
    get BUBBLING_PHASE() {
      return 3;
    },
    get eventPhase() {
      return pd(this).eventPhase;
    },
    stopPropagation() {
      const data = pd(this);
      data.stopped = true;
      if (typeof data.event.stopPropagation === "function") {
        data.event.stopPropagation();
      }
    },
    stopImmediatePropagation() {
      const data = pd(this);
      data.stopped = true;
      data.immediateStopped = true;
      if (typeof data.event.stopImmediatePropagation === "function") {
        data.event.stopImmediatePropagation();
      }
    },
    get bubbles() {
      return Boolean(pd(this).event.bubbles);
    },
    get cancelable() {
      return Boolean(pd(this).event.cancelable);
    },
    preventDefault() {
      setCancelFlag(pd(this));
    },
    get defaultPrevented() {
      return pd(this).canceled;
    },
    get composed() {
      return Boolean(pd(this).event.composed);
    },
    get timeStamp() {
      return pd(this).timeStamp;
    },
    get srcElement() {
      return pd(this).eventTarget;
    },
    get cancelBubble() {
      return pd(this).stopped;
    },
    set cancelBubble(value) {
      if (!value) {
        return;
      }
      const data = pd(this);
      data.stopped = true;
      if (typeof data.event.cancelBubble === "boolean") {
        data.event.cancelBubble = true;
      }
    },
    get returnValue() {
      return !pd(this).canceled;
    },
    set returnValue(value) {
      if (!value) {
        setCancelFlag(pd(this));
      }
    },
    initEvent() {}
  };
  Object.defineProperty(Event.prototype, "constructor", {
    value: Event,
    configurable: true,
    writable: true
  });
  if (typeof window !== "undefined" && typeof window.Event !== "undefined") {
    Object.setPrototypeOf(Event.prototype, window.Event.prototype);
    wrappers.set(window.Event.prototype, Event);
  }
  function defineRedirectDescriptor(key) {
    return {
      get() {
        return pd(this).event[key];
      },
      set(value) {
        pd(this).event[key] = value;
      },
      configurable: true,
      enumerable: true
    };
  }
  function defineCallDescriptor(key) {
    return {
      value() {
        const event = pd(this).event;
        return event[key].apply(event, arguments);
      },
      configurable: true,
      enumerable: true
    };
  }
  function defineWrapper(BaseEvent, proto) {
    const keys = Object.keys(proto);
    if (keys.length === 0) {
      return BaseEvent;
    }
    function CustomEvent(eventTarget, event) {
      BaseEvent.call(this, eventTarget, event);
    }
    CustomEvent.prototype = Object.create(BaseEvent.prototype, {
      constructor: { value: CustomEvent, configurable: true, writable: true }
    });
    for (let i2 = 0;i2 < keys.length; ++i2) {
      const key = keys[i2];
      if (!(key in BaseEvent.prototype)) {
        const descriptor = Object.getOwnPropertyDescriptor(proto, key);
        const isFunc = typeof descriptor.value === "function";
        Object.defineProperty(CustomEvent.prototype, key, isFunc ? defineCallDescriptor(key) : defineRedirectDescriptor(key));
      }
    }
    return CustomEvent;
  }
  function getWrapper(proto) {
    if (proto == null || proto === Object.prototype) {
      return Event;
    }
    let wrapper = wrappers.get(proto);
    if (wrapper == null) {
      wrapper = defineWrapper(getWrapper(Object.getPrototypeOf(proto)), proto);
      wrappers.set(proto, wrapper);
    }
    return wrapper;
  }
  function wrapEvent(eventTarget, event) {
    const Wrapper = getWrapper(Object.getPrototypeOf(event));
    return new Wrapper(eventTarget, event);
  }
  function isStopped(event) {
    return pd(event).immediateStopped;
  }
  function setEventPhase(event, eventPhase) {
    pd(event).eventPhase = eventPhase;
  }
  function setCurrentTarget(event, currentTarget) {
    pd(event).currentTarget = currentTarget;
  }
  function setPassiveListener(event, passiveListener) {
    pd(event).passiveListener = passiveListener;
  }
  var listenersMap = new WeakMap;
  var CAPTURE = 1;
  var BUBBLE = 2;
  var ATTRIBUTE = 3;
  function isObject(x2) {
    return x2 !== null && typeof x2 === "object";
  }
  function getListeners(eventTarget) {
    const listeners = listenersMap.get(eventTarget);
    if (listeners == null) {
      throw new TypeError("'this' is expected an EventTarget object, but got another value.");
    }
    return listeners;
  }
  function defineEventAttributeDescriptor(eventName) {
    return {
      get() {
        const listeners = getListeners(this);
        let node = listeners.get(eventName);
        while (node != null) {
          if (node.listenerType === ATTRIBUTE) {
            return node.listener;
          }
          node = node.next;
        }
        return null;
      },
      set(listener) {
        if (typeof listener !== "function" && !isObject(listener)) {
          listener = null;
        }
        const listeners = getListeners(this);
        let prev = null;
        let node = listeners.get(eventName);
        while (node != null) {
          if (node.listenerType === ATTRIBUTE) {
            if (prev !== null) {
              prev.next = node.next;
            } else if (node.next !== null) {
              listeners.set(eventName, node.next);
            } else {
              listeners.delete(eventName);
            }
          } else {
            prev = node;
          }
          node = node.next;
        }
        if (listener !== null) {
          const newNode = {
            listener,
            listenerType: ATTRIBUTE,
            passive: false,
            once: false,
            next: null
          };
          if (prev === null) {
            listeners.set(eventName, newNode);
          } else {
            prev.next = newNode;
          }
        }
      },
      configurable: true,
      enumerable: true
    };
  }
  function defineEventAttribute(eventTargetPrototype, eventName) {
    Object.defineProperty(eventTargetPrototype, `on${eventName}`, defineEventAttributeDescriptor(eventName));
  }
  function defineCustomEventTarget(eventNames) {
    function CustomEventTarget() {
      EventTarget.call(this);
    }
    CustomEventTarget.prototype = Object.create(EventTarget.prototype, {
      constructor: {
        value: CustomEventTarget,
        configurable: true,
        writable: true
      }
    });
    for (let i2 = 0;i2 < eventNames.length; ++i2) {
      defineEventAttribute(CustomEventTarget.prototype, eventNames[i2]);
    }
    return CustomEventTarget;
  }
  function EventTarget() {
    if (this instanceof EventTarget) {
      listenersMap.set(this, new Map);
      return;
    }
    if (arguments.length === 1 && Array.isArray(arguments[0])) {
      return defineCustomEventTarget(arguments[0]);
    }
    if (arguments.length > 0) {
      const types2 = new Array(arguments.length);
      for (let i2 = 0;i2 < arguments.length; ++i2) {
        types2[i2] = arguments[i2];
      }
      return defineCustomEventTarget(types2);
    }
    throw new TypeError("Cannot call a class as a function");
  }
  EventTarget.prototype = {
    addEventListener(eventName, listener, options) {
      if (listener == null) {
        return;
      }
      if (typeof listener !== "function" && !isObject(listener)) {
        throw new TypeError("'listener' should be a function or an object.");
      }
      const listeners = getListeners(this);
      const optionsIsObj = isObject(options);
      const capture = optionsIsObj ? Boolean(options.capture) : Boolean(options);
      const listenerType = capture ? CAPTURE : BUBBLE;
      const newNode = {
        listener,
        listenerType,
        passive: optionsIsObj && Boolean(options.passive),
        once: optionsIsObj && Boolean(options.once),
        next: null
      };
      let node = listeners.get(eventName);
      if (node === undefined) {
        listeners.set(eventName, newNode);
        return;
      }
      let prev = null;
      while (node != null) {
        if (node.listener === listener && node.listenerType === listenerType) {
          return;
        }
        prev = node;
        node = node.next;
      }
      prev.next = newNode;
    },
    removeEventListener(eventName, listener, options) {
      if (listener == null) {
        return;
      }
      const listeners = getListeners(this);
      const capture = isObject(options) ? Boolean(options.capture) : Boolean(options);
      const listenerType = capture ? CAPTURE : BUBBLE;
      let prev = null;
      let node = listeners.get(eventName);
      while (node != null) {
        if (node.listener === listener && node.listenerType === listenerType) {
          if (prev !== null) {
            prev.next = node.next;
          } else if (node.next !== null) {
            listeners.set(eventName, node.next);
          } else {
            listeners.delete(eventName);
          }
          return;
        }
        prev = node;
        node = node.next;
      }
    },
    dispatchEvent(event) {
      if (event == null || typeof event.type !== "string") {
        throw new TypeError('"event.type" should be a string.');
      }
      const listeners = getListeners(this);
      const eventName = event.type;
      let node = listeners.get(eventName);
      if (node == null) {
        return true;
      }
      const wrappedEvent = wrapEvent(this, event);
      let prev = null;
      while (node != null) {
        if (node.once) {
          if (prev !== null) {
            prev.next = node.next;
          } else if (node.next !== null) {
            listeners.set(eventName, node.next);
          } else {
            listeners.delete(eventName);
          }
        } else {
          prev = node;
        }
        setPassiveListener(wrappedEvent, node.passive ? node.listener : null);
        if (typeof node.listener === "function") {
          try {
            node.listener.call(this, wrappedEvent);
          } catch (err2) {
            if (typeof console !== "undefined" && typeof console.error === "function") {
              console.error(err2);
            }
          }
        } else if (node.listenerType !== ATTRIBUTE && typeof node.listener.handleEvent === "function") {
          node.listener.handleEvent(wrappedEvent);
        }
        if (isStopped(wrappedEvent)) {
          break;
        }
        node = node.next;
      }
      setPassiveListener(wrappedEvent, null);
      setEventPhase(wrappedEvent, 0);
      setCurrentTarget(wrappedEvent, null);
      return !wrappedEvent.defaultPrevented;
    }
  };
  Object.defineProperty(EventTarget.prototype, "constructor", {
    value: EventTarget,
    configurable: true,
    writable: true
  });
  if (typeof window !== "undefined" && typeof window.EventTarget !== "undefined") {
    Object.setPrototypeOf(EventTarget.prototype, window.EventTarget.prototype);
  }
  exports.defineEventAttribute = defineEventAttribute;
  exports.EventTarget = EventTarget;
  exports.default = EventTarget;
  module.exports = EventTarget;
  module.exports.EventTarget = module.exports["default"] = EventTarget;
  module.exports.defineEventAttribute = defineEventAttribute;
});

// node_modules/abort-controller/dist/abort-controller.js
var require_abort_controller = __commonJS((exports, module) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  var eventTargetShim = require_event_target_shim();

  class AbortSignal extends eventTargetShim.EventTarget {
    constructor() {
      super();
      throw new TypeError("AbortSignal cannot be constructed directly");
    }
    get aborted() {
      const aborted = abortedFlags.get(this);
      if (typeof aborted !== "boolean") {
        throw new TypeError(`Expected 'this' to be an 'AbortSignal' object, but got ${this === null ? "null" : typeof this}`);
      }
      return aborted;
    }
  }
  eventTargetShim.defineEventAttribute(AbortSignal.prototype, "abort");
  function createAbortSignal() {
    const signal = Object.create(AbortSignal.prototype);
    eventTargetShim.EventTarget.call(signal);
    abortedFlags.set(signal, false);
    return signal;
  }
  function abortSignal(signal) {
    if (abortedFlags.get(signal) !== false) {
      return;
    }
    abortedFlags.set(signal, true);
    signal.dispatchEvent({ type: "abort" });
  }
  var abortedFlags = new WeakMap;
  Object.defineProperties(AbortSignal.prototype, {
    aborted: { enumerable: true }
  });
  if (typeof Symbol === "function" && typeof Symbol.toStringTag === "symbol") {
    Object.defineProperty(AbortSignal.prototype, Symbol.toStringTag, {
      configurable: true,
      value: "AbortSignal"
    });
  }

  class AbortController {
    constructor() {
      signals.set(this, createAbortSignal());
    }
    get signal() {
      return getSignal(this);
    }
    abort() {
      abortSignal(getSignal(this));
    }
  }
  var signals = new WeakMap;
  function getSignal(controller) {
    const signal = signals.get(controller);
    if (signal == null) {
      throw new TypeError(`Expected 'this' to be an 'AbortController' object, but got ${controller === null ? "null" : typeof controller}`);
    }
    return signal;
  }
  Object.defineProperties(AbortController.prototype, {
    signal: { enumerable: true },
    abort: { enumerable: true }
  });
  if (typeof Symbol === "function" && typeof Symbol.toStringTag === "symbol") {
    Object.defineProperty(AbortController.prototype, Symbol.toStringTag, {
      configurable: true,
      value: "AbortController"
    });
  }
  exports.AbortController = AbortController;
  exports.AbortSignal = AbortSignal;
  exports.default = AbortController;
  module.exports = AbortController;
  module.exports.AbortController = module.exports["default"] = AbortController;
  module.exports.AbortSignal = AbortSignal;
});

// node_modules/poppygl/node_modules/readable-stream/lib/ours/util.js
var require_util = __commonJS((exports, module) => {
  var bufferModule = __require("buffer");
  var { format, inspect } = require_inspect();
  var {
    codes: { ERR_INVALID_ARG_TYPE }
  } = require_errors();
  var { kResistStopPropagation, AggregateError, SymbolDispose } = require_primordials();
  var AbortSignal = globalThis.AbortSignal || require_abort_controller().AbortSignal;
  var AbortController = globalThis.AbortController || require_abort_controller().AbortController;
  var AsyncFunction = Object.getPrototypeOf(async function() {}).constructor;
  var Blob2 = globalThis.Blob || bufferModule.Blob;
  var isBlob = typeof Blob2 !== "undefined" ? function isBlob2(b) {
    return b instanceof Blob2;
  } : function isBlob2(b) {
    return false;
  };
  var validateAbortSignal = (signal, name) => {
    if (signal !== undefined && (signal === null || typeof signal !== "object" || !("aborted" in signal))) {
      throw new ERR_INVALID_ARG_TYPE(name, "AbortSignal", signal);
    }
  };
  var validateFunction = (value, name) => {
    if (typeof value !== "function") {
      throw new ERR_INVALID_ARG_TYPE(name, "Function", value);
    }
  };
  module.exports = {
    AggregateError,
    kEmptyObject: Object.freeze({}),
    once(callback) {
      let called = false;
      return function(...args) {
        if (called) {
          return;
        }
        called = true;
        callback.apply(this, args);
      };
    },
    createDeferredPromise: function() {
      let resolve;
      let reject;
      const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return {
        promise,
        resolve,
        reject
      };
    },
    promisify(fn) {
      return new Promise((resolve, reject) => {
        fn((err2, ...args) => {
          if (err2) {
            return reject(err2);
          }
          return resolve(...args);
        });
      });
    },
    debuglog() {
      return function() {};
    },
    format,
    inspect,
    types: {
      isAsyncFunction(fn) {
        return fn instanceof AsyncFunction;
      },
      isArrayBufferView(arr) {
        return ArrayBuffer.isView(arr);
      }
    },
    isBlob,
    deprecate(fn, message) {
      return fn;
    },
    addAbortListener: __require("events").addAbortListener || function addAbortListener(signal, listener) {
      if (signal === undefined) {
        throw new ERR_INVALID_ARG_TYPE("signal", "AbortSignal", signal);
      }
      validateAbortSignal(signal, "signal");
      validateFunction(listener, "listener");
      let removeEventListener;
      if (signal.aborted) {
        queueMicrotask(() => listener());
      } else {
        signal.addEventListener("abort", listener, {
          __proto__: null,
          once: true,
          [kResistStopPropagation]: true
        });
        removeEventListener = () => {
          signal.removeEventListener("abort", listener);
        };
      }
      return {
        __proto__: null,
        [SymbolDispose]() {
          var _removeEventListener;
          (_removeEventListener = removeEventListener) === null || _removeEventListener === undefined || _removeEventListener();
        }
      };
    },
    AbortSignalAny: AbortSignal.any || function AbortSignalAny(signals) {
      if (signals.length === 1) {
        return signals[0];
      }
      const ac = new AbortController;
      const abort = () => ac.abort();
      signals.forEach((signal) => {
        validateAbortSignal(signal, "signals");
        signal.addEventListener("abort", abort, {
          once: true
        });
      });
      ac.signal.addEventListener("abort", () => {
        signals.forEach((signal) => signal.removeEventListener("abort", abort));
      }, {
        once: true
      });
      return ac.signal;
    }
  };
  module.exports.promisify.custom = Symbol.for("nodejs.util.promisify.custom");
});

// node_modules/poppygl/node_modules/readable-stream/lib/internal/validators.js
var require_validators = __commonJS((exports, module) => {
  var {
    ArrayIsArray,
    ArrayPrototypeIncludes,
    ArrayPrototypeJoin,
    ArrayPrototypeMap,
    NumberIsInteger,
    NumberIsNaN,
    NumberMAX_SAFE_INTEGER,
    NumberMIN_SAFE_INTEGER,
    NumberParseInt,
    ObjectPrototypeHasOwnProperty,
    RegExpPrototypeExec,
    String: String2,
    StringPrototypeToUpperCase,
    StringPrototypeTrim
  } = require_primordials();
  var {
    hideStackFrames,
    codes: { ERR_SOCKET_BAD_PORT, ERR_INVALID_ARG_TYPE, ERR_INVALID_ARG_VALUE, ERR_OUT_OF_RANGE, ERR_UNKNOWN_SIGNAL }
  } = require_errors();
  var { normalizeEncoding } = require_util();
  var { isAsyncFunction, isArrayBufferView } = require_util().types;
  var signals = {};
  function isInt32(value) {
    return value === (value | 0);
  }
  function isUint32(value) {
    return value === value >>> 0;
  }
  var octalReg = /^[0-7]+$/;
  var modeDesc = "must be a 32-bit unsigned integer or an octal string";
  function parseFileMode(value, name, def) {
    if (typeof value === "undefined") {
      value = def;
    }
    if (typeof value === "string") {
      if (RegExpPrototypeExec(octalReg, value) === null) {
        throw new ERR_INVALID_ARG_VALUE(name, value, modeDesc);
      }
      value = NumberParseInt(value, 8);
    }
    validateUint32(value, name);
    return value;
  }
  var validateInteger = hideStackFrames((value, name, min = NumberMIN_SAFE_INTEGER, max2 = NumberMAX_SAFE_INTEGER) => {
    if (typeof value !== "number")
      throw new ERR_INVALID_ARG_TYPE(name, "number", value);
    if (!NumberIsInteger(value))
      throw new ERR_OUT_OF_RANGE(name, "an integer", value);
    if (value < min || value > max2)
      throw new ERR_OUT_OF_RANGE(name, `>= ${min} && <= ${max2}`, value);
  });
  var validateInt32 = hideStackFrames((value, name, min = -2147483648, max2 = 2147483647) => {
    if (typeof value !== "number") {
      throw new ERR_INVALID_ARG_TYPE(name, "number", value);
    }
    if (!NumberIsInteger(value)) {
      throw new ERR_OUT_OF_RANGE(name, "an integer", value);
    }
    if (value < min || value > max2) {
      throw new ERR_OUT_OF_RANGE(name, `>= ${min} && <= ${max2}`, value);
    }
  });
  var validateUint32 = hideStackFrames((value, name, positive = false) => {
    if (typeof value !== "number") {
      throw new ERR_INVALID_ARG_TYPE(name, "number", value);
    }
    if (!NumberIsInteger(value)) {
      throw new ERR_OUT_OF_RANGE(name, "an integer", value);
    }
    const min = positive ? 1 : 0;
    const max2 = 4294967295;
    if (value < min || value > max2) {
      throw new ERR_OUT_OF_RANGE(name, `>= ${min} && <= ${max2}`, value);
    }
  });
  function validateString(value, name) {
    if (typeof value !== "string")
      throw new ERR_INVALID_ARG_TYPE(name, "string", value);
  }
  function validateNumber(value, name, min = undefined, max2) {
    if (typeof value !== "number")
      throw new ERR_INVALID_ARG_TYPE(name, "number", value);
    if (min != null && value < min || max2 != null && value > max2 || (min != null || max2 != null) && NumberIsNaN(value)) {
      throw new ERR_OUT_OF_RANGE(name, `${min != null ? `>= ${min}` : ""}${min != null && max2 != null ? " && " : ""}${max2 != null ? `<= ${max2}` : ""}`, value);
    }
  }
  var validateOneOf = hideStackFrames((value, name, oneOf) => {
    if (!ArrayPrototypeIncludes(oneOf, value)) {
      const allowed = ArrayPrototypeJoin(ArrayPrototypeMap(oneOf, (v) => typeof v === "string" ? `'${v}'` : String2(v)), ", ");
      const reason = "must be one of: " + allowed;
      throw new ERR_INVALID_ARG_VALUE(name, value, reason);
    }
  });
  function validateBoolean(value, name) {
    if (typeof value !== "boolean")
      throw new ERR_INVALID_ARG_TYPE(name, "boolean", value);
  }
  function getOwnPropertyValueOrDefault(options, key, defaultValue) {
    return options == null || !ObjectPrototypeHasOwnProperty(options, key) ? defaultValue : options[key];
  }
  var validateObject = hideStackFrames((value, name, options = null) => {
    const allowArray = getOwnPropertyValueOrDefault(options, "allowArray", false);
    const allowFunction = getOwnPropertyValueOrDefault(options, "allowFunction", false);
    const nullable = getOwnPropertyValueOrDefault(options, "nullable", false);
    if (!nullable && value === null || !allowArray && ArrayIsArray(value) || typeof value !== "object" && (!allowFunction || typeof value !== "function")) {
      throw new ERR_INVALID_ARG_TYPE(name, "Object", value);
    }
  });
  var validateDictionary = hideStackFrames((value, name) => {
    if (value != null && typeof value !== "object" && typeof value !== "function") {
      throw new ERR_INVALID_ARG_TYPE(name, "a dictionary", value);
    }
  });
  var validateArray = hideStackFrames((value, name, minLength = 0) => {
    if (!ArrayIsArray(value)) {
      throw new ERR_INVALID_ARG_TYPE(name, "Array", value);
    }
    if (value.length < minLength) {
      const reason = `must be longer than ${minLength}`;
      throw new ERR_INVALID_ARG_VALUE(name, value, reason);
    }
  });
  function validateStringArray(value, name) {
    validateArray(value, name);
    for (let i2 = 0;i2 < value.length; i2++) {
      validateString(value[i2], `${name}[${i2}]`);
    }
  }
  function validateBooleanArray(value, name) {
    validateArray(value, name);
    for (let i2 = 0;i2 < value.length; i2++) {
      validateBoolean(value[i2], `${name}[${i2}]`);
    }
  }
  function validateAbortSignalArray(value, name) {
    validateArray(value, name);
    for (let i2 = 0;i2 < value.length; i2++) {
      const signal = value[i2];
      const indexedName = `${name}[${i2}]`;
      if (signal == null) {
        throw new ERR_INVALID_ARG_TYPE(indexedName, "AbortSignal", signal);
      }
      validateAbortSignal(signal, indexedName);
    }
  }
  function validateSignalName(signal, name = "signal") {
    validateString(signal, name);
    if (signals[signal] === undefined) {
      if (signals[StringPrototypeToUpperCase(signal)] !== undefined) {
        throw new ERR_UNKNOWN_SIGNAL(signal + " (signals must use all capital letters)");
      }
      throw new ERR_UNKNOWN_SIGNAL(signal);
    }
  }
  var validateBuffer = hideStackFrames((buffer, name = "buffer") => {
    if (!isArrayBufferView(buffer)) {
      throw new ERR_INVALID_ARG_TYPE(name, ["Buffer", "TypedArray", "DataView"], buffer);
    }
  });
  function validateEncoding(data, encoding) {
    const normalizedEncoding = normalizeEncoding(encoding);
    const length = data.length;
    if (normalizedEncoding === "hex" && length % 2 !== 0) {
      throw new ERR_INVALID_ARG_VALUE("encoding", encoding, `is invalid for data of length ${length}`);
    }
  }
  function validatePort(port, name = "Port", allowZero = true) {
    if (typeof port !== "number" && typeof port !== "string" || typeof port === "string" && StringPrototypeTrim(port).length === 0 || +port !== +port >>> 0 || port > 65535 || port === 0 && !allowZero) {
      throw new ERR_SOCKET_BAD_PORT(name, port, allowZero);
    }
    return port | 0;
  }
  var validateAbortSignal = hideStackFrames((signal, name) => {
    if (signal !== undefined && (signal === null || typeof signal !== "object" || !("aborted" in signal))) {
      throw new ERR_INVALID_ARG_TYPE(name, "AbortSignal", signal);
    }
  });
  var validateFunction = hideStackFrames((value, name) => {
    if (typeof value !== "function")
      throw new ERR_INVALID_ARG_TYPE(name, "Function", value);
  });
  var validatePlainFunction = hideStackFrames((value, name) => {
    if (typeof value !== "function" || isAsyncFunction(value))
      throw new ERR_INVALID_ARG_TYPE(name, "Function", value);
  });
  var validateUndefined = hideStackFrames((value, name) => {
    if (value !== undefined)
      throw new ERR_INVALID_ARG_TYPE(name, "undefined", value);
  });
  function validateUnion(value, name, union) {
    if (!ArrayPrototypeIncludes(union, value)) {
      throw new ERR_INVALID_ARG_TYPE(name, `('${ArrayPrototypeJoin(union, "|")}')`, value);
    }
  }
  var linkValueRegExp = /^(?:<[^>]*>)(?:\s*;\s*[^;"\s]+(?:=(")?[^;"\s]*\1)?)*$/;
  function validateLinkHeaderFormat(value, name) {
    if (typeof value === "undefined" || !RegExpPrototypeExec(linkValueRegExp, value)) {
      throw new ERR_INVALID_ARG_VALUE(name, value, 'must be an array or string of format "</styles.css>; rel=preload; as=style"');
    }
  }
  function validateLinkHeaderValue(hints) {
    if (typeof hints === "string") {
      validateLinkHeaderFormat(hints, "hints");
      return hints;
    } else if (ArrayIsArray(hints)) {
      const hintsLength = hints.length;
      let result = "";
      if (hintsLength === 0) {
        return result;
      }
      for (let i2 = 0;i2 < hintsLength; i2++) {
        const link = hints[i2];
        validateLinkHeaderFormat(link, "hints");
        result += link;
        if (i2 !== hintsLength - 1) {
          result += ", ";
        }
      }
      return result;
    }
    throw new ERR_INVALID_ARG_VALUE("hints", hints, 'must be an array or string of format "</styles.css>; rel=preload; as=style"');
  }
  module.exports = {
    isInt32,
    isUint32,
    parseFileMode,
    validateArray,
    validateStringArray,
    validateBooleanArray,
    validateAbortSignalArray,
    validateBoolean,
    validateBuffer,
    validateDictionary,
    validateEncoding,
    validateFunction,
    validateInt32,
    validateInteger,
    validateNumber,
    validateObject,
    validateOneOf,
    validatePlainFunction,
    validatePort,
    validateSignalName,
    validateString,
    validateUint32,
    validateUndefined,
    validateUnion,
    validateAbortSignal,
    validateLinkHeaderValue
  };
});

// node_modules/process/index.js
var require_process = __commonJS((exports, module) => {
  module.exports = global.process;
});

// node_modules/poppygl/node_modules/readable-stream/lib/internal/streams/utils.js
var require_utils = __commonJS((exports, module) => {
  var { SymbolAsyncIterator, SymbolIterator, SymbolFor } = require_primordials();
  var kIsDestroyed = SymbolFor("nodejs.stream.destroyed");
  var kIsErrored = SymbolFor("nodejs.stream.errored");
  var kIsReadable = SymbolFor("nodejs.stream.readable");
  var kIsWritable = SymbolFor("nodejs.stream.writable");
  var kIsDisturbed = SymbolFor("nodejs.stream.disturbed");
  var kIsClosedPromise = SymbolFor("nodejs.webstream.isClosedPromise");
  var kControllerErrorFunction = SymbolFor("nodejs.webstream.controllerErrorFunction");
  function isReadableNodeStream(obj, strict = false) {
    var _obj$_readableState;
    return !!(obj && typeof obj.pipe === "function" && typeof obj.on === "function" && (!strict || typeof obj.pause === "function" && typeof obj.resume === "function") && (!obj._writableState || ((_obj$_readableState = obj._readableState) === null || _obj$_readableState === undefined ? undefined : _obj$_readableState.readable) !== false) && (!obj._writableState || obj._readableState));
  }
  function isWritableNodeStream(obj) {
    var _obj$_writableState;
    return !!(obj && typeof obj.write === "function" && typeof obj.on === "function" && (!obj._readableState || ((_obj$_writableState = obj._writableState) === null || _obj$_writableState === undefined ? undefined : _obj$_writableState.writable) !== false));
  }
  function isDuplexNodeStream(obj) {
    return !!(obj && typeof obj.pipe === "function" && obj._readableState && typeof obj.on === "function" && typeof obj.write === "function");
  }
  function isNodeStream(obj) {
    return obj && (obj._readableState || obj._writableState || typeof obj.write === "function" && typeof obj.on === "function" || typeof obj.pipe === "function" && typeof obj.on === "function");
  }
  function isReadableStream(obj) {
    return !!(obj && !isNodeStream(obj) && typeof obj.pipeThrough === "function" && typeof obj.getReader === "function" && typeof obj.cancel === "function");
  }
  function isWritableStream(obj) {
    return !!(obj && !isNodeStream(obj) && typeof obj.getWriter === "function" && typeof obj.abort === "function");
  }
  function isTransformStream(obj) {
    return !!(obj && !isNodeStream(obj) && typeof obj.readable === "object" && typeof obj.writable === "object");
  }
  function isWebStream(obj) {
    return isReadableStream(obj) || isWritableStream(obj) || isTransformStream(obj);
  }
  function isIterable(obj, isAsync) {
    if (obj == null)
      return false;
    if (isAsync === true)
      return typeof obj[SymbolAsyncIterator] === "function";
    if (isAsync === false)
      return typeof obj[SymbolIterator] === "function";
    return typeof obj[SymbolAsyncIterator] === "function" || typeof obj[SymbolIterator] === "function";
  }
  function isDestroyed(stream) {
    if (!isNodeStream(stream))
      return null;
    const wState = stream._writableState;
    const rState = stream._readableState;
    const state = wState || rState;
    return !!(stream.destroyed || stream[kIsDestroyed] || state !== null && state !== undefined && state.destroyed);
  }
  function isWritableEnded(stream) {
    if (!isWritableNodeStream(stream))
      return null;
    if (stream.writableEnded === true)
      return true;
    const wState = stream._writableState;
    if (wState !== null && wState !== undefined && wState.errored)
      return false;
    if (typeof (wState === null || wState === undefined ? undefined : wState.ended) !== "boolean")
      return null;
    return wState.ended;
  }
  function isWritableFinished(stream, strict) {
    if (!isWritableNodeStream(stream))
      return null;
    if (stream.writableFinished === true)
      return true;
    const wState = stream._writableState;
    if (wState !== null && wState !== undefined && wState.errored)
      return false;
    if (typeof (wState === null || wState === undefined ? undefined : wState.finished) !== "boolean")
      return null;
    return !!(wState.finished || strict === false && wState.ended === true && wState.length === 0);
  }
  function isReadableEnded(stream) {
    if (!isReadableNodeStream(stream))
      return null;
    if (stream.readableEnded === true)
      return true;
    const rState = stream._readableState;
    if (!rState || rState.errored)
      return false;
    if (typeof (rState === null || rState === undefined ? undefined : rState.ended) !== "boolean")
      return null;
    return rState.ended;
  }
  function isReadableFinished(stream, strict) {
    if (!isReadableNodeStream(stream))
      return null;
    const rState = stream._readableState;
    if (rState !== null && rState !== undefined && rState.errored)
      return false;
    if (typeof (rState === null || rState === undefined ? undefined : rState.endEmitted) !== "boolean")
      return null;
    return !!(rState.endEmitted || strict === false && rState.ended === true && rState.length === 0);
  }
  function isReadable(stream) {
    if (stream && stream[kIsReadable] != null)
      return stream[kIsReadable];
    if (typeof (stream === null || stream === undefined ? undefined : stream.readable) !== "boolean")
      return null;
    if (isDestroyed(stream))
      return false;
    return isReadableNodeStream(stream) && stream.readable && !isReadableFinished(stream);
  }
  function isWritable(stream) {
    if (stream && stream[kIsWritable] != null)
      return stream[kIsWritable];
    if (typeof (stream === null || stream === undefined ? undefined : stream.writable) !== "boolean")
      return null;
    if (isDestroyed(stream))
      return false;
    return isWritableNodeStream(stream) && stream.writable && !isWritableEnded(stream);
  }
  function isFinished(stream, opts) {
    if (!isNodeStream(stream)) {
      return null;
    }
    if (isDestroyed(stream)) {
      return true;
    }
    if ((opts === null || opts === undefined ? undefined : opts.readable) !== false && isReadable(stream)) {
      return false;
    }
    if ((opts === null || opts === undefined ? undefined : opts.writable) !== false && isWritable(stream)) {
      return false;
    }
    return true;
  }
  function isWritableErrored(stream) {
    var _stream$_writableStat, _stream$_writableStat2;
    if (!isNodeStream(stream)) {
      return null;
    }
    if (stream.writableErrored) {
      return stream.writableErrored;
    }
    return (_stream$_writableStat = (_stream$_writableStat2 = stream._writableState) === null || _stream$_writableStat2 === undefined ? undefined : _stream$_writableStat2.errored) !== null && _stream$_writableStat !== undefined ? _stream$_writableStat : null;
  }
  function isReadableErrored(stream) {
    var _stream$_readableStat, _stream$_readableStat2;
    if (!isNodeStream(stream)) {
      return null;
    }
    if (stream.readableErrored) {
      return stream.readableErrored;
    }
    return (_stream$_readableStat = (_stream$_readableStat2 = stream._readableState) === null || _stream$_readableStat2 === undefined ? undefined : _stream$_readableStat2.errored) !== null && _stream$_readableStat !== undefined ? _stream$_readableStat : null;
  }
  function isClosed(stream) {
    if (!isNodeStream(stream)) {
      return null;
    }
    if (typeof stream.closed === "boolean") {
      return stream.closed;
    }
    const wState = stream._writableState;
    const rState = stream._readableState;
    if (typeof (wState === null || wState === undefined ? undefined : wState.closed) === "boolean" || typeof (rState === null || rState === undefined ? undefined : rState.closed) === "boolean") {
      return (wState === null || wState === undefined ? undefined : wState.closed) || (rState === null || rState === undefined ? undefined : rState.closed);
    }
    if (typeof stream._closed === "boolean" && isOutgoingMessage(stream)) {
      return stream._closed;
    }
    return null;
  }
  function isOutgoingMessage(stream) {
    return typeof stream._closed === "boolean" && typeof stream._defaultKeepAlive === "boolean" && typeof stream._removedConnection === "boolean" && typeof stream._removedContLen === "boolean";
  }
  function isServerResponse(stream) {
    return typeof stream._sent100 === "boolean" && isOutgoingMessage(stream);
  }
  function isServerRequest(stream) {
    var _stream$req;
    return typeof stream._consuming === "boolean" && typeof stream._dumped === "boolean" && ((_stream$req = stream.req) === null || _stream$req === undefined ? undefined : _stream$req.upgradeOrConnect) === undefined;
  }
  function willEmitClose(stream) {
    if (!isNodeStream(stream))
      return null;
    const wState = stream._writableState;
    const rState = stream._readableState;
    const state = wState || rState;
    return !state && isServerResponse(stream) || !!(state && state.autoDestroy && state.emitClose && state.closed === false);
  }
  function isDisturbed(stream) {
    var _stream$kIsDisturbed;
    return !!(stream && ((_stream$kIsDisturbed = stream[kIsDisturbed]) !== null && _stream$kIsDisturbed !== undefined ? _stream$kIsDisturbed : stream.readableDidRead || stream.readableAborted));
  }
  function isErrored(stream) {
    var _ref, _ref2, _ref3, _ref4, _ref5, _stream$kIsErrored, _stream$_readableStat3, _stream$_writableStat3, _stream$_readableStat4, _stream$_writableStat4;
    return !!(stream && ((_ref = (_ref2 = (_ref3 = (_ref4 = (_ref5 = (_stream$kIsErrored = stream[kIsErrored]) !== null && _stream$kIsErrored !== undefined ? _stream$kIsErrored : stream.readableErrored) !== null && _ref5 !== undefined ? _ref5 : stream.writableErrored) !== null && _ref4 !== undefined ? _ref4 : (_stream$_readableStat3 = stream._readableState) === null || _stream$_readableStat3 === undefined ? undefined : _stream$_readableStat3.errorEmitted) !== null && _ref3 !== undefined ? _ref3 : (_stream$_writableStat3 = stream._writableState) === null || _stream$_writableStat3 === undefined ? undefined : _stream$_writableStat3.errorEmitted) !== null && _ref2 !== undefined ? _ref2 : (_stream$_readableStat4 = stream._readableState) === null || _stream$_readableStat4 === undefined ? undefined : _stream$_readableStat4.errored) !== null && _ref !== undefined ? _ref : (_stream$_writableStat4 = stream._writableState) === null || _stream$_writableStat4 === undefined ? undefined : _stream$_writableStat4.errored));
  }
  module.exports = {
    isDestroyed,
    kIsDestroyed,
    isDisturbed,
    kIsDisturbed,
    isErrored,
    kIsErrored,
    isReadable,
    kIsReadable,
    kIsClosedPromise,
    kControllerErrorFunction,
    kIsWritable,
    isClosed,
    isDuplexNodeStream,
    isFinished,
    isIterable,
    isReadableNodeStream,
    isReadableStream,
    isReadableEnded,
    isReadableFinished,
    isReadableErrored,
    isNodeStream,
    isWebStream,
    isWritable,
    isWritableNodeStream,
    isWritableStream,
    isWritableEnded,
    isWritableFinished,
    isWritableErrored,
    isServerRequest,
    isServerResponse,
    willEmitClose,
    isTransformStream
  };
});

// node_modules/poppygl/node_modules/readable-stream/lib/internal/streams/end-of-stream.js
var require_end_of_stream = __commonJS((exports, module) => {
  var process2 = require_process();
  var { AbortError, codes } = require_errors();
  var { ERR_INVALID_ARG_TYPE, ERR_STREAM_PREMATURE_CLOSE } = codes;
  var { kEmptyObject, once } = require_util();
  var { validateAbortSignal, validateFunction, validateObject, validateBoolean } = require_validators();
  var { Promise: Promise2, PromisePrototypeThen, SymbolDispose } = require_primordials();
  var {
    isClosed,
    isReadable,
    isReadableNodeStream,
    isReadableStream,
    isReadableFinished,
    isReadableErrored,
    isWritable,
    isWritableNodeStream,
    isWritableStream,
    isWritableFinished,
    isWritableErrored,
    isNodeStream,
    willEmitClose: _willEmitClose,
    kIsClosedPromise
  } = require_utils();
  var addAbortListener;
  function isRequest(stream) {
    return stream.setHeader && typeof stream.abort === "function";
  }
  var nop = () => {};
  function eos(stream, options, callback) {
    var _options$readable, _options$writable;
    if (arguments.length === 2) {
      callback = options;
      options = kEmptyObject;
    } else if (options == null) {
      options = kEmptyObject;
    } else {
      validateObject(options, "options");
    }
    validateFunction(callback, "callback");
    validateAbortSignal(options.signal, "options.signal");
    callback = once(callback);
    if (isReadableStream(stream) || isWritableStream(stream)) {
      return eosWeb(stream, options, callback);
    }
    if (!isNodeStream(stream)) {
      throw new ERR_INVALID_ARG_TYPE("stream", ["ReadableStream", "WritableStream", "Stream"], stream);
    }
    const readable = (_options$readable = options.readable) !== null && _options$readable !== undefined ? _options$readable : isReadableNodeStream(stream);
    const writable = (_options$writable = options.writable) !== null && _options$writable !== undefined ? _options$writable : isWritableNodeStream(stream);
    const wState = stream._writableState;
    const rState = stream._readableState;
    const onlegacyfinish = () => {
      if (!stream.writable) {
        onfinish();
      }
    };
    let willEmitClose = _willEmitClose(stream) && isReadableNodeStream(stream) === readable && isWritableNodeStream(stream) === writable;
    let writableFinished = isWritableFinished(stream, false);
    const onfinish = () => {
      writableFinished = true;
      if (stream.destroyed) {
        willEmitClose = false;
      }
      if (willEmitClose && (!stream.readable || readable)) {
        return;
      }
      if (!readable || readableFinished) {
        callback.call(stream);
      }
    };
    let readableFinished = isReadableFinished(stream, false);
    const onend = () => {
      readableFinished = true;
      if (stream.destroyed) {
        willEmitClose = false;
      }
      if (willEmitClose && (!stream.writable || writable)) {
        return;
      }
      if (!writable || writableFinished) {
        callback.call(stream);
      }
    };
    const onerror = (err2) => {
      callback.call(stream, err2);
    };
    let closed = isClosed(stream);
    const onclose = () => {
      closed = true;
      const errored = isWritableErrored(stream) || isReadableErrored(stream);
      if (errored && typeof errored !== "boolean") {
        return callback.call(stream, errored);
      }
      if (readable && !readableFinished && isReadableNodeStream(stream, true)) {
        if (!isReadableFinished(stream, false))
          return callback.call(stream, new ERR_STREAM_PREMATURE_CLOSE);
      }
      if (writable && !writableFinished) {
        if (!isWritableFinished(stream, false))
          return callback.call(stream, new ERR_STREAM_PREMATURE_CLOSE);
      }
      callback.call(stream);
    };
    const onclosed = () => {
      closed = true;
      const errored = isWritableErrored(stream) || isReadableErrored(stream);
      if (errored && typeof errored !== "boolean") {
        return callback.call(stream, errored);
      }
      callback.call(stream);
    };
    const onrequest = () => {
      stream.req.on("finish", onfinish);
    };
    if (isRequest(stream)) {
      stream.on("complete", onfinish);
      if (!willEmitClose) {
        stream.on("abort", onclose);
      }
      if (stream.req) {
        onrequest();
      } else {
        stream.on("request", onrequest);
      }
    } else if (writable && !wState) {
      stream.on("end", onlegacyfinish);
      stream.on("close", onlegacyfinish);
    }
    if (!willEmitClose && typeof stream.aborted === "boolean") {
      stream.on("aborted", onclose);
    }
    stream.on("end", onend);
    stream.on("finish", onfinish);
    if (options.error !== false) {
      stream.on("error", onerror);
    }
    stream.on("close", onclose);
    if (closed) {
      process2.nextTick(onclose);
    } else if (wState !== null && wState !== undefined && wState.errorEmitted || rState !== null && rState !== undefined && rState.errorEmitted) {
      if (!willEmitClose) {
        process2.nextTick(onclosed);
      }
    } else if (!readable && (!willEmitClose || isReadable(stream)) && (writableFinished || isWritable(stream) === false)) {
      process2.nextTick(onclosed);
    } else if (!writable && (!willEmitClose || isWritable(stream)) && (readableFinished || isReadable(stream) === false)) {
      process2.nextTick(onclosed);
    } else if (rState && stream.req && stream.aborted) {
      process2.nextTick(onclosed);
    }
    const cleanup = () => {
      callback = nop;
      stream.removeListener("aborted", onclose);
      stream.removeListener("complete", onfinish);
      stream.removeListener("abort", onclose);
      stream.removeListener("request", onrequest);
      if (stream.req)
        stream.req.removeListener("finish", onfinish);
      stream.removeListener("end", onlegacyfinish);
      stream.removeListener("close", onlegacyfinish);
      stream.removeListener("finish", onfinish);
      stream.removeListener("end", onend);
      stream.removeListener("error", onerror);
      stream.removeListener("close", onclose);
    };
    if (options.signal && !closed) {
      const abort = () => {
        const endCallback = callback;
        cleanup();
        endCallback.call(stream, new AbortError(undefined, {
          cause: options.signal.reason
        }));
      };
      if (options.signal.aborted) {
        process2.nextTick(abort);
      } else {
        addAbortListener = addAbortListener || require_util().addAbortListener;
        const disposable = addAbortListener(options.signal, abort);
        const originalCallback = callback;
        callback = once((...args) => {
          disposable[SymbolDispose]();
          originalCallback.apply(stream, args);
        });
      }
    }
    return cleanup;
  }
  function eosWeb(stream, options, callback) {
    let isAborted = false;
    let abort = nop;
    if (options.signal) {
      abort = () => {
        isAborted = true;
        callback.call(stream, new AbortError(undefined, {
          cause: options.signal.reason
        }));
      };
      if (options.signal.aborted) {
        process2.nextTick(abort);
      } else {
        addAbortListener = addAbortListener || require_util().addAbortListener;
        const disposable = addAbortListener(options.signal, abort);
        const originalCallback = callback;
        callback = once((...args) => {
          disposable[SymbolDispose]();
          originalCallback.apply(stream, args);
        });
      }
    }
    const resolverFn = (...args) => {
      if (!isAborted) {
        process2.nextTick(() => callback.apply(stream, args));
      }
    };
    PromisePrototypeThen(stream[kIsClosedPromise].promise, resolverFn, resolverFn);
    return nop;
  }
  function finished(stream, opts) {
    var _opts;
    let autoCleanup = false;
    if (opts === null) {
      opts = kEmptyObject;
    }
    if ((_opts = opts) !== null && _opts !== undefined && _opts.cleanup) {
      validateBoolean(opts.cleanup, "cleanup");
      autoCleanup = opts.cleanup;
    }
    return new Promise2((resolve, reject) => {
      const cleanup = eos(stream, opts, (err2) => {
        if (autoCleanup) {
          cleanup();
        }
        if (err2) {
          reject(err2);
        } else {
          resolve();
        }
      });
    });
  }
  module.exports = eos;
  module.exports.finished = finished;
});

// node_modules/poppygl/node_modules/readable-stream/lib/internal/streams/destroy.js
var require_destroy = __commonJS((exports, module) => {
  var process2 = require_process();
  var {
    aggregateTwoErrors,
    codes: { ERR_MULTIPLE_CALLBACK },
    AbortError
  } = require_errors();
  var { Symbol: Symbol2 } = require_primordials();
  var { kIsDestroyed, isDestroyed, isFinished, isServerRequest } = require_utils();
  var kDestroy = Symbol2("kDestroy");
  var kConstruct = Symbol2("kConstruct");
  function checkError(err2, w, r) {
    if (err2) {
      err2.stack;
      if (w && !w.errored) {
        w.errored = err2;
      }
      if (r && !r.errored) {
        r.errored = err2;
      }
    }
  }
  function destroy(err2, cb) {
    const r = this._readableState;
    const w = this._writableState;
    const s = w || r;
    if (w !== null && w !== undefined && w.destroyed || r !== null && r !== undefined && r.destroyed) {
      if (typeof cb === "function") {
        cb();
      }
      return this;
    }
    checkError(err2, w, r);
    if (w) {
      w.destroyed = true;
    }
    if (r) {
      r.destroyed = true;
    }
    if (!s.constructed) {
      this.once(kDestroy, function(er) {
        _destroy(this, aggregateTwoErrors(er, err2), cb);
      });
    } else {
      _destroy(this, err2, cb);
    }
    return this;
  }
  function _destroy(self, err2, cb) {
    let called = false;
    function onDestroy(err3) {
      if (called) {
        return;
      }
      called = true;
      const r = self._readableState;
      const w = self._writableState;
      checkError(err3, w, r);
      if (w) {
        w.closed = true;
      }
      if (r) {
        r.closed = true;
      }
      if (typeof cb === "function") {
        cb(err3);
      }
      if (err3) {
        process2.nextTick(emitErrorCloseNT, self, err3);
      } else {
        process2.nextTick(emitCloseNT, self);
      }
    }
    try {
      self._destroy(err2 || null, onDestroy);
    } catch (err3) {
      onDestroy(err3);
    }
  }
  function emitErrorCloseNT(self, err2) {
    emitErrorNT(self, err2);
    emitCloseNT(self);
  }
  function emitCloseNT(self) {
    const r = self._readableState;
    const w = self._writableState;
    if (w) {
      w.closeEmitted = true;
    }
    if (r) {
      r.closeEmitted = true;
    }
    if (w !== null && w !== undefined && w.emitClose || r !== null && r !== undefined && r.emitClose) {
      self.emit("close");
    }
  }
  function emitErrorNT(self, err2) {
    const r = self._readableState;
    const w = self._writableState;
    if (w !== null && w !== undefined && w.errorEmitted || r !== null && r !== undefined && r.errorEmitted) {
      return;
    }
    if (w) {
      w.errorEmitted = true;
    }
    if (r) {
      r.errorEmitted = true;
    }
    self.emit("error", err2);
  }
  function undestroy() {
    const r = this._readableState;
    const w = this._writableState;
    if (r) {
      r.constructed = true;
      r.closed = false;
      r.closeEmitted = false;
      r.destroyed = false;
      r.errored = null;
      r.errorEmitted = false;
      r.reading = false;
      r.ended = r.readable === false;
      r.endEmitted = r.readable === false;
    }
    if (w) {
      w.constructed = true;
      w.destroyed = false;
      w.closed = false;
      w.closeEmitted = false;
      w.errored = null;
      w.errorEmitted = false;
      w.finalCalled = false;
      w.prefinished = false;
      w.ended = w.writable === false;
      w.ending = w.writable === false;
      w.finished = w.writable === false;
    }
  }
  function errorOrDestroy(stream, err2, sync) {
    const r = stream._readableState;
    const w = stream._writableState;
    if (w !== null && w !== undefined && w.destroyed || r !== null && r !== undefined && r.destroyed) {
      return this;
    }
    if (r !== null && r !== undefined && r.autoDestroy || w !== null && w !== undefined && w.autoDestroy)
      stream.destroy(err2);
    else if (err2) {
      err2.stack;
      if (w && !w.errored) {
        w.errored = err2;
      }
      if (r && !r.errored) {
        r.errored = err2;
      }
      if (sync) {
        process2.nextTick(emitErrorNT, stream, err2);
      } else {
        emitErrorNT(stream, err2);
      }
    }
  }
  function construct(stream, cb) {
    if (typeof stream._construct !== "function") {
      return;
    }
    const r = stream._readableState;
    const w = stream._writableState;
    if (r) {
      r.constructed = false;
    }
    if (w) {
      w.constructed = false;
    }
    stream.once(kConstruct, cb);
    if (stream.listenerCount(kConstruct) > 1) {
      return;
    }
    process2.nextTick(constructNT, stream);
  }
  function constructNT(stream) {
    let called = false;
    function onConstruct(err2) {
      if (called) {
        errorOrDestroy(stream, err2 !== null && err2 !== undefined ? err2 : new ERR_MULTIPLE_CALLBACK);
        return;
      }
      called = true;
      const r = stream._readableState;
      const w = stream._writableState;
      const s = w || r;
      if (r) {
        r.constructed = true;
      }
      if (w) {
        w.constructed = true;
      }
      if (s.destroyed) {
        stream.emit(kDestroy, err2);
      } else if (err2) {
        errorOrDestroy(stream, err2, true);
      } else {
        process2.nextTick(emitConstructNT, stream);
      }
    }
    try {
      stream._construct((err2) => {
        process2.nextTick(onConstruct, err2);
      });
    } catch (err2) {
      process2.nextTick(onConstruct, err2);
    }
  }
  function emitConstructNT(stream) {
    stream.emit(kConstruct);
  }
  function isRequest(stream) {
    return (stream === null || stream === undefined ? undefined : stream.setHeader) && typeof stream.abort === "function";
  }
  function emitCloseLegacy(stream) {
    stream.emit("close");
  }
  function emitErrorCloseLegacy(stream, err2) {
    stream.emit("error", err2);
    process2.nextTick(emitCloseLegacy, stream);
  }
  function destroyer(stream, err2) {
    if (!stream || isDestroyed(stream)) {
      return;
    }
    if (!err2 && !isFinished(stream)) {
      err2 = new AbortError;
    }
    if (isServerRequest(stream)) {
      stream.socket = null;
      stream.destroy(err2);
    } else if (isRequest(stream)) {
      stream.abort();
    } else if (isRequest(stream.req)) {
      stream.req.abort();
    } else if (typeof stream.destroy === "function") {
      stream.destroy(err2);
    } else if (typeof stream.close === "function") {
      stream.close();
    } else if (err2) {
      process2.nextTick(emitErrorCloseLegacy, stream, err2);
    } else {
      process2.nextTick(emitCloseLegacy, stream);
    }
    if (!stream.destroyed) {
      stream[kIsDestroyed] = true;
    }
  }
  module.exports = {
    construct,
    destroyer,
    destroy,
    undestroy,
    errorOrDestroy
  };
});

// node_modules/poppygl/node_modules/readable-stream/lib/internal/streams/legacy.js
var require_legacy = __commonJS((exports, module) => {
  var { ArrayIsArray, ObjectSetPrototypeOf } = require_primordials();
  var { EventEmitter: EE } = __require("events");
  function Stream(opts) {
    EE.call(this, opts);
  }
  ObjectSetPrototypeOf(Stream.prototype, EE.prototype);
  ObjectSetPrototypeOf(Stream, EE);
  Stream.prototype.pipe = function(dest, options) {
    const source = this;
    function ondata(chunk) {
      if (dest.writable && dest.write(chunk) === false && source.pause) {
        source.pause();
      }
    }
    source.on("data", ondata);
    function ondrain() {
      if (source.readable && source.resume) {
        source.resume();
      }
    }
    dest.on("drain", ondrain);
    if (!dest._isStdio && (!options || options.end !== false)) {
      source.on("end", onend);
      source.on("close", onclose);
    }
    let didOnEnd = false;
    function onend() {
      if (didOnEnd)
        return;
      didOnEnd = true;
      dest.end();
    }
    function onclose() {
      if (didOnEnd)
        return;
      didOnEnd = true;
      if (typeof dest.destroy === "function")
        dest.destroy();
    }
    function onerror(er) {
      cleanup();
      if (EE.listenerCount(this, "error") === 0) {
        this.emit("error", er);
      }
    }
    prependListener(source, "error", onerror);
    prependListener(dest, "error", onerror);
    function cleanup() {
      source.removeListener("data", ondata);
      dest.removeListener("drain", ondrain);
      source.removeListener("end", onend);
      source.removeListener("close", onclose);
      source.removeListener("error", onerror);
      dest.removeListener("error", onerror);
      source.removeListener("end", cleanup);
      source.removeListener("close", cleanup);
      dest.removeListener("close", cleanup);
    }
    source.on("end", cleanup);
    source.on("close", cleanup);
    dest.on("close", cleanup);
    dest.emit("pipe", source);
    return dest;
  };
  function prependListener(emitter, event, fn) {
    if (typeof emitter.prependListener === "function")
      return emitter.prependListener(event, fn);
    if (!emitter._events || !emitter._events[event])
      emitter.on(event, fn);
    else if (ArrayIsArray(emitter._events[event]))
      emitter._events[event].unshift(fn);
    else
      emitter._events[event] = [fn, emitter._events[event]];
  }
  module.exports = {
    Stream,
    prependListener
  };
});

// node_modules/poppygl/node_modules/readable-stream/lib/internal/streams/add-abort-signal.js
var require_add_abort_signal = __commonJS((exports, module) => {
  var { SymbolDispose } = require_primordials();
  var { AbortError, codes } = require_errors();
  var { isNodeStream, isWebStream, kControllerErrorFunction } = require_utils();
  var eos = require_end_of_stream();
  var { ERR_INVALID_ARG_TYPE } = codes;
  var addAbortListener;
  var validateAbortSignal = (signal, name) => {
    if (typeof signal !== "object" || !("aborted" in signal)) {
      throw new ERR_INVALID_ARG_TYPE(name, "AbortSignal", signal);
    }
  };
  exports.addAbortSignal = function addAbortSignal(signal, stream) {
    validateAbortSignal(signal, "signal");
    if (!isNodeStream(stream) && !isWebStream(stream)) {
      throw new ERR_INVALID_ARG_TYPE("stream", ["ReadableStream", "WritableStream", "Stream"], stream);
    }
    return exports.addAbortSignalNoValidate(signal, stream);
  };
  exports.addAbortSignalNoValidate = function(signal, stream) {
    if (typeof signal !== "object" || !("aborted" in signal)) {
      return stream;
    }
    const onAbort = isNodeStream(stream) ? () => {
      stream.destroy(new AbortError(undefined, {
        cause: signal.reason
      }));
    } : () => {
      stream[kControllerErrorFunction](new AbortError(undefined, {
        cause: signal.reason
      }));
    };
    if (signal.aborted) {
      onAbort();
    } else {
      addAbortListener = addAbortListener || require_util().addAbortListener;
      const disposable = addAbortListener(signal, onAbort);
      eos(stream, disposable[SymbolDispose]);
    }
    return stream;
  };
});

// node_modules/poppygl/node_modules/readable-stream/lib/internal/streams/buffer_list.js
var require_buffer_list = __commonJS((exports, module) => {
  var { StringPrototypeSlice, SymbolIterator, TypedArrayPrototypeSet, Uint8Array: Uint8Array2 } = require_primordials();
  var { Buffer: Buffer2 } = __require("buffer");
  var { inspect } = require_util();
  module.exports = class BufferList {
    constructor() {
      this.head = null;
      this.tail = null;
      this.length = 0;
    }
    push(v) {
      const entry = {
        data: v,
        next: null
      };
      if (this.length > 0)
        this.tail.next = entry;
      else
        this.head = entry;
      this.tail = entry;
      ++this.length;
    }
    unshift(v) {
      const entry = {
        data: v,
        next: this.head
      };
      if (this.length === 0)
        this.tail = entry;
      this.head = entry;
      ++this.length;
    }
    shift() {
      if (this.length === 0)
        return;
      const ret = this.head.data;
      if (this.length === 1)
        this.head = this.tail = null;
      else
        this.head = this.head.next;
      --this.length;
      return ret;
    }
    clear() {
      this.head = this.tail = null;
      this.length = 0;
    }
    join(s) {
      if (this.length === 0)
        return "";
      let p = this.head;
      let ret = "" + p.data;
      while ((p = p.next) !== null)
        ret += s + p.data;
      return ret;
    }
    concat(n) {
      if (this.length === 0)
        return Buffer2.alloc(0);
      const ret = Buffer2.allocUnsafe(n >>> 0);
      let p = this.head;
      let i2 = 0;
      while (p) {
        TypedArrayPrototypeSet(ret, p.data, i2);
        i2 += p.data.length;
        p = p.next;
      }
      return ret;
    }
    consume(n, hasStrings) {
      const data = this.head.data;
      if (n < data.length) {
        const slice = data.slice(0, n);
        this.head.data = data.slice(n);
        return slice;
      }
      if (n === data.length) {
        return this.shift();
      }
      return hasStrings ? this._getString(n) : this._getBuffer(n);
    }
    first() {
      return this.head.data;
    }
    *[SymbolIterator]() {
      for (let p = this.head;p; p = p.next) {
        yield p.data;
      }
    }
    _getString(n) {
      let ret = "";
      let p = this.head;
      let c = 0;
      do {
        const str = p.data;
        if (n > str.length) {
          ret += str;
          n -= str.length;
        } else {
          if (n === str.length) {
            ret += str;
            ++c;
            if (p.next)
              this.head = p.next;
            else
              this.head = this.tail = null;
          } else {
            ret += StringPrototypeSlice(str, 0, n);
            this.head = p;
            p.data = StringPrototypeSlice(str, n);
          }
          break;
        }
        ++c;
      } while ((p = p.next) !== null);
      this.length -= c;
      return ret;
    }
    _getBuffer(n) {
      const ret = Buffer2.allocUnsafe(n);
      const retLen = n;
      let p = this.head;
      let c = 0;
      do {
        const buf = p.data;
        if (n > buf.length) {
          TypedArrayPrototypeSet(ret, buf, retLen - n);
          n -= buf.length;
        } else {
          if (n === buf.length) {
            TypedArrayPrototypeSet(ret, buf, retLen - n);
            ++c;
            if (p.next)
              this.head = p.next;
            else
              this.head = this.tail = null;
          } else {
            TypedArrayPrototypeSet(ret, new Uint8Array2(buf.buffer, buf.byteOffset, n), retLen - n);
            this.head = p;
            p.data = buf.slice(n);
          }
          break;
        }
        ++c;
      } while ((p = p.next) !== null);
      this.length -= c;
      return ret;
    }
    [Symbol.for("nodejs.util.inspect.custom")](_, options) {
      return inspect(this, {
        ...options,
        depth: 0,
        customInspect: false
      });
    }
  };
});

// node_modules/poppygl/node_modules/readable-stream/lib/internal/streams/state.js
var require_state = __commonJS((exports, module) => {
  var { MathFloor, NumberIsInteger } = require_primordials();
  var { validateInteger } = require_validators();
  var { ERR_INVALID_ARG_VALUE } = require_errors().codes;
  var defaultHighWaterMarkBytes = 16 * 1024;
  var defaultHighWaterMarkObjectMode = 16;
  function highWaterMarkFrom(options, isDuplex, duplexKey) {
    return options.highWaterMark != null ? options.highWaterMark : isDuplex ? options[duplexKey] : null;
  }
  function getDefaultHighWaterMark(objectMode) {
    return objectMode ? defaultHighWaterMarkObjectMode : defaultHighWaterMarkBytes;
  }
  function setDefaultHighWaterMark(objectMode, value) {
    validateInteger(value, "value", 0);
    if (objectMode) {
      defaultHighWaterMarkObjectMode = value;
    } else {
      defaultHighWaterMarkBytes = value;
    }
  }
  function getHighWaterMark(state, options, duplexKey, isDuplex) {
    const hwm = highWaterMarkFrom(options, isDuplex, duplexKey);
    if (hwm != null) {
      if (!NumberIsInteger(hwm) || hwm < 0) {
        const name = isDuplex ? `options.${duplexKey}` : "options.highWaterMark";
        throw new ERR_INVALID_ARG_VALUE(name, hwm);
      }
      return MathFloor(hwm);
    }
    return getDefaultHighWaterMark(state.objectMode);
  }
  module.exports = {
    getHighWaterMark,
    getDefaultHighWaterMark,
    setDefaultHighWaterMark
  };
});

// node_modules/poppygl/node_modules/readable-stream/node_modules/string_decoder/node_modules/safe-buffer/index.js
var require_safe_buffer = __commonJS((exports, module) => {
  /*! safe-buffer. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
  var buffer = __require("buffer");
  var Buffer2 = buffer.Buffer;
  function copyProps(src, dst) {
    for (var key in src) {
      dst[key] = src[key];
    }
  }
  if (Buffer2.from && Buffer2.alloc && Buffer2.allocUnsafe && Buffer2.allocUnsafeSlow) {
    module.exports = buffer;
  } else {
    copyProps(buffer, exports);
    exports.Buffer = SafeBuffer;
  }
  function SafeBuffer(arg, encodingOrOffset, length) {
    return Buffer2(arg, encodingOrOffset, length);
  }
  SafeBuffer.prototype = Object.create(Buffer2.prototype);
  copyProps(Buffer2, SafeBuffer);
  SafeBuffer.from = function(arg, encodingOrOffset, length) {
    if (typeof arg === "number") {
      throw new TypeError("Argument must not be a number");
    }
    return Buffer2(arg, encodingOrOffset, length);
  };
  SafeBuffer.alloc = function(size, fill, encoding) {
    if (typeof size !== "number") {
      throw new TypeError("Argument must be a number");
    }
    var buf = Buffer2(size);
    if (fill !== undefined) {
      if (typeof encoding === "string") {
        buf.fill(fill, encoding);
      } else {
        buf.fill(fill);
      }
    } else {
      buf.fill(0);
    }
    return buf;
  };
  SafeBuffer.allocUnsafe = function(size) {
    if (typeof size !== "number") {
      throw new TypeError("Argument must be a number");
    }
    return Buffer2(size);
  };
  SafeBuffer.allocUnsafeSlow = function(size) {
    if (typeof size !== "number") {
      throw new TypeError("Argument must be a number");
    }
    return buffer.SlowBuffer(size);
  };
});

// node_modules/poppygl/node_modules/readable-stream/node_modules/string_decoder/lib/string_decoder.js
var require_string_decoder = __commonJS((exports) => {
  var Buffer2 = require_safe_buffer().Buffer;
  var isEncoding = Buffer2.isEncoding || function(encoding) {
    encoding = "" + encoding;
    switch (encoding && encoding.toLowerCase()) {
      case "hex":
      case "utf8":
      case "utf-8":
      case "ascii":
      case "binary":
      case "base64":
      case "ucs2":
      case "ucs-2":
      case "utf16le":
      case "utf-16le":
      case "raw":
        return true;
      default:
        return false;
    }
  };
  function _normalizeEncoding(enc) {
    if (!enc)
      return "utf8";
    var retried;
    while (true) {
      switch (enc) {
        case "utf8":
        case "utf-8":
          return "utf8";
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return "utf16le";
        case "latin1":
        case "binary":
          return "latin1";
        case "base64":
        case "ascii":
        case "hex":
          return enc;
        default:
          if (retried)
            return;
          enc = ("" + enc).toLowerCase();
          retried = true;
      }
    }
  }
  function normalizeEncoding(enc) {
    var nenc = _normalizeEncoding(enc);
    if (typeof nenc !== "string" && (Buffer2.isEncoding === isEncoding || !isEncoding(enc)))
      throw new Error("Unknown encoding: " + enc);
    return nenc || enc;
  }
  exports.StringDecoder = StringDecoder;
  function StringDecoder(encoding) {
    this.encoding = normalizeEncoding(encoding);
    var nb;
    switch (this.encoding) {
      case "utf16le":
        this.text = utf16Text;
        this.end = utf16End;
        nb = 4;
        break;
      case "utf8":
        this.fillLast = utf8FillLast;
        nb = 4;
        break;
      case "base64":
        this.text = base64Text;
        this.end = base64End;
        nb = 3;
        break;
      default:
        this.write = simpleWrite;
        this.end = simpleEnd;
        return;
    }
    this.lastNeed = 0;
    this.lastTotal = 0;
    this.lastChar = Buffer2.allocUnsafe(nb);
  }
  StringDecoder.prototype.write = function(buf) {
    if (buf.length === 0)
      return "";
    var r;
    var i2;
    if (this.lastNeed) {
      r = this.fillLast(buf);
      if (r === undefined)
        return "";
      i2 = this.lastNeed;
      this.lastNeed = 0;
    } else {
      i2 = 0;
    }
    if (i2 < buf.length)
      return r ? r + this.text(buf, i2) : this.text(buf, i2);
    return r || "";
  };
  StringDecoder.prototype.end = utf8End;
  StringDecoder.prototype.text = utf8Text;
  StringDecoder.prototype.fillLast = function(buf) {
    if (this.lastNeed <= buf.length) {
      buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed);
      return this.lastChar.toString(this.encoding, 0, this.lastTotal);
    }
    buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, buf.length);
    this.lastNeed -= buf.length;
  };
  function utf8CheckByte(byte) {
    if (byte <= 127)
      return 0;
    else if (byte >> 5 === 6)
      return 2;
    else if (byte >> 4 === 14)
      return 3;
    else if (byte >> 3 === 30)
      return 4;
    return byte >> 6 === 2 ? -1 : -2;
  }
  function utf8CheckIncomplete(self, buf, i2) {
    var j = buf.length - 1;
    if (j < i2)
      return 0;
    var nb = utf8CheckByte(buf[j]);
    if (nb >= 0) {
      if (nb > 0)
        self.lastNeed = nb - 1;
      return nb;
    }
    if (--j < i2 || nb === -2)
      return 0;
    nb = utf8CheckByte(buf[j]);
    if (nb >= 0) {
      if (nb > 0)
        self.lastNeed = nb - 2;
      return nb;
    }
    if (--j < i2 || nb === -2)
      return 0;
    nb = utf8CheckByte(buf[j]);
    if (nb >= 0) {
      if (nb > 0) {
        if (nb === 2)
          nb = 0;
        else
          self.lastNeed = nb - 3;
      }
      return nb;
    }
    return 0;
  }
  function utf8CheckExtraBytes(self, buf, p) {
    if ((buf[0] & 192) !== 128) {
      self.lastNeed = 0;
      return "�";
    }
    if (self.lastNeed > 1 && buf.length > 1) {
      if ((buf[1] & 192) !== 128) {
        self.lastNeed = 1;
        return "�";
      }
      if (self.lastNeed > 2 && buf.length > 2) {
        if ((buf[2] & 192) !== 128) {
          self.lastNeed = 2;
          return "�";
        }
      }
    }
  }
  function utf8FillLast(buf) {
    var p = this.lastTotal - this.lastNeed;
    var r = utf8CheckExtraBytes(this, buf, p);
    if (r !== undefined)
      return r;
    if (this.lastNeed <= buf.length) {
      buf.copy(this.lastChar, p, 0, this.lastNeed);
      return this.lastChar.toString(this.encoding, 0, this.lastTotal);
    }
    buf.copy(this.lastChar, p, 0, buf.length);
    this.lastNeed -= buf.length;
  }
  function utf8Text(buf, i2) {
    var total = utf8CheckIncomplete(this, buf, i2);
    if (!this.lastNeed)
      return buf.toString("utf8", i2);
    this.lastTotal = total;
    var end = buf.length - (total - this.lastNeed);
    buf.copy(this.lastChar, 0, end);
    return buf.toString("utf8", i2, end);
  }
  function utf8End(buf) {
    var r = buf && buf.length ? this.write(buf) : "";
    if (this.lastNeed)
      return r + "�";
    return r;
  }
  function utf16Text(buf, i2) {
    if ((buf.length - i2) % 2 === 0) {
      var r = buf.toString("utf16le", i2);
      if (r) {
        var c = r.charCodeAt(r.length - 1);
        if (c >= 55296 && c <= 56319) {
          this.lastNeed = 2;
          this.lastTotal = 4;
          this.lastChar[0] = buf[buf.length - 2];
          this.lastChar[1] = buf[buf.length - 1];
          return r.slice(0, -1);
        }
      }
      return r;
    }
    this.lastNeed = 1;
    this.lastTotal = 2;
    this.lastChar[0] = buf[buf.length - 1];
    return buf.toString("utf16le", i2, buf.length - 1);
  }
  function utf16End(buf) {
    var r = buf && buf.length ? this.write(buf) : "";
    if (this.lastNeed) {
      var end = this.lastTotal - this.lastNeed;
      return r + this.lastChar.toString("utf16le", 0, end);
    }
    return r;
  }
  function base64Text(buf, i2) {
    var n = (buf.length - i2) % 3;
    if (n === 0)
      return buf.toString("base64", i2);
    this.lastNeed = 3 - n;
    this.lastTotal = 3;
    if (n === 1) {
      this.lastChar[0] = buf[buf.length - 1];
    } else {
      this.lastChar[0] = buf[buf.length - 2];
      this.lastChar[1] = buf[buf.length - 1];
    }
    return buf.toString("base64", i2, buf.length - n);
  }
  function base64End(buf) {
    var r = buf && buf.length ? this.write(buf) : "";
    if (this.lastNeed)
      return r + this.lastChar.toString("base64", 0, 3 - this.lastNeed);
    return r;
  }
  function simpleWrite(buf) {
    return buf.toString(this.encoding);
  }
  function simpleEnd(buf) {
    return buf && buf.length ? this.write(buf) : "";
  }
});

// node_modules/poppygl/node_modules/readable-stream/lib/internal/streams/from.js
var require_from = __commonJS((exports, module) => {
  var process2 = require_process();
  var { PromisePrototypeThen, SymbolAsyncIterator, SymbolIterator } = require_primordials();
  var { Buffer: Buffer2 } = __require("buffer");
  var { ERR_INVALID_ARG_TYPE, ERR_STREAM_NULL_VALUES } = require_errors().codes;
  function from(Readable, iterable, opts) {
    let iterator;
    if (typeof iterable === "string" || iterable instanceof Buffer2) {
      return new Readable({
        objectMode: true,
        ...opts,
        read() {
          this.push(iterable);
          this.push(null);
        }
      });
    }
    let isAsync;
    if (iterable && iterable[SymbolAsyncIterator]) {
      isAsync = true;
      iterator = iterable[SymbolAsyncIterator]();
    } else if (iterable && iterable[SymbolIterator]) {
      isAsync = false;
      iterator = iterable[SymbolIterator]();
    } else {
      throw new ERR_INVALID_ARG_TYPE("iterable", ["Iterable"], iterable);
    }
    const readable = new Readable({
      objectMode: true,
      highWaterMark: 1,
      ...opts
    });
    let reading = false;
    readable._read = function() {
      if (!reading) {
        reading = true;
        next();
      }
    };
    readable._destroy = function(error, cb) {
      PromisePrototypeThen(close(error), () => process2.nextTick(cb, error), (e) => process2.nextTick(cb, e || error));
    };
    async function close(error) {
      const hadError = error !== undefined && error !== null;
      const hasThrow = typeof iterator.throw === "function";
      if (hadError && hasThrow) {
        const { value, done } = await iterator.throw(error);
        await value;
        if (done) {
          return;
        }
      }
      if (typeof iterator.return === "function") {
        const { value } = await iterator.return();
        await value;
      }
    }
    async function next() {
      for (;; ) {
        try {
          const { value, done } = isAsync ? await iterator.next() : iterator.next();
          if (done) {
            readable.push(null);
          } else {
            const res = value && typeof value.then === "function" ? await value : value;
            if (res === null) {
              reading = false;
              throw new ERR_STREAM_NULL_VALUES;
            } else if (readable.push(res)) {
              continue;
            } else {
              reading = false;
            }
          }
        } catch (err2) {
          readable.destroy(err2);
        }
        break;
      }
    }
    return readable;
  }
  module.exports = from;
});

// node_modules/poppygl/node_modules/readable-stream/lib/internal/streams/readable.js
var require_readable = __commonJS((exports, module) => {
  var process2 = require_process();
  var {
    ArrayPrototypeIndexOf,
    NumberIsInteger,
    NumberIsNaN,
    NumberParseInt,
    ObjectDefineProperties,
    ObjectKeys,
    ObjectSetPrototypeOf,
    Promise: Promise2,
    SafeSet,
    SymbolAsyncDispose,
    SymbolAsyncIterator,
    Symbol: Symbol2
  } = require_primordials();
  module.exports = Readable;
  Readable.ReadableState = ReadableState;
  var { EventEmitter: EE } = __require("events");
  var { Stream, prependListener } = require_legacy();
  var { Buffer: Buffer2 } = __require("buffer");
  var { addAbortSignal } = require_add_abort_signal();
  var eos = require_end_of_stream();
  var debug = require_util().debuglog("stream", (fn) => {
    debug = fn;
  });
  var BufferList = require_buffer_list();
  var destroyImpl = require_destroy();
  var { getHighWaterMark, getDefaultHighWaterMark } = require_state();
  var {
    aggregateTwoErrors,
    codes: {
      ERR_INVALID_ARG_TYPE,
      ERR_METHOD_NOT_IMPLEMENTED,
      ERR_OUT_OF_RANGE,
      ERR_STREAM_PUSH_AFTER_EOF,
      ERR_STREAM_UNSHIFT_AFTER_END_EVENT
    },
    AbortError
  } = require_errors();
  var { validateObject } = require_validators();
  var kPaused = Symbol2("kPaused");
  var { StringDecoder } = require_string_decoder();
  var from = require_from();
  ObjectSetPrototypeOf(Readable.prototype, Stream.prototype);
  ObjectSetPrototypeOf(Readable, Stream);
  var nop = () => {};
  var { errorOrDestroy } = destroyImpl;
  var kObjectMode = 1 << 0;
  var kEnded = 1 << 1;
  var kEndEmitted = 1 << 2;
  var kReading = 1 << 3;
  var kConstructed = 1 << 4;
  var kSync = 1 << 5;
  var kNeedReadable = 1 << 6;
  var kEmittedReadable = 1 << 7;
  var kReadableListening = 1 << 8;
  var kResumeScheduled = 1 << 9;
  var kErrorEmitted = 1 << 10;
  var kEmitClose = 1 << 11;
  var kAutoDestroy = 1 << 12;
  var kDestroyed = 1 << 13;
  var kClosed = 1 << 14;
  var kCloseEmitted = 1 << 15;
  var kMultiAwaitDrain = 1 << 16;
  var kReadingMore = 1 << 17;
  var kDataEmitted = 1 << 18;
  function makeBitMapDescriptor(bit) {
    return {
      enumerable: false,
      get() {
        return (this.state & bit) !== 0;
      },
      set(value) {
        if (value)
          this.state |= bit;
        else
          this.state &= ~bit;
      }
    };
  }
  ObjectDefineProperties(ReadableState.prototype, {
    objectMode: makeBitMapDescriptor(kObjectMode),
    ended: makeBitMapDescriptor(kEnded),
    endEmitted: makeBitMapDescriptor(kEndEmitted),
    reading: makeBitMapDescriptor(kReading),
    constructed: makeBitMapDescriptor(kConstructed),
    sync: makeBitMapDescriptor(kSync),
    needReadable: makeBitMapDescriptor(kNeedReadable),
    emittedReadable: makeBitMapDescriptor(kEmittedReadable),
    readableListening: makeBitMapDescriptor(kReadableListening),
    resumeScheduled: makeBitMapDescriptor(kResumeScheduled),
    errorEmitted: makeBitMapDescriptor(kErrorEmitted),
    emitClose: makeBitMapDescriptor(kEmitClose),
    autoDestroy: makeBitMapDescriptor(kAutoDestroy),
    destroyed: makeBitMapDescriptor(kDestroyed),
    closed: makeBitMapDescriptor(kClosed),
    closeEmitted: makeBitMapDescriptor(kCloseEmitted),
    multiAwaitDrain: makeBitMapDescriptor(kMultiAwaitDrain),
    readingMore: makeBitMapDescriptor(kReadingMore),
    dataEmitted: makeBitMapDescriptor(kDataEmitted)
  });
  function ReadableState(options, stream, isDuplex) {
    if (typeof isDuplex !== "boolean")
      isDuplex = stream instanceof require_duplex();
    this.state = kEmitClose | kAutoDestroy | kConstructed | kSync;
    if (options && options.objectMode)
      this.state |= kObjectMode;
    if (isDuplex && options && options.readableObjectMode)
      this.state |= kObjectMode;
    this.highWaterMark = options ? getHighWaterMark(this, options, "readableHighWaterMark", isDuplex) : getDefaultHighWaterMark(false);
    this.buffer = new BufferList;
    this.length = 0;
    this.pipes = [];
    this.flowing = null;
    this[kPaused] = null;
    if (options && options.emitClose === false)
      this.state &= ~kEmitClose;
    if (options && options.autoDestroy === false)
      this.state &= ~kAutoDestroy;
    this.errored = null;
    this.defaultEncoding = options && options.defaultEncoding || "utf8";
    this.awaitDrainWriters = null;
    this.decoder = null;
    this.encoding = null;
    if (options && options.encoding) {
      this.decoder = new StringDecoder(options.encoding);
      this.encoding = options.encoding;
    }
  }
  function Readable(options) {
    if (!(this instanceof Readable))
      return new Readable(options);
    const isDuplex = this instanceof require_duplex();
    this._readableState = new ReadableState(options, this, isDuplex);
    if (options) {
      if (typeof options.read === "function")
        this._read = options.read;
      if (typeof options.destroy === "function")
        this._destroy = options.destroy;
      if (typeof options.construct === "function")
        this._construct = options.construct;
      if (options.signal && !isDuplex)
        addAbortSignal(options.signal, this);
    }
    Stream.call(this, options);
    destroyImpl.construct(this, () => {
      if (this._readableState.needReadable) {
        maybeReadMore(this, this._readableState);
      }
    });
  }
  Readable.prototype.destroy = destroyImpl.destroy;
  Readable.prototype._undestroy = destroyImpl.undestroy;
  Readable.prototype._destroy = function(err2, cb) {
    cb(err2);
  };
  Readable.prototype[EE.captureRejectionSymbol] = function(err2) {
    this.destroy(err2);
  };
  Readable.prototype[SymbolAsyncDispose] = function() {
    let error;
    if (!this.destroyed) {
      error = this.readableEnded ? null : new AbortError;
      this.destroy(error);
    }
    return new Promise2((resolve, reject) => eos(this, (err2) => err2 && err2 !== error ? reject(err2) : resolve(null)));
  };
  Readable.prototype.push = function(chunk, encoding) {
    return readableAddChunk(this, chunk, encoding, false);
  };
  Readable.prototype.unshift = function(chunk, encoding) {
    return readableAddChunk(this, chunk, encoding, true);
  };
  function readableAddChunk(stream, chunk, encoding, addToFront) {
    debug("readableAddChunk", chunk);
    const state = stream._readableState;
    let err2;
    if ((state.state & kObjectMode) === 0) {
      if (typeof chunk === "string") {
        encoding = encoding || state.defaultEncoding;
        if (state.encoding !== encoding) {
          if (addToFront && state.encoding) {
            chunk = Buffer2.from(chunk, encoding).toString(state.encoding);
          } else {
            chunk = Buffer2.from(chunk, encoding);
            encoding = "";
          }
        }
      } else if (chunk instanceof Buffer2) {
        encoding = "";
      } else if (Stream._isUint8Array(chunk)) {
        chunk = Stream._uint8ArrayToBuffer(chunk);
        encoding = "";
      } else if (chunk != null) {
        err2 = new ERR_INVALID_ARG_TYPE("chunk", ["string", "Buffer", "Uint8Array"], chunk);
      }
    }
    if (err2) {
      errorOrDestroy(stream, err2);
    } else if (chunk === null) {
      state.state &= ~kReading;
      onEofChunk(stream, state);
    } else if ((state.state & kObjectMode) !== 0 || chunk && chunk.length > 0) {
      if (addToFront) {
        if ((state.state & kEndEmitted) !== 0)
          errorOrDestroy(stream, new ERR_STREAM_UNSHIFT_AFTER_END_EVENT);
        else if (state.destroyed || state.errored)
          return false;
        else
          addChunk(stream, state, chunk, true);
      } else if (state.ended) {
        errorOrDestroy(stream, new ERR_STREAM_PUSH_AFTER_EOF);
      } else if (state.destroyed || state.errored) {
        return false;
      } else {
        state.state &= ~kReading;
        if (state.decoder && !encoding) {
          chunk = state.decoder.write(chunk);
          if (state.objectMode || chunk.length !== 0)
            addChunk(stream, state, chunk, false);
          else
            maybeReadMore(stream, state);
        } else {
          addChunk(stream, state, chunk, false);
        }
      }
    } else if (!addToFront) {
      state.state &= ~kReading;
      maybeReadMore(stream, state);
    }
    return !state.ended && (state.length < state.highWaterMark || state.length === 0);
  }
  function addChunk(stream, state, chunk, addToFront) {
    if (state.flowing && state.length === 0 && !state.sync && stream.listenerCount("data") > 0) {
      if ((state.state & kMultiAwaitDrain) !== 0) {
        state.awaitDrainWriters.clear();
      } else {
        state.awaitDrainWriters = null;
      }
      state.dataEmitted = true;
      stream.emit("data", chunk);
    } else {
      state.length += state.objectMode ? 1 : chunk.length;
      if (addToFront)
        state.buffer.unshift(chunk);
      else
        state.buffer.push(chunk);
      if ((state.state & kNeedReadable) !== 0)
        emitReadable(stream);
    }
    maybeReadMore(stream, state);
  }
  Readable.prototype.isPaused = function() {
    const state = this._readableState;
    return state[kPaused] === true || state.flowing === false;
  };
  Readable.prototype.setEncoding = function(enc) {
    const decoder = new StringDecoder(enc);
    this._readableState.decoder = decoder;
    this._readableState.encoding = this._readableState.decoder.encoding;
    const buffer = this._readableState.buffer;
    let content = "";
    for (const data of buffer) {
      content += decoder.write(data);
    }
    buffer.clear();
    if (content !== "")
      buffer.push(content);
    this._readableState.length = content.length;
    return this;
  };
  var MAX_HWM = 1073741824;
  function computeNewHighWaterMark(n) {
    if (n > MAX_HWM) {
      throw new ERR_OUT_OF_RANGE("size", "<= 1GiB", n);
    } else {
      n--;
      n |= n >>> 1;
      n |= n >>> 2;
      n |= n >>> 4;
      n |= n >>> 8;
      n |= n >>> 16;
      n++;
    }
    return n;
  }
  function howMuchToRead(n, state) {
    if (n <= 0 || state.length === 0 && state.ended)
      return 0;
    if ((state.state & kObjectMode) !== 0)
      return 1;
    if (NumberIsNaN(n)) {
      if (state.flowing && state.length)
        return state.buffer.first().length;
      return state.length;
    }
    if (n <= state.length)
      return n;
    return state.ended ? state.length : 0;
  }
  Readable.prototype.read = function(n) {
    debug("read", n);
    if (n === undefined) {
      n = NaN;
    } else if (!NumberIsInteger(n)) {
      n = NumberParseInt(n, 10);
    }
    const state = this._readableState;
    const nOrig = n;
    if (n > state.highWaterMark)
      state.highWaterMark = computeNewHighWaterMark(n);
    if (n !== 0)
      state.state &= ~kEmittedReadable;
    if (n === 0 && state.needReadable && ((state.highWaterMark !== 0 ? state.length >= state.highWaterMark : state.length > 0) || state.ended)) {
      debug("read: emitReadable", state.length, state.ended);
      if (state.length === 0 && state.ended)
        endReadable(this);
      else
        emitReadable(this);
      return null;
    }
    n = howMuchToRead(n, state);
    if (n === 0 && state.ended) {
      if (state.length === 0)
        endReadable(this);
      return null;
    }
    let doRead = (state.state & kNeedReadable) !== 0;
    debug("need readable", doRead);
    if (state.length === 0 || state.length - n < state.highWaterMark) {
      doRead = true;
      debug("length less than watermark", doRead);
    }
    if (state.ended || state.reading || state.destroyed || state.errored || !state.constructed) {
      doRead = false;
      debug("reading, ended or constructing", doRead);
    } else if (doRead) {
      debug("do read");
      state.state |= kReading | kSync;
      if (state.length === 0)
        state.state |= kNeedReadable;
      try {
        this._read(state.highWaterMark);
      } catch (err2) {
        errorOrDestroy(this, err2);
      }
      state.state &= ~kSync;
      if (!state.reading)
        n = howMuchToRead(nOrig, state);
    }
    let ret;
    if (n > 0)
      ret = fromList(n, state);
    else
      ret = null;
    if (ret === null) {
      state.needReadable = state.length <= state.highWaterMark;
      n = 0;
    } else {
      state.length -= n;
      if (state.multiAwaitDrain) {
        state.awaitDrainWriters.clear();
      } else {
        state.awaitDrainWriters = null;
      }
    }
    if (state.length === 0) {
      if (!state.ended)
        state.needReadable = true;
      if (nOrig !== n && state.ended)
        endReadable(this);
    }
    if (ret !== null && !state.errorEmitted && !state.closeEmitted) {
      state.dataEmitted = true;
      this.emit("data", ret);
    }
    return ret;
  };
  function onEofChunk(stream, state) {
    debug("onEofChunk");
    if (state.ended)
      return;
    if (state.decoder) {
      const chunk = state.decoder.end();
      if (chunk && chunk.length) {
        state.buffer.push(chunk);
        state.length += state.objectMode ? 1 : chunk.length;
      }
    }
    state.ended = true;
    if (state.sync) {
      emitReadable(stream);
    } else {
      state.needReadable = false;
      state.emittedReadable = true;
      emitReadable_(stream);
    }
  }
  function emitReadable(stream) {
    const state = stream._readableState;
    debug("emitReadable", state.needReadable, state.emittedReadable);
    state.needReadable = false;
    if (!state.emittedReadable) {
      debug("emitReadable", state.flowing);
      state.emittedReadable = true;
      process2.nextTick(emitReadable_, stream);
    }
  }
  function emitReadable_(stream) {
    const state = stream._readableState;
    debug("emitReadable_", state.destroyed, state.length, state.ended);
    if (!state.destroyed && !state.errored && (state.length || state.ended)) {
      stream.emit("readable");
      state.emittedReadable = false;
    }
    state.needReadable = !state.flowing && !state.ended && state.length <= state.highWaterMark;
    flow(stream);
  }
  function maybeReadMore(stream, state) {
    if (!state.readingMore && state.constructed) {
      state.readingMore = true;
      process2.nextTick(maybeReadMore_, stream, state);
    }
  }
  function maybeReadMore_(stream, state) {
    while (!state.reading && !state.ended && (state.length < state.highWaterMark || state.flowing && state.length === 0)) {
      const len = state.length;
      debug("maybeReadMore read 0");
      stream.read(0);
      if (len === state.length)
        break;
    }
    state.readingMore = false;
  }
  Readable.prototype._read = function(n) {
    throw new ERR_METHOD_NOT_IMPLEMENTED("_read()");
  };
  Readable.prototype.pipe = function(dest, pipeOpts) {
    const src = this;
    const state = this._readableState;
    if (state.pipes.length === 1) {
      if (!state.multiAwaitDrain) {
        state.multiAwaitDrain = true;
        state.awaitDrainWriters = new SafeSet(state.awaitDrainWriters ? [state.awaitDrainWriters] : []);
      }
    }
    state.pipes.push(dest);
    debug("pipe count=%d opts=%j", state.pipes.length, pipeOpts);
    const doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process2.stdout && dest !== process2.stderr;
    const endFn = doEnd ? onend : unpipe;
    if (state.endEmitted)
      process2.nextTick(endFn);
    else
      src.once("end", endFn);
    dest.on("unpipe", onunpipe);
    function onunpipe(readable, unpipeInfo) {
      debug("onunpipe");
      if (readable === src) {
        if (unpipeInfo && unpipeInfo.hasUnpiped === false) {
          unpipeInfo.hasUnpiped = true;
          cleanup();
        }
      }
    }
    function onend() {
      debug("onend");
      dest.end();
    }
    let ondrain;
    let cleanedUp = false;
    function cleanup() {
      debug("cleanup");
      dest.removeListener("close", onclose);
      dest.removeListener("finish", onfinish);
      if (ondrain) {
        dest.removeListener("drain", ondrain);
      }
      dest.removeListener("error", onerror);
      dest.removeListener("unpipe", onunpipe);
      src.removeListener("end", onend);
      src.removeListener("end", unpipe);
      src.removeListener("data", ondata);
      cleanedUp = true;
      if (ondrain && state.awaitDrainWriters && (!dest._writableState || dest._writableState.needDrain))
        ondrain();
    }
    function pause() {
      if (!cleanedUp) {
        if (state.pipes.length === 1 && state.pipes[0] === dest) {
          debug("false write response, pause", 0);
          state.awaitDrainWriters = dest;
          state.multiAwaitDrain = false;
        } else if (state.pipes.length > 1 && state.pipes.includes(dest)) {
          debug("false write response, pause", state.awaitDrainWriters.size);
          state.awaitDrainWriters.add(dest);
        }
        src.pause();
      }
      if (!ondrain) {
        ondrain = pipeOnDrain(src, dest);
        dest.on("drain", ondrain);
      }
    }
    src.on("data", ondata);
    function ondata(chunk) {
      debug("ondata");
      const ret = dest.write(chunk);
      debug("dest.write", ret);
      if (ret === false) {
        pause();
      }
    }
    function onerror(er) {
      debug("onerror", er);
      unpipe();
      dest.removeListener("error", onerror);
      if (dest.listenerCount("error") === 0) {
        const s = dest._writableState || dest._readableState;
        if (s && !s.errorEmitted) {
          errorOrDestroy(dest, er);
        } else {
          dest.emit("error", er);
        }
      }
    }
    prependListener(dest, "error", onerror);
    function onclose() {
      dest.removeListener("finish", onfinish);
      unpipe();
    }
    dest.once("close", onclose);
    function onfinish() {
      debug("onfinish");
      dest.removeListener("close", onclose);
      unpipe();
    }
    dest.once("finish", onfinish);
    function unpipe() {
      debug("unpipe");
      src.unpipe(dest);
    }
    dest.emit("pipe", src);
    if (dest.writableNeedDrain === true) {
      pause();
    } else if (!state.flowing) {
      debug("pipe resume");
      src.resume();
    }
    return dest;
  };
  function pipeOnDrain(src, dest) {
    return function pipeOnDrainFunctionResult() {
      const state = src._readableState;
      if (state.awaitDrainWriters === dest) {
        debug("pipeOnDrain", 1);
        state.awaitDrainWriters = null;
      } else if (state.multiAwaitDrain) {
        debug("pipeOnDrain", state.awaitDrainWriters.size);
        state.awaitDrainWriters.delete(dest);
      }
      if ((!state.awaitDrainWriters || state.awaitDrainWriters.size === 0) && src.listenerCount("data")) {
        src.resume();
      }
    };
  }
  Readable.prototype.unpipe = function(dest) {
    const state = this._readableState;
    const unpipeInfo = {
      hasUnpiped: false
    };
    if (state.pipes.length === 0)
      return this;
    if (!dest) {
      const dests = state.pipes;
      state.pipes = [];
      this.pause();
      for (let i2 = 0;i2 < dests.length; i2++)
        dests[i2].emit("unpipe", this, {
          hasUnpiped: false
        });
      return this;
    }
    const index = ArrayPrototypeIndexOf(state.pipes, dest);
    if (index === -1)
      return this;
    state.pipes.splice(index, 1);
    if (state.pipes.length === 0)
      this.pause();
    dest.emit("unpipe", this, unpipeInfo);
    return this;
  };
  Readable.prototype.on = function(ev, fn) {
    const res = Stream.prototype.on.call(this, ev, fn);
    const state = this._readableState;
    if (ev === "data") {
      state.readableListening = this.listenerCount("readable") > 0;
      if (state.flowing !== false)
        this.resume();
    } else if (ev === "readable") {
      if (!state.endEmitted && !state.readableListening) {
        state.readableListening = state.needReadable = true;
        state.flowing = false;
        state.emittedReadable = false;
        debug("on readable", state.length, state.reading);
        if (state.length) {
          emitReadable(this);
        } else if (!state.reading) {
          process2.nextTick(nReadingNextTick, this);
        }
      }
    }
    return res;
  };
  Readable.prototype.addListener = Readable.prototype.on;
  Readable.prototype.removeListener = function(ev, fn) {
    const res = Stream.prototype.removeListener.call(this, ev, fn);
    if (ev === "readable") {
      process2.nextTick(updateReadableListening, this);
    }
    return res;
  };
  Readable.prototype.off = Readable.prototype.removeListener;
  Readable.prototype.removeAllListeners = function(ev) {
    const res = Stream.prototype.removeAllListeners.apply(this, arguments);
    if (ev === "readable" || ev === undefined) {
      process2.nextTick(updateReadableListening, this);
    }
    return res;
  };
  function updateReadableListening(self) {
    const state = self._readableState;
    state.readableListening = self.listenerCount("readable") > 0;
    if (state.resumeScheduled && state[kPaused] === false) {
      state.flowing = true;
    } else if (self.listenerCount("data") > 0) {
      self.resume();
    } else if (!state.readableListening) {
      state.flowing = null;
    }
  }
  function nReadingNextTick(self) {
    debug("readable nexttick read 0");
    self.read(0);
  }
  Readable.prototype.resume = function() {
    const state = this._readableState;
    if (!state.flowing) {
      debug("resume");
      state.flowing = !state.readableListening;
      resume(this, state);
    }
    state[kPaused] = false;
    return this;
  };
  function resume(stream, state) {
    if (!state.resumeScheduled) {
      state.resumeScheduled = true;
      process2.nextTick(resume_, stream, state);
    }
  }
  function resume_(stream, state) {
    debug("resume", state.reading);
    if (!state.reading) {
      stream.read(0);
    }
    state.resumeScheduled = false;
    stream.emit("resume");
    flow(stream);
    if (state.flowing && !state.reading)
      stream.read(0);
  }
  Readable.prototype.pause = function() {
    debug("call pause flowing=%j", this._readableState.flowing);
    if (this._readableState.flowing !== false) {
      debug("pause");
      this._readableState.flowing = false;
      this.emit("pause");
    }
    this._readableState[kPaused] = true;
    return this;
  };
  function flow(stream) {
    const state = stream._readableState;
    debug("flow", state.flowing);
    while (state.flowing && stream.read() !== null)
      ;
  }
  Readable.prototype.wrap = function(stream) {
    let paused = false;
    stream.on("data", (chunk) => {
      if (!this.push(chunk) && stream.pause) {
        paused = true;
        stream.pause();
      }
    });
    stream.on("end", () => {
      this.push(null);
    });
    stream.on("error", (err2) => {
      errorOrDestroy(this, err2);
    });
    stream.on("close", () => {
      this.destroy();
    });
    stream.on("destroy", () => {
      this.destroy();
    });
    this._read = () => {
      if (paused && stream.resume) {
        paused = false;
        stream.resume();
      }
    };
    const streamKeys = ObjectKeys(stream);
    for (let j = 1;j < streamKeys.length; j++) {
      const i2 = streamKeys[j];
      if (this[i2] === undefined && typeof stream[i2] === "function") {
        this[i2] = stream[i2].bind(stream);
      }
    }
    return this;
  };
  Readable.prototype[SymbolAsyncIterator] = function() {
    return streamToAsyncIterator(this);
  };
  Readable.prototype.iterator = function(options) {
    if (options !== undefined) {
      validateObject(options, "options");
    }
    return streamToAsyncIterator(this, options);
  };
  function streamToAsyncIterator(stream, options) {
    if (typeof stream.read !== "function") {
      stream = Readable.wrap(stream, {
        objectMode: true
      });
    }
    const iter = createAsyncIterator(stream, options);
    iter.stream = stream;
    return iter;
  }
  async function* createAsyncIterator(stream, options) {
    let callback = nop;
    function next(resolve) {
      if (this === stream) {
        callback();
        callback = nop;
      } else {
        callback = resolve;
      }
    }
    stream.on("readable", next);
    let error;
    const cleanup = eos(stream, {
      writable: false
    }, (err2) => {
      error = err2 ? aggregateTwoErrors(error, err2) : null;
      callback();
      callback = nop;
    });
    try {
      while (true) {
        const chunk = stream.destroyed ? null : stream.read();
        if (chunk !== null) {
          yield chunk;
        } else if (error) {
          throw error;
        } else if (error === null) {
          return;
        } else {
          await new Promise2(next);
        }
      }
    } catch (err2) {
      error = aggregateTwoErrors(error, err2);
      throw error;
    } finally {
      if ((error || (options === null || options === undefined ? undefined : options.destroyOnReturn) !== false) && (error === undefined || stream._readableState.autoDestroy)) {
        destroyImpl.destroyer(stream, null);
      } else {
        stream.off("readable", next);
        cleanup();
      }
    }
  }
  ObjectDefineProperties(Readable.prototype, {
    readable: {
      __proto__: null,
      get() {
        const r = this._readableState;
        return !!r && r.readable !== false && !r.destroyed && !r.errorEmitted && !r.endEmitted;
      },
      set(val) {
        if (this._readableState) {
          this._readableState.readable = !!val;
        }
      }
    },
    readableDidRead: {
      __proto__: null,
      enumerable: false,
      get: function() {
        return this._readableState.dataEmitted;
      }
    },
    readableAborted: {
      __proto__: null,
      enumerable: false,
      get: function() {
        return !!(this._readableState.readable !== false && (this._readableState.destroyed || this._readableState.errored) && !this._readableState.endEmitted);
      }
    },
    readableHighWaterMark: {
      __proto__: null,
      enumerable: false,
      get: function() {
        return this._readableState.highWaterMark;
      }
    },
    readableBuffer: {
      __proto__: null,
      enumerable: false,
      get: function() {
        return this._readableState && this._readableState.buffer;
      }
    },
    readableFlowing: {
      __proto__: null,
      enumerable: false,
      get: function() {
        return this._readableState.flowing;
      },
      set: function(state) {
        if (this._readableState) {
          this._readableState.flowing = state;
        }
      }
    },
    readableLength: {
      __proto__: null,
      enumerable: false,
      get() {
        return this._readableState.length;
      }
    },
    readableObjectMode: {
      __proto__: null,
      enumerable: false,
      get() {
        return this._readableState ? this._readableState.objectMode : false;
      }
    },
    readableEncoding: {
      __proto__: null,
      enumerable: false,
      get() {
        return this._readableState ? this._readableState.encoding : null;
      }
    },
    errored: {
      __proto__: null,
      enumerable: false,
      get() {
        return this._readableState ? this._readableState.errored : null;
      }
    },
    closed: {
      __proto__: null,
      get() {
        return this._readableState ? this._readableState.closed : false;
      }
    },
    destroyed: {
      __proto__: null,
      enumerable: false,
      get() {
        return this._readableState ? this._readableState.destroyed : false;
      },
      set(value) {
        if (!this._readableState) {
          return;
        }
        this._readableState.destroyed = value;
      }
    },
    readableEnded: {
      __proto__: null,
      enumerable: false,
      get() {
        return this._readableState ? this._readableState.endEmitted : false;
      }
    }
  });
  ObjectDefineProperties(ReadableState.prototype, {
    pipesCount: {
      __proto__: null,
      get() {
        return this.pipes.length;
      }
    },
    paused: {
      __proto__: null,
      get() {
        return this[kPaused] !== false;
      },
      set(value) {
        this[kPaused] = !!value;
      }
    }
  });
  Readable._fromList = fromList;
  function fromList(n, state) {
    if (state.length === 0)
      return null;
    let ret;
    if (state.objectMode)
      ret = state.buffer.shift();
    else if (!n || n >= state.length) {
      if (state.decoder)
        ret = state.buffer.join("");
      else if (state.buffer.length === 1)
        ret = state.buffer.first();
      else
        ret = state.buffer.concat(state.length);
      state.buffer.clear();
    } else {
      ret = state.buffer.consume(n, state.decoder);
    }
    return ret;
  }
  function endReadable(stream) {
    const state = stream._readableState;
    debug("endReadable", state.endEmitted);
    if (!state.endEmitted) {
      state.ended = true;
      process2.nextTick(endReadableNT, state, stream);
    }
  }
  function endReadableNT(state, stream) {
    debug("endReadableNT", state.endEmitted, state.length);
    if (!state.errored && !state.closeEmitted && !state.endEmitted && state.length === 0) {
      state.endEmitted = true;
      stream.emit("end");
      if (stream.writable && stream.allowHalfOpen === false) {
        process2.nextTick(endWritableNT, stream);
      } else if (state.autoDestroy) {
        const wState = stream._writableState;
        const autoDestroy = !wState || wState.autoDestroy && (wState.finished || wState.writable === false);
        if (autoDestroy) {
          stream.destroy();
        }
      }
    }
  }
  function endWritableNT(stream) {
    const writable = stream.writable && !stream.writableEnded && !stream.destroyed;
    if (writable) {
      stream.end();
    }
  }
  Readable.from = function(iterable, opts) {
    return from(Readable, iterable, opts);
  };
  var webStreamsAdapters;
  function lazyWebStreams() {
    if (webStreamsAdapters === undefined)
      webStreamsAdapters = {};
    return webStreamsAdapters;
  }
  Readable.fromWeb = function(readableStream, options) {
    return lazyWebStreams().newStreamReadableFromReadableStream(readableStream, options);
  };
  Readable.toWeb = function(streamReadable, options) {
    return lazyWebStreams().newReadableStreamFromStreamReadable(streamReadable, options);
  };
  Readable.wrap = function(src, options) {
    var _ref, _src$readableObjectMo;
    return new Readable({
      objectMode: (_ref = (_src$readableObjectMo = src.readableObjectMode) !== null && _src$readableObjectMo !== undefined ? _src$readableObjectMo : src.objectMode) !== null && _ref !== undefined ? _ref : true,
      ...options,
      destroy(err2, callback) {
        destroyImpl.destroyer(src, err2);
        callback(err2);
      }
    }).wrap(src);
  };
});

// node_modules/poppygl/node_modules/readable-stream/lib/internal/streams/writable.js
var require_writable = __commonJS((exports, module) => {
  var process2 = require_process();
  var {
    ArrayPrototypeSlice,
    Error: Error2,
    FunctionPrototypeSymbolHasInstance,
    ObjectDefineProperty,
    ObjectDefineProperties,
    ObjectSetPrototypeOf,
    StringPrototypeToLowerCase,
    Symbol: Symbol2,
    SymbolHasInstance
  } = require_primordials();
  module.exports = Writable;
  Writable.WritableState = WritableState;
  var { EventEmitter: EE } = __require("events");
  var Stream = require_legacy().Stream;
  var { Buffer: Buffer2 } = __require("buffer");
  var destroyImpl = require_destroy();
  var { addAbortSignal } = require_add_abort_signal();
  var { getHighWaterMark, getDefaultHighWaterMark } = require_state();
  var {
    ERR_INVALID_ARG_TYPE,
    ERR_METHOD_NOT_IMPLEMENTED,
    ERR_MULTIPLE_CALLBACK,
    ERR_STREAM_CANNOT_PIPE,
    ERR_STREAM_DESTROYED,
    ERR_STREAM_ALREADY_FINISHED,
    ERR_STREAM_NULL_VALUES,
    ERR_STREAM_WRITE_AFTER_END,
    ERR_UNKNOWN_ENCODING
  } = require_errors().codes;
  var { errorOrDestroy } = destroyImpl;
  ObjectSetPrototypeOf(Writable.prototype, Stream.prototype);
  ObjectSetPrototypeOf(Writable, Stream);
  function nop() {}
  var kOnFinished = Symbol2("kOnFinished");
  function WritableState(options, stream, isDuplex) {
    if (typeof isDuplex !== "boolean")
      isDuplex = stream instanceof require_duplex();
    this.objectMode = !!(options && options.objectMode);
    if (isDuplex)
      this.objectMode = this.objectMode || !!(options && options.writableObjectMode);
    this.highWaterMark = options ? getHighWaterMark(this, options, "writableHighWaterMark", isDuplex) : getDefaultHighWaterMark(false);
    this.finalCalled = false;
    this.needDrain = false;
    this.ending = false;
    this.ended = false;
    this.finished = false;
    this.destroyed = false;
    const noDecode = !!(options && options.decodeStrings === false);
    this.decodeStrings = !noDecode;
    this.defaultEncoding = options && options.defaultEncoding || "utf8";
    this.length = 0;
    this.writing = false;
    this.corked = 0;
    this.sync = true;
    this.bufferProcessing = false;
    this.onwrite = onwrite.bind(undefined, stream);
    this.writecb = null;
    this.writelen = 0;
    this.afterWriteTickInfo = null;
    resetBuffer(this);
    this.pendingcb = 0;
    this.constructed = true;
    this.prefinished = false;
    this.errorEmitted = false;
    this.emitClose = !options || options.emitClose !== false;
    this.autoDestroy = !options || options.autoDestroy !== false;
    this.errored = null;
    this.closed = false;
    this.closeEmitted = false;
    this[kOnFinished] = [];
  }
  function resetBuffer(state) {
    state.buffered = [];
    state.bufferedIndex = 0;
    state.allBuffers = true;
    state.allNoop = true;
  }
  WritableState.prototype.getBuffer = function getBuffer() {
    return ArrayPrototypeSlice(this.buffered, this.bufferedIndex);
  };
  ObjectDefineProperty(WritableState.prototype, "bufferedRequestCount", {
    __proto__: null,
    get() {
      return this.buffered.length - this.bufferedIndex;
    }
  });
  function Writable(options) {
    const isDuplex = this instanceof require_duplex();
    if (!isDuplex && !FunctionPrototypeSymbolHasInstance(Writable, this))
      return new Writable(options);
    this._writableState = new WritableState(options, this, isDuplex);
    if (options) {
      if (typeof options.write === "function")
        this._write = options.write;
      if (typeof options.writev === "function")
        this._writev = options.writev;
      if (typeof options.destroy === "function")
        this._destroy = options.destroy;
      if (typeof options.final === "function")
        this._final = options.final;
      if (typeof options.construct === "function")
        this._construct = options.construct;
      if (options.signal)
        addAbortSignal(options.signal, this);
    }
    Stream.call(this, options);
    destroyImpl.construct(this, () => {
      const state = this._writableState;
      if (!state.writing) {
        clearBuffer(this, state);
      }
      finishMaybe(this, state);
    });
  }
  ObjectDefineProperty(Writable, SymbolHasInstance, {
    __proto__: null,
    value: function(object) {
      if (FunctionPrototypeSymbolHasInstance(this, object))
        return true;
      if (this !== Writable)
        return false;
      return object && object._writableState instanceof WritableState;
    }
  });
  Writable.prototype.pipe = function() {
    errorOrDestroy(this, new ERR_STREAM_CANNOT_PIPE);
  };
  function _write(stream, chunk, encoding, cb) {
    const state = stream._writableState;
    if (typeof encoding === "function") {
      cb = encoding;
      encoding = state.defaultEncoding;
    } else {
      if (!encoding)
        encoding = state.defaultEncoding;
      else if (encoding !== "buffer" && !Buffer2.isEncoding(encoding))
        throw new ERR_UNKNOWN_ENCODING(encoding);
      if (typeof cb !== "function")
        cb = nop;
    }
    if (chunk === null) {
      throw new ERR_STREAM_NULL_VALUES;
    } else if (!state.objectMode) {
      if (typeof chunk === "string") {
        if (state.decodeStrings !== false) {
          chunk = Buffer2.from(chunk, encoding);
          encoding = "buffer";
        }
      } else if (chunk instanceof Buffer2) {
        encoding = "buffer";
      } else if (Stream._isUint8Array(chunk)) {
        chunk = Stream._uint8ArrayToBuffer(chunk);
        encoding = "buffer";
      } else {
        throw new ERR_INVALID_ARG_TYPE("chunk", ["string", "Buffer", "Uint8Array"], chunk);
      }
    }
    let err2;
    if (state.ending) {
      err2 = new ERR_STREAM_WRITE_AFTER_END;
    } else if (state.destroyed) {
      err2 = new ERR_STREAM_DESTROYED("write");
    }
    if (err2) {
      process2.nextTick(cb, err2);
      errorOrDestroy(stream, err2, true);
      return err2;
    }
    state.pendingcb++;
    return writeOrBuffer(stream, state, chunk, encoding, cb);
  }
  Writable.prototype.write = function(chunk, encoding, cb) {
    return _write(this, chunk, encoding, cb) === true;
  };
  Writable.prototype.cork = function() {
    this._writableState.corked++;
  };
  Writable.prototype.uncork = function() {
    const state = this._writableState;
    if (state.corked) {
      state.corked--;
      if (!state.writing)
        clearBuffer(this, state);
    }
  };
  Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
    if (typeof encoding === "string")
      encoding = StringPrototypeToLowerCase(encoding);
    if (!Buffer2.isEncoding(encoding))
      throw new ERR_UNKNOWN_ENCODING(encoding);
    this._writableState.defaultEncoding = encoding;
    return this;
  };
  function writeOrBuffer(stream, state, chunk, encoding, callback) {
    const len = state.objectMode ? 1 : chunk.length;
    state.length += len;
    const ret = state.length < state.highWaterMark;
    if (!ret)
      state.needDrain = true;
    if (state.writing || state.corked || state.errored || !state.constructed) {
      state.buffered.push({
        chunk,
        encoding,
        callback
      });
      if (state.allBuffers && encoding !== "buffer") {
        state.allBuffers = false;
      }
      if (state.allNoop && callback !== nop) {
        state.allNoop = false;
      }
    } else {
      state.writelen = len;
      state.writecb = callback;
      state.writing = true;
      state.sync = true;
      stream._write(chunk, encoding, state.onwrite);
      state.sync = false;
    }
    return ret && !state.errored && !state.destroyed;
  }
  function doWrite(stream, state, writev, len, chunk, encoding, cb) {
    state.writelen = len;
    state.writecb = cb;
    state.writing = true;
    state.sync = true;
    if (state.destroyed)
      state.onwrite(new ERR_STREAM_DESTROYED("write"));
    else if (writev)
      stream._writev(chunk, state.onwrite);
    else
      stream._write(chunk, encoding, state.onwrite);
    state.sync = false;
  }
  function onwriteError(stream, state, er, cb) {
    --state.pendingcb;
    cb(er);
    errorBuffer(state);
    errorOrDestroy(stream, er);
  }
  function onwrite(stream, er) {
    const state = stream._writableState;
    const sync = state.sync;
    const cb = state.writecb;
    if (typeof cb !== "function") {
      errorOrDestroy(stream, new ERR_MULTIPLE_CALLBACK);
      return;
    }
    state.writing = false;
    state.writecb = null;
    state.length -= state.writelen;
    state.writelen = 0;
    if (er) {
      er.stack;
      if (!state.errored) {
        state.errored = er;
      }
      if (stream._readableState && !stream._readableState.errored) {
        stream._readableState.errored = er;
      }
      if (sync) {
        process2.nextTick(onwriteError, stream, state, er, cb);
      } else {
        onwriteError(stream, state, er, cb);
      }
    } else {
      if (state.buffered.length > state.bufferedIndex) {
        clearBuffer(stream, state);
      }
      if (sync) {
        if (state.afterWriteTickInfo !== null && state.afterWriteTickInfo.cb === cb) {
          state.afterWriteTickInfo.count++;
        } else {
          state.afterWriteTickInfo = {
            count: 1,
            cb,
            stream,
            state
          };
          process2.nextTick(afterWriteTick, state.afterWriteTickInfo);
        }
      } else {
        afterWrite(stream, state, 1, cb);
      }
    }
  }
  function afterWriteTick({ stream, state, count, cb }) {
    state.afterWriteTickInfo = null;
    return afterWrite(stream, state, count, cb);
  }
  function afterWrite(stream, state, count, cb) {
    const needDrain = !state.ending && !stream.destroyed && state.length === 0 && state.needDrain;
    if (needDrain) {
      state.needDrain = false;
      stream.emit("drain");
    }
    while (count-- > 0) {
      state.pendingcb--;
      cb();
    }
    if (state.destroyed) {
      errorBuffer(state);
    }
    finishMaybe(stream, state);
  }
  function errorBuffer(state) {
    if (state.writing) {
      return;
    }
    for (let n = state.bufferedIndex;n < state.buffered.length; ++n) {
      var _state$errored;
      const { chunk, callback } = state.buffered[n];
      const len = state.objectMode ? 1 : chunk.length;
      state.length -= len;
      callback((_state$errored = state.errored) !== null && _state$errored !== undefined ? _state$errored : new ERR_STREAM_DESTROYED("write"));
    }
    const onfinishCallbacks = state[kOnFinished].splice(0);
    for (let i2 = 0;i2 < onfinishCallbacks.length; i2++) {
      var _state$errored2;
      onfinishCallbacks[i2]((_state$errored2 = state.errored) !== null && _state$errored2 !== undefined ? _state$errored2 : new ERR_STREAM_DESTROYED("end"));
    }
    resetBuffer(state);
  }
  function clearBuffer(stream, state) {
    if (state.corked || state.bufferProcessing || state.destroyed || !state.constructed) {
      return;
    }
    const { buffered, bufferedIndex, objectMode } = state;
    const bufferedLength = buffered.length - bufferedIndex;
    if (!bufferedLength) {
      return;
    }
    let i2 = bufferedIndex;
    state.bufferProcessing = true;
    if (bufferedLength > 1 && stream._writev) {
      state.pendingcb -= bufferedLength - 1;
      const callback = state.allNoop ? nop : (err2) => {
        for (let n = i2;n < buffered.length; ++n) {
          buffered[n].callback(err2);
        }
      };
      const chunks = state.allNoop && i2 === 0 ? buffered : ArrayPrototypeSlice(buffered, i2);
      chunks.allBuffers = state.allBuffers;
      doWrite(stream, state, true, state.length, chunks, "", callback);
      resetBuffer(state);
    } else {
      do {
        const { chunk, encoding, callback } = buffered[i2];
        buffered[i2++] = null;
        const len = objectMode ? 1 : chunk.length;
        doWrite(stream, state, false, len, chunk, encoding, callback);
      } while (i2 < buffered.length && !state.writing);
      if (i2 === buffered.length) {
        resetBuffer(state);
      } else if (i2 > 256) {
        buffered.splice(0, i2);
        state.bufferedIndex = 0;
      } else {
        state.bufferedIndex = i2;
      }
    }
    state.bufferProcessing = false;
  }
  Writable.prototype._write = function(chunk, encoding, cb) {
    if (this._writev) {
      this._writev([
        {
          chunk,
          encoding
        }
      ], cb);
    } else {
      throw new ERR_METHOD_NOT_IMPLEMENTED("_write()");
    }
  };
  Writable.prototype._writev = null;
  Writable.prototype.end = function(chunk, encoding, cb) {
    const state = this._writableState;
    if (typeof chunk === "function") {
      cb = chunk;
      chunk = null;
      encoding = null;
    } else if (typeof encoding === "function") {
      cb = encoding;
      encoding = null;
    }
    let err2;
    if (chunk !== null && chunk !== undefined) {
      const ret = _write(this, chunk, encoding);
      if (ret instanceof Error2) {
        err2 = ret;
      }
    }
    if (state.corked) {
      state.corked = 1;
      this.uncork();
    }
    if (err2) {} else if (!state.errored && !state.ending) {
      state.ending = true;
      finishMaybe(this, state, true);
      state.ended = true;
    } else if (state.finished) {
      err2 = new ERR_STREAM_ALREADY_FINISHED("end");
    } else if (state.destroyed) {
      err2 = new ERR_STREAM_DESTROYED("end");
    }
    if (typeof cb === "function") {
      if (err2 || state.finished) {
        process2.nextTick(cb, err2);
      } else {
        state[kOnFinished].push(cb);
      }
    }
    return this;
  };
  function needFinish(state) {
    return state.ending && !state.destroyed && state.constructed && state.length === 0 && !state.errored && state.buffered.length === 0 && !state.finished && !state.writing && !state.errorEmitted && !state.closeEmitted;
  }
  function callFinal(stream, state) {
    let called = false;
    function onFinish(err2) {
      if (called) {
        errorOrDestroy(stream, err2 !== null && err2 !== undefined ? err2 : ERR_MULTIPLE_CALLBACK());
        return;
      }
      called = true;
      state.pendingcb--;
      if (err2) {
        const onfinishCallbacks = state[kOnFinished].splice(0);
        for (let i2 = 0;i2 < onfinishCallbacks.length; i2++) {
          onfinishCallbacks[i2](err2);
        }
        errorOrDestroy(stream, err2, state.sync);
      } else if (needFinish(state)) {
        state.prefinished = true;
        stream.emit("prefinish");
        state.pendingcb++;
        process2.nextTick(finish, stream, state);
      }
    }
    state.sync = true;
    state.pendingcb++;
    try {
      stream._final(onFinish);
    } catch (err2) {
      onFinish(err2);
    }
    state.sync = false;
  }
  function prefinish(stream, state) {
    if (!state.prefinished && !state.finalCalled) {
      if (typeof stream._final === "function" && !state.destroyed) {
        state.finalCalled = true;
        callFinal(stream, state);
      } else {
        state.prefinished = true;
        stream.emit("prefinish");
      }
    }
  }
  function finishMaybe(stream, state, sync) {
    if (needFinish(state)) {
      prefinish(stream, state);
      if (state.pendingcb === 0) {
        if (sync) {
          state.pendingcb++;
          process2.nextTick((stream2, state2) => {
            if (needFinish(state2)) {
              finish(stream2, state2);
            } else {
              state2.pendingcb--;
            }
          }, stream, state);
        } else if (needFinish(state)) {
          state.pendingcb++;
          finish(stream, state);
        }
      }
    }
  }
  function finish(stream, state) {
    state.pendingcb--;
    state.finished = true;
    const onfinishCallbacks = state[kOnFinished].splice(0);
    for (let i2 = 0;i2 < onfinishCallbacks.length; i2++) {
      onfinishCallbacks[i2]();
    }
    stream.emit("finish");
    if (state.autoDestroy) {
      const rState = stream._readableState;
      const autoDestroy = !rState || rState.autoDestroy && (rState.endEmitted || rState.readable === false);
      if (autoDestroy) {
        stream.destroy();
      }
    }
  }
  ObjectDefineProperties(Writable.prototype, {
    closed: {
      __proto__: null,
      get() {
        return this._writableState ? this._writableState.closed : false;
      }
    },
    destroyed: {
      __proto__: null,
      get() {
        return this._writableState ? this._writableState.destroyed : false;
      },
      set(value) {
        if (this._writableState) {
          this._writableState.destroyed = value;
        }
      }
    },
    writable: {
      __proto__: null,
      get() {
        const w = this._writableState;
        return !!w && w.writable !== false && !w.destroyed && !w.errored && !w.ending && !w.ended;
      },
      set(val) {
        if (this._writableState) {
          this._writableState.writable = !!val;
        }
      }
    },
    writableFinished: {
      __proto__: null,
      get() {
        return this._writableState ? this._writableState.finished : false;
      }
    },
    writableObjectMode: {
      __proto__: null,
      get() {
        return this._writableState ? this._writableState.objectMode : false;
      }
    },
    writableBuffer: {
      __proto__: null,
      get() {
        return this._writableState && this._writableState.getBuffer();
      }
    },
    writableEnded: {
      __proto__: null,
      get() {
        return this._writableState ? this._writableState.ending : false;
      }
    },
    writableNeedDrain: {
      __proto__: null,
      get() {
        const wState = this._writableState;
        if (!wState)
          return false;
        return !wState.destroyed && !wState.ending && wState.needDrain;
      }
    },
    writableHighWaterMark: {
      __proto__: null,
      get() {
        return this._writableState && this._writableState.highWaterMark;
      }
    },
    writableCorked: {
      __proto__: null,
      get() {
        return this._writableState ? this._writableState.corked : 0;
      }
    },
    writableLength: {
      __proto__: null,
      get() {
        return this._writableState && this._writableState.length;
      }
    },
    errored: {
      __proto__: null,
      enumerable: false,
      get() {
        return this._writableState ? this._writableState.errored : null;
      }
    },
    writableAborted: {
      __proto__: null,
      enumerable: false,
      get: function() {
        return !!(this._writableState.writable !== false && (this._writableState.destroyed || this._writableState.errored) && !this._writableState.finished);
      }
    }
  });
  var destroy = destroyImpl.destroy;
  Writable.prototype.destroy = function(err2, cb) {
    const state = this._writableState;
    if (!state.destroyed && (state.bufferedIndex < state.buffered.length || state[kOnFinished].length)) {
      process2.nextTick(errorBuffer, state);
    }
    destroy.call(this, err2, cb);
    return this;
  };
  Writable.prototype._undestroy = destroyImpl.undestroy;
  Writable.prototype._destroy = function(err2, cb) {
    cb(err2);
  };
  Writable.prototype[EE.captureRejectionSymbol] = function(err2) {
    this.destroy(err2);
  };
  var webStreamsAdapters;
  function lazyWebStreams() {
    if (webStreamsAdapters === undefined)
      webStreamsAdapters = {};
    return webStreamsAdapters;
  }
  Writable.fromWeb = function(writableStream, options) {
    return lazyWebStreams().newStreamWritableFromWritableStream(writableStream, options);
  };
  Writable.toWeb = function(streamWritable) {
    return lazyWebStreams().newWritableStreamFromStreamWritable(streamWritable);
  };
});

// node_modules/poppygl/node_modules/readable-stream/lib/internal/streams/duplexify.js
var require_duplexify = __commonJS((exports, module) => {
  var process2 = require_process();
  var bufferModule = __require("buffer");
  var {
    isReadable,
    isWritable,
    isIterable,
    isNodeStream,
    isReadableNodeStream,
    isWritableNodeStream,
    isDuplexNodeStream,
    isReadableStream,
    isWritableStream
  } = require_utils();
  var eos = require_end_of_stream();
  var {
    AbortError,
    codes: { ERR_INVALID_ARG_TYPE, ERR_INVALID_RETURN_VALUE }
  } = require_errors();
  var { destroyer } = require_destroy();
  var Duplex = require_duplex();
  var Readable = require_readable();
  var Writable = require_writable();
  var { createDeferredPromise } = require_util();
  var from = require_from();
  var Blob2 = globalThis.Blob || bufferModule.Blob;
  var isBlob = typeof Blob2 !== "undefined" ? function isBlob2(b) {
    return b instanceof Blob2;
  } : function isBlob2(b) {
    return false;
  };
  var AbortController = globalThis.AbortController || require_abort_controller().AbortController;
  var { FunctionPrototypeCall } = require_primordials();

  class Duplexify extends Duplex {
    constructor(options) {
      super(options);
      if ((options === null || options === undefined ? undefined : options.readable) === false) {
        this._readableState.readable = false;
        this._readableState.ended = true;
        this._readableState.endEmitted = true;
      }
      if ((options === null || options === undefined ? undefined : options.writable) === false) {
        this._writableState.writable = false;
        this._writableState.ending = true;
        this._writableState.ended = true;
        this._writableState.finished = true;
      }
    }
  }
  module.exports = function duplexify(body, name) {
    if (isDuplexNodeStream(body)) {
      return body;
    }
    if (isReadableNodeStream(body)) {
      return _duplexify({
        readable: body
      });
    }
    if (isWritableNodeStream(body)) {
      return _duplexify({
        writable: body
      });
    }
    if (isNodeStream(body)) {
      return _duplexify({
        writable: false,
        readable: false
      });
    }
    if (isReadableStream(body)) {
      return _duplexify({
        readable: Readable.fromWeb(body)
      });
    }
    if (isWritableStream(body)) {
      return _duplexify({
        writable: Writable.fromWeb(body)
      });
    }
    if (typeof body === "function") {
      const { value, write, final, destroy } = fromAsyncGen(body);
      if (isIterable(value)) {
        return from(Duplexify, value, {
          objectMode: true,
          write,
          final,
          destroy
        });
      }
      const then2 = value === null || value === undefined ? undefined : value.then;
      if (typeof then2 === "function") {
        let d;
        const promise = FunctionPrototypeCall(then2, value, (val) => {
          if (val != null) {
            throw new ERR_INVALID_RETURN_VALUE("nully", "body", val);
          }
        }, (err2) => {
          destroyer(d, err2);
        });
        return d = new Duplexify({
          objectMode: true,
          readable: false,
          write,
          final(cb) {
            final(async () => {
              try {
                await promise;
                process2.nextTick(cb, null);
              } catch (err2) {
                process2.nextTick(cb, err2);
              }
            });
          },
          destroy
        });
      }
      throw new ERR_INVALID_RETURN_VALUE("Iterable, AsyncIterable or AsyncFunction", name, value);
    }
    if (isBlob(body)) {
      return duplexify(body.arrayBuffer());
    }
    if (isIterable(body)) {
      return from(Duplexify, body, {
        objectMode: true,
        writable: false
      });
    }
    if (isReadableStream(body === null || body === undefined ? undefined : body.readable) && isWritableStream(body === null || body === undefined ? undefined : body.writable)) {
      return Duplexify.fromWeb(body);
    }
    if (typeof (body === null || body === undefined ? undefined : body.writable) === "object" || typeof (body === null || body === undefined ? undefined : body.readable) === "object") {
      const readable = body !== null && body !== undefined && body.readable ? isReadableNodeStream(body === null || body === undefined ? undefined : body.readable) ? body === null || body === undefined ? undefined : body.readable : duplexify(body.readable) : undefined;
      const writable = body !== null && body !== undefined && body.writable ? isWritableNodeStream(body === null || body === undefined ? undefined : body.writable) ? body === null || body === undefined ? undefined : body.writable : duplexify(body.writable) : undefined;
      return _duplexify({
        readable,
        writable
      });
    }
    const then = body === null || body === undefined ? undefined : body.then;
    if (typeof then === "function") {
      let d;
      FunctionPrototypeCall(then, body, (val) => {
        if (val != null) {
          d.push(val);
        }
        d.push(null);
      }, (err2) => {
        destroyer(d, err2);
      });
      return d = new Duplexify({
        objectMode: true,
        writable: false,
        read() {}
      });
    }
    throw new ERR_INVALID_ARG_TYPE(name, [
      "Blob",
      "ReadableStream",
      "WritableStream",
      "Stream",
      "Iterable",
      "AsyncIterable",
      "Function",
      "{ readable, writable } pair",
      "Promise"
    ], body);
  };
  function fromAsyncGen(fn) {
    let { promise, resolve } = createDeferredPromise();
    const ac = new AbortController;
    const signal = ac.signal;
    const value = fn(async function* () {
      while (true) {
        const _promise = promise;
        promise = null;
        const { chunk, done, cb } = await _promise;
        process2.nextTick(cb);
        if (done)
          return;
        if (signal.aborted)
          throw new AbortError(undefined, {
            cause: signal.reason
          });
        ({ promise, resolve } = createDeferredPromise());
        yield chunk;
      }
    }(), {
      signal
    });
    return {
      value,
      write(chunk, encoding, cb) {
        const _resolve = resolve;
        resolve = null;
        _resolve({
          chunk,
          done: false,
          cb
        });
      },
      final(cb) {
        const _resolve = resolve;
        resolve = null;
        _resolve({
          done: true,
          cb
        });
      },
      destroy(err2, cb) {
        ac.abort();
        cb(err2);
      }
    };
  }
  function _duplexify(pair) {
    const r = pair.readable && typeof pair.readable.read !== "function" ? Readable.wrap(pair.readable) : pair.readable;
    const w = pair.writable;
    let readable = !!isReadable(r);
    let writable = !!isWritable(w);
    let ondrain;
    let onfinish;
    let onreadable;
    let onclose;
    let d;
    function onfinished(err2) {
      const cb = onclose;
      onclose = null;
      if (cb) {
        cb(err2);
      } else if (err2) {
        d.destroy(err2);
      }
    }
    d = new Duplexify({
      readableObjectMode: !!(r !== null && r !== undefined && r.readableObjectMode),
      writableObjectMode: !!(w !== null && w !== undefined && w.writableObjectMode),
      readable,
      writable
    });
    if (writable) {
      eos(w, (err2) => {
        writable = false;
        if (err2) {
          destroyer(r, err2);
        }
        onfinished(err2);
      });
      d._write = function(chunk, encoding, callback) {
        if (w.write(chunk, encoding)) {
          callback();
        } else {
          ondrain = callback;
        }
      };
      d._final = function(callback) {
        w.end();
        onfinish = callback;
      };
      w.on("drain", function() {
        if (ondrain) {
          const cb = ondrain;
          ondrain = null;
          cb();
        }
      });
      w.on("finish", function() {
        if (onfinish) {
          const cb = onfinish;
          onfinish = null;
          cb();
        }
      });
    }
    if (readable) {
      eos(r, (err2) => {
        readable = false;
        if (err2) {
          destroyer(r, err2);
        }
        onfinished(err2);
      });
      r.on("readable", function() {
        if (onreadable) {
          const cb = onreadable;
          onreadable = null;
          cb();
        }
      });
      r.on("end", function() {
        d.push(null);
      });
      d._read = function() {
        while (true) {
          const buf = r.read();
          if (buf === null) {
            onreadable = d._read;
            return;
          }
          if (!d.push(buf)) {
            return;
          }
        }
      };
    }
    d._destroy = function(err2, callback) {
      if (!err2 && onclose !== null) {
        err2 = new AbortError;
      }
      onreadable = null;
      ondrain = null;
      onfinish = null;
      if (onclose === null) {
        callback(err2);
      } else {
        onclose = callback;
        destroyer(w, err2);
        destroyer(r, err2);
      }
    };
    return d;
  }
});

// node_modules/poppygl/node_modules/readable-stream/lib/internal/streams/duplex.js
var require_duplex = __commonJS((exports, module) => {
  var {
    ObjectDefineProperties,
    ObjectGetOwnPropertyDescriptor,
    ObjectKeys,
    ObjectSetPrototypeOf
  } = require_primordials();
  module.exports = Duplex;
  var Readable = require_readable();
  var Writable = require_writable();
  ObjectSetPrototypeOf(Duplex.prototype, Readable.prototype);
  ObjectSetPrototypeOf(Duplex, Readable);
  {
    const keys = ObjectKeys(Writable.prototype);
    for (let i2 = 0;i2 < keys.length; i2++) {
      const method = keys[i2];
      if (!Duplex.prototype[method])
        Duplex.prototype[method] = Writable.prototype[method];
    }
  }
  function Duplex(options) {
    if (!(this instanceof Duplex))
      return new Duplex(options);
    Readable.call(this, options);
    Writable.call(this, options);
    if (options) {
      this.allowHalfOpen = options.allowHalfOpen !== false;
      if (options.readable === false) {
        this._readableState.readable = false;
        this._readableState.ended = true;
        this._readableState.endEmitted = true;
      }
      if (options.writable === false) {
        this._writableState.writable = false;
        this._writableState.ending = true;
        this._writableState.ended = true;
        this._writableState.finished = true;
      }
    } else {
      this.allowHalfOpen = true;
    }
  }
  ObjectDefineProperties(Duplex.prototype, {
    writable: {
      __proto__: null,
      ...ObjectGetOwnPropertyDescriptor(Writable.prototype, "writable")
    },
    writableHighWaterMark: {
      __proto__: null,
      ...ObjectGetOwnPropertyDescriptor(Writable.prototype, "writableHighWaterMark")
    },
    writableObjectMode: {
      __proto__: null,
      ...ObjectGetOwnPropertyDescriptor(Writable.prototype, "writableObjectMode")
    },
    writableBuffer: {
      __proto__: null,
      ...ObjectGetOwnPropertyDescriptor(Writable.prototype, "writableBuffer")
    },
    writableLength: {
      __proto__: null,
      ...ObjectGetOwnPropertyDescriptor(Writable.prototype, "writableLength")
    },
    writableFinished: {
      __proto__: null,
      ...ObjectGetOwnPropertyDescriptor(Writable.prototype, "writableFinished")
    },
    writableCorked: {
      __proto__: null,
      ...ObjectGetOwnPropertyDescriptor(Writable.prototype, "writableCorked")
    },
    writableEnded: {
      __proto__: null,
      ...ObjectGetOwnPropertyDescriptor(Writable.prototype, "writableEnded")
    },
    writableNeedDrain: {
      __proto__: null,
      ...ObjectGetOwnPropertyDescriptor(Writable.prototype, "writableNeedDrain")
    },
    destroyed: {
      __proto__: null,
      get() {
        if (this._readableState === undefined || this._writableState === undefined) {
          return false;
        }
        return this._readableState.destroyed && this._writableState.destroyed;
      },
      set(value) {
        if (this._readableState && this._writableState) {
          this._readableState.destroyed = value;
          this._writableState.destroyed = value;
        }
      }
    }
  });
  var webStreamsAdapters;
  function lazyWebStreams() {
    if (webStreamsAdapters === undefined)
      webStreamsAdapters = {};
    return webStreamsAdapters;
  }
  Duplex.fromWeb = function(pair, options) {
    return lazyWebStreams().newStreamDuplexFromReadableWritablePair(pair, options);
  };
  Duplex.toWeb = function(duplex) {
    return lazyWebStreams().newReadableWritablePairFromDuplex(duplex);
  };
  var duplexify;
  Duplex.from = function(body) {
    if (!duplexify) {
      duplexify = require_duplexify();
    }
    return duplexify(body, "body");
  };
});

// node_modules/poppygl/node_modules/readable-stream/lib/internal/streams/transform.js
var require_transform = __commonJS((exports, module) => {
  var { ObjectSetPrototypeOf, Symbol: Symbol2 } = require_primordials();
  module.exports = Transform;
  var { ERR_METHOD_NOT_IMPLEMENTED } = require_errors().codes;
  var Duplex = require_duplex();
  var { getHighWaterMark } = require_state();
  ObjectSetPrototypeOf(Transform.prototype, Duplex.prototype);
  ObjectSetPrototypeOf(Transform, Duplex);
  var kCallback = Symbol2("kCallback");
  function Transform(options) {
    if (!(this instanceof Transform))
      return new Transform(options);
    const readableHighWaterMark = options ? getHighWaterMark(this, options, "readableHighWaterMark", true) : null;
    if (readableHighWaterMark === 0) {
      options = {
        ...options,
        highWaterMark: null,
        readableHighWaterMark,
        writableHighWaterMark: options.writableHighWaterMark || 0
      };
    }
    Duplex.call(this, options);
    this._readableState.sync = false;
    this[kCallback] = null;
    if (options) {
      if (typeof options.transform === "function")
        this._transform = options.transform;
      if (typeof options.flush === "function")
        this._flush = options.flush;
    }
    this.on("prefinish", prefinish);
  }
  function final(cb) {
    if (typeof this._flush === "function" && !this.destroyed) {
      this._flush((er, data) => {
        if (er) {
          if (cb) {
            cb(er);
          } else {
            this.destroy(er);
          }
          return;
        }
        if (data != null) {
          this.push(data);
        }
        this.push(null);
        if (cb) {
          cb();
        }
      });
    } else {
      this.push(null);
      if (cb) {
        cb();
      }
    }
  }
  function prefinish() {
    if (this._final !== final) {
      final.call(this);
    }
  }
  Transform.prototype._final = final;
  Transform.prototype._transform = function(chunk, encoding, callback) {
    throw new ERR_METHOD_NOT_IMPLEMENTED("_transform()");
  };
  Transform.prototype._write = function(chunk, encoding, callback) {
    const rState = this._readableState;
    const wState = this._writableState;
    const length = rState.length;
    this._transform(chunk, encoding, (err2, val) => {
      if (err2) {
        callback(err2);
        return;
      }
      if (val != null) {
        this.push(val);
      }
      if (wState.ended || length === rState.length || rState.length < rState.highWaterMark) {
        callback();
      } else {
        this[kCallback] = callback;
      }
    });
  };
  Transform.prototype._read = function() {
    if (this[kCallback]) {
      const callback = this[kCallback];
      this[kCallback] = null;
      callback();
    }
  };
});

// node_modules/poppygl/node_modules/readable-stream/lib/internal/streams/passthrough.js
var require_passthrough = __commonJS((exports, module) => {
  var { ObjectSetPrototypeOf } = require_primordials();
  module.exports = PassThrough;
  var Transform = require_transform();
  ObjectSetPrototypeOf(PassThrough.prototype, Transform.prototype);
  ObjectSetPrototypeOf(PassThrough, Transform);
  function PassThrough(options) {
    if (!(this instanceof PassThrough))
      return new PassThrough(options);
    Transform.call(this, options);
  }
  PassThrough.prototype._transform = function(chunk, encoding, cb) {
    cb(null, chunk);
  };
});

// node_modules/poppygl/node_modules/readable-stream/lib/internal/streams/pipeline.js
var require_pipeline = __commonJS((exports, module) => {
  var process2 = require_process();
  var { ArrayIsArray, Promise: Promise2, SymbolAsyncIterator, SymbolDispose } = require_primordials();
  var eos = require_end_of_stream();
  var { once } = require_util();
  var destroyImpl = require_destroy();
  var Duplex = require_duplex();
  var {
    aggregateTwoErrors,
    codes: {
      ERR_INVALID_ARG_TYPE,
      ERR_INVALID_RETURN_VALUE,
      ERR_MISSING_ARGS,
      ERR_STREAM_DESTROYED,
      ERR_STREAM_PREMATURE_CLOSE
    },
    AbortError
  } = require_errors();
  var { validateFunction, validateAbortSignal } = require_validators();
  var {
    isIterable,
    isReadable,
    isReadableNodeStream,
    isNodeStream,
    isTransformStream,
    isWebStream,
    isReadableStream,
    isReadableFinished
  } = require_utils();
  var AbortController = globalThis.AbortController || require_abort_controller().AbortController;
  var PassThrough;
  var Readable;
  var addAbortListener;
  function destroyer(stream, reading, writing) {
    let finished = false;
    stream.on("close", () => {
      finished = true;
    });
    const cleanup = eos(stream, {
      readable: reading,
      writable: writing
    }, (err2) => {
      finished = !err2;
    });
    return {
      destroy: (err2) => {
        if (finished)
          return;
        finished = true;
        destroyImpl.destroyer(stream, err2 || new ERR_STREAM_DESTROYED("pipe"));
      },
      cleanup
    };
  }
  function popCallback(streams) {
    validateFunction(streams[streams.length - 1], "streams[stream.length - 1]");
    return streams.pop();
  }
  function makeAsyncIterable(val) {
    if (isIterable(val)) {
      return val;
    } else if (isReadableNodeStream(val)) {
      return fromReadable(val);
    }
    throw new ERR_INVALID_ARG_TYPE("val", ["Readable", "Iterable", "AsyncIterable"], val);
  }
  async function* fromReadable(val) {
    if (!Readable) {
      Readable = require_readable();
    }
    yield* Readable.prototype[SymbolAsyncIterator].call(val);
  }
  async function pumpToNode(iterable, writable, finish, { end }) {
    let error;
    let onresolve = null;
    const resume = (err2) => {
      if (err2) {
        error = err2;
      }
      if (onresolve) {
        const callback = onresolve;
        onresolve = null;
        callback();
      }
    };
    const wait = () => new Promise2((resolve, reject) => {
      if (error) {
        reject(error);
      } else {
        onresolve = () => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        };
      }
    });
    writable.on("drain", resume);
    const cleanup = eos(writable, {
      readable: false
    }, resume);
    try {
      if (writable.writableNeedDrain) {
        await wait();
      }
      for await (const chunk of iterable) {
        if (!writable.write(chunk)) {
          await wait();
        }
      }
      if (end) {
        writable.end();
        await wait();
      }
      finish();
    } catch (err2) {
      finish(error !== err2 ? aggregateTwoErrors(error, err2) : err2);
    } finally {
      cleanup();
      writable.off("drain", resume);
    }
  }
  async function pumpToWeb(readable, writable, finish, { end }) {
    if (isTransformStream(writable)) {
      writable = writable.writable;
    }
    const writer = writable.getWriter();
    try {
      for await (const chunk of readable) {
        await writer.ready;
        writer.write(chunk).catch(() => {});
      }
      await writer.ready;
      if (end) {
        await writer.close();
      }
      finish();
    } catch (err2) {
      try {
        await writer.abort(err2);
        finish(err2);
      } catch (err3) {
        finish(err3);
      }
    }
  }
  function pipeline(...streams) {
    return pipelineImpl(streams, once(popCallback(streams)));
  }
  function pipelineImpl(streams, callback, opts) {
    if (streams.length === 1 && ArrayIsArray(streams[0])) {
      streams = streams[0];
    }
    if (streams.length < 2) {
      throw new ERR_MISSING_ARGS("streams");
    }
    const ac = new AbortController;
    const signal = ac.signal;
    const outerSignal = opts === null || opts === undefined ? undefined : opts.signal;
    const lastStreamCleanup = [];
    validateAbortSignal(outerSignal, "options.signal");
    function abort() {
      finishImpl(new AbortError);
    }
    addAbortListener = addAbortListener || require_util().addAbortListener;
    let disposable;
    if (outerSignal) {
      disposable = addAbortListener(outerSignal, abort);
    }
    let error;
    let value;
    const destroys = [];
    let finishCount = 0;
    function finish(err2) {
      finishImpl(err2, --finishCount === 0);
    }
    function finishImpl(err2, final) {
      var _disposable;
      if (err2 && (!error || error.code === "ERR_STREAM_PREMATURE_CLOSE")) {
        error = err2;
      }
      if (!error && !final) {
        return;
      }
      while (destroys.length) {
        destroys.shift()(error);
      }
      (_disposable = disposable) === null || _disposable === undefined || _disposable[SymbolDispose]();
      ac.abort();
      if (final) {
        if (!error) {
          lastStreamCleanup.forEach((fn) => fn());
        }
        process2.nextTick(callback, error, value);
      }
    }
    let ret;
    for (let i2 = 0;i2 < streams.length; i2++) {
      const stream = streams[i2];
      const reading = i2 < streams.length - 1;
      const writing = i2 > 0;
      const end = reading || (opts === null || opts === undefined ? undefined : opts.end) !== false;
      const isLastStream = i2 === streams.length - 1;
      if (isNodeStream(stream)) {
        let onError2 = function(err2) {
          if (err2 && err2.name !== "AbortError" && err2.code !== "ERR_STREAM_PREMATURE_CLOSE") {
            finish(err2);
          }
        };
        var onError = onError2;
        if (end) {
          const { destroy, cleanup } = destroyer(stream, reading, writing);
          destroys.push(destroy);
          if (isReadable(stream) && isLastStream) {
            lastStreamCleanup.push(cleanup);
          }
        }
        stream.on("error", onError2);
        if (isReadable(stream) && isLastStream) {
          lastStreamCleanup.push(() => {
            stream.removeListener("error", onError2);
          });
        }
      }
      if (i2 === 0) {
        if (typeof stream === "function") {
          ret = stream({
            signal
          });
          if (!isIterable(ret)) {
            throw new ERR_INVALID_RETURN_VALUE("Iterable, AsyncIterable or Stream", "source", ret);
          }
        } else if (isIterable(stream) || isReadableNodeStream(stream) || isTransformStream(stream)) {
          ret = stream;
        } else {
          ret = Duplex.from(stream);
        }
      } else if (typeof stream === "function") {
        if (isTransformStream(ret)) {
          var _ret;
          ret = makeAsyncIterable((_ret = ret) === null || _ret === undefined ? undefined : _ret.readable);
        } else {
          ret = makeAsyncIterable(ret);
        }
        ret = stream(ret, {
          signal
        });
        if (reading) {
          if (!isIterable(ret, true)) {
            throw new ERR_INVALID_RETURN_VALUE("AsyncIterable", `transform[${i2 - 1}]`, ret);
          }
        } else {
          var _ret2;
          if (!PassThrough) {
            PassThrough = require_passthrough();
          }
          const pt = new PassThrough({
            objectMode: true
          });
          const then = (_ret2 = ret) === null || _ret2 === undefined ? undefined : _ret2.then;
          if (typeof then === "function") {
            finishCount++;
            then.call(ret, (val) => {
              value = val;
              if (val != null) {
                pt.write(val);
              }
              if (end) {
                pt.end();
              }
              process2.nextTick(finish);
            }, (err2) => {
              pt.destroy(err2);
              process2.nextTick(finish, err2);
            });
          } else if (isIterable(ret, true)) {
            finishCount++;
            pumpToNode(ret, pt, finish, {
              end
            });
          } else if (isReadableStream(ret) || isTransformStream(ret)) {
            const toRead = ret.readable || ret;
            finishCount++;
            pumpToNode(toRead, pt, finish, {
              end
            });
          } else {
            throw new ERR_INVALID_RETURN_VALUE("AsyncIterable or Promise", "destination", ret);
          }
          ret = pt;
          const { destroy, cleanup } = destroyer(ret, false, true);
          destroys.push(destroy);
          if (isLastStream) {
            lastStreamCleanup.push(cleanup);
          }
        }
      } else if (isNodeStream(stream)) {
        if (isReadableNodeStream(ret)) {
          finishCount += 2;
          const cleanup = pipe(ret, stream, finish, {
            end
          });
          if (isReadable(stream) && isLastStream) {
            lastStreamCleanup.push(cleanup);
          }
        } else if (isTransformStream(ret) || isReadableStream(ret)) {
          const toRead = ret.readable || ret;
          finishCount++;
          pumpToNode(toRead, stream, finish, {
            end
          });
        } else if (isIterable(ret)) {
          finishCount++;
          pumpToNode(ret, stream, finish, {
            end
          });
        } else {
          throw new ERR_INVALID_ARG_TYPE("val", ["Readable", "Iterable", "AsyncIterable", "ReadableStream", "TransformStream"], ret);
        }
        ret = stream;
      } else if (isWebStream(stream)) {
        if (isReadableNodeStream(ret)) {
          finishCount++;
          pumpToWeb(makeAsyncIterable(ret), stream, finish, {
            end
          });
        } else if (isReadableStream(ret) || isIterable(ret)) {
          finishCount++;
          pumpToWeb(ret, stream, finish, {
            end
          });
        } else if (isTransformStream(ret)) {
          finishCount++;
          pumpToWeb(ret.readable, stream, finish, {
            end
          });
        } else {
          throw new ERR_INVALID_ARG_TYPE("val", ["Readable", "Iterable", "AsyncIterable", "ReadableStream", "TransformStream"], ret);
        }
        ret = stream;
      } else {
        ret = Duplex.from(stream);
      }
    }
    if (signal !== null && signal !== undefined && signal.aborted || outerSignal !== null && outerSignal !== undefined && outerSignal.aborted) {
      process2.nextTick(abort);
    }
    return ret;
  }
  function pipe(src, dst, finish, { end }) {
    let ended = false;
    dst.on("close", () => {
      if (!ended) {
        finish(new ERR_STREAM_PREMATURE_CLOSE);
      }
    });
    src.pipe(dst, {
      end: false
    });
    if (end) {
      let endFn2 = function() {
        ended = true;
        dst.end();
      };
      var endFn = endFn2;
      if (isReadableFinished(src)) {
        process2.nextTick(endFn2);
      } else {
        src.once("end", endFn2);
      }
    } else {
      finish();
    }
    eos(src, {
      readable: true,
      writable: false
    }, (err2) => {
      const rState = src._readableState;
      if (err2 && err2.code === "ERR_STREAM_PREMATURE_CLOSE" && rState && rState.ended && !rState.errored && !rState.errorEmitted) {
        src.once("end", finish).once("error", finish);
      } else {
        finish(err2);
      }
    });
    return eos(dst, {
      readable: false,
      writable: true
    }, finish);
  }
  module.exports = {
    pipelineImpl,
    pipeline
  };
});

// node_modules/poppygl/node_modules/readable-stream/lib/internal/streams/compose.js
var require_compose = __commonJS((exports, module) => {
  var { pipeline } = require_pipeline();
  var Duplex = require_duplex();
  var { destroyer } = require_destroy();
  var {
    isNodeStream,
    isReadable,
    isWritable,
    isWebStream,
    isTransformStream,
    isWritableStream,
    isReadableStream
  } = require_utils();
  var {
    AbortError,
    codes: { ERR_INVALID_ARG_VALUE, ERR_MISSING_ARGS }
  } = require_errors();
  var eos = require_end_of_stream();
  module.exports = function compose(...streams) {
    if (streams.length === 0) {
      throw new ERR_MISSING_ARGS("streams");
    }
    if (streams.length === 1) {
      return Duplex.from(streams[0]);
    }
    const orgStreams = [...streams];
    if (typeof streams[0] === "function") {
      streams[0] = Duplex.from(streams[0]);
    }
    if (typeof streams[streams.length - 1] === "function") {
      const idx = streams.length - 1;
      streams[idx] = Duplex.from(streams[idx]);
    }
    for (let n = 0;n < streams.length; ++n) {
      if (!isNodeStream(streams[n]) && !isWebStream(streams[n])) {
        continue;
      }
      if (n < streams.length - 1 && !(isReadable(streams[n]) || isReadableStream(streams[n]) || isTransformStream(streams[n]))) {
        throw new ERR_INVALID_ARG_VALUE(`streams[${n}]`, orgStreams[n], "must be readable");
      }
      if (n > 0 && !(isWritable(streams[n]) || isWritableStream(streams[n]) || isTransformStream(streams[n]))) {
        throw new ERR_INVALID_ARG_VALUE(`streams[${n}]`, orgStreams[n], "must be writable");
      }
    }
    let ondrain;
    let onfinish;
    let onreadable;
    let onclose;
    let d;
    function onfinished(err2) {
      const cb = onclose;
      onclose = null;
      if (cb) {
        cb(err2);
      } else if (err2) {
        d.destroy(err2);
      } else if (!readable && !writable) {
        d.destroy();
      }
    }
    const head = streams[0];
    const tail = pipeline(streams, onfinished);
    const writable = !!(isWritable(head) || isWritableStream(head) || isTransformStream(head));
    const readable = !!(isReadable(tail) || isReadableStream(tail) || isTransformStream(tail));
    d = new Duplex({
      writableObjectMode: !!(head !== null && head !== undefined && head.writableObjectMode),
      readableObjectMode: !!(tail !== null && tail !== undefined && tail.readableObjectMode),
      writable,
      readable
    });
    if (writable) {
      if (isNodeStream(head)) {
        d._write = function(chunk, encoding, callback) {
          if (head.write(chunk, encoding)) {
            callback();
          } else {
            ondrain = callback;
          }
        };
        d._final = function(callback) {
          head.end();
          onfinish = callback;
        };
        head.on("drain", function() {
          if (ondrain) {
            const cb = ondrain;
            ondrain = null;
            cb();
          }
        });
      } else if (isWebStream(head)) {
        const writable2 = isTransformStream(head) ? head.writable : head;
        const writer = writable2.getWriter();
        d._write = async function(chunk, encoding, callback) {
          try {
            await writer.ready;
            writer.write(chunk).catch(() => {});
            callback();
          } catch (err2) {
            callback(err2);
          }
        };
        d._final = async function(callback) {
          try {
            await writer.ready;
            writer.close().catch(() => {});
            onfinish = callback;
          } catch (err2) {
            callback(err2);
          }
        };
      }
      const toRead = isTransformStream(tail) ? tail.readable : tail;
      eos(toRead, () => {
        if (onfinish) {
          const cb = onfinish;
          onfinish = null;
          cb();
        }
      });
    }
    if (readable) {
      if (isNodeStream(tail)) {
        tail.on("readable", function() {
          if (onreadable) {
            const cb = onreadable;
            onreadable = null;
            cb();
          }
        });
        tail.on("end", function() {
          d.push(null);
        });
        d._read = function() {
          while (true) {
            const buf = tail.read();
            if (buf === null) {
              onreadable = d._read;
              return;
            }
            if (!d.push(buf)) {
              return;
            }
          }
        };
      } else if (isWebStream(tail)) {
        const readable2 = isTransformStream(tail) ? tail.readable : tail;
        const reader = readable2.getReader();
        d._read = async function() {
          while (true) {
            try {
              const { value, done } = await reader.read();
              if (!d.push(value)) {
                return;
              }
              if (done) {
                d.push(null);
                return;
              }
            } catch {
              return;
            }
          }
        };
      }
    }
    d._destroy = function(err2, callback) {
      if (!err2 && onclose !== null) {
        err2 = new AbortError;
      }
      onreadable = null;
      ondrain = null;
      onfinish = null;
      if (onclose === null) {
        callback(err2);
      } else {
        onclose = callback;
        if (isNodeStream(tail)) {
          destroyer(tail, err2);
        }
      }
    };
    return d;
  };
});

// node_modules/poppygl/node_modules/readable-stream/lib/internal/streams/operators.js
var require_operators = __commonJS((exports, module) => {
  var AbortController = globalThis.AbortController || require_abort_controller().AbortController;
  var {
    codes: { ERR_INVALID_ARG_VALUE, ERR_INVALID_ARG_TYPE, ERR_MISSING_ARGS, ERR_OUT_OF_RANGE },
    AbortError
  } = require_errors();
  var { validateAbortSignal, validateInteger, validateObject } = require_validators();
  var kWeakHandler = require_primordials().Symbol("kWeak");
  var kResistStopPropagation = require_primordials().Symbol("kResistStopPropagation");
  var { finished } = require_end_of_stream();
  var staticCompose = require_compose();
  var { addAbortSignalNoValidate } = require_add_abort_signal();
  var { isWritable, isNodeStream } = require_utils();
  var { deprecate } = require_util();
  var {
    ArrayPrototypePush,
    Boolean: Boolean2,
    MathFloor,
    Number: Number2,
    NumberIsNaN,
    Promise: Promise2,
    PromiseReject,
    PromiseResolve,
    PromisePrototypeThen,
    Symbol: Symbol2
  } = require_primordials();
  var kEmpty = Symbol2("kEmpty");
  var kEof = Symbol2("kEof");
  function compose(stream, options) {
    if (options != null) {
      validateObject(options, "options");
    }
    if ((options === null || options === undefined ? undefined : options.signal) != null) {
      validateAbortSignal(options.signal, "options.signal");
    }
    if (isNodeStream(stream) && !isWritable(stream)) {
      throw new ERR_INVALID_ARG_VALUE("stream", stream, "must be writable");
    }
    const composedStream = staticCompose(this, stream);
    if (options !== null && options !== undefined && options.signal) {
      addAbortSignalNoValidate(options.signal, composedStream);
    }
    return composedStream;
  }
  function map(fn, options) {
    if (typeof fn !== "function") {
      throw new ERR_INVALID_ARG_TYPE("fn", ["Function", "AsyncFunction"], fn);
    }
    if (options != null) {
      validateObject(options, "options");
    }
    if ((options === null || options === undefined ? undefined : options.signal) != null) {
      validateAbortSignal(options.signal, "options.signal");
    }
    let concurrency = 1;
    if ((options === null || options === undefined ? undefined : options.concurrency) != null) {
      concurrency = MathFloor(options.concurrency);
    }
    let highWaterMark = concurrency - 1;
    if ((options === null || options === undefined ? undefined : options.highWaterMark) != null) {
      highWaterMark = MathFloor(options.highWaterMark);
    }
    validateInteger(concurrency, "options.concurrency", 1);
    validateInteger(highWaterMark, "options.highWaterMark", 0);
    highWaterMark += concurrency;
    return async function* map2() {
      const signal = require_util().AbortSignalAny([options === null || options === undefined ? undefined : options.signal].filter(Boolean2));
      const stream = this;
      const queue = [];
      const signalOpt = {
        signal
      };
      let next;
      let resume;
      let done = false;
      let cnt = 0;
      function onCatch() {
        done = true;
        afterItemProcessed();
      }
      function afterItemProcessed() {
        cnt -= 1;
        maybeResume();
      }
      function maybeResume() {
        if (resume && !done && cnt < concurrency && queue.length < highWaterMark) {
          resume();
          resume = null;
        }
      }
      async function pump() {
        try {
          for await (let val of stream) {
            if (done) {
              return;
            }
            if (signal.aborted) {
              throw new AbortError;
            }
            try {
              val = fn(val, signalOpt);
              if (val === kEmpty) {
                continue;
              }
              val = PromiseResolve(val);
            } catch (err2) {
              val = PromiseReject(err2);
            }
            cnt += 1;
            PromisePrototypeThen(val, afterItemProcessed, onCatch);
            queue.push(val);
            if (next) {
              next();
              next = null;
            }
            if (!done && (queue.length >= highWaterMark || cnt >= concurrency)) {
              await new Promise2((resolve) => {
                resume = resolve;
              });
            }
          }
          queue.push(kEof);
        } catch (err2) {
          const val = PromiseReject(err2);
          PromisePrototypeThen(val, afterItemProcessed, onCatch);
          queue.push(val);
        } finally {
          done = true;
          if (next) {
            next();
            next = null;
          }
        }
      }
      pump();
      try {
        while (true) {
          while (queue.length > 0) {
            const val = await queue[0];
            if (val === kEof) {
              return;
            }
            if (signal.aborted) {
              throw new AbortError;
            }
            if (val !== kEmpty) {
              yield val;
            }
            queue.shift();
            maybeResume();
          }
          await new Promise2((resolve) => {
            next = resolve;
          });
        }
      } finally {
        done = true;
        if (resume) {
          resume();
          resume = null;
        }
      }
    }.call(this);
  }
  function asIndexedPairs(options = undefined) {
    if (options != null) {
      validateObject(options, "options");
    }
    if ((options === null || options === undefined ? undefined : options.signal) != null) {
      validateAbortSignal(options.signal, "options.signal");
    }
    return async function* asIndexedPairs2() {
      let index = 0;
      for await (const val of this) {
        var _options$signal;
        if (options !== null && options !== undefined && (_options$signal = options.signal) !== null && _options$signal !== undefined && _options$signal.aborted) {
          throw new AbortError({
            cause: options.signal.reason
          });
        }
        yield [index++, val];
      }
    }.call(this);
  }
  async function some(fn, options = undefined) {
    for await (const unused of filter.call(this, fn, options)) {
      return true;
    }
    return false;
  }
  async function every(fn, options = undefined) {
    if (typeof fn !== "function") {
      throw new ERR_INVALID_ARG_TYPE("fn", ["Function", "AsyncFunction"], fn);
    }
    return !await some.call(this, async (...args) => {
      return !await fn(...args);
    }, options);
  }
  async function find(fn, options) {
    for await (const result of filter.call(this, fn, options)) {
      return result;
    }
    return;
  }
  async function forEach(fn, options) {
    if (typeof fn !== "function") {
      throw new ERR_INVALID_ARG_TYPE("fn", ["Function", "AsyncFunction"], fn);
    }
    async function forEachFn(value, options2) {
      await fn(value, options2);
      return kEmpty;
    }
    for await (const unused of map.call(this, forEachFn, options))
      ;
  }
  function filter(fn, options) {
    if (typeof fn !== "function") {
      throw new ERR_INVALID_ARG_TYPE("fn", ["Function", "AsyncFunction"], fn);
    }
    async function filterFn(value, options2) {
      if (await fn(value, options2)) {
        return value;
      }
      return kEmpty;
    }
    return map.call(this, filterFn, options);
  }

  class ReduceAwareErrMissingArgs extends ERR_MISSING_ARGS {
    constructor() {
      super("reduce");
      this.message = "Reduce of an empty stream requires an initial value";
    }
  }
  async function reduce(reducer, initialValue, options) {
    var _options$signal2;
    if (typeof reducer !== "function") {
      throw new ERR_INVALID_ARG_TYPE("reducer", ["Function", "AsyncFunction"], reducer);
    }
    if (options != null) {
      validateObject(options, "options");
    }
    if ((options === null || options === undefined ? undefined : options.signal) != null) {
      validateAbortSignal(options.signal, "options.signal");
    }
    let hasInitialValue = arguments.length > 1;
    if (options !== null && options !== undefined && (_options$signal2 = options.signal) !== null && _options$signal2 !== undefined && _options$signal2.aborted) {
      const err2 = new AbortError(undefined, {
        cause: options.signal.reason
      });
      this.once("error", () => {});
      await finished(this.destroy(err2));
      throw err2;
    }
    const ac = new AbortController;
    const signal = ac.signal;
    if (options !== null && options !== undefined && options.signal) {
      const opts = {
        once: true,
        [kWeakHandler]: this,
        [kResistStopPropagation]: true
      };
      options.signal.addEventListener("abort", () => ac.abort(), opts);
    }
    let gotAnyItemFromStream = false;
    try {
      for await (const value of this) {
        var _options$signal3;
        gotAnyItemFromStream = true;
        if (options !== null && options !== undefined && (_options$signal3 = options.signal) !== null && _options$signal3 !== undefined && _options$signal3.aborted) {
          throw new AbortError;
        }
        if (!hasInitialValue) {
          initialValue = value;
          hasInitialValue = true;
        } else {
          initialValue = await reducer(initialValue, value, {
            signal
          });
        }
      }
      if (!gotAnyItemFromStream && !hasInitialValue) {
        throw new ReduceAwareErrMissingArgs;
      }
    } finally {
      ac.abort();
    }
    return initialValue;
  }
  async function toArray(options) {
    if (options != null) {
      validateObject(options, "options");
    }
    if ((options === null || options === undefined ? undefined : options.signal) != null) {
      validateAbortSignal(options.signal, "options.signal");
    }
    const result = [];
    for await (const val of this) {
      var _options$signal4;
      if (options !== null && options !== undefined && (_options$signal4 = options.signal) !== null && _options$signal4 !== undefined && _options$signal4.aborted) {
        throw new AbortError(undefined, {
          cause: options.signal.reason
        });
      }
      ArrayPrototypePush(result, val);
    }
    return result;
  }
  function flatMap(fn, options) {
    const values = map.call(this, fn, options);
    return async function* flatMap2() {
      for await (const val of values) {
        yield* val;
      }
    }.call(this);
  }
  function toIntegerOrInfinity(number) {
    number = Number2(number);
    if (NumberIsNaN(number)) {
      return 0;
    }
    if (number < 0) {
      throw new ERR_OUT_OF_RANGE("number", ">= 0", number);
    }
    return number;
  }
  function drop(number, options = undefined) {
    if (options != null) {
      validateObject(options, "options");
    }
    if ((options === null || options === undefined ? undefined : options.signal) != null) {
      validateAbortSignal(options.signal, "options.signal");
    }
    number = toIntegerOrInfinity(number);
    return async function* drop2() {
      var _options$signal5;
      if (options !== null && options !== undefined && (_options$signal5 = options.signal) !== null && _options$signal5 !== undefined && _options$signal5.aborted) {
        throw new AbortError;
      }
      for await (const val of this) {
        var _options$signal6;
        if (options !== null && options !== undefined && (_options$signal6 = options.signal) !== null && _options$signal6 !== undefined && _options$signal6.aborted) {
          throw new AbortError;
        }
        if (number-- <= 0) {
          yield val;
        }
      }
    }.call(this);
  }
  function take(number, options = undefined) {
    if (options != null) {
      validateObject(options, "options");
    }
    if ((options === null || options === undefined ? undefined : options.signal) != null) {
      validateAbortSignal(options.signal, "options.signal");
    }
    number = toIntegerOrInfinity(number);
    return async function* take2() {
      var _options$signal7;
      if (options !== null && options !== undefined && (_options$signal7 = options.signal) !== null && _options$signal7 !== undefined && _options$signal7.aborted) {
        throw new AbortError;
      }
      for await (const val of this) {
        var _options$signal8;
        if (options !== null && options !== undefined && (_options$signal8 = options.signal) !== null && _options$signal8 !== undefined && _options$signal8.aborted) {
          throw new AbortError;
        }
        if (number-- > 0) {
          yield val;
        }
        if (number <= 0) {
          return;
        }
      }
    }.call(this);
  }
  exports.streamReturningOperators = {
    asIndexedPairs: deprecate(asIndexedPairs, "readable.asIndexedPairs will be removed in a future version."),
    drop,
    filter,
    flatMap,
    map,
    take,
    compose
  };
  exports.promiseReturningOperators = {
    every,
    forEach,
    reduce,
    toArray,
    some,
    find
  };
});

// node_modules/poppygl/node_modules/readable-stream/lib/stream/promises.js
var require_promises = __commonJS((exports, module) => {
  var { ArrayPrototypePop, Promise: Promise2 } = require_primordials();
  var { isIterable, isNodeStream, isWebStream } = require_utils();
  var { pipelineImpl: pl } = require_pipeline();
  var { finished } = require_end_of_stream();
  require_stream();
  function pipeline(...streams) {
    return new Promise2((resolve, reject) => {
      let signal;
      let end;
      const lastArg = streams[streams.length - 1];
      if (lastArg && typeof lastArg === "object" && !isNodeStream(lastArg) && !isIterable(lastArg) && !isWebStream(lastArg)) {
        const options = ArrayPrototypePop(streams);
        signal = options.signal;
        end = options.end;
      }
      pl(streams, (err2, value) => {
        if (err2) {
          reject(err2);
        } else {
          resolve(value);
        }
      }, {
        signal,
        end
      });
    });
  }
  module.exports = {
    finished,
    pipeline
  };
});

// node_modules/poppygl/node_modules/readable-stream/lib/stream.js
var require_stream = __commonJS((exports, module) => {
  var { Buffer: Buffer2 } = __require("buffer");
  var { ObjectDefineProperty, ObjectKeys, ReflectApply } = require_primordials();
  var {
    promisify: { custom: customPromisify }
  } = require_util();
  var { streamReturningOperators, promiseReturningOperators } = require_operators();
  var {
    codes: { ERR_ILLEGAL_CONSTRUCTOR }
  } = require_errors();
  var compose = require_compose();
  var { setDefaultHighWaterMark, getDefaultHighWaterMark } = require_state();
  var { pipeline } = require_pipeline();
  var { destroyer } = require_destroy();
  var eos = require_end_of_stream();
  var promises = require_promises();
  var utils = require_utils();
  var Stream = module.exports = require_legacy().Stream;
  Stream.isDestroyed = utils.isDestroyed;
  Stream.isDisturbed = utils.isDisturbed;
  Stream.isErrored = utils.isErrored;
  Stream.isReadable = utils.isReadable;
  Stream.isWritable = utils.isWritable;
  Stream.Readable = require_readable();
  for (const key of ObjectKeys(streamReturningOperators)) {
    let fn = function(...args) {
      if (new.target) {
        throw ERR_ILLEGAL_CONSTRUCTOR();
      }
      return Stream.Readable.from(ReflectApply(op, this, args));
    };
    const op = streamReturningOperators[key];
    ObjectDefineProperty(fn, "name", {
      __proto__: null,
      value: op.name
    });
    ObjectDefineProperty(fn, "length", {
      __proto__: null,
      value: op.length
    });
    ObjectDefineProperty(Stream.Readable.prototype, key, {
      __proto__: null,
      value: fn,
      enumerable: false,
      configurable: true,
      writable: true
    });
  }
  for (const key of ObjectKeys(promiseReturningOperators)) {
    let fn = function(...args) {
      if (new.target) {
        throw ERR_ILLEGAL_CONSTRUCTOR();
      }
      return ReflectApply(op, this, args);
    };
    const op = promiseReturningOperators[key];
    ObjectDefineProperty(fn, "name", {
      __proto__: null,
      value: op.name
    });
    ObjectDefineProperty(fn, "length", {
      __proto__: null,
      value: op.length
    });
    ObjectDefineProperty(Stream.Readable.prototype, key, {
      __proto__: null,
      value: fn,
      enumerable: false,
      configurable: true,
      writable: true
    });
  }
  Stream.Writable = require_writable();
  Stream.Duplex = require_duplex();
  Stream.Transform = require_transform();
  Stream.PassThrough = require_passthrough();
  Stream.pipeline = pipeline;
  var { addAbortSignal } = require_add_abort_signal();
  Stream.addAbortSignal = addAbortSignal;
  Stream.finished = eos;
  Stream.destroy = destroyer;
  Stream.compose = compose;
  Stream.setDefaultHighWaterMark = setDefaultHighWaterMark;
  Stream.getDefaultHighWaterMark = getDefaultHighWaterMark;
  ObjectDefineProperty(Stream, "promises", {
    __proto__: null,
    configurable: true,
    enumerable: true,
    get() {
      return promises;
    }
  });
  ObjectDefineProperty(pipeline, customPromisify, {
    __proto__: null,
    enumerable: true,
    get() {
      return promises.pipeline;
    }
  });
  ObjectDefineProperty(eos, customPromisify, {
    __proto__: null,
    enumerable: true,
    get() {
      return promises.finished;
    }
  });
  Stream.Stream = Stream;
  Stream._isUint8Array = function isUint8Array(value) {
    return value instanceof Uint8Array;
  };
  Stream._uint8ArrayToBuffer = function _uint8ArrayToBuffer(chunk) {
    return Buffer2.from(chunk.buffer, chunk.byteOffset, chunk.byteLength);
  };
});

// node_modules/poppygl/node_modules/readable-stream/lib/ours/index.js
var require_ours = __commonJS((exports, module) => {
  var Stream = __require("stream");
  if (Stream && process.env.READABLE_STREAM === "disable") {
    const promises = Stream.promises;
    module.exports._uint8ArrayToBuffer = Stream._uint8ArrayToBuffer;
    module.exports._isUint8Array = Stream._isUint8Array;
    module.exports.isDisturbed = Stream.isDisturbed;
    module.exports.isErrored = Stream.isErrored;
    module.exports.isReadable = Stream.isReadable;
    module.exports.Readable = Stream.Readable;
    module.exports.Writable = Stream.Writable;
    module.exports.Duplex = Stream.Duplex;
    module.exports.Transform = Stream.Transform;
    module.exports.PassThrough = Stream.PassThrough;
    module.exports.addAbortSignal = Stream.addAbortSignal;
    module.exports.finished = Stream.finished;
    module.exports.destroy = Stream.destroy;
    module.exports.pipeline = Stream.pipeline;
    module.exports.compose = Stream.compose;
    Object.defineProperty(Stream, "promises", {
      configurable: true,
      enumerable: true,
      get() {
        return promises;
      }
    });
    module.exports.Stream = Stream.Stream;
  } else {
    const CustomStream = require_stream();
    const promises = require_promises();
    const originalDestroy = CustomStream.Readable.destroy;
    module.exports = CustomStream.Readable;
    module.exports._uint8ArrayToBuffer = CustomStream._uint8ArrayToBuffer;
    module.exports._isUint8Array = CustomStream._isUint8Array;
    module.exports.isDisturbed = CustomStream.isDisturbed;
    module.exports.isErrored = CustomStream.isErrored;
    module.exports.isReadable = CustomStream.isReadable;
    module.exports.Readable = CustomStream.Readable;
    module.exports.Writable = CustomStream.Writable;
    module.exports.Duplex = CustomStream.Duplex;
    module.exports.Transform = CustomStream.Transform;
    module.exports.PassThrough = CustomStream.PassThrough;
    module.exports.addAbortSignal = CustomStream.addAbortSignal;
    module.exports.finished = CustomStream.finished;
    module.exports.destroy = CustomStream.destroy;
    module.exports.destroy = originalDestroy;
    module.exports.pipeline = CustomStream.pipeline;
    module.exports.compose = CustomStream.compose;
    Object.defineProperty(CustomStream, "promises", {
      configurable: true,
      enumerable: true,
      get() {
        return promises;
      }
    });
    module.exports.Stream = CustomStream.Stream;
  }
  module.exports.default = module.exports;
});

// node_modules/pureimage/dist/index.cjs
var require_dist = __commonJS((exports, module) => {
  var Ji = Object.create;
  var Xt = Object.defineProperty;
  var $i = Object.getOwnPropertyDescriptor;
  var Di = Object.getOwnPropertyNames;
  var Oi = Object.getPrototypeOf;
  var es = Object.prototype.hasOwnProperty;
  var L = (t, e) => () => (e || t((e = { exports: {} }).exports, e), e.exports);
  var ts = (t, e) => {
    for (var r in e)
      Xt(t, r, { get: e[r], enumerable: true });
  };
  var Sn = (t, e, r, n) => {
    if (e && typeof e == "object" || typeof e == "function")
      for (let a of Di(e))
        !es.call(t, a) && a !== r && Xt(t, a, { get: () => e[a], enumerable: !(n = $i(e, a)) || n.enumerable });
    return t;
  };
  var cr = (t, e, r) => (r = t != null ? Ji(Oi(t)) : {}, Sn(e || !t || !t.__esModule ? Xt(r, "default", { value: t, enumerable: true }) : r, t));
  var rs = (t) => Sn(Xt({}, "__esModule", { value: true }), t);
  var At = L((Ee) => {
    var ns = [".notdef", "space", "exclam", "quotedbl", "numbersign", "dollar", "percent", "ampersand", "quoteright", "parenleft", "parenright", "asterisk", "plus", "comma", "hyphen", "period", "slash", "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "colon", "semicolon", "less", "equal", "greater", "question", "at", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "bracketleft", "backslash", "bracketright", "asciicircum", "underscore", "quoteleft", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "braceleft", "bar", "braceright", "asciitilde", "exclamdown", "cent", "sterling", "fraction", "yen", "florin", "section", "currency", "quotesingle", "quotedblleft", "guillemotleft", "guilsinglleft", "guilsinglright", "fi", "fl", "endash", "dagger", "daggerdbl", "periodcentered", "paragraph", "bullet", "quotesinglbase", "quotedblbase", "quotedblright", "guillemotright", "ellipsis", "perthousand", "questiondown", "grave", "acute", "circumflex", "tilde", "macron", "breve", "dotaccent", "dieresis", "ring", "cedilla", "hungarumlaut", "ogonek", "caron", "emdash", "AE", "ordfeminine", "Lslash", "Oslash", "OE", "ordmasculine", "ae", "dotlessi", "lslash", "oslash", "oe", "germandbls", "onesuperior", "logicalnot", "mu", "trademark", "Eth", "onehalf", "plusminus", "Thorn", "onequarter", "divide", "brokenbar", "degree", "thorn", "threequarters", "twosuperior", "registered", "minus", "eth", "multiply", "threesuperior", "copyright", "Aacute", "Acircumflex", "Adieresis", "Agrave", "Aring", "Atilde", "Ccedilla", "Eacute", "Ecircumflex", "Edieresis", "Egrave", "Iacute", "Icircumflex", "Idieresis", "Igrave", "Ntilde", "Oacute", "Ocircumflex", "Odieresis", "Ograve", "Otilde", "Scaron", "Uacute", "Ucircumflex", "Udieresis", "Ugrave", "Yacute", "Ydieresis", "Zcaron", "aacute", "acircumflex", "adieresis", "agrave", "aring", "atilde", "ccedilla", "eacute", "ecircumflex", "edieresis", "egrave", "iacute", "icircumflex", "idieresis", "igrave", "ntilde", "oacute", "ocircumflex", "odieresis", "ograve", "otilde", "scaron", "uacute", "ucircumflex", "udieresis", "ugrave", "yacute", "ydieresis", "zcaron", "exclamsmall", "Hungarumlautsmall", "dollaroldstyle", "dollarsuperior", "ampersandsmall", "Acutesmall", "parenleftsuperior", "parenrightsuperior", "266 ff", "onedotenleader", "zerooldstyle", "oneoldstyle", "twooldstyle", "threeoldstyle", "fouroldstyle", "fiveoldstyle", "sixoldstyle", "sevenoldstyle", "eightoldstyle", "nineoldstyle", "commasuperior", "threequartersemdash", "periodsuperior", "questionsmall", "asuperior", "bsuperior", "centsuperior", "dsuperior", "esuperior", "isuperior", "lsuperior", "msuperior", "nsuperior", "osuperior", "rsuperior", "ssuperior", "tsuperior", "ff", "ffi", "ffl", "parenleftinferior", "parenrightinferior", "Circumflexsmall", "hyphensuperior", "Gravesmall", "Asmall", "Bsmall", "Csmall", "Dsmall", "Esmall", "Fsmall", "Gsmall", "Hsmall", "Ismall", "Jsmall", "Ksmall", "Lsmall", "Msmall", "Nsmall", "Osmall", "Psmall", "Qsmall", "Rsmall", "Ssmall", "Tsmall", "Usmall", "Vsmall", "Wsmall", "Xsmall", "Ysmall", "Zsmall", "colonmonetary", "onefitted", "rupiah", "Tildesmall", "exclamdownsmall", "centoldstyle", "Lslashsmall", "Scaronsmall", "Zcaronsmall", "Dieresissmall", "Brevesmall", "Caronsmall", "Dotaccentsmall", "Macronsmall", "figuredash", "hypheninferior", "Ogoneksmall", "Ringsmall", "Cedillasmall", "questiondownsmall", "oneeighth", "threeeighths", "fiveeighths", "seveneighths", "onethird", "twothirds", "zerosuperior", "foursuperior", "fivesuperior", "sixsuperior", "sevensuperior", "eightsuperior", "ninesuperior", "zeroinferior", "oneinferior", "twoinferior", "threeinferior", "fourinferior", "fiveinferior", "sixinferior", "seveninferior", "eightinferior", "nineinferior", "centinferior", "dollarinferior", "periodinferior", "commainferior", "Agravesmall", "Aacutesmall", "Acircumflexsmall", "Atildesmall", "Adieresissmall", "Aringsmall", "AEsmall", "Ccedillasmall", "Egravesmall", "Eacutesmall", "Ecircumflexsmall", "Edieresissmall", "Igravesmall", "Iacutesmall", "Icircumflexsmall", "Idieresissmall", "Ethsmall", "Ntildesmall", "Ogravesmall", "Oacutesmall", "Ocircumflexsmall", "Otildesmall", "Odieresissmall", "OEsmall", "Oslashsmall", "Ugravesmall", "Uacutesmall", "Ucircumflexsmall", "Udieresissmall", "Yacutesmall", "Thornsmall", "Ydieresissmall", "001.000", "001.001", "001.002", "001.003", "Black", "Bold", "Book", "Light", "Medium", "Regular", "Roman", "Semibold"], as = ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "space", "exclam", "quotedbl", "numbersign", "dollar", "percent", "ampersand", "quoteright", "parenleft", "parenright", "asterisk", "plus", "comma", "hyphen", "period", "slash", "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "colon", "semicolon", "less", "equal", "greater", "question", "at", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "bracketleft", "backslash", "bracketright", "asciicircum", "underscore", "quoteleft", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "braceleft", "bar", "braceright", "asciitilde", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "exclamdown", "cent", "sterling", "fraction", "yen", "florin", "section", "currency", "quotesingle", "quotedblleft", "guillemotleft", "guilsinglleft", "guilsinglright", "fi", "fl", "", "endash", "dagger", "daggerdbl", "periodcentered", "", "paragraph", "bullet", "quotesinglbase", "quotedblbase", "quotedblright", "guillemotright", "ellipsis", "perthousand", "", "questiondown", "", "grave", "acute", "circumflex", "tilde", "macron", "breve", "dotaccent", "dieresis", "", "ring", "cedilla", "", "hungarumlaut", "ogonek", "caron", "emdash", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "AE", "", "ordfeminine", "", "", "", "", "Lslash", "Oslash", "OE", "ordmasculine", "", "", "", "", "", "ae", "", "", "", "dotlessi", "", "", "lslash", "oslash", "oe", "germandbls"], is = ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "space", "exclamsmall", "Hungarumlautsmall", "", "dollaroldstyle", "dollarsuperior", "ampersandsmall", "Acutesmall", "parenleftsuperior", "parenrightsuperior", "twodotenleader", "onedotenleader", "comma", "hyphen", "period", "fraction", "zerooldstyle", "oneoldstyle", "twooldstyle", "threeoldstyle", "fouroldstyle", "fiveoldstyle", "sixoldstyle", "sevenoldstyle", "eightoldstyle", "nineoldstyle", "colon", "semicolon", "commasuperior", "threequartersemdash", "periodsuperior", "questionsmall", "", "asuperior", "bsuperior", "centsuperior", "dsuperior", "esuperior", "", "", "isuperior", "", "", "lsuperior", "msuperior", "nsuperior", "osuperior", "", "", "rsuperior", "ssuperior", "tsuperior", "", "ff", "fi", "fl", "ffi", "ffl", "parenleftinferior", "", "parenrightinferior", "Circumflexsmall", "hyphensuperior", "Gravesmall", "Asmall", "Bsmall", "Csmall", "Dsmall", "Esmall", "Fsmall", "Gsmall", "Hsmall", "Ismall", "Jsmall", "Ksmall", "Lsmall", "Msmall", "Nsmall", "Osmall", "Psmall", "Qsmall", "Rsmall", "Ssmall", "Tsmall", "Usmall", "Vsmall", "Wsmall", "Xsmall", "Ysmall", "Zsmall", "colonmonetary", "onefitted", "rupiah", "Tildesmall", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "exclamdownsmall", "centoldstyle", "Lslashsmall", "", "", "Scaronsmall", "Zcaronsmall", "Dieresissmall", "Brevesmall", "Caronsmall", "", "Dotaccentsmall", "", "", "Macronsmall", "", "", "figuredash", "hypheninferior", "", "", "Ogoneksmall", "Ringsmall", "Cedillasmall", "", "", "", "onequarter", "onehalf", "threequarters", "questiondownsmall", "oneeighth", "threeeighths", "fiveeighths", "seveneighths", "onethird", "twothirds", "", "", "zerosuperior", "onesuperior", "twosuperior", "threesuperior", "foursuperior", "fivesuperior", "sixsuperior", "sevensuperior", "eightsuperior", "ninesuperior", "zeroinferior", "oneinferior", "twoinferior", "threeinferior", "fourinferior", "fiveinferior", "sixinferior", "seveninferior", "eightinferior", "nineinferior", "centinferior", "dollarinferior", "periodinferior", "commainferior", "Agravesmall", "Aacutesmall", "Acircumflexsmall", "Atildesmall", "Adieresissmall", "Aringsmall", "AEsmall", "Ccedillasmall", "Egravesmall", "Eacutesmall", "Ecircumflexsmall", "Edieresissmall", "Igravesmall", "Iacutesmall", "Icircumflexsmall", "Idieresissmall", "Ethsmall", "Ntildesmall", "Ogravesmall", "Oacutesmall", "Ocircumflexsmall", "Otildesmall", "Odieresissmall", "OEsmall", "Oslashsmall", "Ugravesmall", "Uacutesmall", "Ucircumflexsmall", "Udieresissmall", "Yacutesmall", "Thornsmall", "Ydieresissmall"], ss = [".notdef", ".null", "nonmarkingreturn", "space", "exclam", "quotedbl", "numbersign", "dollar", "percent", "ampersand", "quotesingle", "parenleft", "parenright", "asterisk", "plus", "comma", "hyphen", "period", "slash", "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "colon", "semicolon", "less", "equal", "greater", "question", "at", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "bracketleft", "backslash", "bracketright", "asciicircum", "underscore", "grave", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "braceleft", "bar", "braceright", "asciitilde", "Adieresis", "Aring", "Ccedilla", "Eacute", "Ntilde", "Odieresis", "Udieresis", "aacute", "agrave", "acircumflex", "adieresis", "atilde", "aring", "ccedilla", "eacute", "egrave", "ecircumflex", "edieresis", "iacute", "igrave", "icircumflex", "idieresis", "ntilde", "oacute", "ograve", "ocircumflex", "odieresis", "otilde", "uacute", "ugrave", "ucircumflex", "udieresis", "dagger", "degree", "cent", "sterling", "section", "bullet", "paragraph", "germandbls", "registered", "copyright", "trademark", "acute", "dieresis", "notequal", "AE", "Oslash", "infinity", "plusminus", "lessequal", "greaterequal", "yen", "mu", "partialdiff", "summation", "product", "pi", "integral", "ordfeminine", "ordmasculine", "Omega", "ae", "oslash", "questiondown", "exclamdown", "logicalnot", "radical", "florin", "approxequal", "Delta", "guillemotleft", "guillemotright", "ellipsis", "nonbreakingspace", "Agrave", "Atilde", "Otilde", "OE", "oe", "endash", "emdash", "quotedblleft", "quotedblright", "quoteleft", "quoteright", "divide", "lozenge", "ydieresis", "Ydieresis", "fraction", "currency", "guilsinglleft", "guilsinglright", "fi", "fl", "daggerdbl", "periodcentered", "quotesinglbase", "quotedblbase", "perthousand", "Acircumflex", "Ecircumflex", "Aacute", "Edieresis", "Egrave", "Iacute", "Icircumflex", "Idieresis", "Igrave", "Oacute", "Ocircumflex", "apple", "Ograve", "Uacute", "Ucircumflex", "Ugrave", "dotlessi", "circumflex", "tilde", "macron", "breve", "dotaccent", "ring", "cedilla", "hungarumlaut", "ogonek", "caron", "Lslash", "lslash", "Scaron", "scaron", "Zcaron", "zcaron", "brokenbar", "Eth", "eth", "Yacute", "yacute", "Thorn", "thorn", "minus", "multiply", "onesuperior", "twosuperior", "threesuperior", "onehalf", "onequarter", "threequarters", "franc", "Gbreve", "gbreve", "Idotaccent", "Scedilla", "scedilla", "Cacute", "cacute", "Ccaron", "ccaron", "dcroat"];
    function Gn(t) {
      this.font = t;
    }
    Gn.prototype.charToGlyphIndex = function(t) {
      var e = t.charCodeAt(0), r = this.font.glyphs;
      if (r) {
        for (var n = 0;n < r.length; n += 1)
          for (var a = r.get(n), i2 = 0;i2 < a.unicodes.length; i2 += 1)
            if (a.unicodes[i2] === e)
              return n;
      } else
        return null;
    };
    function qn(t) {
      this.cmap = t;
    }
    qn.prototype.charToGlyphIndex = function(t) {
      return this.cmap.glyphIndexMap[t.charCodeAt(0)] || 0;
    };
    function Hn(t, e) {
      this.encoding = t, this.charset = e;
    }
    Hn.prototype.charToGlyphIndex = function(t) {
      var e = t.charCodeAt(0), r = this.encoding[e];
      return this.charset.indexOf(r);
    };
    function dr(t) {
      var e;
      switch (t.version) {
        case 1:
          this.names = Ee.standardNames.slice();
          break;
        case 2:
          for (this.names = new Array(t.numberOfGlyphs), e = 0;e < t.numberOfGlyphs; e++)
            t.glyphNameIndex[e] < Ee.standardNames.length ? this.names[e] = Ee.standardNames[t.glyphNameIndex[e]] : this.names[e] = t.names[t.glyphNameIndex[e] - Ee.standardNames.length];
          break;
        case 2.5:
          for (this.names = new Array(t.numberOfGlyphs), e = 0;e < t.numberOfGlyphs; e++)
            this.names[e] = Ee.standardNames[e + t.glyphNameIndex[e]];
          break;
        case 3:
          this.names = [];
          break;
      }
    }
    dr.prototype.nameToGlyphIndex = function(t) {
      return this.names.indexOf(t);
    };
    dr.prototype.glyphIndexToName = function(t) {
      return this.names[t];
    };
    function os(t) {
      for (var e, r = t.tables.cmap.glyphIndexMap, n = Object.keys(r), a = 0;a < n.length; a += 1) {
        var i2 = n[a], s = r[i2];
        e = t.glyphs.get(s), e.addUnicode(parseInt(i2));
      }
      for (a = 0;a < t.glyphs.length; a += 1)
        e = t.glyphs.get(a), t.cffEncoding ? e.name = t.cffEncoding.charset[a] : e.name = t.glyphNames.glyphIndexToName(a);
    }
    Ee.cffStandardStrings = ns;
    Ee.cffStandardEncoding = as;
    Ee.cffExpertEncoding = is;
    Ee.standardNames = ss;
    Ee.DefaultEncoding = Gn;
    Ee.CmapEncoding = qn;
    Ee.CffEncoding = Hn;
    Ee.GlyphNames = dr;
    Ee.addGlyphNames = os;
  });
  var pt = L((Rn) => {
    function Ae() {
      this.commands = [], this.fill = "black", this.stroke = null, this.strokeWidth = 1;
    }
    Ae.prototype.moveTo = function(t, e) {
      this.commands.push({ type: "M", x: t, y: e });
    };
    Ae.prototype.lineTo = function(t, e) {
      this.commands.push({ type: "L", x: t, y: e });
    };
    Ae.prototype.curveTo = Ae.prototype.bezierCurveTo = function(t, e, r, n, a, i2) {
      this.commands.push({ type: "C", x1: t, y1: e, x2: r, y2: n, x: a, y: i2 });
    };
    Ae.prototype.quadTo = Ae.prototype.quadraticCurveTo = function(t, e, r, n) {
      this.commands.push({ type: "Q", x1: t, y1: e, x: r, y: n });
    };
    Ae.prototype.close = Ae.prototype.closePath = function() {
      this.commands.push({ type: "Z" });
    };
    Ae.prototype.extend = function(t) {
      t.commands && (t = t.commands), Array.prototype.push.apply(this.commands, t);
    };
    Ae.prototype.draw = function(t) {
      t.beginPath();
      for (var e = 0;e < this.commands.length; e += 1) {
        var r = this.commands[e];
        r.type === "M" ? t.moveTo(r.x, r.y) : r.type === "L" ? t.lineTo(r.x, r.y) : r.type === "C" ? t.bezierCurveTo(r.x1, r.y1, r.x2, r.y2, r.x, r.y) : r.type === "Q" ? t.quadraticCurveTo(r.x1, r.y1, r.x, r.y) : r.type === "Z" && t.closePath();
      }
      this.fill && (t.fillStyle = this.fill, t.fill()), this.stroke && (t.strokeStyle = this.stroke, t.lineWidth = this.strokeWidth, t.stroke());
    };
    Ae.prototype.toPathData = function(t) {
      t = t !== undefined ? t : 2;
      function e(s) {
        return Math.round(s) === s ? "" + Math.round(s) : s.toFixed(t);
      }
      function r() {
        for (var s = "", l = 0;l < arguments.length; l += 1) {
          var o = arguments[l];
          o >= 0 && l > 0 && (s += " "), s += e(o);
        }
        return s;
      }
      for (var n = "", a = 0;a < this.commands.length; a += 1) {
        var i2 = this.commands[a];
        i2.type === "M" ? n += "M" + r(i2.x, i2.y) : i2.type === "L" ? n += "L" + r(i2.x, i2.y) : i2.type === "C" ? n += "C" + r(i2.x1, i2.y1, i2.x2, i2.y2, i2.x, i2.y) : i2.type === "Q" ? n += "Q" + r(i2.x1, i2.y1, i2.x, i2.y) : i2.type === "Z" && (n += "Z");
      }
      return n;
    };
    Ae.prototype.toSVG = function(t) {
      var e = '<path d="';
      return e += this.toPathData(t), e += '"', this.fill & this.fill !== "black" && (this.fill === null ? e += ' fill="none"' : e += ' fill="' + this.fill + '"'), this.stroke && (e += ' stroke="' + this.stroke + '" stroke-width="' + this.strokeWidth + '"'), e += "/>", e;
    };
    Rn.Path = Ae;
  });
  var Me = L((Zt) => {
    Zt.argument = function(t, e) {
      if (!t)
        throw new Error(e);
    };
    Zt.assert = Zt.argument;
  });
  var $t = L((Jt) => {
    var at = Me(), Mn = 32768, Yn = 2147483648, xr = {}, B = {}, j = {};
    function Ve(t) {
      return function() {
        return t;
      };
    }
    B.BYTE = function(t) {
      return at.argument(t >= 0 && t <= 255, "Byte value should be between 0 and 255."), [t];
    };
    j.BYTE = Ve(1);
    B.CHAR = function(t) {
      return [t.charCodeAt(0)];
    };
    j.CHAR = Ve(1);
    B.CHARARRAY = function(t) {
      for (var e = [], r = 0;r < t.length; r += 1)
        e.push(t.charCodeAt(r));
      return e;
    };
    j.CHARARRAY = function(t) {
      return t.length;
    };
    B.USHORT = function(t) {
      return [t >> 8 & 255, t & 255];
    };
    j.USHORT = Ve(2);
    B.SHORT = function(t) {
      return t >= Mn && (t = -(2 * Mn - t)), [t >> 8 & 255, t & 255];
    };
    j.SHORT = Ve(2);
    B.UINT24 = function(t) {
      return [t >> 16 & 255, t >> 8 & 255, t & 255];
    };
    j.UINT24 = Ve(3);
    B.ULONG = function(t) {
      return [t >> 24 & 255, t >> 16 & 255, t >> 8 & 255, t & 255];
    };
    j.ULONG = Ve(4);
    B.LONG = function(t) {
      return t >= Yn && (t = -(2 * Yn - t)), [t >> 24 & 255, t >> 16 & 255, t >> 8 & 255, t & 255];
    };
    j.LONG = Ve(4);
    B.FIXED = B.ULONG;
    j.FIXED = j.ULONG;
    B.FWORD = B.SHORT;
    j.FWORD = j.SHORT;
    B.UFWORD = B.USHORT;
    j.UFWORD = j.USHORT;
    B.LONGDATETIME = function() {
      return [0, 0, 0, 0, 0, 0, 0, 0];
    };
    j.LONGDATETIME = Ve(8);
    B.TAG = function(t) {
      return at.argument(t.length === 4, "Tag should be exactly 4 ASCII characters."), [t.charCodeAt(0), t.charCodeAt(1), t.charCodeAt(2), t.charCodeAt(3)];
    };
    j.TAG = Ve(4);
    B.Card8 = B.BYTE;
    j.Card8 = j.BYTE;
    B.Card16 = B.USHORT;
    j.Card16 = j.USHORT;
    B.OffSize = B.BYTE;
    j.OffSize = j.BYTE;
    B.SID = B.USHORT;
    j.SID = j.USHORT;
    B.NUMBER = function(t) {
      return t >= -107 && t <= 107 ? [t + 139] : t >= 108 && t <= 1131 ? (t = t - 108, [(t >> 8) + 247, t & 255]) : t >= -1131 && t <= -108 ? (t = -t - 108, [(t >> 8) + 251, t & 255]) : t >= -32768 && t <= 32767 ? B.NUMBER16(t) : B.NUMBER32(t);
    };
    j.NUMBER = function(t) {
      return B.NUMBER(t).length;
    };
    B.NUMBER16 = function(t) {
      return [28, t >> 8 & 255, t & 255];
    };
    j.NUMBER16 = Ve(3);
    B.NUMBER32 = function(t) {
      return [29, t >> 24 & 255, t >> 16 & 255, t >> 8 & 255, t & 255];
    };
    j.NUMBER32 = Ve(5);
    B.REAL = function(t) {
      var e = t.toString(), r = /\.(\d*?)(?:9{5,20}|0{5,20})\d{0,2}(?:e(.+)|$)/.exec(e);
      if (r) {
        var n = parseFloat("1e" + ((r[2] ? +r[2] : 0) + r[1].length));
        e = (Math.round(t * n) / n).toString();
      }
      var a = "", i2, s;
      for (i2 = 0, s = e.length;i2 < s; i2 += 1) {
        var l = e[i2];
        l === "e" ? a += e[++i2] === "-" ? "c" : "b" : l === "." ? a += "a" : l === "-" ? a += "e" : a += l;
      }
      a += a.length & 1 ? "f" : "ff";
      var o = [30];
      for (i2 = 0, s = a.length;i2 < s; i2 += 2)
        o.push(parseInt(a.substr(i2, 2), 16));
      return o;
    };
    j.REAL = function(t) {
      return B.REAL(t).length;
    };
    B.NAME = B.CHARARRAY;
    j.NAME = j.CHARARRAY;
    B.STRING = B.CHARARRAY;
    j.STRING = j.CHARARRAY;
    xr.UTF16 = function(t, e, r) {
      for (var n = [], a = r / 2, i2 = 0;i2 < a; i2++, e += 2)
        n[i2] = t.getUint16(e);
      return String.fromCharCode.apply(null, n);
    };
    B.UTF16 = function(t) {
      for (var e = [], r = 0;r < t.length; r += 1) {
        var n = t.charCodeAt(r);
        e.push(n >> 8 & 255), e.push(n & 255);
      }
      return e;
    };
    j.UTF16 = function(t) {
      return t.length * 2;
    };
    var mr = { "x-mac-croatian": "ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®Š™´¨≠ŽØ∞±≤≥∆µ∂∑∏š∫ªºΩžø¿¡¬√ƒ≈Ć«Č… ÀÃÕŒœĐ—“”‘’÷◊©⁄€‹›Æ»–·‚„‰ÂćÁčÈÍÎÏÌÓÔđÒÚÛÙıˆ˜¯πË˚¸Êæˇ", "x-mac-cyrillic": "АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ†°Ґ£§•¶І®©™Ђђ≠Ѓѓ∞±≤≥іµґЈЄєЇїЉљЊњјЅ¬√ƒ≈∆«»… ЋћЌќѕ–—“”‘’÷„ЎўЏџ№Ёёяабвгдежзийклмнопрстуфхцчшщъыьэю", "x-mac-gaelic": "ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®©™´¨≠ÆØḂ±≤≥ḃĊċḊḋḞḟĠġṀæøṁṖṗɼƒſṠ«»… ÀÃÕŒœ–—“”‘’ṡẛÿŸṪ€‹›Ŷŷṫ·Ỳỳ⁊ÂÊÁËÈÍÎÏÌÓÔ♣ÒÚÛÙıÝýŴŵẄẅẀẁẂẃ", "x-mac-greek": "Ä¹²É³ÖÜ΅àâä΄¨çéèêë£™îï•½‰ôö¦€ùûü†ΓΔΘΛΞΠß®©ΣΪ§≠°·Α±≤≥¥ΒΕΖΗΙΚΜΦΫΨΩάΝ¬ΟΡ≈Τ«»… ΥΧΆΈœ–―“”‘’÷ΉΊΌΎέήίόΏύαβψδεφγηιξκλμνοπώρστθωςχυζϊϋΐΰ­", "x-mac-icelandic": "ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûüÝ°¢£§•¶ß®©™´¨≠ÆØ∞±≤≥¥µ∂∑∏π∫ªºΩæø¿¡¬√ƒ≈∆«»… ÀÃÕŒœ–—“”‘’÷◊ÿŸ⁄€ÐðÞþý·‚„‰ÂÊÁËÈÍÎÏÌÓÔÒÚÛÙıˆ˜¯˘˙˚¸˝˛ˇ", "x-mac-inuit": "ᐃᐄᐅᐆᐊᐋᐱᐲᐳᐴᐸᐹᑉᑎᑏᑐᑑᑕᑖᑦᑭᑮᑯᑰᑲᑳᒃᒋᒌᒍᒎᒐᒑ°ᒡᒥᒦ•¶ᒧ®©™ᒨᒪᒫᒻᓂᓃᓄᓅᓇᓈᓐᓯᓰᓱᓲᓴᓵᔅᓕᓖᓗᓘᓚᓛᓪᔨᔩᔪᔫᔭ… ᔮᔾᕕᕖᕗ–—“”‘’ᕘᕙᕚᕝᕆᕇᕈᕉᕋᕌᕐᕿᖀᖁᖂᖃᖄᖅᖏᖐᖑᖒᖓᖔᖕᙱᙲᙳᙴᙵᙶᖖᖠᖡᖢᖣᖤᖥᖦᕼŁł", "x-mac-ce": "ÄĀāÉĄÖÜáąČäčĆćéŹźĎíďĒēĖóėôöõúĚěü†°Ę£§•¶ß®©™ę¨≠ģĮįĪ≤≥īĶ∂∑łĻļĽľĹĺŅņŃ¬√ńŇ∆«»… ňŐÕőŌ–—“”‘’÷◊ōŔŕŘ‹›řŖŗŠ‚„šŚśÁŤťÍŽžŪÓÔūŮÚůŰűŲųÝýķŻŁżĢˇ", macintosh: "ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®©™´¨≠ÆØ∞±≤≥¥µ∂∑∏π∫ªºΩæø¿¡¬√ƒ≈∆«»… ÀÃÕŒœ–—“”‘’÷◊ÿŸ⁄€‹›ﬁﬂ‡·‚„‰ÂÊÁËÈÍÎÏÌÓÔÒÚÛÙıˆ˜¯˘˙˚¸˝˛ˇ", "x-mac-romanian": "ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®©™´¨≠ĂȘ∞±≤≥¥µ∂∑∏π∫ªºΩăș¿¡¬√ƒ≈∆«»… ÀÃÕŒœ–—“”‘’÷◊ÿŸ⁄€‹›Țț‡·‚„‰ÂÊÁËÈÍÎÏÌÓÔÒÚÛÙıˆ˜¯˘˙˚¸˝˛ˇ", "x-mac-turkish": "ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®©™´¨≠ÆØ∞±≤≥¥µ∂∑∏π∫ªºΩæø¿¡¬√ƒ≈∆«»… ÀÃÕŒœ–—“”‘’÷◊ÿŸĞğİıŞş‡·‚„‰ÂÊÁËÈÍÎÏÌÓÔÒÚÛÙˆ˜¯˘˙˚¸˝˛ˇ" };
    xr.MACSTRING = function(t, e, r, n) {
      var a = mr[n];
      if (a !== undefined) {
        for (var i2 = "", s = 0;s < r; s++) {
          var l = t.getUint8(e + s);
          l <= 127 ? i2 += String.fromCharCode(l) : i2 += a[l & 127];
        }
        return i2;
      }
    };
    var jt = typeof WeakMap == "function" && new WeakMap, Qt, ls = function(t) {
      if (!Qt) {
        Qt = {};
        for (var e in mr)
          Qt[e] = new String(e);
      }
      var r = Qt[t];
      if (r !== undefined) {
        if (jt) {
          var n = jt.get(r);
          if (n !== undefined)
            return n;
        }
        var a = mr[t];
        if (a !== undefined) {
          for (var i2 = {}, s = 0;s < a.length; s++)
            i2[a.charCodeAt(s)] = s + 128;
          return jt && jt.set(r, i2), i2;
        }
      }
    };
    B.MACSTRING = function(t, e) {
      var r = ls(e);
      if (r !== undefined) {
        for (var n = [], a = 0;a < t.length; a++) {
          var i2 = t.charCodeAt(a);
          if (i2 >= 128 && (i2 = r[i2], i2 === undefined))
            return;
          n.push(i2);
        }
        return n;
      }
    };
    j.MACSTRING = function(t, e) {
      var r = B.MACSTRING(t, e);
      return r !== undefined ? r.length : 0;
    };
    B.INDEX = function(t) {
      var e, r = 1, n = [r], a = [], i2 = 0;
      for (e = 0;e < t.length; e += 1) {
        var s = B.OBJECT(t[e]);
        Array.prototype.push.apply(a, s), i2 += s.length, r += s.length, n.push(r);
      }
      if (a.length === 0)
        return [0, 0];
      var l = [], o = 1 + Math.floor(Math.log(i2) / Math.log(2)) / 8 | 0, h = [undefined, B.BYTE, B.USHORT, B.UINT24, B.ULONG][o];
      for (e = 0;e < n.length; e += 1) {
        var u = h(n[e]);
        Array.prototype.push.apply(l, u);
      }
      return Array.prototype.concat(B.Card16(t.length), B.OffSize(o), l, a);
    };
    j.INDEX = function(t) {
      return B.INDEX(t).length;
    };
    B.DICT = function(t) {
      for (var e = [], r = Object.keys(t), n = r.length, a = 0;a < n; a += 1) {
        var i2 = parseInt(r[a], 0), s = t[i2];
        e = e.concat(B.OPERAND(s.value, s.type)), e = e.concat(B.OPERATOR(i2));
      }
      return e;
    };
    j.DICT = function(t) {
      return B.DICT(t).length;
    };
    B.OPERATOR = function(t) {
      return t < 1200 ? [t] : [12, t - 1200];
    };
    B.OPERAND = function(t, e) {
      var r = [];
      if (Array.isArray(e))
        for (var n = 0;n < e.length; n += 1)
          at.argument(t.length === e.length, "Not enough arguments given for type" + e), r = r.concat(B.OPERAND(t[n], e[n]));
      else if (e === "SID")
        r = r.concat(B.NUMBER(t));
      else if (e === "offset")
        r = r.concat(B.NUMBER32(t));
      else if (e === "number")
        r = r.concat(B.NUMBER(t));
      else if (e === "real")
        r = r.concat(B.REAL(t));
      else
        throw new Error("Unknown operand type " + e);
      return r;
    };
    B.OP = B.BYTE;
    j.OP = j.BYTE;
    var Kt = typeof WeakMap == "function" && new WeakMap;
    B.CHARSTRING = function(t) {
      if (Kt) {
        var e = Kt.get(t);
        if (e !== undefined)
          return e;
      }
      for (var r = [], n = t.length, a = 0;a < n; a += 1) {
        var i2 = t[a];
        r = r.concat(B[i2.type](i2.value));
      }
      return Kt && Kt.set(t, r), r;
    };
    j.CHARSTRING = function(t) {
      return B.CHARSTRING(t).length;
    };
    B.OBJECT = function(t) {
      var e = B[t.type];
      return at.argument(e !== undefined, "No encoding function for type " + t.type), e(t.value);
    };
    j.OBJECT = function(t) {
      var e = j[t.type];
      return at.argument(e !== undefined, "No sizeOf function for type " + t.type), e(t.value);
    };
    B.TABLE = function(t) {
      for (var e = [], r = t.fields.length, n = 0;n < r; n += 1) {
        var a = t.fields[n], i2 = B[a.type];
        at.argument(i2 !== undefined, "No encoding function for field type " + a.type);
        var s = t[a.name];
        s === undefined && (s = a.value);
        var l = i2(s);
        e = e.concat(l);
      }
      return e;
    };
    j.TABLE = function(t) {
      for (var e = 0, r = t.fields.length, n = 0;n < r; n += 1) {
        var a = t.fields[n], i2 = j[a.type];
        at.argument(i2 !== undefined, "No sizeOf function for field type " + a.type);
        var s = t[a.name];
        s === undefined && (s = a.value), e += i2(s);
      }
      return e;
    };
    B.LITERAL = function(t) {
      return t;
    };
    j.LITERAL = function(t) {
      return t.length;
    };
    Jt.decode = xr;
    Jt.encode = B;
    Jt.sizeOf = j;
  });
  var Ge = L((Wn) => {
    var fs = Me(), hs = $t().encode, us = $t().sizeOf;
    function vr(t, e, r) {
      var n;
      for (n = 0;n < e.length; n += 1) {
        var a = e[n];
        this[a.name] = a.value;
      }
      if (this.tableName = t, this.fields = e, r) {
        var i2 = Object.keys(r);
        for (n = 0;n < i2.length; n += 1) {
          var s = i2[n], l = r[s];
          this[s] !== undefined && (this[s] = l);
        }
      }
    }
    vr.prototype.sizeOf = function() {
      for (var t = 0, e = 0;e < this.fields.length; e += 1) {
        var r = this.fields[e], n = this[r.name];
        if (n === undefined && (n = r.value), typeof n.sizeOf == "function")
          t += n.sizeOf();
        else {
          var a = us[r.type];
          fs.assert(typeof a == "function", "Could not find sizeOf function for field" + r.name), t += a(n);
        }
      }
      return t;
    };
    vr.prototype.encode = function() {
      return hs.TABLE(this);
    };
    Wn.Table = vr;
  });
  var Be = L((ke) => {
    ke.getByte = function(e, r) {
      return e.getUint8(r);
    };
    ke.getCard8 = ke.getByte;
    ke.getUShort = function(t, e) {
      return t.getUint16(e, false);
    };
    ke.getCard16 = ke.getUShort;
    ke.getShort = function(t, e) {
      return t.getInt16(e, false);
    };
    ke.getULong = function(t, e) {
      return t.getUint32(e, false);
    };
    ke.getFixed = function(t, e) {
      var r = t.getInt16(e, false), n = t.getUint16(e + 2, false);
      return r + n / 65535;
    };
    ke.getTag = function(t, e) {
      for (var r = "", n = e;n < e + 4; n += 1)
        r += String.fromCharCode(t.getInt8(n));
      return r;
    };
    ke.getOffset = function(t, e, r) {
      for (var n = 0, a = 0;a < r; a += 1)
        n <<= 8, n += t.getUint8(e + a);
      return n;
    };
    ke.getBytes = function(t, e, r) {
      for (var n = [], a = e;a < r; a += 1)
        n.push(t.getUint8(a));
      return n;
    };
    ke.bytesToString = function(t) {
      for (var e = "", r = 0;r < t.length; r += 1)
        e += String.fromCharCode(t[r]);
      return e;
    };
    var cs = { byte: 1, uShort: 2, short: 2, uLong: 4, fixed: 4, longDateTime: 8, tag: 4 };
    function Te(t, e) {
      this.data = t, this.offset = e, this.relativeOffset = 0;
    }
    Te.prototype.parseByte = function() {
      var t = this.data.getUint8(this.offset + this.relativeOffset);
      return this.relativeOffset += 1, t;
    };
    Te.prototype.parseChar = function() {
      var t = this.data.getInt8(this.offset + this.relativeOffset);
      return this.relativeOffset += 1, t;
    };
    Te.prototype.parseCard8 = Te.prototype.parseByte;
    Te.prototype.parseUShort = function() {
      var t = this.data.getUint16(this.offset + this.relativeOffset);
      return this.relativeOffset += 2, t;
    };
    Te.prototype.parseCard16 = Te.prototype.parseUShort;
    Te.prototype.parseSID = Te.prototype.parseUShort;
    Te.prototype.parseOffset16 = Te.prototype.parseUShort;
    Te.prototype.parseShort = function() {
      var t = this.data.getInt16(this.offset + this.relativeOffset);
      return this.relativeOffset += 2, t;
    };
    Te.prototype.parseF2Dot14 = function() {
      var t = this.data.getInt16(this.offset + this.relativeOffset) / 16384;
      return this.relativeOffset += 2, t;
    };
    Te.prototype.parseULong = function() {
      var t = ke.getULong(this.data, this.offset + this.relativeOffset);
      return this.relativeOffset += 4, t;
    };
    Te.prototype.parseFixed = function() {
      var t = ke.getFixed(this.data, this.offset + this.relativeOffset);
      return this.relativeOffset += 4, t;
    };
    Te.prototype.parseOffset16List = Te.prototype.parseUShortList = function(t) {
      for (var e = new Array(t), r = this.data, n = this.offset + this.relativeOffset, a = 0;a < t; a++)
        e[a] = ke.getUShort(r, n), n += 2;
      return this.relativeOffset += t * 2, e;
    };
    Te.prototype.parseString = function(t) {
      var e = this.data, r = this.offset + this.relativeOffset, n = "";
      this.relativeOffset += t;
      for (var a = 0;a < t; a++)
        n += String.fromCharCode(e.getUint8(r + a));
      return n;
    };
    Te.prototype.parseTag = function() {
      return this.parseString(4);
    };
    Te.prototype.parseLongDateTime = function() {
      var t = ke.getULong(this.data, this.offset + this.relativeOffset + 4);
      return this.relativeOffset += 8, t;
    };
    Te.prototype.parseFixed = function() {
      var t = ke.getULong(this.data, this.offset + this.relativeOffset);
      return this.relativeOffset += 4, t / 65536;
    };
    Te.prototype.parseVersion = function() {
      var t = ke.getUShort(this.data, this.offset + this.relativeOffset), e = ke.getUShort(this.data, this.offset + this.relativeOffset + 2);
      return this.relativeOffset += 4, t + e / 4096 / 10;
    };
    Te.prototype.skip = function(t, e) {
      e === undefined && (e = 1), this.relativeOffset += cs[t] * e;
    };
    ke.Parser = Te;
  });
  var br = L((gr) => {
    var Vn = Me(), Le = Be(), ps = Ge();
    function ds(t, e) {
      var r, n = {};
      n.version = Le.getUShort(t, e), Vn.argument(n.version === 0, "cmap table version should be 0."), n.numTables = Le.getUShort(t, e + 2);
      var a = -1;
      for (r = 0;r < n.numTables; r += 1) {
        var i2 = Le.getUShort(t, e + 4 + r * 8), s = Le.getUShort(t, e + 4 + r * 8 + 2);
        if (i2 === 3 && (s === 1 || s === 0)) {
          a = Le.getULong(t, e + 4 + r * 8 + 4);
          break;
        }
      }
      if (a === -1)
        return null;
      var l = new Le.Parser(t, e + a);
      n.format = l.parseUShort(), Vn.argument(n.format === 4, "Only format 4 cmap tables are supported."), n.length = l.parseUShort(), n.language = l.parseUShort();
      var o;
      n.segCount = o = l.parseUShort() >> 1, l.skip("uShort", 3), n.glyphIndexMap = {};
      var h = new Le.Parser(t, e + a + 14), u = new Le.Parser(t, e + a + 16 + o * 2), c = new Le.Parser(t, e + a + 16 + o * 4), p = new Le.Parser(t, e + a + 16 + o * 6), d = e + a + 16 + o * 8;
      for (r = 0;r < o - 1; r += 1)
        for (var m, F = h.parseUShort(), b = u.parseUShort(), I = c.parseShort(), w = p.parseUShort(), x2 = b;x2 <= F; x2 += 1)
          w !== 0 ? (d = p.offset + p.relativeOffset - 2, d += w, d += (x2 - b) * 2, m = Le.getUShort(t, d), m !== 0 && (m = m + I & 65535)) : m = x2 + I & 65535, n.glyphIndexMap[x2] = m;
      return n;
    }
    function ms(t, e, r) {
      t.segments.push({ end: e, start: e, delta: -(e - r), offset: 0 });
    }
    function xs(t) {
      t.segments.push({ end: 65535, start: 65535, delta: 1, offset: 0 });
    }
    function vs(t) {
      var e, r = new ps.Table("cmap", [{ name: "version", type: "USHORT", value: 0 }, { name: "numTables", type: "USHORT", value: 1 }, { name: "platformID", type: "USHORT", value: 3 }, { name: "encodingID", type: "USHORT", value: 1 }, { name: "offset", type: "ULONG", value: 12 }, { name: "format", type: "USHORT", value: 4 }, { name: "length", type: "USHORT", value: 0 }, { name: "language", type: "USHORT", value: 0 }, { name: "segCountX2", type: "USHORT", value: 0 }, { name: "searchRange", type: "USHORT", value: 0 }, { name: "entrySelector", type: "USHORT", value: 0 }, { name: "rangeShift", type: "USHORT", value: 0 }]);
      for (r.segments = [], e = 0;e < t.length; e += 1) {
        for (var n = t.get(e), a = 0;a < n.unicodes.length; a += 1)
          ms(r, n.unicodes[a], e);
        r.segments = r.segments.sort(function(p, d) {
          return p.start - d.start;
        });
      }
      xs(r);
      var i2;
      i2 = r.segments.length, r.segCountX2 = i2 * 2, r.searchRange = Math.pow(2, Math.floor(Math.log(i2) / Math.log(2))) * 2, r.entrySelector = Math.log(r.searchRange / 2) / Math.log(2), r.rangeShift = r.segCountX2 - r.searchRange;
      var s = [], l = [], o = [], h = [], u = [];
      for (e = 0;e < i2; e += 1) {
        var c = r.segments[e];
        s = s.concat({ name: "end_" + e, type: "USHORT", value: c.end }), l = l.concat({ name: "start_" + e, type: "USHORT", value: c.start }), o = o.concat({ name: "idDelta_" + e, type: "SHORT", value: c.delta }), h = h.concat({ name: "idRangeOffset_" + e, type: "USHORT", value: c.offset }), c.glyphId !== undefined && (u = u.concat({ name: "glyph_" + e, type: "USHORT", value: c.glyphId }));
      }
      return r.fields = r.fields.concat(s), r.fields.push({ name: "reservedPad", type: "USHORT", value: 0 }), r.fields = r.fields.concat(l), r.fields = r.fields.concat(o), r.fields = r.fields.concat(h), r.fields = r.fields.concat(u), r.length = 14 + s.length * 2 + 2 + l.length * 2 + o.length * 2 + h.length * 2 + u.length * 2, r;
    }
    gr.parse = ds;
    gr.make = vs;
  });
  var Xn = L((Ln) => {
    function gs(t, e, r, n, a) {
      t.beginPath(), t.moveTo(e, r), t.lineTo(n, a), t.stroke();
    }
    Ln.line = gs;
  });
  var yr = L((zn) => {
    var bs = Me(), it = Xn(), ys = pt();
    function Ts(t, e) {
      var r = e || { commands: [] };
      return { configurable: true, get: function() {
        return typeof r == "function" && (r = r()), r;
      }, set: function(n) {
        r = n;
      } };
    }
    function De(t) {
      this.bindConstructorValues(t);
    }
    De.prototype.bindConstructorValues = function(t) {
      this.index = t.index || 0, this.name = t.name || null, this.unicode = t.unicode || undefined, this.unicodes = t.unicodes || t.unicode !== undefined ? [t.unicode] : [], t.xMin && (this.xMin = t.xMin), t.yMin && (this.yMin = t.yMin), t.xMax && (this.xMax = t.xMax), t.yMax && (this.yMax = t.yMax), t.advanceWidth && (this.advanceWidth = t.advanceWidth), Object.defineProperty(this, "path", Ts(this, t.path));
    };
    De.prototype.addUnicode = function(t) {
      this.unicodes.length === 0 && (this.unicode = t), this.unicodes.push(t);
    };
    De.prototype.getPath = function(t, e, r) {
      t = t !== undefined ? t : 0, e = e !== undefined ? e : 0, r = r !== undefined ? r : 72;
      for (var n = 1 / this.path.unitsPerEm * r, a = new ys.Path, i2 = this.path.commands, s = 0;s < i2.length; s += 1) {
        var l = i2[s];
        l.type === "M" ? a.moveTo(t + l.x * n, e + -l.y * n) : l.type === "L" ? a.lineTo(t + l.x * n, e + -l.y * n) : l.type === "Q" ? a.quadraticCurveTo(t + l.x1 * n, e + -l.y1 * n, t + l.x * n, e + -l.y * n) : l.type === "C" ? a.curveTo(t + l.x1 * n, e + -l.y1 * n, t + l.x2 * n, e + -l.y2 * n, t + l.x * n, e + -l.y * n) : l.type === "Z" && a.closePath();
      }
      return a;
    };
    De.prototype.getContours = function() {
      if (this.points === undefined)
        return [];
      for (var t = [], e = [], r = 0;r < this.points.length; r += 1) {
        var n = this.points[r];
        e.push(n), n.lastPointOfContour && (t.push(e), e = []);
      }
      return bs.argument(e.length === 0, "There are still points left in the current contour."), t;
    };
    De.prototype.getMetrics = function() {
      for (var t = this.path.commands, e = [], r = [], n = 0;n < t.length; n += 1) {
        var a = t[n];
        a.type !== "Z" && (e.push(a.x), r.push(a.y)), (a.type === "Q" || a.type === "C") && (e.push(a.x1), r.push(a.y1)), a.type === "C" && (e.push(a.x2), r.push(a.y2));
      }
      var i2 = { xMin: Math.min.apply(null, e), yMin: Math.min.apply(null, r), xMax: Math.max.apply(null, e), yMax: Math.max.apply(null, r), leftSideBearing: 0 };
      return isFinite(i2.xMin) || (i2.xMin = 0), isFinite(i2.xMax) || (i2.xMax = this.advanceWidth), isFinite(i2.yMin) || (i2.yMin = 0), isFinite(i2.yMax) || (i2.yMax = 0), i2.rightSideBearing = this.advanceWidth - i2.leftSideBearing - (i2.xMax - i2.xMin), i2;
    };
    De.prototype.draw = function(t, e, r, n) {
      this.getPath(e, r, n).draw(t);
    };
    De.prototype.drawPoints = function(t, e, r, n) {
      function a(c, p, d, m) {
        var F = Math.PI * 2;
        t.beginPath();
        for (var b = 0;b < c.length; b += 1)
          t.moveTo(p + c[b].x * m, d + c[b].y * m), t.arc(p + c[b].x * m, d + c[b].y * m, 2, 0, F, false);
        t.closePath(), t.fill();
      }
      e = e !== undefined ? e : 0, r = r !== undefined ? r : 0, n = n !== undefined ? n : 24;
      for (var i2 = 1 / this.path.unitsPerEm * n, s = [], l = [], o = this.path, h = 0;h < o.commands.length; h += 1) {
        var u = o.commands[h];
        u.x !== undefined && s.push({ x: u.x, y: -u.y }), u.x1 !== undefined && l.push({ x: u.x1, y: -u.y1 }), u.x2 !== undefined && l.push({ x: u.x2, y: -u.y2 });
      }
      t.fillStyle = "blue", a(s, e, r, i2), t.fillStyle = "red", a(l, e, r, i2);
    };
    De.prototype.drawMetrics = function(t, e, r, n) {
      var a;
      e = e !== undefined ? e : 0, r = r !== undefined ? r : 0, n = n !== undefined ? n : 24, a = 1 / this.path.unitsPerEm * n, t.lineWidth = 1, t.strokeStyle = "black", it.line(t, e, -1e4, e, 1e4), it.line(t, -1e4, r, 1e4, r);
      var i2 = this.xMin || 0, s = this.yMin || 0, l = this.xMax || 0, o = this.yMax || 0, h = this.advanceWidth || 0;
      t.strokeStyle = "blue", it.line(t, e + i2 * a, -1e4, e + i2 * a, 1e4), it.line(t, e + l * a, -1e4, e + l * a, 1e4), it.line(t, -1e4, r + -s * a, 1e4, r + -s * a), it.line(t, -1e4, r + -o * a, 1e4, r + -o * a), t.strokeStyle = "green", it.line(t, e + h * a, -1e4, e + h * a, 1e4);
    };
    zn.Glyph = De;
  });
  var Dt = L((Gt) => {
    var Tr = yr();
    function wr(t, e) {
      if (this.font = t, this.glyphs = {}, Array.isArray(e))
        for (var r = 0;r < e.length; r++)
          this.glyphs[r] = e[r];
      this.length = e && e.length || 0;
    }
    wr.prototype.get = function(t) {
      return typeof this.glyphs[t] == "function" && (this.glyphs[t] = this.glyphs[t]()), this.glyphs[t];
    };
    wr.prototype.push = function(t, e) {
      this.glyphs[t] = e, this.length++;
    };
    function ws(t, e) {
      return new Tr.Glyph({ index: e, font: t });
    }
    function Fs(t, e, r, n, a, i2) {
      return function() {
        var s = new Tr.Glyph({ index: e, font: t });
        return s.path = function() {
          r(s, n, a);
          var l = i2(t.glyphs, s);
          return l.unitsPerEm = t.unitsPerEm, l;
        }, s;
      };
    }
    function ks(t, e, r, n) {
      return function() {
        var a = new Tr.Glyph({ index: e, font: t });
        return a.path = function() {
          var i2 = r(t, a, n);
          return i2.unitsPerEm = t.unitsPerEm, i2;
        }, a;
      };
    }
    Gt.GlyphSet = wr;
    Gt.glyphLoader = ws;
    Gt.ttfGlyphLoader = Fs;
    Gt.cffGlyphLoader = ks;
  });
  var kr = L((Fr) => {
    var Oe = At(), Nn = Dt(), qe = Be(), Is = pt(), Xe = Ge();
    function Kn(t, e) {
      if (t === e)
        return true;
      if (Array.isArray(t) && Array.isArray(e)) {
        if (t.length !== e.length)
          return false;
        for (var r = 0;r < t.length; r += 1)
          if (!Kn(t[r], e[r]))
            return false;
        return true;
      } else
        return false;
    }
    function dt(t, e, r) {
      var n = [], a = [], i2 = qe.getCard16(t, e), s, l, o;
      if (i2 !== 0) {
        var h = qe.getByte(t, e + 2);
        l = e + (i2 + 1) * h + 2;
        var u = e + 3;
        for (s = 0;s < i2 + 1; s += 1)
          n.push(qe.getOffset(t, u, h)), u += h;
        o = l + n[i2];
      } else
        o = e + 2;
      for (s = 0;s < n.length - 1; s += 1) {
        var c = qe.getBytes(t, l + n[s], l + n[s + 1]);
        r && (c = r(c)), a.push(c);
      }
      return { objects: a, startOffset: e, endOffset: o };
    }
    function Us(t) {
      for (var e = "", r = 15, n = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "E", "E-", null, "-"];; ) {
        var a = t.parseByte(), i2 = a >> 4, s = a & 15;
        if (i2 === r || (e += n[i2], s === r))
          break;
        e += n[s];
      }
      return parseFloat(e);
    }
    function _s(t, e) {
      var r, n, a, i2;
      if (e === 28)
        return r = t.parseByte(), n = t.parseByte(), r << 8 | n;
      if (e === 29)
        return r = t.parseByte(), n = t.parseByte(), a = t.parseByte(), i2 = t.parseByte(), r << 24 | n << 16 | a << 8 | i2;
      if (e === 30)
        return Us(t);
      if (e >= 32 && e <= 246)
        return e - 139;
      if (e >= 247 && e <= 250)
        return r = t.parseByte(), (e - 247) * 256 + r + 108;
      if (e >= 251 && e <= 254)
        return r = t.parseByte(), -(e - 251) * 256 - r - 108;
      throw new Error("Invalid b0 " + e);
    }
    function Ps(t) {
      for (var e = {}, r = 0;r < t.length; r += 1) {
        var n = t[r][0], a = t[r][1], i2;
        if (a.length === 1 ? i2 = a[0] : i2 = a, e.hasOwnProperty(n))
          throw new Error("Object " + e + " already has key " + n);
        e[n] = i2;
      }
      return e;
    }
    function Jn(t, e, r) {
      e = e !== undefined ? e : 0;
      var n = new qe.Parser(t, e), a = [], i2 = [];
      for (r = r !== undefined ? r : t.length;n.relativeOffset < r; ) {
        var s = n.parseByte();
        s <= 21 ? (s === 12 && (s = 1200 + n.parseByte()), a.push([s, i2]), i2 = []) : i2.push(_s(n, s));
      }
      return Ps(a);
    }
    function Ot(t, e) {
      return e <= 390 ? e = Oe.cffStandardStrings[e] : e = t[e - 391], e;
    }
    function $n(t, e, r) {
      for (var n = {}, a = 0;a < e.length; a += 1) {
        var i2 = e[a], s = t[i2.op];
        s === undefined && (s = i2.value !== undefined ? i2.value : null), i2.type === "SID" && (s = Ot(r, s)), n[i2.name] = s;
      }
      return n;
    }
    function Bs(t, e) {
      var r = {};
      return r.formatMajor = qe.getCard8(t, e), r.formatMinor = qe.getCard8(t, e + 1), r.size = qe.getCard8(t, e + 2), r.offsetSize = qe.getCard8(t, e + 3), r.startOffset = e, r.endOffset = e + 4, r;
    }
    var Dn = [{ name: "version", op: 0, type: "SID" }, { name: "notice", op: 1, type: "SID" }, { name: "copyright", op: 1200, type: "SID" }, { name: "fullName", op: 2, type: "SID" }, { name: "familyName", op: 3, type: "SID" }, { name: "weight", op: 4, type: "SID" }, { name: "isFixedPitch", op: 1201, type: "number", value: 0 }, { name: "italicAngle", op: 1202, type: "number", value: 0 }, { name: "underlinePosition", op: 1203, type: "number", value: -100 }, { name: "underlineThickness", op: 1204, type: "number", value: 50 }, { name: "paintType", op: 1205, type: "number", value: 0 }, { name: "charstringType", op: 1206, type: "number", value: 2 }, { name: "fontMatrix", op: 1207, type: ["real", "real", "real", "real", "real", "real"], value: [0.001, 0, 0, 0.001, 0, 0] }, { name: "uniqueId", op: 13, type: "number" }, { name: "fontBBox", op: 5, type: ["number", "number", "number", "number"], value: [0, 0, 0, 0] }, { name: "strokeWidth", op: 1208, type: "number", value: 0 }, { name: "xuid", op: 14, type: [], value: null }, { name: "charset", op: 15, type: "offset", value: 0 }, { name: "encoding", op: 16, type: "offset", value: 0 }, { name: "charStrings", op: 17, type: "offset", value: 0 }, { name: "private", op: 18, type: ["number", "offset"], value: [0, 0] }], On = [{ name: "subrs", op: 19, type: "offset", value: 0 }, { name: "defaultWidthX", op: 20, type: "number", value: 0 }, { name: "nominalWidthX", op: 21, type: "number", value: 0 }];
    function Ss(t, e) {
      var r = Jn(t, 0, t.byteLength);
      return $n(r, Dn, e);
    }
    function Es(t, e, r, n) {
      var a = Jn(t, e, r);
      return $n(a, On, n);
    }
    function Cs(t, e, r, n) {
      var a, i2, s, l = new qe.Parser(t, e);
      r -= 1;
      var o = [".notdef"], h = l.parseCard8();
      if (h === 0)
        for (a = 0;a < r; a += 1)
          i2 = l.parseSID(), o.push(Ot(n, i2));
      else if (h === 1)
        for (;o.length <= r; )
          for (i2 = l.parseSID(), s = l.parseCard8(), a = 0;a <= s; a += 1)
            o.push(Ot(n, i2)), i2 += 1;
      else if (h === 2)
        for (;o.length <= r; )
          for (i2 = l.parseSID(), s = l.parseCard16(), a = 0;a <= s; a += 1)
            o.push(Ot(n, i2)), i2 += 1;
      else
        throw new Error("Unknown charset format " + h);
      return o;
    }
    function As(t, e, r) {
      var n, a, i2 = {}, s = new qe.Parser(t, e), l = s.parseCard8();
      if (l === 0) {
        var o = s.parseCard8();
        for (n = 0;n < o; n += 1)
          a = s.parseCard8(), i2[a] = n;
      } else if (l === 1) {
        var h = s.parseCard8();
        for (a = 1, n = 0;n < h; n += 1)
          for (var u = s.parseCard8(), c = s.parseCard8(), p = u;p <= u + c; p += 1)
            i2[p] = a, a += 1;
      } else
        throw new Error("Unknown encoding format " + l);
      return new Oe.CffEncoding(i2, r);
    }
    function Gs(t, e, r) {
      var n, a, i2, s, l = new Is.Path, o = [], h = 0, u = false, c = t.defaultWidthX, p = false, d = 0, m = 0;
      function F(w, x2) {
        p && l.closePath(), l.moveTo(w, x2), p = true;
      }
      function b() {
        var w;
        w = o.length % 2 !== 0, w && !u && (c = o.shift() + t.nominalWidthX), h += o.length >> 1, o.length = 0, u = true;
      }
      function I(w) {
        for (var x2, U, y, W, T, R, S, E, G, V, C, z, P = 0;P < w.length; ) {
          var H = w[P];
          switch (P += 1, H) {
            case 1:
              b();
              break;
            case 3:
              b();
              break;
            case 4:
              o.length > 1 && !u && (c = o.shift() + t.nominalWidthX, u = true), m += o.pop(), F(d, m);
              break;
            case 5:
              for (;o.length > 0; )
                d += o.shift(), m += o.shift(), l.lineTo(d, m);
              break;
            case 6:
              for (;o.length > 0 && (d += o.shift(), l.lineTo(d, m), o.length !== 0); )
                m += o.shift(), l.lineTo(d, m);
              break;
            case 7:
              for (;o.length > 0 && (m += o.shift(), l.lineTo(d, m), o.length !== 0); )
                d += o.shift(), l.lineTo(d, m);
              break;
            case 8:
              for (;o.length > 0; )
                n = d + o.shift(), a = m + o.shift(), i2 = n + o.shift(), s = a + o.shift(), d = i2 + o.shift(), m = s + o.shift(), l.curveTo(n, a, i2, s, d, m);
              break;
            case 10:
              T = o.pop() + t.subrsBias, R = t.subrs[T], R && I(R);
              break;
            case 11:
              return;
            case 12:
              switch (H = w[P], P += 1, H) {
                case 35:
                  n = d + o.shift(), a = m + o.shift(), i2 = n + o.shift(), s = a + o.shift(), S = i2 + o.shift(), E = s + o.shift(), G = S + o.shift(), V = E + o.shift(), C = G + o.shift(), z = V + o.shift(), d = C + o.shift(), m = z + o.shift(), o.shift(), l.curveTo(n, a, i2, s, S, E), l.curveTo(G, V, C, z, d, m);
                  break;
                case 34:
                  n = d + o.shift(), a = m, i2 = n + o.shift(), s = a + o.shift(), S = i2 + o.shift(), E = s, G = S + o.shift(), V = s, C = G + o.shift(), z = m, d = C + o.shift(), l.curveTo(n, a, i2, s, S, E), l.curveTo(G, V, C, z, d, m);
                  break;
                case 36:
                  n = d + o.shift(), a = m + o.shift(), i2 = n + o.shift(), s = a + o.shift(), S = i2 + o.shift(), E = s, G = S + o.shift(), V = s, C = G + o.shift(), z = V + o.shift(), d = C + o.shift(), l.curveTo(n, a, i2, s, S, E), l.curveTo(G, V, C, z, d, m);
                  break;
                case 37:
                  n = d + o.shift(), a = m + o.shift(), i2 = n + o.shift(), s = a + o.shift(), S = i2 + o.shift(), E = s + o.shift(), G = S + o.shift(), V = E + o.shift(), C = G + o.shift(), z = V + o.shift(), Math.abs(C - d) > Math.abs(z - m) ? d = C + o.shift() : m = z + o.shift(), l.curveTo(n, a, i2, s, S, E), l.curveTo(G, V, C, z, d, m);
                  break;
                default:
                  console.log("Glyph " + e.index + ": unknown operator 1200" + H), o.length = 0;
              }
              break;
            case 14:
              o.length > 0 && !u && (c = o.shift() + t.nominalWidthX, u = true), p && (l.closePath(), p = false);
              break;
            case 18:
              b();
              break;
            case 19:
            case 20:
              b(), P += h + 7 >> 3;
              break;
            case 21:
              o.length > 2 && !u && (c = o.shift() + t.nominalWidthX, u = true), m += o.pop(), d += o.pop(), F(d, m);
              break;
            case 22:
              o.length > 1 && !u && (c = o.shift() + t.nominalWidthX, u = true), d += o.pop(), F(d, m);
              break;
            case 23:
              b();
              break;
            case 24:
              for (;o.length > 2; )
                n = d + o.shift(), a = m + o.shift(), i2 = n + o.shift(), s = a + o.shift(), d = i2 + o.shift(), m = s + o.shift(), l.curveTo(n, a, i2, s, d, m);
              d += o.shift(), m += o.shift(), l.lineTo(d, m);
              break;
            case 25:
              for (;o.length > 6; )
                d += o.shift(), m += o.shift(), l.lineTo(d, m);
              n = d + o.shift(), a = m + o.shift(), i2 = n + o.shift(), s = a + o.shift(), d = i2 + o.shift(), m = s + o.shift(), l.curveTo(n, a, i2, s, d, m);
              break;
            case 26:
              for (o.length % 2 && (d += o.shift());o.length > 0; )
                n = d, a = m + o.shift(), i2 = n + o.shift(), s = a + o.shift(), d = i2, m = s + o.shift(), l.curveTo(n, a, i2, s, d, m);
              break;
            case 27:
              for (o.length % 2 && (m += o.shift());o.length > 0; )
                n = d + o.shift(), a = m, i2 = n + o.shift(), s = a + o.shift(), d = i2 + o.shift(), m = s, l.curveTo(n, a, i2, s, d, m);
              break;
            case 28:
              x2 = w[P], U = w[P + 1], o.push((x2 << 24 | U << 16) >> 16), P += 2;
              break;
            case 29:
              T = o.pop() + t.gsubrsBias, R = t.gsubrs[T], R && I(R);
              break;
            case 30:
              for (;o.length > 0 && (n = d, a = m + o.shift(), i2 = n + o.shift(), s = a + o.shift(), d = i2 + o.shift(), m = s + (o.length === 1 ? o.shift() : 0), l.curveTo(n, a, i2, s, d, m), o.length !== 0); )
                n = d + o.shift(), a = m, i2 = n + o.shift(), s = a + o.shift(), m = s + o.shift(), d = i2 + (o.length === 1 ? o.shift() : 0), l.curveTo(n, a, i2, s, d, m);
              break;
            case 31:
              for (;o.length > 0 && (n = d + o.shift(), a = m, i2 = n + o.shift(), s = a + o.shift(), m = s + o.shift(), d = i2 + (o.length === 1 ? o.shift() : 0), l.curveTo(n, a, i2, s, d, m), o.length !== 0); )
                n = d, a = m + o.shift(), i2 = n + o.shift(), s = a + o.shift(), d = i2 + o.shift(), m = s + (o.length === 1 ? o.shift() : 0), l.curveTo(n, a, i2, s, d, m);
              break;
            default:
              H < 32 ? console.log("Glyph " + e.index + ": unknown operator " + H) : H < 247 ? o.push(H - 139) : H < 251 ? (x2 = w[P], P += 1, o.push((H - 247) * 256 + x2 + 108)) : H < 255 ? (x2 = w[P], P += 1, o.push(-(H - 251) * 256 - x2 - 108)) : (x2 = w[P], U = w[P + 1], y = w[P + 2], W = w[P + 3], P += 4, o.push((x2 << 24 | U << 16 | y << 8 | W) / 65536));
          }
        }
      }
      return I(r), e.advanceWidth = c, l;
    }
    function Zn(t) {
      var e;
      return t.length < 1240 ? e = 107 : t.length < 33900 ? e = 1131 : e = 32768, e;
    }
    function qs(t, e, r) {
      r.tables.cff = {};
      var n = Bs(t, e), a = dt(t, n.endOffset, qe.bytesToString), i2 = dt(t, a.endOffset), s = dt(t, i2.endOffset, qe.bytesToString), l = dt(t, s.endOffset);
      r.gsubrs = l.objects, r.gsubrsBias = Zn(r.gsubrs);
      var o = new DataView(new Uint8Array(i2.objects[0]).buffer), h = Ss(o, s.objects);
      r.tables.cff.topDict = h;
      var u = e + h.private[1], c = Es(t, u, h.private[0], s.objects);
      if (r.defaultWidthX = c.defaultWidthX, r.nominalWidthX = c.nominalWidthX, c.subrs !== 0) {
        var p = u + c.subrs, d = dt(t, p);
        r.subrs = d.objects, r.subrsBias = Zn(r.subrs);
      } else
        r.subrs = [], r.subrsBias = 0;
      var m = dt(t, e + h.charStrings);
      r.nGlyphs = m.objects.length;
      var F = Cs(t, e + h.charset, r.nGlyphs, s.objects);
      h.encoding === 0 ? r.cffEncoding = new Oe.CffEncoding(Oe.cffStandardEncoding, F) : h.encoding === 1 ? r.cffEncoding = new Oe.CffEncoding(Oe.cffExpertEncoding, F) : r.cffEncoding = As(t, e + h.encoding, F), r.encoding = r.encoding || r.cffEncoding, r.glyphs = new Nn.GlyphSet(r);
      for (var b = 0;b < r.nGlyphs; b += 1) {
        var I = m.objects[b];
        r.glyphs.push(b, Nn.cffGlyphLoader(r, b, Gs, I));
      }
    }
    function ea(t, e) {
      var r, n = Oe.cffStandardStrings.indexOf(t);
      return n >= 0 && (r = n), n = e.indexOf(t), n >= 0 ? r = n + Oe.cffStandardStrings.length : (r = Oe.cffStandardStrings.length + e.length, e.push(t)), r;
    }
    function Hs() {
      return new Xe.Table("Header", [{ name: "major", type: "Card8", value: 1 }, { name: "minor", type: "Card8", value: 0 }, { name: "hdrSize", type: "Card8", value: 4 }, { name: "major", type: "Card8", value: 1 }]);
    }
    function Rs(t) {
      var e = new Xe.Table("Name INDEX", [{ name: "names", type: "INDEX", value: [] }]);
      e.names = [];
      for (var r = 0;r < t.length; r += 1)
        e.names.push({ name: "name_" + r, type: "NAME", value: t[r] });
      return e;
    }
    function ta(t, e, r) {
      for (var n = {}, a = 0;a < t.length; a += 1) {
        var i2 = t[a], s = e[i2.name];
        s !== undefined && !Kn(s, i2.value) && (i2.type === "SID" && (s = ea(s, r)), n[i2.op] = { name: i2.name, type: i2.type, value: s });
      }
      return n;
    }
    function jn(t, e) {
      var r = new Xe.Table("Top DICT", [{ name: "dict", type: "DICT", value: {} }]);
      return r.dict = ta(Dn, t, e), r;
    }
    function Qn(t) {
      var e = new Xe.Table("Top DICT INDEX", [{ name: "topDicts", type: "INDEX", value: [] }]);
      return e.topDicts = [{ name: "topDict_0", type: "TABLE", value: t }], e;
    }
    function Ms(t) {
      var e = new Xe.Table("String INDEX", [{ name: "strings", type: "INDEX", value: [] }]);
      e.strings = [];
      for (var r = 0;r < t.length; r += 1)
        e.strings.push({ name: "string_" + r, type: "STRING", value: t[r] });
      return e;
    }
    function Ys() {
      return new Xe.Table("Global Subr INDEX", [{ name: "subrs", type: "INDEX", value: [] }]);
    }
    function Ws(t, e) {
      for (var r = new Xe.Table("Charsets", [{ name: "format", type: "Card8", value: 0 }]), n = 0;n < t.length; n += 1) {
        var a = t[n], i2 = ea(a, e);
        r.fields.push({ name: "glyph_" + n, type: "SID", value: i2 });
      }
      return r;
    }
    function Vs(t) {
      var e = [], r = t.path;
      e.push({ name: "width", type: "NUMBER", value: t.advanceWidth });
      for (var n = 0, a = 0, i2 = 0;i2 < r.commands.length; i2 += 1) {
        var s, l, o = r.commands[i2];
        if (o.type === "Q") {
          var h = 0.3333333333333333, u = 2 / 3;
          o = { type: "C", x: o.x, y: o.y, x1: h * n + u * o.x1, y1: h * a + u * o.y1, x2: h * o.x + u * o.x1, y2: h * o.y + u * o.y1 };
        }
        if (o.type === "M")
          s = Math.round(o.x - n), l = Math.round(o.y - a), e.push({ name: "dx", type: "NUMBER", value: s }), e.push({ name: "dy", type: "NUMBER", value: l }), e.push({ name: "rmoveto", type: "OP", value: 21 }), n = Math.round(o.x), a = Math.round(o.y);
        else if (o.type === "L")
          s = Math.round(o.x - n), l = Math.round(o.y - a), e.push({ name: "dx", type: "NUMBER", value: s }), e.push({ name: "dy", type: "NUMBER", value: l }), e.push({ name: "rlineto", type: "OP", value: 5 }), n = Math.round(o.x), a = Math.round(o.y);
        else if (o.type === "C") {
          var c = Math.round(o.x1 - n), p = Math.round(o.y1 - a), d = Math.round(o.x2 - o.x1), m = Math.round(o.y2 - o.y1);
          s = Math.round(o.x - o.x2), l = Math.round(o.y - o.y2), e.push({ name: "dx1", type: "NUMBER", value: c }), e.push({ name: "dy1", type: "NUMBER", value: p }), e.push({ name: "dx2", type: "NUMBER", value: d }), e.push({ name: "dy2", type: "NUMBER", value: m }), e.push({ name: "dx", type: "NUMBER", value: s }), e.push({ name: "dy", type: "NUMBER", value: l }), e.push({ name: "rrcurveto", type: "OP", value: 8 }), n = Math.round(o.x), a = Math.round(o.y);
        }
      }
      return e.push({ name: "endchar", type: "OP", value: 14 }), e;
    }
    function Ls(t) {
      for (var e = new Xe.Table("CharStrings INDEX", [{ name: "charStrings", type: "INDEX", value: [] }]), r = 0;r < t.length; r += 1) {
        var n = t.get(r), a = Vs(n);
        e.charStrings.push({ name: n.name, type: "CHARSTRING", value: a });
      }
      return e;
    }
    function Xs(t, e) {
      var r = new Xe.Table("Private DICT", [{ name: "dict", type: "DICT", value: {} }]);
      return r.dict = ta(On, t, e), r;
    }
    function zs(t) {
      var e = new Xe.Table("Private DICT INDEX", [{ name: "privateDicts", type: "INDEX", value: [] }]);
      return e.privateDicts = [{ name: "privateDict_0", type: "TABLE", value: t }], e;
    }
    function Ns(t, e) {
      for (var r = new Xe.Table("CFF ", [{ name: "header", type: "TABLE" }, { name: "nameIndex", type: "TABLE" }, { name: "topDictIndex", type: "TABLE" }, { name: "stringIndex", type: "TABLE" }, { name: "globalSubrIndex", type: "TABLE" }, { name: "charsets", type: "TABLE" }, { name: "charStringsIndex", type: "TABLE" }, { name: "privateDictIndex", type: "TABLE" }]), n = 1 / e.unitsPerEm, a = { version: e.version, fullName: e.fullName, familyName: e.familyName, weight: e.weightName, fontMatrix: [n, 0, 0, n, 0, 0], charset: 999, encoding: 0, charStrings: 999, private: [0, 999] }, i2 = {}, s = [], l, o = 1;o < t.length; o += 1)
        l = t.get(o), s.push(l.name);
      var h = [];
      r.header = Hs(), r.nameIndex = Rs([e.postScriptName]);
      var u = jn(a, h);
      r.topDictIndex = Qn(u), r.globalSubrIndex = Ys(), r.charsets = Ws(s, h), r.charStringsIndex = Ls(t);
      var c = Xs(i2, h);
      r.privateDictIndex = zs(c), r.stringIndex = Ms(h);
      var p = r.header.sizeOf() + r.nameIndex.sizeOf() + r.topDictIndex.sizeOf() + r.stringIndex.sizeOf() + r.globalSubrIndex.sizeOf();
      return a.charset = p, a.encoding = 0, a.charStrings = a.charset + r.charsets.sizeOf(), a.private[1] = a.charStrings + r.charStringsIndex.sizeOf(), u = jn(a, h), r.topDictIndex = Qn(u), r;
    }
    Fr.parse = qs;
    Fr.make = Ns;
  });
  var Ur = L((Ir) => {
    var Zs = Me(), js = Be(), Qs = Ge();
    function Ks(t, e) {
      var r = {}, n = new js.Parser(t, e);
      return r.version = n.parseVersion(), r.fontRevision = Math.round(n.parseFixed() * 1000) / 1000, r.checkSumAdjustment = n.parseULong(), r.magicNumber = n.parseULong(), Zs.argument(r.magicNumber === 1594834165, "Font header has wrong magic number."), r.flags = n.parseUShort(), r.unitsPerEm = n.parseUShort(), r.created = n.parseLongDateTime(), r.modified = n.parseLongDateTime(), r.xMin = n.parseShort(), r.yMin = n.parseShort(), r.xMax = n.parseShort(), r.yMax = n.parseShort(), r.macStyle = n.parseUShort(), r.lowestRecPPEM = n.parseUShort(), r.fontDirectionHint = n.parseShort(), r.indexToLocFormat = n.parseShort(), r.glyphDataFormat = n.parseShort(), r;
    }
    function Js(t) {
      return new Qs.Table("head", [{ name: "version", type: "FIXED", value: 65536 }, { name: "fontRevision", type: "FIXED", value: 65536 }, { name: "checkSumAdjustment", type: "ULONG", value: 0 }, { name: "magicNumber", type: "ULONG", value: 1594834165 }, { name: "flags", type: "USHORT", value: 0 }, { name: "unitsPerEm", type: "USHORT", value: 1000 }, { name: "created", type: "LONGDATETIME", value: 0 }, { name: "modified", type: "LONGDATETIME", value: 0 }, { name: "xMin", type: "SHORT", value: 0 }, { name: "yMin", type: "SHORT", value: 0 }, { name: "xMax", type: "SHORT", value: 0 }, { name: "yMax", type: "SHORT", value: 0 }, { name: "macStyle", type: "USHORT", value: 0 }, { name: "lowestRecPPEM", type: "USHORT", value: 0 }, { name: "fontDirectionHint", type: "SHORT", value: 2 }, { name: "indexToLocFormat", type: "SHORT", value: 0 }, { name: "glyphDataFormat", type: "SHORT", value: 0 }], t);
    }
    Ir.parse = Ks;
    Ir.make = Js;
  });
  var Pr = L((_r) => {
    var $s = Be(), Ds = Ge();
    function Os(t, e) {
      var r = {}, n = new $s.Parser(t, e);
      return r.version = n.parseVersion(), r.ascender = n.parseShort(), r.descender = n.parseShort(), r.lineGap = n.parseShort(), r.advanceWidthMax = n.parseUShort(), r.minLeftSideBearing = n.parseShort(), r.minRightSideBearing = n.parseShort(), r.xMaxExtent = n.parseShort(), r.caretSlopeRise = n.parseShort(), r.caretSlopeRun = n.parseShort(), r.caretOffset = n.parseShort(), n.relativeOffset += 8, r.metricDataFormat = n.parseShort(), r.numberOfHMetrics = n.parseUShort(), r;
    }
    function eo(t) {
      return new Ds.Table("hhea", [{ name: "version", type: "FIXED", value: 65536 }, { name: "ascender", type: "FWORD", value: 0 }, { name: "descender", type: "FWORD", value: 0 }, { name: "lineGap", type: "FWORD", value: 0 }, { name: "advanceWidthMax", type: "UFWORD", value: 0 }, { name: "minLeftSideBearing", type: "FWORD", value: 0 }, { name: "minRightSideBearing", type: "FWORD", value: 0 }, { name: "xMaxExtent", type: "FWORD", value: 0 }, { name: "caretSlopeRise", type: "SHORT", value: 1 }, { name: "caretSlopeRun", type: "SHORT", value: 0 }, { name: "caretOffset", type: "SHORT", value: 0 }, { name: "reserved1", type: "SHORT", value: 0 }, { name: "reserved2", type: "SHORT", value: 0 }, { name: "reserved3", type: "SHORT", value: 0 }, { name: "reserved4", type: "SHORT", value: 0 }, { name: "metricDataFormat", type: "SHORT", value: 0 }, { name: "numberOfHMetrics", type: "USHORT", value: 0 }], t);
    }
    _r.parse = Os;
    _r.make = eo;
  });
  var Sr = L((Br) => {
    var to = Be(), ro = Ge();
    function no(t, e, r, n, a) {
      for (var i2, s, l = new to.Parser(t, e), o = 0;o < n; o += 1) {
        o < r && (i2 = l.parseUShort(), s = l.parseShort());
        var h = a.get(o);
        h.advanceWidth = i2, h.leftSideBearing = s;
      }
    }
    function ao(t) {
      for (var e = new ro.Table("hmtx", []), r = 0;r < t.length; r += 1) {
        var n = t.get(r), a = n.advanceWidth || 0, i2 = n.leftSideBearing || 0;
        e.fields.push({ name: "advanceWidth_" + r, type: "USHORT", value: a }), e.fields.push({ name: "leftSideBearing_" + r, type: "SHORT", value: i2 });
      }
      return e;
    }
    Br.parse = no;
    Br.make = ao;
  });
  var Cr = L((Er) => {
    var io = Me(), so = Be(), oo = Ge();
    function lo(t) {
      for (var e = new oo.Table("ltag", [{ name: "version", type: "ULONG", value: 1 }, { name: "flags", type: "ULONG", value: 0 }, { name: "numTags", type: "ULONG", value: t.length }]), r = "", n = 12 + t.length * 4, a = 0;a < t.length; ++a) {
        var i2 = r.indexOf(t[a]);
        i2 < 0 && (i2 = r.length, r += t[a]), e.fields.push({ name: "offset " + a, type: "USHORT", value: n + i2 }), e.fields.push({ name: "length " + a, type: "USHORT", value: t[a].length });
      }
      return e.fields.push({ name: "stringPool", type: "CHARARRAY", value: r }), e;
    }
    function fo(t, e) {
      var r = new so.Parser(t, e), n = r.parseULong();
      io.argument(n === 1, "Unsupported ltag table version."), r.skip("uLong", 1);
      for (var a = r.parseULong(), i2 = [], s = 0;s < a; s++) {
        for (var l = "", o = e + r.parseUShort(), h = r.parseUShort(), u = o;u < o + h; ++u)
          l += String.fromCharCode(t.getInt8(u));
        i2.push(l);
      }
      return i2;
    }
    Er.make = lo;
    Er.parse = fo;
  });
  var Gr = L((Ar) => {
    var ho = Be(), uo = Ge();
    function co(t, e) {
      var r = {}, n = new ho.Parser(t, e);
      return r.version = n.parseVersion(), r.numGlyphs = n.parseUShort(), r.version === 1 && (r.maxPoints = n.parseUShort(), r.maxContours = n.parseUShort(), r.maxCompositePoints = n.parseUShort(), r.maxCompositeContours = n.parseUShort(), r.maxZones = n.parseUShort(), r.maxTwilightPoints = n.parseUShort(), r.maxStorage = n.parseUShort(), r.maxFunctionDefs = n.parseUShort(), r.maxInstructionDefs = n.parseUShort(), r.maxStackElements = n.parseUShort(), r.maxSizeOfInstructions = n.parseUShort(), r.maxComponentElements = n.parseUShort(), r.maxComponentDepth = n.parseUShort()), r;
    }
    function po(t) {
      return new uo.Table("maxp", [{ name: "version", type: "FIXED", value: 20480 }, { name: "numGlyphs", type: "USHORT", value: t }]);
    }
    Ar.parse = co;
    Ar.make = po;
  });
  var Yr = L((Mr) => {
    var ia = $t(), ra = ia.decode, qr = ia.encode, mo = Be(), sa = Ge(), oa = ["copyright", "fontFamily", "fontSubfamily", "uniqueID", "fullName", "version", "postScriptName", "trademark", "manufacturer", "designer", "description", "manufacturerURL", "designerURL", "licence", "licenceURL", "reserved", "preferredFamily", "preferredSubfamily", "compatibleFullName", "sampleText", "postScriptFindFontName", "wwsFamily", "wwsSubfamily"], la = { 0: "en", 1: "fr", 2: "de", 3: "it", 4: "nl", 5: "sv", 6: "es", 7: "da", 8: "pt", 9: "no", 10: "he", 11: "ja", 12: "ar", 13: "fi", 14: "el", 15: "is", 16: "mt", 17: "tr", 18: "hr", 19: "zh-Hant", 20: "ur", 21: "hi", 22: "th", 23: "ko", 24: "lt", 25: "pl", 26: "hu", 27: "es", 28: "lv", 29: "se", 30: "fo", 31: "fa", 32: "ru", 33: "zh", 34: "nl-BE", 35: "ga", 36: "sq", 37: "ro", 38: "cz", 39: "sk", 40: "si", 41: "yi", 42: "sr", 43: "mk", 44: "bg", 45: "uk", 46: "be", 47: "uz", 48: "kk", 49: "az-Cyrl", 50: "az-Arab", 51: "hy", 52: "ka", 53: "mo", 54: "ky", 55: "tg", 56: "tk", 57: "mn-CN", 58: "mn", 59: "ps", 60: "ks", 61: "ku", 62: "sd", 63: "bo", 64: "ne", 65: "sa", 66: "mr", 67: "bn", 68: "as", 69: "gu", 70: "pa", 71: "or", 72: "ml", 73: "kn", 74: "ta", 75: "te", 76: "si", 77: "my", 78: "km", 79: "lo", 80: "vi", 81: "id", 82: "tl", 83: "ms", 84: "ms-Arab", 85: "am", 86: "ti", 87: "om", 88: "so", 89: "sw", 90: "rw", 91: "rn", 92: "ny", 93: "mg", 94: "eo", 128: "cy", 129: "eu", 130: "ca", 131: "la", 132: "qu", 133: "gn", 134: "ay", 135: "tt", 136: "ug", 137: "dz", 138: "jv", 139: "su", 140: "gl", 141: "af", 142: "br", 143: "iu", 144: "gd", 145: "gv", 146: "ga", 147: "to", 148: "el-polyton", 149: "kl", 150: "az", 151: "nn" }, xo = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 5, 11: 1, 12: 4, 13: 0, 14: 6, 15: 0, 16: 0, 17: 0, 18: 0, 19: 2, 20: 4, 21: 9, 22: 21, 23: 3, 24: 29, 25: 29, 26: 29, 27: 29, 28: 29, 29: 0, 30: 0, 31: 4, 32: 7, 33: 25, 34: 0, 35: 0, 36: 0, 37: 0, 38: 29, 39: 29, 40: 0, 41: 5, 42: 7, 43: 7, 44: 7, 45: 7, 46: 7, 47: 7, 48: 7, 49: 7, 50: 4, 51: 24, 52: 23, 53: 7, 54: 7, 55: 7, 56: 7, 57: 27, 58: 7, 59: 4, 60: 4, 61: 4, 62: 4, 63: 26, 64: 9, 65: 9, 66: 9, 67: 13, 68: 13, 69: 11, 70: 10, 71: 12, 72: 17, 73: 16, 74: 14, 75: 15, 76: 18, 77: 19, 78: 20, 79: 22, 80: 30, 81: 0, 82: 0, 83: 0, 84: 4, 85: 28, 86: 28, 87: 28, 88: 0, 89: 0, 90: 0, 91: 0, 92: 0, 93: 0, 94: 0, 128: 0, 129: 0, 130: 0, 131: 0, 132: 0, 133: 0, 134: 0, 135: 7, 136: 4, 137: 26, 138: 0, 139: 0, 140: 0, 141: 0, 142: 0, 143: 28, 144: 0, 145: 0, 146: 0, 147: 0, 148: 6, 149: 0, 150: 0, 151: 0 }, fa = { 1078: "af", 1052: "sq", 1156: "gsw", 1118: "am", 5121: "ar-DZ", 15361: "ar-BH", 3073: "ar", 2049: "ar-IQ", 11265: "ar-JO", 13313: "ar-KW", 12289: "ar-LB", 4097: "ar-LY", 6145: "ary", 8193: "ar-OM", 16385: "ar-QA", 1025: "ar-SA", 10241: "ar-SY", 7169: "aeb", 14337: "ar-AE", 9217: "ar-YE", 1067: "hy", 1101: "as", 2092: "az-Cyrl", 1068: "az", 1133: "ba", 1069: "eu", 1059: "be", 2117: "bn", 1093: "bn-IN", 8218: "bs-Cyrl", 5146: "bs", 1150: "br", 1026: "bg", 1027: "ca", 3076: "zh-HK", 5124: "zh-MO", 2052: "zh", 4100: "zh-SG", 1028: "zh-TW", 1155: "co", 1050: "hr", 4122: "hr-BA", 1029: "cs", 1030: "da", 1164: "prs", 1125: "dv", 2067: "nl-BE", 1043: "nl", 3081: "en-AU", 10249: "en-BZ", 4105: "en-CA", 9225: "en-029", 16393: "en-IN", 6153: "en-IE", 8201: "en-JM", 17417: "en-MY", 5129: "en-NZ", 13321: "en-PH", 18441: "en-SG", 7177: "en-ZA", 11273: "en-TT", 2057: "en-GB", 1033: "en", 12297: "en-ZW", 1061: "et", 1080: "fo", 1124: "fil", 1035: "fi", 2060: "fr-BE", 3084: "fr-CA", 1036: "fr", 5132: "fr-LU", 6156: "fr-MC", 4108: "fr-CH", 1122: "fy", 1110: "gl", 1079: "ka", 3079: "de-AT", 1031: "de", 5127: "de-LI", 4103: "de-LU", 2055: "de-CH", 1032: "el", 1135: "kl", 1095: "gu", 1128: "ha", 1037: "he", 1081: "hi", 1038: "hu", 1039: "is", 1136: "ig", 1057: "id", 1117: "iu", 2141: "iu-Latn", 2108: "ga", 1076: "xh", 1077: "zu", 1040: "it", 2064: "it-CH", 1041: "ja", 1099: "kn", 1087: "kk", 1107: "km", 1158: "quc", 1159: "rw", 1089: "sw", 1111: "kok", 1042: "ko", 1088: "ky", 1108: "lo", 1062: "lv", 1063: "lt", 2094: "dsb", 1134: "lb", 1071: "mk", 2110: "ms-BN", 1086: "ms", 1100: "ml", 1082: "mt", 1153: "mi", 1146: "arn", 1102: "mr", 1148: "moh", 1104: "mn", 2128: "mn-CN", 1121: "ne", 1044: "nb", 2068: "nn", 1154: "oc", 1096: "or", 1123: "ps", 1045: "pl", 1046: "pt", 2070: "pt-PT", 1094: "pa", 1131: "qu-BO", 2155: "qu-EC", 3179: "qu", 1048: "ro", 1047: "rm", 1049: "ru", 9275: "smn", 4155: "smj-NO", 5179: "smj", 3131: "se-FI", 1083: "se", 2107: "se-SE", 8251: "sms", 6203: "sma-NO", 7227: "sms", 1103: "sa", 7194: "sr-Cyrl-BA", 3098: "sr", 6170: "sr-Latn-BA", 2074: "sr-Latn", 1132: "nso", 1074: "tn", 1115: "si", 1051: "sk", 1060: "sl", 11274: "es-AR", 16394: "es-BO", 13322: "es-CL", 9226: "es-CO", 5130: "es-CR", 7178: "es-DO", 12298: "es-EC", 17418: "es-SV", 4106: "es-GT", 18442: "es-HN", 2058: "es-MX", 19466: "es-NI", 6154: "es-PA", 15370: "es-PY", 10250: "es-PE", 20490: "es-PR", 3082: "es", 1034: "es", 21514: "es-US", 14346: "es-UY", 8202: "es-VE", 2077: "sv-FI", 1053: "sv", 1114: "syr", 1064: "tg", 2143: "tzm", 1097: "ta", 1092: "tt", 1098: "te", 1054: "th", 1105: "bo", 1055: "tr", 1090: "tk", 1152: "ug", 1058: "uk", 1070: "hsb", 1056: "ur", 2115: "uz-Cyrl", 1091: "uz", 1066: "vi", 1106: "cy", 1160: "wo", 1157: "sah", 1144: "ii", 1130: "yo" };
    function vo(t, e, r) {
      switch (t) {
        case 0:
          if (e === 65535)
            return "und";
          if (r)
            return r[e];
          break;
        case 1:
          return la[e];
        case 3:
          return fa[e];
      }
    }
    var Rr = "utf-16", go = { 0: "macintosh", 1: "x-mac-japanese", 2: "x-mac-chinesetrad", 3: "x-mac-korean", 6: "x-mac-greek", 7: "x-mac-cyrillic", 9: "x-mac-devanagai", 10: "x-mac-gurmukhi", 11: "x-mac-gujarati", 12: "x-mac-oriya", 13: "x-mac-bengali", 14: "x-mac-tamil", 15: "x-mac-telugu", 16: "x-mac-kannada", 17: "x-mac-malayalam", 18: "x-mac-sinhalese", 19: "x-mac-burmese", 20: "x-mac-khmer", 21: "x-mac-thai", 22: "x-mac-lao", 23: "x-mac-georgian", 24: "x-mac-armenian", 25: "x-mac-chinesesimp", 26: "x-mac-tibetan", 27: "x-mac-mongolian", 28: "x-mac-ethiopic", 29: "x-mac-ce", 30: "x-mac-vietnamese", 31: "x-mac-extarabic" }, bo = { 15: "x-mac-icelandic", 17: "x-mac-turkish", 18: "x-mac-croatian", 24: "x-mac-ce", 25: "x-mac-ce", 26: "x-mac-ce", 27: "x-mac-ce", 28: "x-mac-ce", 30: "x-mac-icelandic", 37: "x-mac-romanian", 38: "x-mac-ce", 39: "x-mac-ce", 40: "x-mac-ce", 143: "x-mac-inuit", 146: "x-mac-gaelic" };
    function ha(t, e, r) {
      switch (t) {
        case 0:
          return Rr;
        case 1:
          return bo[r] || go[e];
        case 3:
          if (e === 1 || e === 10)
            return Rr;
          break;
      }
    }
    function yo(t, e, r) {
      for (var n = {}, a = new mo.Parser(t, e), i2 = a.parseUShort(), s = a.parseUShort(), l = a.offset + a.parseUShort(), o = 0;o < s; o++) {
        var h = a.parseUShort(), u = a.parseUShort(), c = a.parseUShort(), p = a.parseUShort(), d = oa[p] || p, m = a.parseUShort(), F = a.parseUShort(), b = vo(h, c, r), I = ha(h, u, c);
        if (I !== undefined && b !== undefined) {
          var w;
          if (I === Rr ? w = ra.UTF16(t, l + F, m) : w = ra.MACSTRING(t, l + F, m, I), w) {
            var x2 = n[d];
            x2 === undefined && (x2 = n[d] = {}), x2[b] = w;
          }
        }
      }
      var U = 0;
      return i2 === 1 && (U = a.parseUShort()), n;
    }
    function Hr(t) {
      var e = {};
      for (var r in t)
        e[t[r]] = parseInt(r);
      return e;
    }
    function na(t, e, r, n, a, i2) {
      return new sa.Table("NameRecord", [{ name: "platformID", type: "USHORT", value: t }, { name: "encodingID", type: "USHORT", value: e }, { name: "languageID", type: "USHORT", value: r }, { name: "nameID", type: "USHORT", value: n }, { name: "length", type: "USHORT", value: a }, { name: "offset", type: "USHORT", value: i2 }]);
    }
    function To(t, e) {
      var r = t.length, n = e.length - r + 1;
      e:
        for (var a = 0;a < n; a++)
          for (;a < n; a++) {
            for (var i2 = 0;i2 < r; i2++)
              if (e[a + i2] !== t[i2])
                continue e;
            return a;
          }
      return -1;
    }
    function aa(t, e) {
      var r = To(t, e);
      if (r < 0) {
        r = e.length;
        for (var n = 0, a = t.length;n < a; ++n)
          e.push(t[n]);
      }
      return r;
    }
    function wo(t, e) {
      var r, n = [], a = {}, i2 = Hr(oa);
      for (var s in t) {
        var l = i2[s];
        l === undefined && (l = s), r = parseInt(l), a[r] = t[s], n.push(r);
      }
      for (var o = Hr(la), h = Hr(fa), u = [], c = [], p = 0;p < n.length; p++) {
        r = n[p];
        var d = a[r];
        for (var m in d) {
          var F = d[m], b = 1, I = o[m], w = xo[I], x2 = ha(b, w, I), U = qr.MACSTRING(F, x2);
          U === undefined && (b = 0, I = e.indexOf(m), I < 0 && (I = e.length, e.push(m)), w = 4, U = qr.UTF16(F));
          var y = aa(U, c);
          u.push(na(b, w, I, r, U.length, y));
          var W = h[m];
          if (W !== undefined) {
            var T = qr.UTF16(F), R = aa(T, c);
            u.push(na(3, 1, W, r, T.length, R));
          }
        }
      }
      u.sort(function(G, V) {
        return G.platformID - V.platformID || G.encodingID - V.encodingID || G.languageID - V.languageID || G.nameID - V.nameID;
      });
      for (var S = new sa.Table("name", [{ name: "format", type: "USHORT", value: 0 }, { name: "count", type: "USHORT", value: u.length }, { name: "stringOffset", type: "USHORT", value: 6 + u.length * 12 }]), E = 0;E < u.length; E++)
        S.fields.push({ name: "record_" + E, type: "TABLE", value: u[E] });
      return S.fields.push({ name: "strings", type: "LITERAL", value: c }), S;
    }
    Mr.parse = yo;
    Mr.make = wo;
  });
  var Vr = L((qt) => {
    var Fo = Be(), ko = Ge(), Wr = [{ begin: 0, end: 127 }, { begin: 128, end: 255 }, { begin: 256, end: 383 }, { begin: 384, end: 591 }, { begin: 592, end: 687 }, { begin: 688, end: 767 }, { begin: 768, end: 879 }, { begin: 880, end: 1023 }, { begin: 11392, end: 11519 }, { begin: 1024, end: 1279 }, { begin: 1328, end: 1423 }, { begin: 1424, end: 1535 }, { begin: 42240, end: 42559 }, { begin: 1536, end: 1791 }, { begin: 1984, end: 2047 }, { begin: 2304, end: 2431 }, { begin: 2432, end: 2559 }, { begin: 2560, end: 2687 }, { begin: 2688, end: 2815 }, { begin: 2816, end: 2943 }, { begin: 2944, end: 3071 }, { begin: 3072, end: 3199 }, { begin: 3200, end: 3327 }, { begin: 3328, end: 3455 }, { begin: 3584, end: 3711 }, { begin: 3712, end: 3839 }, { begin: 4256, end: 4351 }, { begin: 6912, end: 7039 }, { begin: 4352, end: 4607 }, { begin: 7680, end: 7935 }, { begin: 7936, end: 8191 }, { begin: 8192, end: 8303 }, { begin: 8304, end: 8351 }, { begin: 8352, end: 8399 }, { begin: 8400, end: 8447 }, { begin: 8448, end: 8527 }, { begin: 8528, end: 8591 }, { begin: 8592, end: 8703 }, { begin: 8704, end: 8959 }, { begin: 8960, end: 9215 }, { begin: 9216, end: 9279 }, { begin: 9280, end: 9311 }, { begin: 9312, end: 9471 }, { begin: 9472, end: 9599 }, { begin: 9600, end: 9631 }, { begin: 9632, end: 9727 }, { begin: 9728, end: 9983 }, { begin: 9984, end: 10175 }, { begin: 12288, end: 12351 }, { begin: 12352, end: 12447 }, { begin: 12448, end: 12543 }, { begin: 12544, end: 12591 }, { begin: 12592, end: 12687 }, { begin: 43072, end: 43135 }, { begin: 12800, end: 13055 }, { begin: 13056, end: 13311 }, { begin: 44032, end: 55215 }, { begin: 55296, end: 57343 }, { begin: 67840, end: 67871 }, { begin: 19968, end: 40959 }, { begin: 57344, end: 63743 }, { begin: 12736, end: 12783 }, { begin: 64256, end: 64335 }, { begin: 64336, end: 65023 }, { begin: 65056, end: 65071 }, { begin: 65040, end: 65055 }, { begin: 65104, end: 65135 }, { begin: 65136, end: 65279 }, { begin: 65280, end: 65519 }, { begin: 65520, end: 65535 }, { begin: 3840, end: 4095 }, { begin: 1792, end: 1871 }, { begin: 1920, end: 1983 }, { begin: 3456, end: 3583 }, { begin: 4096, end: 4255 }, { begin: 4608, end: 4991 }, { begin: 5024, end: 5119 }, { begin: 5120, end: 5759 }, { begin: 5760, end: 5791 }, { begin: 5792, end: 5887 }, { begin: 6016, end: 6143 }, { begin: 6144, end: 6319 }, { begin: 10240, end: 10495 }, { begin: 40960, end: 42127 }, { begin: 5888, end: 5919 }, { begin: 66304, end: 66351 }, { begin: 66352, end: 66383 }, { begin: 66560, end: 66639 }, { begin: 118784, end: 119039 }, { begin: 119808, end: 120831 }, { begin: 1044480, end: 1048573 }, { begin: 65024, end: 65039 }, { begin: 917504, end: 917631 }, { begin: 6400, end: 6479 }, { begin: 6480, end: 6527 }, { begin: 6528, end: 6623 }, { begin: 6656, end: 6687 }, { begin: 11264, end: 11359 }, { begin: 11568, end: 11647 }, { begin: 19904, end: 19967 }, { begin: 43008, end: 43055 }, { begin: 65536, end: 65663 }, { begin: 65856, end: 65935 }, { begin: 66432, end: 66463 }, { begin: 66464, end: 66527 }, { begin: 66640, end: 66687 }, { begin: 66688, end: 66735 }, { begin: 67584, end: 67647 }, { begin: 68096, end: 68191 }, { begin: 119552, end: 119647 }, { begin: 73728, end: 74751 }, { begin: 119648, end: 119679 }, { begin: 7040, end: 7103 }, { begin: 7168, end: 7247 }, { begin: 7248, end: 7295 }, { begin: 43136, end: 43231 }, { begin: 43264, end: 43311 }, { begin: 43312, end: 43359 }, { begin: 43520, end: 43615 }, { begin: 65936, end: 65999 }, { begin: 66000, end: 66047 }, { begin: 66208, end: 66271 }, { begin: 127024, end: 127135 }];
    function Io(t) {
      for (var e = 0;e < Wr.length; e += 1) {
        var r = Wr[e];
        if (t >= r.begin && t < r.end)
          return e;
      }
      return -1;
    }
    function Uo(t, e) {
      var r = {}, n = new Fo.Parser(t, e);
      r.version = n.parseUShort(), r.xAvgCharWidth = n.parseShort(), r.usWeightClass = n.parseUShort(), r.usWidthClass = n.parseUShort(), r.fsType = n.parseUShort(), r.ySubscriptXSize = n.parseShort(), r.ySubscriptYSize = n.parseShort(), r.ySubscriptXOffset = n.parseShort(), r.ySubscriptYOffset = n.parseShort(), r.ySuperscriptXSize = n.parseShort(), r.ySuperscriptYSize = n.parseShort(), r.ySuperscriptXOffset = n.parseShort(), r.ySuperscriptYOffset = n.parseShort(), r.yStrikeoutSize = n.parseShort(), r.yStrikeoutPosition = n.parseShort(), r.sFamilyClass = n.parseShort(), r.panose = [];
      for (var a = 0;a < 10; a++)
        r.panose[a] = n.parseByte();
      return r.ulUnicodeRange1 = n.parseULong(), r.ulUnicodeRange2 = n.parseULong(), r.ulUnicodeRange3 = n.parseULong(), r.ulUnicodeRange4 = n.parseULong(), r.achVendID = String.fromCharCode(n.parseByte(), n.parseByte(), n.parseByte(), n.parseByte()), r.fsSelection = n.parseUShort(), r.usFirstCharIndex = n.parseUShort(), r.usLastCharIndex = n.parseUShort(), r.sTypoAscender = n.parseShort(), r.sTypoDescender = n.parseShort(), r.sTypoLineGap = n.parseShort(), r.usWinAscent = n.parseUShort(), r.usWinDescent = n.parseUShort(), r.version >= 1 && (r.ulCodePageRange1 = n.parseULong(), r.ulCodePageRange2 = n.parseULong()), r.version >= 2 && (r.sxHeight = n.parseShort(), r.sCapHeight = n.parseShort(), r.usDefaultChar = n.parseUShort(), r.usBreakChar = n.parseUShort(), r.usMaxContent = n.parseUShort()), r;
    }
    function _o(t) {
      return new ko.Table("OS/2", [{ name: "version", type: "USHORT", value: 3 }, { name: "xAvgCharWidth", type: "SHORT", value: 0 }, { name: "usWeightClass", type: "USHORT", value: 0 }, { name: "usWidthClass", type: "USHORT", value: 0 }, { name: "fsType", type: "USHORT", value: 0 }, { name: "ySubscriptXSize", type: "SHORT", value: 650 }, { name: "ySubscriptYSize", type: "SHORT", value: 699 }, { name: "ySubscriptXOffset", type: "SHORT", value: 0 }, { name: "ySubscriptYOffset", type: "SHORT", value: 140 }, { name: "ySuperscriptXSize", type: "SHORT", value: 650 }, { name: "ySuperscriptYSize", type: "SHORT", value: 699 }, { name: "ySuperscriptXOffset", type: "SHORT", value: 0 }, { name: "ySuperscriptYOffset", type: "SHORT", value: 479 }, { name: "yStrikeoutSize", type: "SHORT", value: 49 }, { name: "yStrikeoutPosition", type: "SHORT", value: 258 }, { name: "sFamilyClass", type: "SHORT", value: 0 }, { name: "bFamilyType", type: "BYTE", value: 0 }, { name: "bSerifStyle", type: "BYTE", value: 0 }, { name: "bWeight", type: "BYTE", value: 0 }, { name: "bProportion", type: "BYTE", value: 0 }, { name: "bContrast", type: "BYTE", value: 0 }, { name: "bStrokeVariation", type: "BYTE", value: 0 }, { name: "bArmStyle", type: "BYTE", value: 0 }, { name: "bLetterform", type: "BYTE", value: 0 }, { name: "bMidline", type: "BYTE", value: 0 }, { name: "bXHeight", type: "BYTE", value: 0 }, { name: "ulUnicodeRange1", type: "ULONG", value: 0 }, { name: "ulUnicodeRange2", type: "ULONG", value: 0 }, { name: "ulUnicodeRange3", type: "ULONG", value: 0 }, { name: "ulUnicodeRange4", type: "ULONG", value: 0 }, { name: "achVendID", type: "CHARARRAY", value: "XXXX" }, { name: "fsSelection", type: "USHORT", value: 0 }, { name: "usFirstCharIndex", type: "USHORT", value: 0 }, { name: "usLastCharIndex", type: "USHORT", value: 0 }, { name: "sTypoAscender", type: "SHORT", value: 0 }, { name: "sTypoDescender", type: "SHORT", value: 0 }, { name: "sTypoLineGap", type: "SHORT", value: 0 }, { name: "usWinAscent", type: "USHORT", value: 0 }, { name: "usWinDescent", type: "USHORT", value: 0 }, { name: "ulCodePageRange1", type: "ULONG", value: 0 }, { name: "ulCodePageRange2", type: "ULONG", value: 0 }, { name: "sxHeight", type: "SHORT", value: 0 }, { name: "sCapHeight", type: "SHORT", value: 0 }, { name: "usDefaultChar", type: "USHORT", value: 0 }, { name: "usBreakChar", type: "USHORT", value: 0 }, { name: "usMaxContext", type: "USHORT", value: 0 }], t);
    }
    qt.unicodeRanges = Wr;
    qt.getUnicodeRange = Io;
    qt.parse = Uo;
    qt.make = _o;
  });
  var Xr = L((Lr) => {
    var ua = At(), Po = Be(), Bo = Ge();
    function So(t, e) {
      var r = {}, n = new Po.Parser(t, e), a;
      switch (r.version = n.parseVersion(), r.italicAngle = n.parseFixed(), r.underlinePosition = n.parseShort(), r.underlineThickness = n.parseShort(), r.isFixedPitch = n.parseULong(), r.minMemType42 = n.parseULong(), r.maxMemType42 = n.parseULong(), r.minMemType1 = n.parseULong(), r.maxMemType1 = n.parseULong(), r.version) {
        case 1:
          r.names = ua.standardNames.slice();
          break;
        case 2:
          for (r.numberOfGlyphs = n.parseUShort(), r.glyphNameIndex = new Array(r.numberOfGlyphs), a = 0;a < r.numberOfGlyphs; a++)
            r.glyphNameIndex[a] = n.parseUShort();
          for (r.names = [], a = 0;a < r.numberOfGlyphs; a++)
            if (r.glyphNameIndex[a] >= ua.standardNames.length) {
              var i2 = n.parseChar();
              r.names.push(n.parseString(i2));
            }
          break;
        case 2.5:
          for (r.numberOfGlyphs = n.parseUShort(), r.offset = new Array(r.numberOfGlyphs), a = 0;a < r.numberOfGlyphs; a++)
            r.offset[a] = n.parseChar();
          break;
      }
      return r;
    }
    function Eo() {
      return new Bo.Table("post", [{ name: "version", type: "FIXED", value: 196608 }, { name: "italicAngle", type: "FIXED", value: 0 }, { name: "underlinePosition", type: "FWORD", value: 0 }, { name: "underlineThickness", type: "FWORD", value: 0 }, { name: "isFixedPitch", type: "ULONG", value: 0 }, { name: "minMemType42", type: "ULONG", value: 0 }, { name: "maxMemType42", type: "ULONG", value: 0 }, { name: "minMemType1", type: "ULONG", value: 0 }, { name: "maxMemType1", type: "ULONG", value: 0 }]);
    }
    Lr.parse = So;
    Lr.make = Eo;
  });
  var ba = L((er) => {
    var ca = Me(), va = Ge(), Co = br(), Ao = kr(), Go = Ur(), qo = Pr(), Ho = Sr(), Ro = Cr(), Mo = Gr(), Yo = Yr(), pa = Vr(), Wo = Xr();
    function da(t) {
      return Math.log(t) / Math.log(2) | 0;
    }
    function zr(t) {
      for (;t.length % 4 !== 0; )
        t.push(0);
      for (var e = 0, r = 0;r < t.length; r += 4)
        e += (t[r] << 24) + (t[r + 1] << 16) + (t[r + 2] << 8) + t[r + 3];
      return e %= Math.pow(2, 32), e;
    }
    function ma(t, e, r, n) {
      return new va.Table("Table Record", [{ name: "tag", type: "TAG", value: t !== undefined ? t : "" }, { name: "checkSum", type: "ULONG", value: e !== undefined ? e : 0 }, { name: "offset", type: "ULONG", value: r !== undefined ? r : 0 }, { name: "length", type: "ULONG", value: n !== undefined ? n : 0 }]);
    }
    function ga(t) {
      var e = new va.Table("sfnt", [{ name: "version", type: "TAG", value: "OTTO" }, { name: "numTables", type: "USHORT", value: 0 }, { name: "searchRange", type: "USHORT", value: 0 }, { name: "entrySelector", type: "USHORT", value: 0 }, { name: "rangeShift", type: "USHORT", value: 0 }]);
      e.tables = t, e.numTables = t.length;
      var r = Math.pow(2, da(e.numTables));
      e.searchRange = 16 * r, e.entrySelector = da(r), e.rangeShift = e.numTables * 16 - e.searchRange;
      for (var n = [], a = [], i2 = e.sizeOf() + ma().sizeOf() * e.numTables;i2 % 4 !== 0; )
        i2 += 1, a.push({ name: "padding", type: "BYTE", value: 0 });
      for (var s = 0;s < t.length; s += 1) {
        var l = t[s];
        ca.argument(l.tableName.length === 4, "Table name" + l.tableName + " is invalid.");
        var o = l.sizeOf(), h = ma(l.tableName, zr(l.encode()), i2, o);
        for (n.push({ name: h.tag + " Table Record", type: "TABLE", value: h }), a.push({ name: l.tableName + " table", type: "TABLE", value: l }), i2 += o, ca.argument(!isNaN(i2), "Something went wrong calculating the offset.");i2 % 4 !== 0; )
          i2 += 1, a.push({ name: "padding", type: "BYTE", value: 0 });
      }
      return n.sort(function(u, c) {
        return u.value.tag > c.value.tag ? 1 : -1;
      }), e.fields = e.fields.concat(n), e.fields = e.fields.concat(a), e;
    }
    function xa(t, e, r) {
      for (var n = 0;n < e.length; n += 1) {
        var a = t.charToGlyphIndex(e[n]);
        if (a > 0) {
          var i2 = t.glyphs.get(a);
          return i2.getMetrics();
        }
      }
      return r;
    }
    function Vo(t) {
      for (var e = 0, r = 0;r < t.length; r += 1)
        e += t[r];
      return e / t.length;
    }
    function Lo(t) {
      for (var e = [], r = [], n = [], a = [], i2 = [], s = [], l = [], o, h = 0, u = 0, c = 0, p = 0, d = 0, m = 0;m < t.glyphs.length; m += 1) {
        var F = t.glyphs.get(m), b = F.unicode | 0;
        (o > b || o === null) && (o = b), h < b && (h = b);
        var I = pa.getUnicodeRange(b);
        if (I < 32)
          u |= 1 << I;
        else if (I < 64)
          c |= 1 << I - 32;
        else if (I < 96)
          p |= 1 << I - 64;
        else if (I < 123)
          d |= 1 << I - 96;
        else
          throw new Error("Unicode ranges bits > 123 are reserved for internal usage");
        if (F.name !== ".notdef") {
          var w = F.getMetrics();
          e.push(w.xMin), r.push(w.yMin), n.push(w.xMax), a.push(w.yMax), s.push(w.leftSideBearing), l.push(w.rightSideBearing), i2.push(F.advanceWidth);
        }
      }
      var x2 = { xMin: Math.min.apply(null, e), yMin: Math.min.apply(null, r), xMax: Math.max.apply(null, n), yMax: Math.max.apply(null, a), advanceWidthMax: Math.max.apply(null, i2), advanceWidthAvg: Vo(i2), minLeftSideBearing: Math.min.apply(null, s), maxLeftSideBearing: Math.max.apply(null, s), minRightSideBearing: Math.min.apply(null, l) };
      x2.ascender = t.ascender !== undefined ? t.ascender : x2.yMax, x2.descender = t.descender !== undefined ? t.descender : x2.yMin;
      var U = Go.make({ unitsPerEm: t.unitsPerEm, xMin: x2.xMin, yMin: x2.yMin, xMax: x2.xMax, yMax: x2.yMax }), y = qo.make({ ascender: x2.ascender, descender: x2.descender, advanceWidthMax: x2.advanceWidthMax, minLeftSideBearing: x2.minLeftSideBearing, minRightSideBearing: x2.minRightSideBearing, xMaxExtent: x2.maxLeftSideBearing + (x2.xMax - x2.xMin), numberOfHMetrics: t.glyphs.length }), W = Mo.make(t.glyphs.length), T = pa.make({ xAvgCharWidth: Math.round(x2.advanceWidthAvg), usWeightClass: 500, usWidthClass: 5, usFirstCharIndex: o, usLastCharIndex: h, ulUnicodeRange1: u, ulUnicodeRange2: c, ulUnicodeRange3: p, ulUnicodeRange4: d, sTypoAscender: x2.ascender, sTypoDescender: x2.descender, sTypoLineGap: 0, usWinAscent: x2.ascender, usWinDescent: -x2.descender, sxHeight: xa(t, "xyvw", { yMax: 0 }).yMax, sCapHeight: xa(t, "HIKLEFJMNTZBDPRAGOQSUVWXY", x2).yMax, usBreakChar: t.hasChar(" ") ? 32 : 0 }), R = Ho.make(t.glyphs), S = Co.make(t.glyphs), E = t.getEnglishName("fontFamily"), G = t.getEnglishName("fontSubfamily"), V = E + " " + G, C = t.getEnglishName("postScriptName");
      C || (C = E.replace(/\s/g, "") + "-" + G);
      var z = {};
      for (var P in t.names)
        z[P] = t.names[P];
      z.uniqueID || (z.uniqueID = { en: t.getEnglishName("manufacturer") + ":" + V }), z.postScriptName || (z.postScriptName = { en: C }), z.preferredFamily || (z.preferredFamily = t.names.fontFamily), z.preferredSubfamily || (z.preferredSubfamily = t.names.fontSubfamily);
      var H = [], de = Yo.make(z, H), le = H.length > 0 ? Ro.make(H) : undefined, te2 = Wo.make(), Fe = Ao.make(t.glyphs, { version: t.getEnglishName("version"), fullName: V, familyName: E, weightName: G, postScriptName: C, unitsPerEm: t.unitsPerEm }), ie = [U, y, W, T, de, S, te2, Fe, R];
      le && ie.push(le);
      var ee = ga(ie), J = ee.encode(), g = zr(J), M = ee.fields, ue = false;
      for (m = 0;m < M.length; m += 1)
        if (M[m].name === "head table") {
          M[m].value.checkSumAdjustment = 2981146554 - g, ue = true;
          break;
        }
      if (!ue)
        throw new Error("Could not find head table with checkSum to adjust.");
      return ee;
    }
    er.computeCheckSum = zr;
    er.make = ga;
    er.fontToTable = Lo;
  });
  var Ta = L((ya) => {
    var Xo = pt(), zo = ba(), No = At(), Zo = Dt();
    function Ie(t) {
      t = t || {}, this.names = { fontFamily: { en: t.familyName || " " }, fontSubfamily: { en: t.styleName || " " }, designer: { en: t.designer || " " }, designerURL: { en: t.designerURL || " " }, manufacturer: { en: t.manufacturer || " " }, manufacturerURL: { en: t.manufacturerURL || " " }, license: { en: t.license || " " }, licenseURL: { en: t.licenseURL || " " }, version: { en: t.version || "Version 0.1" }, description: { en: t.description || " " }, copyright: { en: t.copyright || " " }, trademark: { en: t.trademark || " " } }, this.unitsPerEm = t.unitsPerEm || 1000, this.ascender = t.ascender, this.descender = t.descender, this.supported = true, this.glyphs = new Zo.GlyphSet(this, t.glyphs || []), this.encoding = new No.DefaultEncoding(this), this.tables = {};
    }
    Ie.prototype.hasChar = function(t) {
      return this.encoding.charToGlyphIndex(t) !== null;
    };
    Ie.prototype.charToGlyphIndex = function(t) {
      return this.encoding.charToGlyphIndex(t);
    };
    Ie.prototype.charToGlyph = function(t) {
      var e = this.charToGlyphIndex(t), r = this.glyphs.get(e);
      return r || (r = this.glyphs.get(0)), r;
    };
    Ie.prototype.stringToGlyphs = function(t) {
      for (var e = [], r = 0;r < t.length; r += 1) {
        var n = t[r];
        e.push(this.charToGlyph(n));
      }
      return e;
    };
    Ie.prototype.nameToGlyphIndex = function(t) {
      return this.glyphNames.nameToGlyphIndex(t);
    };
    Ie.prototype.nameToGlyph = function(t) {
      var e = this.nametoGlyphIndex(t), r = this.glyphs.get(e);
      return r || (r = this.glyphs.get(0)), r;
    };
    Ie.prototype.glyphIndexToName = function(t) {
      return this.glyphNames.glyphIndexToName ? this.glyphNames.glyphIndexToName(t) : "";
    };
    Ie.prototype.getKerningValue = function(t, e) {
      t = t.index || t, e = e.index || e;
      var r = this.getGposKerningValue;
      return r ? r(t, e) : this.kerningPairs[t + "," + e] || 0;
    };
    Ie.prototype.forEachGlyph = function(t, e, r, n, a, i2) {
      e = e !== undefined ? e : 0, r = r !== undefined ? r : 0, n = n !== undefined ? n : 72, a = a || {};
      for (var s = a.kerning === undefined ? true : a.kerning, l = 1 / this.unitsPerEm * n, o = this.stringToGlyphs(t), h = 0;h < o.length; h += 1) {
        var u = o[h];
        if (i2(u, e, r, n, a), u.advanceWidth && (e += u.advanceWidth * l), s && h < o.length - 1) {
          var c = this.getKerningValue(u, o[h + 1]);
          e += c * l;
        }
      }
    };
    Ie.prototype.getPath = function(t, e, r, n, a) {
      var i2 = new Xo.Path;
      return this.forEachGlyph(t, e, r, n, a, function(s, l, o, h) {
        var u = s.getPath(l, o, h);
        i2.extend(u);
      }), i2;
    };
    Ie.prototype.draw = function(t, e, r, n, a, i2) {
      this.getPath(e, r, n, a, i2).draw(t);
    };
    Ie.prototype.drawPoints = function(t, e, r, n, a, i2) {
      this.forEachGlyph(e, r, n, a, i2, function(s, l, o, h) {
        s.drawPoints(t, l, o, h);
      });
    };
    Ie.prototype.drawMetrics = function(t, e, r, n, a, i2) {
      this.forEachGlyph(e, r, n, a, i2, function(s, l, o, h) {
        s.drawMetrics(t, l, o, h);
      });
    };
    Ie.prototype.getEnglishName = function(t) {
      var e = this.names[t];
      if (e)
        return e.en;
    };
    Ie.prototype.validate = function() {
      var t = [], e = this;
      function r(a, i2) {
        a || t.push(i2);
      }
      function n(a) {
        var i2 = e.getEnglishName(a);
        r(i2 && i2.trim().length > 0, "No English " + a + " specified.");
      }
      n("fontFamily"), n("weightName"), n("manufacturer"), n("copyright"), n("version"), r(this.unitsPerEm > 0, "No unitsPerEm specified.");
    };
    Ie.prototype.toTables = function() {
      return zo.fontToTable(this);
    };
    Ie.prototype.toBuffer = function() {
      for (var t = this.toTables(), e = t.encode(), r = new ArrayBuffer(e.length), n = new Uint8Array(r), a = 0;a < e.length; a++)
        n[a] = e[a];
      return r;
    };
    Ie.prototype.download = function() {
      var t = this.getEnglishName("fontFamily"), e = this.getEnglishName("fontSubfamily"), r = t.replace(/\s/g, "") + "-" + e + ".otf", n = this.toBuffer();
      window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem, window.requestFileSystem(window.TEMPORARY, n.byteLength, function(a) {
        a.root.getFile(r, { create: true }, function(i2) {
          i2.createWriter(function(s) {
            var l = new DataView(n), o = new Blob([l], { type: "font/opentype" });
            s.write(o), s.addEventListener("writeend", function() {
              location.href = i2.toURL();
            }, false);
          });
        });
      }, function(a) {
        throw a;
      });
    };
    ya.Font = Ie;
  });
  var Fa = L((jr) => {
    var jo = Me(), Nr = Be(), Zr = Ge();
    function wa(t, e) {
      var r = JSON.stringify(t), n = 256;
      for (var a in e) {
        var i2 = parseInt(a);
        if (!(!i2 || i2 < 256)) {
          if (JSON.stringify(e[a]) === r)
            return i2;
          n <= i2 && (n = i2 + 1);
        }
      }
      return e[n] = t, n;
    }
    function Qo(t, e) {
      var r = wa(t.name, e);
      return new Zr.Table("fvarAxis", [{ name: "tag", type: "TAG", value: t.tag }, { name: "minValue", type: "FIXED", value: t.minValue << 16 }, { name: "defaultValue", type: "FIXED", value: t.defaultValue << 16 }, { name: "maxValue", type: "FIXED", value: t.maxValue << 16 }, { name: "flags", type: "USHORT", value: 0 }, { name: "nameID", type: "USHORT", value: r }]);
    }
    function Ko(t, e, r) {
      var n = {}, a = new Nr.Parser(t, e);
      return n.tag = a.parseTag(), n.minValue = a.parseFixed(), n.defaultValue = a.parseFixed(), n.maxValue = a.parseFixed(), a.skip("uShort", 1), n.name = r[a.parseUShort()] || {}, n;
    }
    function Jo(t, e, r) {
      for (var n = wa(t.name, r), a = [{ name: "nameID", type: "USHORT", value: n }, { name: "flags", type: "USHORT", value: 0 }], i2 = 0;i2 < e.length; ++i2) {
        var s = e[i2].tag;
        a.push({ name: "axis " + s, type: "FIXED", value: t.coordinates[s] << 16 });
      }
      return new Zr.Table("fvarInstance", a);
    }
    function $o(t, e, r, n) {
      var a = {}, i2 = new Nr.Parser(t, e);
      a.name = n[i2.parseUShort()] || {}, i2.skip("uShort", 1), a.coordinates = {};
      for (var s = 0;s < r.length; ++s)
        a.coordinates[r[s].tag] = i2.parseFixed();
      return a;
    }
    function Do(t, e) {
      var r = new Zr.Table("fvar", [{ name: "version", type: "ULONG", value: 65536 }, { name: "offsetToData", type: "USHORT", value: 0 }, { name: "countSizePairs", type: "USHORT", value: 2 }, { name: "axisCount", type: "USHORT", value: t.axes.length }, { name: "axisSize", type: "USHORT", value: 20 }, { name: "instanceCount", type: "USHORT", value: t.instances.length }, { name: "instanceSize", type: "USHORT", value: 4 + t.axes.length * 4 }]);
      r.offsetToData = r.sizeOf();
      for (var n = 0;n < t.axes.length; n++)
        r.fields.push({ name: "axis " + n, type: "TABLE", value: Qo(t.axes[n], e) });
      for (var a = 0;a < t.instances.length; a++)
        r.fields.push({ name: "instance " + a, type: "TABLE", value: Jo(t.instances[a], t.axes, e) });
      return r;
    }
    function Oo(t, e, r) {
      var n = new Nr.Parser(t, e), a = n.parseULong();
      jo.argument(a === 65536, "Unsupported fvar table version.");
      var i2 = n.parseOffset16();
      n.skip("uShort", 1);
      for (var s = n.parseUShort(), l = n.parseUShort(), o = n.parseUShort(), h = n.parseUShort(), u = [], c = 0;c < s; c++)
        u.push(Ko(t, e + i2 + c * l, r));
      for (var p = [], d = e + i2 + s * l, m = 0;m < o; m++)
        p.push($o(t, d + m * h, u, r));
      return { axes: u, instances: p };
    }
    jr.make = Do;
    jr.parse = Oo;
  });
  var _a2 = L((Ua) => {
    var Ia = Me(), Qr = Dt(), el = Be(), tl = pt();
    function ka(t, e, r, n, a) {
      var i2;
      return (e & n) > 0 ? (i2 = t.parseByte(), e & a || (i2 = -i2), i2 = r + i2) : (e & a) > 0 ? i2 = r : i2 = r + t.parseShort(), i2;
    }
    function rl(t, e, r) {
      var n = new el.Parser(e, r);
      t.numberOfContours = n.parseShort(), t.xMin = n.parseShort(), t.yMin = n.parseShort(), t.xMax = n.parseShort(), t.yMax = n.parseShort();
      var a, i2;
      if (t.numberOfContours > 0) {
        var s, l = t.endPointIndices = [];
        for (s = 0;s < t.numberOfContours; s += 1)
          l.push(n.parseUShort());
        for (t.instructionLength = n.parseUShort(), t.instructions = [], s = 0;s < t.instructionLength; s += 1)
          t.instructions.push(n.parseByte());
        var o = l[l.length - 1] + 1;
        for (a = [], s = 0;s < o; s += 1)
          if (i2 = n.parseByte(), a.push(i2), (i2 & 8) > 0)
            for (var h = n.parseByte(), u = 0;u < h; u += 1)
              a.push(i2), s += 1;
        if (Ia.argument(a.length === o, "Bad flags."), l.length > 0) {
          var c = [], p;
          if (o > 0) {
            for (s = 0;s < o; s += 1)
              i2 = a[s], p = {}, p.onCurve = !!(i2 & 1), p.lastPointOfContour = l.indexOf(s) >= 0, c.push(p);
            var d = 0;
            for (s = 0;s < o; s += 1)
              i2 = a[s], p = c[s], p.x = ka(n, i2, d, 2, 16), d = p.x;
            var m = 0;
            for (s = 0;s < o; s += 1)
              i2 = a[s], p = c[s], p.y = ka(n, i2, m, 4, 32), m = p.y;
          }
          t.points = c;
        } else
          t.points = [];
      } else if (t.numberOfContours === 0)
        t.points = [];
      else {
        t.isComposite = true, t.points = [], t.components = [];
        for (var F = true;F; ) {
          a = n.parseUShort();
          var b = { glyphIndex: n.parseUShort(), xScale: 1, scale01: 0, scale10: 0, yScale: 1, dx: 0, dy: 0 };
          (a & 1) > 0 ? (b.dx = n.parseShort(), b.dy = n.parseShort()) : (b.dx = n.parseChar(), b.dy = n.parseChar()), (a & 8) > 0 ? b.xScale = b.yScale = n.parseF2Dot14() : (a & 64) > 0 ? (b.xScale = n.parseF2Dot14(), b.yScale = n.parseF2Dot14()) : (a & 128) > 0 && (b.xScale = n.parseF2Dot14(), b.scale01 = n.parseF2Dot14(), b.scale10 = n.parseF2Dot14(), b.yScale = n.parseF2Dot14()), t.components.push(b), F = !!(a & 32);
        }
      }
    }
    function nl(t, e) {
      for (var r = [], n = 0;n < t.length; n += 1) {
        var a = t[n], i2 = { x: e.xScale * a.x + e.scale01 * a.y + e.dx, y: e.scale10 * a.x + e.yScale * a.y + e.dy, onCurve: a.onCurve, lastPointOfContour: a.lastPointOfContour };
        r.push(i2);
      }
      return r;
    }
    function al(t) {
      for (var e = [], r = [], n = 0;n < t.length; n += 1) {
        var a = t[n];
        r.push(a), a.lastPointOfContour && (e.push(r), r = []);
      }
      return Ia.argument(r.length === 0, "There are still points left in the current contour."), e;
    }
    function il(t) {
      var e = new tl.Path;
      if (!t)
        return e;
      for (var r = al(t), n = 0;n < r.length; n += 1) {
        var a = r[n], i2 = a[0], s = a[a.length - 1], l, o;
        i2.onCurve ? (l = null, o = true) : (s.onCurve ? i2 = s : i2 = { x: (i2.x + s.x) / 2, y: (i2.y + s.y) / 2 }, l = i2, o = false), e.moveTo(i2.x, i2.y);
        for (var h = o ? 1 : 0;h < a.length; h += 1) {
          var u = a[h], c = h === 0 ? i2 : a[h - 1];
          if (c.onCurve && u.onCurve)
            e.lineTo(u.x, u.y);
          else if (c.onCurve && !u.onCurve)
            l = u;
          else if (!c.onCurve && !u.onCurve) {
            var p = { x: (c.x + u.x) / 2, y: (c.y + u.y) / 2 };
            e.quadraticCurveTo(c.x, c.y, p.x, p.y), l = u;
          } else if (!c.onCurve && u.onCurve)
            e.quadraticCurveTo(l.x, l.y, u.x, u.y), l = null;
          else
            throw new Error("Invalid state.");
        }
        i2 !== s && (l ? e.quadraticCurveTo(l.x, l.y, i2.x, i2.y) : e.lineTo(i2.x, i2.y));
      }
      return e.closePath(), e;
    }
    function sl(t, e) {
      if (e.isComposite)
        for (var r = 0;r < e.components.length; r += 1) {
          var n = e.components[r], a = t.get(n.glyphIndex);
          if (a.getPath(), a.points) {
            var i2 = nl(a.points, n);
            e.points = e.points.concat(i2);
          }
        }
      return il(e.points);
    }
    function ol(t, e, r, n) {
      var a = new Qr.GlyphSet(n), i2;
      for (i2 = 0;i2 < r.length - 1; i2 += 1) {
        var s = r[i2], l = r[i2 + 1];
        s !== l ? a.push(i2, Qr.ttfGlyphLoader(n, i2, rl, t, e + s, sl)) : a.push(i2, Qr.glyphLoader(n, i2));
      }
      return a;
    }
    Ua.parse = ol;
  });
  var Ea = L((Sa) => {
    var ll = Me(), mt = Be();
    function Pa(t, e) {
      for (var r = new mt.Parser(t, e), n = r.parseUShort(), a = [], i2 = 0;i2 < n; i2++)
        a[r.parseTag()] = { offset: r.parseUShort() };
      return a;
    }
    function fl2(t, e) {
      var r = new mt.Parser(t, e), n = r.parseUShort(), a = r.parseUShort();
      if (n === 1)
        return r.parseUShortList(a);
      if (n === 2) {
        for (var i2 = [];a--; )
          for (var s = r.parseUShort(), l = r.parseUShort(), o = r.parseUShort(), h = s;h <= l; h++)
            i2[o++] = h;
        return i2;
      }
    }
    function Ba(t, e) {
      var r = new mt.Parser(t, e), n = r.parseUShort();
      if (n === 1) {
        var a = r.parseUShort(), i2 = r.parseUShort(), s = r.parseUShortList(i2);
        return function(p) {
          return s[p - a] || 0;
        };
      } else if (n === 2) {
        for (var l = r.parseUShort(), o = [], h = [], u = [], c = 0;c < l; c++)
          o[c] = r.parseUShort(), h[c] = r.parseUShort(), u[c] = r.parseUShort();
        return function(p) {
          for (var d = 0, m = o.length - 1;d < m; ) {
            var F = d + m + 1 >> 1;
            p < o[F] ? m = F - 1 : d = F;
          }
          return o[d] <= p && p <= h[d] && u[d] || 0;
        };
      }
    }
    function hl(t, e) {
      var r = new mt.Parser(t, e), n = r.parseUShort(), a = r.parseUShort(), i2 = fl2(t, e + a), s = r.parseUShort(), l = r.parseUShort(), o, h;
      if (!(s !== 4 || l !== 0)) {
        var u = {};
        if (n === 1) {
          for (var c = r.parseUShort(), p = [], d = r.parseOffset16List(c), m = 0;m < c; m++) {
            var F = d[m], b = u[F];
            if (!b) {
              b = {}, r.relativeOffset = F;
              for (var I = r.parseUShort();I--; ) {
                var w = r.parseUShort();
                s && (o = r.parseShort()), l && (h = r.parseShort()), b[w] = o;
              }
            }
            p[i2[m]] = b;
          }
          return function(z, P) {
            var H = p[z];
            if (H)
              return H[P];
          };
        } else if (n === 2) {
          for (var x2 = r.parseUShort(), U = r.parseUShort(), y = r.parseUShort(), W = r.parseUShort(), T = Ba(t, e + x2), R = Ba(t, e + U), S = [], E = 0;E < y; E++)
            for (var G = S[E] = [], V = 0;V < W; V++)
              s && (o = r.parseShort()), l && (h = r.parseShort()), G[V] = o;
          var C = {};
          for (E = 0;E < i2.length; E++)
            C[i2[E]] = 1;
          return function(z, P) {
            if (C[z]) {
              var H = T(z), de = R(P), le = S[H];
              if (le)
                return le[de];
            }
          };
        }
      }
    }
    function ul(t, e) {
      var r = new mt.Parser(t, e), n = r.parseUShort(), a = r.parseUShort(), i2 = a & 16, s = r.parseUShort(), l = r.parseOffset16List(s), o = { lookupType: n, lookupFlag: a, markFilteringSet: i2 ? r.parseUShort() : -1 };
      if (n === 2) {
        for (var h = [], u = 0;u < s; u++)
          h.push(hl(t, e + l[u]));
        o.getKerningValue = function(c, p) {
          for (var d = h.length;d--; ) {
            var m = h[d](c, p);
            if (m !== undefined)
              return m;
          }
          return 0;
        };
      }
      return o;
    }
    function cl(t, e, r) {
      var n = new mt.Parser(t, e), a = n.parseFixed();
      ll.argument(a === 1, "Unsupported GPOS table version."), Pa(t, e + n.parseUShort()), Pa(t, e + n.parseUShort());
      var i2 = n.parseUShort();
      n.relativeOffset = i2;
      for (var s = n.parseUShort(), l = n.parseOffset16List(s), o = e + i2, h = 0;h < s; h++) {
        var u = ul(t, o + l[h]);
        u.lookupType === 2 && !r.getGposKerningValue && (r.getGposKerningValue = u.getKerningValue);
      }
    }
    Sa.parse = cl;
  });
  var Ga = L((Aa) => {
    var Ca = Me(), pl = Be();
    function dl(t, e) {
      var r = {}, n = new pl.Parser(t, e), a = n.parseUShort();
      Ca.argument(a === 0, "Unsupported kern table version."), n.skip("uShort", 1);
      var i2 = n.parseUShort();
      Ca.argument(i2 === 0, "Unsupported kern sub-table version."), n.skip("uShort", 2);
      var s = n.parseUShort();
      n.skip("uShort", 3);
      for (var l = 0;l < s; l += 1) {
        var o = n.parseUShort(), h = n.parseUShort(), u = n.parseShort();
        r[o + "," + h] = u;
      }
      return r;
    }
    Aa.parse = dl;
  });
  var Ha = L((qa) => {
    var ml = Be();
    function xl(t, e, r, n) {
      for (var a = new ml.Parser(t, e), i2 = n ? a.parseUShort : a.parseULong, s = [], l = 0;l < r + 1; l += 1) {
        var o = i2.call(a);
        n && (o *= 2), s.push(o);
      }
      return s;
    }
    qa.parse = xl;
  });
  var Ya = L((et2) => {
    var Kr = At(), Ra = Ta(), vl = yr(), xt = Be(), gl = pt(), bl = br(), yl = kr(), Tl = Fa(), wl = _a2(), Fl = Ea(), kl = Ur(), Il = Pr(), Ul = Sr(), _l = Ga(), Pl = Cr(), Bl = Ha(), Sl = Gr(), El = Yr(), Cl = Vr(), Al = Xr();
    function Ma(t) {
      for (var e = new ArrayBuffer(t.length), r = new Uint8Array(e), n = 0;n < t.length; n += 1)
        r[n] = t[n];
      return e;
    }
    function Gl(t, e) {
      var r = __require("fs");
      r.readFile(t, function(n, a) {
        if (n)
          return e(n.message);
        e(null, Ma(a));
      });
    }
    function ql(t, e) {
      var r = new XMLHttpRequest;
      r.open("get", t, true), r.responseType = "arraybuffer", r.onload = function() {
        return r.status !== 200 ? e("Font could not be loaded: " + r.statusText) : e(null, r.response);
      }, r.send();
    }
    function Jr(t) {
      var e, r, n, a, i2, s, l, o, h, u, c = new Ra.Font, p = new DataView(t, 0), d = xt.getFixed(p, 0);
      if (d === 1)
        c.outlinesFormat = "truetype";
      else if (d = xt.getTag(p, 0), d === "OTTO")
        c.outlinesFormat = "cff";
      else
        throw new Error("Unsupported OpenType version " + d);
      for (var m = xt.getUShort(p, 4), F = 12, b = 0;b < m; b += 1) {
        var I = xt.getTag(p, F), w = xt.getULong(p, F + 8);
        switch (I) {
          case "cmap":
            c.tables.cmap = bl.parse(p, w), c.encoding = new Kr.CmapEncoding(c.tables.cmap);
            break;
          case "fvar":
            a = w;
            break;
          case "head":
            c.tables.head = kl.parse(p, w), c.unitsPerEm = c.tables.head.unitsPerEm, e = c.tables.head.indexToLocFormat;
            break;
          case "hhea":
            c.tables.hhea = Il.parse(p, w), c.ascender = c.tables.hhea.ascender, c.descender = c.tables.hhea.descender, c.numberOfHMetrics = c.tables.hhea.numberOfHMetrics;
            break;
          case "hmtx":
            l = w;
            break;
          case "ltag":
            r = Pl.parse(p, w);
            break;
          case "maxp":
            c.tables.maxp = Sl.parse(p, w), c.numGlyphs = c.tables.maxp.numGlyphs;
            break;
          case "name":
            u = w;
            break;
          case "OS/2":
            c.tables.os2 = Cl.parse(p, w);
            break;
          case "post":
            c.tables.post = Al.parse(p, w), c.glyphNames = new Kr.GlyphNames(c.tables.post);
            break;
          case "glyf":
            i2 = w;
            break;
          case "loca":
            h = w;
            break;
          case "CFF ":
            n = w;
            break;
          case "kern":
            o = w;
            break;
          case "GPOS":
            s = w;
            break;
        }
        F += 16;
      }
      if (c.tables.name = El.parse(p, u, r), c.names = c.tables.name, i2 && h) {
        var x2 = e === 0, U = Bl.parse(p, h, c.numGlyphs, x2);
        c.glyphs = wl.parse(p, i2, U, c);
      } else if (n)
        yl.parse(p, n, c);
      else
        throw new Error("Font doesn't contain TrueType or CFF outlines.");
      return Ul.parse(p, l, c.numberOfHMetrics, c.numGlyphs, c.glyphs), Kr.addGlyphNames(c), o ? c.kerningPairs = _l.parse(p, o) : c.kerningPairs = {}, s && Fl.parse(p, s, c), a && (c.tables.fvar = Tl.parse(p, a, c.names)), c;
    }
    function Hl(t, e) {
      var r = typeof window > "u", n = r ? Gl : ql;
      n(t, function(a, i2) {
        if (a)
          return e(a);
        var s = Jr(i2);
        return e(null, s);
      });
    }
    function Rl(t) {
      var e = __require("fs"), r = e.readFileSync(t);
      return Jr(Ma(r));
    }
    et2._parse = xt;
    et2.Font = Ra.Font;
    et2.Glyph = vl.Glyph;
    et2.Path = gl.Path;
    et2.parse = Jr;
    et2.load = Hl;
    et2.loadSync = Rl;
  });
  var Or = L((Tu, ja) => {
    var Jl = __require("util"), Za = __require("stream"), ze = ja.exports = function() {
      Za.call(this), this._buffers = [], this._buffered = 0, this._reads = [], this._paused = false, this._encoding = "utf8", this.writable = true;
    };
    Jl.inherits(ze, Za);
    ze.prototype.read = function(t, e) {
      this._reads.push({ length: Math.abs(t), allowLess: t < 0, func: e }), process.nextTick(function() {
        this._process(), this._paused && this._reads && this._reads.length > 0 && (this._paused = false, this.emit("drain"));
      }.bind(this));
    };
    ze.prototype.write = function(t, e) {
      if (!this.writable)
        return this.emit("error", new Error("Stream not writable")), false;
      let r;
      return Buffer.isBuffer(t) ? r = t : r = Buffer.from(t, e || this._encoding), this._buffers.push(r), this._buffered += r.length, this._process(), this._reads && this._reads.length === 0 && (this._paused = true), this.writable && !this._paused;
    };
    ze.prototype.end = function(t, e) {
      t && this.write(t, e), this.writable = false, this._buffers && (this._buffers.length === 0 ? this._end() : (this._buffers.push(null), this._process()));
    };
    ze.prototype.destroySoon = ze.prototype.end;
    ze.prototype._end = function() {
      this._reads.length > 0 && this.emit("error", new Error("Unexpected end of input")), this.destroy();
    };
    ze.prototype.destroy = function() {
      this._buffers && (this.writable = false, this._reads = null, this._buffers = null, this.emit("close"));
    };
    ze.prototype._processReadAllowingLess = function(t) {
      this._reads.shift();
      let e = this._buffers[0];
      e.length > t.length ? (this._buffered -= t.length, this._buffers[0] = e.slice(t.length), t.func.call(this, e.slice(0, t.length))) : (this._buffered -= e.length, this._buffers.shift(), t.func.call(this, e));
    };
    ze.prototype._processRead = function(t) {
      this._reads.shift();
      let e = 0, r = 0, n = Buffer.alloc(t.length);
      for (;e < t.length; ) {
        let a = this._buffers[r++], i2 = Math.min(a.length, t.length - e);
        a.copy(n, e, 0, i2), e += i2, i2 !== a.length && (this._buffers[--r] = a.slice(i2));
      }
      r > 0 && this._buffers.splice(0, r), this._buffered -= t.length, t.func.call(this, n);
    };
    ze.prototype._process = function() {
      try {
        for (;this._buffered > 0 && this._reads && this._reads.length > 0; ) {
          let t = this._reads[0];
          if (t.allowLess)
            this._processReadAllowingLess(t);
          else if (this._buffered >= t.length)
            this._processRead(t);
          else
            break;
        }
        this._buffers && !this.writable && this._end();
      } catch (t) {
        this.emit("error", t);
      }
    };
  });
  var tn = L((en) => {
    var tt = [{ x: [0], y: [0] }, { x: [4], y: [0] }, { x: [0, 4], y: [4] }, { x: [2, 6], y: [0, 4] }, { x: [0, 2, 4, 6], y: [2, 6] }, { x: [1, 3, 5, 7], y: [0, 2, 4, 6] }, { x: [0, 1, 2, 3, 4, 5, 6, 7], y: [1, 3, 5, 7] }];
    en.getImagePasses = function(t, e) {
      let r = [], n = t % 8, a = e % 8, i2 = (t - n) / 8, s = (e - a) / 8;
      for (let l = 0;l < tt.length; l++) {
        let o = tt[l], h = i2 * o.x.length, u = s * o.y.length;
        for (let c = 0;c < o.x.length && o.x[c] < n; c++)
          h++;
        for (let c = 0;c < o.y.length && o.y[c] < a; c++)
          u++;
        h > 0 && u > 0 && r.push({ width: h, height: u, index: l });
      }
      return r;
    };
    en.getInterlaceIterator = function(t) {
      return function(e, r, n) {
        let a = e % tt[n].x.length, i2 = (e - a) / tt[n].x.length * 8 + tt[n].x[a], s = r % tt[n].y.length, l = (r - s) / tt[n].y.length * 8 + tt[n].y[s];
        return i2 * 4 + l * t * 4;
      };
    };
  });
  var rn = L((Fu, Qa) => {
    Qa.exports = function(e, r, n) {
      let a = e + r - n, i2 = Math.abs(a - e), s = Math.abs(a - r), l = Math.abs(a - n);
      return i2 <= s && i2 <= l ? e : s <= l ? r : n;
    };
  });
  var nn = L((ku, Ja) => {
    var $l = tn(), Dl = rn();
    function Ka(t, e, r) {
      let n = t * e;
      return r !== 8 && (n = Math.ceil(n / (8 / r))), n;
    }
    var gt = Ja.exports = function(t, e) {
      let { width: r, height: n, interlace: a, bpp: i2, depth: s } = t;
      if (this.read = e.read, this.write = e.write, this.complete = e.complete, this._imageIndex = 0, this._images = [], a) {
        let l = $l.getImagePasses(r, n);
        for (let o = 0;o < l.length; o++)
          this._images.push({ byteWidth: Ka(l[o].width, i2, s), height: l[o].height, lineIndex: 0 });
      } else
        this._images.push({ byteWidth: Ka(r, i2, s), height: n, lineIndex: 0 });
      s === 8 ? this._xComparison = i2 : s === 16 ? this._xComparison = i2 * 2 : this._xComparison = 1;
    };
    gt.prototype.start = function() {
      this.read(this._images[this._imageIndex].byteWidth + 1, this._reverseFilterLine.bind(this));
    };
    gt.prototype._unFilterType1 = function(t, e, r) {
      let n = this._xComparison, a = n - 1;
      for (let i2 = 0;i2 < r; i2++) {
        let s = t[1 + i2], l = i2 > a ? e[i2 - n] : 0;
        e[i2] = s + l;
      }
    };
    gt.prototype._unFilterType2 = function(t, e, r) {
      let n = this._lastLine;
      for (let a = 0;a < r; a++) {
        let i2 = t[1 + a], s = n ? n[a] : 0;
        e[a] = i2 + s;
      }
    };
    gt.prototype._unFilterType3 = function(t, e, r) {
      let n = this._xComparison, a = n - 1, i2 = this._lastLine;
      for (let s = 0;s < r; s++) {
        let l = t[1 + s], o = i2 ? i2[s] : 0, h = s > a ? e[s - n] : 0, u = Math.floor((h + o) / 2);
        e[s] = l + u;
      }
    };
    gt.prototype._unFilterType4 = function(t, e, r) {
      let n = this._xComparison, a = n - 1, i2 = this._lastLine;
      for (let s = 0;s < r; s++) {
        let l = t[1 + s], o = i2 ? i2[s] : 0, h = s > a ? e[s - n] : 0, u = s > a && i2 ? i2[s - n] : 0, c = Dl(h, o, u);
        e[s] = l + c;
      }
    };
    gt.prototype._reverseFilterLine = function(t) {
      let e = t[0], r, n = this._images[this._imageIndex], a = n.byteWidth;
      if (e === 0)
        r = t.slice(1, a + 1);
      else
        switch (r = Buffer.alloc(a), e) {
          case 1:
            this._unFilterType1(t, r, a);
            break;
          case 2:
            this._unFilterType2(t, r, a);
            break;
          case 3:
            this._unFilterType3(t, r, a);
            break;
          case 4:
            this._unFilterType4(t, r, a);
            break;
          default:
            throw new Error("Unrecognised filter type - " + e);
        }
      this.write(r), n.lineIndex++, n.lineIndex >= n.height ? (this._lastLine = null, this._imageIndex++, n = this._images[this._imageIndex]) : this._lastLine = r, n ? this.read(n.byteWidth + 1, this._reverseFilterLine.bind(this)) : (this._lastLine = null, this.complete());
    };
  });
  var Oa = L((Iu, Da) => {
    var Ol = __require("util"), $a = Or(), ef = nn(), tf = Da.exports = function(t) {
      $a.call(this);
      let e = [], r = this;
      this._filter = new ef(t, { read: this.read.bind(this), write: function(n) {
        e.push(n);
      }, complete: function() {
        r.emit("complete", Buffer.concat(e));
      } }), this._filter.start();
    };
    Ol.inherits(tf, $a);
  });
  var bt = L((Uu, ei) => {
    ei.exports = { PNG_SIGNATURE: [137, 80, 78, 71, 13, 10, 26, 10], TYPE_IHDR: 1229472850, TYPE_IEND: 1229278788, TYPE_IDAT: 1229209940, TYPE_PLTE: 1347179589, TYPE_tRNS: 1951551059, TYPE_gAMA: 1732332865, COLORTYPE_GRAYSCALE: 0, COLORTYPE_PALETTE: 1, COLORTYPE_COLOR: 2, COLORTYPE_ALPHA: 4, COLORTYPE_PALETTE_COLOR: 3, COLORTYPE_COLOR_ALPHA: 6, COLORTYPE_TO_BPP_MAP: { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }, GAMMA_DIVISION: 1e5 };
  });
  var on = L((_u, ti) => {
    var an = [];
    (function() {
      for (let t = 0;t < 256; t++) {
        let e = t;
        for (let r = 0;r < 8; r++)
          e & 1 ? e = 3988292384 ^ e >>> 1 : e = e >>> 1;
        an[t] = e;
      }
    })();
    var sn = ti.exports = function() {
      this._crc = -1;
    };
    sn.prototype.write = function(t) {
      for (let e = 0;e < t.length; e++)
        this._crc = an[(this._crc ^ t[e]) & 255] ^ this._crc >>> 8;
      return true;
    };
    sn.prototype.crc32 = function() {
      return this._crc ^ -1;
    };
    sn.crc32 = function(t) {
      let e = -1;
      for (let r = 0;r < t.length; r++)
        e = an[(e ^ t[r]) & 255] ^ e >>> 8;
      return e ^ -1;
    };
  });
  var ln2 = L((Pu, ri) => {
    var Ue = bt(), rf = on(), _e = ri.exports = function(t, e) {
      this._options = t, t.checkCRC = t.checkCRC !== false, this._hasIHDR = false, this._hasIEND = false, this._emittedHeadersFinished = false, this._palette = [], this._colorType = 0, this._chunks = {}, this._chunks[Ue.TYPE_IHDR] = this._handleIHDR.bind(this), this._chunks[Ue.TYPE_IEND] = this._handleIEND.bind(this), this._chunks[Ue.TYPE_IDAT] = this._handleIDAT.bind(this), this._chunks[Ue.TYPE_PLTE] = this._handlePLTE.bind(this), this._chunks[Ue.TYPE_tRNS] = this._handleTRNS.bind(this), this._chunks[Ue.TYPE_gAMA] = this._handleGAMA.bind(this), this.read = e.read, this.error = e.error, this.metadata = e.metadata, this.gamma = e.gamma, this.transColor = e.transColor, this.palette = e.palette, this.parsed = e.parsed, this.inflateData = e.inflateData, this.finished = e.finished, this.simpleTransparency = e.simpleTransparency, this.headersFinished = e.headersFinished || function() {};
    };
    _e.prototype.start = function() {
      this.read(Ue.PNG_SIGNATURE.length, this._parseSignature.bind(this));
    };
    _e.prototype._parseSignature = function(t) {
      let e = Ue.PNG_SIGNATURE;
      for (let r = 0;r < e.length; r++)
        if (t[r] !== e[r]) {
          this.error(new Error("Invalid file signature"));
          return;
        }
      this.read(8, this._parseChunkBegin.bind(this));
    };
    _e.prototype._parseChunkBegin = function(t) {
      let e = t.readUInt32BE(0), r = t.readUInt32BE(4), n = "";
      for (let i2 = 4;i2 < 8; i2++)
        n += String.fromCharCode(t[i2]);
      let a = !!(t[4] & 32);
      if (!this._hasIHDR && r !== Ue.TYPE_IHDR) {
        this.error(new Error("Expected IHDR on beggining"));
        return;
      }
      if (this._crc = new rf, this._crc.write(Buffer.from(n)), this._chunks[r])
        return this._chunks[r](e);
      if (!a) {
        this.error(new Error("Unsupported critical chunk type " + n));
        return;
      }
      this.read(e + 4, this._skipChunk.bind(this));
    };
    _e.prototype._skipChunk = function() {
      this.read(8, this._parseChunkBegin.bind(this));
    };
    _e.prototype._handleChunkEnd = function() {
      this.read(4, this._parseChunkEnd.bind(this));
    };
    _e.prototype._parseChunkEnd = function(t) {
      let e = t.readInt32BE(0), r = this._crc.crc32();
      if (this._options.checkCRC && r !== e) {
        this.error(new Error("Crc error - " + e + " - " + r));
        return;
      }
      this._hasIEND || this.read(8, this._parseChunkBegin.bind(this));
    };
    _e.prototype._handleIHDR = function(t) {
      this.read(t, this._parseIHDR.bind(this));
    };
    _e.prototype._parseIHDR = function(t) {
      this._crc.write(t);
      let e = t.readUInt32BE(0), r = t.readUInt32BE(4), n = t[8], a = t[9], i2 = t[10], s = t[11], l = t[12];
      if (n !== 8 && n !== 4 && n !== 2 && n !== 1 && n !== 16) {
        this.error(new Error("Unsupported bit depth " + n));
        return;
      }
      if (!(a in Ue.COLORTYPE_TO_BPP_MAP)) {
        this.error(new Error("Unsupported color type"));
        return;
      }
      if (i2 !== 0) {
        this.error(new Error("Unsupported compression method"));
        return;
      }
      if (s !== 0) {
        this.error(new Error("Unsupported filter method"));
        return;
      }
      if (l !== 0 && l !== 1) {
        this.error(new Error("Unsupported interlace method"));
        return;
      }
      this._colorType = a;
      let o = Ue.COLORTYPE_TO_BPP_MAP[this._colorType];
      this._hasIHDR = true, this.metadata({ width: e, height: r, depth: n, interlace: !!l, palette: !!(a & Ue.COLORTYPE_PALETTE), color: !!(a & Ue.COLORTYPE_COLOR), alpha: !!(a & Ue.COLORTYPE_ALPHA), bpp: o, colorType: a }), this._handleChunkEnd();
    };
    _e.prototype._handlePLTE = function(t) {
      this.read(t, this._parsePLTE.bind(this));
    };
    _e.prototype._parsePLTE = function(t) {
      this._crc.write(t);
      let e = Math.floor(t.length / 3);
      for (let r = 0;r < e; r++)
        this._palette.push([t[r * 3], t[r * 3 + 1], t[r * 3 + 2], 255]);
      this.palette(this._palette), this._handleChunkEnd();
    };
    _e.prototype._handleTRNS = function(t) {
      this.simpleTransparency(), this.read(t, this._parseTRNS.bind(this));
    };
    _e.prototype._parseTRNS = function(t) {
      if (this._crc.write(t), this._colorType === Ue.COLORTYPE_PALETTE_COLOR) {
        if (this._palette.length === 0) {
          this.error(new Error("Transparency chunk must be after palette"));
          return;
        }
        if (t.length > this._palette.length) {
          this.error(new Error("More transparent colors than palette size"));
          return;
        }
        for (let e = 0;e < t.length; e++)
          this._palette[e][3] = t[e];
        this.palette(this._palette);
      }
      this._colorType === Ue.COLORTYPE_GRAYSCALE && this.transColor([t.readUInt16BE(0)]), this._colorType === Ue.COLORTYPE_COLOR && this.transColor([t.readUInt16BE(0), t.readUInt16BE(2), t.readUInt16BE(4)]), this._handleChunkEnd();
    };
    _e.prototype._handleGAMA = function(t) {
      this.read(t, this._parseGAMA.bind(this));
    };
    _e.prototype._parseGAMA = function(t) {
      this._crc.write(t), this.gamma(t.readUInt32BE(0) / Ue.GAMMA_DIVISION), this._handleChunkEnd();
    };
    _e.prototype._handleIDAT = function(t) {
      this._emittedHeadersFinished || (this._emittedHeadersFinished = true, this.headersFinished()), this.read(-t, this._parseIDAT.bind(this, t));
    };
    _e.prototype._parseIDAT = function(t, e) {
      if (this._crc.write(e), this._colorType === Ue.COLORTYPE_PALETTE_COLOR && this._palette.length === 0)
        throw new Error("Expected palette not found");
      this.inflateData(e);
      let r = t - e.length;
      r > 0 ? this._handleIDAT(r) : this._handleChunkEnd();
    };
    _e.prototype._handleIEND = function(t) {
      this.read(t, this._parseIEND.bind(this));
    };
    _e.prototype._parseIEND = function(t) {
      this._crc.write(t), this._hasIEND = true, this._handleChunkEnd(), this.finished && this.finished();
    };
  });
  var fn = L((ai) => {
    var ni = tn(), nf = [function() {}, function(t, e, r, n) {
      if (n === e.length)
        throw new Error("Ran out of data");
      let a = e[n];
      t[r] = a, t[r + 1] = a, t[r + 2] = a, t[r + 3] = 255;
    }, function(t, e, r, n) {
      if (n + 1 >= e.length)
        throw new Error("Ran out of data");
      let a = e[n];
      t[r] = a, t[r + 1] = a, t[r + 2] = a, t[r + 3] = e[n + 1];
    }, function(t, e, r, n) {
      if (n + 2 >= e.length)
        throw new Error("Ran out of data");
      t[r] = e[n], t[r + 1] = e[n + 1], t[r + 2] = e[n + 2], t[r + 3] = 255;
    }, function(t, e, r, n) {
      if (n + 3 >= e.length)
        throw new Error("Ran out of data");
      t[r] = e[n], t[r + 1] = e[n + 1], t[r + 2] = e[n + 2], t[r + 3] = e[n + 3];
    }], af = [function() {}, function(t, e, r, n) {
      let a = e[0];
      t[r] = a, t[r + 1] = a, t[r + 2] = a, t[r + 3] = n;
    }, function(t, e, r) {
      let n = e[0];
      t[r] = n, t[r + 1] = n, t[r + 2] = n, t[r + 3] = e[1];
    }, function(t, e, r, n) {
      t[r] = e[0], t[r + 1] = e[1], t[r + 2] = e[2], t[r + 3] = n;
    }, function(t, e, r) {
      t[r] = e[0], t[r + 1] = e[1], t[r + 2] = e[2], t[r + 3] = e[3];
    }];
    function sf(t, e) {
      let r = [], n = 0;
      function a() {
        if (n === t.length)
          throw new Error("Ran out of data");
        let i2 = t[n];
        n++;
        let s, l, o, h, u, c, p, d;
        switch (e) {
          default:
            throw new Error("unrecognised depth");
          case 16:
            p = t[n], n++, r.push((i2 << 8) + p);
            break;
          case 4:
            p = i2 & 15, d = i2 >> 4, r.push(d, p);
            break;
          case 2:
            u = i2 & 3, c = i2 >> 2 & 3, p = i2 >> 4 & 3, d = i2 >> 6 & 3, r.push(d, p, c, u);
            break;
          case 1:
            s = i2 & 1, l = i2 >> 1 & 1, o = i2 >> 2 & 1, h = i2 >> 3 & 1, u = i2 >> 4 & 1, c = i2 >> 5 & 1, p = i2 >> 6 & 1, d = i2 >> 7 & 1, r.push(d, p, c, u, h, o, l, s);
            break;
        }
      }
      return { get: function(i2) {
        for (;r.length < i2; )
          a();
        let s = r.slice(0, i2);
        return r = r.slice(i2), s;
      }, resetAfterLine: function() {
        r.length = 0;
      }, end: function() {
        if (n !== t.length)
          throw new Error("extra data found");
      } };
    }
    function of(t, e, r, n, a, i2) {
      let { width: s, height: l, index: o } = t;
      for (let h = 0;h < l; h++)
        for (let u = 0;u < s; u++) {
          let c = r(u, h, o);
          nf[n](e, a, c, i2), i2 += n;
        }
      return i2;
    }
    function lf(t, e, r, n, a, i2) {
      let { width: s, height: l, index: o } = t;
      for (let h = 0;h < l; h++) {
        for (let u = 0;u < s; u++) {
          let c = a.get(n), p = r(u, h, o);
          af[n](e, c, p, i2);
        }
        a.resetAfterLine();
      }
    }
    ai.dataToBitMap = function(t, e) {
      let { width: r, height: n, depth: a, bpp: i2, interlace: s } = e, l;
      a !== 8 && (l = sf(t, a));
      let o;
      a <= 8 ? o = Buffer.alloc(r * n * 4) : o = new Uint16Array(r * n * 4);
      let h = Math.pow(2, a) - 1, u = 0, c, p;
      if (s)
        c = ni.getImagePasses(r, n), p = ni.getInterlaceIterator(r, n);
      else {
        let d = 0;
        p = function() {
          let m = d;
          return d += 4, m;
        }, c = [{ width: r, height: n }];
      }
      for (let d = 0;d < c.length; d++)
        a === 8 ? u = of(c[d], o, p, i2, t, u) : lf(c[d], o, p, i2, l, h);
      if (a === 8) {
        if (u !== t.length)
          throw new Error("extra data found");
      } else
        l.end();
      return o;
    };
  });
  var hn = L((Su, ii) => {
    function ff(t, e, r, n, a) {
      let i2 = 0;
      for (let s = 0;s < n; s++)
        for (let l = 0;l < r; l++) {
          let o = a[t[i2]];
          if (!o)
            throw new Error("index " + t[i2] + " not in palette");
          for (let h = 0;h < 4; h++)
            e[i2 + h] = o[h];
          i2 += 4;
        }
    }
    function hf(t, e, r, n, a) {
      let i2 = 0;
      for (let s = 0;s < n; s++)
        for (let l = 0;l < r; l++) {
          let o = false;
          if (a.length === 1 ? a[0] === t[i2] && (o = true) : a[0] === t[i2] && a[1] === t[i2 + 1] && a[2] === t[i2 + 2] && (o = true), o)
            for (let h = 0;h < 4; h++)
              e[i2 + h] = 0;
          i2 += 4;
        }
    }
    function uf(t, e, r, n, a) {
      let i2 = 255, s = Math.pow(2, a) - 1, l = 0;
      for (let o = 0;o < n; o++)
        for (let h = 0;h < r; h++) {
          for (let u = 0;u < 4; u++)
            e[l + u] = Math.floor(t[l + u] * i2 / s + 0.5);
          l += 4;
        }
    }
    ii.exports = function(t, e, r = false) {
      let { depth: n, width: a, height: i2, colorType: s, transColor: l, palette: o } = e, h = t;
      return s === 3 ? ff(t, h, a, i2, o) : (l && hf(t, h, a, i2, l), n !== 8 && !r && (n === 16 && (h = Buffer.alloc(a * i2 * 4)), uf(t, h, a, i2, n))), h;
    };
  });
  var li = L((Eu, oi) => {
    var cf = __require("util"), un = __require("zlib"), si = Or(), pf = Oa(), df = ln2(), mf = fn(), xf = hn(), $e = oi.exports = function(t) {
      si.call(this), this._parser = new df(t, { read: this.read.bind(this), error: this._handleError.bind(this), metadata: this._handleMetaData.bind(this), gamma: this.emit.bind(this, "gamma"), palette: this._handlePalette.bind(this), transColor: this._handleTransColor.bind(this), finished: this._finished.bind(this), inflateData: this._inflateData.bind(this), simpleTransparency: this._simpleTransparency.bind(this), headersFinished: this._headersFinished.bind(this) }), this._options = t, this.writable = true, this._parser.start();
    };
    cf.inherits($e, si);
    $e.prototype._handleError = function(t) {
      this.emit("error", t), this.writable = false, this.destroy(), this._inflate && this._inflate.destroy && this._inflate.destroy(), this._filter && (this._filter.destroy(), this._filter.on("error", function() {})), this.errord = true;
    };
    $e.prototype._inflateData = function(t) {
      if (!this._inflate)
        if (this._bitmapInfo.interlace)
          this._inflate = un.createInflate(), this._inflate.on("error", this.emit.bind(this, "error")), this._filter.on("complete", this._complete.bind(this)), this._inflate.pipe(this._filter);
        else {
          let r = ((this._bitmapInfo.width * this._bitmapInfo.bpp * this._bitmapInfo.depth + 7 >> 3) + 1) * this._bitmapInfo.height, n = Math.max(r, un.Z_MIN_CHUNK);
          this._inflate = un.createInflate({ chunkSize: n });
          let a = r, i2 = this.emit.bind(this, "error");
          this._inflate.on("error", function(l) {
            a && i2(l);
          }), this._filter.on("complete", this._complete.bind(this));
          let s = this._filter.write.bind(this._filter);
          this._inflate.on("data", function(l) {
            a && (l.length > a && (l = l.slice(0, a)), a -= l.length, s(l));
          }), this._inflate.on("end", this._filter.end.bind(this._filter));
        }
      this._inflate.write(t);
    };
    $e.prototype._handleMetaData = function(t) {
      this._metaData = t, this._bitmapInfo = Object.create(t), this._filter = new pf(this._bitmapInfo);
    };
    $e.prototype._handleTransColor = function(t) {
      this._bitmapInfo.transColor = t;
    };
    $e.prototype._handlePalette = function(t) {
      this._bitmapInfo.palette = t;
    };
    $e.prototype._simpleTransparency = function() {
      this._metaData.alpha = true;
    };
    $e.prototype._headersFinished = function() {
      this.emit("metadata", this._metaData);
    };
    $e.prototype._finished = function() {
      this.errord || (this._inflate ? this._inflate.end() : this.emit("error", "No Inflate block"));
    };
    $e.prototype._complete = function(t) {
      if (this.errord)
        return;
      let e;
      try {
        let r = mf.dataToBitMap(t, this._bitmapInfo);
        e = xf(r, this._bitmapInfo, this._options.skipRescale), r = null;
      } catch (r) {
        this._handleError(r);
        return;
      }
      this.emit("parsed", e);
    };
  });
  var hi = L((Cu, fi) => {
    var Ye = bt();
    fi.exports = function(t, e, r, n) {
      let a = [Ye.COLORTYPE_COLOR_ALPHA, Ye.COLORTYPE_ALPHA].indexOf(n.colorType) !== -1;
      if (n.colorType === n.inputColorType) {
        let m = function() {
          let F = new ArrayBuffer(2);
          return new DataView(F).setInt16(0, 256, true), new Int16Array(F)[0] !== 256;
        }();
        if (n.bitDepth === 8 || n.bitDepth === 16 && m)
          return t;
      }
      let i2 = n.bitDepth !== 16 ? t : new Uint16Array(t.buffer), s = 255, l = Ye.COLORTYPE_TO_BPP_MAP[n.inputColorType];
      l === 4 && !n.inputHasAlpha && (l = 3);
      let o = Ye.COLORTYPE_TO_BPP_MAP[n.colorType];
      n.bitDepth === 16 && (s = 65535, o *= 2);
      let h = Buffer.alloc(e * r * o), u = 0, c = 0, p = n.bgColor || {};
      p.red === undefined && (p.red = s), p.green === undefined && (p.green = s), p.blue === undefined && (p.blue = s);
      function d() {
        let m, F, b, I = s;
        switch (n.inputColorType) {
          case Ye.COLORTYPE_COLOR_ALPHA:
            I = i2[u + 3], m = i2[u], F = i2[u + 1], b = i2[u + 2];
            break;
          case Ye.COLORTYPE_COLOR:
            m = i2[u], F = i2[u + 1], b = i2[u + 2];
            break;
          case Ye.COLORTYPE_ALPHA:
            I = i2[u + 1], m = i2[u], F = m, b = m;
            break;
          case Ye.COLORTYPE_GRAYSCALE:
            m = i2[u], F = m, b = m;
            break;
          default:
            throw new Error("input color type:" + n.inputColorType + " is not supported at present");
        }
        return n.inputHasAlpha && (a || (I /= s, m = Math.min(Math.max(Math.round((1 - I) * p.red + I * m), 0), s), F = Math.min(Math.max(Math.round((1 - I) * p.green + I * F), 0), s), b = Math.min(Math.max(Math.round((1 - I) * p.blue + I * b), 0), s))), { red: m, green: F, blue: b, alpha: I };
      }
      for (let m = 0;m < r; m++)
        for (let F = 0;F < e; F++) {
          let b = d(i2, u);
          switch (n.colorType) {
            case Ye.COLORTYPE_COLOR_ALPHA:
            case Ye.COLORTYPE_COLOR:
              n.bitDepth === 8 ? (h[c] = b.red, h[c + 1] = b.green, h[c + 2] = b.blue, a && (h[c + 3] = b.alpha)) : (h.writeUInt16BE(b.red, c), h.writeUInt16BE(b.green, c + 2), h.writeUInt16BE(b.blue, c + 4), a && h.writeUInt16BE(b.alpha, c + 6));
              break;
            case Ye.COLORTYPE_ALPHA:
            case Ye.COLORTYPE_GRAYSCALE: {
              let I = (b.red + b.green + b.blue) / 3;
              n.bitDepth === 8 ? (h[c] = I, a && (h[c + 1] = b.alpha)) : (h.writeUInt16BE(I, c), a && h.writeUInt16BE(b.alpha, c + 2));
              break;
            }
            default:
              throw new Error("unrecognised color Type " + n.colorType);
          }
          u += l, c += o;
        }
      return h;
    };
  });
  var pi = L((Au, ci) => {
    var ui = rn();
    function vf(t, e, r, n, a) {
      for (let i2 = 0;i2 < r; i2++)
        n[a + i2] = t[e + i2];
    }
    function gf(t, e, r) {
      let n = 0, a = e + r;
      for (let i2 = e;i2 < a; i2++)
        n += Math.abs(t[i2]);
      return n;
    }
    function bf(t, e, r, n, a, i2) {
      for (let s = 0;s < r; s++) {
        let l = s >= i2 ? t[e + s - i2] : 0, o = t[e + s] - l;
        n[a + s] = o;
      }
    }
    function yf(t, e, r, n) {
      let a = 0;
      for (let i2 = 0;i2 < r; i2++) {
        let s = i2 >= n ? t[e + i2 - n] : 0, l = t[e + i2] - s;
        a += Math.abs(l);
      }
      return a;
    }
    function Tf(t, e, r, n, a) {
      for (let i2 = 0;i2 < r; i2++) {
        let s = e > 0 ? t[e + i2 - r] : 0, l = t[e + i2] - s;
        n[a + i2] = l;
      }
    }
    function wf(t, e, r) {
      let n = 0, a = e + r;
      for (let i2 = e;i2 < a; i2++) {
        let s = e > 0 ? t[i2 - r] : 0, l = t[i2] - s;
        n += Math.abs(l);
      }
      return n;
    }
    function Ff(t, e, r, n, a, i2) {
      for (let s = 0;s < r; s++) {
        let l = s >= i2 ? t[e + s - i2] : 0, o = e > 0 ? t[e + s - r] : 0, h = t[e + s] - (l + o >> 1);
        n[a + s] = h;
      }
    }
    function kf(t, e, r, n) {
      let a = 0;
      for (let i2 = 0;i2 < r; i2++) {
        let s = i2 >= n ? t[e + i2 - n] : 0, l = e > 0 ? t[e + i2 - r] : 0, o = t[e + i2] - (s + l >> 1);
        a += Math.abs(o);
      }
      return a;
    }
    function If(t, e, r, n, a, i2) {
      for (let s = 0;s < r; s++) {
        let l = s >= i2 ? t[e + s - i2] : 0, o = e > 0 ? t[e + s - r] : 0, h = e > 0 && s >= i2 ? t[e + s - (r + i2)] : 0, u = t[e + s] - ui(l, o, h);
        n[a + s] = u;
      }
    }
    function Uf(t, e, r, n) {
      let a = 0;
      for (let i2 = 0;i2 < r; i2++) {
        let s = i2 >= n ? t[e + i2 - n] : 0, l = e > 0 ? t[e + i2 - r] : 0, o = e > 0 && i2 >= n ? t[e + i2 - (r + n)] : 0, h = t[e + i2] - ui(s, l, o);
        a += Math.abs(h);
      }
      return a;
    }
    var _f = { 0: vf, 1: bf, 2: Tf, 3: Ff, 4: If }, Pf = { 0: gf, 1: yf, 2: wf, 3: kf, 4: Uf };
    ci.exports = function(t, e, r, n, a) {
      let i2;
      if (!("filterType" in n) || n.filterType === -1)
        i2 = [0, 1, 2, 3, 4];
      else if (typeof n.filterType == "number")
        i2 = [n.filterType];
      else
        throw new Error("unrecognised filter types");
      n.bitDepth === 16 && (a *= 2);
      let s = e * a, l = 0, o = 0, h = Buffer.alloc((s + 1) * r), u = i2[0];
      for (let c = 0;c < r; c++) {
        if (i2.length > 1) {
          let p = 1 / 0;
          for (let d = 0;d < i2.length; d++) {
            let m = Pf[i2[d]](t, o, s, a);
            m < p && (u = i2[d], p = m);
          }
        }
        h[l] = u, l++, _f[u](t, o, s, h, l, a), l += s, o += s;
      }
      return h;
    };
  });
  var cn = L((Gu, di) => {
    var Se = bt(), Bf = on(), Sf = hi(), Ef = pi(), Cf = __require("zlib"), rt = di.exports = function(t) {
      if (this._options = t, t.deflateChunkSize = t.deflateChunkSize || 32 * 1024, t.deflateLevel = t.deflateLevel != null ? t.deflateLevel : 9, t.deflateStrategy = t.deflateStrategy != null ? t.deflateStrategy : 3, t.inputHasAlpha = t.inputHasAlpha != null ? t.inputHasAlpha : true, t.deflateFactory = t.deflateFactory || Cf.createDeflate, t.bitDepth = t.bitDepth || 8, t.colorType = typeof t.colorType == "number" ? t.colorType : Se.COLORTYPE_COLOR_ALPHA, t.inputColorType = typeof t.inputColorType == "number" ? t.inputColorType : Se.COLORTYPE_COLOR_ALPHA, [Se.COLORTYPE_GRAYSCALE, Se.COLORTYPE_COLOR, Se.COLORTYPE_COLOR_ALPHA, Se.COLORTYPE_ALPHA].indexOf(t.colorType) === -1)
        throw new Error("option color type:" + t.colorType + " is not supported at present");
      if ([Se.COLORTYPE_GRAYSCALE, Se.COLORTYPE_COLOR, Se.COLORTYPE_COLOR_ALPHA, Se.COLORTYPE_ALPHA].indexOf(t.inputColorType) === -1)
        throw new Error("option input color type:" + t.inputColorType + " is not supported at present");
      if (t.bitDepth !== 8 && t.bitDepth !== 16)
        throw new Error("option bit depth:" + t.bitDepth + " is not supported at present");
    };
    rt.prototype.getDeflateOptions = function() {
      return { chunkSize: this._options.deflateChunkSize, level: this._options.deflateLevel, strategy: this._options.deflateStrategy };
    };
    rt.prototype.createDeflate = function() {
      return this._options.deflateFactory(this.getDeflateOptions());
    };
    rt.prototype.filterData = function(t, e, r) {
      let n = Sf(t, e, r, this._options), a = Se.COLORTYPE_TO_BPP_MAP[this._options.colorType];
      return Ef(n, e, r, this._options, a);
    };
    rt.prototype._packChunk = function(t, e) {
      let r = e ? e.length : 0, n = Buffer.alloc(r + 12);
      return n.writeUInt32BE(r, 0), n.writeUInt32BE(t, 4), e && e.copy(n, 8), n.writeInt32BE(Bf.crc32(n.slice(4, n.length - 4)), n.length - 4), n;
    };
    rt.prototype.packGAMA = function(t) {
      let e = Buffer.alloc(4);
      return e.writeUInt32BE(Math.floor(t * Se.GAMMA_DIVISION), 0), this._packChunk(Se.TYPE_gAMA, e);
    };
    rt.prototype.packIHDR = function(t, e) {
      let r = Buffer.alloc(13);
      return r.writeUInt32BE(t, 0), r.writeUInt32BE(e, 4), r[8] = this._options.bitDepth, r[9] = this._options.colorType, r[10] = 0, r[11] = 0, r[12] = 0, this._packChunk(Se.TYPE_IHDR, r);
    };
    rt.prototype.packIDAT = function(t) {
      return this._packChunk(Se.TYPE_IDAT, t);
    };
    rt.prototype.packIEND = function() {
      return this._packChunk(Se.TYPE_IEND, null);
    };
  });
  var gi = L((qu, vi) => {
    var Af = __require("util"), mi = __require("stream"), Gf = bt(), qf = cn(), xi = vi.exports = function(t) {
      mi.call(this);
      let e = t || {};
      this._packer = new qf(e), this._deflate = this._packer.createDeflate(), this.readable = true;
    };
    Af.inherits(xi, mi);
    xi.prototype.pack = function(t, e, r, n) {
      this.emit("data", Buffer.from(Gf.PNG_SIGNATURE)), this.emit("data", this._packer.packIHDR(e, r)), n && this.emit("data", this._packer.packGAMA(n));
      let a = this._packer.filterData(t, e, r);
      this._deflate.on("error", this.emit.bind(this, "error")), this._deflate.on("data", function(i2) {
        this.emit("data", this._packer.packIDAT(i2));
      }.bind(this)), this._deflate.on("end", function() {
        this.emit("data", this._packer.packIEND()), this.emit("end");
      }.bind(this)), this._deflate.end(a);
    };
  });
  var ki = L((Mt, Fi) => {
    var bi = __require("assert").ok, yt = __require("zlib"), Hf = __require("util"), yi = __require("buffer").kMaxLength;
    function lt(t) {
      if (!(this instanceof lt))
        return new lt(t);
      t && t.chunkSize < yt.Z_MIN_CHUNK && (t.chunkSize = yt.Z_MIN_CHUNK), yt.Inflate.call(this, t), this._offset = this._offset === undefined ? this._outOffset : this._offset, this._buffer = this._buffer || this._outBuffer, t && t.maxLength != null && (this._maxLength = t.maxLength);
    }
    function Rf(t) {
      return new lt(t);
    }
    function Ti(t, e) {
      e && process.nextTick(e), t._handle && (t._handle.close(), t._handle = null);
    }
    lt.prototype._processChunk = function(t, e, r) {
      if (typeof r == "function")
        return yt.Inflate._processChunk.call(this, t, e, r);
      let n = this, a = t && t.length, i2 = this._chunkSize - this._offset, s = this._maxLength, l = 0, o = [], h = 0, u;
      this.on("error", function(m) {
        u = m;
      });
      function c(m, F) {
        if (n._hadError)
          return;
        let b = i2 - F;
        if (bi(b >= 0, "have should not go down"), b > 0) {
          let I = n._buffer.slice(n._offset, n._offset + b);
          if (n._offset += b, I.length > s && (I = I.slice(0, s)), o.push(I), h += I.length, s -= I.length, s === 0)
            return false;
        }
        return (F === 0 || n._offset >= n._chunkSize) && (i2 = n._chunkSize, n._offset = 0, n._buffer = Buffer.allocUnsafe(n._chunkSize)), F === 0 ? (l += a - m, a = m, true) : false;
      }
      bi(this._handle, "zlib binding closed");
      let p;
      do
        p = this._handle.writeSync(e, t, l, a, this._buffer, this._offset, i2), p = p || this._writeState;
      while (!this._hadError && c(p[0], p[1]));
      if (this._hadError)
        throw u;
      if (h >= yi)
        throw Ti(this), new RangeError("Cannot create final Buffer. It would be larger than 0x" + yi.toString(16) + " bytes");
      let d = Buffer.concat(o, h);
      return Ti(this), d;
    };
    Hf.inherits(lt, yt.Inflate);
    function Mf(t, e) {
      if (typeof e == "string" && (e = Buffer.from(e)), !(e instanceof Buffer))
        throw new TypeError("Not a string or buffer");
      let r = t._finishFlushFlag;
      return r == null && (r = yt.Z_FINISH), t._processChunk(e, r);
    }
    function wi(t, e) {
      return Mf(new lt(e), t);
    }
    Fi.exports = Mt = wi;
    Mt.Inflate = lt;
    Mt.createInflate = Rf;
    Mt.inflateSync = wi;
  });
  var pn = L((Hu, Ui) => {
    var Ii = Ui.exports = function(t) {
      this._buffer = t, this._reads = [];
    };
    Ii.prototype.read = function(t, e) {
      this._reads.push({ length: Math.abs(t), allowLess: t < 0, func: e });
    };
    Ii.prototype.process = function() {
      for (;this._reads.length > 0 && this._buffer.length; ) {
        let t = this._reads[0];
        if (this._buffer.length && (this._buffer.length >= t.length || t.allowLess)) {
          this._reads.shift();
          let e = this._buffer;
          this._buffer = e.slice(t.length), t.func.call(this, e.slice(0, t.length));
        } else
          break;
      }
      if (this._reads.length > 0)
        throw new Error("There are some read requests waitng on finished stream");
      if (this._buffer.length > 0)
        throw new Error("unrecognised content at end of stream");
    };
  });
  var Pi = L((_i) => {
    var Yf = pn(), Wf = nn();
    _i.process = function(t, e) {
      let r = [], n = new Yf(t);
      return new Wf(e, { read: n.read.bind(n), write: function(i2) {
        r.push(i2);
      }, complete: function() {} }).start(), n.process(), Buffer.concat(r);
    };
  });
  var Ci = L((Mu, Ei) => {
    var Bi = true, Si = __require("zlib"), Vf = ki();
    Si.deflateSync || (Bi = false);
    var Lf = pn(), Xf = Pi(), zf = ln2(), Nf = fn(), Zf = hn();
    Ei.exports = function(t, e) {
      if (!Bi)
        throw new Error("To use the sync capability of this library in old node versions, please pin pngjs to v2.3.0");
      let r;
      function n(U) {
        r = U;
      }
      let a;
      function i2(U) {
        a = U;
      }
      function s(U) {
        a.transColor = U;
      }
      function l(U) {
        a.palette = U;
      }
      function o() {
        a.alpha = true;
      }
      let h;
      function u(U) {
        h = U;
      }
      let c = [];
      function p(U) {
        c.push(U);
      }
      let d = new Lf(t);
      if (new zf(e, { read: d.read.bind(d), error: n, metadata: i2, gamma: u, palette: l, transColor: s, inflateData: p, simpleTransparency: o }).start(), d.process(), r)
        throw r;
      let F = Buffer.concat(c);
      c.length = 0;
      let b;
      if (a.interlace)
        b = Si.inflateSync(F);
      else {
        let y = ((a.width * a.bpp * a.depth + 7 >> 3) + 1) * a.height;
        b = Vf(F, { chunkSize: y, maxLength: y });
      }
      if (F = null, !b || !b.length)
        throw new Error("bad png - invalid inflate data response");
      let I = Xf.process(b, a);
      F = null;
      let w = Nf.dataToBitMap(I, a);
      I = null;
      let x2 = Zf(w, a, e.skipRescale);
      return a.data = x2, a.gamma = h || 0, a;
    };
  });
  var Hi = L((Yu, qi) => {
    var Ai = true, Gi = __require("zlib");
    Gi.deflateSync || (Ai = false);
    var jf = bt(), Qf = cn();
    qi.exports = function(t, e) {
      if (!Ai)
        throw new Error("To use the sync capability of this library in old node versions, please pin pngjs to v2.3.0");
      let r = e || {}, n = new Qf(r), a = [];
      a.push(Buffer.from(jf.PNG_SIGNATURE)), a.push(n.packIHDR(t.width, t.height)), t.gamma && a.push(n.packGAMA(t.gamma));
      let i2 = n.filterData(t.data, t.width, t.height), s = Gi.deflateSync(i2, n.getDeflateOptions());
      if (i2 = null, !s || !s.length)
        throw new Error("bad png - invalid compressed data response");
      return a.push(n.packIDAT(s)), a.push(n.packIEND()), Buffer.concat(a);
    };
  });
  var Ri = L((dn) => {
    var Kf = Ci(), Jf = Hi();
    dn.read = function(t, e) {
      return Kf(t, e || {});
    };
    dn.write = function(t, e) {
      return Jf(t, e);
    };
  });
  var Wi = L((Yi) => {
    var $f = __require("util"), Mi = __require("stream"), Df = li(), Of = gi(), eh = Ri(), Ce = Yi.PNG = function(t) {
      Mi.call(this), t = t || {}, this.width = t.width | 0, this.height = t.height | 0, this.data = this.width > 0 && this.height > 0 ? Buffer.alloc(4 * this.width * this.height) : null, t.fill && this.data && this.data.fill(0), this.gamma = 0, this.readable = this.writable = true, this._parser = new Df(t), this._parser.on("error", this.emit.bind(this, "error")), this._parser.on("close", this._handleClose.bind(this)), this._parser.on("metadata", this._metadata.bind(this)), this._parser.on("gamma", this._gamma.bind(this)), this._parser.on("parsed", function(e) {
        this.data = e, this.emit("parsed", e);
      }.bind(this)), this._packer = new Of(t), this._packer.on("data", this.emit.bind(this, "data")), this._packer.on("end", this.emit.bind(this, "end")), this._parser.on("close", this._handleClose.bind(this)), this._packer.on("error", this.emit.bind(this, "error"));
    };
    $f.inherits(Ce, Mi);
    Ce.sync = eh;
    Ce.prototype.pack = function() {
      return !this.data || !this.data.length ? (this.emit("error", "No data provided"), this) : (process.nextTick(function() {
        this._packer.pack(this.data, this.width, this.height, this.gamma);
      }.bind(this)), this);
    };
    Ce.prototype.parse = function(t, e) {
      if (e) {
        let r, n;
        r = function(a) {
          this.removeListener("error", n), this.data = a, e(null, this);
        }.bind(this), n = function(a) {
          this.removeListener("parsed", r), e(a, null);
        }.bind(this), this.once("parsed", r), this.once("error", n);
      }
      return this.end(t), this;
    };
    Ce.prototype.write = function(t) {
      return this._parser.write(t), true;
    };
    Ce.prototype.end = function(t) {
      this._parser.end(t);
    };
    Ce.prototype._metadata = function(t) {
      this.width = t.width, this.height = t.height, this.emit("metadata", t);
    };
    Ce.prototype._gamma = function(t) {
      this.gamma = t;
    };
    Ce.prototype._handleClose = function() {
      !this._parser.writable && !this._packer.readable && this.emit("close");
    };
    Ce.bitblt = function(t, e, r, n, a, i2, s, l) {
      if (r |= 0, n |= 0, a |= 0, i2 |= 0, s |= 0, l |= 0, r > t.width || n > t.height || r + a > t.width || n + i2 > t.height)
        throw new Error("bitblt reading outside image");
      if (s > e.width || l > e.height || s + a > e.width || l + i2 > e.height)
        throw new Error("bitblt writing outside image");
      for (let o = 0;o < i2; o++)
        t.data.copy(e.data, (l + o) * e.width + s << 2, (n + o) * t.width + r << 2, (n + o) * t.width + r + a << 2);
    };
    Ce.prototype.bitblt = function(t, e, r, n, a, i2, s) {
      return Ce.bitblt(this, t, e, r, n, a, i2, s), this;
    };
    Ce.adjustGamma = function(t) {
      if (t.gamma) {
        for (let e = 0;e < t.height; e++)
          for (let r = 0;r < t.width; r++) {
            let n = t.width * e + r << 2;
            for (let a = 0;a < 3; a++) {
              let i2 = t.data[n + a] / 255;
              i2 = Math.pow(i2, 1 / 2.2 / t.gamma), t.data[n + a] = Math.round(i2 * 255);
            }
          }
        t.gamma = 0;
      }
    };
    Ce.prototype.adjustGamma = function() {
      Ce.adjustGamma(this);
    };
  });
  var Xi = L((Lu, lr) => {
    var Li = Li || function(t) {
      return Buffer.from(t).toString("base64");
    };
    function th(t) {
      var e = this, r = Math.round, n = Math.floor, a = new Array(64), i2 = new Array(64), s = new Array(64), l = new Array(64), o, h, u, c, p = new Array(65535), d = new Array(65535), m = new Array(64), F = new Array(64), b = [], I = 0, w = 7, x2 = new Array(64), U = new Array(64), y = new Array(64), W = new Array(256), T = new Array(2048), R, S = [0, 1, 5, 6, 14, 15, 27, 28, 2, 4, 7, 13, 16, 26, 29, 42, 3, 8, 12, 17, 25, 30, 41, 43, 9, 11, 18, 24, 31, 40, 44, 53, 10, 19, 23, 32, 39, 45, 52, 54, 20, 22, 33, 38, 46, 51, 55, 60, 21, 34, 37, 47, 50, 56, 59, 61, 35, 36, 48, 49, 57, 58, 62, 63], E = [0, 0, 1, 5, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0], G = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], V = [0, 0, 2, 1, 3, 3, 2, 4, 3, 5, 5, 4, 4, 0, 0, 1, 125], C = [1, 2, 3, 0, 4, 17, 5, 18, 33, 49, 65, 6, 19, 81, 97, 7, 34, 113, 20, 50, 129, 145, 161, 8, 35, 66, 177, 193, 21, 82, 209, 240, 36, 51, 98, 114, 130, 9, 10, 22, 23, 24, 25, 26, 37, 38, 39, 40, 41, 42, 52, 53, 54, 55, 56, 57, 58, 67, 68, 69, 70, 71, 72, 73, 74, 83, 84, 85, 86, 87, 88, 89, 90, 99, 100, 101, 102, 103, 104, 105, 106, 115, 116, 117, 118, 119, 120, 121, 122, 131, 132, 133, 134, 135, 136, 137, 138, 146, 147, 148, 149, 150, 151, 152, 153, 154, 162, 163, 164, 165, 166, 167, 168, 169, 170, 178, 179, 180, 181, 182, 183, 184, 185, 186, 194, 195, 196, 197, 198, 199, 200, 201, 202, 210, 211, 212, 213, 214, 215, 216, 217, 218, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250], z = [0, 0, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0], P = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], H = [0, 0, 2, 1, 2, 4, 4, 3, 4, 7, 5, 4, 4, 0, 1, 2, 119], de = [0, 1, 2, 3, 17, 4, 5, 33, 49, 6, 18, 65, 81, 7, 97, 113, 19, 34, 50, 129, 8, 20, 66, 145, 161, 177, 193, 9, 35, 51, 82, 240, 21, 98, 114, 209, 10, 22, 36, 52, 225, 37, 241, 23, 24, 25, 26, 38, 39, 40, 41, 42, 53, 54, 55, 56, 57, 58, 67, 68, 69, 70, 71, 72, 73, 74, 83, 84, 85, 86, 87, 88, 89, 90, 99, 100, 101, 102, 103, 104, 105, 106, 115, 116, 117, 118, 119, 120, 121, 122, 130, 131, 132, 133, 134, 135, 136, 137, 138, 146, 147, 148, 149, 150, 151, 152, 153, 154, 162, 163, 164, 165, 166, 167, 168, 169, 170, 178, 179, 180, 181, 182, 183, 184, 185, 186, 194, 195, 196, 197, 198, 199, 200, 201, 202, 210, 211, 212, 213, 214, 215, 216, 217, 218, 226, 227, 228, 229, 230, 231, 232, 233, 234, 242, 243, 244, 245, 246, 247, 248, 249, 250];
      function le(v) {
        for (var Y = [16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55, 14, 13, 16, 24, 40, 57, 69, 56, 14, 17, 22, 29, 51, 87, 80, 62, 18, 22, 37, 56, 68, 109, 103, 77, 24, 35, 55, 64, 81, 104, 113, 92, 49, 64, 78, 87, 103, 121, 120, 101, 72, 92, 95, 98, 112, 100, 103, 99], N = 0;N < 64; N++) {
          var X = n((Y[N] * v + 50) / 100);
          X < 1 ? X = 1 : X > 255 && (X = 255), a[S[N]] = X;
        }
        for (var $ = [17, 18, 24, 47, 99, 99, 99, 99, 18, 21, 26, 66, 99, 99, 99, 99, 24, 26, 56, 99, 99, 99, 99, 99, 47, 66, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99], D = 0;D < 64; D++) {
          var fe = n(($[D] * v + 50) / 100);
          fe < 1 ? fe = 1 : fe > 255 && (fe = 255), i2[S[D]] = fe;
        }
        for (var he = [1, 1.387039845, 1.306562965, 1.175875602, 1, 0.785694958, 0.5411961, 0.275899379], we = 0, ge = 0;ge < 8; ge++)
          for (var k = 0;k < 8; k++)
            s[we] = 1 / (a[S[we]] * he[ge] * he[k] * 8), l[we] = 1 / (i2[S[we]] * he[ge] * he[k] * 8), we++;
      }
      function te2(v, Y) {
        for (var N = 0, X = 0, $ = new Array, D = 1;D <= 16; D++) {
          for (var fe = 1;fe <= v[D]; fe++)
            $[Y[X]] = [], $[Y[X]][0] = N, $[Y[X]][1] = D, X++, N++;
          N *= 2;
        }
        return $;
      }
      function Fe() {
        o = te2(E, G), h = te2(z, P), u = te2(V, C), c = te2(H, de);
      }
      function ie() {
        for (var v = 1, Y = 2, N = 1;N <= 15; N++) {
          for (var X = v;X < Y; X++)
            d[32767 + X] = N, p[32767 + X] = [], p[32767 + X][1] = N, p[32767 + X][0] = X;
          for (var $ = -(Y - 1);$ <= -v; $++)
            d[32767 + $] = N, p[32767 + $] = [], p[32767 + $][1] = N, p[32767 + $][0] = Y - 1 + $;
          v <<= 1, Y <<= 1;
        }
      }
      function ee() {
        for (var v = 0;v < 256; v++)
          T[v] = 19595 * v, T[v + 256 >> 0] = 38470 * v, T[v + 512 >> 0] = 7471 * v + 32768, T[v + 768 >> 0] = -11059 * v, T[v + 1024 >> 0] = -21709 * v, T[v + 1280 >> 0] = 32768 * v + 8421375, T[v + 1536 >> 0] = -27439 * v, T[v + 1792 >> 0] = -5329 * v;
      }
      function J(v) {
        for (var Y = v[0], N = v[1] - 1;N >= 0; )
          Y & 1 << N && (I |= 1 << w), N--, w--, w < 0 && (I == 255 ? (g(255), g(0)) : g(I), w = 7, I = 0);
      }
      function g(v) {
        b.push(v);
      }
      function M(v) {
        g(v >> 8 & 255), g(v & 255);
      }
      function ue(v, Y) {
        var N, X, $, D, fe, he, we, ge, k = 0, q, K = 8, ye = 64;
        for (q = 0;q < K; ++q) {
          N = v[k], X = v[k + 1], $ = v[k + 2], D = v[k + 3], fe = v[k + 4], he = v[k + 5], we = v[k + 6], ge = v[k + 7];
          var O = N + ge, ae = N - ge, xe = X + we, Z = X - we, ce = $ + he, Pe = $ - he, be = D + fe, Re = D - fe, Ne = O + be, nt = O - be, ft = xe + ce, ht = xe - ce;
          v[k] = Ne + ft, v[k + 4] = Ne - ft;
          var Tt = (ht + nt) * 0.707106781;
          v[k + 2] = nt + Tt, v[k + 6] = nt - Tt, Ne = Re + Pe, ft = Pe + Z, ht = Z + ae;
          var wt = (Ne - ht) * 0.382683433, Yt = 0.5411961 * Ne + wt, Ft = 1.306562965 * ht + wt, kt = ft * 0.707106781, It = ae + kt, Ut = ae - kt;
          v[k + 5] = Ut + Yt, v[k + 3] = Ut - Yt, v[k + 1] = It + Ft, v[k + 7] = It - Ft, k += 8;
        }
        for (k = 0, q = 0;q < K; ++q) {
          N = v[k], X = v[k + 8], $ = v[k + 16], D = v[k + 24], fe = v[k + 32], he = v[k + 40], we = v[k + 48], ge = v[k + 56];
          var vn = N + ge, hr = N - ge, gn = X + we, bn = X - we, yn = $ + he, Tn = $ - he, wn = D + fe, Ki = D - fe, _t = vn + wn, ur = vn - wn, Wt = gn + yn, Vt = gn - yn;
          v[k] = _t + Wt, v[k + 32] = _t - Wt;
          var Fn = (Vt + ur) * 0.707106781;
          v[k + 16] = ur + Fn, v[k + 48] = ur - Fn, _t = Ki + Tn, Wt = Tn + bn, Vt = bn + hr;
          var kn = (_t - Vt) * 0.382683433, In = 0.5411961 * _t + kn, Un = 1.306562965 * Vt + kn, _n = Wt * 0.707106781, Pn = hr + _n, Bn = hr - _n;
          v[k + 40] = Bn + In, v[k + 24] = Bn - In, v[k + 8] = Pn + Un, v[k + 56] = Pn - Un, k++;
        }
        var Lt;
        for (q = 0;q < ye; ++q)
          Lt = v[q] * Y[q], m[q] = Lt > 0 ? Lt + 0.5 | 0 : Lt - 0.5 | 0;
        return m;
      }
      function me() {
        M(65504), M(16), g(74), g(70), g(73), g(70), g(0), g(1), g(1), g(0), M(1), M(1), g(0), g(0);
      }
      function se(v) {
        if (v) {
          M(65505), v[0] === 69 && v[1] === 120 && v[2] === 105 && v[3] === 102 ? M(v.length + 2) : (M(v.length + 5 + 2), g(69), g(120), g(105), g(102), g(0));
          for (var Y = 0;Y < v.length; Y++)
            g(v[Y]);
        }
      }
      function oe(v, Y) {
        M(65472), M(17), g(8), M(Y), M(v), g(3), g(1), g(17), g(0), g(2), g(17), g(1), g(3), g(17), g(1);
      }
      function re() {
        M(65499), M(132), g(0);
        for (var v = 0;v < 64; v++)
          g(a[v]);
        g(1);
        for (var Y = 0;Y < 64; Y++)
          g(i2[Y]);
      }
      function A() {
        M(65476), M(418), g(0);
        for (var v = 0;v < 16; v++)
          g(E[v + 1]);
        for (var Y = 0;Y <= 11; Y++)
          g(G[Y]);
        g(16);
        for (var N = 0;N < 16; N++)
          g(V[N + 1]);
        for (var X = 0;X <= 161; X++)
          g(C[X]);
        g(1);
        for (var $ = 0;$ < 16; $++)
          g(z[$ + 1]);
        for (var D = 0;D <= 11; D++)
          g(P[D]);
        g(17);
        for (var fe = 0;fe < 16; fe++)
          g(H[fe + 1]);
        for (var he = 0;he <= 161; he++)
          g(de[he]);
      }
      function _(v) {
        typeof v > "u" || v.constructor !== Array || v.forEach((Y) => {
          if (typeof Y == "string") {
            M(65534);
            var N = Y.length;
            M(N + 2);
            var X;
            for (X = 0;X < N; X++)
              g(Y.charCodeAt(X));
          }
        });
      }
      function ve() {
        M(65498), M(12), g(3), g(1), g(0), g(2), g(17), g(3), g(17), g(0), g(63), g(0);
      }
      function Q(v, Y, N, X, $) {
        for (var D = $[0], fe = $[240], he, we = 16, ge = 63, k = 64, q = ue(v, Y), K = 0;K < k; ++K)
          F[S[K]] = q[K];
        var ye = F[0] - N;
        N = F[0], ye == 0 ? J(X[0]) : (he = 32767 + ye, J(X[d[he]]), J(p[he]));
        for (var O = 63;O > 0 && F[O] == 0; O--)
          ;
        if (O == 0)
          return J(D), N;
        for (var ae = 1, xe;ae <= O; ) {
          for (var Z = ae;F[ae] == 0 && ae <= O; ++ae)
            ;
          var ce = ae - Z;
          if (ce >= we) {
            xe = ce >> 4;
            for (var Pe = 1;Pe <= xe; ++Pe)
              J(fe);
            ce = ce & 15;
          }
          he = 32767 + F[ae], J($[(ce << 4) + d[he]]), J(p[he]), ae++;
        }
        return O != ge && J(D), N;
      }
      function ne() {
        for (var v = String.fromCharCode, Y = 0;Y < 256; Y++)
          W[Y] = v(Y);
      }
      this.encode = function(v, Y) {
        var N = new Date().getTime();
        Y && He(Y), b = new Array, I = 0, w = 7, M(65496), me(), _(v.comments), se(v.exifBuffer), re(), oe(v.width, v.height), A(), ve();
        var X = 0, $ = 0, D = 0;
        I = 0, w = 7, this.encode.displayName = "_encode_";
        for (var { data: fe, width: he, height: we } = v, ge = he * 4, k = he * 3, q, K = 0, ye, O, ae, xe, Z, ce, Pe, be;K < we; ) {
          for (q = 0;q < ge; ) {
            for (xe = ge * K + q, Z = xe, ce = -1, Pe = 0, be = 0;be < 64; be++)
              Pe = be >> 3, ce = (be & 7) * 4, Z = xe + Pe * ge + ce, K + Pe >= we && (Z -= ge * (K + 1 + Pe - we)), q + ce >= ge && (Z -= q + ce - ge + 4), ye = fe[Z++], O = fe[Z++], ae = fe[Z++], x2[be] = (T[ye] + T[O + 256 >> 0] + T[ae + 512 >> 0] >> 16) - 128, U[be] = (T[ye + 768 >> 0] + T[O + 1024 >> 0] + T[ae + 1280 >> 0] >> 16) - 128, y[be] = (T[ye + 1280 >> 0] + T[O + 1536 >> 0] + T[ae + 1792 >> 0] >> 16) - 128;
            X = Q(x2, s, X, o, u), $ = Q(U, l, $, h, c), D = Q(y, l, D, h, c), q += 32;
          }
          K += 8;
        }
        if (w >= 0) {
          var Re = [];
          Re[1] = w + 1, Re[0] = (1 << w + 1) - 1, J(Re);
        }
        if (M(65497), typeof lr > "u")
          return new Uint8Array(b);
        return Buffer.from(b);
        var Ne, nt;
      };
      function He(v) {
        if (v <= 0 && (v = 1), v > 100 && (v = 100), R != v) {
          var Y = 0;
          v < 50 ? Y = Math.floor(5000 / v) : Y = Math.floor(200 - v * 2), le(Y), R = v;
        }
      }
      function We() {
        var v = new Date().getTime();
        t || (t = 50), ne(), Fe(), ie(), ee(), He(t);
        var Y = new Date().getTime() - v;
      }
      We();
    }
    typeof lr < "u" ? lr.exports = Vi : typeof window < "u" && (window["jpeg-js"] = window["jpeg-js"] || {}, window["jpeg-js"].encode = Vi);
    function Vi(t, e) {
      typeof e > "u" && (e = 50);
      var r = new th(e), n = r.encode(t, e);
      return { data: n, width: t.width, height: t.height };
    }
  });
  var Ni = L((Xu, xn) => {
    var mn = function() {
      var e = new Int32Array([0, 1, 8, 16, 9, 2, 3, 10, 17, 24, 32, 25, 18, 11, 4, 5, 12, 19, 26, 33, 40, 48, 41, 34, 27, 20, 13, 6, 7, 14, 21, 28, 35, 42, 49, 56, 57, 50, 43, 36, 29, 22, 15, 23, 30, 37, 44, 51, 58, 59, 52, 45, 38, 31, 39, 46, 53, 60, 61, 54, 47, 55, 62, 63]), r = 4017, n = 799, a = 3406, i2 = 2276, s = 1567, l = 3784, o = 5793, h = 2896;
      function u() {}
      function c(w, x2) {
        for (var U = 0, y = [], W, T, R = 16;R > 0 && !w[R - 1]; )
          R--;
        y.push({ children: [], index: 0 });
        var S = y[0], E;
        for (W = 0;W < R; W++) {
          for (T = 0;T < w[W]; T++) {
            for (S = y.pop(), S.children[S.index] = x2[U];S.index > 0; ) {
              if (y.length === 0)
                throw new Error("Could not recreate Huffman Table");
              S = y.pop();
            }
            for (S.index++, y.push(S);y.length <= W; )
              y.push(E = { children: [], index: 0 }), S.children[S.index] = E.children, S = E;
            U++;
          }
          W + 1 < R && (y.push(E = { children: [], index: 0 }), S.children[S.index] = E.children, S = E);
        }
        return y[0].children;
      }
      function p(w, x2, U, y, W, T, R, S, E, G) {
        var { precision: V, samplesPerLine: C, scanLines: z, mcusPerLine: P, progressive: H, maxH: de, maxV: le } = U, te2 = x2, Fe = 0, ie = 0;
        function ee() {
          if (ie > 0)
            return ie--, Fe >> ie & 1;
          if (Fe = w[x2++], Fe == 255) {
            var k = w[x2++];
            if (k)
              throw new Error("unexpected marker: " + (Fe << 8 | k).toString(16));
          }
          return ie = 7, Fe >>> 7;
        }
        function J(k) {
          for (var q = k, K;(K = ee()) !== null; ) {
            if (q = q[K], typeof q == "number")
              return q;
            if (typeof q != "object")
              throw new Error("invalid huffman sequence");
          }
          return null;
        }
        function g(k) {
          for (var q = 0;k > 0; ) {
            var K = ee();
            if (K === null)
              return;
            q = q << 1 | K, k--;
          }
          return q;
        }
        function M(k) {
          var q = g(k);
          return q >= 1 << k - 1 ? q : q + (-1 << k) + 1;
        }
        function ue(k, q) {
          var K = J(k.huffmanTableDC), ye = K === 0 ? 0 : M(K);
          q[0] = k.pred += ye;
          for (var O = 1;O < 64; ) {
            var ae = J(k.huffmanTableAC), xe = ae & 15, Z = ae >> 4;
            if (xe === 0) {
              if (Z < 15)
                break;
              O += 16;
              continue;
            }
            O += Z;
            var ce = e[O];
            q[ce] = M(xe), O++;
          }
        }
        function me(k, q) {
          var K = J(k.huffmanTableDC), ye = K === 0 ? 0 : M(K) << E;
          q[0] = k.pred += ye;
        }
        function se(k, q) {
          q[0] |= ee() << E;
        }
        var oe = 0;
        function re(k, q) {
          if (oe > 0) {
            oe--;
            return;
          }
          for (var K = T, ye = R;K <= ye; ) {
            var O = J(k.huffmanTableAC), ae = O & 15, xe = O >> 4;
            if (ae === 0) {
              if (xe < 15) {
                oe = g(xe) + (1 << xe) - 1;
                break;
              }
              K += 16;
              continue;
            }
            K += xe;
            var Z = e[K];
            q[Z] = M(ae) * (1 << E), K++;
          }
        }
        var A = 0, _;
        function ve(k, q) {
          for (var K = T, ye = R, O = 0;K <= ye; ) {
            var ae = e[K], xe = q[ae] < 0 ? -1 : 1;
            switch (A) {
              case 0:
                var Z = J(k.huffmanTableAC), ce = Z & 15, O = Z >> 4;
                if (ce === 0)
                  O < 15 ? (oe = g(O) + (1 << O), A = 4) : (O = 16, A = 1);
                else {
                  if (ce !== 1)
                    throw new Error("invalid ACn encoding");
                  _ = M(ce), A = O ? 2 : 3;
                }
                continue;
              case 1:
              case 2:
                q[ae] ? q[ae] += (ee() << E) * xe : (O--, O === 0 && (A = A == 2 ? 3 : 0));
                break;
              case 3:
                q[ae] ? q[ae] += (ee() << E) * xe : (q[ae] = _ << E, A = 0);
                break;
              case 4:
                q[ae] && (q[ae] += (ee() << E) * xe);
                break;
            }
            K++;
          }
          A === 4 && (oe--, oe === 0 && (A = 0));
        }
        function Q(k, q, K, ye, O) {
          var ae = K / P | 0, xe = K % P, Z = ae * k.v + ye, ce = xe * k.h + O;
          k.blocks[Z] === undefined && G.tolerantDecoding || q(k, k.blocks[Z][ce]);
        }
        function ne(k, q, K) {
          var ye = K / k.blocksPerLine | 0, O = K % k.blocksPerLine;
          k.blocks[ye] === undefined && G.tolerantDecoding || q(k, k.blocks[ye][O]);
        }
        var He = y.length, We, v, Y, N, X, $;
        H ? T === 0 ? $ = S === 0 ? me : se : $ = S === 0 ? re : ve : $ = ue;
        var D = 0, fe, he;
        He == 1 ? he = y[0].blocksPerLine * y[0].blocksPerColumn : he = P * U.mcusPerColumn, W || (W = he);
        for (var we, ge;D < he; ) {
          for (v = 0;v < He; v++)
            y[v].pred = 0;
          if (oe = 0, He == 1)
            for (We = y[0], X = 0;X < W; X++)
              ne(We, $, D), D++;
          else
            for (X = 0;X < W; X++) {
              for (v = 0;v < He; v++)
                for (We = y[v], we = We.h, ge = We.v, Y = 0;Y < ge; Y++)
                  for (N = 0;N < we; N++)
                    Q(We, $, D, Y, N);
              if (D++, D === he)
                break;
            }
          if (D === he)
            do {
              if (w[x2] === 255 && w[x2 + 1] !== 0)
                break;
              x2 += 1;
            } while (x2 < w.length - 2);
          if (ie = 0, fe = w[x2] << 8 | w[x2 + 1], fe < 65280)
            throw new Error("marker was not found");
          if (fe >= 65488 && fe <= 65495)
            x2 += 2;
          else
            break;
        }
        return x2 - te2;
      }
      function d(w, x2) {
        var U = [], y = x2.blocksPerLine, W = x2.blocksPerColumn, T = y << 3, R = new Int32Array(64), S = new Uint8Array(64);
        function E(te2, Fe, ie) {
          var ee = x2.quantizationTable, J, g, M, ue, me, se, oe, re, A, _ = ie, ve;
          for (ve = 0;ve < 64; ve++)
            _[ve] = te2[ve] * ee[ve];
          for (ve = 0;ve < 8; ++ve) {
            var Q = 8 * ve;
            if (_[1 + Q] == 0 && _[2 + Q] == 0 && _[3 + Q] == 0 && _[4 + Q] == 0 && _[5 + Q] == 0 && _[6 + Q] == 0 && _[7 + Q] == 0) {
              A = o * _[0 + Q] + 512 >> 10, _[0 + Q] = A, _[1 + Q] = A, _[2 + Q] = A, _[3 + Q] = A, _[4 + Q] = A, _[5 + Q] = A, _[6 + Q] = A, _[7 + Q] = A;
              continue;
            }
            J = o * _[0 + Q] + 128 >> 8, g = o * _[4 + Q] + 128 >> 8, M = _[2 + Q], ue = _[6 + Q], me = h * (_[1 + Q] - _[7 + Q]) + 128 >> 8, re = h * (_[1 + Q] + _[7 + Q]) + 128 >> 8, se = _[3 + Q] << 4, oe = _[5 + Q] << 4, A = J - g + 1 >> 1, J = J + g + 1 >> 1, g = A, A = M * l + ue * s + 128 >> 8, M = M * s - ue * l + 128 >> 8, ue = A, A = me - oe + 1 >> 1, me = me + oe + 1 >> 1, oe = A, A = re + se + 1 >> 1, se = re - se + 1 >> 1, re = A, A = J - ue + 1 >> 1, J = J + ue + 1 >> 1, ue = A, A = g - M + 1 >> 1, g = g + M + 1 >> 1, M = A, A = me * i2 + re * a + 2048 >> 12, me = me * a - re * i2 + 2048 >> 12, re = A, A = se * n + oe * r + 2048 >> 12, se = se * r - oe * n + 2048 >> 12, oe = A, _[0 + Q] = J + re, _[7 + Q] = J - re, _[1 + Q] = g + oe, _[6 + Q] = g - oe, _[2 + Q] = M + se, _[5 + Q] = M - se, _[3 + Q] = ue + me, _[4 + Q] = ue - me;
          }
          for (ve = 0;ve < 8; ++ve) {
            var ne = ve;
            if (_[8 + ne] == 0 && _[16 + ne] == 0 && _[24 + ne] == 0 && _[32 + ne] == 0 && _[40 + ne] == 0 && _[48 + ne] == 0 && _[56 + ne] == 0) {
              A = o * ie[ve + 0] + 8192 >> 14, _[0 + ne] = A, _[8 + ne] = A, _[16 + ne] = A, _[24 + ne] = A, _[32 + ne] = A, _[40 + ne] = A, _[48 + ne] = A, _[56 + ne] = A;
              continue;
            }
            J = o * _[0 + ne] + 2048 >> 12, g = o * _[32 + ne] + 2048 >> 12, M = _[16 + ne], ue = _[48 + ne], me = h * (_[8 + ne] - _[56 + ne]) + 2048 >> 12, re = h * (_[8 + ne] + _[56 + ne]) + 2048 >> 12, se = _[24 + ne], oe = _[40 + ne], A = J - g + 1 >> 1, J = J + g + 1 >> 1, g = A, A = M * l + ue * s + 2048 >> 12, M = M * s - ue * l + 2048 >> 12, ue = A, A = me - oe + 1 >> 1, me = me + oe + 1 >> 1, oe = A, A = re + se + 1 >> 1, se = re - se + 1 >> 1, re = A, A = J - ue + 1 >> 1, J = J + ue + 1 >> 1, ue = A, A = g - M + 1 >> 1, g = g + M + 1 >> 1, M = A, A = me * i2 + re * a + 2048 >> 12, me = me * a - re * i2 + 2048 >> 12, re = A, A = se * n + oe * r + 2048 >> 12, se = se * r - oe * n + 2048 >> 12, oe = A, _[0 + ne] = J + re, _[56 + ne] = J - re, _[8 + ne] = g + oe, _[48 + ne] = g - oe, _[16 + ne] = M + se, _[40 + ne] = M - se, _[24 + ne] = ue + me, _[32 + ne] = ue - me;
          }
          for (ve = 0;ve < 64; ++ve) {
            var He = 128 + (_[ve] + 8 >> 4);
            Fe[ve] = He < 0 ? 0 : He > 255 ? 255 : He;
          }
        }
        I(T * W * 8);
        for (var G, V, C = 0;C < W; C++) {
          var z = C << 3;
          for (G = 0;G < 8; G++)
            U.push(new Uint8Array(T));
          for (var P = 0;P < y; P++) {
            E(x2.blocks[C][P], S, R);
            var H = 0, de = P << 3;
            for (V = 0;V < 8; V++) {
              var le = U[z + V];
              for (G = 0;G < 8; G++)
                le[de + G] = S[H++];
            }
          }
        }
        return U;
      }
      function m(w) {
        return w < 0 ? 0 : w > 255 ? 255 : w;
      }
      u.prototype = { load: function(x2) {
        var U = new XMLHttpRequest;
        U.open("GET", x2, true), U.responseType = "arraybuffer", U.onload = function() {
          var y = new Uint8Array(U.response || U.mozResponseArrayBuffer);
          this.parse(y), this.onload && this.onload();
        }.bind(this), U.send(null);
      }, parse: function(x2) {
        var U = this.opts.maxResolutionInMP * 1000 * 1000, y = 0, W = x2.length;
        function T() {
          var Z = x2[y] << 8 | x2[y + 1];
          return y += 2, Z;
        }
        function R() {
          var Z = T(), ce = x2.subarray(y, y + Z - 2);
          return y += ce.length, ce;
        }
        function S(Z) {
          var ce = 1, Pe = 1, be, Re;
          for (Re in Z.components)
            Z.components.hasOwnProperty(Re) && (be = Z.components[Re], ce < be.h && (ce = be.h), Pe < be.v && (Pe = be.v));
          var Ne = Math.ceil(Z.samplesPerLine / 8 / ce), nt = Math.ceil(Z.scanLines / 8 / Pe);
          for (Re in Z.components)
            if (Z.components.hasOwnProperty(Re)) {
              be = Z.components[Re];
              var ft = Math.ceil(Math.ceil(Z.samplesPerLine / 8) * be.h / ce), ht = Math.ceil(Math.ceil(Z.scanLines / 8) * be.v / Pe), Tt = Ne * be.h, wt = nt * be.v, Yt = wt * Tt, Ft = [];
              I(Yt * 256);
              for (var kt = 0;kt < wt; kt++) {
                for (var It = [], Ut = 0;Ut < Tt; Ut++)
                  It.push(new Int32Array(64));
                Ft.push(It);
              }
              be.blocksPerLine = ft, be.blocksPerColumn = ht, be.blocks = Ft;
            }
          Z.maxH = ce, Z.maxV = Pe, Z.mcusPerLine = Ne, Z.mcusPerColumn = nt;
        }
        var E = null, G = null, V = null, C, z, P = [], H = [], de = [], le = [], te2 = T(), Fe = -1;
        if (this.comments = [], te2 != 65496)
          throw new Error("SOI not found");
        for (te2 = T();te2 != 65497; ) {
          var ie, ee, J;
          switch (te2) {
            case 65280:
              break;
            case 65504:
            case 65505:
            case 65506:
            case 65507:
            case 65508:
            case 65509:
            case 65510:
            case 65511:
            case 65512:
            case 65513:
            case 65514:
            case 65515:
            case 65516:
            case 65517:
            case 65518:
            case 65519:
            case 65534:
              var g = R();
              if (te2 === 65534) {
                var M = String.fromCharCode.apply(null, g);
                this.comments.push(M);
              }
              te2 === 65504 && g[0] === 74 && g[1] === 70 && g[2] === 73 && g[3] === 70 && g[4] === 0 && (E = { version: { major: g[5], minor: g[6] }, densityUnits: g[7], xDensity: g[8] << 8 | g[9], yDensity: g[10] << 8 | g[11], thumbWidth: g[12], thumbHeight: g[13], thumbData: g.subarray(14, 14 + 3 * g[12] * g[13]) }), te2 === 65505 && g[0] === 69 && g[1] === 120 && g[2] === 105 && g[3] === 102 && g[4] === 0 && (this.exifBuffer = g.subarray(5, g.length)), te2 === 65518 && g[0] === 65 && g[1] === 100 && g[2] === 111 && g[3] === 98 && g[4] === 101 && g[5] === 0 && (G = { version: g[6], flags0: g[7] << 8 | g[8], flags1: g[9] << 8 | g[10], transformCode: g[11] });
              break;
            case 65499:
              for (var ue = T(), me = ue + y - 2;y < me; ) {
                var se = x2[y++];
                I(256);
                var oe = new Int32Array(64);
                if (se >> 4)
                  if (se >> 4 === 1)
                    for (ee = 0;ee < 64; ee++) {
                      var re = e[ee];
                      oe[re] = T();
                    }
                  else
                    throw new Error("DQT: invalid table spec");
                else
                  for (ee = 0;ee < 64; ee++) {
                    var re = e[ee];
                    oe[re] = x2[y++];
                  }
                P[se & 15] = oe;
              }
              break;
            case 65472:
            case 65473:
            case 65474:
              T(), C = {}, C.extended = te2 === 65473, C.progressive = te2 === 65474, C.precision = x2[y++], C.scanLines = T(), C.samplesPerLine = T(), C.components = {}, C.componentsOrder = [];
              var A = C.scanLines * C.samplesPerLine;
              if (A > U) {
                var _ = Math.ceil((A - U) / 1e6);
                throw new Error(`maxResolutionInMP limit exceeded by ${_}MP`);
              }
              var ve = x2[y++], Q, ne = 0, He = 0;
              for (ie = 0;ie < ve; ie++) {
                Q = x2[y];
                var We = x2[y + 1] >> 4, v = x2[y + 1] & 15, Y = x2[y + 2];
                if (We <= 0 || v <= 0)
                  throw new Error("Invalid sampling factor, expected values above 0");
                C.componentsOrder.push(Q), C.components[Q] = { h: We, v, quantizationIdx: Y }, y += 3;
              }
              S(C), H.push(C);
              break;
            case 65476:
              var N = T();
              for (ie = 2;ie < N; ) {
                var X = x2[y++], $ = new Uint8Array(16), D = 0;
                for (ee = 0;ee < 16; ee++, y++)
                  D += $[ee] = x2[y];
                I(16 + D);
                var fe = new Uint8Array(D);
                for (ee = 0;ee < D; ee++, y++)
                  fe[ee] = x2[y];
                ie += 17 + D, (X >> 4 ? de : le)[X & 15] = c($, fe);
              }
              break;
            case 65501:
              T(), z = T();
              break;
            case 65500:
              T(), T();
              break;
            case 65498:
              var he = T(), we = x2[y++], ge = [], k;
              for (ie = 0;ie < we; ie++) {
                k = C.components[x2[y++]];
                var q = x2[y++];
                k.huffmanTableDC = le[q >> 4], k.huffmanTableAC = de[q & 15], ge.push(k);
              }
              var K = x2[y++], ye = x2[y++], O = x2[y++], ae = p(x2, y, C, ge, z, K, ye, O >> 4, O & 15, this.opts);
              y += ae;
              break;
            case 65535:
              x2[y] !== 255 && y--;
              break;
            default:
              if (x2[y - 3] == 255 && x2[y - 2] >= 192 && x2[y - 2] <= 254) {
                y -= 3;
                break;
              } else if (te2 === 224 || te2 == 225) {
                if (Fe !== -1)
                  throw new Error(`first unknown JPEG marker at offset ${Fe.toString(16)}, second unknown JPEG marker ${te2.toString(16)} at offset ${(y - 1).toString(16)}`);
                Fe = y - 1;
                let Z = T();
                if (x2[y + Z - 2] === 255) {
                  y += Z - 2;
                  break;
                }
              }
              throw new Error("unknown JPEG marker " + te2.toString(16));
          }
          te2 = T();
        }
        if (H.length != 1)
          throw new Error("only single frame JPEGs supported");
        for (var ie = 0;ie < H.length; ie++) {
          var xe = H[ie].components;
          for (var ee in xe)
            xe[ee].quantizationTable = P[xe[ee].quantizationIdx], delete xe[ee].quantizationIdx;
        }
        this.width = C.samplesPerLine, this.height = C.scanLines, this.jfif = E, this.adobe = G, this.components = [];
        for (var ie = 0;ie < C.componentsOrder.length; ie++) {
          var k = C.components[C.componentsOrder[ie]];
          this.components.push({ lines: d(C, k), scaleX: k.h / C.maxH, scaleY: k.v / C.maxV });
        }
      }, getData: function(x2, U) {
        var y = this.width / x2, W = this.height / U, T, R, S, E, G, V, C, z, P, H, de = 0, le, te2, Fe, ie, ee, J, g, M, ue, me, se, oe = x2 * U * this.components.length;
        I(oe);
        var re = new Uint8Array(oe);
        switch (this.components.length) {
          case 1:
            for (T = this.components[0], H = 0;H < U; H++)
              for (G = T.lines[0 | H * T.scaleY * W], P = 0;P < x2; P++)
                le = G[0 | P * T.scaleX * y], re[de++] = le;
            break;
          case 2:
            for (T = this.components[0], R = this.components[1], H = 0;H < U; H++)
              for (G = T.lines[0 | H * T.scaleY * W], V = R.lines[0 | H * R.scaleY * W], P = 0;P < x2; P++)
                le = G[0 | P * T.scaleX * y], re[de++] = le, le = V[0 | P * R.scaleX * y], re[de++] = le;
            break;
          case 3:
            for (se = true, this.adobe && this.adobe.transformCode ? se = true : typeof this.opts.colorTransform < "u" && (se = !!this.opts.colorTransform), T = this.components[0], R = this.components[1], S = this.components[2], H = 0;H < U; H++)
              for (G = T.lines[0 | H * T.scaleY * W], V = R.lines[0 | H * R.scaleY * W], C = S.lines[0 | H * S.scaleY * W], P = 0;P < x2; P++)
                se ? (le = G[0 | P * T.scaleX * y], te2 = V[0 | P * R.scaleX * y], Fe = C[0 | P * S.scaleX * y], M = m(le + 1.402 * (Fe - 128)), ue = m(le - 0.3441363 * (te2 - 128) - 0.71413636 * (Fe - 128)), me = m(le + 1.772 * (te2 - 128))) : (M = G[0 | P * T.scaleX * y], ue = V[0 | P * R.scaleX * y], me = C[0 | P * S.scaleX * y]), re[de++] = M, re[de++] = ue, re[de++] = me;
            break;
          case 4:
            if (!this.adobe)
              throw new Error("Unsupported color mode (4 components)");
            for (se = false, this.adobe && this.adobe.transformCode ? se = true : typeof this.opts.colorTransform < "u" && (se = !!this.opts.colorTransform), T = this.components[0], R = this.components[1], S = this.components[2], E = this.components[3], H = 0;H < U; H++)
              for (G = T.lines[0 | H * T.scaleY * W], V = R.lines[0 | H * R.scaleY * W], C = S.lines[0 | H * S.scaleY * W], z = E.lines[0 | H * E.scaleY * W], P = 0;P < x2; P++)
                se ? (le = G[0 | P * T.scaleX * y], te2 = V[0 | P * R.scaleX * y], Fe = C[0 | P * S.scaleX * y], ie = z[0 | P * E.scaleX * y], ee = 255 - m(le + 1.402 * (Fe - 128)), J = 255 - m(le - 0.3441363 * (te2 - 128) - 0.71413636 * (Fe - 128)), g = 255 - m(le + 1.772 * (te2 - 128))) : (ee = G[0 | P * T.scaleX * y], J = V[0 | P * R.scaleX * y], g = C[0 | P * S.scaleX * y], ie = z[0 | P * E.scaleX * y]), re[de++] = 255 - ee, re[de++] = 255 - J, re[de++] = 255 - g, re[de++] = 255 - ie;
            break;
          default:
            throw new Error("Unsupported color mode");
        }
        return re;
      }, copyToImageData: function(x2, U) {
        var { width: y, height: W, data: T } = x2, R = this.getData(y, W), S = 0, E = 0, G, V, C, z, P, H, de, le, te2;
        switch (this.components.length) {
          case 1:
            for (V = 0;V < W; V++)
              for (G = 0;G < y; G++)
                C = R[S++], T[E++] = C, T[E++] = C, T[E++] = C, U && (T[E++] = 255);
            break;
          case 3:
            for (V = 0;V < W; V++)
              for (G = 0;G < y; G++)
                de = R[S++], le = R[S++], te2 = R[S++], T[E++] = de, T[E++] = le, T[E++] = te2, U && (T[E++] = 255);
            break;
          case 4:
            for (V = 0;V < W; V++)
              for (G = 0;G < y; G++)
                P = R[S++], H = R[S++], C = R[S++], z = R[S++], de = 255 - m(P * (1 - z / 255) + z), le = 255 - m(H * (1 - z / 255) + z), te2 = 255 - m(C * (1 - z / 255) + z), T[E++] = de, T[E++] = le, T[E++] = te2, U && (T[E++] = 255);
            break;
          default:
            throw new Error("Unsupported color mode");
        }
      } };
      var F = 0, b = 0;
      function I(w = 0) {
        var x2 = F + w;
        if (x2 > b) {
          var U = Math.ceil((x2 - b) / 1024 / 1024);
          throw new Error(`maxMemoryUsageInMB limit exceeded by at least ${U}MB`);
        }
        F = x2;
      }
      return u.resetMaxMemoryUsage = function(w) {
        F = 0, b = w;
      }, u.getBytesAllocated = function() {
        return F;
      }, u.requestMemoryAllocation = I, u;
    }();
    typeof xn < "u" ? xn.exports = zi : typeof window < "u" && (window["jpeg-js"] = window["jpeg-js"] || {}, window["jpeg-js"].decode = zi);
    function zi(t, e = {}) {
      var r = { colorTransform: undefined, useTArray: false, formatAsRGBA: true, tolerantDecoding: true, maxResolutionInMP: 100, maxMemoryUsageInMB: 512 }, n = { ...r, ...e }, a = new Uint8Array(t), i2 = new mn;
      i2.opts = n, mn.resetMaxMemoryUsage(n.maxMemoryUsageInMB * 1024 * 1024), i2.parse(a);
      var s = n.formatAsRGBA ? 4 : 3, l = i2.width * i2.height * s;
      try {
        mn.requestMemoryAllocation(l);
        var o = { width: i2.width, height: i2.height, exifBuffer: i2.exifBuffer, data: n.useTArray ? new Uint8Array(l) : Buffer.alloc(l) };
        i2.comments.length > 0 && (o.comments = i2.comments);
      } catch (h) {
        throw h instanceof RangeError ? new Error("Could not allocate enough memory for the image. Required: " + l) : h instanceof ReferenceError && h.message === "Buffer is not defined" ? new Error("Buffer is not globally defined in this environment. Consider setting useTArray to true") : h;
      }
      return i2.copyToImageData(o, n.formatAsRGBA), o;
    }
  });
  var ji = L((zu, Zi) => {
    var rh = Xi(), nh = Ni();
    Zi.exports = { encode: rh, decode: nh };
  });
  var hh = {};
  ts(hh, { Bitmap: () => ot, Context: () => Rt, debug_list_of_fonts: () => Yl, decodeJPEGFromStream: () => fh, decodePNGFromStream: () => oh, encodeJPEGToStream: () => lh, encodePNGToStream: () => sh, make: () => ih, measureText: () => nr, processTextPath: () => rr, registerFont: () => Ml });
  module.exports = rs(hh);
  var Pt = ((f) => (f[f.transparent = 0] = "transparent", f[f.aliceblue = 4042850303] = "aliceblue", f[f.antiquewhite = 4209760255] = "antiquewhite", f[f.aqua = 16777215] = "aqua", f[f.aquamarine = 2147472639] = "aquamarine", f[f.azure = 4043309055] = "azure", f[f.beige = 4126530815] = "beige", f[f.bisque = 4293182719] = "bisque", f[f.black = 255] = "black", f[f.blanchedalmond = 4293643775] = "blanchedalmond", f[f.blue = 65535] = "blue", f[f.blueviolet = 2318131967] = "blueviolet", f[f.brown = 2771004159] = "brown", f[f.burlywood = 3736635391] = "burlywood", f[f.cadetblue = 1604231423] = "cadetblue", f[f.chartreuse = 2147418367] = "chartreuse", f[f.chocolate = 3530104575] = "chocolate", f[f.coral = 4286533887] = "coral", f[f.cornflowerblue = 1687547391] = "cornflowerblue", f[f.cornsilk = 4294499583] = "cornsilk", f[f.crimson = 3692313855] = "crimson", f[f.cyan = 16777215] = "cyan", f[f.darkblue = 35839] = "darkblue", f[f.darkcyan = 9145343] = "darkcyan", f[f.darkgoldenrod = 3095792639] = "darkgoldenrod", f[f.darkgray = 2846468607] = "darkgray", f[f.darkgreen = 6553855] = "darkgreen", f[f.darkgrey = 2846468607] = "darkgrey", f[f.darkkhaki = 3182914559] = "darkkhaki", f[f.darkmagenta = 2332068863] = "darkmagenta", f[f.darkolivegreen = 1433087999] = "darkolivegreen", f[f.darkorange = 4287365375] = "darkorange", f[f.darkorchid = 2570243327] = "darkorchid", f[f.darkred = 2332033279] = "darkred", f[f.darksalmon = 3918953215] = "darksalmon", f[f.darkseagreen = 2411499519] = "darkseagreen", f[f.darkslateblue = 1211993087] = "darkslateblue", f[f.darkslategray = 793726975] = "darkslategray", f[f.darkslategrey = 793726975] = "darkslategrey", f[f.darkturquoise = 13554175] = "darkturquoise", f[f.darkviolet = 2483082239] = "darkviolet", f[f.deeppink = 4279538687] = "deeppink", f[f.deepskyblue = 12582911] = "deepskyblue", f[f.dimgray = 1768516095] = "dimgray", f[f.dimgrey = 1768516095] = "dimgrey", f[f.dodgerblue = 512819199] = "dodgerblue", f[f.firebrick = 2988581631] = "firebrick", f[f.floralwhite = 4294635775] = "floralwhite", f[f.forestgreen = 579543807] = "forestgreen", f[f.fuchsia = 4278255615] = "fuchsia", f[f.gainsboro = 3705462015] = "gainsboro", f[f.ghostwhite = 4177068031] = "ghostwhite", f[f.gold = 4292280575] = "gold", f[f.goldenrod = 3668254975] = "goldenrod", f[f.gray = 2155905279] = "gray", f[f.green = 8388863] = "green", f[f.greenyellow = 2919182335] = "greenyellow", f[f.grey = 2155905279] = "grey", f[f.honeydew = 4043305215] = "honeydew", f[f.hotpink = 4285117695] = "hotpink", f[f.indianred = 3445382399] = "indianred", f[f.indigo = 1258324735] = "indigo", f[f.ivory = 4294963455] = "ivory", f[f.khaki = 4041641215] = "khaki", f[f.lavender = 3873897215] = "lavender", f[f.lavenderblush = 4293981695] = "lavenderblush", f[f.lawngreen = 2096890111] = "lawngreen", f[f.lemonchiffon = 4294626815] = "lemonchiffon", f[f.lightblue = 2916673279] = "lightblue", f[f.lightcoral = 4034953471] = "lightcoral", f[f.lightcyan = 3774873599] = "lightcyan", f[f.lightgoldenrodyellow = 4210742015] = "lightgoldenrodyellow", f[f.lightgray = 3553874943] = "lightgray", f[f.lightgreen = 2431553791] = "lightgreen", f[f.lightgrey = 3553874943] = "lightgrey", f[f.lightpink = 4290167295] = "lightpink", f[f.lightsalmon = 4288707327] = "lightsalmon", f[f.lightseagreen = 548580095] = "lightseagreen", f[f.lightskyblue = 2278488831] = "lightskyblue", f[f.lightslategray = 2005441023] = "lightslategray", f[f.lightslategrey = 2005441023] = "lightslategrey", f[f.lightsteelblue = 2965692159] = "lightsteelblue", f[f.lightyellow = 4294959359] = "lightyellow", f[f.lime = 16711935] = "lime", f[f.limegreen = 852308735] = "limegreen", f[f.linen = 4210091775] = "linen", f[f.magenta = 4278255615] = "magenta", f[f.maroon = 2147483903] = "maroon", f[f.mediumaquamarine = 1724754687] = "mediumaquamarine", f[f.mediumblue = 52735] = "mediumblue", f[f.mediumorchid = 3126187007] = "mediumorchid", f[f.mediumpurple = 2473647103] = "mediumpurple", f[f.mediumseagreen = 1018393087] = "mediumseagreen", f[f.mediumslateblue = 2070474495] = "mediumslateblue", f[f.mediumspringgreen = 16423679] = "mediumspringgreen", f[f.mediumturquoise = 1221709055] = "mediumturquoise", f[f.mediumvioletred = 3340076543] = "mediumvioletred", f[f.midnightblue = 421097727] = "midnightblue", f[f.mintcream = 4127193855] = "mintcream", f[f.mistyrose = 4293190143] = "mistyrose", f[f.moccasin = 4293178879] = "moccasin", f[f.navajowhite = 4292783615] = "navajowhite", f[f.navy = 33023] = "navy", f[f.oldlace = 4260751103] = "oldlace", f[f.olive = 2155872511] = "olive", f[f.olivedrab = 1804477439] = "olivedrab", f[f.orange = 4289003775] = "orange", f[f.orangered = 4282712319] = "orangered", f[f.orchid = 3664828159] = "orchid", f[f.palegoldenrod = 4008225535] = "palegoldenrod", f[f.palegreen = 2566625535] = "palegreen", f[f.paleturquoise = 2951671551] = "paleturquoise", f[f.palevioletred = 3681588223] = "palevioletred", f[f.papayawhip = 4293907967] = "papayawhip", f[f.peachpuff = 4292524543] = "peachpuff", f[f.peru = 3448061951] = "peru", f[f.pink = 4290825215] = "pink", f[f.plum = 3718307327] = "plum", f[f.powderblue = 2967529215] = "powderblue", f[f.purple = 2147516671] = "purple", f[f.rebeccapurple = 1714657791] = "rebeccapurple", f[f.red = 4278190335] = "red", f[f.rosybrown = 3163525119] = "rosybrown", f[f.royalblue = 1097458175] = "royalblue", f[f.saddlebrown = 2336560127] = "saddlebrown", f[f.salmon = 4202722047] = "salmon", f[f.sandybrown = 4104413439] = "sandybrown", f[f.seagreen = 780883967] = "seagreen", f[f.seashell = 4294307583] = "seashell", f[f.sienna = 2689740287] = "sienna", f[f.silver = 3233857791] = "silver", f[f.skyblue = 2278484991] = "skyblue", f[f.slateblue = 1784335871] = "slateblue", f[f.slategray = 1887473919] = "slategray", f[f.slategrey = 1887473919] = "slategrey", f[f.snow = 4294638335] = "snow", f[f.springgreen = 16744447] = "springgreen", f[f.steelblue = 1182971135] = "steelblue", f[f.tan = 3535047935] = "tan", f[f.teal = 8421631] = "teal", f[f.thistle = 3636451583] = "thistle", f[f.tomato = 4284696575] = "tomato", f[f.turquoise = 1088475391] = "turquoise", f[f.violet = 4001558271] = "violet", f[f.wheat = 4125012991] = "wheat", f[f.white = 4294967295] = "white", f[f.whitesmoke = 4126537215] = "whitesmoke", f[f.yellow = 4294902015] = "yellow", f[f.yellowgreen = 2597139199] = "yellowgreen", f))(Pt || {});
  var Ze = function(t, e, r, n) {
    return (t << 24 | e << 16 | r << 8 | n) >>> 0;
  };
  var zt = function(t, e) {
    return t >>> 8 * (3 - e) & 255;
  };
  var je = function(t) {
    return [zt(t, 0), zt(t, 1), zt(t, 2), zt(t, 3)];
  };
  var Bt = function(t) {
    return t >>> 0;
  };
  var Qe = function(t, ...e) {
    let r = t;
    for (let n = 0;n < e.length; n += 1)
      r = r | e[n];
    return r >>> 0;
  };
  var St = function(t, ...e) {
    let r = t;
    for (let n = 0;n < e.length; n += 1)
      r = r & e[n];
    return r >>> 0;
  };
  var Nt = function(t, e) {
    return t << e >>> 0;
  };
  function Et(t, e, r) {
    return t < e ? e : t > r ? r : t;
  }
  var En = function(t, e, r) {
    return t + (e - t) * r;
  };
  function Ct(t) {
    if (!t)
      return 0;
    if (t.indexOf("#") === 0) {
      if (t.length === 4) {
        let e = parseInt(t[1], 16), r = e << 4 | e, n = parseInt(t[2], 16), a = n << 4 | n, i2 = parseInt(t[3], 16), s = i2 << 4 | i2, l = Bt(r << 16 | a << 8 | s);
        return l = Nt(l, 8), Qe(l, 255);
      } else if (t.length === 5) {
        let e = parseInt(t[1], 16), r = e << 4 | e, n = parseInt(t[2], 16), a = n << 4 | n, i2 = parseInt(t[3], 16), s = i2 << 4 | i2, l = parseInt(t[4], 16), o = l << 4 | l, h = Bt(r << 16 | a << 8 | s);
        return h = Nt(h, 8), Qe(h, o);
      } else if (t.length === 7) {
        let e = Bt(parseInt(t.substring(1), 16));
        return e = Nt(e, 8), Qe(e, 255);
      } else if (t.length === 9)
        return Bt(parseInt(t.substring(1), 16));
    }
    if (t.indexOf("rgba") === 0) {
      let e = t.trim().substring(4).replace("(", "").replace(")", "").split(",");
      return Ze(parseInt(e[0]), parseInt(e[1]), parseInt(e[2]), Math.floor(parseFloat(e[3]) * 255));
    }
    if (t.indexOf("rgb") === 0) {
      let e = t.trim().substring(3).replace("(", "").replace(")", "").split(",");
      return Ze(parseInt(e[0]), parseInt(e[1]), parseInt(e[2]), 255);
    }
    if (Ke.call(Pt, t))
      return Pt[t];
    throw new Error("unknown style format: " + t);
  }
  var Ke = Object.hasOwnProperty;
  function Cn(t, e = Uint8Array) {
    let r = t.reduce((i2, s) => i2 + s.length, 0);
    if (!t.length)
      return null;
    let n = new e(r), a = 0;
    for (let i2 of t)
      n.set(i2, a), a += i2.length;
    return n;
  }
  var ut = class {
    constructor(...e) {
      if (e.length === 4) {
        this.start = {}, this.end = {}, [this.start.x, this.start.y, this.end.x, this.end.y] = e;
        for (let r in e)
          if (Ke.call(e, r) && typeof e[r] != "number")
            throw TypeError("When passing 4 arguments, only numbers may be passed");
      } else if (e.length === 2)
        [this.start, this.end] = e;
      else
        throw Error("Please pass either two Point objects, or 4 integers to the constructor");
    }
    getLength() {
      return Math.sqrt(Math.pow(this.start.x - this.end.x, 2) + Math.pow(this.start.y - this.end.y, 2));
    }
    is_invalid() {
      return !!(Number.isNaN(this.start.x) || Number.isNaN(this.end.x) || Number.isNaN(this.start.y) || Number.isNaN(this.end.y) || this.start.x > Number.MAX_SAFE_INTEGER || this.start.y > Number.MAX_SAFE_INTEGER || this.end.x > Number.MAX_SAFE_INTEGER || this.end.y > Number.MAX_SAFE_INTEGER);
    }
  };
  var pe = class t {
    constructor(e, r) {
      this.x = e;
      this.y = r;
    }
    clone() {
      return new t(this.x, this.y);
    }
    distance(e) {
      return Math.sqrt(Math.pow(e.x - this.x, 2) + Math.pow(e.y - this.y, 2));
    }
    add(e) {
      return new t(this.x + e.x, this.y + e.y);
    }
    subtract(e) {
      return new t(this.x - e.x, this.y - e.y);
    }
    magnitude() {
      return Math.sqrt(this.dotProduct(this));
    }
    dotProduct(e) {
      return this.x * e.x + this.y * e.y;
    }
    divide(e) {
      return new t(this.x / e, this.y / e);
    }
    floor() {
      return new t(Math.floor(this.x), Math.floor(this.y));
    }
    round() {
      return new t(Math.round(this.x), Math.round(this.y));
    }
    unit() {
      return this.divide(this.magnitude());
    }
    rotate(e) {
      return new t(Math.cos(e) * this.x - Math.sin(e) * this.y, Math.sin(e) * this.x + Math.cos(e) * this.y);
    }
    scale(e) {
      return new t(this.x * e, this.y * e);
    }
    equals(e) {
      return this.x === e.x && this.y === e.y;
    }
  };
  var pr = (t) => Math.PI / 180 * t;
  function An(t) {
    let { POSITIVE_INFINITY: e, POSITIVE_INFINITY: r, NEGATIVE_INFINITY: n, NEGATIVE_INFINITY: a } = Number;
    return t.forEach((i2) => {
      e = Math.min(e, i2.x), r = Math.min(r, i2.y), n = Math.max(n, i2.x), a = Math.max(a, i2.y);
    }), new ct(e, r, n, a);
  }
  var ct = class t {
    constructor(e, r, n, a) {
      this.x1 = e;
      this.y1 = r;
      this.x2 = n;
      this.y2 = a;
    }
    contains(e) {
      return !(e.x < this.x1 || e.x >= this.x2 || e.y < this.y1 || e.y >= this.y2);
    }
    intersect(e) {
      let r = Math.max(this.x1, e.x1), n = Math.max(this.y1, e.y1), a = Math.min(this.x2, e.x2), i2 = Math.min(this.y2, e.y2);
      return new t(r, n, a, i2);
    }
  };
  var tr = cr(Ya(), 1);
  var st = {};
  var $r = class {
    constructor(e, r, n, a, i2) {
      this.binary = e, this.family = r, this.weight = n, this.style = a, this.variant = i2, this.loaded = false, this.font = null;
    }
    _load(e) {
      if (this.loaded) {
        e && e();
        return;
      }
      let r = function(n, a) {
        if (n)
          throw new Error("Could not load font: " + n);
        this.loaded = true, this.font = a, e && e();
      }.bind(this);
      tr.load(this.binary, r);
    }
    loadSync() {
      if (this.loaded)
        return this;
      try {
        return this.font = tr.loadSync(this.binary), this.loaded = true, this;
      } catch (e) {
        throw new Error("Could not load font: " + e);
      }
    }
    load() {
      return this.loadPromise();
    }
    loadPromise() {
      return new Promise((e, r) => {
        this._load(() => e());
      });
    }
  };
  function Ml(t, e, r, n, a) {
    return st[e] = new $r(t, e, r, n, a), st[e];
  }
  var Yl = st;
  function Wa(t) {
    return st[t] || (t = Object.keys(st)[0]), st[t];
  }
  function rr(t, e, r, n, a, i2, s) {
    let l = Wa(t._font.family);
    if (!l) {
      console.warn("Font missing", t._font);
      return;
    }
    let o = nr(t, e);
    (i2 === "end" || i2 === "right") && (r = r - o.width), i2 === "center" && (r = r - o.width / 2), s === "top" && (n = n + o.emHeightAscent), s === "middle" && (n = n + o.emHeightAscent / 2 + o.emHeightDescent / 2), s === "bottom" && (n = n + o.emHeightDescent);
    let h = t._font.size;
    if (!l.loaded) {
      console.warn("font not loaded yet", t._font);
      return;
    }
    let u = l.font.getPath(e, r, n, h);
    t.beginPath(), u.commands.forEach(function(c) {
      switch (c.type) {
        case "M":
          t.moveTo(c.x, c.y);
          break;
        case "Q":
          t.quadraticCurveTo(c.x1, c.y1, c.x, c.y);
          break;
        case "L":
          t.lineTo(c.x, c.y);
          break;
        case "C":
          t.bezierCurveTo(c.x1, c.y1, c.x2, c.y2, c.x, c.y);
          break;
        case "Z": {
          t.closePath(), a ? t.fill() : t.stroke(), t.beginPath();
          break;
        }
      }
    });
  }
  function nr(t, e) {
    let r = Wa(t._font.family);
    if (!r)
      return console.warn("WARNING. Can't find font family ", t._font), { width: 10, emHeightAscent: 8, emHeightDescent: 2 };
    if (!r.font)
      return console.warn("WARNING. Can't find font family ", t._font), { width: 10, emHeightAscent: 8, emHeightDescent: 2 };
    let n = t._font.size, a = r.font.stringToGlyphs(e), i2 = 0;
    return a.forEach(function(s) {
      i2 += s.advanceWidth;
    }), { width: i2 / r.font.unitsPerEm * n, emHeightAscent: r.font.ascender / r.font.unitsPerEm * n, emHeightDescent: r.font.descender / r.font.unitsPerEm * n };
  }
  var Je = class {
    constructor() {
      this.stops = [];
    }
    addColorStop(e, r) {
      let n = Ct("" + r);
      this.stops.push({ t: e, color: n });
    }
    _lerpStops(e) {
      e < 0 && (e += 1), e > 1 && (e -= 1);
      let r = this.stops.slice().reverse().find((u) => u.t <= e), n = this.stops.find((u) => u.t > e);
      n || (n = this.stops.at(-1));
      let a = Va(e, r.t, n.t, 0, 1), i2 = (u) => je(u).map((c) => c / 255), s = i2(r.color), l = i2(n.color), o = s.map((u, c) => En(u, l[c], a));
      return ((u) => {
        let c = u.map((p) => p * 255);
        return Ze(c[0], c[1], c[2], 255);
      })(o);
    }
  };
  var ar = class extends Je {
    constructor(r, n, a, i2) {
      super();
      this.start = new pe(r, n), this.end = new pe(a, i2);
    }
    colorAt(r, n) {
      let a = new pe(r, n), i2 = this.end.subtract(this.start), s = i2.magnitude();
      i2 = i2.divide(s);
      let o = a.subtract(this.start).dotProduct(i2);
      return o = Et(o / s, 0, 1), this._lerpStops(o);
    }
  };
  var ir = class extends Je {
    constructor(r, n, a, i2) {
      super();
      this.start = new pe(r, n);
    }
    colorAt(r, n) {
      let i2 = new pe(r, n).distance(this.start), s = Et(i2 / 10, 0, 1);
      return this._lerpStops(s);
    }
  };
  function Va(t, e, r, n, a) {
    return (t - e) / (r - e) * (a - n) + n;
  }
  var sr = class extends Je {
    constructor(r, n, a) {
      super();
      this.angle = r, this.start = new pe(n, a);
    }
    colorAt(r, n) {
      let a = this.start.subtract(new pe(r, n)), i2 = Math.atan2(a.y, a.x) - this.angle, s = Va(i2, -Math.PI, Math.PI, 0, 1);
      return this._lerpStops(s);
    }
  };
  var La = [1, 0, 0, 1, 0, 0];
  var or = class t {
    constructor(e) {
      this.context = e, this.matrix = [1, 0, 0, 1, 0, 0], this.stack = [];
    }
    getMatrix() {
      return this.matrix;
    }
    setMatrix(e) {
      this.matrix = [e[0], e[1], e[2], e[3], e[4], e[5]], this.setTransform();
    }
    cloneMatrix(e) {
      return [e[0], e[1], e[2], e[3], e[4], e[5]];
    }
    cloneTransform() {
      let e = new t;
      return e.setMatrix(this.getMatrix()), e;
    }
    identity() {
      this.matrix = La, this.setTransform();
    }
    isIdentity() {
      for (let e = 0;e < this.matrix.length; e++)
        if (this.matrix[e] !== La[e])
          return false;
      return true;
    }
    fromDomMatrix(e) {
      return [e.a, e.b, e.c, e.d, e.e, e.f];
    }
    asDomMatrix() {
      return { is2D: true, isIdentity: false, a: this.matrix[0], b: this.matrix[1], c: this.matrix[2], d: this.matrix[3], e: this.matrix[4] };
    }
    multiply(e) {
      let r = this.matrix[0] * e[0] + this.matrix[2] * e[1], n = this.matrix[1] * e[0] + this.matrix[3] * e[1], a = this.matrix[0] * e[2] + this.matrix[2] * e[3], i2 = this.matrix[1] * e[2] + this.matrix[3] * e[3], s = this.matrix[0] * e[4] + this.matrix[2] * e[5] + this.matrix[4], l = this.matrix[1] * e[4] + this.matrix[3] * e[5] + this.matrix[5];
      this.matrix[0] = r, this.matrix[1] = n, this.matrix[2] = a, this.matrix[3] = i2, this.matrix[4] = s, this.matrix[5] = l, this.setTransform();
    }
    invert() {
      let e = 1 / (this.matrix[0] * this.matrix[3] - this.matrix[1] * this.matrix[2]), r = this.matrix[3] * e, n = -this.matrix[1] * e, a = -this.matrix[2] * e, i2 = this.matrix[0] * e, s = e * (this.matrix[2] * this.matrix[5] - this.matrix[3] * this.matrix[4]), l = e * (this.matrix[1] * this.matrix[4] - this.matrix[0] * this.matrix[5]);
      this.matrix[0] = r, this.matrix[1] = n, this.matrix[2] = a, this.matrix[3] = i2, this.matrix[4] = s, this.matrix[5] = l, this.setTransform();
    }
    save() {
      let e = this.cloneMatrix(this.getMatrix());
      this.stack.push(e), this.context && this.context.save();
    }
    restore() {
      if (this.stack.length > 0) {
        let e = this.stack.pop();
        this.setMatrix(e);
      }
      this.context && this.context.restore();
    }
    setTransform() {
      this.context;
    }
    translate(e, r) {
      this.matrix[4] += this.matrix[0] * e + this.matrix[2] * r, this.matrix[5] += this.matrix[1] * e + this.matrix[3] * r, this.setTransform();
    }
    rotate(e) {
      let r = Math.cos(e), n = Math.sin(e), a = this.matrix[0] * r + this.matrix[2] * n, i2 = this.matrix[1] * r + this.matrix[3] * n, s = this.matrix[0] * -n + this.matrix[2] * r, l = this.matrix[1] * -n + this.matrix[3] * r;
      this.matrix[0] = a, this.matrix[1] = i2, this.matrix[2] = s, this.matrix[3] = l, this.setTransform();
    }
    scale(e, r) {
      this.matrix[0] *= e, this.matrix[1] *= e, this.matrix[2] *= r, this.matrix[3] *= r, this.setTransform();
    }
    transformPoint(e) {
      let { x: r, y: n } = e;
      return new pe(r * this.matrix[0] + n * this.matrix[2] + this.matrix[4], r * this.matrix[1] + n * this.matrix[3] + this.matrix[5]);
    }
  };
  var Rt = class {
    constructor(e) {
      this._bitmap = e, this._fillColor = 255, this._strokeColor = 255, this._lineWidth = 1, this._globalAlpha = 1, this._transform = new or, this._font = { family: "invalid", size: 12 }, this.textAlign = "start", this.textBaseline = "alphabetic", this.imageSmoothingEnabled = true, this._clip = null, this._fillStyle_text = "", this._strokeStyle_text = "", this.states = [];
    }
    get canvas() {
      return this._bitmap;
    }
    get lineWidth() {
      return this._lineWidth;
    }
    set lineWidth(e) {
      this._lineWidth = e;
    }
    get globalAlpha() {
      return this._globalAlpha;
    }
    set globalAlpha(e) {
      this._globalAlpha = Et(e, 0, 1);
    }
    get font() {
      return `${this._font.size} ${this._font.family}`;
    }
    set font(e) {
      let r = e.trim().indexOf(" ");
      this._font.size = parseInt(e.slice(0, r)), this._font.family = e.slice(r).trim();
    }
    get fillStyle() {
      return this._fillStyle_text;
    }
    set fillStyle(e) {
      e instanceof Je ? this._fillColor = e : (this._fillColor = Ct(e), this._fillStyle_text = e);
    }
    get strokeStyle() {
      return this._strokeStyle_text;
    }
    set strokeStyle(e) {
      e instanceof Je ? this._strokeStyle_text = e.toString() : (this._strokeColor = Ct(e), this._strokeStyle_text = e);
    }
    createLinearGradient(e, r, n, a) {
      return new ar(e, r, n, a);
    }
    createRadialGradient(e, r) {
      return new ir(e, r);
    }
    createConicGradient(e, r, n) {
      return new sr(e, r, n);
    }
    save() {
      this.states.push({ _clip: this._clip }), this._transform.save();
    }
    translate(e, r) {
      this._transform.translate(e, r);
    }
    rotate(e) {
      this._transform.rotate(e);
    }
    scale(e, r) {
      this._transform.scale(e, r);
    }
    transform(...e) {
      let r = [...e];
      this._transform.multiply(r);
    }
    setTransform(...e) {
      if (this._transform.identity(), e[0].is2D) {
        let r = this._transform.fromDomMatrix(e[0]);
        this._transform.multiply(r);
      } else
        this._transform.multiply([...e]);
    }
    getTransform() {
      return this._transform.asDomMatrix();
    }
    restore() {
      this._transform.restore();
      let e = this.states.pop();
      e && (this._clip = e._clip);
    }
    fillRect(e, r, n, a) {
      if (this._transform.isIdentity()) {
        if (typeof this._fillColor == "number" && je(this._fillColor)[3] === 255) {
          for (let s = e;s < e + n; s++)
            for (let l = r;l < r + a; l++)
              this.pixelInsideClip(s, l) && this._bitmap._isValidCoords(s, l) && this._bitmap.setPixelRGBA(s, l, this._fillColor);
          return;
        }
        for (let i2 = e;i2 < e + n; i2++)
          for (let s = r;s < r + a; s++)
            this.fillPixelWithColor(i2, s, this.calculateRGBA(i2, s));
      } else {
        let i2 = this.path, s = this._closed;
        this.beginPath(), this.rect(e - 0.0001, r - 0.0001, n, a), this.closePath(), this.fill(), this.path = i2, this._closed = s;
      }
    }
    clearRect(e, r, n, a) {
      for (let i2 = e;i2 < e + n; i2++)
        for (let s = r;s < r + a; s++)
          this._bitmap._isValidCoords(e, r) && this._bitmap.setPixelRGBA(i2, s, 0);
    }
    strokeRect(e, r, n, a) {
      for (let i2 = e;i2 < e + n; i2++)
        this.fillPixelWithColor(i2, r, this.calculateRGBA_stroke(i2, r)), this.fillPixelWithColor(i2, r + a, this.calculateRGBA_stroke(i2, r + a));
      for (let i2 = r;i2 < r + a; i2++)
        this.fillPixelWithColor(e, i2, this.calculateRGBA_stroke(e, i2)), this.fillPixelWithColor(e + n, i2, this.calculateRGBA_stroke(e + n, i2));
    }
    strokePixel(e, r) {
      if (!this.pixelInsideClip(e, r))
        return;
      let n = this.calculateRGBA_stroke(e, r), a = this._bitmap.getPixelRGBA(e, r), i2 = this.composite(a, n);
      this._bitmap.setPixelRGBA(e, r, i2);
    }
    fillPixelWithColor(e, r, n) {
      if (!this.pixelInsideClip(e, r) || !this._bitmap._isValidCoords(e, r))
        return;
      let a = n, i2 = this._bitmap.getPixelRGBA(e, r), s = this.composite(i2, a);
      this._bitmap.setPixelRGBA(e, r, s);
    }
    composite(e, r) {
      let n = je(e), a = je(r), i2 = a.map((u) => u / 255), s = n.map((u) => u / 255);
      i2[3] = i2[3] * this._globalAlpha;
      function l(u, c, p, d) {
        return (u * p + c * d * (1 - p)) / (p + d * (1 - p));
      }
      let h = i2.slice(0, 3).map((u, c) => l(i2[c], s[c], i2[3], s[3])).map((u) => u * 255);
      return Ze(h[0], h[1], h[2], Math.max(n[3], a[3]));
    }
    calculateRGBA(e, r) {
      return this._fillColor instanceof Je ? this._fillColor.colorAt(e, r) : this._fillColor;
    }
    calculateRGBA_stroke(e, r) {
      return this._strokeColor instanceof Je ? this._strokeColor.colorAt(e, r) : this._strokeColor;
    }
    getImageData(e, r, n, a) {
      return this._bitmap._copySubBitmap(e, r, n, a);
    }
    putImageData(e, r, n) {
      this._bitmap._pasteSubBitmap(e, r, n);
    }
    drawImage(e, r, n, a, i2, s, l, o, h) {
      if (typeof a > "u")
        return this.drawImage(e, 0, 0, e.width, e.height, r, n, e.width, e.height);
      if (typeof s > "u")
        return this.drawImage(e, 0, 0, e.width, e.height, r, n, a, i2);
      let u = new ct(r, n, r + a, n + i2), c = [new pe(s, l), new pe(s + o, l), new pe(s + o, l + h), new pe(s, l + h)];
      c = c.map((b) => this._transform.transformPoint(b));
      let p = An(c), d = new ct(0, 0, this._bitmap.width, this._bitmap.height);
      p = p.intersect(d);
      let m = this._transform.cloneTransform();
      m.invert();
      function F(b, I, w, x2, U) {
        return (b - I) / (w - I) * (U - x2) + x2;
      }
      for (let b = p.x1;b < p.x2; b++)
        for (let I = p.y1;I < p.y2; I++) {
          let w = new pe(b, I), x2 = m.transformPoint(w).round();
          if (x2 = new pe(F(x2.x, s, s + o, r, r + a), F(x2.y, l, l + h, n, n + i2)), u.contains(x2) && this.pixelInsideClip(w.x, w.y) && this._bitmap._isValidCoords(w.x, w.y)) {
            let U = e.getPixelRGBA(x2.x, x2.y), y = this._bitmap.getPixelRGBA(w.x, w.y), W = this.composite(y, U);
            this._bitmap.setPixelRGBA(w.x, w.y, W);
          }
        }
    }
    beginPath() {
      this.path = [], this._closed = false;
    }
    moveTo(e, r) {
      return this._moveTo(new pe(e, r));
    }
    _moveTo(e) {
      e = this._transform.transformPoint(e), this.pathstart = e, this.path.push(["m", e]);
    }
    lineTo(e, r) {
      return this._lineTo(new pe(e, r));
    }
    _lineTo(e) {
      this.path.push(["l", this._transform.transformPoint(e)]);
    }
    quadraticCurveTo(e, r, n, a) {
      let i2 = this._transform.transformPoint(new pe(e, r)), s = this._transform.transformPoint(new pe(n, a));
      this.path.push(["q", i2, s]);
    }
    bezierCurveTo(e, r, n, a, i2, s) {
      this._bezierCurveTo(new pe(e, r), new pe(n, a), new pe(i2, s));
    }
    _bezierCurveTo(e, r, n) {
      e = this._transform.transformPoint(e), r = this._transform.transformPoint(r), n = this._transform.transformPoint(n), this.path.push(["b", e, r, n]);
    }
    arc(e, r, n, a, i2, s) {
      function l(h) {
        let u = e + Math.cos(h) * n, c = r + Math.sin(h) * n;
        return new pe(u, c);
      }
      a > i2 && (i2 += Math.PI * 2);
      let o = Math.PI / 16;
      if (s) {
        let h = i2;
        i2 = a + Math.PI * 2, a = h;
      }
      this._moveTo(l(a));
      for (let h = a;h <= i2; h += o)
        this._lineTo(l(h));
      this._lineTo(l(i2));
    }
    arcTo() {
      throw new Error("arcTo not yet supported");
    }
    rect(e, r, n, a) {
      this.moveTo(e, r), this.lineTo(e + n, r), this.lineTo(e + n, r + a), this.lineTo(e, r + a), this.lineTo(e, r);
    }
    roundRect(e, r, n, a, i2) {
      let s = { bl: 0, br: 0, tr: 0, tl: 0 };
      typeof i2 > "u" && (s = { bl: 0, br: 0, tr: 0, tl: 0 }), typeof i2 == "number" && (s = { tl: i2, tr: i2, br: i2, bl: i2 }), Array.isArray(i2) && (i2.length === 0 && (s = { bl: 0, br: 0, tr: 0, tl: 0 }), i2.length === 1 && (s = { tl: i2[0], tr: i2[0], br: i2[0], bl: i2[0] }), i2.length === 2 && (s = { tl: i2[0], tr: i2[1], br: i2[0], bl: i2[1] }), i2.length === 3 && (s = { tl: i2[0], tr: i2[1], br: i2[2], bl: i2[1] }), i2.length === 4 && (s = { tl: i2[0], tr: i2[1], br: i2[2], bl: i2[3] })), this.moveTo(e + s.tl, r), this.lineTo(e + n - s.tr, r), this.quadraticCurveTo(e + n, r, e + n, r + s.tr), this.lineTo(e + n, r + a - s.br), this.quadraticCurveTo(e + n, r + a, e + n - s.br, r + a), this.lineTo(e + s.bl, r + a), this.quadraticCurveTo(e, r + a, e, r + a - s.bl), this.lineTo(e, r + s.tl), this.quadraticCurveTo(e, r, e + s.tl, r), this.lineTo(e + s.tl, r);
    }
    ellipse() {
      throw new Error("ellipse not yet supported");
    }
    clip() {
      this._clip = vt(this.path);
    }
    measureText(e) {
      return nr(this, e);
    }
    closePath() {
      if (!this._closed) {
        if (!this.pathstart) {
          console.warn("missing path start");
          let e = this.path[0];
          e[0] === "l" && (this.pathstart = e[1]);
        }
        this.path.push(["l", this.pathstart]), this._closed = true;
      }
    }
    stroke() {
      let e = Xl(this.path), r = zl(e, this.lineWidth / 2), n = vt(r), a = this.fillStyle;
      if (this.fillStyle = this.strokeStyle, this.imageSmoothingEnabled ? this.fill_aa(n) : this.fill_noaa(n), this.fillStyle = a, this.debug) {
        this.save();
        let i2 = this.strokeStyle, s = this.lineWidth;
        this.strokeStyle = "red", this.lineWidth = 1, console.log("path is", this.path), vt(this.path).forEach((l) => this.drawLine(l)), console.log("flat path is", e), vt(e).forEach((l) => this.drawLine(l)), console.log("stroke path is", r), vt(r).forEach((l) => this.drawLine(l)), console.log("final lines are", n), this.strokeStyle = i2, this.lineWidth = s, this.restore();
      }
    }
    drawLine(e) {
      if (e.is_invalid())
        return console.error("cannot draw line", e);
      this.imageSmoothingEnabled ? this.drawLine_aa(e) : this.drawLine_noaa(e);
    }
    drawLine_noaa(e) {
      let r = Math.floor(e.start.x), n = Math.floor(e.start.y), a = Math.floor(e.end.x), i2 = Math.floor(e.end.y), s = Math.abs(a - r), l = r < a ? 1 : -1, o = Math.abs(i2 - n), h = n < i2 ? 1 : -1, u = (s > o ? s : -o) / 2;
      for (;this.strokePixel(r, n), !(r === a && n === i2); ) {
        let c = u;
        c > -s && (u -= o, r += l), c < o && (u += s, n += h);
      }
    }
    drawLine_aa(e) {
      let r = this._lineWidth, n = Math.floor(e.start.x), a = Math.floor(e.start.y), i2 = Math.floor(e.end.x), s = Math.floor(e.end.y), l = Math.abs(i2 - n), o = n < i2 ? 1 : -1, h = Math.abs(s - a), u = a < s ? 1 : -1, c = l - h, p, d, m, F = l + h === 0 ? 1 : Math.sqrt(l * l + h * h), b = St(this.calculateRGBA_stroke(n, a), 4294967040), I = St(this.calculateRGBA_stroke(n, a), 255);
      for (r = (r + 1) / 2;; ) {
        let x2 = 255 - ~~Math.max(0, 255 * (Math.abs(c - l + h) / F - r + 1)), U = Qe(b, I * x2 / 255);
        if (this.fillPixelWithColor(n, a, U), p = c, d = n, 2 * p >= -l) {
          for (p += h, m = a;p < F * r && (s !== m || l > h); p += l) {
            let W = 255 - ~~Math.max(0, 255 * (Math.abs(p) / F - r + 1)), T = Qe(b, I * W / 255);
            this.fillPixelWithColor(n, m += u, T);
          }
          if (n === i2)
            break;
          p = c, c -= h, n += o;
        }
        if (2 * p <= h) {
          for (p = l - p;p < F * r && (i2 !== d || l < h); p += h) {
            let W = 255 - ~~Math.max(0, 255 * (Math.abs(p) / F - r + 1)), T = Qe(b, I * W / 255);
            this.fillPixelWithColor(d += o, a, T);
          }
          if (a === s)
            break;
          c += l, a += u;
        }
      }
    }
    fill() {
      this._closed || this.closePath();
      let e = vt(this.path);
      this.imageSmoothingEnabled ? this.fill_aa(e) : this.fill_noaa(e);
    }
    fill_aa(e) {
      let r = za(e), n = Math.min(r.y2 + 1, this._bitmap.height), a = Math.max(r.y - 1, 0);
      for (let i2 = n;i2 >= a; i2--) {
        let s = Dr(e, i2);
        for (let l = 0;l < s.length; l += 2) {
          let o = Xa(s[l]), h = Xa(s[l + 1]), u = Math.floor(s[l]), c = Math.floor(s[l + 1]);
          for (let p = u;p <= c; p++) {
            let d = St(this.calculateRGBA(p, i2), 4294967040), m = St(this.calculateRGBA(p, i2), 255), F = this.calculateRGBA(p, i2);
            if (p === u) {
              let b = Qe(d, (1 - o) * m);
              this.fillPixelWithColor(p, i2, b);
              continue;
            }
            if (p === c) {
              let b = Qe(d, h * m);
              this.fillPixelWithColor(p, i2, b);
              continue;
            }
            this.fillPixelWithColor(p, i2, F);
          }
        }
      }
    }
    fill_noaa(e) {
      let r = za(e), n = Math.min(r.y2 + 1, this._bitmap.height), a = Math.max(r.y - 1, 0);
      for (let i2 = n;i2 >= a; i2--) {
        let s = Dr(e, i2);
        for (let l = 0;l < s.length; l += 2) {
          let o = Math.floor(s[l]), h = Math.floor(s[l + 1]);
          for (let u = o;u <= h; u++) {
            let c = this.calculateRGBA(u, i2);
            if (u === o) {
              this.fillPixelWithColor(u, i2, c);
              continue;
            }
            if (u === h) {
              this.fillPixelWithColor(u, i2, c);
              continue;
            }
            this.fillPixelWithColor(u, i2, c);
          }
        }
      }
    }
    pixelInsideClip(e, r) {
      return this._clip ? Dr(this._clip, r).filter((i2) => i2 < e).length % 2 !== 0 : true;
    }
    fillText(e, r, n) {
      rr(this, e, r, n, true, this.textAlign, this.textBaseline);
    }
    strokeText(e, r, n) {
      rr(this, e, r, n, false, this.textAlign, this.textBaseline);
    }
  };
  function Xa(t) {
    return t - Math.floor(t);
  }
  function vt(t) {
    let e = [], r = null;
    return t.forEach(function(n) {
      if (n[0] === "m" && (r = n[1]), n[0] === "l") {
        let a = n[1];
        e.push(new ut(r, a)), r = a;
      }
      if (n[0] === "q") {
        let a = [r, n[1], n[2]];
        for (let i2 = 0;i2 < 1; i2 += 0.1) {
          let s = Zl(a, i2);
          e.push(new ut(r, s)), r = s;
        }
      }
      if (n[0] === "b") {
        let a = [r, n[1], n[2], n[3]];
        Na(a, 10).forEach((i2) => {
          e.push(new ut(r, i2)), r = i2;
        });
      }
    }), e;
  }
  function Xl(t) {
    let e = [], r = null;
    return t.forEach((n) => {
      if (n[0] === "m") {
        r = n[1], e.push(["m", new pe(r.x, r.y)]);
        return;
      }
      if (n[0] === "l") {
        r = n[1], e.push(["l", new pe(r.x, r.y)]);
        return;
      }
      if (n[0] === "b") {
        let a = [r, n[1], n[2], n[3]], i2 = Na(a, 10);
        for (let s = 1;s < i2.length; s += 2)
          e.push(["l", new pe(i2[s].x, i2[s].y)]);
        r = n[3];
      }
    }), e;
  }
  function zl(t, e) {
    let r = [], n = [];
    t.forEach((s) => {
      s[0] === "m" && (n.length > 0 && r.push(n), n = []), n.push(s);
    }), n.length > 0 && r.push(n), r.forEach((s) => {
      s[0][0] !== "m" && console.warn("missing a starting move command!");
    });
    let a = r.map((s) => Nl(s, e)), i2 = [];
    return a.forEach((s) => s.forEach((l) => i2.push(l))), i2;
  }
  function Nl(t, e) {
    let r = null, n = [], a = [], i2 = null;
    function s(u, c, p) {
      u.equals(c) && console.log("same points!", u, c);
      let d = u.subtract(c).unit(), m = d.rotate(pr(90)), F = d.rotate(pr(-90));
      return [m.scale(p).add(c), F.scale(p).add(c)];
    }
    let l = null;
    function o(u) {
      return u < -Math.PI ? u + Math.PI * 2 : u > +Math.PI ? u - Math.PI * 2 : u;
    }
    t.forEach(function(u, c) {
      if (u[0] === "m" && (r = u[1], l = u, i2 = r.clone(), n.push(["m", i2.clone()])), u[0] === "l") {
        let p = r, d = u[1];
        if (p.equals(d))
          return console.warn("can't project the same paths", c, u, p, d);
        let m = t[c + 1];
        if (l[0] === "m") {
          let T = s(d, p, e);
          n.push(["l", T[1]]), a.push(["l", T[0]]);
        }
        if (l = u, !m) {
          let T = s(p, d, e);
          n.push(["l", T[0]]), a.push(["l", T[1]]);
          return;
        }
        let F = m[1];
        if (F.equals(d))
          return console.warn("can't project the same paths", c, u, p, d);
        let b = p.subtract(d), I = F.subtract(d), w = Math.atan2(b.y, b.x), x2 = Math.atan2(I.y, I.x), U = o(x2 - w), y = s(p, d, e), W = s(F, d, e);
        if (U < 0) {
          n.push(["l", y[0]]), n.push(["l", W[1]]);
          let T = e / Math.cos((Math.PI + U) / 2), R = p.subtract(d).unit().rotate(U / 2).scale(T).add(d);
          a.push(["l", R]);
        } else {
          let T = e / Math.cos(-(Math.PI - U) / 2);
          T > 10 && (T = 10);
          let R = F.subtract(d).unit().rotate(-U / 2).scale(T).add(d);
          n.push(["l", R]), a.push(["l", y[1]]), a.push(["l", W[0]]);
        }
        r = d;
      }
    }), a.reverse();
    let h = [].concat(n).concat(a);
    return h.push(["l", i2]), h;
  }
  function Zl(t, e) {
    let r = (1 - e) * (1 - e) * t[0].x + 2 * (1 - e) * e * t[1].x + e * e * t[2].x, n = (1 - e) * (1 - e) * t[0].y + 2 * (1 - e) * e * t[1].y + e * e * t[2].y;
    return new pe(r, n);
  }
  function Na(t, e) {
    function r(n) {
      if (Ql(n) < e)
        return [n[0], n[3]];
      let a = jl(n, 0.5);
      return r(a[0]).concat(r(a[1]));
    }
    return r(t);
  }
  function jl(t, e) {
    let r = t[0], n = t[1], a = t[2], i2 = t[3], s = Ht(r, n, e), l = Ht(n, a, e), o = Ht(i2, a, e), h = Ht(s, l, e), u = Ht(l, o, e), c = { x: (u.x - h.x) * e + h.x, y: (u.y - h.y) * e + h.y };
    return [[r, s, h, c], [c, u, o, i2]];
  }
  function Ql(t) {
    let e = t[0], r = t[1], n = t[2], a = t[3], i2 = Math.pow(3 * r.x - 2 * e.x - a.x, 2), s = Math.pow(3 * r.y - 2 * e.y - a.y, 2), l = Math.pow(3 * n.x - 2 * a.x - e.x, 2), o = Math.pow(3 * n.y - 2 * a.y - e.y, 2);
    return i2 < l && (i2 = l), s < o && (s = o), i2 + s;
  }
  function Ht(t, e, r) {
    return { x: (e.x - t.x) * r + t.x, y: (e.y - t.y) * r + t.y };
  }
  function za(t) {
    let e = { x: Number.MAX_VALUE, y: Number.MAX_VALUE, x2: Number.MIN_VALUE, y2: Number.MIN_VALUE };
    function r(n) {
      e.x = Math.min(e.x, n.x), e.y = Math.min(e.y, n.y), e.x2 = Math.max(e.x2, n.x), e.y2 = Math.max(e.y2, n.y);
    }
    return t.forEach(function(n) {
      r(n.start), r(n.end);
    }), e;
  }
  function Dr(t, e) {
    let r = [];
    for (let n = 0;n < t.length; n++) {
      let a = t[n].start, i2 = t[n].end;
      if (a.y < e && i2.y >= e || i2.y < e && a.y >= e) {
        let s = a.x + (e - a.y) / (i2.y - a.y) * (i2.x - a.x);
        r.push(s);
      }
    }
    return r.sort(function(n, a) {
      return n - a;
    });
  }
  var ot = class t {
    constructor(e, r) {
      this.width = Math.floor(e), this.height = Math.floor(r), this.data = new Uint8Array(this.width * this.height * 4);
      let n = 255;
      for (let a = 0;a < this.height; a++)
        for (let i2 = 0;i2 < this.width; i2++)
          this.setPixelRGBA(i2, a, n);
      this._context = new Rt(this);
    }
    calculateIndex(e, r) {
      return e = Math.floor(e), r = Math.floor(r), e < 0 || r < 0 || e >= this.width || r >= this.height ? 0 : (this.width * r + e) * 4;
    }
    setPixelRGBA(e, r, n) {
      this.validate_coords(e, r);
      let a = this.calculateIndex(e, r), i2 = je(n);
      this.data[a + 0] = i2[0], this.data[a + 1] = i2[1], this.data[a + 2] = i2[2], this.data[a + 3] = i2[3];
    }
    setPixelRGBA_i(e, r, n, a, i2, s) {
      let l = this.calculateIndex(e, r);
      this.data[l + 0] = n, this.data[l + 1] = a, this.data[l + 2] = i2, this.data[l + 3] = s;
    }
    getPixelRGBA(e, r) {
      this.validate_coords(e, r);
      let n = this.calculateIndex(e, r);
      return Ze(this.data[n + 0], this.data[n + 1], this.data[n + 2], this.data[n + 3]);
    }
    getDebugPixelRGBA(e, r) {
      let n = this.calculateIndex(e, r), a = this.width, i2 = this.height, s = this.data;
      return console.dir({ i: n, width: a, height: i2, data: s }), Ze(this.data[n + 0], this.data[n + 1], this.data[n + 2], this.data[n + 3]);
    }
    getPixelRGBA_separate(e, r) {
      let n = this.calculateIndex(e, r);
      return this.data.slice(n, n + 4);
    }
    getContext(e) {
      return e === "2d" ? this._context : null;
    }
    _copySubBitmap(e, r, n, a) {
      let i2 = new t(n, a);
      for (let s = 0;s < n; s++)
        for (let l = 0;l < a; l++) {
          let o = this.calculateIndex(e + s, r + l), h = i2.calculateIndex(s, l);
          for (let u = 0;u < 4; u++)
            i2.data[h + u] = this.data[o + u];
        }
      return i2;
    }
    _pasteSubBitmap(e, r, n) {
      for (let a = 0;a < e.width; a++)
        for (let i2 = 0;i2 < e.height; i2++) {
          let s = this.calculateIndex(r + a, n + i2), l = e.calculateIndex(a, i2);
          for (let o = 0;o < 4; o++)
            this.data[s + o] = e.data[l + o];
        }
    }
    _isValidCoords(e, r) {
      return !(e < 0 || r < 0 || e >= this.width || r >= this.height);
    }
    validate_coords(e, r) {
      if (e < 0)
        throw new Error(`Invalid Index: x ${e} <0`);
      if (r < 0)
        throw new Error(`Invalid Index: y ${r} <0`);
      if (e >= this.width)
        throw new Error(`Invalid Index: x ${e} >= width ${this.width}`);
      if (r >= this.height)
        throw new Error(`Invalid Index: y ${r} >= height ${this.height}`);
    }
  };
  var ah = cr(Wi(), 1);
  var fr = cr(ji(), 1);
  var { PNG: Qi } = ah;
  function ih(t, e) {
    return new ot(t, e);
  }
  function sh(t, e, r = {}) {
    return new Promise((n, a) => {
      if (!Ke.call(t, "data") || !Ke.call(t, "width") || !Ke.call(t, "height"))
        return a(new TypeError("Invalid bitmap image provided"));
      let i2 = new Qi({ width: t.width, height: t.height, deflateLevel: r.deflateLevel || 9, deflateStrategy: r.deflateStrategy || 3 });
      for (let s = 0;s < t.width; s++)
        for (let l = 0;l < t.height; l++) {
          let o = t.getPixelRGBA(s, l), h = (l * t.width + s) * 4, u = je(o);
          for (let c = 0;c < 4; c++)
            i2.data[h + c] = u[c];
        }
      i2.on("error", (s) => {
        a(s);
      }).pack().pipe(e).on("finish", () => {
        n();
      }).on("error", (s) => {
        a(s);
      });
    });
  }
  function oh(t) {
    return new Promise((e, r) => {
      t.pipe(new Qi).on("parsed", function() {
        let n = new ot(this.width, this.height);
        for (let a = 0;a < n.data.length; a++)
          n.data[a] = this.data[a];
        e(n);
      }).on("error", function(n) {
        r(n);
      });
    });
  }
  function lh(t, e, r = 90) {
    return new Promise((n, a) => {
      if (!Ke.call(t, "data") || !Ke.call(t, "width") || !Ke.call(t, "height"))
        return a(new TypeError("Invalid bitmap image provided"));
      let i2 = { data: t.data, width: t.width, height: t.height };
      e.on("error", (s) => a(s)), e.write(fr.encode(i2, r).data, () => {
        e.end(), n();
      });
    });
  }
  function fh(t, e) {
    return new Promise((r, n) => {
      try {
        let a = [];
        t.on("data", (i2) => a.push(i2)), t.on("end", () => {
          let i2 = Cn(a), s = null;
          try {
            s = fr.decode(i2, e);
          } catch (o) {
            n(o);
            return;
          }
          let l = new ot(s.width, s.height);
          for (let o = 0;o < s.width; o++)
            for (let h = 0;h < s.height; h++) {
              let u = (h * s.width + o) * 4;
              l.setPixelRGBA_i(o, h, s.data[u + 0], s.data[u + 1], s.data[u + 2], s.data[u + 3]);
            }
          r(l);
        }), t.on("error", (i2) => {
          n(i2);
        });
      } catch (a) {
        console.log(a), n(a);
      }
    });
  }
});

// node_modules/poppygl/dist/index.js
var exports_dist = {};
__export(exports_dist, {
  resolveRenderOptions: () => resolveRenderOptions,
  renderSceneFromGLTF: () => renderSceneFromGLTF,
  renderGLTFToPNGFromURL: () => renderGLTFToPNGFromURL,
  renderGLTFToPNGFromGLB: () => renderGLTFToPNGFromGLB,
  renderDrawCalls: () => renderDrawCalls,
  loadGLTFWithResourcesFromURL: () => loadGLTFWithResourcesFromURL,
  isPNG: () => isPNG,
  isJPG: () => isJPG,
  hexToRgb: () => hexToRgb,
  getDefaultRenderOptions: () => getDefaultRenderOptions,
  encodePNG: () => encodePNG,
  drawInfiniteGrid: () => drawInfiniteGrid,
  decodeImageFromBuffer: () => decodeImageFromBuffer,
  createUint8Bitmap: () => createUint8Bitmap,
  createSceneFromGLTF: () => createSceneFromGLTF,
  createInfiniteGrid: () => createInfiniteGrid,
  createGrid: () => createGrid,
  createEdgeDrawCall: () => createEdgeDrawCall,
  computeWorldAABB: () => computeWorldAABB,
  computeSmoothNormals: () => computeSmoothNormals,
  buildCamera: () => buildCamera,
  bufferFromDataURI: () => bufferFromDataURI,
  SoftwareRenderer: () => SoftwareRenderer,
  DEFAULT_RENDER_OPTIONS: () => DEFAULT_RENDER_OPTIONS,
  DEFAULT_LIGHT_DIR: () => DEFAULT_LIGHT_DIR
});
import {
  glyphAdvanceRatio,
  glyphLineAlphabet,
  textMetrics
} from "@tscircuit/alphabet";
function computeWorldAABB(drawCalls) {
  const min = [Infinity, Infinity, Infinity];
  const max2 = [-Infinity, -Infinity, -Infinity];
  const tmp = import_gl_matrix2.vec4.create();
  for (const dc of drawCalls) {
    const { positions, model } = dc;
    for (let i2 = 0;i2 < positions.length; i2 += 3) {
      import_gl_matrix2.vec4.set(tmp, positions[i2], positions[i2 + 1], positions[i2 + 2], 1);
      import_gl_matrix2.vec4.transformMat4(tmp, tmp, model);
      const x2 = tmp[0];
      const y = tmp[1];
      const z = tmp[2];
      min[0] = Math.min(min[0], x2);
      min[1] = Math.min(min[1], y);
      min[2] = Math.min(min[2], z);
      max2[0] = Math.max(max2[0], x2);
      max2[1] = Math.max(max2[1], y);
      max2[2] = Math.max(max2[2], z);
    }
  }
  if (!isFinite(min[0])) {
    return {
      min: [-1, -1, -1],
      max: [1, 1, 1]
    };
  }
  return { min, max: max2 };
}
function getWorldUpVector(up) {
  switch (up) {
    case "y-":
      return import_gl_matrix.vec3.fromValues(0, -1, 0);
    case "x+":
      return import_gl_matrix.vec3.fromValues(1, 0, 0);
    case "x-":
      return import_gl_matrix.vec3.fromValues(-1, 0, 0);
    case "z+":
      return import_gl_matrix.vec3.fromValues(0, 0, 1);
    case "z-":
      return import_gl_matrix.vec3.fromValues(0, 0, -1);
    case "y+":
    default:
      return import_gl_matrix.vec3.fromValues(0, 1, 0);
  }
}
function buildCameraWorldMatrix(eye, forward, up) {
  const normalizedForward = import_gl_matrix.vec3.normalize(import_gl_matrix.vec3.create(), forward);
  const right = import_gl_matrix.vec3.cross(import_gl_matrix.vec3.create(), normalizedForward, up);
  if (import_gl_matrix.vec3.squaredLength(right) === 0) {
    return null;
  }
  import_gl_matrix.vec3.normalize(right, right);
  const correctedUp = import_gl_matrix.vec3.cross(import_gl_matrix.vec3.create(), right, normalizedForward);
  if (import_gl_matrix.vec3.squaredLength(correctedUp) === 0) {
    return null;
  }
  import_gl_matrix.vec3.normalize(correctedUp, correctedUp);
  return import_gl_matrix.mat4.fromValues(right[0], right[1], right[2], 0, correctedUp[0], correctedUp[1], correctedUp[2], 0, -normalizedForward[0], -normalizedForward[1], -normalizedForward[2], 0, eye[0], eye[1], eye[2], 1);
}
function getDefaultForwardForUp(up) {
  const zForward = import_gl_matrix.vec3.fromValues(0, 0, -1);
  if (Math.abs(import_gl_matrix.vec3.dot(up, zForward)) < 0.999) {
    return zForward;
  }
  return import_gl_matrix.vec3.fromValues(1, 0, 0);
}
function buildViewFromRotation(eye, up, rotation) {
  const cameraWorld = buildCameraWorldMatrix(eye, getDefaultForwardForUp(up), up);
  if (!cameraWorld) {
    return import_gl_matrix.mat4.create();
  }
  if (rotation.x !== 0) {
    import_gl_matrix.mat4.rotateX(cameraWorld, cameraWorld, toRad(rotation.x));
  }
  if (rotation.y !== 0) {
    import_gl_matrix.mat4.rotateY(cameraWorld, cameraWorld, toRad(rotation.y));
  }
  if (rotation.z !== 0) {
    import_gl_matrix.mat4.rotateZ(cameraWorld, cameraWorld, toRad(rotation.z));
  }
  const view = import_gl_matrix.mat4.create();
  import_gl_matrix.mat4.invert(view, cameraWorld);
  return view;
}
function buildViewFromLookAt(eye, center, up) {
  const forward = import_gl_matrix.vec3.subtract(import_gl_matrix.vec3.create(), center, eye);
  if (import_gl_matrix.vec3.squaredLength(forward) === 0) {
    return import_gl_matrix.mat4.create();
  }
  const cameraWorld = buildCameraWorldMatrix(eye, forward, up);
  if (!cameraWorld) {
    return import_gl_matrix.mat4.create();
  }
  const view = import_gl_matrix.mat4.create();
  import_gl_matrix.mat4.invert(view, cameraWorld);
  return view;
}
function getAutoDistance(drawCalls, fovDeg) {
  const aabb = computeWorldAABB(drawCalls);
  const diag = import_gl_matrix.vec3.distance(import_gl_matrix.vec3.fromValues(aabb.min[0], aabb.min[1], aabb.min[2]), import_gl_matrix.vec3.fromValues(aabb.max[0], aabb.max[1], aabb.max[2]));
  const radius = diag * 0.5;
  const fov = toRad(fovDeg);
  return radius / Math.tan(fov * 0.5) + radius * 0.5;
}
function getAABBCornerDistances(aabb, eye) {
  const xs = [aabb.min[0], aabb.max[0]];
  const ys = [aabb.min[1], aabb.max[1]];
  const zs = [aabb.min[2], aabb.max[2]];
  const nearest = Math.hypot(...[0, 1, 2].map((axis) => Math.max(aabb.min[axis] - eye[axis], 0, eye[axis] - aabb.max[axis])));
  let farthest = 0;
  for (const x2 of xs) {
    for (const y of ys) {
      for (const z of zs) {
        const distance = import_gl_matrix.vec3.distance(eye, import_gl_matrix.vec3.fromValues(x2, y, z));
        farthest = Math.max(farthest, distance);
      }
    }
  }
  return { nearest, farthest };
}
function getCameraForwardFromView(view) {
  const cameraWorld = import_gl_matrix.mat4.create();
  import_gl_matrix.mat4.invert(cameraWorld, view);
  return import_gl_matrix.vec3.fromValues(-cameraWorld[8], -cameraWorld[9], -cameraWorld[10]);
}
function buildCamera(drawCalls, width, height, fovDeg, camPos, lookAt, up = "y+", cameraRotation = null) {
  const aspect = width / height;
  const worldUp = getWorldUpVector(up);
  const aabb = computeWorldAABB(drawCalls);
  const center = import_gl_matrix.vec3.fromValues(0.5 * (aabb.min[0] + aabb.max[0]), 0.5 * (aabb.min[1] + aabb.max[1]), 0.5 * (aabb.min[2] + aabb.max[2]));
  const autoDistance = getAutoDistance(drawCalls, fovDeg);
  if (cameraRotation) {
    const provisionalEye = camPos ? import_gl_matrix.vec3.fromValues(camPos[0], camPos[1], camPos[2]) : import_gl_matrix.vec3.clone(center);
    const provisionalView = buildViewFromRotation(provisionalEye, worldUp, cameraRotation);
    const eye2 = camPos ? provisionalEye : import_gl_matrix.vec3.scaleAndAdd(import_gl_matrix.vec3.create(), center, getCameraForwardFromView(provisionalView), -autoDistance);
    const { nearest: nearest2, farthest: farthest2 } = getAABBCornerDistances(aabb, eye2);
    const near2 = Math.max(0.01, nearest2 * 0.5);
    const far2 = Math.max(1000, farthest2 * 1.1);
    const proj2 = import_gl_matrix.mat4.create();
    import_gl_matrix.mat4.perspective(proj2, toRad(fovDeg), aspect, near2, far2);
    return {
      view: buildViewFromRotation(eye2, worldUp, cameraRotation),
      proj: proj2
    };
  }
  const eye = camPos ? import_gl_matrix.vec3.fromValues(camPos[0], camPos[1], camPos[2]) : import_gl_matrix.vec3.fromValues(center[0] + autoDistance, center[1] + autoDistance * 0.3, center[2] + autoDistance);
  const target = lookAt ? import_gl_matrix.vec3.fromValues(lookAt[0], lookAt[1], lookAt[2]) : center;
  const { nearest, farthest } = getAABBCornerDistances(aabb, eye);
  const near = Math.max(0.01, nearest * 0.5);
  const far = Math.max(1000, farthest * 1.1);
  const proj = import_gl_matrix.mat4.create();
  import_gl_matrix.mat4.perspective(proj, toRad(fovDeg), aspect, near, far);
  const view = buildViewFromLookAt(eye, target, worldUp);
  return { view, proj };
}
function createGrid(options = {}) {
  const size = options.size ?? 10;
  const sizeX = typeof size === "number" ? size : size[0];
  const sizeZ = typeof size === "number" ? size : size[2];
  const divisions = options.divisions ?? 10;
  const color = options.color ?? [0.5, 0.5, 0.5];
  const offset = { x: 0, y: 0, z: 0, ...options.offset };
  const positions = [];
  const indices = [];
  let vertexIndex = 0;
  const halfSizeX = sizeX / 2;
  const halfSizeZ = sizeZ / 2;
  const stepX = sizeX / divisions;
  const stepZ = sizeZ / divisions;
  for (let i2 = 0;i2 <= divisions; i2++) {
    const pX = -halfSizeX + i2 * stepX;
    const pZ = -halfSizeZ + i2 * stepZ;
    positions.push(pX, 0, -halfSizeZ);
    positions.push(pX, 0, halfSizeZ);
    indices.push(vertexIndex++, vertexIndex++);
    positions.push(-halfSizeX, 0, pZ);
    positions.push(halfSizeX, 0, pZ);
    indices.push(vertexIndex++, vertexIndex++);
  }
  const model = import_gl_matrix3.mat4.create();
  import_gl_matrix3.mat4.fromTranslation(model, [offset.x, offset.y, offset.z]);
  return {
    positions: new Float32Array(positions),
    indices: new Uint32Array(indices),
    normals: null,
    uvs: null,
    model,
    material: {
      baseColorFactor: [...color, 1],
      baseColorTexture: null
    },
    mode: 1
  };
}
function positionKey(positions, index) {
  return `${positions[index * 3 + 0]},${positions[index * 3 + 1]},${positions[index * 3 + 2]}`;
}
function triangleNormal(positions, i0, i1, i2) {
  const ax = positions[i1 * 3 + 0] - positions[i0 * 3 + 0];
  const ay = positions[i1 * 3 + 1] - positions[i0 * 3 + 1];
  const az = positions[i1 * 3 + 2] - positions[i0 * 3 + 2];
  const bx = positions[i2 * 3 + 0] - positions[i0 * 3 + 0];
  const by = positions[i2 * 3 + 1] - positions[i0 * 3 + 1];
  const bz = positions[i2 * 3 + 2] - positions[i0 * 3 + 2];
  const nx = ay * bz - az * by;
  const ny = az * bx - ax * bz;
  const nz = ax * by - ay * bx;
  const length = Math.hypot(nx, ny, nz);
  if (length === 0)
    return null;
  return [nx / length, ny / length, nz / length];
}
function addEdge(edges, positions, i0, i1, normal) {
  const key0 = positionKey(positions, i0);
  const key1 = positionKey(positions, i1);
  const isForward = key0 < key1;
  const key = isForward ? `${key0}|${key1}` : `${key1}|${key0}`;
  const indices = isForward ? [i0, i1] : [i1, i0];
  const existing = edges.get(key);
  if (existing) {
    if (normal)
      existing.normals.push(normal);
  } else {
    edges.set(key, { indices, normals: normal ? [normal] : [] });
  }
}
function hasCrease(normals, minimumDot) {
  if (normals.length < 2)
    return true;
  for (let i2 = 0;i2 < normals.length; i2++) {
    for (let j = i2 + 1;j < normals.length; j++) {
      const a = normals[i2];
      const b = normals[j];
      const dot2 = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
      if (dot2 < minimumDot)
        return true;
    }
  }
  return false;
}
function createEdgeDrawCall(mesh, creaseAngleDegrees = DEFAULT_CREASE_ANGLE_DEGREES) {
  if (mesh.mode != null && mesh.mode !== 4)
    return null;
  const vertexCount = Math.floor(mesh.positions.length / 3);
  const triangleIndices = mesh.indices ?? Uint32Array.from({ length: vertexCount }, (_, i2) => i2);
  if (triangleIndices.length < 3)
    return null;
  const edges = /* @__PURE__ */ new Map;
  for (let i2 = 0;i2 + 2 < triangleIndices.length; i2 += 3) {
    const i0 = triangleIndices[i2];
    const i1 = triangleIndices[i2 + 1];
    const i22 = triangleIndices[i2 + 2];
    const normal = triangleNormal(mesh.positions, i0, i1, i22);
    addEdge(edges, mesh.positions, i0, i1, normal);
    addEdge(edges, mesh.positions, i1, i22, normal);
    addEdge(edges, mesh.positions, i22, i0, normal);
  }
  const minimumDot = Math.cos(creaseAngleDegrees * Math.PI / 180);
  const edgeIndices = [];
  for (const edge2 of edges.values()) {
    if (!hasCrease(edge2.normals, minimumDot))
      continue;
    edgeIndices.push(edge2.indices[0], edge2.indices[1]);
  }
  if (edgeIndices.length === 0)
    return null;
  return {
    positions: mesh.positions,
    normals: null,
    uvs: null,
    indices: new Uint32Array(edgeIndices),
    model: mesh.model,
    material: {
      baseColorFactor: [0, 0, 0, 1],
      baseColorTexture: null,
      alphaMode: "BLEND"
    },
    mode: 1
  };
}
function downsampleBitmap(source, targetWidth, targetHeight, imageFactory) {
  const target = imageFactory(targetWidth, targetHeight);
  const scaleX = source.width / targetWidth;
  const scaleY = source.height / targetHeight;
  for (let y = 0;y < targetHeight; y++) {
    const srcY0 = Math.floor(y * scaleY);
    const srcY1 = Math.max(srcY0 + 1, Math.min(source.height, Math.floor((y + 1) * scaleY)));
    for (let x2 = 0;x2 < targetWidth; x2++) {
      const srcX0 = Math.floor(x2 * scaleX);
      const srcX1 = Math.max(srcX0 + 1, Math.min(source.width, Math.floor((x2 + 1) * scaleX)));
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let count = 0;
      for (let sy = srcY0;sy < srcY1; sy++) {
        for (let sx = srcX0;sx < srcX1; sx++) {
          const srcIdx = (sy * source.width + sx) * 4;
          r += source.data[srcIdx + 0];
          g += source.data[srcIdx + 1];
          b += source.data[srcIdx + 2];
          a += source.data[srcIdx + 3];
          count++;
        }
      }
      const dstIdx = (y * targetWidth + x2) * 4;
      target.data[dstIdx + 0] = Math.round(r / count);
      target.data[dstIdx + 1] = Math.round(g / count);
      target.data[dstIdx + 2] = Math.round(b / count);
      target.data[dstIdx + 3] = Math.round(a / count);
    }
  }
  return target;
}
function computeSmoothNormals(positions, indices) {
  const normals = new Float32Array(positions.length);
  const vertexCount = positions.length / 3 | 0;
  const indexArray = indices ?? (() => {
    const arr = new Uint32Array(vertexCount);
    for (let i2 = 0;i2 < vertexCount; i2++)
      arr[i2] = i2;
    return arr;
  })();
  for (let i2 = 0;i2 < indexArray.length; i2 += 3) {
    const i0 = indexArray[i2 + 0];
    const i1 = indexArray[i2 + 1];
    const i22 = indexArray[i2 + 2];
    const p0 = [
      positions[i0 * 3 + 0],
      positions[i0 * 3 + 1],
      positions[i0 * 3 + 2]
    ];
    const p1 = [
      positions[i1 * 3 + 0],
      positions[i1 * 3 + 1],
      positions[i1 * 3 + 2]
    ];
    const p2 = [
      positions[i22 * 3 + 0],
      positions[i22 * 3 + 1],
      positions[i22 * 3 + 2]
    ];
    const v10 = [
      p1[0] - p0[0],
      p1[1] - p0[1],
      p1[2] - p0[2]
    ];
    const v20 = [
      p2[0] - p0[0],
      p2[1] - p0[1],
      p2[2] - p0[2]
    ];
    const nx = v10[1] * v20[2] - v10[2] * v20[1];
    const ny = v10[2] * v20[0] - v10[0] * v20[2];
    const nz = v10[0] * v20[1] - v10[1] * v20[0];
    const base0 = i0 * 3;
    const base1 = i1 * 3;
    const base2 = i22 * 3;
    normals[base0 + 0] = normals[base0 + 0] + nx;
    normals[base0 + 1] = normals[base0 + 1] + ny;
    normals[base0 + 2] = normals[base0 + 2] + nz;
    normals[base1 + 0] = normals[base1 + 0] + nx;
    normals[base1 + 1] = normals[base1 + 1] + ny;
    normals[base1 + 2] = normals[base1 + 2] + nz;
    normals[base2 + 0] = normals[base2 + 0] + nx;
    normals[base2 + 1] = normals[base2 + 1] + ny;
    normals[base2 + 2] = normals[base2 + 2] + nz;
  }
  for (let i2 = 0;i2 < vertexCount; i2++) {
    const nx = normals[i2 * 3 + 0];
    const ny = normals[i2 * 3 + 1];
    const nz = normals[i2 * 3 + 2];
    const invLength = 1 / (Math.hypot(nx, ny, nz) || 1);
    normals[i2 * 3 + 0] = nx * invLength;
    normals[i2 * 3 + 1] = ny * invLength;
    normals[i2 * 3 + 2] = nz * invLength;
  }
  return normals;
}
function hexToRgb(hex) {
  const cleanHex = hex.replace(/^#/, "");
  if (!/^[0-9A-Fa-f]{6}$/.test(cleanHex)) {
    return null;
  }
  const r = Number.parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = Number.parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = Number.parseInt(cleanHex.substring(4, 6), 16) / 255;
  return [r, g, b];
}
function getDefaultRenderOptions() {
  return { ...DEFAULT_RENDER_OPTIONS };
}
function mulColor(a, b) {
  return [a[0] * b[0], a[1] * b[1], a[2] * b[2], a[3] * b[3]];
}
function srgbEncodeLinear01(linear) {
  if (linear <= 0.0031308)
    return 12.92 * linear;
  return 1.055 * Math.pow(linear, 1 / 2.4) - 0.055;
}
function srgbDecodeToLinear01(srgb) {
  if (srgb <= 0.04045)
    return srgb / 12.92;
  return ((srgb + 0.055) / 1.055) ** 2.4;
}
function clipMeshToNearPlane(mesh, mvp) {
  const count = mesh.positions.length / 3;
  const distances = new Float64Array(count);
  let needsClipping = false;
  for (let i2 = 0;i2 < count; i2++) {
    const distance = (mvp[2] + mvp[3]) * mesh.positions[i2 * 3] + (mvp[6] + mvp[7]) * mesh.positions[i2 * 3 + 1] + (mvp[10] + mvp[11]) * mesh.positions[i2 * 3 + 2] + mvp[14] + mvp[15];
    distances[i2] = distance;
    if (!(distance >= 0))
      needsClipping = true;
  }
  if (!needsClipping)
    return mesh;
  const positions = Array.from(mesh.positions);
  const normals = mesh.normals ? Array.from(mesh.normals) : null;
  const uvs = mesh.uvs ? Array.from(mesh.uvs) : null;
  const colors = mesh.colors ? Array.from(mesh.colors) : null;
  const indices = [];
  const sourceIndices = mesh.indices ?? Uint32Array.from({ length: count }, (_, i2) => i2);
  const intersections = /* @__PURE__ */ new Map;
  const intersect = (a, b) => {
    if (a > b)
      [a, b] = [b, a];
    if (distances[a] === 0)
      return a;
    if (distances[b] === 0)
      return b;
    const key = `${a}:${b}`;
    const cached = intersections.get(key);
    if (cached !== undefined)
      return cached;
    const t = distances[a] / (distances[a] - distances[b]);
    const index = positions.length / 3;
    const interpolate = (values, size) => {
      if (!values)
        return;
      for (let k = 0;k < size; k++) {
        const start = values[a * size + k];
        values.push(start + t * (values[b * size + k] - start));
      }
    };
    interpolate(positions, 3);
    interpolate(normals, 3);
    interpolate(uvs, 2);
    interpolate(colors, 3);
    intersections.set(key, index);
    return index;
  };
  for (let i2 = 0;i2 < sourceIndices.length; i2 += 3) {
    const triangle = [
      sourceIndices[i2],
      sourceIndices[i2 + 1],
      sourceIndices[i2 + 2]
    ];
    if (triangle.some((vertex) => !Number.isFinite(distances[vertex])))
      continue;
    const polygon = [];
    for (let j = 0;j < 3; j++) {
      const a = triangle[j];
      const b = triangle[(j + 1) % 3];
      const aInside = distances[a] >= 0;
      const bInside = distances[b] >= 0;
      if (aInside)
        polygon.push(a);
      if (aInside !== bInside)
        polygon.push(intersect(a, b));
    }
    for (let j = 1;j + 1 < polygon.length; j++) {
      indices.push(polygon[0], polygon[j], polygon[j + 1]);
    }
  }
  return {
    ...mesh,
    positions: new Float32Array(positions),
    normals: normals ? new Float32Array(normals) : null,
    uvs: uvs ? new Float32Array(uvs) : null,
    colors: colors ? new Float32Array(colors) : null,
    indices: new Uint32Array(indices)
  };
}
function edge(a, b, p) {
  return (p[0] - a[0]) * (b[1] - a[1]) - (p[1] - a[1]) * (b[0] - a[0]);
}
function drawDebugPoints(renderer, camera, debugPoints, debugFontSize, debugPointColor, debugLabelColor) {
  if (debugPoints.length === 0)
    return;
  const viewProj = import_gl_matrix4.mat4.create();
  import_gl_matrix4.mat4.multiply(viewProj, camera.proj, camera.view);
  const markerColor = toColorRGBA(debugPointColor, DEFAULT_MARKER_COLOR);
  const textColor = toColorRGBA(debugLabelColor, DEFAULT_TEXT_COLOR);
  const labelScale = typeof debugFontSize === "number" && Number.isFinite(debugFontSize) ? Math.max(1, Math.round(debugFontSize)) : Math.max(12, Math.round(Math.min(renderer.width, renderer.height) * 0.028));
  const textThickness = Math.max(2, Math.round(labelScale * textMetrics.strokeWidthRatio));
  for (const debugPoint of debugPoints) {
    const projected = projectWorldToScreen(debugPoint.position, viewProj, renderer);
    if (!projected)
      continue;
    drawMarker(renderer, projected, markerColor);
    drawLabel(renderer, projected, debugPoint.label, textColor, labelScale, textThickness);
  }
}
function projectWorldToScreen(position, viewProj, renderer) {
  const clip = import_gl_matrix4.vec4.fromValues(position.x, position.y, position.z, 1);
  import_gl_matrix4.vec4.transformMat4(clip, clip, viewProj);
  if (!Number.isFinite(clip[3]) || clip[3] <= 0)
    return null;
  const invW = 1 / clip[3];
  const ndcX = clip[0] * invW;
  const ndcY = clip[1] * invW;
  const ndcZ = clip[2] * invW;
  if (!Number.isFinite(ndcX) || !Number.isFinite(ndcY) || !Number.isFinite(ndcZ) || ndcZ < -1 || ndcZ > 1) {
    return null;
  }
  return {
    x: (ndcX * 0.5 + 0.5) * (renderer.width - 1),
    y: (1 - (ndcY * 0.5 + 0.5)) * (renderer.height - 1)
  };
}
function drawMarker(renderer, projected, color) {
  const centerX = Math.round(projected.x);
  const centerY = Math.round(projected.y);
  for (let offset = -5;offset <= 4; offset += 1) {
    renderer.setPixel(centerX + offset, centerY, color[0], color[1], color[2], color[3]);
    renderer.setPixel(centerX, centerY + offset, color[0], color[1], color[2], color[3]);
  }
}
function drawLabel(renderer, projected, label, color, scale, textThickness) {
  if (label.length === 0)
    return;
  const scaleX = scale * CHARACTER_WIDTH_RATIO;
  const labelWidth = measureLabelWidth(label, scaleX);
  let x2 = projected.x + scale * 0.6;
  let y = projected.y - scale * 1.1;
  if (x2 + labelWidth > renderer.width - 2) {
    x2 = projected.x - scale * 0.6 - labelWidth;
  }
  if (y < 2) {
    y = projected.y + scale * 0.2;
  }
  drawStrokeText(renderer, label, x2, y, scaleX, scale, color, textThickness);
}
function drawStrokeText(renderer, text, x2, y, scaleX, scaleY, color, thickness) {
  let cursorX = x2;
  for (const rawChar of text) {
    const char = resolveGlyph(rawChar);
    const glyph = glyphLineAlphabet[char];
    const advanceRatio = glyphAdvanceRatio[char] ?? (char === " " ? textMetrics.spaceWidthRatio : textMetrics.glyphWidthRatio);
    if (glyph) {
      for (const segment of glyph) {
        drawLine(renderer, cursorX + segment.x1 * scaleX, y + (1 - segment.y1) * scaleY, cursorX + segment.x2 * scaleX, y + (1 - segment.y2) * scaleY, color, thickness);
      }
    }
    cursorX += advanceRatio * scaleX;
  }
}
function resolveGlyph(char) {
  if (glyphLineAlphabet[char])
    return char;
  const uppercase = char.toUpperCase();
  if (glyphLineAlphabet[uppercase])
    return uppercase;
  return "?";
}
function measureLabelWidth(text, scaleX) {
  let width = 0;
  for (const rawChar of text) {
    const char = resolveGlyph(rawChar);
    width += glyphAdvanceRatio[char] ?? (char === " " ? textMetrics.spaceWidthRatio : textMetrics.glyphWidthRatio);
  }
  return width * scaleX;
}
function drawLine(renderer, x0, y0, x1, y1, color, thickness) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  if (steps === 0) {
    drawBrush(renderer, x0, y0, color, thickness);
    return;
  }
  for (let step = 0;step <= steps; step += 1) {
    const t = step / steps;
    drawBrush(renderer, x0 + dx * t, y0 + dy * t, color, thickness);
  }
}
function drawBrush(renderer, x2, y, color, thickness) {
  const radius = Math.max(0, Math.floor((thickness - 1) / 2));
  const centerX = Math.round(x2);
  const centerY = Math.round(y);
  for (let offsetY = -radius;offsetY <= radius; offsetY += 1) {
    for (let offsetX = -radius;offsetX <= radius; offsetX += 1) {
      renderer.setPixel(centerX + offsetX, centerY + offsetY, color[0], color[1], color[2], color[3]);
    }
  }
}
function toColorRGBA(color, fallback) {
  if (!color)
    return fallback;
  return [color[0], color[1], color[2], 255];
}
function computeGridLineIntensity(params) {
  const rx = params.world_x / params.cell_size;
  const rz = params.world_z / params.cell_size;
  const fract_x = rx - Math.floor(rx + 0.5);
  const fract_z = rz - Math.floor(rz + 0.5);
  const grid_x = Math.abs(fract_x);
  const grid_z = Math.abs(fract_z);
  const pixel_size_in_world = params.dist / Math.min(params.screen_width, params.screen_height);
  const fwidth_x = pixel_size_in_world / params.cell_size;
  const fwidth_z = pixel_size_in_world / params.cell_size;
  const line_x = grid_x / (fwidth_x + 0.0001);
  const line_z = grid_z / (fwidth_z + 0.0001);
  const line = Math.min(line_x, line_z);
  return 1 - Math.min(line * params.line_thickness_multiplier, 1);
}
function computeGridFadeAlpha(params) {
  const fade_start = params.fade_distance;
  const fade_end = params.fade_distance * params.fade_strength;
  return 1 - Math.min(1, Math.max(0, (params.dist - fade_start) / (fade_end - fade_start)));
}
function drawInfiniteGrid(software_renderer, params) {
  const grid_y = params.grid_y ?? 0;
  const cell_size = params.cell_size ?? 1;
  const section_size = params.section_size ?? 10;
  const fade_distance = params.fade_distance ?? 100;
  const fade_strength = params.fade_strength ?? 1.5;
  const grid_color = params.grid_color ?? [0.93, 0.93, 0.93];
  const section_color = params.section_color ?? [0.8, 0.8, 1];
  const gamma_out = params.gamma_out ?? true;
  const camera = params.camera;
  const view = camera.view;
  const proj = camera.proj;
  const inv_view = import_gl_matrix6.mat4.create();
  import_gl_matrix6.mat4.invert(inv_view, view);
  const cam_pos_x = inv_view[12];
  const cam_pos_y = inv_view[13];
  const cam_pos_z = inv_view[14];
  const vp = import_gl_matrix6.mat4.create();
  import_gl_matrix6.mat4.multiply(vp, proj, view);
  const inv_vp = import_gl_matrix6.mat4.create();
  import_gl_matrix6.mat4.invert(inv_vp, vp);
  for (let y = 0;y < software_renderer.height; y++) {
    for (let x2 = 0;x2 < software_renderer.width; x2++) {
      const ndc_x = x2 / (software_renderer.width - 1) * 2 - 1;
      const ndc_y = 1 - y / (software_renderer.height - 1) * 2;
      const near_point = import_gl_matrix6.vec4.fromValues(ndc_x, ndc_y, -1, 1);
      const far_point = import_gl_matrix6.vec4.fromValues(ndc_x, ndc_y, 1, 1);
      import_gl_matrix6.vec4.transformMat4(near_point, near_point, inv_vp);
      import_gl_matrix6.vec4.transformMat4(far_point, far_point, inv_vp);
      near_point[0] /= near_point[3];
      near_point[1] /= near_point[3];
      near_point[2] /= near_point[3];
      far_point[0] /= far_point[3];
      far_point[1] /= far_point[3];
      far_point[2] /= far_point[3];
      const ray_dir_x = far_point[0] - near_point[0];
      const ray_dir_y = far_point[1] - near_point[1];
      const ray_dir_z = far_point[2] - near_point[2];
      if (Math.abs(ray_dir_y) < 0.000001)
        continue;
      const t = (grid_y - near_point[1]) / ray_dir_y;
      if (t < 0 || t > 1)
        continue;
      const world_x = near_point[0] + t * ray_dir_x;
      const world_z = near_point[2] + t * ray_dir_z;
      const world_pt = import_gl_matrix6.vec4.fromValues(world_x, grid_y, world_z, 1);
      const clip_pt = import_gl_matrix6.vec4.create();
      import_gl_matrix6.vec4.transformMat4(clip_pt, world_pt, vp);
      const ndc_z = clip_pt[2] / clip_pt[3];
      const depth_01 = ndc_z * 0.5 + 0.5;
      const di = y * software_renderer.width + x2;
      if (depth_01 >= software_renderer.depth[di])
        continue;
      const dx = world_x - cam_pos_x;
      const dy = grid_y - cam_pos_y;
      const dz = world_z - cam_pos_z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const alpha = computeGridFadeAlpha({
        dist,
        fade_distance,
        fade_strength
      });
      if (alpha <= 0)
        continue;
      const g1 = computeGridLineIntensity({
        world_x,
        world_z,
        cell_size,
        dist,
        screen_width: software_renderer.width,
        screen_height: software_renderer.height,
        line_thickness_multiplier: 0.8
      });
      const g2 = computeGridLineIntensity({
        world_x,
        world_z,
        cell_size: section_size,
        dist,
        screen_width: software_renderer.width,
        screen_height: software_renderer.height,
        line_thickness_multiplier: 0.5
      });
      const grid_strength = Math.max(g1, g2);
      if (grid_strength <= 0)
        continue;
      const final_r = grid_color[0] * (1 - g2) + section_color[0] * g2;
      const final_g = grid_color[1] * (1 - g2) + section_color[1] * g2;
      const final_b = grid_color[2] * (1 - g2) + section_color[2] * g2;
      const final_alpha = grid_strength * alpha;
      if (final_alpha <= 0.01)
        continue;
      let out_r = final_r;
      let out_g = final_g;
      let out_b = final_b;
      if (gamma_out) {
        out_r = srgbEncodeLinear01(clamp(out_r, 0, 1));
        out_g = srgbEncodeLinear01(clamp(out_g, 0, 1));
        out_b = srgbEncodeLinear01(clamp(out_b, 0, 1));
      } else {
        out_r = clamp(out_r, 0, 1);
        out_g = clamp(out_g, 0, 1);
        out_b = clamp(out_b, 0, 1);
      }
      const dst_idx = (y * software_renderer.width + x2) * 4;
      const dst_r = (software_renderer.buffer[dst_idx + 0] ?? 0) / 255;
      const dst_g = (software_renderer.buffer[dst_idx + 1] ?? 0) / 255;
      const dst_b = (software_renderer.buffer[dst_idx + 2] ?? 0) / 255;
      const dst_a = (software_renderer.buffer[dst_idx + 3] ?? 0) / 255;
      const one_minus_a = 1 - final_alpha;
      const blend_r = out_r * final_alpha + dst_r * one_minus_a;
      const blend_g = out_g * final_alpha + dst_g * one_minus_a;
      const blend_b = out_b * final_alpha + dst_b * one_minus_a;
      const blend_a = final_alpha + dst_a * one_minus_a;
      software_renderer.setPixel(x2, y, clamp(blend_r, 0, 1) * 255 | 0, clamp(blend_g, 0, 1) * 255 | 0, clamp(blend_b, 0, 1) * 255 | 0, clamp(blend_a, 0, 1) * 255 | 0);
    }
  }
}
function resolveCameraUp(up) {
  return up != null && CAMERA_UP_VALUES.has(up) ? up : DEFAULT_RENDER_OPTIONS.up;
}
function resolveCameraRotation(cameraRotation) {
  if (cameraRotation == null) {
    return DEFAULT_RENDER_OPTIONS.cameraRotation;
  }
  const resolveAxis = (value) => typeof value === "number" && Number.isFinite(value) ? value : 0;
  return {
    x: resolveAxis(cameraRotation.x),
    y: resolveAxis(cameraRotation.y),
    z: resolveAxis(cameraRotation.z)
  };
}
function resolveRenderOptions(options = {}) {
  const supersampling = typeof options.supersampling === "number" && Number.isFinite(options.supersampling) ? Math.max(1, Math.floor(options.supersampling)) : DEFAULT_RENDER_OPTIONS.supersampling;
  return {
    ...DEFAULT_RENDER_OPTIONS,
    ...options,
    supersampling,
    lightDir: options.lightDir != null ? options.lightDir : DEFAULT_RENDER_OPTIONS.lightDir,
    camPos: options.camPos !== undefined ? options.camPos : DEFAULT_RENDER_OPTIONS.camPos,
    lookAt: options.lookAt !== undefined ? options.lookAt : DEFAULT_RENDER_OPTIONS.lookAt,
    up: resolveCameraUp(options.up),
    cameraRotation: resolveCameraRotation(options.cameraRotation)
  };
}
function dotNormal(normal, direction) {
  return normal[0] * direction[0] + normal[1] * direction[1] + normal[2] * direction[2];
}
function radicalInverse(value) {
  let result = 0, factor = 0.5;
  while (value) {
    result += (value & 1) * factor;
    value >>>= 1;
    factor *= 0.5;
  }
  return result;
}
function basis(n) {
  const t = normalize(Math.abs(n[1]) < 0.999 ? [n[2], 0, -n[0]] : [1, 0, 0]);
  return [
    t,
    [
      n[1] * t[2] - n[2] * t[1],
      n[2] * t[0] - n[0] * t[2],
      n[0] * t[1] - n[1] * t[0]
    ]
  ];
}
function orient(x2, y, z, n, t, b) {
  return [
    t[0] * x2 + b[0] * y + n[0] * z,
    t[1] * x2 + b[1] * y + n[1] * z,
    t[2] * x2 + b[2] * y + n[2] * z
  ];
}
function tableLookup(n) {
  const x2 = (Math.atan2(n[2], n[0]) / (2 * Math.PI) + 0.5) * W - 0.5;
  const y = Math.max(0, Math.min(H - 1, Math.acos(Math.max(-1, Math.min(1, n[1]))) / Math.PI * H - 0.5));
  const ix = Math.floor(x2), iy = Math.floor(y), fx = x2 - ix, fy = y - iy;
  const a = (ix % W + W) % W, b = (a + 1) % W, c = Math.min(H - 1, iy + 1);
  return [iy * W + a, iy * W + b, c * W + a, c * W + b, fx, fy];
}
function sampleTable(table, lookup) {
  const [i00, i10, i01, i11, fx, fy] = lookup;
  return (table[i00] * (1 - fx) + table[i10] * fx) * (1 - fy) + (table[i01] * (1 - fx) + table[i11] * fx) * fy;
}
function getTables() {
  if (cachedTables)
    return cachedTables;
  const diffuse = lobes.map(() => new Float32Array(W * H));
  const specular = ROUGHNESSES.map(() => lobes.map(() => new Float32Array(W * H)));
  const diffuseSamples = Array.from({ length: SAMPLES }, (_, i2) => {
    const phi = 2 * Math.PI * radicalInverse(i2), r = Math.sqrt((i2 + 0.5) / SAMPLES);
    return [r * Math.cos(phi), r * Math.sin(phi), Math.sqrt(1 - r * r)];
  });
  const halfSamples = ROUGHNESSES.map((rough) => Array.from({ length: SAMPLES }, (_, i2) => {
    const phi = 2 * Math.PI * radicalInverse(i2), u = (i2 + 0.5) / SAMPLES, a = rough * rough;
    const cos = Math.sqrt((1 - u) / (1 + (a * a - 1) * u)), sin = Math.sqrt(1 - cos * cos);
    return [sin * Math.cos(phi), sin * Math.sin(phi), cos];
  }));
  for (let y = 0;y < H; y++)
    for (let x2 = 0;x2 < W; x2++) {
      const theta = (y + 0.5) / H * Math.PI, phi = ((x2 + 0.5) / W - 0.5) * 2 * Math.PI;
      const n = [
        Math.sin(theta) * Math.cos(phi),
        Math.cos(theta),
        Math.sin(theta) * Math.sin(phi)
      ];
      const [t, b] = basis(n), index = y * W + x2;
      for (const s of diffuseSamples) {
        const l = orient(...s, n, t, b);
        for (let j = 0;j < lobes.length; j++)
          diffuse[j][index] += Math.exp(lobes[j].sharpness * (dot(l, lobes[j].direction) - 1)) / SAMPLES;
      }
      for (let r = 0;r < ROUGHNESSES.length; r++) {
        let weight = 0;
        for (const s of halfSamples[r]) {
          const h = orient(...s, n, t, b), nh = dot(n, h);
          const l = [
            2 * nh * h[0] - n[0],
            2 * nh * h[1] - n[1],
            2 * nh * h[2] - n[2]
          ];
          const nl = Math.max(0, dot(n, l));
          weight += nl;
          for (let j = 0;j < lobes.length; j++)
            specular[r][j][index] += Math.exp(lobes[j].sharpness * (dot(l, lobes[j].direction) - 1)) * nl;
        }
        for (let j = 0;j < lobes.length; j++)
          specular[r][j][index] /= Math.max(weight, 0.00000001);
      }
    }
  const brdf = new Float32Array(64 * 64 * 2);
  for (let y = 0;y < 64; y++)
    for (let x2 = 0;x2 < 64; x2++) {
      const rough = (y + 0.5) / 64, nv = (x2 + 0.5) / 64, a = rough * rough, a2 = a * a;
      const v = [Math.sqrt(1 - nv * nv), 0, nv];
      let A = 0, B = 0;
      for (let i2 = 0;i2 < SAMPLES; i2++) {
        const u = (i2 + 0.5) / SAMPLES, phi = 2 * Math.PI * radicalInverse(i2);
        const nh = Math.sqrt((1 - u) / (1 + (a2 - 1) * u)), sin = Math.sqrt(1 - nh * nh);
        const h = [sin * Math.cos(phi), sin * Math.sin(phi), nh], vh = Math.max(0, dot(v, h));
        const nl = 2 * vh * nh - nv;
        if (nl <= 0)
          continue;
        const gv = 2 * nv / (nv + Math.sqrt(a2 + (1 - a2) * nv * nv));
        const gl = 2 * nl / (nl + Math.sqrt(a2 + (1 - a2) * nl * nl));
        const vis = gv * gl * vh / Math.max(nh * nv, 0.00000001), f = (1 - vh) ** 5;
        A += (1 - f) * vis;
        B += f * vis;
      }
      const index = (y * 64 + x2) * 2;
      brdf[index] = A / SAMPLES;
      brdf[index + 1] = B / SAMPLES;
    }
  cachedTables = { diffuse, specular, brdf };
  return cachedTables;
}
function renderDrawCalls(drawCalls, optionsInput = {}, imageFactory = createUint8Bitmap) {
  const options = resolveRenderOptions(optionsInput);
  const renderWidth = options.width * options.supersampling;
  const renderHeight = options.height * options.supersampling;
  const camera = buildCamera(drawCalls, renderWidth, renderHeight, options.fov, options.camPos ?? null, options.lookAt ?? null, options.up, options.cameraRotation ?? null);
  const renderer = new SoftwareRenderer(renderWidth, renderHeight, imageFactory, options.realistic);
  let rgb = null;
  if (options.backgroundColor) {
    if (typeof options.backgroundColor === "string") {
      rgb = hexToRgb(options.backgroundColor);
    } else {
      rgb = options.backgroundColor;
    }
  }
  if (rgb) {
    const [r, g, b] = rgb;
    renderer.clear([
      Math.round(r * 255),
      Math.round(g * 255),
      Math.round(b * 255),
      255
    ]);
  } else {
    renderer.clear([0, 0, 0, 0]);
  }
  const allDrawCalls = [...drawCalls];
  let infiniteGridOptions = null;
  if (options.grid) {
    const userGridOptions = typeof options.grid === "boolean" ? {} : options.grid;
    if (userGridOptions.infiniteGrid) {
      infiniteGridOptions = userGridOptions;
    } else {
      const aabb = computeWorldAABB(drawCalls);
      const sizeX = aabb.max[0] - aabb.min[0];
      const sizeZ = aabb.max[2] - aabb.min[2];
      const maxSize = Math.max(sizeX, sizeZ);
      const defaultSize = Math.ceil(maxSize * 1.2 / 2) * 2;
      const defaultOffset = {
        x: (aabb.min[0] + aabb.max[0]) / 2,
        y: aabb.min[1],
        z: (aabb.min[2] + aabb.max[2]) / 2
      };
      const defaultGridOptions = {
        size: defaultSize > 0 ? defaultSize : 10,
        offset: defaultOffset
      };
      const finalGridOptions = {
        ...defaultGridOptions,
        ...userGridOptions,
        offset: {
          ...defaultGridOptions.offset,
          ...userGridOptions.offset
        }
      };
      allDrawCalls.push(createGrid(finalGridOptions));
    }
  }
  const opaqueDraws = allDrawCalls.filter((dc) => (dc.material.alphaMode ?? "OPAQUE") === "OPAQUE");
  const maskDraws = allDrawCalls.filter((dc) => (dc.material.alphaMode ?? "OPAQUE") === "MASK");
  const blendDraws = allDrawCalls.filter((dc) => (dc.material.alphaMode ?? "OPAQUE") === "BLEND");
  const studio = options.realistic ? new StudioLighting(allDrawCalls, camera) : undefined;
  let winners;
  const triangleOffsets = [];
  if (studio && opaqueDraws.length > 1 && opaqueDraws.every((dc) => dc.mode !== 1)) {
    winners = new Int32Array(renderWidth * renderHeight).fill(-1);
    let triangleOffset = 0;
    for (const dc of opaqueDraws) {
      triangleOffsets.push(triangleOffset);
      triangleOffset += renderer.drawMesh(dc, camera, { dir: options.lightDir, ambient: options.ambient }, dc.material, options.cull, options.gamma, studio, { winners, triangleOffset, depthOnly: true });
    }
    renderer.depth.fill(Infinity);
  }
  const renderGroup = (dcs, opaque = false) => {
    for (let i2 = 0;i2 < dcs.length; i2++) {
      const dc = dcs[i2];
      if (dc.mode === 1) {
        renderer.drawLines(dc, camera, options.gamma);
      } else {
        renderer.drawMesh(dc, camera, { dir: options.lightDir, ambient: options.ambient }, dc.material, options.cull, options.gamma, studio, opaque && winners ? { winners, triangleOffset: triangleOffsets[i2], depthOnly: false } : undefined);
      }
    }
  };
  renderGroup(opaqueDraws, true);
  renderGroup(maskDraws);
  if (infiniteGridOptions) {
    const aabb = computeWorldAABB(drawCalls);
    const modelCenterY = (aabb.min[1] + aabb.max[1]) / 2;
    const gridY = infiniteGridOptions.offset?.y ?? modelCenterY;
    drawInfiniteGrid(renderer, {
      camera,
      grid_y: gridY,
      cell_size: infiniteGridOptions.cellSize,
      section_size: infiniteGridOptions.sectionSize,
      fade_distance: infiniteGridOptions.fadeDistance,
      fade_strength: infiniteGridOptions.fadeStrength,
      grid_color: infiniteGridOptions.gridColor,
      section_color: infiniteGridOptions.sectionColor,
      gamma_out: options.gamma
    });
  }
  renderGroup(blendDraws);
  renderer.denoise(options.gamma);
  for (const dc of drawCalls) {
    if (!dc.showHiddenEdges)
      continue;
    const edgeDrawCall = createEdgeDrawCall(dc);
    if (!edgeDrawCall)
      continue;
    renderer.drawLines(edgeDrawCall, camera, options.gamma, {
      depthCompare: "less-equal",
      depthWrite: false,
      depthBias: 0.0001
    });
    renderer.drawLines(edgeDrawCall, camera, options.gamma, {
      depthCompare: "greater",
      depthWrite: false,
      depthBias: 0.0001,
      dashed: true,
      dashLength: 4 * options.supersampling,
      opacity: 0.35
    });
  }
  if (options.debugPoints?.length) {
    drawDebugPoints(renderer, camera, options.debugPoints, options.debugFontSize, options.debugPointColor, options.debugLabelColor);
  }
  const bitmap = options.supersampling > 1 ? downsampleBitmap(renderer.bitmap, options.width, options.height, imageFactory) : renderer.bitmap;
  return { bitmap, camera, options };
}
function createInfiniteGrid(options = {}) {
  const cellSize = options.cellSize ?? 1;
  const sectionSize = options.sectionSize ?? 10;
  const fadeDistance = options.fadeDistance ?? 100;
  const fadeStrength = options.fadeStrength ?? 1.5;
  const gridColor = options.gridColor ?? [0.93, 0.93, 0.93];
  const sectionColor = options.sectionColor ?? [0.8, 0.8, 1];
  const size = 1000;
  const positions = new Float32Array([
    -size,
    0,
    -size,
    size,
    0,
    -size,
    size,
    0,
    size,
    -size,
    0,
    size
  ]);
  const indices = new Uint32Array([0, 1, 2, 0, 2, 3]);
  const model = import_gl_matrix9.mat4.create();
  const offset = options.offset ?? {};
  import_gl_matrix9.mat4.fromTranslation(model, [offset.x ?? 0, offset.y ?? 0, offset.z ?? 0]);
  return {
    positions,
    indices,
    normals: null,
    uvs: null,
    model,
    material: {
      baseColorFactor: [1, 1, 1, 1],
      baseColorTexture: null,
      alphaMode: "BLEND"
    },
    mode: 4,
    isInfiniteGrid: true,
    cellSize,
    sectionSize,
    fadeDistance,
    fadeStrength,
    gridColor,
    sectionColor
  };
}
function readShowHiddenEdges(extras) {
  if (typeof extras?.poppygl?.showHiddenEdges === "boolean") {
    return extras.poppygl.showHiddenEdges;
  }
  if (typeof extras?.showHiddenEdges === "boolean") {
    return extras.showHiddenEdges;
  }
  return;
}
function getBufferViewSlice(ctx, bufferViewIndex, byteOffset) {
  const { gltf, buffers } = ctx;
  const bufferView = gltf.bufferViews?.[bufferViewIndex];
  if (!bufferView)
    throw new Error(`Invalid bufferView index ${bufferViewIndex}`);
  if (typeof bufferView.buffer !== "number")
    throw new Error(`bufferView ${bufferViewIndex} missing buffer reference`);
  const bufferIndex = bufferView.buffer;
  const buffer = buffers[bufferIndex];
  if (!buffer)
    throw new Error(`Missing buffer at index ${bufferIndex}`);
  const viewOffset = bufferView.byteOffset ?? 0;
  const totalByteLength = bufferView.byteLength ?? buffer.byteLength - viewOffset;
  const baseOffset = buffer.byteOffset + viewOffset + byteOffset;
  const viewArray = new Uint8Array(buffer.buffer, buffer.byteOffset + viewOffset, totalByteLength);
  return {
    array: new Uint8Array(viewArray.buffer, baseOffset, totalByteLength - byteOffset),
    stride: bufferView.byteStride ?? 0,
    byteOffsetInView: baseOffset
  };
}
function readAccessorAsFloat32(ctx, accessorIndex) {
  const { gltf } = ctx;
  const accessor = gltf.accessors?.[accessorIndex];
  if (!accessor)
    throw new Error(`Invalid accessor index ${accessorIndex}`);
  if (accessor.sparse)
    throw new Error("Sparse accessors are not supported.");
  const compInfo = COMPONENT_INFO[accessor.componentType];
  const numComponents = NUM_COMPONENTS[accessor.type];
  if (!compInfo || !numComponents)
    throw new Error(`Unsupported accessor componentType ${accessor.componentType}`);
  const byteOffset = accessor.byteOffset ?? 0;
  if (typeof accessor.bufferView !== "number")
    throw new Error(`Accessor ${accessorIndex} missing bufferView`);
  const {
    array: src,
    stride: bufferViewStride,
    byteOffsetInView
  } = getBufferViewSlice(ctx, accessor.bufferView, byteOffset);
  const stride = bufferViewStride || compInfo.size * numComponents;
  const count = accessor.count;
  const out = new Float32Array(count * numComponents);
  const absoluteByteOffset = byteOffsetInView;
  const canUseTightView = stride === compInfo.size * numComponents && absoluteByteOffset % compInfo.size === 0;
  if (canUseTightView) {
    const TypedArrayCtor = compInfo.array;
    const typed = new TypedArrayCtor(src.buffer, src.byteOffset, count * numComponents);
    if (compInfo.name === "FLOAT" && !accessor.normalized) {
      return new Float32Array(typed.buffer, typed.byteOffset, typed.length);
    }
    for (let i2 = 0;i2 < typed.length; i2++) {
      out[i2] = accessor.normalized ? compInfo.norm(typed[i2]) : typed[i2];
    }
    return out;
  }
  const dataView = new DataView(src.buffer, src.byteOffset, src.byteLength);
  let outIndex = 0;
  for (let i2 = 0;i2 < count; i2++) {
    const elementOffset = i2 * stride;
    for (let c = 0;c < numComponents; c++) {
      const componentOffset = elementOffset + c * compInfo.size;
      let value;
      switch (accessor.componentType) {
        case 5120:
          value = dataView.getInt8(componentOffset);
          break;
        case 5121:
          value = dataView.getUint8(componentOffset);
          break;
        case 5122:
          value = dataView.getInt16(componentOffset, true);
          break;
        case 5123:
          value = dataView.getUint16(componentOffset, true);
          break;
        case 5125:
          value = dataView.getUint32(componentOffset, true);
          break;
        case 5126:
          value = dataView.getFloat32(componentOffset, true);
          break;
        default:
          throw new Error(`Unknown componentType ${accessor.componentType}`);
      }
      out[outIndex++] = accessor.normalized ? compInfo.norm(value) : value;
    }
  }
  return out;
}
function readIndices(ctx, accessorIndex) {
  const { gltf } = ctx;
  const accessor = gltf.accessors?.[accessorIndex];
  if (!accessor)
    throw new Error(`Invalid accessor index ${accessorIndex}`);
  if (accessor.type !== "SCALAR")
    throw new Error("Index accessor must be SCALAR");
  const compInfo = COMPONENT_INFO[accessor.componentType];
  if (!compInfo)
    throw new Error(`Unsupported index component type ${accessor.componentType}`);
  if (accessor.componentType !== 5121 && accessor.componentType !== 5123 && accessor.componentType !== 5125) {
    throw new Error("Index componentType must be UNSIGNED_BYTE/SHORT/INT");
  }
  const byteOffset = accessor.byteOffset ?? 0;
  if (typeof accessor.bufferView !== "number")
    throw new Error(`Index accessor ${accessorIndex} missing bufferView`);
  const {
    array: src,
    stride: bufferViewStride,
    byteOffsetInView
  } = getBufferViewSlice(ctx, accessor.bufferView, byteOffset);
  const stride = bufferViewStride || compInfo.size;
  const count = accessor.count;
  const absoluteByteOffset = byteOffsetInView;
  const canUseTightView = stride === compInfo.size && absoluteByteOffset % compInfo.size === 0;
  if (canUseTightView) {
    const TypedArrayCtor = compInfo.array;
    const typed = new TypedArrayCtor(src.buffer, src.byteOffset, count);
    if (accessor.componentType === 5125) {
      return new Uint32Array(typed.buffer, typed.byteOffset, typed.length);
    }
    return new Uint32Array(typed);
  }
  const dataView = new DataView(src.buffer, src.byteOffset, src.byteLength);
  const out = new Uint32Array(count);
  for (let i2 = 0;i2 < count; i2++) {
    const elementOffset = i2 * stride;
    switch (accessor.componentType) {
      case 5121:
        out[i2] = dataView.getUint8(elementOffset);
        break;
      case 5123:
        out[i2] = dataView.getUint16(elementOffset, true);
        break;
      case 5125:
        out[i2] = dataView.getUint32(elementOffset, true);
        break;
    }
  }
  return out;
}
function nodeLocalMatrix(node) {
  if (node.matrix) {
    const m2 = import_gl_matrix10.mat4.create();
    for (let i2 = 0;i2 < 16; i2++)
      m2[i2] = node.matrix[i2];
    return m2;
  }
  const translation = node.translation || [0, 0, 0];
  const rotation = node.rotation || [0, 0, 0, 1];
  const scale = node.scale || [1, 1, 1];
  const m = import_gl_matrix10.mat4.create();
  const tmp = import_gl_matrix10.mat4.create();
  import_gl_matrix10.mat4.fromRotationTranslationScale(tmp, rotation, translation, scale);
  import_gl_matrix10.mat4.copy(m, tmp);
  return m;
}
function getMaterial(gltf, textures, images, materialIndex) {
  const material = (gltf.materials || [])[materialIndex ?? -1] || {};
  const pbr = material.pbrMetallicRoughness || {};
  const factor = pbr.baseColorFactor || [1, 1, 1, 1];
  let texImg = null;
  if (pbr.baseColorTexture && Number.isInteger(pbr.baseColorTexture.index)) {
    const texIndex = pbr.baseColorTexture.index;
    const tex = textures[texIndex];
    if (tex && Number.isInteger(tex.source)) {
      const imageIndex = tex.source;
      texImg = images[imageIndex] || null;
    }
  }
  const alphaMode = typeof material.alphaMode === "string" ? material.alphaMode : "OPAQUE";
  const alphaCutoff = typeof material.alphaCutoff === "number" ? material.alphaCutoff : 0.5;
  return {
    baseColorFactor: factor,
    baseColorTexture: texImg,
    metallicFactor: pbr.metallicFactor ?? 1,
    roughnessFactor: pbr.roughnessFactor ?? 1,
    emissiveFactor: material.emissiveFactor ?? [0, 0, 0],
    emissiveTexture: images[textures[material.emissiveTexture?.index]?.source] ?? null,
    emissiveStrength: material.extensions?.KHR_materials_emissive_strength?.emissiveStrength ?? 1,
    alphaMode,
    alphaCutoff
  };
}
function createSceneFromGLTF(gltf, resources) {
  const ctx = { gltf, buffers: resources.buffers };
  const textures = gltf.textures || [];
  const nodes = gltf.nodes || [];
  const meshes = gltf.meshes || [];
  const scenes = gltf.scenes || [];
  const sceneIndex = Number.isInteger(gltf.scene) ? gltf.scene : 0;
  const scene = scenes[sceneIndex] || { nodes: [] };
  const drawCalls = [];
  function traverse(nodeIndex, parentMatrix) {
    const node = nodes[nodeIndex];
    if (!node)
      return;
    const local = nodeLocalMatrix(node);
    const world = import_gl_matrix10.mat4.create();
    import_gl_matrix10.mat4.multiply(world, parentMatrix, local);
    if (Number.isInteger(node.mesh)) {
      const mesh = meshes[node.mesh];
      if (mesh) {
        for (const primitive of mesh.primitives || []) {
          if (primitive.mode != null && primitive.mode !== 4)
            continue;
          const posAcc = primitive.attributes?.POSITION;
          if (posAcc == null)
            continue;
          const normalsAcc = primitive.attributes?.NORMAL;
          const uvAcc = primitive.attributes?.TEXCOORD_0;
          const positions = readAccessorAsFloat32(ctx, posAcc);
          const normals = normalsAcc != null ? readAccessorAsFloat32(ctx, normalsAcc) : null;
          const uvs = uvAcc != null ? readAccessorAsFloat32(ctx, uvAcc) : null;
          const indices = primitive.indices != null ? readIndices(ctx, primitive.indices) : null;
          const colorAcc = primitive.attributes?.COLOR_0;
          const colors = colorAcc != null ? readAccessorAsFloat32(ctx, colorAcc) : null;
          const material = getMaterial(gltf, textures, resources.images, primitive.material);
          drawCalls.push({
            positions,
            normals,
            uvs,
            indices,
            model: world,
            material,
            colors,
            showHiddenEdges: readShowHiddenEdges(primitive.extras) ?? readShowHiddenEdges(node.extras) ?? readShowHiddenEdges(mesh.extras) ?? false
          });
        }
      }
    }
    for (const childIndex of node.children || []) {
      traverse(childIndex, world);
    }
  }
  const identity = import_gl_matrix10.mat4.create();
  for (const rootIndex of scene.nodes || []) {
    traverse(rootIndex, identity);
  }
  return { gltf, drawCalls };
}
function getNodeBuffer() {
  const maybeBuffer = globalThis.Buffer;
  if (!maybeBuffer) {
    throw new Error("Node Buffer API is not available in this runtime.");
  }
  return maybeBuffer;
}
function base64ToUint8Array(base64) {
  if (typeof globalThis.atob === "function") {
    const binary = globalThis.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i2 = 0;i2 < binary.length; i2++) {
      bytes[i2] = binary.charCodeAt(i2);
    }
    return bytes;
  }
  return new Uint8Array(getNodeBuffer().from(base64, "base64"));
}
function bufferFromDataURI(uri) {
  const match = uri.match(/^data:.*?;base64,(.*)$/);
  if (!match)
    throw new Error(`Unsupported data URI: ${uri.slice(0, 64)}...`);
  return base64ToUint8Array(match[1]);
}
function isPNG(filenameOrUri) {
  return /\.png(\?|$)/i.test(filenameOrUri) || /image\/png/i.test(filenameOrUri);
}
function isJPG(filenameOrUri) {
  return /(\.jpe?g(\?|$)|image\/jpe?g)/i.test(filenameOrUri);
}
function detectMimeTypeFromBuffer(buf, hint) {
  if (hint)
    return hint;
  if (buf.length >= 8 && buf[0] === 137 && buf[1] === 80 && buf[2] === 78 && buf[3] === 71 && buf[4] === 13 && buf[5] === 10 && buf[6] === 26 && buf[7] === 10)
    return "image/png";
  if (buf.length >= 2 && buf[0] === 255 && buf[1] === 216)
    return "image/jpeg";
  return null;
}
async function decodeImageViaFastPng(buf) {
  const decoded = decodePng(buf);
  return {
    width: decoded.width,
    height: decoded.height,
    data: new Uint8ClampedArray(decoded.data)
  };
}
async function decodeImageViaPureImage(buf, mimeType) {
  const { PassThrough } = await Promise.resolve().then(() => __toESM(require_ours(), 1));
  const PImage = await Promise.resolve().then(() => __toESM(require_dist(), 1));
  const stream = new PassThrough;
  stream.end(buf);
  if (mimeType === "image/png")
    return PImage.decodePNGFromStream(stream);
  if (mimeType === "image/jpeg" || mimeType === "image/jpg")
    return PImage.decodeJPEGFromStream(stream);
  throw new Error(`Unsupported embedded image mimeType: ${mimeType}`);
}
async function decodeImageFromBuffer(buf, mimeType) {
  const type = detectMimeTypeFromBuffer(buf, mimeType);
  if (!type) {
    throw new Error(`Unsupported embedded image mimeType: ${mimeType ?? "unknown"}`);
  }
  if (type === "image/png") {
    return decodeImageViaFastPng(buf);
  }
  return decodeImageViaPureImage(buf, type);
}
function parseGLB(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  const magic = view.getUint32(0, true);
  if (magic !== MAGIC)
    throw new Error("Invalid GLB header magic.");
  const version = view.getUint32(4, true);
  if (version !== 2)
    throw new Error(`Unsupported GLB version ${version}.`);
  const length = view.getUint32(8, true);
  const decoder = new TextDecoder;
  let json = null;
  let binaryChunk = null;
  const chunks = [];
  let offset = 12;
  while (offset < length) {
    if (offset + 8 > length)
      throw new Error("Truncated GLB chunk header.");
    const chunkLength = view.getUint32(offset, true);
    const chunkType = view.getUint32(offset + 4, true);
    offset += 8;
    if (offset + chunkLength > length)
      throw new Error("Truncated GLB chunk data.");
    const chunkData = new Uint8Array(arrayBuffer, offset, chunkLength);
    offset += chunkLength;
    if (chunkType === JSON_CHUNK_TYPE) {
      json = JSON.parse(decoder.decode(chunkData));
    } else if (chunkType === BIN_CHUNK_TYPE) {
      binaryChunk = chunkData;
    } else {
      chunks.push({ type: chunkType, data: chunkData });
    }
  }
  if (!json)
    throw new Error("GLB file is missing JSON chunk.");
  return { gltf: json, binaryChunk, chunks };
}
function ensureFetch(fetchImpl) {
  const impl = fetchImpl ?? globalThis.fetch;
  if (!impl)
    throw new Error("Global fetch API is not available; provide fetchImpl.");
  return impl;
}
async function fetchBinary(fetchImpl, url) {
  const res = await fetchImpl(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}
async function loadGLTFWithResourcesFromURL(url, options = {}) {
  const fetchImpl = ensureFetch(options.fetchImpl);
  const response = await fetchImpl(url);
  if (!response.ok)
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  const resolvedURL = new URL(response.url || url);
  const baseURL = resolvedURL;
  const sourceBuffer = await response.arrayBuffer();
  const header = sourceBuffer.byteLength >= 4 ? new DataView(sourceBuffer, 0, 4) : null;
  const isGLB = header?.getUint32(0, true) === 1179937895;
  let gltf;
  const totalBuffers = () => Array.isArray(gltf?.buffers) ? gltf.buffers.length : 0;
  let buffers = [];
  if (isGLB) {
    const parsed = parseGLB(sourceBuffer);
    gltf = parsed.gltf;
    buffers = new Array(totalBuffers()).fill(null);
    if (parsed.binaryChunk)
      buffers[0] = parsed.binaryChunk;
  } else {
    const text = new TextDecoder().decode(new Uint8Array(sourceBuffer));
    gltf = JSON.parse(text);
    buffers = new Array(totalBuffers()).fill(null);
  }
  async function resolveBuffer(index, entry) {
    if (buffers[index])
      return buffers[index];
    if (entry?.uri) {
      if (entry.uri.startsWith("data:")) {
        const buf2 = bufferFromDataURI(entry.uri);
        buffers[index] = buf2;
        return buf2;
      }
      const resourceURL = new URL(decodeURIComponent(entry.uri), baseURL).toString();
      const buf = await fetchBinary(fetchImpl, resourceURL);
      buffers[index] = buf;
      return buf;
    }
    throw new Error(`Buffer ${index} is missing a uri and no GLB chunk was provided.`);
  }
  await Promise.all((gltf.buffers || []).map(async (entry, idx) => {
    await resolveBuffer(idx, entry);
  }));
  async function resolveImage(img) {
    if (img.uri) {
      if (img.uri.startsWith("data:")) {
        const buf2 = bufferFromDataURI(img.uri);
        return decodeImageFromBuffer(buf2, img.mimeType);
      }
      const resourceURL = new URL(decodeURIComponent(img.uri), baseURL).toString();
      const hintedMime = img.mimeType ? img.mimeType : isPNG(img.uri) ? "image/png" : isJPG(img.uri) ? "image/jpeg" : null;
      const buf = await fetchBinary(fetchImpl, resourceURL);
      return decodeImageFromBuffer(buf, hintedMime);
    }
    if (typeof img.bufferView === "number") {
      const bufferView = gltf.bufferViews?.[img.bufferView];
      if (!bufferView)
        throw new Error(`Invalid image bufferView index ${img.bufferView}`);
      const buffer = await resolveBuffer(bufferView.buffer, gltf.buffers?.[bufferView.buffer]);
      if (!buffer)
        throw new Error(`Missing buffer for image bufferView ${img.bufferView}`);
      const byteOffset = bufferView.byteOffset ?? 0;
      const byteLength = bufferView.byteLength;
      if (typeof byteLength !== "number") {
        throw new Error(`bufferView ${img.bufferView} missing byteLength for image.`);
      }
      const slice = buffer.subarray(byteOffset, byteOffset + byteLength);
      return decodeImageFromBuffer(slice, img.mimeType);
    }
    throw new Error("images[*] entry missing uri or bufferView; unsupported in this loader.");
  }
  const images = await Promise.all((gltf.images || []).map((img) => resolveImage(img)));
  return {
    gltf,
    resources: {
      buffers,
      images
    }
  };
}
async function encodePNG(image) {
  return encodePng({
    width: image.width,
    height: image.height,
    data: image.data,
    channels: 4,
    depth: 8
  });
}
async function renderGLTFToPNGFromURL(url, options = {}) {
  const { fetchImpl, ...renderOptions } = options;
  const { gltf, resources } = await loadGLTFWithResourcesFromURL(url, {
    fetchImpl
  });
  const scene = createSceneFromGLTF(gltf, resources);
  const { bitmap } = renderDrawCalls(scene.drawCalls, renderOptions, createUint8Bitmap);
  return encodePNG(bitmap);
}
function normalizeToArrayBuffer(source) {
  if (source instanceof ArrayBuffer)
    return source;
  const { buffer, byteOffset, byteLength } = source;
  const viewBuffer = buffer;
  return viewBuffer.slice(byteOffset, byteOffset + byteLength);
}
async function renderGLTFToPNGFromGLB(glb, options = {}) {
  const arrayBuffer = normalizeToArrayBuffer(glb);
  const { gltf, binaryChunk } = parseGLB(arrayBuffer);
  const totalBuffers = Array.isArray(gltf.buffers) ? gltf.buffers.length : 0;
  const buffers = new Array(totalBuffers);
  for (let index = 0;index < totalBuffers; index++) {
    const entry = gltf.buffers[index];
    if (entry?.uri) {
      if (!entry.uri.startsWith("data:")) {
        throw new Error(`Buffer ${index} references external resource ${entry.uri}. Use renderGLTFToPNGFromURL for GLBs with external buffer URIs.`);
      }
      buffers[index] = bufferFromDataURI(entry.uri);
      continue;
    }
    if (!binaryChunk) {
      throw new Error(`GLB is missing the binary chunk required for buffer ${index}.`);
    }
    buffers[index] = binaryChunk;
  }
  const resolveBufferViewSlice = (bufferViewIndex) => {
    const bufferView = gltf.bufferViews?.[bufferViewIndex];
    if (!bufferView) {
      throw new Error(`Invalid bufferView index ${bufferViewIndex}.`);
    }
    const bufferIndex = bufferView.buffer;
    const buffer = buffers[bufferIndex];
    if (!buffer) {
      throw new Error(`Missing buffer data for bufferView ${bufferViewIndex} (buffer ${bufferIndex}).`);
    }
    const byteOffset = bufferView.byteOffset ?? 0;
    const byteLength = bufferView.byteLength;
    if (typeof byteLength !== "number") {
      throw new Error(`bufferView ${bufferViewIndex} is missing byteLength.`);
    }
    return buffer.subarray(byteOffset, byteOffset + byteLength);
  };
  const images = await Promise.all((gltf.images ?? []).map(async (image, imageIndex) => {
    if (image.uri) {
      if (!image.uri.startsWith("data:")) {
        throw new Error(`Image ${imageIndex} references external resource ${image.uri}. Embed textures or load via renderGLTFToPNGFromURL.`);
      }
      const imageBytes = bufferFromDataURI(image.uri);
      return decodeImageFromBuffer(imageBytes, image.mimeType);
    }
    if (typeof image.bufferView === "number") {
      const slice = resolveBufferViewSlice(image.bufferView);
      return decodeImageFromBuffer(slice, image.mimeType);
    }
    throw new Error(`Image ${imageIndex} must supply a data URI or bufferView for GLB rendering.`);
  }));
  const scene = createSceneFromGLTF(gltf, { buffers, images });
  const { bitmap } = renderDrawCalls(scene.drawCalls, options, createUint8Bitmap);
  return encodePNG(bitmap);
}
function renderSceneFromGLTF(scene, options, imageFactory) {
  return renderDrawCalls(scene.drawCalls, options, imageFactory);
}
var import_gl_matrix, import_gl_matrix2, import_gl_matrix3, import_gl_matrix4, import_gl_matrix5, import_gl_matrix6, import_gl_matrix7, import_gl_matrix8, import_gl_matrix9, import_gl_matrix10, toRad = (degrees) => degrees * Math.PI / 180, DEFAULT_CREASE_ANGLE_DEGREES = 30, createUint8Bitmap = (width, height) => ({
  width,
  height,
  data: new Uint8ClampedArray(width * height * 4)
}), DEFAULT_LIGHT_DIR, DEFAULT_RENDER_OPTIONS, clamp = (value, min, max2) => Math.max(min, Math.min(max2, value)), GeometryDenoiser = class {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    const count = width * height;
    this.ids = new Int32Array(count);
    this.normals = new Float32Array(count * 3);
    this.albedo = new Float32Array(count * 3);
    this.radiance = new Float32Array(count * 3);
    this.distance = new Float32Array(count);
    this.horizontal = new Float32Array(count * 3);
  }
  ids;
  normals;
  albedo;
  radiance;
  distance;
  horizontal;
  materials = /* @__PURE__ */ new WeakMap;
  nextId = 1;
  first = Infinity;
  last = -1;
  materialId(material) {
    let id = this.materials.get(material);
    if (!id) {
      id = this.nextId++;
      this.materials.set(material, id);
    }
    return id;
  }
  record(index, id, n, albedo, radiance, distance) {
    if (index < this.first)
      this.first = index;
    if (index > this.last)
      this.last = index;
    this.ids[index] = id;
    this.normals.set(n, index * 3);
    this.albedo.set(albedo, index * 3);
    this.radiance.set(radiance, index * 3);
    this.distance[index] = distance;
  }
  apply(output, gamma) {
    const kernel = [1, 8, 28, 56, 70, 56, 28, 8, 1];
    const radius = 4;
    const n = this.normals, a = this.albedo, ids = this.ids;
    const firstRow = Math.floor(this.first / this.width);
    const lastRow = Math.floor(this.last / this.width);
    for (let pass = 0;pass < 2; pass++) {
      const source = pass === 0 ? this.radiance : this.horizontal;
      for (let y = firstRow;y <= lastRow; y++)
        for (let x2 = 0;x2 < this.width; x2++) {
          const index = y * this.width + x2, id = ids[index];
          if (id === 0)
            continue;
          const k = index * 3, distance = this.distance[index];
          const nx = n[k], ny = n[k + 1], nz = n[k + 2];
          const ar = a[k], ag = a[k + 1], ab = a[k + 2];
          let r = 0, g = 0, b = 0, total = 0;
          for (let delta = -radius;delta <= radius; delta++) {
            const px = pass === 0 ? x2 + delta : x2, py = pass === 0 ? y : y + delta;
            if (px < 0 || py < 0 || px >= this.width || py >= this.height)
              continue;
            const neighbor = py * this.width + px, p = neighbor * 3;
            if (ids[neighbor] !== id)
              continue;
            if (Math.abs(distance - this.distance[neighbor]) > distance * 0.02)
              continue;
            if (nx * n[p] + ny * n[p + 1] + nz * n[p + 2] < 0.98)
              continue;
            if (Math.abs(ar - a[p]) + Math.abs(ag - a[p + 1]) + Math.abs(ab - a[p + 2]) > 0.03)
              continue;
            const weight = kernel[delta + radius];
            total += weight;
            r += source[p] * weight;
            g += source[p + 1] * weight;
            b += source[p + 2] * weight;
          }
          if (pass === 0) {
            this.horizontal[k] = r / total;
            this.horizontal[k + 1] = g / total;
            this.horizontal[k + 2] = b / total;
          } else {
            const encode2 = (value) => Math.floor(255 * (gamma ? srgbEncodeLinear01(Math.max(0, Math.min(1, value / total))) : Math.max(0, Math.min(1, value / total))));
            output[index * 4] = encode2(r);
            output[index * 4 + 1] = encode2(g);
            output[index * 4 + 2] = encode2(b);
          }
        }
    }
  }
}, SoftwareRenderer = class {
  width;
  height;
  bitmap;
  depth;
  denoiser;
  constructor(width, height, imageFactory = createUint8Bitmap, denoise = false) {
    this.width = width;
    this.height = height;
    this.bitmap = imageFactory(width, height);
    this.depth = new Float32Array(width * height);
    this.denoiser = denoise ? new GeometryDenoiser(width, height) : null;
  }
  get buffer() {
    return this.bitmap.data;
  }
  clear(colorRGBA = [0, 0, 0, 255]) {
    this.denoiser?.ids.fill(0);
    const [r, g, b, a] = colorRGBA;
    for (let i2 = 0;i2 < this.width * this.height; i2++) {
      const j = i2 * 4;
      this.buffer[j + 0] = r;
      this.buffer[j + 1] = g;
      this.buffer[j + 2] = b;
      this.buffer[j + 3] = a;
      this.depth[i2] = Infinity;
    }
  }
  setPixel(x2, y, r, g, b, a, keepGuide = false) {
    if (x2 < 0 || y < 0 || x2 >= this.width || y >= this.height)
      return;
    const idx = (y * this.width + x2) * 4;
    if (this.denoiser && !keepGuide)
      this.denoiser.ids[y * this.width + x2] = 0;
    this.buffer[idx + 0] = r;
    this.buffer[idx + 1] = g;
    this.buffer[idx + 2] = b;
    this.buffer[idx + 3] = a;
  }
  denoise(gammaOut = true) {
    this.denoiser?.apply(this.buffer, gammaOut);
  }
  drawLines(mesh, camera, gammaOut = true, options = {}) {
    const { positions, indices, model, material } = mesh;
    if (!indices)
      return;
    const view = camera.view;
    const proj = camera.proj;
    const mvp = import_gl_matrix5.mat4.create();
    import_gl_matrix5.mat4.multiply(mvp, proj, import_gl_matrix5.mat4.multiply(import_gl_matrix5.mat4.create(), view, model));
    const vertexCount = positions.length / 3 | 0;
    const vScreen = new Array(vertexCount);
    const vInvW = new Float32Array(vertexCount);
    const vNDCz = new Float32Array(vertexCount);
    for (let i2 = 0;i2 < vertexCount; i2++) {
      const p = import_gl_matrix5.vec4.fromValues(positions[i2 * 3 + 0], positions[i2 * 3 + 1], positions[i2 * 3 + 2], 1);
      const c = import_gl_matrix5.vec4.create();
      import_gl_matrix5.vec4.transformMat4(c, p, mvp);
      const invW = 1 / c[3];
      vInvW[i2] = invW;
      if (!isFinite(invW)) {
        vScreen[i2] = [NaN, NaN];
        vNDCz[i2] = NaN;
        continue;
      }
      const ndcX = c[0] * invW;
      const ndcY = c[1] * invW;
      const ndcZ = c[2] * invW;
      const sx = (ndcX * 0.5 + 0.5) * (this.width - 1);
      const sy = (1 - (ndcY * 0.5 + 0.5)) * (this.height - 1);
      vScreen[i2] = [sx, sy];
      vNDCz[i2] = ndcZ;
    }
    let [r, g, b, a] = material.baseColorFactor;
    if (gammaOut) {
      r = srgbEncodeLinear01(clamp(r, 0, 1));
      g = srgbEncodeLinear01(clamp(g, 0, 1));
      b = srgbEncodeLinear01(clamp(b, 0, 1));
    } else {
      r = clamp(r, 0, 1);
      g = clamp(g, 0, 1);
      b = clamp(b, 0, 1);
    }
    const r255 = r * 255 | 0;
    const g255 = g * 255 | 0;
    const b255 = b * 255 | 0;
    const opacity = clamp(options.opacity ?? 1, 0, 1);
    const sourceAlpha = clamp(a, 0, 1) * opacity;
    const depthCompare = options.depthCompare ?? "less";
    const depthWrite = options.depthWrite ?? true;
    const depthBias = options.depthBias ?? 0;
    const dashLength = Math.max(1, options.dashLength ?? 4);
    for (let i2 = 0;i2 < indices.length; i2 += 2) {
      const i0 = indices[i2 + 0];
      const i1 = indices[i2 + 1];
      const v0s = vScreen[i0];
      const v1s = vScreen[i1];
      const z0_ndc = vNDCz[i0];
      const z1_ndc = vNDCz[i1];
      if (isNaN(v0s[0]) || isNaN(v1s[0]))
        continue;
      const z0_01 = z0_ndc * 0.5 + 0.5;
      const z1_01 = z1_ndc * 0.5 + 0.5;
      if (z0_01 < 0 && z1_01 < 0 || z0_01 > 1 && z1_01 > 1)
        continue;
      const x0 = Math.round(v0s[0]);
      const y0 = Math.round(v0s[1]);
      const x1 = Math.round(v1s[0]);
      const y1 = Math.round(v1s[1]);
      const dx = x1 - x0;
      const dy = y1 - y0;
      const steps = Math.max(Math.abs(dx), Math.abs(dy));
      if (steps === 0)
        continue;
      const xinc = dx / steps;
      const yinc = dy / steps;
      const zinc = (z1_01 - z0_01) / steps;
      let x2 = x0;
      let y = y0;
      let z = z0_01;
      for (let k = 0;k <= steps; k++) {
        if (options.dashed && Math.floor(k / dashLength) % 2 === 1) {
          x2 += xinc;
          y += yinc;
          z += zinc;
          continue;
        }
        const xi = Math.round(x2);
        const yi = Math.round(y);
        if (xi >= 0 && xi < this.width && yi >= 0 && yi < this.height && z >= 0 && z <= 1) {
          const di = yi * this.width + xi;
          const currentDepth = this.depth[di];
          const passesDepth = depthCompare === "greater" ? z > currentDepth + depthBias : depthCompare === "less-equal" ? z <= currentDepth + depthBias : z < currentDepth - depthBias;
          if (passesDepth) {
            if (depthWrite)
              this.depth[di] = z;
            const pixelIndex = di * 4;
            const destinationAlpha = this.buffer[pixelIndex + 3] / 255;
            const oneMinusSourceAlpha = 1 - sourceAlpha;
            const outAlpha = sourceAlpha + destinationAlpha * oneMinusSourceAlpha;
            const outR = outAlpha === 0 ? 0 : (r255 * sourceAlpha + this.buffer[pixelIndex + 0] * destinationAlpha * oneMinusSourceAlpha) / outAlpha;
            const outG = outAlpha === 0 ? 0 : (g255 * sourceAlpha + this.buffer[pixelIndex + 1] * destinationAlpha * oneMinusSourceAlpha) / outAlpha;
            const outB = outAlpha === 0 ? 0 : (b255 * sourceAlpha + this.buffer[pixelIndex + 2] * destinationAlpha * oneMinusSourceAlpha) / outAlpha;
            this.setPixel(xi, yi, outR, outG, outB, outAlpha * 255);
          }
        }
        x2 += xinc;
        y += yinc;
        z += zinc;
      }
    }
  }
  sampleTextureNearest(img, u, v) {
    if (!img)
      return [1, 1, 1, 1];
    const x2 = clamp(Math.floor(u * (img.width - 1)), 0, img.width - 1);
    const y = clamp(Math.floor(v * (img.height - 1)), 0, img.height - 1);
    const idx = (y * img.width + x2) * 4;
    const d = img.data;
    return [
      d[idx + 0] / 255,
      d[idx + 1] / 255,
      d[idx + 2] / 255,
      d[idx + 3] / 255
    ];
  }
  perspInterp(attrs, invWs, lambdas) {
    const [lambda0, lambda1, lambda2] = lambdas;
    const [invW0, invW1, invW2] = invWs;
    const [attr0, attr1, attr2] = attrs;
    const denom = lambda0 * invW0 + lambda1 * invW1 + lambda2 * invW2;
    const n = attr0.length;
    const out = new Array(n).fill(0);
    for (let j = 0;j < n; j++) {
      out[j] = (lambda0 * attr0[j] * invW0 + lambda1 * attr1[j] * invW1 + lambda2 * attr2[j] * invW2) / denom;
    }
    return out;
  }
  drawMesh(mesh, camera, light, material, cullBackFaces = true, gammaOut = true, studio, visibility) {
    let { positions, normals, uvs, indices, model, colors } = mesh;
    const materialId = this.denoiser?.materialId(material) ?? 0;
    const lightDir = light.dir ?? DEFAULT_LIGHT_DIR;
    const ambient = clamp(light.ambient ?? DEFAULT_RENDER_OPTIONS.ambient, 0, 1);
    const L = studio ? null : import_gl_matrix5.vec3.normalize(import_gl_matrix5.vec3.create(), import_gl_matrix5.vec3.fromValues(lightDir[0], lightDir[1], lightDir[2]));
    const view = camera.view;
    const proj = camera.proj;
    const mvp = import_gl_matrix5.mat4.create();
    import_gl_matrix5.mat4.multiply(mvp, proj, import_gl_matrix5.mat4.multiply(import_gl_matrix5.mat4.create(), view, model));
    const normalMat = import_gl_matrix5.mat3.create();
    import_gl_matrix5.mat3.normalFromMat4(normalMat, model);
    let vertexCount = positions.length / 3 | 0;
    let idx = indices ?? (() => {
      const a = new Uint32Array(vertexCount);
      for (let i2 = 0;i2 < vertexCount; i2++)
        a[i2] = i2;
      return a;
    })();
    let useNormals = normals;
    if (!useNormals) {
      useNormals = computeSmoothNormals(positions, idx);
    }
    const clipped = clipMeshToNearPlane({ ...mesh, normals: useNormals, indices: idx }, mvp);
    positions = clipped.positions;
    useNormals = clipped.normals;
    uvs = clipped.uvs;
    colors = clipped.colors;
    idx = clipped.indices;
    vertexCount = positions.length / 3;
    const depthOnly = visibility?.depthOnly ?? false;
    const vScreen = new Array(vertexCount);
    const vInvW = new Float32Array(vertexCount);
    const vNDCz = new Float32Array(vertexCount);
    const vWorldN = new Array(depthOnly ? 0 : vertexCount);
    const vWorldP = studio && !depthOnly ? new Array(vertexCount) : null;
    const vColor = new Array(depthOnly ? 0 : vertexCount);
    for (let i2 = 0;i2 < vertexCount; i2++) {
      const p = import_gl_matrix5.vec4.fromValues(positions[i2 * 3 + 0], positions[i2 * 3 + 1], positions[i2 * 3 + 2], 1);
      const c = import_gl_matrix5.vec4.create();
      import_gl_matrix5.vec4.transformMat4(c, p, mvp);
      if (vWorldP) {
        const world = import_gl_matrix5.vec4.transformMat4(import_gl_matrix5.vec4.create(), p, model);
        vWorldP[i2] = [world[0], world[1], world[2]];
      }
      const invW = 1 / c[3];
      const ndcX = c[0] * invW;
      const ndcY = c[1] * invW;
      const ndcZ = c[2] * invW;
      const sx = (ndcX * 0.5 + 0.5) * (this.width - 1);
      const sy = (1 - (ndcY * 0.5 + 0.5)) * (this.height - 1);
      vScreen[i2] = [sx, sy];
      vInvW[i2] = invW;
      vNDCz[i2] = ndcZ;
      if (depthOnly)
        continue;
      const n = import_gl_matrix5.vec3.fromValues(useNormals[i2 * 3 + 0], useNormals[i2 * 3 + 1], useNormals[i2 * 3 + 2]);
      const nw = import_gl_matrix5.vec3.create();
      import_gl_matrix5.vec3.transformMat3(nw, n, normalMat);
      vWorldN[i2] = [nw[0], nw[1], nw[2]];
      if (colors && colors.length >= (i2 + 1) * 3) {
        vColor[i2] = [colors[i2 * 3 + 0], colors[i2 * 3 + 1], colors[i2 * 3 + 2]];
      } else {
        vColor[i2] = [1, 1, 1];
      }
    }
    for (let i2 = 0;i2 < idx.length; i2 += 3) {
      const i0 = idx[i2 + 0];
      const i1 = idx[i2 + 1];
      const i22 = idx[i2 + 2];
      if (!(isFinite(vInvW[i0]) && isFinite(vInvW[i1]) && isFinite(vInvW[i22])))
        continue;
      const v0 = vScreen[i0];
      const v1 = vScreen[i1];
      const v2 = vScreen[i22];
      const area = edge(v0, v1, v2);
      if (area === 0)
        continue;
      if (cullBackFaces && area < 0)
        continue;
      const minX = Math.max(0, Math.floor(Math.min(v0[0], v1[0], v2[0])));
      const maxX = Math.min(this.width - 1, Math.ceil(Math.max(v0[0], v1[0], v2[0])));
      const minY = Math.max(0, Math.floor(Math.min(v0[1], v1[1], v2[1])));
      const maxY = Math.min(this.height - 1, Math.ceil(Math.max(v0[1], v1[1], v2[1])));
      const invW = [
        vInvW[i0],
        vInvW[i1],
        vInvW[i22]
      ];
      const ndcZ = [
        vNDCz[i0],
        vNDCz[i1],
        vNDCz[i22]
      ];
      const nws = [
        vWorldN[i0],
        vWorldN[i1],
        vWorldN[i22]
      ];
      const worldPositions = vWorldP ? [vWorldP[i0], vWorldP[i1], vWorldP[i22]] : null;
      const uv = uvs ? [
        [uvs[i0 * 2 + 0], uvs[i0 * 2 + 1]],
        [uvs[i1 * 2 + 0], uvs[i1 * 2 + 1]],
        [uvs[i22 * 2 + 0], uvs[i22 * 2 + 1]]
      ] : null;
      const cs = [
        vColor[i0],
        vColor[i1],
        vColor[i22]
      ];
      for (let y = minY;y <= maxY; y++) {
        for (let x2 = minX;x2 <= maxX; x2++) {
          const p = [x2 + 0.5, y + 0.5];
          const w0 = edge(v1, v2, p);
          const w1 = edge(v2, v0, p);
          const w2 = edge(v0, v1, p);
          if (w0 < 0 || w1 < 0 || w2 < 0)
            continue;
          const invArea = 1 / area;
          const l0 = w0 * invArea;
          const l1 = w1 * invArea;
          const l2 = w2 * invArea;
          const zndc = l0 * ndcZ[0] + l1 * ndcZ[1] + l2 * ndcZ[2];
          const z01 = zndc * 0.5 + 0.5;
          if (z01 < 0 || z01 > 1)
            continue;
          const di = y * this.width + x2;
          if (visibility && !visibility.depthOnly && visibility.winners[di] !== visibility.triangleOffset + i2 / 3)
            continue;
          const depth = this.depth;
          if (z01 >= depth[di])
            continue;
          depth[di] = z01;
          if (visibility?.depthOnly) {
            visibility.winners[di] = visibility.triangleOffset + i2 / 3;
            continue;
          }
          let baseColor = [
            material.baseColorFactor[0],
            material.baseColorFactor[1],
            material.baseColorFactor[2],
            material.baseColorFactor[3]
          ];
          if (uv && material.baseColorTexture) {
            const uvp = this.perspInterp(uv, invW, [l0, l1, l2]);
            const texel = this.sampleTextureNearest(material.baseColorTexture, uvp[0], uvp[1]);
            baseColor = mulColor(baseColor, [
              srgbDecodeToLinear01(texel[0]),
              srgbDecodeToLinear01(texel[1]),
              srgbDecodeToLinear01(texel[2]),
              texel[3]
            ]);
          }
          const [cr, cg, cb] = this.perspInterp(cs, invW, [l0, l1, l2]);
          baseColor = [
            baseColor[0] * cr,
            baseColor[1] * cg,
            baseColor[2] * cb,
            baseColor[3]
          ];
          const [np0, np1, np2] = this.perspInterp(nws, invW, [l0, l1, l2]);
          const nlen = Math.hypot(np0, np1, np2) || 1;
          const nrm = [
            np0 / nlen,
            np1 / nlen,
            np2 / nlen
          ];
          let r = 0, g = 0, b = 0;
          if (studio && worldPositions) {
            const position = this.perspInterp(worldPositions, invW, [
              l0,
              l1,
              l2
            ]);
            [r, g, b] = studio.shade(position, nrm, [baseColor[0], baseColor[1], baseColor[2]], material, x2, y);
          } else {
            const ndotl = Math.max(0, nrm[0] * -L[0] + nrm[1] * -L[1] + nrm[2] * -L[2]);
            const lit = ambient + (1 - ambient) * ndotl;
            r = baseColor[0] * lit;
            g = baseColor[1] * lit;
            b = baseColor[2] * lit;
          }
          const emission = material.emissiveFactor ?? [0, 0, 0];
          const strength = material.emissiveStrength ?? 1;
          let er = emission[0], eg = emission[1], eb = emission[2];
          if (uv && material.emissiveTexture) {
            const uvp = this.perspInterp(uv, invW, [l0, l1, l2]);
            const texel = this.sampleTextureNearest(material.emissiveTexture, uvp[0], uvp[1]);
            er *= srgbDecodeToLinear01(texel[0]);
            eg *= srgbDecodeToLinear01(texel[1]);
            eb *= srgbDecodeToLinear01(texel[2]);
          }
          r += er * strength;
          g += eg * strength;
          b += eb * strength;
          let a = baseColor[3];
          const linearR = r, linearG = g, linearB = b;
          const alphaMode = material.alphaMode ?? "OPAQUE";
          const alphaCutoff = material.alphaCutoff ?? 0.5;
          if (alphaMode === "MASK" && a < alphaCutoff)
            continue;
          if (alphaMode !== "BLEND") {
            a = 1;
          }
          const shouldWriteDepth = alphaMode !== "BLEND";
          if (shouldWriteDepth) {
            depth[di] = z01;
          }
          if (gammaOut) {
            r = srgbEncodeLinear01(clamp(r, 0, 1));
            g = srgbEncodeLinear01(clamp(g, 0, 1));
            b = srgbEncodeLinear01(clamp(b, 0, 1));
          } else {
            r = clamp(r, 0, 1);
            g = clamp(g, 0, 1);
            b = clamp(b, 0, 1);
          }
          const dstIdx = (y * this.width + x2) * 4;
          const dstR = (this.buffer[dstIdx + 0] ?? 0) / 255;
          const dstG = (this.buffer[dstIdx + 1] ?? 0) / 255;
          const dstB = (this.buffer[dstIdx + 2] ?? 0) / 255;
          const dstA = (this.buffer[dstIdx + 3] ?? 0) / 255;
          let outR = r;
          let outG = g;
          let outB = b;
          let outA = a;
          if (alphaMode === "BLEND" && a < 1) {
            const oneMinusA = 1 - a;
            outR = r * a + dstR * oneMinusA;
            outG = g * a + dstG * oneMinusA;
            outB = b * a + dstB * oneMinusA;
            outA = a + dstA * oneMinusA;
          }
          this.setPixel(x2, y, clamp(outR, 0, 1) * 255 | 0, clamp(outG, 0, 1) * 255 | 0, clamp(outB, 0, 1) * 255 | 0, clamp(outA, 0, 1) * 255 | 0, true);
          if (this.denoiser) {
            if (alphaMode !== "BLEND") {
              const distance = 1 / (l0 * invW[0] + l1 * invW[1] + l2 * invW[2]);
              this.denoiser.record(di, materialId, nrm, [baseColor[0], baseColor[1], baseColor[2]], [linearR, linearG, linearB], distance);
            } else
              this.denoiser.ids[di] = 0;
          }
        }
      }
    }
    return idx.length / 3;
  }
}, DEFAULT_MARKER_COLOR, DEFAULT_TEXT_COLOR, CHARACTER_WIDTH_RATIO = 0.62, CAMERA_UP_VALUES, studio_environment_default, RayOcclusion = class {
  bounds = new Float64Array(0);
  escapes = new Uint32Array(0);
  starts = new Uint32Array(0);
  counts = new Uint8Array(0);
  triangleData = new Float64Array(0);
  triangles = [];
  bias;
  inverse = [0, 0, 0];
  parallelAxes = 0;
  closest = {
    hit: null,
    limit: Infinity
  };
  constructor(drawCalls) {
    const triangles = [];
    for (const dc of drawCalls) {
      if ((dc.mode ?? 4) !== 4 || dc.material.alphaMode === "BLEND")
        continue;
      if (dc.material.alphaMode === "MASK")
        continue;
      const count = dc.indices?.length ?? dc.positions.length / 3;
      const worldVertices = [];
      for (let i2 = 0;i2 < dc.positions.length; i2 += 3) {
        const p = import_gl_matrix8.vec3.transformMat4(import_gl_matrix8.vec3.create(), [dc.positions[i2], dc.positions[i2 + 1], dc.positions[i2 + 2]], dc.model);
        worldVertices.push([p[0], p[1], p[2]]);
      }
      const vertex = (index) => worldVertices[dc.indices?.[index] ?? index];
      for (let i2 = 0;i2 < count; i2 += 3) {
        const p = vertex(i2), q = vertex(i2 + 1), r = vertex(i2 + 2);
        const min = [0, 1, 2].map((a) => Math.min(p[a], q[a], r[a]));
        const max2 = [0, 1, 2].map((a) => Math.max(p[a], q[a], r[a]));
        const e1 = q.map((v, a) => v - p[a]), e2 = r.map((v, a) => v - p[a]);
        const normal = [
          e1[1] * e2[2] - e1[2] * e2[1],
          e1[2] * e2[0] - e1[0] * e2[2],
          e1[0] * e2[1] - e1[1] * e2[0]
        ];
        const length = Math.hypot(...normal) || 1;
        for (let a = 0;a < 3; a++)
          normal[a] /= length;
        triangles.push({
          p,
          e1,
          e2,
          normal,
          min,
          max: max2,
          center: min.map((v, a) => (v + max2[a]) / 2),
          material: dc.material
        });
      }
    }
    const root = triangles.length ? this.build(triangles) : null;
    if (root)
      this.flatten(root, triangles.length);
    const extent = root ? Math.hypot(...root.max.map((v, a) => v - root.min[a])) : 1;
    this.bias = Math.max(0.0000001, extent * 0.00001);
  }
  flatten(root, triangleCount) {
    const nodes = [], escapes = [];
    const visit = (node) => {
      const index = nodes.length;
      nodes.push(node);
      escapes.push(0);
      if (!node.triangles) {
        visit(node.left);
        visit(node.right);
      }
      escapes[index] = nodes.length;
    };
    visit(root);
    this.bounds = new Float64Array(nodes.length * 6);
    this.escapes = Uint32Array.from(escapes);
    this.starts = new Uint32Array(nodes.length);
    this.counts = new Uint8Array(nodes.length);
    this.triangleData = new Float64Array(triangleCount * 9);
    for (let i2 = 0;i2 < nodes.length; i2++) {
      const node = nodes[i2];
      this.bounds.set(node.min, i2 * 6);
      this.bounds.set(node.max, i2 * 6 + 3);
      if (!node.triangles)
        continue;
      this.starts[i2] = this.triangles.length;
      this.counts[i2] = node.triangles.length;
      for (const triangle of node.triangles) {
        const offset = this.triangles.length * 9;
        this.triangleData.set(triangle.p, offset);
        this.triangleData.set(triangle.e1, offset + 3);
        this.triangleData.set(triangle.e2, offset + 6);
        this.triangles.push({
          normal: triangle.normal,
          material: triangle.material
        });
      }
    }
  }
  build(triangles) {
    const min = [Infinity, Infinity, Infinity], max2 = [-Infinity, -Infinity, -Infinity], centerMin = [Infinity, Infinity, Infinity], centerMax = [-Infinity, -Infinity, -Infinity];
    for (const t of triangles)
      for (let a = 0;a < 3; a++) {
        min[a] = Math.min(min[a], t.min[a]);
        max2[a] = Math.max(max2[a], t.max[a]);
        centerMin[a] = Math.min(centerMin[a], t.center[a]);
        centerMax[a] = Math.max(centerMax[a], t.center[a]);
      }
    if (triangles.length <= 8)
      return { min, max: max2, triangles };
    const binCount = 16;
    const area = (lo, hi) => {
      const x2 = hi[0] - lo[0], y = hi[1] - lo[1], z = hi[2] - lo[2];
      return 2 * (x2 * y + y * z + z * x2);
    };
    let bestCost = Infinity, bestAxis = -1, bestSplit = 0, bestMin = 0, bestScale = 0;
    let longestAxis = 0;
    for (let a = 1;a < 3; a++)
      if (centerMax[a] - centerMin[a] > centerMax[longestAxis] - centerMin[longestAxis])
        longestAxis = a;
    for (let axis = 0;axis < 3; axis++) {
      if (triangles.length <= 4096 && axis !== longestAxis)
        continue;
      const loCenter = centerMin[axis], hiCenter = centerMax[axis];
      if (loCenter === hiCenter)
        continue;
      const scale = binCount / (hiCenter - loCenter);
      const counts = new Uint32Array(binCount);
      const bounds = new Float64Array(binCount * 6);
      for (let i2 = 0;i2 < binCount; i2++) {
        bounds.fill(Infinity, i2 * 6, i2 * 6 + 3);
        bounds.fill(-Infinity, i2 * 6 + 3, i2 * 6 + 6);
      }
      for (const t of triangles) {
        const bin = Math.min(binCount - 1, Math.floor((t.center[axis] - loCenter) * scale));
        counts[bin]++;
        const offset = bin * 6;
        for (let a = 0;a < 3; a++) {
          bounds[offset + a] = Math.min(bounds[offset + a], t.min[a]);
          bounds[offset + a + 3] = Math.max(bounds[offset + a + 3], t.max[a]);
        }
      }
      const suffixCost = new Float64Array(binCount);
      let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity], count = 0;
      for (let i2 = binCount - 1;i2 >= 0; i2--) {
        count += counts[i2];
        if (counts[i2])
          for (let a = 0;a < 3; a++) {
            lo[a] = Math.min(lo[a], bounds[i2 * 6 + a]);
            hi[a] = Math.max(hi[a], bounds[i2 * 6 + a + 3]);
          }
        suffixCost[i2] = count ? area(lo, hi) * count : 0;
      }
      lo = [Infinity, Infinity, Infinity];
      hi = [-Infinity, -Infinity, -Infinity];
      count = 0;
      for (let i2 = 0;i2 < binCount - 1; i2++) {
        count += counts[i2];
        if (counts[i2])
          for (let a = 0;a < 3; a++) {
            lo[a] = Math.min(lo[a], bounds[i2 * 6 + a]);
            hi[a] = Math.max(hi[a], bounds[i2 * 6 + a + 3]);
          }
        if (!count || count === triangles.length)
          continue;
        const cost = area(lo, hi) * count + suffixCost[i2 + 1];
        if (cost < bestCost) {
          bestCost = cost;
          bestAxis = axis;
          bestSplit = i2;
          bestMin = loCenter;
          bestScale = scale;
        }
      }
    }
    let left, right;
    if (bestAxis < 0) {
      const middle = triangles.length >> 1;
      left = triangles.slice(0, middle);
      right = triangles.slice(middle);
    } else {
      left = [];
      right = [];
      for (const t of triangles) {
        const bin = Math.min(binCount - 1, Math.floor((t.center[bestAxis] - bestMin) * bestScale));
        (bin <= bestSplit ? left : right).push(t);
      }
    }
    return { min, max: max2, left: this.build(left), right: this.build(right) };
  }
  prepareRay(direction) {
    this.parallelAxes = 0;
    for (let a = 0;a < 3; a++) {
      this.inverse[a] = 1 / direction[a];
      if (Math.abs(direction[a]) < 0.000000000001)
        this.parallelAxes |= 1 << a;
    }
  }
  occluded(origin, direction, maxDistance = Infinity) {
    this.prepareRay(direction);
    return this.intersect(origin, direction, maxDistance);
  }
  trace(origin, direction, maxDistance = Infinity) {
    this.prepareRay(direction);
    const state = this.closest;
    state.hit = null;
    state.limit = maxDistance;
    this.intersect(origin, direction, maxDistance, state);
    if (!state.hit)
      return null;
    const { normal, material } = state.hit;
    const sign = dotNormal(normal, direction) > 0 ? -1 : 1;
    return {
      position: [
        origin[0] + direction[0] * state.limit,
        origin[1] + direction[1] * state.limit,
        origin[2] + direction[2] * state.limit
      ],
      normal: [normal[0] * sign, normal[1] * sign, normal[2] * sign],
      material,
      distance: state.limit
    };
  }
  intersect(o, d, maxDistance, state) {
    const ox = o[0], oy = o[1], oz = o[2], dx = d[0], dy = d[1], dz = d[2], ix = this.inverse[0], iy = this.inverse[1], iz = this.inverse[2], parallel = this.parallelAxes, bounds = this.bounds, data = this.triangleData;
    let node = 0;
    while (node < this.counts.length) {
      const offset = node * 6;
      let limit = state ? state.limit : maxDistance, near = 0, far = limit;
      if (parallel & 2) {
        if (oy < bounds[offset + 1] || oy > bounds[offset + 4]) {
          node = this.escapes[node];
          continue;
        }
      } else {
        let t0 = (bounds[offset + 1] - oy) * iy, t1 = (bounds[offset + 4] - oy) * iy;
        if (t0 > t1) {
          const swap = t0;
          t0 = t1;
          t1 = swap;
        }
        if (t0 > near)
          near = t0;
        if (t1 < far)
          far = t1;
        if (far < near) {
          node = this.escapes[node];
          continue;
        }
      }
      if (parallel & 1) {
        if (ox < bounds[offset + 0] || ox > bounds[offset + 3]) {
          node = this.escapes[node];
          continue;
        }
      } else {
        let t0 = (bounds[offset + 0] - ox) * ix, t1 = (bounds[offset + 3] - ox) * ix;
        if (t0 > t1) {
          const swap = t0;
          t0 = t1;
          t1 = swap;
        }
        if (t0 > near)
          near = t0;
        if (t1 < far)
          far = t1;
        if (far < near) {
          node = this.escapes[node];
          continue;
        }
      }
      if (parallel & 4) {
        if (oz < bounds[offset + 2] || oz > bounds[offset + 5]) {
          node = this.escapes[node];
          continue;
        }
      } else {
        let t0 = (bounds[offset + 2] - oz) * iz, t1 = (bounds[offset + 5] - oz) * iz;
        if (t0 > t1) {
          const swap = t0;
          t0 = t1;
          t1 = swap;
        }
        if (t0 > near)
          near = t0;
        if (t1 < far)
          far = t1;
        if (far < near) {
          node = this.escapes[node];
          continue;
        }
      }
      const start = this.starts[node], end = start + this.counts[node];
      for (let i2 = start;i2 < end; i2++) {
        const offset2 = i2 * 9, p0 = data[offset2], p1 = data[offset2 + 1], p2 = data[offset2 + 2], e10 = data[offset2 + 3], e11 = data[offset2 + 4], e12 = data[offset2 + 5], e20 = data[offset2 + 6], e21 = data[offset2 + 7], e22 = data[offset2 + 8];
        const px = dy * e22 - dz * e21, py = dz * e20 - dx * e22, pz = dx * e21 - dy * e20;
        const det = e10 * px + e11 * py + e12 * pz;
        if (Math.abs(det) < 0.000000000001)
          continue;
        const inv = 1 / det, tx = ox - p0, ty = oy - p1, tz = oz - p2;
        const u = (tx * px + ty * py + tz * pz) * inv;
        if (u < 0 || u > 1)
          continue;
        const qx = ty * e12 - tz * e11, qy = tz * e10 - tx * e12, qz = tx * e11 - ty * e10;
        const v = (dx * qx + dy * qy + dz * qz) * inv;
        if (v < 0 || u + v > 1)
          continue;
        const distance = (e20 * qx + e21 * qy + e22 * qz) * inv;
        if (distance > this.bias * 0.25 && distance < limit) {
          if (!state)
            return true;
          state.hit = this.triangles[i2];
          state.limit = limit = distance;
        }
      }
      node++;
    }
    return state?.hit != null;
  }
}, dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], normalize = (v) => {
  const l = Math.hypot(...v) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}, W = 96, H = 48, SAMPLES = 128, ROUGHNESSES, SHADOW_SAMPLES = 4, REFLECTION_SAMPLES = 4, DIFFUSE_SAMPLES = 2, lobes, cachedTables, StudioLighting = class {
  tables = getTables();
  occlusion;
  eye;
  shadowDirections;
  diffuseCache = /* @__PURE__ */ new WeakMap;
  reflectionSamples = /* @__PURE__ */ new Map;
  normalDiffuseCache = /* @__PURE__ */ new WeakMap;
  specularCache = /* @__PURE__ */ new Map;
  blendedSpecular(rough, level, blend) {
    const cached = this.specularCache.get(rough);
    if (cached)
      return cached;
    if (this.specularCache.size >= 16)
      return null;
    const tables = lobes.map((_, j) => {
      const lo = this.tables.specular[level][j], hi = this.tables.specular[level + 1][j], table = new Float64Array(W * H);
      for (let i2 = 0;i2 < table.length; i2++)
        table[i2] = lo[i2] * (1 - blend) + hi[i2] * blend;
      return table;
    });
    this.specularCache.set(rough, tables);
    return tables;
  }
  constructor(drawCalls, camera) {
    this.occlusion = new RayOcclusion(drawCalls);
    const world = import_gl_matrix7.mat4.invert(import_gl_matrix7.mat4.create(), camera.view);
    if (!world)
      throw new Error("Realistic rendering requires an invertible camera view.");
    this.eye = [world[12], world[13], world[14]];
    this.shadowDirections = lobes.map((l) => {
      const [t, b] = basis(l.direction);
      return Array.from({ length: SHADOW_SAMPLES }, (_, i2) => {
        const u = (i2 + 0.5) / SHADOW_SAMPLES, cos = 1 + Math.log(1 - u) / l.sharpness, sin = Math.sqrt(Math.max(0, 1 - cos * cos)), phi = 2 * Math.PI * radicalInverse(i2);
        const direction = orient(sin * Math.cos(phi), sin * Math.sin(phi), cos, l.direction, t, b);
        const parallel = dot(direction, l.direction);
        return {
          parallel: l.direction.map((v) => v * parallel),
          perpendicular: direction.map((v, k) => v - l.direction[k] * parallel),
          cross: [
            l.direction[1] * direction[2] - l.direction[2] * direction[1],
            l.direction[2] * direction[0] - l.direction[0] * direction[2],
            l.direction[0] * direction[1] - l.direction[1] * direction[0]
          ]
        };
      });
    });
  }
  bounceRadiance(hit, incoming) {
    const metal = Math.max(0, Math.min(1, hit.material.metallicFactor ?? 1));
    let cached = this.diffuseCache.get(hit.material);
    if (!cached || cached.normal.some((v, k) => !Object.is(v, hit.normal[k]))) {
      const irradiance2 = [...studio_environment_default.ambient];
      const lookup = tableLookup(hit.normal);
      for (let j = 0;j < lobes.length; j++) {
        const value = sampleTable(this.tables.diffuse[j], lookup);
        for (let k = 0;k < 3; k++)
          irradiance2[k] += value * lobes[j].color[k];
      }
      cached = { normal: [...hit.normal], irradiance: irradiance2 };
      this.diffuseCache.set(hit.material, cached);
    }
    const irradiance = cached.irradiance;
    const base = hit.material.baseColorFactor;
    const rough = Math.max(0.04, Math.min(1, hit.material.roughnessFactor ?? 1));
    const nv = Math.max(0.001, -dot(hit.normal, incoming));
    const reflected = [
      2 * nv * hit.normal[0] + incoming[0],
      2 * nv * hit.normal[1] + incoming[1],
      2 * nv * hit.normal[2] + incoming[2]
    ];
    let level = 0;
    while (level < ROUGHNESSES.length - 2 && ROUGHNESSES[level + 1] < rough)
      level++;
    const blend = (rough - ROUGHNESSES[level]) / (ROUGHNESSES[level + 1] - ROUGHNESSES[level]);
    const index = (Math.min(63, Math.floor(rough * 64)) * 64 + Math.min(63, Math.floor(nv * 64))) * 2;
    const A = this.tables.brdf[index], B = this.tables.brdf[index + 1];
    const radiance = irradiance.map((c, k) => c * base[k] * (1 - metal) * 0.96);
    const pref = [...studio_environment_default.ambient];
    const reflectedLookup = tableLookup(reflected);
    const specularTables = this.blendedSpecular(rough, level, blend);
    for (let j = 0;j < lobes.length; j++) {
      const value = specularTables ? sampleTable(specularTables[j], reflectedLookup) : sampleTable(this.tables.specular[level][j], reflectedLookup) * (1 - blend) + sampleTable(this.tables.specular[level + 1][j], reflectedLookup) * blend;
      for (let k = 0;k < 3; k++)
        pref[k] += value * lobes[j].color[k];
    }
    for (let k = 0;k < 3; k++)
      radiance[k] += pref[k] * ((0.04 * (1 - metal) + base[k] * metal) * A + B);
    return radiance;
  }
  shade(position, n, base, material, pixelX = 0, pixelY = 0) {
    const v = normalize([
      this.eye[0] - position[0],
      this.eye[1] - position[1],
      this.eye[2] - position[2]
    ]);
    const nv = Math.max(0.001, dot(n, v));
    const reflected = [
      2 * nv * n[0] - v[0],
      2 * nv * n[1] - v[1],
      2 * nv * n[2] - v[2]
    ];
    const origin = [
      position[0] + n[0] * this.occlusion.bias,
      position[1] + n[1] * this.occlusion.bias,
      position[2] + n[2] * this.occlusion.bias
    ];
    const metal = Math.max(0, Math.min(1, material.metallicFactor ?? 1));
    const rough = Math.max(0.04, Math.min(1, material.roughnessFactor ?? 1));
    let level = 0;
    while (level < ROUGHNESSES.length - 2 && ROUGHNESSES[level + 1] < rough)
      level++;
    const blend = (rough - ROUGHNESSES[level]) / (ROUGHNESSES[level + 1] - ROUGHNESSES[level]);
    const bx = Math.min(63, Math.floor(nv * 64)), by = Math.min(63, Math.floor(rough * 64)), bi = (by * 64 + bx) * 2;
    const A = this.tables.brdf[bi], B = this.tables.brdf[bi + 1];
    const f0 = base.map((c) => 0.04 * (1 - metal) + c * metal);
    const color = base.map((c, j) => studio_environment_default.ambient[j] * c * (1 - metal) * 0.96);
    const specColor = f0.map((c, j) => studio_environment_default.ambient[j] * (c * A + B));
    const gradient = (0.06711056 * pixelX + 0.00583715 * pixelY) % 1;
    const hash = 52.9829189 * gradient % 1;
    const phase = hash * 2 * Math.PI, cosPhase = Math.cos(phase), sinPhase = Math.sin(phase);
    let normalDiffuse = this.normalDiffuseCache.get(material);
    if (!normalDiffuse || normalDiffuse.normal.some((value, k) => !Object.is(value, n[k]))) {
      const lookup = tableLookup(n);
      normalDiffuse = {
        normal: [...n],
        values: this.tables.diffuse.map((table) => sampleTable(table, lookup))
      };
      this.normalDiffuseCache.set(material, normalDiffuse);
    }
    const reflectedLookup = tableLookup(reflected);
    const specularTables = this.blendedSpecular(rough, level, blend);
    for (let j = 0;j < lobes.length; j++) {
      const dirs = this.shadowDirections[j];
      let visible = 0, total = 0;
      for (const { parallel, perpendicular, cross } of dirs) {
        const l = [
          parallel[0] + perpendicular[0] * cosPhase + cross[0] * sinPhase,
          parallel[1] + perpendicular[1] * cosPhase + cross[1] * sinPhase,
          parallel[2] + perpendicular[2] * cosPhase + cross[2] * sinPhase
        ];
        const weight = Math.max(0, dot(n, l));
        total += weight;
        if (weight > 0 && !this.occlusion.occluded(origin, l))
          visible += weight;
      }
      const visibility = total > 0 ? visible / total : 1;
      const diffuse = normalDiffuse.values[j] * visibility;
      const specular = (specularTables ? sampleTable(specularTables[j], reflectedLookup) : sampleTable(this.tables.specular[level][j], reflectedLookup) * (1 - blend) + sampleTable(this.tables.specular[level + 1][j], reflectedLookup) * blend) * visibility;
      for (let k = 0;k < 3; k++) {
        color[k] += lobes[j].color[k] * base[k] * (1 - metal) * 0.96 * diffuse;
        specColor[k] += lobes[j].color[k] * (f0[k] * A + B) * specular;
      }
    }
    const [t, b] = basis(n);
    let blocked = 0;
    for (let i2 = 0;metal < 1 && i2 < DIFFUSE_SAMPLES; i2++) {
      const phi = i2 * 2 * Math.PI / DIFFUSE_SAMPLES + phase, l = orient(0.7 * Math.cos(phi), 0.7 * Math.sin(phi), Math.sqrt(0.51), n, t, b);
      const hit = this.occlusion.trace(origin, l);
      if (hit) {
        blocked++;
        const bounce2 = this.bounceRadiance(hit, l);
        for (let k = 0;k < 3; k++)
          color[k] += bounce2[k] * base[k] * (1 - metal) * 0.96 / DIFFUSE_SAMPLES;
      }
    }
    const ao = 1 - blocked / DIFFUSE_SAMPLES;
    for (let k = 0;k < 3; k++)
      color[k] -= studio_environment_default.ambient[k] * (1 - ao) * base[k] * (1 - metal) * 0.96;
    const [rt, rb] = basis(reflected), bounce = [0, 0, 0];
    let hitWeight = 0, totalWeight = 0;
    let samples = this.reflectionSamples.get(rough);
    if (!samples) {
      samples = Array.from({ length: REFLECTION_SAMPLES }, (_, i2) => {
        const u = (i2 + 0.5) / REFLECTION_SAMPLES, phi = 2 * Math.PI * radicalInverse(i2), a = rough * rough, nh = Math.sqrt((1 - u) / (1 + (a * a - 1) * u)), sin = Math.sqrt(1 - nh * nh);
        return [sin * Math.cos(phi), sin * Math.sin(phi), nh];
      });
      this.reflectionSamples.set(rough, samples);
    }
    for (const [sx, sy, nh] of samples) {
      const h = orient(sx * cosPhase - sy * sinPhase, sx * sinPhase + sy * cosPhase, nh, reflected, rt, rb);
      const l = [
        2 * nh * h[0] - reflected[0],
        2 * nh * h[1] - reflected[1],
        2 * nh * h[2] - reflected[2]
      ];
      const weight = Math.max(0, dot(reflected, l));
      totalWeight += weight;
      if (weight === 0 || dot(n, l) <= 0)
        continue;
      const hit = this.occlusion.trace(origin, l);
      if (hit) {
        hitWeight += weight;
        const radiance = this.bounceRadiance(hit, l);
        for (let k = 0;k < 3; k++)
          bounce[k] += radiance[k] * weight;
      }
    }
    for (let k = 0;k < 3; k++)
      color[k] += specColor[k] * (1 - hitWeight / Math.max(totalWeight, 0.00000001)) + bounce[k] / Math.max(totalWeight, 0.00000001) * (f0[k] * A + B);
    return color;
  }
}, COMPONENT_INFO, NUM_COMPONENTS, MAGIC = 1179937895, JSON_CHUNK_TYPE = 1313821514, BIN_CHUNK_TYPE = 5130562;
var init_dist = __esm(() => {
  init_lib();
  init_lib();
  import_gl_matrix = __toESM(require_cjs(), 1);
  import_gl_matrix2 = __toESM(require_cjs(), 1);
  import_gl_matrix3 = __toESM(require_cjs(), 1);
  import_gl_matrix4 = __toESM(require_cjs(), 1);
  import_gl_matrix5 = __toESM(require_cjs(), 1);
  import_gl_matrix6 = __toESM(require_cjs(), 1);
  import_gl_matrix7 = __toESM(require_cjs(), 1);
  import_gl_matrix8 = __toESM(require_cjs(), 1);
  import_gl_matrix9 = __toESM(require_cjs(), 1);
  import_gl_matrix10 = __toESM(require_cjs(), 1);
  DEFAULT_LIGHT_DIR = [-0.4, -0.9, -0.2];
  DEFAULT_RENDER_OPTIONS = {
    realistic: false,
    width: 800,
    height: 600,
    supersampling: 1,
    fov: 60,
    cull: true,
    gamma: true,
    ambient: 0.15,
    lightDir: DEFAULT_LIGHT_DIR,
    camPos: null,
    lookAt: null,
    up: "y+",
    cameraRotation: null,
    backgroundColor: null,
    grid: false,
    debugPoints: null,
    debugFontSize: null,
    debugPointColor: null,
    debugLabelColor: null
  };
  DEFAULT_MARKER_COLOR = [
    255,
    0,
    170,
    255
  ];
  DEFAULT_TEXT_COLOR = [
    255,
    24,
    170,
    255
  ];
  CAMERA_UP_VALUES = /* @__PURE__ */ new Set(["y+", "y-", "x+", "x-", "z+", "z-"]);
  studio_environment_default = {
    ambient: [0.055, 0.065, 0.085],
    lobes: [
      { direction: [-0.45, 0.8, 0.4], sharpness: 18, color: [5, 4.8, 4.4] },
      { direction: [0.8, 0.3, 0.3], sharpness: 30, color: [2.6, 3.1, 4] },
      { direction: [-0.2, 0.3, -0.95], sharpness: 50, color: [4, 4.3, 5] }
    ]
  };
  ROUGHNESSES = [0.04, 0.1, 0.18, 0.28, 0.4, 0.55, 0.7, 0.85, 1];
  lobes = studio_environment_default.lobes.map((l) => ({
    ...l,
    direction: normalize(l.direction),
    color: l.color
  }));
  COMPONENT_INFO = {
    5120: {
      name: "BYTE",
      size: 1,
      array: Int8Array,
      norm: (v) => Math.max(-1, v / 127)
    },
    5121: {
      name: "UNSIGNED_BYTE",
      size: 1,
      array: Uint8Array,
      norm: (v) => v / 255
    },
    5122: {
      name: "SHORT",
      size: 2,
      array: Int16Array,
      norm: (v) => Math.max(-1, v / 32767)
    },
    5123: {
      name: "UNSIGNED_SHORT",
      size: 2,
      array: Uint16Array,
      norm: (v) => v / 65535
    },
    5125: {
      name: "UNSIGNED_INT",
      size: 4,
      array: Uint32Array,
      norm: (v) => v / 4294967295
    },
    5126: { name: "FLOAT", size: 4, array: Float32Array, norm: (v) => v }
  };
  NUM_COMPONENTS = {
    SCALAR: 1,
    VEC2: 2,
    VEC3: 3,
    VEC4: 4,
    MAT2: 4,
    MAT3: 9,
    MAT4: 16
  };
});

// cli/snapshot/snapshot.worker.ts
import { parentPort } from "node:worker_threads";

// lib/shared/render-pcb-svg.ts
import { getFullConnectivityMapFromCircuitJson } from "circuit-json-to-connectivity-map";
import {
  convertCircuitJsonToPcbSvg as renderSvg
} from "circuit-to-svg";
var copperTypes = new Set([
  "pcb_trace",
  "pcb_smtpad",
  "pcb_via",
  "pcb_plated_hole",
  "pcb_copper_pour",
  "pcb_copper_text"
]);
function resolveXRayElementIds(elements, selectors) {
  const map = getFullConnectivityMapFromCircuitJson(elements);
  const netOf = (element) => {
    const record = element;
    for (const key of [
      `${element.type}_id`,
      "pcb_port_id",
      "pcb_trace_id",
      "source_trace_id",
      "source_net_id"
    ]) {
      const id = record[key];
      if (typeof id === "string") {
        const net = map.getNetConnectedToId(id);
        if (net)
          return net;
      }
    }
  };
  const nets = new Set;
  for (const selector of selectors) {
    const direct = map.getNetConnectedToId(selector);
    const matches = new Set;
    if (direct)
      matches.add(direct);
    else {
      for (const element of elements) {
        if (element.type !== "source_net" && element.type !== "source_trace")
          continue;
        if (element.name?.trim() === selector || element.type === "source_trace" && element.display_name?.trim() === selector) {
          const net = netOf(element);
          if (net)
            matches.add(net);
        }
      }
    }
    if (!matches.size)
      throw new Error(`No connected PCB net matches "${selector}". Use an exact net name, trace display name, or element ID.`);
    if (matches.size > 1)
      throw new Error(`Net name "${selector}" is ambiguous. Use a source_net_id, source_trace_id, or PCB element ID.`);
    nets.add([...matches][0]);
  }
  const ids = elements.filter((element) => copperTypes.has(element.type) && nets.has(netOf(element))).map((element) => element[`${element.type}_id`]);
  if (selectors.length && !ids.length)
    throw new Error("The selected nets have no PCB copper to render.");
  return ids;
}
function convertCircuitJsonToPcbSvg(elements, options = {}) {
  const { xRayNets, ...renderOptions } = options;
  return renderSvg(elements, {
    ...renderOptions,
    ...xRayNets?.length ? { xRayElementIds: resolveXRayElementIds(elements, xRayNets) } : {}
  });
}

// lib/shared/process-snapshot-file.ts
import fs10 from "node:fs";
import path11 from "node:path";

// node_modules/circuit-json-to-3d-png/dist/index.js
function normalizeDir(dir) {
  const len = Math.sqrt(dir[0] ** 2 + dir[1] ** 2 + dir[2] ** 2);
  if (len === 0)
    return [0, 1, 0];
  return [dir[0] / len, dir[1] / len, dir[2] / len];
}
function distance(a, b) {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}
function repositionCamera(cam, dir, distOverride) {
  const dist = distOverride ?? distance(cam.camPos, cam.lookAt);
  const [nx, ny, nz] = normalizeDir(dir);
  return {
    camPos: [
      cam.lookAt[0] + nx * dist,
      cam.lookAt[1] + ny * dist,
      cam.lookAt[2] + nz * dist
    ],
    lookAt: cam.lookAt,
    fov: cam.fov
  };
}
var CAMERA_PRESETS = {
  "top-down": (cam) => repositionCamera(cam, [0.00000001, 1, -0.001]),
  "top-down-ortho": (cam) => {
    const desiredFov = 3;
    const dir = [0.00000001, 1, -0.001];
    const origDist = distance(cam.camPos, cam.lookAt);
    const origFovRad = Math.max(cam.fov * Math.PI / 180, 0.01);
    const desiredFovRad = Math.max(desiredFov * Math.PI / 180, 0.01);
    const tanOrig = Math.tan(origFovRad / 2);
    const tanDesired = Math.max(Math.tan(desiredFovRad / 2), 0.0001);
    const distScale = Number.isFinite(tanOrig / tanDesired) && tanOrig > 0 ? tanOrig / tanDesired : 1;
    const newDist = origDist * distScale;
    const repositioned = repositionCamera(cam, dir, newDist);
    return { ...repositioned, fov: desiredFov };
  },
  "top-left-corner": (cam) => repositionCamera(cam, [0.7, 1.2, -0.8]),
  "top-left": (cam) => repositionCamera(cam, [1, 1.2, 0]),
  "top-right-corner": (cam) => repositionCamera(cam, [-0.7, 1.2, -0.8]),
  "top-right": (cam) => repositionCamera(cam, [-1, 1.2, 0]),
  "left-sideview": (cam) => repositionCamera(cam, [1, 0.05, 0]),
  "right-sideview": (cam) => repositionCamera(cam, [-1, 0.05, 0]),
  front: (cam) => repositionCamera(cam, [0, 0.05, -1]),
  "top-center-angled": (cam) => repositionCamera(cam, [0, 1, -1])
};
var CAMERA_PRESET_NAMES = Object.keys(CAMERA_PRESETS);
function applyCameraPreset(preset, cam) {
  if (!(preset in CAMERA_PRESETS)) {
    throw new Error(`Unknown camera preset "${preset}". Valid presets: ${CAMERA_PRESET_NAMES.join(", ")}`);
  }
  return CAMERA_PRESETS[preset](cam);
}
var viewToArrayBuffer = (view) => {
  const copy = new Uint8Array(view.byteLength);
  copy.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
  return copy.buffer;
};
var normalizeToArrayBuffer2 = async (value) => {
  if (value instanceof ArrayBuffer) {
    return value;
  }
  if (ArrayBuffer.isView(value)) {
    return viewToArrayBuffer(value);
  }
  if ("arrayBuffer" in value && typeof value.arrayBuffer === "function") {
    const result = value.arrayBuffer();
    return result instanceof Promise ? await result : result;
  }
  throw new Error("Expected ArrayBuffer, ArrayBufferView, or Buffer-compatible object");
};
var normalizeToUint8Array = (value) => {
  if (value instanceof Uint8Array) {
    return value;
  }
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(viewToArrayBuffer(value));
  }
  throw new Error("Expected Uint8Array, ArrayBuffer, or ArrayBufferView");
};
var circuitJsonToGltfModulePromise = null;
var poppyGlModulePromise = null;
var loadCircuitJsonToGltf = async () => {
  circuitJsonToGltfModulePromise ??= import("circuit-json-to-gltf");
  return circuitJsonToGltfModulePromise;
};
var loadPoppyGl = async () => {
  poppyGlModulePromise ??= Promise.resolve().then(() => (init_dist(), exports_dist));
  return poppyGlModulePromise;
};
var modelUrlKeys = [
  "model_glb_url",
  "glb_model_url",
  "model_stl_url",
  "stl_model_url",
  "model_obj_url",
  "obj_model_url",
  "model_gltf_url",
  "gltf_model_url",
  "model_step_url",
  "step_model_url"
];
var hasUriScheme = (value) => /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value) && !/^[a-zA-Z]:[\\/]/.test(value);
var isWindowsAbsolutePath = (value) => /^[a-zA-Z]:[\\/]/.test(value);
var getDefaultBaseDir = () => {
  if (typeof process !== "undefined" && process && typeof process.cwd === "function") {
    return process.cwd();
  }
  return;
};
var toFileUrl = (value) => {
  const normalizedPath = value.replace(/\\/g, "/");
  const pathname = isWindowsAbsolutePath(value) ? `/${normalizedPath}` : normalizedPath;
  return new URL(`file://${encodeURI(pathname)}`).href;
};
var toDirectoryUrl = (value) => {
  if (hasUriScheme(value)) {
    return value.endsWith("/") ? value : `${value}/`;
  }
  const directoryPath = value.endsWith("/") || value.endsWith("\\") ? value : `${value}/`;
  return toFileUrl(directoryPath);
};
var normalizeModelUrls = (circuitJson, options = {}) => {
  const baseDir = options.modelPathBaseDir ?? getDefaultBaseDir();
  const hasModelPathBaseDir = options.modelPathBaseDir != null;
  const preserveRelativeModelUrls = Boolean(options.projectBaseUrl);
  return circuitJson.map((element) => {
    if (!element || typeof element !== "object")
      return element;
    const updated = { ...element };
    for (const key of modelUrlKeys) {
      const value = updated[key];
      if (!value)
        continue;
      if (hasUriScheme(value))
        continue;
      if (value.startsWith("/") && preserveRelativeModelUrls) {
        updated[key] = value;
      } else if (value.startsWith("/") || isWindowsAbsolutePath(value)) {
        updated[key] = toFileUrl(value);
      } else if (preserveRelativeModelUrls && !hasModelPathBaseDir) {
        updated[key] = value;
      } else if (!baseDir) {
        updated[key] = value;
      } else {
        updated[key] = new URL(value, toDirectoryUrl(baseDir)).href;
      }
    }
    return updated;
  });
};
var getRenderCamera = (circuitJson, defaultCamera, options = {}) => {
  if (options.camera) {
    return options.camera;
  }
  if (!options.cameraPreset) {
    return defaultCamera;
  }
  return applyCameraPreset(options.cameraPreset, defaultCamera);
};
var getConversionOptions = (format, options = {}) => ({
  format,
  ...options.projectBaseUrl ? { projectBaseUrl: options.projectBaseUrl } : {},
  ...options.authHeaders ? { authHeaders: options.authHeaders } : {},
  ...options.boardTextureResolution ? { boardTextureResolution: options.boardTextureResolution } : {}
});
var getDefaultCameraForCircuitJson = (circuitJson) => loadCircuitJsonToGltf().then(({ getBestCameraPosition }) => getBestCameraPosition(circuitJson));
var convertCircuitJsonTo3dGlb = async (circuitJson, options = {}) => {
  const normalizedCircuitJson = normalizeModelUrls(circuitJson, options);
  const { convertCircuitJsonToGltf } = await loadCircuitJsonToGltf();
  const glbBuffer = await convertCircuitJsonToGltf(normalizedCircuitJson, getConversionOptions("glb", options));
  return normalizeToUint8Array(await normalizeToArrayBuffer2(glbBuffer));
};
var renderCircuitJsonTo3dPng = async (circuitJson, options = {}) => {
  const [{ getBestCameraPosition }, { renderGLTFToPNGFromGLB: renderGLTFToPNGFromGLB2 }] = await Promise.all([loadCircuitJsonToGltf(), loadPoppyGl()]);
  const glbBuffer = await convertCircuitJsonTo3dGlb(circuitJson, options);
  const glbArrayBuffer = await normalizeToArrayBuffer2(glbBuffer);
  const defaultCamera = getBestCameraPosition(circuitJson);
  return renderGLTFToPNGFromGLB2(glbArrayBuffer, getRenderCamera(circuitJson, defaultCamera, options));
};

// lib/shared/process-snapshot-file.ts
import { convertCircuitJsonToStackedSchematicSheetsSvg } from "circuit-to-svg";

// node_modules/kleur/index.mjs
var FORCE_COLOR;
var NODE_DISABLE_COLORS;
var NO_COLOR;
var TERM;
var isTTY = true;
if (typeof process !== "undefined") {
  ({ FORCE_COLOR, NODE_DISABLE_COLORS, NO_COLOR, TERM } = process.env || {});
  isTTY = process.stdout && process.stdout.isTTY;
}
var $ = {
  enabled: !NODE_DISABLE_COLORS && NO_COLOR == null && TERM !== "dumb" && (FORCE_COLOR != null && FORCE_COLOR !== "0" || isTTY),
  reset: init(0, 0),
  bold: init(1, 22),
  dim: init(2, 22),
  italic: init(3, 23),
  underline: init(4, 24),
  inverse: init(7, 27),
  hidden: init(8, 28),
  strikethrough: init(9, 29),
  black: init(30, 39),
  red: init(31, 39),
  green: init(32, 39),
  yellow: init(33, 39),
  blue: init(34, 39),
  magenta: init(35, 39),
  cyan: init(36, 39),
  white: init(37, 39),
  gray: init(90, 39),
  grey: init(90, 39),
  bgBlack: init(40, 49),
  bgRed: init(41, 49),
  bgGreen: init(42, 49),
  bgYellow: init(43, 49),
  bgBlue: init(44, 49),
  bgMagenta: init(45, 49),
  bgCyan: init(46, 49),
  bgWhite: init(47, 49)
};
function run(arr, str) {
  let i2 = 0, tmp, beg = "", end = "";
  for (;i2 < arr.length; i2++) {
    tmp = arr[i2];
    beg += tmp.open;
    end += tmp.close;
    if (!!~str.indexOf(tmp.close)) {
      str = str.replace(tmp.rgx, tmp.close + tmp.open);
    }
  }
  return beg + str + end;
}
function chain(has, keys) {
  let ctx = { has, keys };
  ctx.reset = $.reset.bind(ctx);
  ctx.bold = $.bold.bind(ctx);
  ctx.dim = $.dim.bind(ctx);
  ctx.italic = $.italic.bind(ctx);
  ctx.underline = $.underline.bind(ctx);
  ctx.inverse = $.inverse.bind(ctx);
  ctx.hidden = $.hidden.bind(ctx);
  ctx.strikethrough = $.strikethrough.bind(ctx);
  ctx.black = $.black.bind(ctx);
  ctx.red = $.red.bind(ctx);
  ctx.green = $.green.bind(ctx);
  ctx.yellow = $.yellow.bind(ctx);
  ctx.blue = $.blue.bind(ctx);
  ctx.magenta = $.magenta.bind(ctx);
  ctx.cyan = $.cyan.bind(ctx);
  ctx.white = $.white.bind(ctx);
  ctx.gray = $.gray.bind(ctx);
  ctx.grey = $.grey.bind(ctx);
  ctx.bgBlack = $.bgBlack.bind(ctx);
  ctx.bgRed = $.bgRed.bind(ctx);
  ctx.bgGreen = $.bgGreen.bind(ctx);
  ctx.bgYellow = $.bgYellow.bind(ctx);
  ctx.bgBlue = $.bgBlue.bind(ctx);
  ctx.bgMagenta = $.bgMagenta.bind(ctx);
  ctx.bgCyan = $.bgCyan.bind(ctx);
  ctx.bgWhite = $.bgWhite.bind(ctx);
  return ctx;
}
function init(open, close) {
  let blk = {
    open: `\x1B[${open}m`,
    close: `\x1B[${close}m`,
    rgx: new RegExp(`\\x1b\\[${close}m`, "g")
  };
  return function(txt) {
    if (this !== undefined && this.has !== undefined) {
      !!~this.has.indexOf(open) || (this.has.push(open), this.keys.push(blk));
      return txt === undefined ? this : $.enabled ? run(this.keys, txt + "") : txt + "";
    }
    return txt === undefined ? chain([open], [blk]) : $.enabled ? run([blk], txt + "") : txt + "";
  };
}
var kleur_default = $;

// lib/shared/circuit-json-build-cache.ts
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
var getCircuitJsonRenderOptionsHash = (options) => createHash("sha256").update("canonical-circuit-json-v1:").update(JSON.stringify({
  platformConfig: options.platformConfig,
  injectedProps: options.injectedProps
}, (_key, value) => typeof value === "function" ? value.toString() : value)).digest("hex");
var writeCircuitJsonBuildMetadata = (outputPath, metadata) => {
  const metadataPath = `${outputPath}.metadata.json`;
  if (metadata)
    fs.writeFileSync(metadataPath, JSON.stringify(metadata));
  else
    fs.rmSync(metadataPath, { force: true });
};
var SOURCE_FILE_EXTENSIONS = new Set([
  ".tsx",
  ".ts",
  ".jsx",
  ".js",
  ".json",
  ".txt",
  ".md",
  ".obj",
  ".kicad_mod",
  ".kicad_pcb",
  ".kicad_pro",
  ".kicad_sch",
  ".kicad_sym"
]);
var IGNORED_DIRECTORY_NAMES = new Set([
  "node_modules",
  "dist",
  "build",
  ".git"
]);
var isPathInside = (childPath, parentPath) => {
  const relative = path.relative(parentPath, childPath);
  return relative === "" || !relative.startsWith("..") && !path.isAbsolute(relative);
};
var findCircuitProjectDir = (filePath) => {
  const absoluteFilePath = path.resolve(filePath);
  let currentDir = path.dirname(absoluteFilePath);
  while (true) {
    if (fs.existsSync(path.join(currentDir, "package.json"))) {
      return currentDir;
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir)
      break;
    currentDir = parentDir;
  }
  const cwd = path.resolve(process.cwd());
  return isPathInside(absoluteFilePath, cwd) ? cwd : path.dirname(absoluteFilePath);
};
var getCircuitJsonOutputDirName = (relativePath) => {
  const normalizedRelativePath = relativePath.toLowerCase().replaceAll("\\", "/");
  if (normalizedRelativePath === "circuit.json" || normalizedRelativePath.endsWith("/circuit.json")) {
    return path.dirname(relativePath);
  }
  return relativePath.replace(/(\.board|\.circuit)?\.tsx$/, "").replace(/\.circuit\.json$/, "");
};
var getCircuitJsonBuildOutputPath = (filePath) => {
  const absoluteFilePath = path.resolve(filePath);
  const projectDir = findCircuitProjectDir(absoluteFilePath);
  const relativePath = path.relative(projectDir, absoluteFilePath);
  return path.join(projectDir, "dist", getCircuitJsonOutputDirName(relativePath), "circuit.json");
};
var getSourceFilePaths = (projectDir) => {
  const sourceFilePaths = [];
  const isGeneratedCircuitJson = (entryPath) => {
    if (!entryPath.endsWith(".circuit.json"))
      return false;
    const stem = entryPath.slice(0, -".circuit.json".length);
    return [".tsx", ".ts", ".jsx", ".js"].some((extension) => fs.existsSync(`${stem}${extension}`));
  };
  const visit = (directoryPath) => {
    const entries = fs.readdirSync(directoryPath, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const entryPath = path.join(directoryPath, entry.name);
      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORY_NAMES.has(entry.name) || entry.name.startsWith(".")) {
          continue;
        }
        visit(entryPath);
        continue;
      }
      if (!entry.isFile() || isGeneratedCircuitJson(entryPath) || entry.name.endsWith(".circuit.json.metadata.json") || !SOURCE_FILE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        continue;
      }
      sourceFilePaths.push(entryPath);
    }
  };
  visit(projectDir);
  return sourceFilePaths;
};
var getSourceFilesystemMd5Hash = (filePath) => {
  const projectDir = findCircuitProjectDir(filePath);
  const hash = createHash("md5");
  for (const sourceFilePath of getSourceFilePaths(projectDir)) {
    const relativePath = path.relative(projectDir, sourceFilePath).split(path.sep).join("/");
    const content = fs.readFileSync(sourceFilePath);
    hash.update(`${Buffer.byteLength(relativePath)}:`);
    hash.update(relativePath);
    hash.update(`${content.byteLength}:`);
    hash.update(content);
  }
  return hash.digest("hex");
};
var addSourceFilesystemHash = (circuitJson, sourceFilesystemMd5Hash) => {
  let foundProjectMetadata = false;
  const circuitJsonWithHash = circuitJson.map((element) => {
    if (element.type !== "source_project_metadata")
      return element;
    foundProjectMetadata = true;
    const metadataWithHash = {
      ...element,
      source_filesystem_md5_hash: sourceFilesystemMd5Hash
    };
    return metadataWithHash;
  });
  if (!foundProjectMetadata) {
    const metadataWithHash = {
      type: "source_project_metadata",
      source_filesystem_md5_hash: sourceFilesystemMd5Hash
    };
    circuitJsonWithHash.push(metadataWithHash);
  }
  return circuitJsonWithHash;
};
var readCurrentCircuitJsonBuild = ({
  filePath,
  sourceFilesystemMd5Hash,
  renderOptionsHash
}) => {
  const outputPath = getCircuitJsonBuildOutputPath(filePath);
  try {
    const parsed = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
    if (!Array.isArray(parsed))
      return null;
    const metadata = renderOptionsHash ? JSON.parse(fs.readFileSync(`${outputPath}.metadata.json`, "utf-8")) : undefined;
    if (renderOptionsHash && (metadata?.renderOptionsHash !== renderOptionsHash || metadata?.sourceFilesystemMd5Hash !== sourceFilesystemMd5Hash))
      return null;
    const hasCurrentFilesystemHash = parsed.some((element) => element?.type === "source_project_metadata" && element.source_filesystem_md5_hash === sourceFilesystemMd5Hash);
    return hasCurrentFilesystemHash ? {
      circuitJson: parsed,
      outputPath,
      modeling: metadata?.modeling
    } : null;
  } catch {
    return null;
  }
};

// lib/shared/generate-circuit-json.tsx
import fs7 from "node:fs";
import path9 from "node:path";
import { pathToFileURL as pathToFileURL3 } from "node:url";
import Debug from "debug";

// lib/shared/autorouter-diagnostics.ts
import fs2 from "node:fs";
import path2 from "node:path";
import { convertCircuitJsonToPcbSvg as convertCircuitJsonToPcbSvg2 } from "circuit-to-svg";

// lib/shared/convert-svg-to-png.ts
import { Resvg } from "@resvg/resvg-js";
var convertSvgToPngBuffer = (svg) => {
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: "original"
    }
  });
  return resvg.render().asPng();
};

// lib/shared/autorouter-diagnostics.ts
var DEFAULT_DEBUG_DIR = path2.join("dist", "autorouter-debug");
var PROGRESS_LOG_INTERVAL_MS = 1e4;
var CIRCUIT_JSON_ID_PATTERN = /\b(?:source|pcb|schematic|subcircuit|cad|simulation)_[a-z0-9_]*_\d+\b/gi;
var parseAutorouterTimeout = (duration) => {
  const trimmed = duration.trim();
  const match = trimmed.match(/^(\d+(?:\.\d+)?)(ms|s|m)?$/);
  if (!match) {
    throw new Error(`Invalid --autorouter-timeout value "${duration}". Use values like "120s", "2m", or "5000ms".`);
  }
  const value = Number.parseFloat(match[1]);
  const unit = match[2] ?? "ms";
  const multiplier = unit === "m" ? 60000 : unit === "s" ? 1000 : 1;
  const timeoutMs = Math.round(value * multiplier);
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("--autorouter-timeout must be greater than zero");
  }
  return timeoutMs;
};
var parseAutorouterPhaseName = (value) => {
  const phaseName = value.trim();
  if (!phaseName) {
    throw new Error("Invalid --autorouter-phase value. The phase name must not be empty.");
  }
  return phaseName;
};
var parseAutorouterDumpSrjMode = (value) => {
  if (value === undefined || value === false)
    return;
  if (value === true || value === "")
    return "failed";
  if (value === "all" || value === "failed")
    return value;
  const phaseMatch = value.match(/^phase:(\d+)$/);
  if (phaseMatch)
    return `phase:${Number.parseInt(phaseMatch[1], 10)}`;
  throw new Error(`Invalid --autorouter-dump-srj value "${value}". Use "all", "failed", or "phase:<index>".`);
};

class AutorouterPhaseTimeoutError extends Error {
  debugArtifactPath;
  constructor(message, debugArtifactPath) {
    super(message);
    this.name = "AutorouterPhaseTimeoutError";
    this.debugArtifactPath = debugArtifactPath;
  }
}

class AutorouterDiagnostics {
  options;
  phaseOrdinalBySubcircuit = new Map;
  traceCountBySubcircuit = new Map;
  activePhase = null;
  completedPhaseTraces = [];
  hasWrittenPlacementSnapshot = false;
  targetPhaseReached = false;
  summary = [];
  rootCircuit;
  constructor(options = {}) {
    const phaseName = options.phaseName?.trim() || undefined;
    this.options = {
      ...options,
      enabled: options.enabled || phaseName !== undefined,
      phaseName,
      debugDir: options.debugDir ?? DEFAULT_DEBUG_DIR,
      log: options.log ?? console.log
    };
  }
  get isActive() {
    return Boolean(this.options.enabled || this.options.phaseName || this.options.timeoutMs || this.options.dumpSrj || this.options.logOnError || this.options.longRunningLogThresholdMs);
  }
  attachToRootCircuit(rootCircuit) {
    if (!this.isActive)
      return;
    this.rootCircuit = rootCircuit;
    rootCircuit.on?.("autorouting:start", (event) => this.handleStart(event));
    rootCircuit.on?.("autorouting:progress", (event) => this.handleProgress(event));
    rootCircuit.on?.("autorouting:end", (event) => this.handleEnd(event));
    rootCircuit.on?.("autorouting:error", (event) => this.handleError(event));
  }
  checkTimeout() {
    this.checkLongRunning();
    if (!this.options.timeoutMs || !this.activePhase)
      return;
    const elapsedMs = performance.now() - this.activePhase.startedAt;
    if (elapsedMs < this.options.timeoutMs)
      return;
    const artifactPath = this.writeTimeoutArtifact(this.activePhase, elapsedMs);
    const phaseLabel = this.getPhaseLabel(this.activePhase);
    const message = `Autorouter timeout after ${this.formatElapsed(elapsedMs)} in ${phaseLabel}. Set a different timeout with \`--autorouter-timeout <duration>\` (for example, \`--autorouter-timeout 2m\`).`;
    this.log(kleur_default.red(message));
    throw new AutorouterPhaseTimeoutError(message, artifactPath);
  }
  finalize(circuitJson) {
    if (!this.isActive || this.summary.length === 0 || !this.options.enabled && !this.options.dumpSrj) {
      return;
    }
    this.writeJson("board.meta.json", {
      type: "autorouter_debug_summary",
      generatedAt: new Date().toISOString(),
      phaseCount: this.summary.length,
      phases: this.summary,
      circuitJsonElementCount: circuitJson?.length,
      targetPhaseName: this.options.phaseName,
      targetPhaseReached: this.targetPhaseReached
    });
  }
  handleStart(event) {
    if (this.targetPhaseReached)
      return;
    const simpleRouteJson = event.simpleRouteJson;
    const subcircuitId = event.subcircuit_id ?? event.subcircuitId ?? "unknown-subcircuit";
    const previousOrdinal = this.phaseOrdinalBySubcircuit.get(subcircuitId) ?? 0;
    const phaseOrdinal = event.phaseOrdinal ?? previousOrdinal + 1;
    this.phaseOrdinalBySubcircuit.set(subcircuitId, phaseOrdinal);
    const routingPhaseIndex = event.routingPhaseIndex ?? phaseOrdinal - 1;
    const connectionCount = event.connectionCount ?? simpleRouteJson?.connections?.length ?? 0;
    const obstacleCount = event.obstacleCount ?? simpleRouteJson?.obstacles?.length ?? 0;
    const previousTraceCount = event.previousTraceCount ?? this.traceCountBySubcircuit.get(subcircuitId) ?? 0;
    this.activePhase = {
      subcircuitId,
      componentDisplayName: event.componentDisplayName ?? "subcircuit",
      phaseName: event.phaseName,
      phaseStageIndex: event.phaseStageIndex,
      phaseStageCount: event.phaseStageCount,
      routingPhaseIndex,
      phaseOrdinal,
      phaseCount: event.phaseCount,
      connectionCount,
      obstacleCount,
      previousTraceCount,
      startedAt: performance.now(),
      startedAtIso: new Date().toISOString(),
      simpleRouteJson,
      autorouterName: event.autorouterName,
      autorouterVersion: event.autorouterVersion,
      solverName: event.solverName,
      effort: event.effort,
      cacheStatus: event.cacheStatus,
      cacheKey: event.cacheKey,
      cacheDisabledReason: event.cacheDisabledReason,
      routerDescription: this.formatRouter(event),
      lastProgressLogAt: 0,
      hasLoggedStart: false,
      longRunningLoggingStarted: false
    };
    if (this.options.enabled && !this.hasWrittenPlacementSnapshot) {
      const placementCircuitJson = this.getCurrentCircuitJson().filter((element) => !this.isRouteElement(element));
      this.writePngSnapshot("placement-unrouted.png", placementCircuitJson, {
        shouldDrawRatsNest: true
      });
      this.hasWrittenPlacementSnapshot = true;
    }
    if (this.options.enabled) {
      this.logPhaseStart(this.activePhase);
    }
    if (this.shouldDumpInput(routingPhaseIndex)) {
      this.writeJson(this.getPhaseFileName(this.activePhase, "input.simple-route.json"), simpleRouteJson ?? {});
    }
  }
  handleProgress(event) {
    if (!this.activePhase)
      return;
    const now = performance.now();
    this.activePhase.lastProgress = event;
    if (!this.shouldLogPhaseDetails(this.activePhase))
      return;
    if (this.activePhase.lastProgressLogAt > 0 && now - this.activePhase.lastProgressLogAt < PROGRESS_LOG_INTERVAL_MS) {
      return;
    }
    this.activePhase.lastProgressLogAt = now;
    this.logProgress(this.activePhase, event, now);
  }
  handleEnd(event) {
    const activePhase = this.matchActivePhase(event);
    if (!activePhase)
      return;
    const elapsedMs = performance.now() - activePhase.startedAt;
    const outputSrj = event.simpleRouteJson;
    const outputTraceCount = outputSrj?.traces?.length ?? 0;
    const outputJumperCount = outputSrj?.jumpers?.length ?? 0;
    const errorCount = this.countErrors(outputSrj);
    const cumulativeTraceCount = activePhase.previousTraceCount + outputTraceCount;
    this.traceCountBySubcircuit.set(activePhase.subcircuitId, cumulativeTraceCount);
    this.completedPhaseTraces.push(...outputSrj?.traces ?? []);
    this.summary.push({
      subcircuit_id: activePhase.subcircuitId,
      componentDisplayName: activePhase.componentDisplayName,
      phaseName: activePhase.phaseName,
      phaseStageIndex: activePhase.phaseStageIndex,
      phaseStageCount: activePhase.phaseStageCount,
      routingPhaseIndex: activePhase.routingPhaseIndex,
      phaseOrdinal: activePhase.phaseOrdinal,
      phaseCount: activePhase.phaseCount,
      connectionCount: activePhase.connectionCount,
      obstacleCount: activePhase.obstacleCount,
      previousTraceCount: activePhase.previousTraceCount,
      ...this.getExecutionMetadata(activePhase),
      outputTraceCount,
      outputJumperCount,
      errorCount,
      elapsedMs: Math.round(elapsedMs),
      startedAt: activePhase.startedAtIso,
      completedAt: new Date().toISOString()
    });
    if (this.shouldLogPhaseDetails(activePhase) || this.didCrossLongRunningThreshold(activePhase, elapsedMs)) {
      if (!activePhase.hasLoggedStart) {
        this.startLongRunningLogging(activePhase, elapsedMs);
      }
      this.logPhaseEnd(activePhase, {
        outputTraceCount,
        outputJumperCount,
        errorCount,
        elapsedMs
      });
    }
    if (this.shouldDumpSuccessfulOutput(activePhase.routingPhaseIndex)) {
      this.writeJson(this.getPhaseFileName(activePhase, "output.traces.json"), outputSrj?.traces ?? []);
    }
    if (this.options.enabled) {
      this.writePngSnapshot(`phase-${activePhase.routingPhaseIndex}-routed.png`, this.getCircuitJsonWithCompletedPhaseTraces());
    }
    if (this.isFinalTargetPhaseStage(activePhase)) {
      this.targetPhaseReached = true;
    }
    if (this.activePhase === activePhase) {
      this.activePhase = null;
    }
  }
  handleError(event) {
    const activePhase = this.matchActivePhase(event);
    if (!activePhase)
      return;
    const elapsedMs = performance.now() - activePhase.startedAt;
    const error = this.serializeError(event.error);
    this.summary.push({
      subcircuit_id: activePhase.subcircuitId,
      componentDisplayName: activePhase.componentDisplayName,
      phaseName: activePhase.phaseName,
      phaseStageIndex: activePhase.phaseStageIndex,
      phaseStageCount: activePhase.phaseStageCount,
      routingPhaseIndex: activePhase.routingPhaseIndex,
      phaseOrdinal: activePhase.phaseOrdinal,
      phaseCount: activePhase.phaseCount,
      connectionCount: activePhase.connectionCount,
      obstacleCount: activePhase.obstacleCount,
      previousTraceCount: activePhase.previousTraceCount,
      ...this.getExecutionMetadata(activePhase),
      elapsedMs: Math.round(elapsedMs),
      error,
      startedAt: activePhase.startedAtIso,
      completedAt: new Date().toISOString()
    });
    if (this.options.enabled || this.options.logOnError) {
      if (!activePhase.hasLoggedStart) {
        this.logPhaseStart(activePhase, "failed");
      }
      this.log(`  ${this.getPhaseLabel(activePhase)} error after ${this.formatElapsed(elapsedMs)}: ${this.formatUserFacingText(error.message)}`);
    }
    if (this.shouldDumpFailedInput(activePhase.routingPhaseIndex)) {
      this.writeJson(this.getPhaseFileName(activePhase, "input.simple-route.json"), event.simpleRouteJson ?? activePhase.simpleRouteJson ?? {});
      this.writeJson(this.getPhaseFileName(activePhase, "error.json"), {
        type: "autorouter_phase_error",
        subcircuit_id: activePhase.subcircuitId,
        routingPhaseIndex: activePhase.routingPhaseIndex,
        phaseName: activePhase.phaseName,
        phaseStageIndex: activePhase.phaseStageIndex,
        phaseStageCount: activePhase.phaseStageCount,
        phaseOrdinal: activePhase.phaseOrdinal,
        phaseCount: activePhase.phaseCount,
        elapsedMs: Math.round(elapsedMs),
        connectionCount: activePhase.connectionCount,
        obstacleCount: activePhase.obstacleCount,
        previousTraceCount: activePhase.previousTraceCount,
        ...this.getExecutionMetadata(activePhase),
        error
      });
    }
    if (this.isFinalTargetPhaseStage(activePhase)) {
      this.targetPhaseReached = true;
    }
    if (this.activePhase === activePhase) {
      this.activePhase = null;
    }
  }
  writeTimeoutArtifact(activePhase, elapsedMs) {
    const inputFile = this.getPhaseFileName(activePhase, "input.simple-route.json");
    const previousTracesFile = this.getPhaseFileName(activePhase, "previous-output.traces.json");
    const timeoutFile = this.getPhaseFileName(activePhase, "timeout.json");
    const boardFile = "board.source-and-pcb.circuit.json";
    this.writeJson(inputFile, activePhase.simpleRouteJson ?? {});
    this.writeJson(previousTracesFile, this.completedPhaseTraces);
    this.writeJson(boardFile, this.getCurrentCircuitJson());
    return this.writeJson(timeoutFile, {
      type: "autorouter_phase_timeout",
      subcircuit_id: activePhase.subcircuitId,
      componentDisplayName: activePhase.componentDisplayName,
      routingPhaseIndex: activePhase.routingPhaseIndex,
      phaseName: activePhase.phaseName,
      phaseStageIndex: activePhase.phaseStageIndex,
      phaseStageCount: activePhase.phaseStageCount,
      phaseOrdinal: activePhase.phaseOrdinal,
      phaseCount: activePhase.phaseCount,
      elapsedMs: Math.round(elapsedMs),
      connectionCount: activePhase.connectionCount,
      obstacleCount: activePhase.obstacleCount,
      previousTraceCount: activePhase.previousTraceCount,
      ...this.getExecutionMetadata(activePhase),
      files: {
        inputSimpleRouteJson: inputFile,
        previousOutputTraces: previousTracesFile,
        boardCircuitJson: boardFile
      },
      lastProgress: activePhase.lastProgress
    });
  }
  checkLongRunning() {
    if (!this.activePhase)
      return;
    const elapsedMs = performance.now() - this.activePhase.startedAt;
    if (!this.didCrossLongRunningThreshold(this.activePhase, elapsedMs))
      return;
    this.startLongRunningLogging(this.activePhase, elapsedMs);
  }
  didCrossLongRunningThreshold(activePhase, elapsedMs) {
    return Boolean(!this.options.enabled && this.options.longRunningLogThresholdMs && !activePhase.longRunningLoggingStarted && elapsedMs >= this.options.longRunningLogThresholdMs);
  }
  startLongRunningLogging(activePhase, elapsedMs) {
    activePhase.longRunningLoggingStarted = true;
    this.log(kleur_default.yellow(`Autorouting ${this.getPhaseLabel(activePhase)} has been running for ${this.formatElapsed(elapsedMs)}; enabling phase diagnostics. Re-run with --autorouter-debug for full autorouter logs from the start.`));
    this.logPhaseStart(activePhase, "long-running");
    if (activePhase.lastProgress) {
      this.logProgress(activePhase, activePhase.lastProgress, performance.now());
    }
  }
  shouldLogPhaseDetails(activePhase) {
    return Boolean(this.options.enabled || activePhase.longRunningLoggingStarted);
  }
  logPhaseStart(activePhase, reason) {
    const reasonText = reason ? ` ${reason}` : "";
    this.log(`Autorouting ${this.formatUserFacingText(activePhase.componentDisplayName)} ${this.getPhaseLabel(activePhase)}${reasonText} start: connections=${activePhase.connectionCount}, obstacles=${activePhase.obstacleCount}, previous_traces=${activePhase.previousTraceCount}${activePhase.routerDescription ? `, ${activePhase.routerDescription}` : ""}`);
    const connectionNames = this.getConnectionNames(activePhase.simpleRouteJson);
    if (connectionNames.length > 0) {
      this.log(`  connections: ${connectionNames.join(", ")}`);
    }
    activePhase.hasLoggedStart = true;
  }
  logProgress(activePhase, event, now) {
    const elapsedMs = event.elapsedMs ?? now - activePhase.startedAt;
    const details = [
      event.solverName ? `solver=${event.solverName}` : null,
      event.phase ? `solver_phase=${event.phase}` : null,
      event.iteration !== undefined ? `iter=${event.iteration}` : event.steps !== undefined ? `steps=${event.steps}` : null,
      event.progress !== undefined ? `progress=${Math.round(event.progress * 100)}%` : null,
      event.iterationsPerSecond !== undefined ? `iterations_per_second=${Math.round(event.iterationsPerSecond)}` : null,
      `elapsed=${this.formatElapsed(elapsedMs)}`
    ].filter(Boolean);
    this.log(`  ${this.getPhaseLabel(activePhase)} progress: ${details.join(" ")}`);
  }
  logPhaseEnd(activePhase, {
    outputTraceCount,
    outputJumperCount,
    errorCount,
    elapsedMs
  }) {
    this.log(`  ${this.getPhaseLabel(activePhase)} done: routed_traces=${outputTraceCount}, jumpers=${outputJumperCount}, errors=${errorCount}, elapsed=${this.formatElapsed(elapsedMs)}`);
  }
  matchActivePhase(event) {
    if (!this.activePhase)
      return null;
    const subcircuitId = event.subcircuit_id ?? event.subcircuitId;
    if (subcircuitId && subcircuitId !== this.activePhase.subcircuitId) {
      return null;
    }
    return this.activePhase;
  }
  shouldDumpInput(routingPhaseIndex) {
    return this.options.dumpSrj === "all" || this.options.dumpSrj === `phase:${routingPhaseIndex}`;
  }
  shouldDumpSuccessfulOutput(routingPhaseIndex) {
    return this.options.dumpSrj === "all" || this.options.dumpSrj === `phase:${routingPhaseIndex}`;
  }
  shouldDumpFailedInput(routingPhaseIndex) {
    return this.options.dumpSrj === "all" || this.options.dumpSrj === "failed" || this.options.dumpSrj === `phase:${routingPhaseIndex}`;
  }
  writeJson(fileName, value) {
    const debugDir = path2.resolve(this.options.debugDir ?? DEFAULT_DEBUG_DIR);
    fs2.mkdirSync(debugDir, { recursive: true });
    const filePath = path2.join(debugDir, fileName);
    fs2.writeFileSync(filePath, JSON.stringify(value, null, 2));
    this.logArtifact(filePath);
    return filePath;
  }
  writePngSnapshot(fileName, circuitJson, options) {
    try {
      const pcbSvg = convertCircuitJsonToPcbSvg2(circuitJson, options);
      const png = convertSvgToPngBuffer(pcbSvg);
      const debugDir = path2.resolve(this.options.debugDir ?? DEFAULT_DEBUG_DIR);
      fs2.mkdirSync(debugDir, { recursive: true });
      const filePath = path2.join(debugDir, fileName);
      fs2.writeFileSync(filePath, png);
      this.logArtifact(filePath);
    } catch (error) {
      const serializedError = this.serializeError(error instanceof Error ? error : String(error));
      this.log(kleur_default.yellow(`Could not write autorouter debug image ${fileName}: ${serializedError.message}`));
    }
  }
  logArtifact(filePath) {
    this.log(`Wrote debug artifact: ${path2.relative(process.cwd(), filePath)}`);
  }
  getCircuitJsonWithCompletedPhaseTraces() {
    const circuitJson = [...this.getCurrentCircuitJson()];
    const elementIndexById = new Map;
    for (const [index, element] of circuitJson.entries()) {
      const id = this.getCircuitElementId(element);
      if (id)
        elementIndexById.set(id, index);
    }
    for (const autorouterTrace of this.completedPhaseTraces) {
      const trace = this.normalizeTraceForPcbSnapshot(autorouterTrace);
      if (!trace || typeof trace !== "object")
        continue;
      const id = this.getCircuitElementId(trace);
      const existingIndex = id ? elementIndexById.get(id) : undefined;
      if (existingIndex === undefined) {
        circuitJson.push(trace);
        if (id)
          elementIndexById.set(id, circuitJson.length - 1);
      } else {
        circuitJson[existingIndex] = trace;
      }
    }
    return circuitJson;
  }
  normalizeTraceForPcbSnapshot(trace) {
    return {
      ...trace,
      route: trace.route.map((point) => {
        if (point.route_type !== "through_obstacle")
          return point;
        return {
          route_type: "through_pad",
          start: point.start,
          end: point.end,
          start_layer: point.from_layer,
          end_layer: point.to_layer,
          width: point.width
        };
      })
    };
  }
  getCircuitElementId(element) {
    const idEntry = Object.entries(element).find(([key, value]) => key === `${element.type}_id` && typeof value === "string");
    const id = idEntry?.[1];
    return typeof id === "string" ? id : undefined;
  }
  isRouteElement(element) {
    return element.type === "pcb_trace" || element.type === "pcb_via";
  }
  getPhaseFileName(activePhase, suffix) {
    const phaseNumber = activePhase.routingPhaseIndex;
    return `phase-${phaseNumber}.${suffix}`;
  }
  getPhaseLabel(activePhase) {
    const phaseName = activePhase.phaseName ? ` "${activePhase.phaseName}"` : "";
    const stageLabel = activePhase.phaseStageIndex !== undefined && activePhase.phaseStageCount !== undefined && activePhase.phaseStageCount > 1 ? ` stage ${activePhase.phaseStageIndex + 1}/${activePhase.phaseStageCount}` : "";
    if (activePhase.phaseCount) {
      return `phase ${activePhase.phaseOrdinal}/${activePhase.phaseCount}${phaseName}${stageLabel}`;
    }
    return `phase ${activePhase.phaseOrdinal}${phaseName}${stageLabel}`;
  }
  isFinalTargetPhaseStage(activePhase) {
    if (!this.options.phaseName)
      return false;
    if (activePhase.phaseName !== this.options.phaseName)
      return false;
    if (activePhase.phaseStageIndex === undefined || activePhase.phaseStageCount === undefined) {
      return true;
    }
    return activePhase.phaseStageIndex >= activePhase.phaseStageCount - 1;
  }
  formatElapsed(elapsedMs) {
    if (elapsedMs < 1000)
      return `${Math.round(elapsedMs)}ms`;
    return `${(elapsedMs / 1000).toFixed(1)}s`;
  }
  formatRouter(event) {
    const cacheDescription = event.cacheStatus ? event.cacheStatus === "disabled" && event.cacheDisabledReason ? `cache=disabled(${event.cacheDisabledReason})` : `cache=${event.cacheStatus}` : null;
    const parts = [
      event.autorouterName ? `router=${event.autorouterName}` : null,
      event.autorouterVersion ? `version=${event.autorouterVersion}` : null,
      event.solverName ? `solver=${event.solverName}` : null,
      event.effort !== undefined ? `effort=${event.effort}x` : null,
      cacheDescription,
      event.cacheKey ? `cache_id=${this.formatCacheKeyForLog(event.cacheKey)}` : null
    ].filter(Boolean);
    return parts.join(", ");
  }
  formatCacheKeyForLog(cacheKey) {
    const localPhaseCacheMatch = cacheKey.match(/:solver:([a-f0-9]{16}):srj:([a-f0-9]{16})$/);
    if (localPhaseCacheMatch) {
      return `${localPhaseCacheMatch[1].slice(0, 8)}/${localPhaseCacheMatch[2].slice(0, 8)}`;
    }
    if (cacheKey.length <= 24)
      return cacheKey;
    return `${cacheKey.slice(0, 10)}…${cacheKey.slice(-10)}`;
  }
  getExecutionMetadata(activePhase) {
    return {
      autorouterName: activePhase.autorouterName,
      autorouterVersion: activePhase.autorouterVersion,
      solverName: activePhase.solverName,
      effort: activePhase.effort,
      cacheStatus: activePhase.cacheStatus,
      cacheKey: activePhase.cacheKey,
      cacheDisabledReason: activePhase.cacheDisabledReason
    };
  }
  getConnectionNames(simpleRouteJson) {
    const circuitJsonLookup = this.createCircuitJsonLookup();
    return [
      ...new Set((simpleRouteJson?.connections ?? []).map((connection) => [
        connection.rootConnectionName,
        connection.name,
        connection.source_trace_id
      ].filter((value) => typeof value === "string").map((value) => this.resolveCircuitJsonId(value, circuitJsonLookup)).find((value) => value !== null)).filter((name) => name !== null))
    ];
  }
  resolveCircuitJsonId(value, lookup = this.createCircuitJsonLookup()) {
    const { circuitJson, elementById } = lookup;
    const element = elementById.get(value);
    if (!element)
      return value;
    if (element.type === "source_trace") {
      if (typeof element.name === "string")
        return element.name;
      return this.getTraceSelector(element, circuitJson);
    }
    if (element.type === "source_net" && typeof element.name === "string") {
      return `net.${element.name}`;
    }
    if (element.type === "source_port") {
      return this.getPortSelector(element, circuitJson);
    }
    return null;
  }
  formatUserFacingText(value) {
    const circuitJsonLookup = this.createCircuitJsonLookup();
    let formattedValue = value;
    const idsInMessage = [...circuitJsonLookup.elementById.keys()].filter((id) => formattedValue.includes(id)).sort((a, b) => b.length - a.length);
    for (const id of idsInMessage) {
      formattedValue = formattedValue.replaceAll(id, this.resolveCircuitJsonId(id, circuitJsonLookup) ?? "internal element");
    }
    return formattedValue.replace(CIRCUIT_JSON_ID_PATTERN, "internal element");
  }
  createCircuitJsonLookup() {
    const circuitJson = this.getCurrentCircuitJson();
    const elementById = new Map;
    for (const element of circuitJson) {
      for (const [key, id] of Object.entries(element)) {
        if (!key.endsWith("_id") || typeof id !== "string" || id.length === 0)
          continue;
        if (!elementById.has(id)) {
          elementById.set(id, element);
        }
      }
    }
    return { circuitJson, elementById };
  }
  getTraceSelector(trace, circuitJson) {
    const portIds = trace.connected_source_port_ids;
    if (!Array.isArray(portIds))
      return null;
    const selectors = portIds.map((portId) => typeof portId === "string" ? this.getPortSelectorById(portId, circuitJson) : null).filter((selector) => selector !== null);
    return selectors.length >= 2 ? selectors.join(" to ") : null;
  }
  getPortSelectorById(sourcePortId, circuitJson) {
    const port = circuitJson.find((element) => element.type === "source_port" && element.source_port_id === sourcePortId);
    return port ? this.getPortSelector(port, circuitJson) : null;
  }
  getPortSelector(port, circuitJson) {
    const portName = typeof port.most_frequently_referenced_by_name === "string" ? port.most_frequently_referenced_by_name : typeof port.name === "string" ? port.name : null;
    if (!portName)
      return null;
    const component = circuitJson.find((element) => element.type === "source_component" && element.source_component_id === port.source_component_id);
    const componentName = component && "name" in component && typeof component.name === "string" ? component.name : null;
    return componentName ? `${componentName}.${portName}` : portName;
  }
  countErrors(simpleRouteJson) {
    const errors = simpleRouteJson?.errors;
    return Array.isArray(errors) ? errors.length : 0;
  }
  getCurrentCircuitJson() {
    try {
      const circuitJson = this.rootCircuit?.db?.toArray?.();
      return Array.isArray(circuitJson) ? circuitJson : [];
    } catch {
      return [];
    }
  }
  serializeError(error) {
    if (error instanceof Error) {
      return { message: error.message, stack: error.stack };
    }
    if (typeof error === "string") {
      return { message: error };
    }
    return {
      message: error?.message ?? "Unknown autorouting error",
      stack: error?.stack
    };
  }
  log(message) {
    this.options.log(message);
  }
}

// lib/shared/autorouting-artifacts.ts
import fs3 from "node:fs";
import path3 from "node:path";
import { createHash as createHash2 } from "node:crypto";
function attachAutoroutingArtifacts(root, filePath, projectDir = process.cwd()) {
  const entryPath = path3.relative(projectDir, path3.resolve(projectDir, filePath));
  const entryKey = `${path3.basename(filePath).replace(/[^a-zA-Z0-9_-]/g, "-")}-${createHash2("sha256").update(entryPath).digest("hex").slice(0, 10)}`;
  const directory = path3.resolve(projectDir, ".tscircuit", "autorouting-artifacts", entryKey);
  let warnedUnsupportedVersion = false;
  root.on("autorouting:end", (event) => {
    try {
      if (event.pcbTracePathsUnavailableReason) {
        throw new Error(event.pcbTracePathsUnavailableReason);
      }
      if (event.pcbTracePaths === undefined || event._actualRoutingPhaseOrderIndex === undefined) {
        if (!warnedUnsupportedVersion) {
          console.warn("Autorouting paths were not provided by this router. Use local routing and update your project's tscircuit package to save replayable JSON.");
          warnedUnsupportedVersion = true;
        }
        return;
      }
      if (event.pcbTracePaths.length === 0)
        return;
      const phase = event.routingPhaseIndex ?? "default";
      const order = event._actualRoutingPhaseOrderIndex;
      const safeSubcircuit = event.subcircuit_id.replace(/[^a-zA-Z0-9_-]/g, "-");
      const stage = event.phaseStageIndex === undefined ? "" : `-stage-${event.phaseStageIndex}`;
      const outputPath = path3.join(directory, `${safeSubcircuit}-phase-${phase}-order-${order}${stage}.pcb-trace-paths.json`);
      const contents = `${JSON.stringify(event.pcbTracePaths, null, 2)}
`;
      fs3.mkdirSync(directory, { recursive: true });
      if (!fs3.existsSync(outputPath) || fs3.readFileSync(outputPath, "utf8") !== contents) {
        fs3.writeFileSync(outputPath, contents);
      }
      console.log(`Saved autorouting paths to ${path3.relative(projectDir, outputPath)} (import this JSON into <autoroutingphase pcbTracePaths={...} />).`);
    } catch (error) {
      console.warn(`Could not save autorouting paths for ${event.subcircuit_id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
}

// lib/shared/importFromUserLand.ts
import { createRequire as createRequire3 } from "node:module";
import path6 from "node:path";
import { pathToFileURL as pathToFileURL2 } from "node:url";

// node_modules/import-meta-resolve/lib/resolve.js
import assert2 from "node:assert";
import { statSync, realpathSync } from "node:fs";
import process2 from "node:process";
import { fileURLToPath as fileURLToPath3, pathToFileURL } from "node:url";
import path5 from "node:path";
import { builtinModules } from "node:module";

// node_modules/import-meta-resolve/lib/get-format.js
import { fileURLToPath as fileURLToPath2 } from "node:url";

// node_modules/import-meta-resolve/lib/package-json-reader.js
import fs4 from "node:fs";
import path4 from "node:path";
import { fileURLToPath } from "node:url";

// node_modules/import-meta-resolve/lib/errors.js
import v8 from "node:v8";
import assert from "node:assert";
import { format, inspect } from "node:util";
var own = {}.hasOwnProperty;
var classRegExp = /^([A-Z][a-z\d]*)+$/;
var kTypes = new Set([
  "string",
  "function",
  "number",
  "object",
  "Function",
  "Object",
  "boolean",
  "bigint",
  "symbol"
]);
var codes = {};
function formatList(array, type = "and") {
  return array.length < 3 ? array.join(` ${type} `) : `${array.slice(0, -1).join(", ")}, ${type} ${array[array.length - 1]}`;
}
var messages = new Map;
var nodeInternalPrefix = "__node_internal_";
var userStackTraceLimit;
codes.ERR_INVALID_ARG_TYPE = createError("ERR_INVALID_ARG_TYPE", (name, expected, actual) => {
  assert.ok(typeof name === "string", "'name' must be a string");
  if (!Array.isArray(expected)) {
    expected = [expected];
  }
  let message = "The ";
  if (name.endsWith(" argument")) {
    message += `${name} `;
  } else {
    const type = name.includes(".") ? "property" : "argument";
    message += `"${name}" ${type} `;
  }
  message += "must be ";
  const types2 = [];
  const instances = [];
  const other = [];
  for (const value of expected) {
    assert.ok(typeof value === "string", "All expected entries have to be of type string");
    if (kTypes.has(value)) {
      types2.push(value.toLowerCase());
    } else if (classRegExp.exec(value) === null) {
      assert.ok(value !== "object", 'The value "object" should be written as "Object"');
      other.push(value);
    } else {
      instances.push(value);
    }
  }
  if (instances.length > 0) {
    const pos = types2.indexOf("object");
    if (pos !== -1) {
      types2.slice(pos, 1);
      instances.push("Object");
    }
  }
  if (types2.length > 0) {
    message += `${types2.length > 1 ? "one of type" : "of type"} ${formatList(types2, "or")}`;
    if (instances.length > 0 || other.length > 0)
      message += " or ";
  }
  if (instances.length > 0) {
    message += `an instance of ${formatList(instances, "or")}`;
    if (other.length > 0)
      message += " or ";
  }
  if (other.length > 0) {
    if (other.length > 1) {
      message += `one of ${formatList(other, "or")}`;
    } else {
      if (other[0].toLowerCase() !== other[0])
        message += "an ";
      message += `${other[0]}`;
    }
  }
  message += `. Received ${determineSpecificType(actual)}`;
  return message;
}, TypeError);
codes.ERR_INVALID_MODULE_SPECIFIER = createError("ERR_INVALID_MODULE_SPECIFIER", (request, reason, base = undefined) => {
  return `Invalid module "${request}" ${reason}${base ? ` imported from ${base}` : ""}`;
}, TypeError);
codes.ERR_INVALID_PACKAGE_CONFIG = createError("ERR_INVALID_PACKAGE_CONFIG", (path4, base, message) => {
  return `Invalid package config ${path4}${base ? ` while importing ${base}` : ""}${message ? `. ${message}` : ""}`;
}, Error);
codes.ERR_INVALID_PACKAGE_TARGET = createError("ERR_INVALID_PACKAGE_TARGET", (packagePath, key, target, isImport = false, base = undefined) => {
  const relatedError = typeof target === "string" && !isImport && target.length > 0 && !target.startsWith("./");
  if (key === ".") {
    assert.ok(isImport === false);
    return `Invalid "exports" main target ${JSON.stringify(target)} defined ` + `in the package config ${packagePath}package.json${base ? ` imported from ${base}` : ""}${relatedError ? '; targets must start with "./"' : ""}`;
  }
  return `Invalid "${isImport ? "imports" : "exports"}" target ${JSON.stringify(target)} defined for '${key}' in the package config ${packagePath}package.json${base ? ` imported from ${base}` : ""}${relatedError ? '; targets must start with "./"' : ""}`;
}, Error);
codes.ERR_MODULE_NOT_FOUND = createError("ERR_MODULE_NOT_FOUND", (path4, base, exactUrl = false) => {
  return `Cannot find ${exactUrl ? "module" : "package"} '${path4}' imported from ${base}`;
}, Error);
codes.ERR_NETWORK_IMPORT_DISALLOWED = createError("ERR_NETWORK_IMPORT_DISALLOWED", "import of '%s' by %s is not supported: %s", Error);
codes.ERR_PACKAGE_IMPORT_NOT_DEFINED = createError("ERR_PACKAGE_IMPORT_NOT_DEFINED", (specifier, packagePath, base) => {
  return `Package import specifier "${specifier}" is not defined${packagePath ? ` in package ${packagePath}package.json` : ""} imported from ${base}`;
}, TypeError);
codes.ERR_PACKAGE_PATH_NOT_EXPORTED = createError("ERR_PACKAGE_PATH_NOT_EXPORTED", (packagePath, subpath, base = undefined) => {
  if (subpath === ".")
    return `No "exports" main defined in ${packagePath}package.json${base ? ` imported from ${base}` : ""}`;
  return `Package subpath '${subpath}' is not defined by "exports" in ${packagePath}package.json${base ? ` imported from ${base}` : ""}`;
}, Error);
codes.ERR_UNSUPPORTED_DIR_IMPORT = createError("ERR_UNSUPPORTED_DIR_IMPORT", "Directory import '%s' is not supported " + "resolving ES modules imported from %s", Error);
codes.ERR_UNSUPPORTED_RESOLVE_REQUEST = createError("ERR_UNSUPPORTED_RESOLVE_REQUEST", 'Failed to resolve module specifier "%s" from "%s": Invalid relative URL or base scheme is not hierarchical.', TypeError);
codes.ERR_UNKNOWN_FILE_EXTENSION = createError("ERR_UNKNOWN_FILE_EXTENSION", (extension, path4) => {
  return `Unknown file extension "${extension}" for ${path4}`;
}, TypeError);
codes.ERR_INVALID_ARG_VALUE = createError("ERR_INVALID_ARG_VALUE", (name, value, reason = "is invalid") => {
  let inspected = inspect(value);
  if (inspected.length > 128) {
    inspected = `${inspected.slice(0, 128)}...`;
  }
  const type = name.includes(".") ? "property" : "argument";
  return `The ${type} '${name}' ${reason}. Received ${inspected}`;
}, TypeError);
function createError(sym, value, constructor) {
  messages.set(sym, value);
  return makeNodeErrorWithCode(constructor, sym);
}
function makeNodeErrorWithCode(Base, key) {
  return NodeError;
  function NodeError(...parameters) {
    const limit = Error.stackTraceLimit;
    if (isErrorStackTraceLimitWritable())
      Error.stackTraceLimit = 0;
    const error = new Base;
    if (isErrorStackTraceLimitWritable())
      Error.stackTraceLimit = limit;
    const message = getMessage(key, parameters, error);
    Object.defineProperties(error, {
      message: {
        value: message,
        enumerable: false,
        writable: true,
        configurable: true
      },
      toString: {
        value() {
          return `${this.name} [${key}]: ${this.message}`;
        },
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    captureLargerStackTrace(error);
    error.code = key;
    return error;
  }
}
function isErrorStackTraceLimitWritable() {
  try {
    if (v8.startupSnapshot.isBuildingSnapshot()) {
      return false;
    }
  } catch {}
  const desc = Object.getOwnPropertyDescriptor(Error, "stackTraceLimit");
  if (desc === undefined) {
    return Object.isExtensible(Error);
  }
  return own.call(desc, "writable") && desc.writable !== undefined ? desc.writable : desc.set !== undefined;
}
function hideStackFrames(wrappedFunction) {
  const hidden = nodeInternalPrefix + wrappedFunction.name;
  Object.defineProperty(wrappedFunction, "name", { value: hidden });
  return wrappedFunction;
}
var captureLargerStackTrace = hideStackFrames(function(error) {
  const stackTraceLimitIsWritable = isErrorStackTraceLimitWritable();
  if (stackTraceLimitIsWritable) {
    userStackTraceLimit = Error.stackTraceLimit;
    Error.stackTraceLimit = Number.POSITIVE_INFINITY;
  }
  Error.captureStackTrace(error);
  if (stackTraceLimitIsWritable)
    Error.stackTraceLimit = userStackTraceLimit;
  return error;
});
function getMessage(key, parameters, self) {
  const message = messages.get(key);
  assert.ok(message !== undefined, "expected `message` to be found");
  if (typeof message === "function") {
    assert.ok(message.length <= parameters.length, `Code: ${key}; The provided arguments length (${parameters.length}) does not ` + `match the required ones (${message.length}).`);
    return Reflect.apply(message, self, parameters);
  }
  const regex = /%[dfijoOs]/g;
  let expectedLength = 0;
  while (regex.exec(message) !== null)
    expectedLength++;
  assert.ok(expectedLength === parameters.length, `Code: ${key}; The provided arguments length (${parameters.length}) does not ` + `match the required ones (${expectedLength}).`);
  if (parameters.length === 0)
    return message;
  parameters.unshift(message);
  return Reflect.apply(format, null, parameters);
}
function determineSpecificType(value) {
  if (value === null || value === undefined) {
    return String(value);
  }
  if (typeof value === "function" && value.name) {
    return `function ${value.name}`;
  }
  if (typeof value === "object") {
    if (value.constructor && value.constructor.name) {
      return `an instance of ${value.constructor.name}`;
    }
    return `${inspect(value, { depth: -1 })}`;
  }
  let inspected = inspect(value, { colors: false });
  if (inspected.length > 28) {
    inspected = `${inspected.slice(0, 25)}...`;
  }
  return `type ${typeof value} (${inspected})`;
}

// node_modules/import-meta-resolve/lib/package-json-reader.js
var hasOwnProperty = {}.hasOwnProperty;
var { ERR_INVALID_PACKAGE_CONFIG } = codes;
var cache = new Map;
function read(jsonPath, { base, specifier }) {
  const existing = cache.get(jsonPath);
  if (existing) {
    return existing;
  }
  let string;
  try {
    string = fs4.readFileSync(path4.toNamespacedPath(jsonPath), "utf8");
  } catch (error) {
    const exception = error;
    if (exception.code !== "ENOENT") {
      throw exception;
    }
  }
  const result = {
    exists: false,
    pjsonPath: jsonPath,
    main: undefined,
    name: undefined,
    type: "none",
    exports: undefined,
    imports: undefined
  };
  if (string !== undefined) {
    let parsed;
    try {
      parsed = JSON.parse(string);
    } catch (error_) {
      const cause = error_;
      const error = new ERR_INVALID_PACKAGE_CONFIG(jsonPath, (base ? `"${specifier}" from ` : "") + fileURLToPath(base || specifier), cause.message);
      error.cause = cause;
      throw error;
    }
    result.exists = true;
    if (hasOwnProperty.call(parsed, "name") && typeof parsed.name === "string") {
      result.name = parsed.name;
    }
    if (hasOwnProperty.call(parsed, "main") && typeof parsed.main === "string") {
      result.main = parsed.main;
    }
    if (hasOwnProperty.call(parsed, "exports")) {
      result.exports = parsed.exports;
    }
    if (hasOwnProperty.call(parsed, "imports")) {
      result.imports = parsed.imports;
    }
    if (hasOwnProperty.call(parsed, "type") && (parsed.type === "commonjs" || parsed.type === "module")) {
      result.type = parsed.type;
    }
  }
  cache.set(jsonPath, result);
  return result;
}
function getPackageScopeConfig(resolved) {
  let packageJSONUrl = new URL("package.json", resolved);
  while (true) {
    const packageJSONPath2 = packageJSONUrl.pathname;
    if (packageJSONPath2.endsWith("node_modules/package.json")) {
      break;
    }
    const packageConfig = read(fileURLToPath(packageJSONUrl), {
      specifier: resolved
    });
    if (packageConfig.exists) {
      return packageConfig;
    }
    const lastPackageJSONUrl = packageJSONUrl;
    packageJSONUrl = new URL("../package.json", packageJSONUrl);
    if (packageJSONUrl.pathname === lastPackageJSONUrl.pathname) {
      break;
    }
  }
  const packageJSONPath = fileURLToPath(packageJSONUrl);
  return {
    pjsonPath: packageJSONPath,
    exists: false,
    type: "none"
  };
}
function getPackageType(url) {
  return getPackageScopeConfig(url).type;
}

// node_modules/import-meta-resolve/lib/get-format.js
var { ERR_UNKNOWN_FILE_EXTENSION } = codes;
var hasOwnProperty2 = {}.hasOwnProperty;
var extensionFormatMap = {
  __proto__: null,
  ".cjs": "commonjs",
  ".js": "module",
  ".json": "json",
  ".mjs": "module"
};
function mimeToFormat(mime) {
  if (mime && /\s*(text|application)\/javascript\s*(;\s*charset=utf-?8\s*)?/i.test(mime))
    return "module";
  if (mime === "application/json")
    return "json";
  return null;
}
var protocolHandlers = {
  __proto__: null,
  "data:": getDataProtocolModuleFormat,
  "file:": getFileProtocolModuleFormat,
  "http:": getHttpProtocolModuleFormat,
  "https:": getHttpProtocolModuleFormat,
  "node:"() {
    return "builtin";
  }
};
function getDataProtocolModuleFormat(parsed) {
  const { 1: mime } = /^([^/]+\/[^;,]+)[^,]*?(;base64)?,/.exec(parsed.pathname) || [null, null, null];
  return mimeToFormat(mime);
}
function extname(url) {
  const pathname = url.pathname;
  let index = pathname.length;
  while (index--) {
    const code = pathname.codePointAt(index);
    if (code === 47) {
      return "";
    }
    if (code === 46) {
      return pathname.codePointAt(index - 1) === 47 ? "" : pathname.slice(index);
    }
  }
  return "";
}
function getFileProtocolModuleFormat(url, _context, ignoreErrors) {
  const value = extname(url);
  if (value === ".js") {
    const packageType = getPackageType(url);
    if (packageType !== "none") {
      return packageType;
    }
    return "commonjs";
  }
  if (value === "") {
    const packageType = getPackageType(url);
    if (packageType === "none" || packageType === "commonjs") {
      return "commonjs";
    }
    return "module";
  }
  const format2 = extensionFormatMap[value];
  if (format2)
    return format2;
  if (ignoreErrors) {
    return;
  }
  const filepath = fileURLToPath2(url);
  throw new ERR_UNKNOWN_FILE_EXTENSION(value, filepath);
}
function getHttpProtocolModuleFormat() {}
function defaultGetFormatWithoutErrors(url, context) {
  const protocol = url.protocol;
  if (!hasOwnProperty2.call(protocolHandlers, protocol)) {
    return null;
  }
  return protocolHandlers[protocol](url, context, true) || null;
}

// node_modules/import-meta-resolve/lib/utils.js
var { ERR_INVALID_ARG_VALUE } = codes;
var DEFAULT_CONDITIONS = Object.freeze(["node", "import"]);
var DEFAULT_CONDITIONS_SET = new Set(DEFAULT_CONDITIONS);
function getDefaultConditions() {
  return DEFAULT_CONDITIONS;
}
function getDefaultConditionsSet() {
  return DEFAULT_CONDITIONS_SET;
}
function getConditionsSet(conditions) {
  if (conditions !== undefined && conditions !== getDefaultConditions()) {
    if (!Array.isArray(conditions)) {
      throw new ERR_INVALID_ARG_VALUE("conditions", conditions, "expected an array");
    }
    return new Set(conditions);
  }
  return getDefaultConditionsSet();
}

// node_modules/import-meta-resolve/lib/resolve.js
var RegExpPrototypeSymbolReplace = RegExp.prototype[Symbol.replace];
var {
  ERR_NETWORK_IMPORT_DISALLOWED,
  ERR_INVALID_MODULE_SPECIFIER,
  ERR_INVALID_PACKAGE_CONFIG: ERR_INVALID_PACKAGE_CONFIG2,
  ERR_INVALID_PACKAGE_TARGET,
  ERR_MODULE_NOT_FOUND,
  ERR_PACKAGE_IMPORT_NOT_DEFINED,
  ERR_PACKAGE_PATH_NOT_EXPORTED,
  ERR_UNSUPPORTED_DIR_IMPORT,
  ERR_UNSUPPORTED_RESOLVE_REQUEST
} = codes;
var own2 = {}.hasOwnProperty;
var invalidSegmentRegEx = /(^|\\|\/)((\.|%2e)(\.|%2e)?|(n|%6e|%4e)(o|%6f|%4f)(d|%64|%44)(e|%65|%45)(_|%5f)(m|%6d|%4d)(o|%6f|%4f)(d|%64|%44)(u|%75|%55)(l|%6c|%4c)(e|%65|%45)(s|%73|%53))?(\\|\/|$)/i;
var deprecatedInvalidSegmentRegEx = /(^|\\|\/)((\.|%2e)(\.|%2e)?|(n|%6e|%4e)(o|%6f|%4f)(d|%64|%44)(e|%65|%45)(_|%5f)(m|%6d|%4d)(o|%6f|%4f)(d|%64|%44)(u|%75|%55)(l|%6c|%4c)(e|%65|%45)(s|%73|%53))(\\|\/|$)/i;
var invalidPackageNameRegEx = /^\.|%|\\/;
var patternRegEx = /\*/g;
var encodedSeparatorRegEx = /%2f|%5c/i;
var emittedPackageWarnings = new Set;
var doubleSlashRegEx = /[/\\]{2}/;
function emitInvalidSegmentDeprecation(target, request, match, packageJsonUrl, internal, base, isTarget) {
  if (process2.noDeprecation) {
    return;
  }
  const pjsonPath = fileURLToPath3(packageJsonUrl);
  const double = doubleSlashRegEx.exec(isTarget ? target : request) !== null;
  process2.emitWarning(`Use of deprecated ${double ? "double slash" : "leading or trailing slash matching"} resolving "${target}" for module ` + `request "${request}" ${request === match ? "" : `matched to "${match}" `}in the "${internal ? "imports" : "exports"}" field module resolution of the package at ${pjsonPath}${base ? ` imported from ${fileURLToPath3(base)}` : ""}.`, "DeprecationWarning", "DEP0166");
}
function emitLegacyIndexDeprecation(url, packageJsonUrl, base, main) {
  if (process2.noDeprecation) {
    return;
  }
  const format2 = defaultGetFormatWithoutErrors(url, { parentURL: base.href });
  if (format2 !== "module")
    return;
  const urlPath = fileURLToPath3(url.href);
  const packagePath = fileURLToPath3(new URL(".", packageJsonUrl));
  const basePath = fileURLToPath3(base);
  if (!main) {
    process2.emitWarning(`No "main" or "exports" field defined in the package.json for ${packagePath} resolving the main entry point "${urlPath.slice(packagePath.length)}", imported from ${basePath}.
Default "index" lookups for the main are deprecated for ES modules.`, "DeprecationWarning", "DEP0151");
  } else if (path5.resolve(packagePath, main) !== urlPath) {
    process2.emitWarning(`Package ${packagePath} has a "main" field set to "${main}", ` + `excluding the full filename and extension to the resolved file at "${urlPath.slice(packagePath.length)}", imported from ${basePath}.
 Automatic extension resolution of the "main" field is ` + "deprecated for ES modules.", "DeprecationWarning", "DEP0151");
  }
}
function tryStatSync(path6) {
  try {
    return statSync(path6);
  } catch {}
}
function fileExists(url) {
  const stats = statSync(url, { throwIfNoEntry: false });
  const isFile = stats ? stats.isFile() : undefined;
  return isFile === null || isFile === undefined ? false : isFile;
}
function legacyMainResolve(packageJsonUrl, packageConfig, base) {
  let guess;
  if (packageConfig.main !== undefined) {
    guess = new URL(packageConfig.main, packageJsonUrl);
    if (fileExists(guess))
      return guess;
    const tries2 = [
      `./${packageConfig.main}.js`,
      `./${packageConfig.main}.json`,
      `./${packageConfig.main}.node`,
      `./${packageConfig.main}/index.js`,
      `./${packageConfig.main}/index.json`,
      `./${packageConfig.main}/index.node`
    ];
    let i3 = -1;
    while (++i3 < tries2.length) {
      guess = new URL(tries2[i3], packageJsonUrl);
      if (fileExists(guess))
        break;
      guess = undefined;
    }
    if (guess) {
      emitLegacyIndexDeprecation(guess, packageJsonUrl, base, packageConfig.main);
      return guess;
    }
  }
  const tries = ["./index.js", "./index.json", "./index.node"];
  let i2 = -1;
  while (++i2 < tries.length) {
    guess = new URL(tries[i2], packageJsonUrl);
    if (fileExists(guess))
      break;
    guess = undefined;
  }
  if (guess) {
    emitLegacyIndexDeprecation(guess, packageJsonUrl, base, packageConfig.main);
    return guess;
  }
  throw new ERR_MODULE_NOT_FOUND(fileURLToPath3(new URL(".", packageJsonUrl)), fileURLToPath3(base));
}
function finalizeResolution(resolved, base, preserveSymlinks) {
  if (encodedSeparatorRegEx.exec(resolved.pathname) !== null) {
    throw new ERR_INVALID_MODULE_SPECIFIER(resolved.pathname, 'must not include encoded "/" or "\\" characters', fileURLToPath3(base));
  }
  let filePath;
  try {
    filePath = fileURLToPath3(resolved);
  } catch (error) {
    const cause = error;
    Object.defineProperty(cause, "input", { value: String(resolved) });
    Object.defineProperty(cause, "module", { value: String(base) });
    throw cause;
  }
  const stats = tryStatSync(filePath.endsWith("/") ? filePath.slice(-1) : filePath);
  if (stats && stats.isDirectory()) {
    const error = new ERR_UNSUPPORTED_DIR_IMPORT(filePath, fileURLToPath3(base));
    error.url = String(resolved);
    throw error;
  }
  if (!stats || !stats.isFile()) {
    const error = new ERR_MODULE_NOT_FOUND(filePath || resolved.pathname, base && fileURLToPath3(base), true);
    error.url = String(resolved);
    throw error;
  }
  if (!preserveSymlinks) {
    const real = realpathSync(filePath);
    const { search, hash } = resolved;
    resolved = pathToFileURL(real + (filePath.endsWith(path5.sep) ? "/" : ""));
    resolved.search = search;
    resolved.hash = hash;
  }
  return resolved;
}
function importNotDefined(specifier, packageJsonUrl, base) {
  return new ERR_PACKAGE_IMPORT_NOT_DEFINED(specifier, packageJsonUrl && fileURLToPath3(new URL(".", packageJsonUrl)), fileURLToPath3(base));
}
function exportsNotFound(subpath, packageJsonUrl, base) {
  return new ERR_PACKAGE_PATH_NOT_EXPORTED(fileURLToPath3(new URL(".", packageJsonUrl)), subpath, base && fileURLToPath3(base));
}
function throwInvalidSubpath(request, match, packageJsonUrl, internal, base) {
  const reason = `request is not a valid match in pattern "${match}" for the "${internal ? "imports" : "exports"}" resolution of ${fileURLToPath3(packageJsonUrl)}`;
  throw new ERR_INVALID_MODULE_SPECIFIER(request, reason, base && fileURLToPath3(base));
}
function invalidPackageTarget(subpath, target, packageJsonUrl, internal, base) {
  target = typeof target === "object" && target !== null ? JSON.stringify(target, null, "") : `${target}`;
  return new ERR_INVALID_PACKAGE_TARGET(fileURLToPath3(new URL(".", packageJsonUrl)), subpath, target, internal, base && fileURLToPath3(base));
}
function resolvePackageTargetString(target, subpath, match, packageJsonUrl, base, pattern, internal, isPathMap, conditions) {
  if (subpath !== "" && !pattern && target[target.length - 1] !== "/")
    throw invalidPackageTarget(match, target, packageJsonUrl, internal, base);
  if (!target.startsWith("./")) {
    if (internal && !target.startsWith("../") && !target.startsWith("/")) {
      let isURL = false;
      try {
        new URL(target);
        isURL = true;
      } catch {}
      if (!isURL) {
        const exportTarget = pattern ? RegExpPrototypeSymbolReplace.call(patternRegEx, target, () => subpath) : target + subpath;
        return packageResolve(exportTarget, packageJsonUrl, conditions);
      }
    }
    throw invalidPackageTarget(match, target, packageJsonUrl, internal, base);
  }
  if (invalidSegmentRegEx.exec(target.slice(2)) !== null) {
    if (deprecatedInvalidSegmentRegEx.exec(target.slice(2)) === null) {
      if (!isPathMap) {
        const request = pattern ? match.replace("*", () => subpath) : match + subpath;
        const resolvedTarget = pattern ? RegExpPrototypeSymbolReplace.call(patternRegEx, target, () => subpath) : target;
        emitInvalidSegmentDeprecation(resolvedTarget, request, match, packageJsonUrl, internal, base, true);
      }
    } else {
      throw invalidPackageTarget(match, target, packageJsonUrl, internal, base);
    }
  }
  const resolved = new URL(target, packageJsonUrl);
  const resolvedPath = resolved.pathname;
  const packagePath = new URL(".", packageJsonUrl).pathname;
  if (!resolvedPath.startsWith(packagePath))
    throw invalidPackageTarget(match, target, packageJsonUrl, internal, base);
  if (subpath === "")
    return resolved;
  if (invalidSegmentRegEx.exec(subpath) !== null) {
    const request = pattern ? match.replace("*", () => subpath) : match + subpath;
    if (deprecatedInvalidSegmentRegEx.exec(subpath) === null) {
      if (!isPathMap) {
        const resolvedTarget = pattern ? RegExpPrototypeSymbolReplace.call(patternRegEx, target, () => subpath) : target;
        emitInvalidSegmentDeprecation(resolvedTarget, request, match, packageJsonUrl, internal, base, false);
      }
    } else {
      throwInvalidSubpath(request, match, packageJsonUrl, internal, base);
    }
  }
  if (pattern) {
    return new URL(RegExpPrototypeSymbolReplace.call(patternRegEx, resolved.href, () => subpath));
  }
  return new URL(subpath, resolved);
}
function isArrayIndex(key) {
  const keyNumber = Number(key);
  if (`${keyNumber}` !== key)
    return false;
  return keyNumber >= 0 && keyNumber < 4294967295;
}
function resolvePackageTarget(packageJsonUrl, target, subpath, packageSubpath, base, pattern, internal, isPathMap, conditions) {
  if (typeof target === "string") {
    return resolvePackageTargetString(target, subpath, packageSubpath, packageJsonUrl, base, pattern, internal, isPathMap, conditions);
  }
  if (Array.isArray(target)) {
    const targetList = target;
    if (targetList.length === 0)
      return null;
    let lastException;
    let i2 = -1;
    while (++i2 < targetList.length) {
      const targetItem = targetList[i2];
      let resolveResult;
      try {
        resolveResult = resolvePackageTarget(packageJsonUrl, targetItem, subpath, packageSubpath, base, pattern, internal, isPathMap, conditions);
      } catch (error) {
        const exception = error;
        lastException = exception;
        if (exception.code === "ERR_INVALID_PACKAGE_TARGET")
          continue;
        throw error;
      }
      if (resolveResult === undefined)
        continue;
      if (resolveResult === null) {
        lastException = null;
        continue;
      }
      return resolveResult;
    }
    if (lastException === undefined || lastException === null) {
      return null;
    }
    throw lastException;
  }
  if (typeof target === "object" && target !== null) {
    const keys = Object.getOwnPropertyNames(target);
    let i2 = -1;
    while (++i2 < keys.length) {
      const key = keys[i2];
      if (isArrayIndex(key)) {
        throw new ERR_INVALID_PACKAGE_CONFIG2(fileURLToPath3(packageJsonUrl), base, '"exports" cannot contain numeric property keys.');
      }
    }
    i2 = -1;
    while (++i2 < keys.length) {
      const key = keys[i2];
      if (key === "default" || conditions && conditions.has(key)) {
        const conditionalTarget = target[key];
        const resolveResult = resolvePackageTarget(packageJsonUrl, conditionalTarget, subpath, packageSubpath, base, pattern, internal, isPathMap, conditions);
        if (resolveResult === undefined)
          continue;
        return resolveResult;
      }
    }
    return null;
  }
  if (target === null) {
    return null;
  }
  throw invalidPackageTarget(packageSubpath, target, packageJsonUrl, internal, base);
}
function isConditionalExportsMainSugar(exports, packageJsonUrl, base) {
  if (typeof exports === "string" || Array.isArray(exports))
    return true;
  if (typeof exports !== "object" || exports === null)
    return false;
  const keys = Object.getOwnPropertyNames(exports);
  let isConditionalSugar = false;
  let i2 = 0;
  let keyIndex = -1;
  while (++keyIndex < keys.length) {
    const key = keys[keyIndex];
    const currentIsConditionalSugar = key === "" || key[0] !== ".";
    if (i2++ === 0) {
      isConditionalSugar = currentIsConditionalSugar;
    } else if (isConditionalSugar !== currentIsConditionalSugar) {
      throw new ERR_INVALID_PACKAGE_CONFIG2(fileURLToPath3(packageJsonUrl), base, `"exports" cannot contain some keys starting with '.' and some not.` + " The exports object must either be an object of package subpath keys" + " or an object of main entry condition name keys only.");
    }
  }
  return isConditionalSugar;
}
function emitTrailingSlashPatternDeprecation(match, pjsonUrl, base) {
  if (process2.noDeprecation) {
    return;
  }
  const pjsonPath = fileURLToPath3(pjsonUrl);
  if (emittedPackageWarnings.has(pjsonPath + "|" + match))
    return;
  emittedPackageWarnings.add(pjsonPath + "|" + match);
  process2.emitWarning(`Use of deprecated trailing slash pattern mapping "${match}" in the ` + `"exports" field module resolution of the package at ${pjsonPath}${base ? ` imported from ${fileURLToPath3(base)}` : ""}. Mapping specifiers ending in "/" is no longer supported.`, "DeprecationWarning", "DEP0155");
}
function packageExportsResolve(packageJsonUrl, packageSubpath, packageConfig, base, conditions) {
  let exports = packageConfig.exports;
  if (isConditionalExportsMainSugar(exports, packageJsonUrl, base)) {
    exports = { ".": exports };
  }
  if (own2.call(exports, packageSubpath) && !packageSubpath.includes("*") && !packageSubpath.endsWith("/")) {
    const target = exports[packageSubpath];
    const resolveResult = resolvePackageTarget(packageJsonUrl, target, "", packageSubpath, base, false, false, false, conditions);
    if (resolveResult === null || resolveResult === undefined) {
      throw exportsNotFound(packageSubpath, packageJsonUrl, base);
    }
    return resolveResult;
  }
  let bestMatch = "";
  let bestMatchSubpath = "";
  const keys = Object.getOwnPropertyNames(exports);
  let i2 = -1;
  while (++i2 < keys.length) {
    const key = keys[i2];
    const patternIndex = key.indexOf("*");
    if (patternIndex !== -1 && packageSubpath.startsWith(key.slice(0, patternIndex))) {
      if (packageSubpath.endsWith("/")) {
        emitTrailingSlashPatternDeprecation(packageSubpath, packageJsonUrl, base);
      }
      const patternTrailer = key.slice(patternIndex + 1);
      if (packageSubpath.length >= key.length && packageSubpath.endsWith(patternTrailer) && patternKeyCompare(bestMatch, key) === 1 && key.lastIndexOf("*") === patternIndex) {
        bestMatch = key;
        bestMatchSubpath = packageSubpath.slice(patternIndex, packageSubpath.length - patternTrailer.length);
      }
    }
  }
  if (bestMatch) {
    const target = exports[bestMatch];
    const resolveResult = resolvePackageTarget(packageJsonUrl, target, bestMatchSubpath, bestMatch, base, true, false, packageSubpath.endsWith("/"), conditions);
    if (resolveResult === null || resolveResult === undefined) {
      throw exportsNotFound(packageSubpath, packageJsonUrl, base);
    }
    return resolveResult;
  }
  throw exportsNotFound(packageSubpath, packageJsonUrl, base);
}
function patternKeyCompare(a, b) {
  const aPatternIndex = a.indexOf("*");
  const bPatternIndex = b.indexOf("*");
  const baseLengthA = aPatternIndex === -1 ? a.length : aPatternIndex + 1;
  const baseLengthB = bPatternIndex === -1 ? b.length : bPatternIndex + 1;
  if (baseLengthA > baseLengthB)
    return -1;
  if (baseLengthB > baseLengthA)
    return 1;
  if (aPatternIndex === -1)
    return 1;
  if (bPatternIndex === -1)
    return -1;
  if (a.length > b.length)
    return -1;
  if (b.length > a.length)
    return 1;
  return 0;
}
function packageImportsResolve(name, base, conditions) {
  if (name === "#" || name.startsWith("#/") || name.endsWith("/")) {
    const reason = "is not a valid internal imports specifier name";
    throw new ERR_INVALID_MODULE_SPECIFIER(name, reason, fileURLToPath3(base));
  }
  let packageJsonUrl;
  const packageConfig = getPackageScopeConfig(base);
  if (packageConfig.exists) {
    packageJsonUrl = pathToFileURL(packageConfig.pjsonPath);
    const imports = packageConfig.imports;
    if (imports) {
      if (own2.call(imports, name) && !name.includes("*")) {
        const resolveResult = resolvePackageTarget(packageJsonUrl, imports[name], "", name, base, false, true, false, conditions);
        if (resolveResult !== null && resolveResult !== undefined) {
          return resolveResult;
        }
      } else {
        let bestMatch = "";
        let bestMatchSubpath = "";
        const keys = Object.getOwnPropertyNames(imports);
        let i2 = -1;
        while (++i2 < keys.length) {
          const key = keys[i2];
          const patternIndex = key.indexOf("*");
          if (patternIndex !== -1 && name.startsWith(key.slice(0, -1))) {
            const patternTrailer = key.slice(patternIndex + 1);
            if (name.length >= key.length && name.endsWith(patternTrailer) && patternKeyCompare(bestMatch, key) === 1 && key.lastIndexOf("*") === patternIndex) {
              bestMatch = key;
              bestMatchSubpath = name.slice(patternIndex, name.length - patternTrailer.length);
            }
          }
        }
        if (bestMatch) {
          const target = imports[bestMatch];
          const resolveResult = resolvePackageTarget(packageJsonUrl, target, bestMatchSubpath, bestMatch, base, true, true, false, conditions);
          if (resolveResult !== null && resolveResult !== undefined) {
            return resolveResult;
          }
        }
      }
    }
  }
  throw importNotDefined(name, packageJsonUrl, base);
}
function parsePackageName(specifier, base) {
  let separatorIndex = specifier.indexOf("/");
  let validPackageName = true;
  let isScoped = false;
  if (specifier[0] === "@") {
    isScoped = true;
    if (separatorIndex === -1 || specifier.length === 0) {
      validPackageName = false;
    } else {
      separatorIndex = specifier.indexOf("/", separatorIndex + 1);
    }
  }
  const packageName = separatorIndex === -1 ? specifier : specifier.slice(0, separatorIndex);
  if (invalidPackageNameRegEx.exec(packageName) !== null) {
    validPackageName = false;
  }
  if (!validPackageName) {
    throw new ERR_INVALID_MODULE_SPECIFIER(specifier, "is not a valid package name", fileURLToPath3(base));
  }
  const packageSubpath = "." + (separatorIndex === -1 ? "" : specifier.slice(separatorIndex));
  return { packageName, packageSubpath, isScoped };
}
function packageResolve(specifier, base, conditions) {
  if (builtinModules.includes(specifier)) {
    return new URL("node:" + specifier);
  }
  const { packageName, packageSubpath, isScoped } = parsePackageName(specifier, base);
  const packageConfig = getPackageScopeConfig(base);
  if (packageConfig.exists) {
    const packageJsonUrl2 = pathToFileURL(packageConfig.pjsonPath);
    if (packageConfig.name === packageName && packageConfig.exports !== undefined && packageConfig.exports !== null) {
      return packageExportsResolve(packageJsonUrl2, packageSubpath, packageConfig, base, conditions);
    }
  }
  let packageJsonUrl = new URL("./node_modules/" + packageName + "/package.json", base);
  let packageJsonPath = fileURLToPath3(packageJsonUrl);
  let lastPath;
  do {
    const stat = tryStatSync(packageJsonPath.slice(0, -13));
    if (!stat || !stat.isDirectory()) {
      lastPath = packageJsonPath;
      packageJsonUrl = new URL((isScoped ? "../../../../node_modules/" : "../../../node_modules/") + packageName + "/package.json", packageJsonUrl);
      packageJsonPath = fileURLToPath3(packageJsonUrl);
      continue;
    }
    const packageConfig2 = read(packageJsonPath, { base, specifier });
    if (packageConfig2.exports !== undefined && packageConfig2.exports !== null) {
      return packageExportsResolve(packageJsonUrl, packageSubpath, packageConfig2, base, conditions);
    }
    if (packageSubpath === ".") {
      return legacyMainResolve(packageJsonUrl, packageConfig2, base);
    }
    return new URL(packageSubpath, packageJsonUrl);
  } while (packageJsonPath.length !== lastPath.length);
  throw new ERR_MODULE_NOT_FOUND(packageName, fileURLToPath3(base), false);
}
function isRelativeSpecifier(specifier) {
  if (specifier[0] === ".") {
    if (specifier.length === 1 || specifier[1] === "/")
      return true;
    if (specifier[1] === "." && (specifier.length === 2 || specifier[2] === "/")) {
      return true;
    }
  }
  return false;
}
function shouldBeTreatedAsRelativeOrAbsolutePath(specifier) {
  if (specifier === "")
    return false;
  if (specifier[0] === "/")
    return true;
  return isRelativeSpecifier(specifier);
}
function moduleResolve(specifier, base, conditions, preserveSymlinks) {
  if (conditions === undefined) {
    conditions = getConditionsSet();
  }
  const protocol = base.protocol;
  const isData = protocol === "data:";
  const isRemote = isData || protocol === "http:" || protocol === "https:";
  let resolved;
  if (shouldBeTreatedAsRelativeOrAbsolutePath(specifier)) {
    try {
      resolved = new URL(specifier, base);
    } catch (error_) {
      const error = new ERR_UNSUPPORTED_RESOLVE_REQUEST(specifier, base);
      error.cause = error_;
      throw error;
    }
  } else if (protocol === "file:" && specifier[0] === "#") {
    resolved = packageImportsResolve(specifier, base, conditions);
  } else {
    try {
      resolved = new URL(specifier);
    } catch (error_) {
      if (isRemote && !builtinModules.includes(specifier)) {
        const error = new ERR_UNSUPPORTED_RESOLVE_REQUEST(specifier, base);
        error.cause = error_;
        throw error;
      }
      resolved = packageResolve(specifier, base, conditions);
    }
  }
  assert2.ok(resolved !== undefined, "expected to be defined");
  if (resolved.protocol !== "file:") {
    return resolved;
  }
  return finalizeResolution(resolved, base, preserveSymlinks);
}
function checkIfDisallowedImport(specifier, parsed, parsedParentURL) {
  if (parsedParentURL) {
    const parentProtocol = parsedParentURL.protocol;
    if (parentProtocol === "http:" || parentProtocol === "https:") {
      if (shouldBeTreatedAsRelativeOrAbsolutePath(specifier)) {
        const parsedProtocol = parsed?.protocol;
        if (parsedProtocol && parsedProtocol !== "https:" && parsedProtocol !== "http:") {
          throw new ERR_NETWORK_IMPORT_DISALLOWED(specifier, parsedParentURL, "remote imports cannot import from a local location.");
        }
        return { url: parsed?.href || "" };
      }
      if (builtinModules.includes(specifier)) {
        throw new ERR_NETWORK_IMPORT_DISALLOWED(specifier, parsedParentURL, "remote imports cannot import from a local location.");
      }
      throw new ERR_NETWORK_IMPORT_DISALLOWED(specifier, parsedParentURL, "only relative and absolute specifiers are supported.");
    }
  }
}
function isURL(self) {
  return Boolean(self && typeof self === "object" && "href" in self && typeof self.href === "string" && "protocol" in self && typeof self.protocol === "string" && self.href && self.protocol);
}
function throwIfInvalidParentURL(parentURL) {
  if (parentURL === undefined) {
    return;
  }
  if (typeof parentURL !== "string" && !isURL(parentURL)) {
    throw new codes.ERR_INVALID_ARG_TYPE("parentURL", ["string", "URL"], parentURL);
  }
}
function defaultResolve(specifier, context = {}) {
  const { parentURL } = context;
  assert2.ok(parentURL !== undefined, "expected `parentURL` to be defined");
  throwIfInvalidParentURL(parentURL);
  let parsedParentURL;
  if (parentURL) {
    try {
      parsedParentURL = new URL(parentURL);
    } catch {}
  }
  let parsed;
  let protocol;
  try {
    parsed = shouldBeTreatedAsRelativeOrAbsolutePath(specifier) ? new URL(specifier, parsedParentURL) : new URL(specifier);
    protocol = parsed.protocol;
    if (protocol === "data:") {
      return { url: parsed.href, format: null };
    }
  } catch {}
  const maybeReturn = checkIfDisallowedImport(specifier, parsed, parsedParentURL);
  if (maybeReturn)
    return maybeReturn;
  if (protocol === undefined && parsed) {
    protocol = parsed.protocol;
  }
  if (protocol === "node:") {
    return { url: specifier };
  }
  if (parsed && parsed.protocol === "node:")
    return { url: specifier };
  const conditions = getConditionsSet(context.conditions);
  const url = moduleResolve(specifier, new URL(parentURL), conditions, false);
  return {
    url: url.href,
    format: defaultGetFormatWithoutErrors(url, { parentURL })
  };
}

// node_modules/import-meta-resolve/index.js
function resolve(specifier, parent) {
  if (!parent) {
    throw new Error("Please pass `parent`: `import-meta-resolve` cannot ponyfill that");
  }
  try {
    return defaultResolve(specifier, { parentURL: parent }).url;
  } catch (error) {
    const exception = error;
    if ((exception.code === "ERR_UNSUPPORTED_DIR_IMPORT" || exception.code === "ERR_MODULE_NOT_FOUND") && typeof exception.url === "string") {
      return exception.url;
    }
    throw error;
  }
}

// lib/shared/importFromUserLand.ts
async function importFromUserLand(moduleName, projectDir = process.cwd()) {
  for (const parent of [
    pathToFileURL2(path6.join(projectDir, "noop.js")).href,
    import.meta.url
  ]) {
    let resolved;
    try {
      resolved = resolve(moduleName, parent);
    } catch (error) {
      if (error?.code === "ERR_PACKAGE_PATH_NOT_EXPORTED") {
        resolved = pathToFileURL2(createRequire3(parent).resolve(moduleName)).href;
      } else if (error?.code === "ERR_MODULE_NOT_FOUND") {
        continue;
      } else {
        throw error;
      }
    }
    return import(resolved);
  }
  return import(moduleName);
}

// lib/shared/register-static-asset-loaders.ts
import fs5 from "node:fs";
import path7 from "node:path";
var STATIC_ASSET_EXTENSIONS = [
  ".glb",
  ".gltf",
  ".obj",
  ".step",
  ".kicad_mod",
  ".kicad_pcb",
  ".kicad_pro",
  ".kicad_sch",
  ".kicad_sym"
];
var staticAssetFilter = new RegExp(`(${STATIC_ASSET_EXTENSIONS.map((ext) => ext.replace(".", "\\.")).join("|")})$`, "i");
var registered = false;
var activePlatformConfig;
var TEXT_STATIC_ASSET_EXTENSIONS = new Set([
  ".json",
  ".txt",
  ".md",
  ".obj",
  ".kicad_mod",
  ".kicad_pcb",
  ".kicad_pro",
  ".kicad_sch",
  ".kicad_sym"
]);
var readFileContentForStaticLoader = (filePath) => {
  const ext = path7.extname(filePath).toLowerCase();
  if (TEXT_STATIC_ASSET_EXTENSIONS.has(ext)) {
    return fs5.readFileSync(filePath, "utf-8");
  }
  const buffer = fs5.readFileSync(filePath);
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
};
var getStaticFileLoader = (filePath) => {
  const extWithDot = path7.extname(filePath).toLowerCase();
  const ext = extWithDot.replace(/^\./, "");
  return activePlatformConfig?.staticFileLoaderMap?.[ext] ?? activePlatformConfig?.staticFileLoaderMap?.[extWithDot];
};
var normalizeStaticFileLoaderResult = (result) => {
  if (result && typeof result === "object" && result.__esModule) {
    return result;
  }
  return {
    __esModule: true,
    default: result
  };
};
var getBaseUrlFromTsConfig = (projectDir) => {
  const tsconfigPath = path7.join(projectDir, "tsconfig.json");
  try {
    if (!fs5.existsSync(tsconfigPath)) {
      return null;
    }
    const tsconfigContent = fs5.readFileSync(tsconfigPath, "utf-8");
    const tsconfig = JSON.parse(tsconfigContent);
    if (tsconfig.compilerOptions?.baseUrl) {
      return tsconfig.compilerOptions.baseUrl;
    }
  } catch {}
  return null;
};
var registerStaticAssetLoaders = (platformConfig, projectDir = process.cwd()) => {
  activePlatformConfig = platformConfig;
  if (registered)
    return;
  registered = true;
  if (typeof Bun !== "undefined" && typeof Bun.plugin === "function") {
    const baseUrl = getBaseUrlFromTsConfig(projectDir);
    Bun.plugin({
      name: "tsci-static-assets",
      setup(build) {
        build.onLoad({ filter: staticAssetFilter }, async (args) => {
          const staticFileLoader = getStaticFileLoader(args.path);
          if (staticFileLoader) {
            const loaderExports = normalizeStaticFileLoaderResult(await staticFileLoader(readFileContentForStaticLoader(args.path)));
            return {
              exports: loaderExports,
              loader: "object"
            };
          }
          const baseDir = baseUrl ? path7.resolve(projectDir, baseUrl) : projectDir;
          const relativePath = path7.relative(baseDir, args.path).split(path7.sep).join("/");
          const pathStr = `./${relativePath}`;
          return {
            exports: {
              __esModule: true,
              default: pathStr
            },
            loader: "object"
          };
        });
      }
    });
  }
};

// lib/shared/solver-diagnostics.ts
import fs6 from "node:fs";
import path8 from "node:path";
var escapeJsonPointerSegment = (segment) => segment.replaceAll("~", "~0").replaceAll("/", "~1");
var cloneAsJson = (value, ancestors = new WeakMap, path9 = "#") => {
  if (value === undefined)
    return { value_type: "undefined" };
  if (typeof value === "bigint") {
    return { value_type: "bigint", value: value.toString() };
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    return { value_type: "number", value: value.toString() };
  }
  if (typeof value === "number" && Object.is(value, -0)) {
    return { value_type: "number", value: "-0" };
  }
  if (typeof value === "symbol") {
    return { value_type: "symbol", value: value.description ?? null };
  }
  if (typeof value === "function") {
    return {
      value_type: "function",
      name: value.name || null,
      source: value.toString()
    };
  }
  if (value === null || typeof value !== "object")
    return value;
  const ancestorPath = ancestors.get(value);
  if (ancestorPath) {
    return { value_type: "circular_reference", path: ancestorPath };
  }
  ancestors.set(value, path9);
  try {
    if (Array.isArray(value)) {
      return value.map((item, index) => cloneAsJson(item, ancestors, `${path9}/${index}`));
    }
    if (value instanceof Date) {
      return { value_type: "date", value: value.toISOString() };
    }
    if (value instanceof RegExp) {
      return {
        value_type: "regexp",
        source: value.source,
        flags: value.flags
      };
    }
    if (value instanceof Map) {
      return {
        value_type: "map",
        entries: Array.from(value.entries(), ([key, item], index) => [
          cloneAsJson(key, ancestors, `${path9}/entries/${index}/0`),
          cloneAsJson(item, ancestors, `${path9}/entries/${index}/1`)
        ])
      };
    }
    if (value instanceof Set) {
      return {
        value_type: "set",
        values: Array.from(value.values(), (item, index) => cloneAsJson(item, ancestors, `${path9}/values/${index}`))
      };
    }
    if (value instanceof Error) {
      return {
        value_type: "error",
        name: value.name,
        message: value.message,
        stack: value.stack
      };
    }
    const clonedObject = {};
    for (const [key, item] of Object.entries(value)) {
      clonedObject[key] = cloneAsJson(item, ancestors, `${path9}/${escapeJsonPointerSegment(key)}`);
    }
    return clonedObject;
  } finally {
    ancestors.delete(value);
  }
};

class SolverDiagnostics {
  options;
  solverInvocations = [];
  constructor(options) {
    this.options = options;
  }
  attachToRootCircuit(rootCircuit) {
    if (!this.options.enabled)
      return;
    rootCircuit.on?.("solver:started", (rawEvent) => {
      const event = rawEvent;
      const constructorArgs = Array.isArray(event.solverConstructorArgs) ? event.solverConstructorArgs : [event.solverParams];
      this.solverInvocations.push({
        sequence: this.solverInvocations.length,
        solver_name: typeof event.solverName === "string" ? event.solverName : "unknown_solver",
        component_name: typeof event.componentName === "string" ? event.componentName : null,
        constructor_args: cloneAsJson(constructorArgs)
      });
    });
  }
  finalize() {
    if (!this.options.enabled)
      return;
    fs6.mkdirSync(path8.dirname(this.options.outputPath), { recursive: true });
    fs6.writeFileSync(this.options.outputPath, `${JSON.stringify({
      format: "tscircuit_solver_debug_v1",
      entrypoint: this.options.entrypoint,
      solvers: this.solverInvocations
    }, null, 2)}
`);
    this.options.log?.(`Solver inputs written to ${this.options.outputPath}`);
  }
}

// lib/shared/generate-circuit-json.tsx
import { jsxDEV } from "react/jsx-dev-runtime";
var debug = Debug("tsci:generate-circuit-json");
async function generateCircuitJson({
  filePath,
  projectDir: projectDirOption,
  outputDir,
  outputFileName,
  saveToFile = false,
  platformConfig,
  injectedProps,
  onAsyncEffectStatus,
  autorouterDiagnostics: autorouterDiagnosticsOptions,
  solverDiagnostics: solverDiagnosticsOptions,
  sourceFilesystemMd5Hash
}) {
  debug(`Generating circuit JSON for ${filePath}`);
  const currentSourceFilesystemMd5Hash = sourceFilesystemMd5Hash ?? getSourceFilesystemMd5Hash(filePath);
  const renderOptionsHash = getCircuitJsonRenderOptionsHash({
    platformConfig,
    injectedProps
  });
  const projectRootDir = path9.resolve(projectDirOption ?? process.cwd());
  const React = await importFromUserLand("react", projectRootDir);
  globalThis.React = React;
  registerStaticAssetLoaders(platformConfig, projectRootDir);
  const userLandTscircuit = await importFromUserLand("tscircuit", projectRootDir);
  const runner = new userLandTscircuit.RootCircuit({
    platform: platformConfig
  });
  const autorouterDiagnostics = new AutorouterDiagnostics(autorouterDiagnosticsOptions);
  autorouterDiagnostics.attachToRootCircuit(runner);
  const solverDiagnostics = solverDiagnosticsOptions ? new SolverDiagnostics(solverDiagnosticsOptions) : null;
  solverDiagnostics?.attachToRootCircuit(runner);
  attachAutoroutingArtifacts(runner, filePath, projectRootDir);
  const absoluteFilePath = path9.isAbsolute(filePath) ? filePath : path9.resolve(projectRootDir, filePath);
  const sourceDir = path9.dirname(absoluteFilePath);
  const resolvedOutputDir = outputDir ?? sourceDir;
  const relativeComponentPath = path9.relative(sourceDir, absoluteFilePath);
  const baseFileName = outputFileName || path9.basename(absoluteFilePath).replace(/\.[^.]+$/, "");
  const outputPath = path9.join(resolvedOutputDir, `${baseFileName}.circuit.json`);
  debug(`Project directory: ${sourceDir}`);
  debug(`Relative component path: ${relativeComponentPath}`);
  debug(`Output path: ${outputPath}`);
  const MainComponent = await import(pathToFileURL3(absoluteFilePath).href);
  let records;
  if (Array.isArray(MainComponent.circuitJson)) {
    records = MainComponent.circuitJson;
  } else {
    const Component = MainComponent.default || (Object.keys(MainComponent).find((k) => k[0] === k[0].toUpperCase()) !== undefined ? MainComponent[Object.keys(MainComponent).find((k) => k[0] === k[0].toUpperCase())] : undefined);
    if (!Component) {
      throw new Error(`No component found in "${absoluteFilePath}". Make sure you export a component.`);
    }
    runner.add(/* @__PURE__ */ jsxDEV(Component, {
      ...injectedProps ?? {}
    }, undefined, false, undefined, this));
    runner.render();
    const loggedAsyncEffectNames = new Set;
    while (!runner.isDoneRendering()) {
      for (const asyncEffect of runner.getRunningAsyncEffects()) {
        const asyncEffectName = asyncEffect.effectName;
        if (!asyncEffectName || loggedAsyncEffectNames.has(asyncEffectName)) {
          continue;
        }
        loggedAsyncEffectNames.add(asyncEffectName);
        onAsyncEffectStatus?.(asyncEffectName);
      }
      autorouterDiagnostics.checkTimeout();
      await new Promise((resolve2) => setTimeout(resolve2, 100));
      runner.render();
    }
    runner.emit("renderComplete");
    solverDiagnostics?.finalize();
    const hasImportedBoard = runner.children.some((component) => [component, ...component.getDescendants()].some((instance) => instance[Symbol.for("pcb-spice-pipeline.imported-board.v2")]));
    records = hasImportedBoard ? (await importFromUserLand("@tscircuit/pcb-spice-pipeline/tsx", projectRootDir)).serializeSimulation(runner) : await runner.getCircuitJson();
  }
  const modeling = MainComponent.modeling;
  const buildMetadata = {
    sourceFilesystemMd5Hash: currentSourceFilesystemMd5Hash,
    renderOptionsHash,
    modeling
  };
  const circuitJson = addSourceFilesystemHash(records, currentSourceFilesystemMd5Hash);
  await autorouterDiagnostics.finalize(circuitJson);
  if (saveToFile) {
    debug(`Saving circuit JSON to ${outputPath}`);
    fs7.writeFileSync(outputPath, JSON.stringify(circuitJson, null, 2));
    writeCircuitJsonBuildMetadata(outputPath, buildMetadata);
  }
  return {
    circuitJson,
    outputPath,
    rootCircuit: runner,
    modeling,
    buildMetadata
  };
}

// lib/shared/get-or-generate-circuit-json.ts
var getOrGenerateCircuitJson = async (options) => {
  const sourceFilesystemMd5Hash = getSourceFilesystemMd5Hash(options.filePath);
  const cachedBuild = readCurrentCircuitJsonBuild({
    filePath: options.filePath,
    sourceFilesystemMd5Hash,
    renderOptionsHash: getCircuitJsonRenderOptionsHash(options)
  });
  if (cachedBuild) {
    return {
      ...cachedBuild,
      rootCircuit: undefined,
      cacheHit: true
    };
  }
  const generated = await generateCircuitJson({
    ...options,
    sourceFilesystemMd5Hash
  });
  return {
    ...generated,
    cacheHit: false
  };
};

// lib/shared/get-platform-config-with-cli-defaults.ts
import { createHash as createHash3 } from "node:crypto";
import fs8 from "node:fs";
import path10 from "node:path";
import { getPlatformConfig } from "@tscircuit/eval/platform-config";

// lib/shared/platform-config-utils.ts
var mergePlatformConfigs = (...configs) => {
  const definedConfigs = configs.filter(Boolean);
  if (definedConfigs.length === 0) {
    return;
  }
  return definedConfigs.reduce((mergedConfig, config) => {
    return {
      ...mergedConfig,
      ...config,
      footprintLibraryMap: {
        ...mergedConfig.footprintLibraryMap,
        ...config.footprintLibraryMap
      },
      footprintFileParserMap: {
        ...mergedConfig.footprintFileParserMap,
        ...config.footprintFileParserMap
      },
      staticFileLoaderMap: {
        ...mergedConfig.staticFileLoaderMap,
        ...config.staticFileLoaderMap
      },
      autorouterMap: {
        ...mergedConfig.autorouterMap,
        ...config.autorouterMap
      },
      spiceEngineMap: {
        ...mergedConfig.spiceEngineMap,
        ...config.spiceEngineMap
      }
    };
  }, {});
};

// lib/shared/get-platform-fetch.ts
class BakedAssetNotFoundError extends Error {
  constructor() {
    super("This part isn't currently available in tscircuit standalone (enterprise), please contact your representative to get it added");
  }
}
var getPlatformFetch = (upstreamFetch = globalThis.fetch) => {
  const baseUrl = process.env.TSCIRCUIT_BAKED_ASSET_SERVER_BASE_URL?.replace(/\/+$/, "");
  if (!baseUrl)
    return upstreamFetch;
  const origin = new URL(baseUrl).origin;
  return Object.assign(async (input, init2) => {
    const url = new URL(input instanceof Request ? input.url : input);
    if (url.protocol !== "http:" && url.protocol !== "https:")
      return upstreamFetch(input, init2);
    const target = url.origin === origin ? url : new URL(`${url.hostname}${url.pathname}${url.search}`, `${baseUrl}/`);
    const response = await upstreamFetch(new Request(target, new Request(input, init2)));
    if (response.status === 404 || response.status === 405)
      throw new BakedAssetNotFoundError;
    return response;
  }, { preconnect: upstreamFetch.preconnect });
};

// lib/shared/get-platform-config-with-cli-defaults.ts
function createLocalCacheEngine(cacheDir = path10.join(process.cwd(), ".tscircuit", "cache")) {
  return {
    getItem: (key) => {
      try {
        const hash = createHash3("md5").update(key).digest("hex");
        const keyWithSafeCharacters = key.replace(/[^a-zA-Z0-9]/g, "_");
        const filePath = path10.join(cacheDir, `${keyWithSafeCharacters.slice(keyWithSafeCharacters.length - 10, keyWithSafeCharacters.length)}-${hash}.json`);
        return fs8.readFileSync(filePath, "utf-8");
      } catch {
        return null;
      }
    },
    setItem: (key, value) => {
      try {
        fs8.mkdirSync(cacheDir, { recursive: true });
        const hash = createHash3("md5").update(key).digest("hex");
        const keyWithSafeCharacters = key.replace(/[^a-zA-Z0-9]/g, "_");
        const filePath = path10.join(cacheDir, `${keyWithSafeCharacters.slice(keyWithSafeCharacters.length - 10, keyWithSafeCharacters.length)}-${hash}.json`);
        fs8.writeFileSync(filePath, value);
      } catch {}
    }
  };
}
function getPlatformConfigWithCliDefaults(userConfig, options) {
  const projectDir = options?.projectDir ?? process.cwd();
  const basePlatformConfig = getPlatformConfig();
  const cacheDir = path10.join(projectDir, ".tscircuit", "cache");
  const defaultConfig = {
    ...basePlatformConfig,
    checkAvailability: true,
    localCacheEngine: createLocalCacheEngine(cacheDir),
    footprintFileParserMap: {
      ...basePlatformConfig.footprintFileParserMap,
      kicad_mod: {
        loadFromUrl: async (url) => {
          let fetchUrl = url;
          if (url.startsWith("./") || url.startsWith("../")) {
            const absolutePath = path10.resolve(projectDir, url);
            fetchUrl = `file://${absolutePath}`;
          } else if (url.startsWith("/")) {
            if (fs8.existsSync(url)) {
              fetchUrl = `file://${url}`;
            } else {
              const relativePath = `.${url}`;
              const absolutePath = path10.resolve(projectDir, relativePath);
              if (fs8.existsSync(absolutePath)) {
                fetchUrl = `file://${absolutePath}`;
              } else {
                fetchUrl = `file://${url}`;
              }
            }
          }
          return basePlatformConfig.footprintFileParserMap.kicad_mod.loadFromUrl(fetchUrl);
        }
      }
    }
  };
  const config = userConfig ? mergePlatformConfigs(defaultConfig, userConfig) : defaultConfig;
  if (process.env.TSCIRCUIT_BAKED_ASSET_SERVER_BASE_URL)
    config.platformFetch = getPlatformFetch(config.platformFetch);
  return config;
}

// lib/shared/simulation-svg-assets.ts
import {
  convertCircuitJsonToSchematicSimulationSvg,
  convertCircuitJsonToSimulationGraphSvg,
  isSimulationExperiment
} from "circuit-to-svg";
var SIMULATION_ANALYSIS_RESULT_TYPES = new Set([
  "simulation_transient_voltage_graph",
  "simulation_transient_current_graph",
  "simulation_dc_operating_point_voltage",
  "simulation_dc_operating_point_current",
  "simulation_dc_sweep_voltage_graph",
  "simulation_dc_sweep_current_graph",
  "simulation_ac_sweep_voltage_graph",
  "simulation_ac_sweep_current_graph"
]);
var isSimulationAnalysisResult = (element) => SIMULATION_ANALYSIS_RESULT_TYPES.has(element.type);
var getSimulationSvgInputs = (circuitJson, simulationExperimentId) => {
  const hasAnalysisResult = circuitJson.some((element) => isSimulationAnalysisResult(element) && element.simulation_experiment_id === simulationExperimentId);
  if (!hasAnalysisResult) {
    return;
  }
  return {
    simulation_experiment_id: simulationExperimentId
  };
};
var toFileNameSuffix = (value) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
var getUniqueFileNameSuffixes = (simulations) => {
  const usedSuffixes = new Set;
  return simulations.map((simulation) => {
    const baseSuffix = toFileNameSuffix(simulation.name) || toFileNameSuffix(simulation.simulation_experiment_id) || "simulation";
    let suffix = baseSuffix;
    let duplicateIndex = 2;
    while (usedSuffixes.has(suffix)) {
      suffix = `${baseSuffix}-${duplicateIndex++}`;
    }
    usedSuffixes.add(suffix);
    return suffix;
  });
};
var getSimulationSvgAssetsFromCircuitJson = (circuitJson) => {
  const simulationExperiments = circuitJson.filter(isSimulationExperiment);
  const fileNameSuffixes = getUniqueFileNameSuffixes(simulationExperiments);
  return simulationExperiments.flatMap((simulationExperiment, index) => {
    const simulationSvgInputs = getSimulationSvgInputs(circuitJson, simulationExperiment.simulation_experiment_id);
    if (!simulationSvgInputs)
      return [];
    return [
      {
        simulationExperimentId: simulationExperiment.simulation_experiment_id,
        simulationExperimentName: simulationExperiment.name,
        fileNameSuffix: fileNameSuffixes[index],
        simulationSvg: convertCircuitJsonToSimulationGraphSvg({
          circuitJson,
          ...simulationSvgInputs
        }),
        schematicSimulationSvg: convertCircuitJsonToSchematicSimulationSvg({
          circuitJson,
          ...simulationSvgInputs
        })
      }
    ];
  });
};

// lib/shared/compare-images.ts
import looksSame from "@tscircuit/image-utils/looks-same";
import fs9 from "node:fs/promises";
var compareAndCreateDiff = async (buffer1, buffer2, diffPath, createDiff = true) => {
  if (Buffer.from(buffer1).equals(Buffer.from(buffer2))) {
    return { equal: true };
  }
  const toImageBuffer = (buffer) => Buffer.from(diffPath.endsWith(".svg") ? convertSvgToPngBuffer(Buffer.from(buffer).toString("utf8")) : buffer);
  const b1 = toImageBuffer(buffer1);
  const b2 = toImageBuffer(buffer2);
  const { equal } = await looksSame(b1, b2, {
    strict: false,
    tolerance: 2
  });
  if (!equal && createDiff) {
    if (diffPath.endsWith(".png")) {
      const diffBuffer = await looksSame.createDiff({
        reference: b1,
        current: b2,
        highlightColor: "#ff00ff",
        tolerance: 2
      });
      await fs9.writeFile(diffPath, diffBuffer);
    } else {
      await fs9.writeFile(diffPath, buffer2);
    }
  }
  return { equal };
};

// lib/shared/is-circuit-json-file.ts
var isCircuitJsonFile = (filePath) => {
  const normalizedPath = filePath.toLowerCase().replaceAll("\\", "/");
  return normalizedPath.endsWith(".circuit.json") || normalizedPath.endsWith("/circuit.json");
};

// lib/shared/process-snapshot-file.ts
var processSnapshotFile = async ({
  file,
  projectDir,
  snapshotsDirName,
  update,
  threeD,
  pcbOnly,
  schematicOnly,
  simulationOnly,
  forceUpdate,
  platformConfig,
  pcbSnapshotSettings,
  createDiff,
  cameraPreset,
  pcbLayer
}) => {
  const relativeFilePath = path11.relative(projectDir, file);
  const successPaths = [];
  const warningMessages = [];
  const mismatches = [];
  let didUpdate = false;
  let circuitJson;
  let pcbSvg;
  let schSvg;
  let simulationSvgAssets = [];
  try {
    if (isCircuitJsonFile(file)) {
      const parsed = JSON.parse(fs10.readFileSync(file, "utf-8"));
      circuitJson = Array.isArray(parsed) ? parsed : [];
    } else {
      const platformConfigWithCliDefaults = getPlatformConfigWithCliDefaults(platformConfig, { projectDir });
      const result = await getOrGenerateCircuitJson({
        filePath: file,
        projectDir,
        platformConfig: platformConfigWithCliDefaults
      });
      circuitJson = result.circuitJson;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      didUpdate: false,
      successPaths,
      warningMessages,
      mismatches,
      errorMessage: kleur_default.red(`
❌ Failed to generate circuit JSON for ${relativeFilePath}:
`) + kleur_default.red(`   ${errorMessage}
`)
    };
  }
  if (!simulationOnly) {
    try {
      pcbSvg = convertCircuitJsonToPcbSvg(circuitJson, {
        ...pcbSnapshotSettings,
        layer: pcbLayer ?? pcbSnapshotSettings?.layer
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        didUpdate: false,
        successPaths,
        warningMessages,
        mismatches,
        errorMessage: kleur_default.red(`
❌ Failed to generate PCB SVG for ${relativeFilePath}:
`) + kleur_default.red(`   ${errorMessage}
`)
      };
    }
    try {
      schSvg = convertCircuitJsonToStackedSchematicSheetsSvg(circuitJson);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        didUpdate: false,
        successPaths,
        warningMessages,
        mismatches,
        errorMessage: kleur_default.red(`
❌ Failed to generate schematic SVG for ${relativeFilePath}:
`) + kleur_default.red(`   ${errorMessage}
`)
      };
    }
  }
  try {
    simulationSvgAssets = getSimulationSvgAssetsFromCircuitJson(circuitJson);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      didUpdate: false,
      successPaths,
      warningMessages,
      mismatches,
      errorMessage: kleur_default.red(`
❌ Failed to generate simulation SVGs for ${relativeFilePath}:
`) + kleur_default.red(`   ${errorMessage}
`)
    };
  }
  let png3d = null;
  if (threeD && !simulationOnly) {
    try {
      png3d = await renderCircuitJsonTo3dPng(circuitJson, { cameraPreset });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("No pcb_board found in circuit JSON")) {
        const fileDir = path11.dirname(file);
        const relativeDir = path11.relative(projectDir, fileDir);
        const snapDir2 = snapshotsDirName ? path11.join(projectDir, snapshotsDirName, relativeDir) : path11.join(fileDir, "__snapshots__");
        const base2 = path11.basename(file).replace(/\.[^.]+$/, "");
        const snap3dPath = path11.join(snapDir2, `${base2}-3d.snap.png`);
        const existing3dSnapshot = fs10.existsSync(snap3dPath);
        if (existing3dSnapshot) {
          return {
            ok: false,
            didUpdate: false,
            successPaths,
            warningMessages,
            mismatches,
            errorMessage: kleur_default.red(`
❌ Failed to generate 3D snapshot for ${relativeFilePath}:
`) + kleur_default.red(`   No pcb_board found in circuit JSON
`) + kleur_default.red(`   Existing snapshot: ${path11.relative(projectDir, snap3dPath)}
`)
          };
        }
        warningMessages.push(kleur_default.red(`⚠️  Skipping 3D snapshot for ${relativeFilePath}:`) + kleur_default.red(` No pcb_board found in circuit JSON`));
        png3d = null;
      } else {
        return {
          ok: false,
          didUpdate: false,
          successPaths,
          warningMessages,
          mismatches,
          errorMessage: kleur_default.red(`
❌ Failed to generate 3D snapshot for ${relativeFilePath}:
`) + kleur_default.red(`   ${errorMessage}
`)
        };
      }
    }
  }
  const snapDir = snapshotsDirName ? path11.join(projectDir, snapshotsDirName, path11.relative(projectDir, path11.dirname(file))) : path11.join(path11.dirname(file), "__snapshots__");
  fs10.mkdirSync(snapDir, { recursive: true });
  const base = path11.basename(file).replace(/\.[^.]+$/, "");
  const snapshots = [];
  if (!simulationOnly && (pcbOnly || !schematicOnly)) {
    let pcbSnapshotType = "pcb";
    if (pcbLayer) {
      pcbSnapshotType = pcbLayer;
    }
    if (pcbSnapshotSettings?.xRayNets?.length)
      pcbSnapshotType += "-xray";
    snapshots.push({
      type: pcbSnapshotType,
      content: pcbSvg,
      isBinary: false
    });
  }
  if (!simulationOnly && (schematicOnly || !pcbOnly)) {
    snapshots.push({ type: "schematic", content: schSvg, isBinary: false });
  }
  if (threeD && png3d) {
    snapshots.push({ type: "3d", content: png3d, isBinary: true });
  }
  if ((simulationOnly || !pcbOnly && !schematicOnly) && simulationSvgAssets.length > 0) {
    const hasMultipleSimulations = simulationSvgAssets.length > 1;
    for (const simulationSvgAsset of simulationSvgAssets) {
      const simulationType = hasMultipleSimulations ? `simulation-${simulationSvgAsset.fileNameSuffix}` : "simulation";
      const schematicSimulationType = hasMultipleSimulations ? `schematic-simulation-${simulationSvgAsset.fileNameSuffix}` : "schematic-simulation";
      snapshots.push({
        type: simulationType,
        content: simulationSvgAsset.simulationSvg,
        isBinary: false
      });
      snapshots.push({
        type: schematicSimulationType,
        content: simulationSvgAsset.schematicSimulationSvg,
        isBinary: false
      });
    }
  }
  for (const snapshot of snapshots) {
    const { type } = snapshot;
    const is3d = type === "3d";
    const snapPath = path11.join(snapDir, `${base}-${type}.snap.${is3d ? "png" : "svg"}`);
    const existing = fs10.existsSync(snapPath);
    const newContentBuffer = snapshot.isBinary ? snapshot.content : Buffer.from(snapshot.content, "utf8");
    const newContentForFile = snapshot.content;
    if (!existing) {
      fs10.writeFileSync(snapPath, newContentForFile);
      successPaths.push(path11.relative(projectDir, snapPath));
      didUpdate = true;
      continue;
    }
    const oldContentBuffer = fs10.readFileSync(snapPath);
    let equal;
    let diffPath;
    if (update && !createDiff) {
      equal = oldContentBuffer.equals(newContentBuffer);
    } else {
      const comparisonPath = snapPath.replace(is3d ? ".snap.png" : ".snap.svg", is3d ? ".diff.png" : ".diff.svg");
      if (createDiff)
        diffPath = comparisonPath;
      const comparison = await compareAndCreateDiff(oldContentBuffer, newContentBuffer, comparisonPath, createDiff);
      equal = comparison.equal;
    }
    if (update) {
      if (!forceUpdate && equal) {
        successPaths.push(path11.relative(projectDir, snapPath));
      } else {
        fs10.writeFileSync(snapPath, newContentForFile);
        successPaths.push(path11.relative(projectDir, snapPath));
        didUpdate = true;
      }
    } else if (!equal) {
      mismatches.push(diffPath ? `${snapPath} (diff: ${diffPath})` : snapPath);
    } else {
      successPaths.push(path11.relative(projectDir, snapPath));
    }
  }
  return {
    ok: true,
    didUpdate,
    successPaths,
    warningMessages,
    mismatches
  };
};

// lib/project-config/index.ts
import * as fs11 from "node:fs";
import * as path12 from "node:path";
import { pathToFileURL as pathToFileURL4 } from "node:url";

// lib/project-config/project-config-schema.ts
import { z } from "zod";
var pcbSnapshotSettingsSchema = z.object({
  layer: z.enum(["top", "bottom"]).optional(),
  xRayNets: z.array(z.string().min(1)).optional(),
  hiddenLayerOpacity: z.number().min(0).max(1).optional(),
  showCourtyards: z.boolean().optional(),
  showPcbNotes: z.boolean().optional(),
  showFabricationNotes: z.boolean().optional()
});
var kicadPcmSettingsSchema = z.object({
  schemaVersion: z.union([z.literal("auto"), z.literal(1), z.literal(2)]).optional(),
  license: z.string().trim().min(1).optional()
});
var extraRunFrameTabSchema = z.object({
  tabName: z.string().trim().min(1),
  iframeUrl: z.string().url().refine((url) => /^https?:\/\//i.test(url), {
    message: "Extra RunFrame tabs require an HTTP or HTTPS URL"
  }).refine((url) => {
    try {
      const parsed = new URL(url);
      return !parsed.username && !parsed.password;
    } catch {
      return false;
    }
  }, {
    message: "Extra RunFrame tab URLs must not include credentials"
  }),
  mainComponentPath: z.string().trim().min(1).optional()
});
var projectConfigSchema = z.object({
  mainEntrypoint: z.string().optional(),
  libraryEntrypoint: z.string().optional(),
  previewComponentPath: z.string().optional(),
  siteDefaultComponentPath: z.string().optional(),
  extraRunFrameTabs: z.array(extraRunFrameTabSchema).optional(),
  ignoredFiles: z.array(z.string()).optional(),
  includeBoardFiles: z.array(z.string()).optional(),
  snapshotsDir: z.string().optional(),
  pcbSnapshotSettings: pcbSnapshotSettingsSchema.optional(),
  prebuildCommand: z.string().optional(),
  buildCommand: z.string().optional(),
  kicadProjectEntrypointPath: z.string().optional(),
  kicadLibraryEntrypointPath: z.string().optional(),
  kicadLibraryName: z.string().optional(),
  kicadPcm: kicadPcmSettingsSchema.optional(),
  alwaysUseLatestTscircuitOnCloud: z.boolean().optional(),
  useCloudAutorouting: z.boolean().optional(),
  build: z.object({
    circuitJson: z.boolean().optional(),
    kicadProject: z.boolean().optional(),
    kicadLibrary: z.boolean().optional(),
    kicadPcm: z.boolean().optional(),
    previewImages: z.boolean().optional(),
    glbs: z.boolean().optional(),
    step: z.boolean().optional(),
    workerTimeoutMs: z.number().int().positive().optional(),
    routingDisabled: z.boolean().optional(),
    typescriptLibrary: z.boolean().optional()
  }).optional()
});

// lib/project-config/index.ts
var CONFIG_FILENAME = "tscircuit.config.json";
var CONFIG_MODULE_FILENAMES = [
  "tscircuit.config.ts",
  "tscircuit.config.js"
];
var ENV_FILENAMES = [".env", ".env.local"];
var CONFIG_SCHEMA_URL = "https://cdn.jsdelivr.net/npm/@tscircuit/cli/types/tscircuit.config.schema.json";
var DEFAULT_BOARD_FILE_PATTERNS = [
  "**/*.board.tsx",
  "**/*.circuit.tsx",
  "**/*.circuit.json"
];
var parseProjectConfigObject = (config) => {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("tscircuit config must export an object");
  }
  const { platformConfig, ...serializableConfig } = config;
  const parsedConfig = projectConfigSchema.parse(serializableConfig);
  if (platformConfig === undefined) {
    return parsedConfig;
  }
  return {
    ...parsedConfig,
    platformConfig
  };
};
var stripWrappingQuotes = (value) => {
  if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  return value;
};
var loadProjectEnv = (projectDir) => {
  const initialEnvKeys = new Set(Object.keys(process.env));
  for (const envFileName of ENV_FILENAMES) {
    const envPath = path12.join(projectDir, envFileName);
    if (!fs11.existsSync(envPath))
      continue;
    const envContent = fs11.readFileSync(envPath, "utf8");
    for (const rawLine of envContent.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#"))
        continue;
      const lineWithoutExport = line.startsWith("export ") ? line.slice("export ".length) : line;
      const separatorIndex = lineWithoutExport.indexOf("=");
      if (separatorIndex <= 0)
        continue;
      const key = lineWithoutExport.slice(0, separatorIndex).trim();
      if (!key || initialEnvKeys.has(key))
        continue;
      const value = stripWrappingQuotes(lineWithoutExport.slice(separatorIndex + 1).trim());
      process.env[key] = value;
    }
  }
};
var loadProjectConfigSync = (projectDir = process.cwd(), options = {}) => {
  const configPath = path12.join(projectDir, CONFIG_FILENAME);
  if (!fs11.existsSync(configPath)) {
    return null;
  }
  try {
    const configContent = fs11.readFileSync(configPath, "utf8");
    const parsedConfig = JSON.parse(configContent);
    return projectConfigSchema.parse(parsedConfig);
  } catch (error) {
    if (options.throwOnError)
      throw error;
    console.error(`Error loading tscircuit config: ${error}`);
    return null;
  }
};
var loadProjectConfigModule = async (projectDir, options = {}) => {
  loadProjectEnv(projectDir);
  for (const configFileName of CONFIG_MODULE_FILENAMES) {
    const configPath = path12.join(projectDir, configFileName);
    if (!fs11.existsSync(configPath))
      continue;
    try {
      const moduleUrl = pathToFileURL4(configPath);
      const stat = fs11.statSync(configPath);
      moduleUrl.searchParams.set("tsci", String(stat.mtimeMs));
      const importedModule = await import(moduleUrl.href);
      const exportedConfig = importedModule.default ?? importedModule.config ?? importedModule;
      return parseProjectConfigObject(exportedConfig);
    } catch (error) {
      if (options.throwOnError)
        throw error;
      console.error(`Error loading ${configFileName}: ${error}`);
      return null;
    }
  }
  return null;
};
var loadRuntimeProjectConfig = async (projectDir = process.cwd(), options = {}) => {
  const jsonConfig = loadProjectConfigSync(projectDir, options);
  const moduleConfig = await loadProjectConfigModule(projectDir, options);
  if (!jsonConfig && !moduleConfig) {
    return null;
  }
  const mergedConfig = {
    ...jsonConfig ?? {},
    ...moduleConfig ?? {},
    build: {
      ...jsonConfig?.build,
      ...moduleConfig?.build
    },
    pcbSnapshotSettings: {
      ...jsonConfig?.pcbSnapshotSettings,
      ...moduleConfig?.pcbSnapshotSettings
    }
  };
  if (mergedConfig.useCloudAutorouting !== undefined) {
    mergedConfig.platformConfig = {
      useCloudAutorouter: mergedConfig.useCloudAutorouting,
      ...mergedConfig.platformConfig
    };
  }
  return mergedConfig;
};
var loadProjectConfig = (projectDir = process.cwd()) => {
  return loadProjectConfigSync(projectDir);
};
var getBoardFilePatterns = (projectDir = process.cwd()) => {
  const config = loadProjectConfigSync(projectDir);
  const patterns = config?.includeBoardFiles?.filter((pattern) => pattern.trim());
  if (patterns && patterns.length > 0) {
    return patterns;
  }
  return DEFAULT_BOARD_FILE_PATTERNS;
};
var getSnapshotsDir = (projectDir = process.cwd()) => {
  const config = loadProjectConfigSync(projectDir);
  return config?.snapshotsDir;
};
var saveProjectConfig = (config, projectDir = process.cwd()) => {
  const configPath = path12.join(projectDir, CONFIG_FILENAME);
  try {
    const configWithSchema = {
      $schema: CONFIG_SCHEMA_URL,
      ...config ?? {}
    };
    fs11.writeFileSync(configPath, JSON.stringify(configWithSchema, null, 2));
    return true;
  } catch (error) {
    console.error(`Error saving tscircuit config: ${error}`);
    return false;
  }
};

// cli/snapshot/worker-snapshot-handlers.ts
var handleSnapshotFile = async (filePath, projectDir, snapshotsDirName, options) => {
  await registerStaticAssetLoaders(undefined, projectDir);
  const projectConfig = await loadRuntimeProjectConfig(projectDir);
  const platformConfig = mergePlatformConfigs(projectConfig?.platformConfig, options.platformConfig);
  const result = await processSnapshotFile({
    file: filePath,
    projectDir,
    snapshotsDirName,
    update: options.update,
    threeD: options.threeD,
    pcbOnly: options.pcbOnly,
    schematicOnly: options.schematicOnly,
    simulationOnly: options.simulationOnly,
    forceUpdate: options.forceUpdate,
    platformConfig,
    pcbSnapshotSettings: options.pcbSnapshotSettings,
    createDiff: options.createDiff,
    cameraPreset: options.cameraPreset,
    pcbLayer: options.pcbLayer
  });
  return {
    message_type: "snapshot_completed",
    file_path: filePath,
    result
  };
};

// cli/snapshot/snapshot.worker.ts
if (!parentPort) {
  throw new Error("This file must be run as a worker thread");
}
var sendMessage = (message) => {
  parentPort.postMessage(message);
};
var workerLog = (...args) => {
  const line = args.map((arg) => typeof arg === "object" ? JSON.stringify(arg) : String(arg)).join(" ");
  sendMessage({
    message_type: "worker_log",
    log_lines: [line]
  });
};
parentPort.on("message", async (msg) => {
  if (msg.message_type === "snapshot_file") {
    try {
      const result = await handleSnapshotFile(msg.file_path, msg.project_dir, msg.snapshots_dir_name, msg.options);
      sendMessage(result);
    } catch (error) {
      workerLog(`Worker failed while snapshotting ${msg.file_path}:`, error instanceof Error ? error.message : String(error));
      sendMessage({
        message_type: "snapshot_completed",
        file_path: msg.file_path,
        result: {
          ok: false,
          didUpdate: false,
          successPaths: [],
          warningMessages: [],
          mismatches: [],
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }
});

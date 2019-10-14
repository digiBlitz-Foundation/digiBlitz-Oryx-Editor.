/*  Prototype JavaScript framework, version 1.6.0.1
 *  (c) 2005-2007 Sam Stephenson
 *
 *  Prototype is freely distributable under the terms of an MIT-style license.
 *  For details, see the Prototype web site: http://www.prototypejs.org/
 *
 *--------------------------------------------------------------------------*/

var Prototype = {
  Version: '1.6.0.1',

  Browser: {
    IE:     !!(window.attachEvent && !window.opera),
    Opera:  !!window.opera,
    WebKit: navigator.userAgent.indexOf('AppleWebKit/') > -1,
    Gecko:  navigator.userAgent.indexOf('Gecko') > -1 && navigator.userAgent.indexOf('KHTML') == -1,
    MobileSafari: !!navigator.userAgent.match(/Apple.*Mobile.*Safari/)
  },

  BrowserFeatures: {
    XPath: !!document.evaluate,
    ElementExtensions: !!window.HTMLElement,
    SpecificElementExtensions:
      document.createElement('div').__proto__ &&
      document.createElement('div').__proto__ !==
        document.createElement('form').__proto__
  },

  ScriptFragment: '<script[^>]*>([\\S\\s]*?)<\/script>',
  JSONFilter: /^\/\*-secure-([\s\S]*)\*\/\s*$/,

  emptyFunction: function() { },
  K: function(x) { return x }
};

if (Prototype.Browser.MobileSafari)
  Prototype.BrowserFeatures.SpecificElementExtensions = false;


/* Based on Alex Arnell's inheritance implementation. */
var Class = {
  create: function() {
    var parent = null, properties = $A(arguments);
    if (Object.isFunction(properties[0]))
      parent = properties.shift();

    function klass() {
      this.initialize.apply(this, arguments);
    }

    Object.extend(klass, Class.Methods);
    klass.superclass = parent;
    klass.subclasses = [];

    if (parent) {
      var subclass = function() { };
      subclass.prototype = parent.prototype;
      klass.prototype = new subclass;
      parent.subclasses.push(klass);
    }

    for (var i = 0; i < properties.length; i++)
      klass.addMethods(properties[i]);

    if (!klass.prototype.initialize)
      klass.prototype.initialize = Prototype.emptyFunction;

    klass.prototype.constructor = klass;

    return klass;
  }
};

Class.Methods = {
  addMethods: function(source) {
    var ancestor   = this.superclass && this.superclass.prototype;
    var properties = Object.keys(source);

    if (!Object.keys({ toString: true }).length)
      properties.push("toString", "valueOf");

    for (var i = 0, length = properties.length; i < length; i++) {
      var property = properties[i], value = source[property];
      if (ancestor && Object.isFunction(value) &&
          value.argumentNames().first() == "$super") {
        var method = value, value = Object.extend((function(m) {
          return function() { return ancestor[m].apply(this, arguments) };
        })(property).wrap(method), {
          valueOf:  function() { return method },
          toString: function() { return method.toString() }
        });
      }
      this.prototype[property] = value;
    }

    return this;
  }
};

var Abstract = { };

Object.extend = function(destination, source) {
  for (var property in source)
    destination[property] = source[property];
  return destination;
};

Object.extend(Object, {
  inspect: function(object) {
    try {
      if (Object.isUndefined(object)) return 'undefined';
      if (object === null) return 'null';
      return object.inspect ? object.inspect() : object.toString();
    } catch (e) {
      if (e instanceof RangeError) return '...';
      throw e;
    }
  },

  toJSON: function(object) {
    var type = typeof object;
    switch (type) {
      case 'undefined':
      case 'function':
      case 'unknown': return;
      case 'boolean': return object.toString();
    }

    if (object === null) return 'null';
    if (object.toJSON) return object.toJSON();
    if (Object.isElement(object)) return;

    var results = [];
    for (var property in object) {
      var value = Object.toJSON(object[property]);
      if (!Object.isUndefined(value))
        results.push(property.toJSON() + ': ' + value);
    }

    return '{' + results.join(', ') + '}';
  },

  toQueryString: function(object) {
    return $H(object).toQueryString();
  },

  toHTML: function(object) {
    return object && object.toHTML ? object.toHTML() : String.interpret(object);
  },

  keys: function(object) {
    var keys = [];
    for (var property in object)
      keys.push(property);
    return keys;
  },

  values: function(object) {
    var values = [];
    for (var property in object)
      values.push(object[property]);
    return values;
  },

  clone: function(object) {
    return Object.extend({ }, object);
  },

  isElement: function(object) {
    return object && object.nodeType == 1;
  },

  isArray: function(object) {
    return object && object.constructor === Array;
  },

  isHash: function(object) {
    return object instanceof Hash;
  },

  isFunction: function(object) {
    return typeof object == "function";
  },

  isString: function(object) {
    return typeof object == "string";
  },

  isNumber: function(object) {
    return typeof object == "number";
  },

  isUndefined: function(object) {
    return typeof object == "undefined";
  }
});

Object.extend(Function.prototype, {
  argumentNames: function() {
    var names = this.toString().match(/^[\s\(]*function[^(]*\((.*?)\)/)[1].split(",").invoke("strip");
    return names.length == 1 && !names[0] ? [] : names;
  },

  bind: function() {
    if (arguments.length < 2 && Object.isUndefined(arguments[0])) return this;
    var __method = this, args = $A(arguments), object = args.shift();
    return function() {
      return __method.apply(object, args.concat($A(arguments)));
    }
  },

  bindAsEventListener: function() {
    var __method = this, args = $A(arguments), object = args.shift();
    return function(event) {
      return __method.apply(object, [event || window.event].concat(args));
    }
  },

  curry: function() {
    if (!arguments.length) return this;
    var __method = this, args = $A(arguments);
    return function() {
      return __method.apply(this, args.concat($A(arguments)));
    }
  },

  delay: function() {
    var __method = this, args = $A(arguments), timeout = args.shift() * 1000;
    return window.setTimeout(function() {
      return __method.apply(__method, args);
    }, timeout);
  },

  wrap: function(wrapper) {
    var __method = this;
    return function() {
      return wrapper.apply(this, [__method.bind(this)].concat($A(arguments)));
    }
  },

  methodize: function() {
    if (this._methodized) return this._methodized;
    var __method = this;
    return this._methodized = function() {
      return __method.apply(null, [this].concat($A(arguments)));
    };
  }
});

Function.prototype.defer = Function.prototype.delay.curry(0.01);

Date.prototype.toJSON = function() {
  return '"' + this.getUTCFullYear() + '-' +
    (this.getUTCMonth() + 1).toPaddedString(2) + '-' +
    this.getUTCDate().toPaddedString(2) + 'T' +
    this.getUTCHours().toPaddedString(2) + ':' +
    this.getUTCMinutes().toPaddedString(2) + ':' +
    this.getUTCSeconds().toPaddedString(2) + 'Z"';
};

var Try = {
  these: function() {
    var returnValue;

    for (var i = 0, length = arguments.length; i < length; i++) {
      var lambda = arguments[i];
      try {
        returnValue = lambda();
        break;
      } catch (e) { }
    }

    return returnValue;
  }
};

RegExp.prototype.match = RegExp.prototype.test;

RegExp.escape = function(str) {
  return String(str).replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1');
};

/*--------------------------------------------------------------------------*/

var PeriodicalExecuter = Class.create({
  initialize: function(callback, frequency) {
    this.callback = callback;
    this.frequency = frequency;
    this.currentlyExecuting = false;

    this.registerCallback();
  },

  registerCallback: function() {
    this.timer = setInterval(this.onTimerEvent.bind(this), this.frequency * 1000);
  },

  execute: function() {
    this.callback(this);
  },

  stop: function() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  },

  onTimerEvent: function() {
    if (!this.currentlyExecuting) {
      try {
        this.currentlyExecuting = true;
        this.execute();
      } finally {
        this.currentlyExecuting = false;
      }
    }
  }
});
Object.extend(String, {
  interpret: function(value) {
    return value == null ? '' : String(value);
  },
  specialChar: {
    '\b': '\\b',
    '\t': '\\t',
    '\n': '\\n',
    '\f': '\\f',
    '\r': '\\r',
    '\\': '\\\\'
  }
});

Object.extend(String.prototype, {
  gsub: function(pattern, replacement) {
    var result = '', source = this, match;
    replacement = arguments.callee.prepareReplacement(replacement);

    while (source.length > 0) {
      if (match = source.match(pattern)) {
        result += source.slice(0, match.index);
        result += String.interpret(replacement(match));
        source  = source.slice(match.index + match[0].length);
      } else {
        result += source, source = '';
      }
    }
    return result;
  },

  sub: function(pattern, replacement, count) {
    replacement = this.gsub.prepareReplacement(replacement);
    count = Object.isUndefined(count) ? 1 : count;

    return this.gsub(pattern, function(match) {
      if (--count < 0) return match[0];
      return replacement(match);
    });
  },

  scan: function(pattern, iterator) {
    this.gsub(pattern, iterator);
    return String(this);
  },

  truncate: function(length, truncation) {
    length = length || 30;
    truncation = Object.isUndefined(truncation) ? '...' : truncation;
    return this.length > length ?
      this.slice(0, length - truncation.length) + truncation : String(this);
  },

  strip: function() {
    return this.replace(/^\s+/, '').replace(/\s+$/, '');
  },

  stripTags: function() {
    return this.replace(/<\/?[^>]+>/gi, '');
  },

  stripScripts: function() {
    return this.replace(new RegExp(Prototype.ScriptFragment, 'img'), '');
  },

  extractScripts: function() {
    var matchAll = new RegExp(Prototype.ScriptFragment, 'img');
    var matchOne = new RegExp(Prototype.ScriptFragment, 'im');
    return (this.match(matchAll) || []).map(function(scriptTag) {
      return (scriptTag.match(matchOne) || ['', ''])[1];
    });
  },

  evalScripts: function() {
    return this.extractScripts().map(function(script) { return eval(script) });
  },

  escapeHTML: function() {
    var self = arguments.callee;
    self.text.data = this;
    return self.div.innerHTML;
  },

  unescapeHTML: function() {
    var div = new Element('div');
    div.innerHTML = this.stripTags();
    return div.childNodes[0] ? (div.childNodes.length > 1 ?
      $A(div.childNodes).inject('', function(memo, node) { return memo+node.nodeValue }) :
      div.childNodes[0].nodeValue) : '';
  },

  toQueryParams: function(separator) {
    var match = this.strip().match(/([^?#]*)(#.*)?$/);
    if (!match) return { };

    return match[1].split(separator || '&').inject({ }, function(hash, pair) {
      if ((pair = pair.split('='))[0]) {
        var key = decodeURIComponent(pair.shift());
        var value = pair.length > 1 ? pair.join('=') : pair[0];
        if (value != undefined) value = decodeURIComponent(value);

        if (key in hash) {
          if (!Object.isArray(hash[key])) hash[key] = [hash[key]];
          hash[key].push(value);
        }
        else hash[key] = value;
      }
      return hash;
    });
  },

  toArray: function() {
    return this.split('');
  },

  succ: function() {
    return this.slice(0, this.length - 1) +
      String.fromCharCode(this.charCodeAt(this.length - 1) + 1);
  },

  times: function(count) {
    return count < 1 ? '' : new Array(count + 1).join(this);
  },

  camelize: function() {
    var parts = this.split('-'), len = parts.length;
    if (len == 1) return parts[0];

    var camelized = this.charAt(0) == '-'
      ? parts[0].charAt(0).toUpperCase() + parts[0].substring(1)
      : parts[0];

    for (var i = 1; i < len; i++)
      camelized += parts[i].charAt(0).toUpperCase() + parts[i].substring(1);

    return camelized;
  },

  capitalize: function() {
    return this.charAt(0).toUpperCase() + this.substring(1).toLowerCase();
  },

  underscore: function() {
    return this.gsub(/::/, '/').gsub(/([A-Z]+)([A-Z][a-z])/,'#{1}_#{2}').gsub(/([a-z\d])([A-Z])/,'#{1}_#{2}').gsub(/-/,'_').toLowerCase();
  },

  dasherize: function() {
    return this.gsub(/_/,'-');
  },

  inspect: function(useDoubleQuotes) {
    var escapedString = this.gsub(/[\x00-\x1f\\]/, function(match) {
      var character = String.specialChar[match[0]];
      return character ? character : '\\u00' + match[0].charCodeAt().toPaddedString(2, 16);
    });
    if (useDoubleQuotes) return '"' + escapedString.replace(/"/g, '\\"') + '"';
    return "'" + escapedString.replace(/'/g, '\\\'') + "'";
  },

  toJSON: function() {
    return this.inspect(true);
  },

  unfilterJSON: function(filter) {
    return this.sub(filter || Prototype.JSONFilter, '#{1}');
  },

  isJSON: function() {
    var str = this;
    if (str.blank()) return false;
    str = this.replace(/\\./g, '@').replace(/"[^"\\\n\r]*"/g, '');
    return (/^[,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]*$/).test(str);
  },

  evalJSON: function(sanitize) {
    var json = this.unfilterJSON();
    try {
      if (!sanitize || json.isJSON()) return eval('(' + json + ')');
    } catch (e) { }
    throw new SyntaxError('Badly formed JSON string: ' + this.inspect());
  },

  include: function(pattern) {
    return this.indexOf(pattern) > -1;
  },

  startsWith: function(pattern) {
    return this.indexOf(pattern) === 0;
  },

  endsWith: function(pattern) {
    var d = this.length - pattern.length;
    return d >= 0 && this.lastIndexOf(pattern) === d;
  },

  empty: function() {
    return this == '';
  },

  blank: function() {
    return /^\s*$/.test(this);
  },

  interpolate: function(object, pattern) {
    return new Template(this, pattern).evaluate(object);
  }
});

if (Prototype.Browser.WebKit || Prototype.Browser.IE) Object.extend(String.prototype, {
  escapeHTML: function() {
    return this.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  },
  unescapeHTML: function() {
    return this.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
  }
});

String.prototype.gsub.prepareReplacement = function(replacement) {
  if (Object.isFunction(replacement)) return replacement;
  var template = new Template(replacement);
  return function(match) { return template.evaluate(match) };
};

String.prototype.parseQuery = String.prototype.toQueryParams;

Object.extend(String.prototype.escapeHTML, {
  div:  document.createElement('div'),
  text: document.createTextNode('')
});

with (String.prototype.escapeHTML) div.appendChild(text);

var Template = Class.create({
  initialize: function(template, pattern) {
    this.template = template.toString();
    this.pattern = pattern || Template.Pattern;
  },

  evaluate: function(object) {
    if (Object.isFunction(object.toTemplateReplacements))
      object = object.toTemplateReplacements();

    return this.template.gsub(this.pattern, function(match) {
      if (object == null) return '';

      var before = match[1] || '';
      if (before == '\\') return match[2];

      var ctx = object, expr = match[3];
      var pattern = /^([^.[]+|\[((?:.*?[^\\])?)\])(\.|\[|$)/;
      match = pattern.exec(expr);
      if (match == null) return before;

      while (match != null) {
        var comp = match[1].startsWith('[') ? match[2].gsub('\\\\]', ']') : match[1];
        ctx = ctx[comp];
        if (null == ctx || '' == match[3]) break;
        expr = expr.substring('[' == match[3] ? match[1].length : match[0].length);
        match = pattern.exec(expr);
      }

      return before + String.interpret(ctx);
    }.bind(this));
  }
});
Template.Pattern = /(^|.|\r|\n)(#\{(.*?)\})/;

var $break = { };

var Enumerable = {
  each: function(iterator, context) {
    var index = 0;
    iterator = iterator.bind(context);
    try {
      this._each(function(value) {
        iterator(value, index++);
      });
    } catch (e) {
      if (e != $break) throw e;
    }
    return this;
  },

  eachSlice: function(number, iterator, context) {
    iterator = iterator ? iterator.bind(context) : Prototype.K;
    var index = -number, slices = [], array = this.toArray();
    while ((index += number) < array.length)
      slices.push(array.slice(index, index+number));
    return slices.collect(iterator, context);
  },

  all: function(iterator, context) {
    iterator = iterator ? iterator.bind(context) : Prototype.K;
    var result = true;
    this.each(function(value, index) {
      result = result && !!iterator(value, index);
      if (!result) throw $break;
    });
    return result;
  },

  any: function(iterator, context) {
    iterator = iterator ? iterator.bind(context) : Prototype.K;
    var result = false;
    this.each(function(value, index) {
      if (result = !!iterator(value, index))
        throw $break;
    });
    return result;
  },

  collect: function(iterator, context) {
    iterator = iterator ? iterator.bind(context) : Prototype.K;
    var results = [];
    this.each(function(value, index) {
      results.push(iterator(value, index));
    });
    return results;
  },

  detect: function(iterator, context) {
    iterator = iterator.bind(context);
    var result;
    this.each(function(value, index) {
      if (iterator(value, index)) {
        result = value;
        throw $break;
      }
    });
    return result;
  },

  findAll: function(iterator, context) {
    iterator = iterator.bind(context);
    var results = [];
    this.each(function(value, index) {
      if (iterator(value, index))
        results.push(value);
    });
    return results;
  },

  grep: function(filter, iterator, context) {
    iterator = iterator ? iterator.bind(context) : Prototype.K;
    var results = [];

    if (Object.isString(filter))
      filter = new RegExp(filter);

    this.each(function(value, index) {
      if (filter.match(value))
        results.push(iterator(value, index));
    });
    return results;
  },

  include: function(object) {
    if (Object.isFunction(this.indexOf))
      if (this.indexOf(object) != -1) return true;

    var found = false;
    this.each(function(value) {
      if (value == object) {
        found = true;
        throw $break;
      }
    });
    return found;
  },

  inGroupsOf: function(number, fillWith) {
    fillWith = Object.isUndefined(fillWith) ? null : fillWith;
    return this.eachSlice(number, function(slice) {
      while(slice.length < number) slice.push(fillWith);
      return slice;
    });
  },

  inject: function(memo, iterator, context) {
    iterator = iterator.bind(context);
    this.each(function(value, index) {
      memo = iterator(memo, value, index);
    });
    return memo;
  },

  invoke: function(method) {
    var args = $A(arguments).slice(1);
    return this.map(function(value) {
      return value[method].apply(value, args);
    });
  },

  max: function(iterator, context) {
    iterator = iterator ? iterator.bind(context) : Prototype.K;
    var result;
    this.each(function(value, index) {
      value = iterator(value, index);
      if (result == null || value >= result)
        result = value;
    });
    return result;
  },

  min: function(iterator, context) {
    iterator = iterator ? iterator.bind(context) : Prototype.K;
    var result;
    this.each(function(value, index) {
      value = iterator(value, index);
      if (result == null || value < result)
        result = value;
    });
    return result;
  },

  partition: function(iterator, context) {
    iterator = iterator ? iterator.bind(context) : Prototype.K;
    var trues = [], falses = [];
    this.each(function(value, index) {
      (iterator(value, index) ?
        trues : falses).push(value);
    });
    return [trues, falses];
  },

  pluck: function(property) {
    var results = [];
    this.each(function(value) {
      results.push(value[property]);
    });
    return results;
  },

  reject: function(iterator, context) {
    iterator = iterator.bind(context);
    var results = [];
    this.each(function(value, index) {
      if (!iterator(value, index))
        results.push(value);
    });
    return results;
  },

  sortBy: function(iterator, context) {
    iterator = iterator.bind(context);
    return this.map(function(value, index) {
      return {value: value, criteria: iterator(value, index)};
    }).sort(function(left, right) {
      var a = left.criteria, b = right.criteria;
      return a < b ? -1 : a > b ? 1 : 0;
    }).pluck('value');
  },

  toArray: function() {
    return this.map();
  },

  zip: function() {
    var iterator = Prototype.K, args = $A(arguments);
    if (Object.isFunction(args.last()))
      iterator = args.pop();

    var collections = [this].concat(args).map($A);
    return this.map(function(value, index) {
      return iterator(collections.pluck(index));
    });
  },

  size: function() {
    return this.toArray().length;
  },

  inspect: function() {
    return '#<Enumerable:' + this.toArray().inspect() + '>';
  }
};

Object.extend(Enumerable, {
  map:     Enumerable.collect,
  find:    Enumerable.detect,
  select:  Enumerable.findAll,
  filter:  Enumerable.findAll,
  member:  Enumerable.include,
  entries: Enumerable.toArray,
  every:   Enumerable.all,
  some:    Enumerable.any
});
function $A(iterable) {
  if (!iterable) return [];
  if (iterable.toArray) return iterable.toArray();
  var length = iterable.length, results = new Array(length);
  while (length--) results[length] = iterable[length];
  return results;
}

if (Prototype.Browser.WebKit) {
  function $A(iterable) {
    if (!iterable) return [];
    if (!(Object.isFunction(iterable) && iterable == '[object NodeList]') &&
        iterable.toArray) return iterable.toArray();
    var length = iterable.length, results = new Array(length);
    while (length--) results[length] = iterable[length];
    return results;
  }
}

Array.from = $A;

Object.extend(Array.prototype, Enumerable);

if (!Array.prototype._reverse) Array.prototype._reverse = Array.prototype.reverse;

Object.extend(Array.prototype, {
  _each: function(iterator) {
    for (var i = 0, length = this.length; i < length; i++)
      iterator(this[i]);
  },

  clear: function() {
    this.length = 0;
    return this;
  },

  first: function() {
    return this[0];
  },

  last: function() {
    return this[this.length - 1];
  },

  compact: function() {
    return this.select(function(value) {
      return value != null;
    });
  },

  flatten: function() {
    return this.inject([], function(array, value) {
      return array.concat(Object.isArray(value) ?
        value.flatten() : [value]);
    });
  },

  without: function() {
    var values = $A(arguments);
    return this.select(function(value) {
      return !values.include(value);
    });
  },

  reverse: function(inline) {
    return (inline !== false ? this : this.toArray())._reverse();
  },

  reduce: function() {
    return this.length > 1 ? this : this[0];
  },

  uniq: function(sorted) {
    return this.inject([], function(array, value, index) {
      if (0 == index || (sorted ? array.last() != value : !array.include(value)))
        array.push(value);
      return array;
    });
  },

  intersect: function(array) {
    return this.uniq().findAll(function(item) {
      return array.detect(function(value) { return item === value });
    });
  },

  clone: function() {
    return [].concat(this);
  },

  size: function() {
    return this.length;
  },

  inspect: function() {
    return '[' + this.map(Object.inspect).join(', ') + ']';
  },

  toJSON: function() {
    var results = [];
    this.each(function(object) {
      var value = Object.toJSON(object);
      if (!Object.isUndefined(value)) results.push(value);
    });
    return '[' + results.join(', ') + ']';
  }
});

// use native browser JS 1.6 implementation if available
if (Object.isFunction(Array.prototype.forEach))
  Array.prototype._each = Array.prototype.forEach;

if (!Array.prototype.indexOf) Array.prototype.indexOf = function(item, i) {
  i || (i = 0);
  var length = this.length;
  if (i < 0) i = length + i;
  for (; i < length; i++)
    if (this[i] === item) return i;
  return -1;
};

if (!Array.prototype.lastIndexOf) Array.prototype.lastIndexOf = function(item, i) {
  i = isNaN(i) ? this.length : (i < 0 ? this.length + i : i) + 1;
  var n = this.slice(0, i).reverse().indexOf(item);
  return (n < 0) ? n : i - n - 1;
};

Array.prototype.toArray = Array.prototype.clone;

function $w(string) {
  if (!Object.isString(string)) return [];
  string = string.strip();
  return string ? string.split(/\s+/) : [];
}

if (Prototype.Browser.Opera){
  Array.prototype.concat = function() {
    var array = [];
    for (var i = 0, length = this.length; i < length; i++) array.push(this[i]);
    for (var i = 0, length = arguments.length; i < length; i++) {
      if (Object.isArray(arguments[i])) {
        for (var j = 0, arrayLength = arguments[i].length; j < arrayLength; j++)
          array.push(arguments[i][j]);
      } else {
        array.push(arguments[i]);
      }
    }
    return array;
  };
}
Object.extend(Number.prototype, {
  toColorPart: function() {
    return this.toPaddedString(2, 16);
  },

  succ: function() {
    return this + 1;
  },

  times: function(iterator) {
    $R(0, this, true).each(iterator);
    return this;
  },

  toPaddedString: function(length, radix) {
    var string = this.toString(radix || 10);
    return '0'.times(length - string.length) + string;
  },

  toJSON: function() {
    return isFinite(this) ? this.toString() : 'null';
  }
});

$w('abs round ceil floor').each(function(method){
  Number.prototype[method] = Math[method].methodize();
});
function $H(object) {
  return new Hash(object);
};

var Hash = Class.create(Enumerable, (function() {

  function toQueryPair(key, value) {
    if (Object.isUndefined(value)) return key;
    return key + '=' + encodeURIComponent(String.interpret(value));
  }

  return {
    initialize: function(object) {
      this._object = Object.isHash(object) ? object.toObject() : Object.clone(object);
    },

    _each: function(iterator) {
      for (var key in this._object) {
        var value = this._object[key], pair = [key, value];
        pair.key = key;
        pair.value = value;
        iterator(pair);
      }
    },

    set: function(key, value) {
      return this._object[key] = value;
    },

    get: function(key) {
      return this._object[key];
    },

    unset: function(key) {
      var value = this._object[key];
      delete this._object[key];
      return value;
    },

    toObject: function() {
      return Object.clone(this._object);
    },

    keys: function() {
      return this.pluck('key');
    },

    values: function() {
      return this.pluck('value');
    },

    index: function(value) {
      var match = this.detect(function(pair) {
        return pair.value === value;
      });
      return match && match.key;
    },

    merge: function(object) {
      return this.clone().update(object);
    },

    update: function(object) {
      return new Hash(object).inject(this, function(result, pair) {
        result.set(pair.key, pair.value);
        return result;
      });
    },

    toQueryString: function() {
      return this.map(function(pair) {
        var key = encodeURIComponent(pair.key), values = pair.value;

        if (values && typeof values == 'object') {
          if (Object.isArray(values))
            return values.map(toQueryPair.curry(key)).join('&');
        }
        return toQueryPair(key, values);
      }).join('&');
    },

    inspect: function() {
      return '#<Hash:{' + this.map(function(pair) {
        return pair.map(Object.inspect).join(': ');
      }).join(', ') + '}>';
    },

    toJSON: function() {
      return Object.toJSON(this.toObject());
    },

    clone: function() {
      return new Hash(this);
    }
  }
})());

Hash.prototype.toTemplateReplacements = Hash.prototype.toObject;
Hash.from = $H;
var ObjectRange = Class.create(Enumerable, {
  initialize: function(start, end, exclusive) {
    this.start = start;
    this.end = end;
    this.exclusive = exclusive;
  },

  _each: function(iterator) {
    var value = this.start;
    while (this.include(value)) {
      iterator(value);
      value = value.succ();
    }
  },

  include: function(value) {
    if (value < this.start)
      return false;
    if (this.exclusive)
      return value < this.end;
    return value <= this.end;
  }
});

var $R = function(start, end, exclusive) {
  return new ObjectRange(start, end, exclusive);
};

var Ajax = {
  getTransport: function() {
    return Try.these(
      function() {return new XMLHttpRequest()},
      function() {return new ActiveXObject('Msxml2.XMLHTTP')},
      function() {return new ActiveXObject('Microsoft.XMLHTTP')}
    ) || false;
  },

  activeRequestCount: 0
};

Ajax.Responders = {
  responders: [],

  _each: function(iterator) {
    this.responders._each(iterator);
  },

  register: function(responder) {
    if (!this.include(responder))
      this.responders.push(responder);
  },

  unregister: function(responder) {
    this.responders = this.responders.without(responder);
  },

  dispatch: function(callback, request, transport, json) {
    this.each(function(responder) {
      if (Object.isFunction(responder[callback])) {
        try {
          responder[callback].apply(responder, [request, transport, json]);
        } catch (e) { }
      }
    });
  }
};

Object.extend(Ajax.Responders, Enumerable);

Ajax.Responders.register({
  onCreate:   function() { Ajax.activeRequestCount++ },
  onComplete: function() { Ajax.activeRequestCount-- }
});

Ajax.Base = Class.create({
  initialize: function(options) {
    this.options = {
      method:       'post',
      asynchronous: true,
      contentType:  'application/x-www-form-urlencoded',
      encoding:     'UTF-8',
      parameters:   '',
      evalJSON:     true,
      evalJS:       true
    };
    Object.extend(this.options, options || { });

    this.options.method = this.options.method.toLowerCase();

    if (Object.isString(this.options.parameters))
      this.options.parameters = this.options.parameters.toQueryParams();
    else if (Object.isHash(this.options.parameters))
      this.options.parameters = this.options.parameters.toObject();
  }
});

Ajax.Request = Class.create(Ajax.Base, {
  _complete: false,

  initialize: function($super, url, options) {
    $super(options);
    this.transport = Ajax.getTransport();
    this.request(url);
  },

  request: function(url) {
    this.url = url;
    this.method = this.options.method;
    var params = Object.clone(this.options.parameters);

    if (!['get', 'post'].include(this.method)) {
      // simulate other verbs over post
      params['_method'] = this.method;
      this.method = 'post';
    }

    this.parameters = params;

    if (params = Object.toQueryString(params)) {
      // when GET, append parameters to URL
      if (this.method == 'get')
        this.url += (this.url.include('?') ? '&' : '?') + params;
      else if (/Konqueror|Safari|KHTML/.test(navigator.userAgent))
        params += '&_=';
    }

    try {
      var response = new Ajax.Response(this);
      if (this.options.onCreate) this.options.onCreate(response);
      Ajax.Responders.dispatch('onCreate', this, response);

      this.transport.open(this.method.toUpperCase(), this.url,
        this.options.asynchronous);

      if (this.options.asynchronous) this.respondToReadyState.bind(this).defer(1);

      this.transport.onreadystatechange = this.onStateChange.bind(this);
      this.setRequestHeaders();

      this.body = this.method == 'post' ? (this.options.postBody || params) : null;
      this.transport.send(this.body);

      /* Force Firefox to handle ready state 4 for synchronous requests */
      if (!this.options.asynchronous && this.transport.overrideMimeType)
        this.onStateChange();

    }
    catch (e) {
      this.dispatchException(e);
    }
  },

  onStateChange: function() {
    var readyState = this.transport.readyState;
    if (readyState > 1 && !((readyState == 4) && this._complete))
      this.respondToReadyState(this.transport.readyState);
  },

  setRequestHeaders: function() {
    var headers = {
      'X-Requested-With': 'XMLHttpRequest',
      'X-Prototype-Version': Prototype.Version,
      'Accept': 'text/javascript, text/html, application/xml, text/xml, */*'
    };

    if (this.method == 'post') {
      headers['Content-type'] = this.options.contentType +
        (this.options.encoding ? '; charset=' + this.options.encoding : '');

      /* Force "Connection: close" for older Mozilla browsers to work
       * around a bug where XMLHttpRequest sends an incorrect
       * Content-length header. See Mozilla Bugzilla #246651.
       */
      if (this.transport.overrideMimeType &&
          (navigator.userAgent.match(/Gecko\/(\d{4})/) || [0,2005])[1] < 2005)
            headers['Connection'] = 'close';
    }

    // user-defined headers
    if (typeof this.options.requestHeaders == 'object') {
      var extras = this.options.requestHeaders;

      if (Object.isFunction(extras.push))
        for (var i = 0, length = extras.length; i < length; i += 2)
          headers[extras[i]] = extras[i+1];
      else
        $H(extras).each(function(pair) { headers[pair.key] = pair.value });
    }

    for (var name in headers)
      this.transport.setRequestHeader(name, headers[name]);
  },

  success: function() {
    var status = this.getStatus();
    return !status || (status >= 200 && status < 300);
  },

  getStatus: function() {
    try {
      return this.transport.status || 0;
    } catch (e) { return 0 }
  },

  respondToReadyState: function(readyState) {
    var state = Ajax.Request.Events[readyState], response = new Ajax.Response(this);

    if (state == 'Complete') {
      try {
        this._complete = true;
        (this.options['on' + response.status]
         || this.options['on' + (this.success() ? 'Success' : 'Failure')]
         || Prototype.emptyFunction)(response, response.headerJSON);
      } catch (e) {
        this.dispatchException(e);
      }

      var contentType = response.getHeader('Content-type');
      if (this.options.evalJS == 'force'
          || (this.options.evalJS && contentType
          && contentType.match(/^\s*(text|application)\/(x-)?(java|ecma)script(;.*)?\s*$/i)))
        this.evalResponse();
    }

    try {
      (this.options['on' + state] || Prototype.emptyFunction)(response, response.headerJSON);
      Ajax.Responders.dispatch('on' + state, this, response, response.headerJSON);
    } catch (e) {
      this.dispatchException(e);
    }

    if (state == 'Complete') {
      // avoid memory leak in MSIE: clean up
      this.transport.onreadystatechange = Prototype.emptyFunction;
    }
  },

  getHeader: function(name) {
    try {
      return this.transport.getResponseHeader(name);
    } catch (e) { return null }
  },

  evalResponse: function() {
    try {
      return eval((this.transport.responseText || '').unfilterJSON());
    } catch (e) {
      this.dispatchException(e);
    }
  },

  dispatchException: function(exception) {
    (this.options.onException || Prototype.emptyFunction)(this, exception);
    Ajax.Responders.dispatch('onException', this, exception);
  }
});

Ajax.Request.Events =
  ['Uninitialized', 'Loading', 'Loaded', 'Interactive', 'Complete'];

Ajax.Response = Class.create({
  initialize: function(request){
    this.request = request;
    var transport  = this.transport  = request.transport,
        readyState = this.readyState = transport.readyState;

    if((readyState > 2 && !Prototype.Browser.IE) || readyState == 4) {
      this.status       = this.getStatus();
      this.statusText   = this.getStatusText();
      this.responseText = String.interpret(transport.responseText);
      this.headerJSON   = this._getHeaderJSON();
    }

    if(readyState == 4) {
      var xml = transport.responseXML;
      this.responseXML  = Object.isUndefined(xml) ? null : xml;
      this.responseJSON = this._getResponseJSON();
    }
  },

  status:      0,
  statusText: '',

  getStatus: Ajax.Request.prototype.getStatus,

  getStatusText: function() {
    try {
      return this.transport.statusText || '';
    } catch (e) { return '' }
  },

  getHeader: Ajax.Request.prototype.getHeader,

  getAllHeaders: function() {
    try {
      return this.getAllResponseHeaders();
    } catch (e) { return null }
  },

  getResponseHeader: function(name) {
    return this.transport.getResponseHeader(name);
  },

  getAllResponseHeaders: function() {
    return this.transport.getAllResponseHeaders();
  },

  _getHeaderJSON: function() {
    var json = this.getHeader('X-JSON');
    if (!json) return null;
    json = decodeURIComponent(escape(json));
    try {
      return json.evalJSON(this.request.options.sanitizeJSON);
    } catch (e) {
      this.request.dispatchException(e);
    }
  },

  _getResponseJSON: function() {
    var options = this.request.options;
    if (!options.evalJSON || (options.evalJSON != 'force' &&
      !(this.getHeader('Content-type') || '').include('application/json')) ||
        this.responseText.blank())
          return null;
    try {
      return this.responseText.evalJSON(options.sanitizeJSON);
    } catch (e) {
      this.request.dispatchException(e);
    }
  }
});

Ajax.Updater = Class.create(Ajax.Request, {
  initialize: function($super, container, url, options) {
    this.container = {
      success: (container.success || container),
      failure: (container.failure || (container.success ? null : container))
    };

    options = Object.clone(options);
    var onComplete = options.onComplete;
    options.onComplete = (function(response, json) {
      this.updateContent(response.responseText);
      if (Object.isFunction(onComplete)) onComplete(response, json);
    }).bind(this);

    $super(url, options);
  },

  updateContent: function(responseText) {
    var receiver = this.container[this.success() ? 'success' : 'failure'],
        options = this.options;

    if (!options.evalScripts) responseText = responseText.stripScripts();

    if (receiver = $(receiver)) {
      if (options.insertion) {
        if (Object.isString(options.insertion)) {
          var insertion = { }; insertion[options.insertion] = responseText;
          receiver.insert(insertion);
        }
        else options.insertion(receiver, responseText);
      }
      else receiver.update(responseText);
    }
  }
});

Ajax.PeriodicalUpdater = Class.create(Ajax.Base, {
  initialize: function($super, container, url, options) {
    $super(options);
    this.onComplete = this.options.onComplete;

    this.frequency = (this.options.frequency || 2);
    this.decay = (this.options.decay || 1);

    this.updater = { };
    this.container = container;
    this.url = url;

    this.start();
  },

  start: function() {
    this.options.onComplete = this.updateComplete.bind(this);
    this.onTimerEvent();
  },

  stop: function() {
    this.updater.options.onComplete = undefined;
    clearTimeout(this.timer);
    (this.onComplete || Prototype.emptyFunction).apply(this, arguments);
  },

  updateComplete: function(response) {
    if (this.options.decay) {
      this.decay = (response.responseText == this.lastText ?
        this.decay * this.options.decay : 1);

      this.lastText = response.responseText;
    }
    this.timer = this.onTimerEvent.bind(this).delay(this.decay * this.frequency);
  },

  onTimerEvent: function() {
    this.updater = new Ajax.Updater(this.container, this.url, this.options);
  }
});
function $(element) {
  if (arguments.length > 1) {
    for (var i = 0, elements = [], length = arguments.length; i < length; i++)
      elements.push($(arguments[i]));
    return elements;
  }
  if (Object.isString(element))
    element = document.getElementById(element);
  return Element.extend(element);
}

if (Prototype.BrowserFeatures.XPath) {
  document._getElementsByXPath = function(expression, parentElement) {
    var results = [];
    var query = document.evaluate(expression, $(parentElement) || document,
      null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    for (var i = 0, length = query.snapshotLength; i < length; i++)
      results.push(Element.extend(query.snapshotItem(i)));
    return results;
  };
}

/*--------------------------------------------------------------------------*/

if (!window.Node) var Node = { };

if (!Node.ELEMENT_NODE) {
  // DOM level 2 ECMAScript Language Binding
  Object.extend(Node, {
    ELEMENT_NODE: 1,
    ATTRIBUTE_NODE: 2,
    TEXT_NODE: 3,
    CDATA_SECTION_NODE: 4,
    ENTITY_REFERENCE_NODE: 5,
    ENTITY_NODE: 6,
    PROCESSING_INSTRUCTION_NODE: 7,
    COMMENT_NODE: 8,
    DOCUMENT_NODE: 9,
    DOCUMENT_TYPE_NODE: 10,
    DOCUMENT_FRAGMENT_NODE: 11,
    NOTATION_NODE: 12
  });
}

(function() {
  var element = this.Element;
  this.Element = function(tagName, attributes) {
    attributes = attributes || { };
    tagName = tagName.toLowerCase();
    var cache = Element.cache;
    if (Prototype.Browser.IE && attributes.name) {
      tagName = '<' + tagName + ' name="' + attributes.name + '">';
      delete attributes.name;
      return Element.writeAttribute(document.createElement(tagName), attributes);
    }
    if (!cache[tagName]) cache[tagName] = Element.extend(document.createElement(tagName));
    return Element.writeAttribute(cache[tagName].cloneNode(false), attributes);
  };
  Object.extend(this.Element, element || { });
}).call(window);

Element.cache = { };

Element.Methods = {
  visible: function(element) {
    return $(element).style.display != 'none';
  },

  toggle: function(element) {
    element = $(element);
    Element[Element.visible(element) ? 'hide' : 'show'](element);
    return element;
  },

  hide: function(element) {
    $(element).style.display = 'none';
    return element;
  },

  show: function(element) {
    $(element).style.display = '';
    return element;
  },

  remove: function(element) {
    element = $(element);
    element.parentNode.removeChild(element);
    return element;
  },

  update: function(element, content) {
    element = $(element);
    if (content && content.toElement) content = content.toElement();
    if (Object.isElement(content)) return element.update().insert(content);
    content = Object.toHTML(content);
    element.innerHTML = content.stripScripts();
    content.evalScripts.bind(content).defer();
    return element;
  },

  replace: function(element, content) {
    element = $(element);
    if (content && content.toElement) content = content.toElement();
    else if (!Object.isElement(content)) {
      content = Object.toHTML(content);
      var range = element.ownerDocument.createRange();
      range.selectNode(element);
      content.evalScripts.bind(content).defer();
      content = range.createContextualFragment(content.stripScripts());
    }
    element.parentNode.replaceChild(content, element);
    return element;
  },

  insert: function(element, insertions) {
    element = $(element);

    if (Object.isString(insertions) || Object.isNumber(insertions) ||
        Object.isElement(insertions) || (insertions && (insertions.toElement || insertions.toHTML)))
          insertions = {bottom:insertions};

    var content, t, range;

    for (position in insertions) {
      content  = insertions[position];
      position = position.toLowerCase();
      t = Element._insertionTranslations[position];

      if (content && content.toElement) content = content.toElement();
      if (Object.isElement(content)) {
        t.insert(element, content);
        continue;
      }

      content = Object.toHTML(content);

      range = element.ownerDocument.createRange();
      t.initializeRange(element, range);
      t.insert(element, range.createContextualFragment(content.stripScripts()));

      content.evalScripts.bind(content).defer();
    }

    return element;
  },

  wrap: function(element, wrapper, attributes) {
    element = $(element);
    if (Object.isElement(wrapper))
      $(wrapper).writeAttribute(attributes || { });
    else if (Object.isString(wrapper)) wrapper = new Element(wrapper, attributes);
    else wrapper = new Element('div', wrapper);
    if (element.parentNode)
      element.parentNode.replaceChild(wrapper, element);
    wrapper.appendChild(element);
    return wrapper;
  },

  inspect: function(element) {
    element = $(element);
    var result = '<' + element.tagName.toLowerCase();
    $H({'id': 'id', 'className': 'class'}).each(function(pair) {
      var property = pair.first(), attribute = pair.last();
      var value = (element[property] || '').toString();
      if (value) result += ' ' + attribute + '=' + value.inspect(true);
    });
    return result + '>';
  },

  recursivelyCollect: function(element, property) {
    element = $(element);
    var elements = [];
    while (element = element[property])
      if (element.nodeType == 1)
        elements.push(Element.extend(element));
    return elements;
  },

  ancestors: function(element) {
    return $(element).recursivelyCollect('parentNode');
  },

  descendants: function(element) {
    return $(element).getElementsBySelector("*");
  },

  firstDescendant: function(element) {
    element = $(element).firstChild;
    while (element && element.nodeType != 1) element = element.nextSibling;
    return $(element);
  },

  immediateDescendants: function(element) {
    if (!(element = $(element).firstChild)) return [];
    while (element && element.nodeType != 1) element = element.nextSibling;
    if (element) return [element].concat($(element).nextSiblings());
    return [];
  },

  previousSiblings: function(element) {
    return $(element).recursivelyCollect('previousSibling');
  },

  nextSiblings: function(element) {
    return $(element).recursivelyCollect('nextSibling');
  },

  siblings: function(element) {
    element = $(element);
    return element.previousSiblings().reverse().concat(element.nextSiblings());
  },

  match: function(element, selector) {
    if (Object.isString(selector))
      selector = new Selector(selector);
    return selector.match($(element));
  },

  up: function(element, expression, index) {
    element = $(element);
    if (arguments.length == 1) return $(element.parentNode);
    var ancestors = element.ancestors();
    return expression ? Selector.findElement(ancestors, expression, index) :
      ancestors[index || 0];
  },

  down: function(element, expression, index) {
    element = $(element);
    if (arguments.length == 1) return element.firstDescendant();
    var descendants = element.descendants();
    return expression ? Selector.findElement(descendants, expression, index) :
      descendants[index || 0];
  },

  previous: function(element, expression, index) {
    element = $(element);
    if (arguments.length == 1) return $(Selector.handlers.previousElementSibling(element));
    var previousSiblings = element.previousSiblings();
    return expression ? Selector.findElement(previousSiblings, expression, index) :
      previousSiblings[index || 0];
  },

  next: function(element, expression, index) {
    element = $(element);
    if (arguments.length == 1) return $(Selector.handlers.nextElementSibling(element));
    var nextSiblings = element.nextSiblings();
    return expression ? Selector.findElement(nextSiblings, expression, index) :
      nextSiblings[index || 0];
  },

  select: function() {
    var args = $A(arguments), element = $(args.shift());
    return Selector.findChildElements(element, args);
  },

  adjacent: function() {
    var args = $A(arguments), element = $(args.shift());
    return Selector.findChildElements(element.parentNode, args).without(element);
  },

  identify: function(element) {
    element = $(element);
    var id = element.readAttribute('id'), self = arguments.callee;
    if (id) return id;
    do { id = 'anonymous_element_' + self.counter++ } while ($(id));
    element.writeAttribute('id', id);
    return id;
  },

  readAttribute: function(element, name) {
    element = $(element);
    if (Prototype.Browser.IE) {
      var t = Element._attributeTranslations.read;
      if (t.values[name]) return t.values[name](element, name);
      if (t.names[name]) name = t.names[name];
      if (name.include(':')) {
        return (!element.attributes || !element.attributes[name]) ? null :
         element.attributes[name].value;
      }
    }
    return element.getAttribute(name);
  },

  writeAttribute: function(element, name, value) {
    element = $(element);
    var attributes = { }, t = Element._attributeTranslations.write;

    if (typeof name == 'object') attributes = name;
    else attributes[name] = Object.isUndefined(value) ? true : value;

    for (var attr in attributes) {
      name = t.names[attr] || attr;
      value = attributes[attr];
      if (t.values[attr]) name = t.values[attr](element, value);
      if (value === false || value === null)
        element.removeAttribute(name);
      else if (value === true)
        element.setAttribute(name, name);
      else element.setAttribute(name, value);
    }
    return element;
  },

  getHeight: function(element) {
    return $(element).getDimensions().height;
  },

  getWidth: function(element) {
    return $(element).getDimensions().width;
  },

  classNames: function(element) {
    return new Element.ClassNames(element);
  },

  hasClassName: function(element, className) {
    if (!(element = $(element))) return;
    var elementClassName = element.className;
    return (elementClassName.length > 0 && (elementClassName == className ||
      new RegExp("(^|\\s)" + className + "(\\s|$)").test(elementClassName)));
  },

  addClassName: function(element, className) {
    if (!(element = $(element))) return;
    if (!element.hasClassName(className))
      element.className += (element.className ? ' ' : '') + className;
    return element;
  },

  removeClassName: function(element, className) {
    if (!(element = $(element))) return;
    element.className = element.className.replace(
      new RegExp("(^|\\s+)" + className + "(\\s+|$)"), ' ').strip();
    return element;
  },

  toggleClassName: function(element, className) {
    if (!(element = $(element))) return;
    return element[element.hasClassName(className) ?
      'removeClassName' : 'addClassName'](className);
  },

  // removes whitespace-only text node children
  cleanWhitespace: function(element) {
    element = $(element);
    var node = element.firstChild;
    while (node) {
      var nextNode = node.nextSibling;
      if (node.nodeType == 3 && !/\S/.test(node.nodeValue))
        element.removeChild(node);
      node = nextNode;
    }
    return element;
  },

  empty: function(element) {
    return $(element).innerHTML.blank();
  },

  descendantOf: function(element, ancestor) {
    element = $(element), ancestor = $(ancestor);
    var originalAncestor = ancestor;

    if (element.compareDocumentPosition)
      return (element.compareDocumentPosition(ancestor) & 8) === 8;

    if (element.sourceIndex && !Prototype.Browser.Opera) {
      var e = element.sourceIndex, a = ancestor.sourceIndex,
       nextAncestor = ancestor.nextSibling;
      if (!nextAncestor) {
        do { ancestor = ancestor.parentNode; }
        while (!(nextAncestor = ancestor.nextSibling) && ancestor.parentNode);
      }
      if (nextAncestor) return (e > a && e < nextAncestor.sourceIndex);
    }

    while (element = element.parentNode)
      if (element == originalAncestor) return true;
    return false;
  },

  scrollTo: function(element) {
    element = $(element);
    var pos = element.cumulativeOffset();
    window.scrollTo(pos[0], pos[1]);
    return element;
  },

  getStyle: function(element, style) {
    element = $(element);
    style = style == 'float' ? 'cssFloat' : style.camelize();
    var value = element.style[style];
    if (!value) {
      var css = document.defaultView.getComputedStyle(element, null);
      value = css ? css[style] : null;
    }
    if (style == 'opacity') return value ? parseFloat(value) : 1.0;
    return value == 'auto' ? null : value;
  },

  getOpacity: function(element) {
    return $(element).getStyle('opacity');
  },

  setStyle: function(element, styles) {
    element = $(element);
    var elementStyle = element.style, match;
    if (Object.isString(styles)) {
      element.style.cssText += ';' + styles;
      return styles.include('opacity') ?
        element.setOpacity(styles.match(/opacity:\s*(\d?\.?\d*)/)[1]) : element;
    }
    for (var property in styles)
      if (property == 'opacity') element.setOpacity(styles[property]);
      else
        elementStyle[(property == 'float' || property == 'cssFloat') ?
          (Object.isUndefined(elementStyle.styleFloat) ? 'cssFloat' : 'styleFloat') :
            property] = styles[property];

    return element;
  },

  setOpacity: function(element, value) {
    element = $(element);
    element.style.opacity = (value == 1 || value === '') ? '' :
      (value < 0.00001) ? 0 : value;
    return element;
  },

  getDimensions: function(element) {
    element = $(element);
    var display = $(element).getStyle('display');
    if (display != 'none' && display != null) // Safari bug
      return {width: element.offsetWidth, height: element.offsetHeight};

    // All *Width and *Height properties give 0 on elements with display none,
    // so enable the element temporarily
    var els = element.style;
    var originalVisibility = els.visibility;
    var originalPosition = els.position;
    var originalDisplay = els.display;
    els.visibility = 'hidden';
    els.position = 'absolute';
    els.display = 'block';
    var originalWidth = element.clientWidth;
    var originalHeight = element.clientHeight;
    els.display = originalDisplay;
    els.position = originalPosition;
    els.visibility = originalVisibility;
    return {width: originalWidth, height: originalHeight};
  },

  makePositioned: function(element) {
    element = $(element);
    var pos = Element.getStyle(element, 'position');
    if (pos == 'static' || !pos) {
      element._madePositioned = true;
      element.style.position = 'relative';
      // Opera returns the offset relative to the positioning context, when an
      // element is position relative but top and left have not been defined
      if (window.opera) {
        element.style.top = 0;
        element.style.left = 0;
      }
    }
    return element;
  },

  undoPositioned: function(element) {
    element = $(element);
    if (element._madePositioned) {
      element._madePositioned = undefined;
      element.style.position =
        element.style.top =
        element.style.left =
        element.style.bottom =
        element.style.right = '';
    }
    return element;
  },

  makeClipping: function(element) {
    element = $(element);
    if (element._overflow) return element;
    element._overflow = Element.getStyle(element, 'overflow') || 'auto';
    if (element._overflow !== 'hidden')
      element.style.overflow = 'hidden';
    return element;
  },

  undoClipping: function(element) {
    element = $(element);
    if (!element._overflow) return element;
    element.style.overflow = element._overflow == 'auto' ? '' : element._overflow;
    element._overflow = null;
    return element;
  },

  cumulativeOffset: function(element) {
    var valueT = 0, valueL = 0;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;
      element = element.offsetParent;
    } while (element);
    return Element._returnOffset(valueL, valueT);
  },

  positionedOffset: function(element) {
    var valueT = 0, valueL = 0;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;
      element = element.offsetParent;
      if (element) {
        if (element.tagName == 'BODY') break;
        var p = Element.getStyle(element, 'position');
        if (p == 'relative' || p == 'absolute') break;
      }
    } while (element);
    return Element._returnOffset(valueL, valueT);
  },

  absolutize: function(element) {
    element = $(element);
    if (element.getStyle('position') == 'absolute') return;
    // Position.prepare(); // To be done manually by Scripty when it needs it.

    var offsets = element.positionedOffset();
    var top     = offsets[1];
    var left    = offsets[0];
    var width   = element.clientWidth;
    var height  = element.clientHeight;

    element._originalLeft   = left - parseFloat(element.style.left  || 0);
    element._originalTop    = top  - parseFloat(element.style.top || 0);
    element._originalWidth  = element.style.width;
    element._originalHeight = element.style.height;

    element.style.position = 'absolute';
    element.style.top    = top + 'px';
    element.style.left   = left + 'px';
    element.style.width  = width + 'px';
    element.style.height = height + 'px';
    return element;
  },

  relativize: function(element) {
    element = $(element);
    if (element.getStyle('position') == 'relative') return;
    // Position.prepare(); // To be done manually by Scripty when it needs it.

    element.style.position = 'relative';
    var top  = parseFloat(element.style.top  || 0) - (element._originalTop || 0);
    var left = parseFloat(element.style.left || 0) - (element._originalLeft || 0);

    element.style.top    = top + 'px';
    element.style.left   = left + 'px';
    element.style.height = element._originalHeight;
    element.style.width  = element._originalWidth;
    return element;
  },

  cumulativeScrollOffset: function(element) {
    var valueT = 0, valueL = 0;
    do {
      valueT += element.scrollTop  || 0;
      valueL += element.scrollLeft || 0;
      element = element.parentNode;
    } while (element);
    return Element._returnOffset(valueL, valueT);
  },

  getOffsetParent: function(element) {
    if (element.offsetParent) return $(element.offsetParent);
    if (element == document.body) return $(element);

    while ((element = element.parentNode) && element != document.body)
      if (Element.getStyle(element, 'position') != 'static')
        return $(element);

    return $(document.body);
  },

  viewportOffset: function(forElement) {
    var valueT = 0, valueL = 0;

    var element = forElement;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;

      // Safari fix
      if (element.offsetParent == document.body &&
        Element.getStyle(element, 'position') == 'absolute') break;

    } while (element = element.offsetParent);

    element = forElement;
    do {
      if (!Prototype.Browser.Opera || element.tagName == 'BODY') {
        valueT -= element.scrollTop  || 0;
        valueL -= element.scrollLeft || 0;
      }
    } while (element = element.parentNode);

    return Element._returnOffset(valueL, valueT);
  },

  clonePosition: function(element, source) {
    var options = Object.extend({
      setLeft:    true,
      setTop:     true,
      setWidth:   true,
      setHeight:  true,
      offsetTop:  0,
      offsetLeft: 0
    }, arguments[2] || { });

    // find page position of source
    source = $(source);
    var p = source.viewportOffset();

    // find coordinate system to use
    element = $(element);
    var delta = [0, 0];
    var parent = null;
    // delta [0,0] will do fine with position: fixed elements,
    // position:absolute needs offsetParent deltas
    if (Element.getStyle(element, 'position') == 'absolute') {
      parent = element.getOffsetParent();
      delta = parent.viewportOffset();
    }

    // correct by body offsets (fixes Safari)
    if (parent == document.body) {
      delta[0] -= document.body.offsetLeft;
      delta[1] -= document.body.offsetTop;
    }

    // set position
    if (options.setLeft)   element.style.left  = (p[0] - delta[0] + options.offsetLeft) + 'px';
    if (options.setTop)    element.style.top   = (p[1] - delta[1] + options.offsetTop) + 'px';
    if (options.setWidth)  element.style.width = source.offsetWidth + 'px';
    if (options.setHeight) element.style.height = source.offsetHeight + 'px';
    return element;
  }
};

Element.Methods.identify.counter = 1;

Object.extend(Element.Methods, {
  getElementsBySelector: Element.Methods.select,
  childElements: Element.Methods.immediateDescendants
});

Element._attributeTranslations = {
  write: {
    names: {
      className: 'class',
      htmlFor:   'for'
    },
    values: { }
  }
};


if (!document.createRange || Prototype.Browser.Opera) {
  Element.Methods.insert = function(element, insertions) {
    element = $(element);

    if (Object.isString(insertions) || Object.isNumber(insertions) ||
        Object.isElement(insertions) || (insertions && (insertions.toElement || insertions.toHTML)))
          insertions = { bottom: insertions };

    var t = Element._insertionTranslations, content, position, pos, tagName;

    for (position in insertions) {
      content  = insertions[position];
      position = position.toLowerCase();
      pos      = t[position];

      if (content && content.toElement) content = content.toElement();
      if (Object.isElement(content)) {
        pos.insert(element, content);
        continue;
      }

      content = Object.toHTML(content);
      tagName = ((position == 'before' || position == 'after')
        ? element.parentNode : element).tagName.toUpperCase();

      if (t.tags[tagName]) {
        var fragments = Element._getContentFromAnonymousElement(tagName, content.stripScripts());
        if (position == 'top' || position == 'after') fragments.reverse();
        fragments.each(pos.insert.curry(element));
      }
      else element.insertAdjacentHTML(pos.adjacency, content.stripScripts());

      content.evalScripts.bind(content).defer();
    }

    return element;
  };
}

if (Prototype.Browser.Opera) {
  Element.Methods.getStyle = Element.Methods.getStyle.wrap(
    function(proceed, element, style) {
      switch (style) {
        case 'left': case 'top': case 'right': case 'bottom':
          if (proceed(element, 'position') === 'static') return null;
        case 'height': case 'width':
          // returns '0px' for hidden elements; we want it to return null
          if (!Element.visible(element)) return null;

          // returns the border-box dimensions rather than the content-box
          // dimensions, so we subtract padding and borders from the value
          var dim = parseInt(proceed(element, style), 10);

          if (dim !== element['offset' + style.capitalize()])
            return dim + 'px';

          var properties;
          if (style === 'height') {
            properties = ['border-top-width', 'padding-top',
             'padding-bottom', 'border-bottom-width'];
          }
          else {
            properties = ['border-left-width', 'padding-left',
             'padding-right', 'border-right-width'];
          }
          return properties.inject(dim, function(memo, property) {
            var val = proceed(element, property);
            return val === null ? memo : memo - parseInt(val, 10);
          }) + 'px';
        default: return proceed(element, style);
      }
    }
  );

  Element.Methods.readAttribute = Element.Methods.readAttribute.wrap(
    function(proceed, element, attribute) {
      if (attribute === 'title') return element.title;
      return proceed(element, attribute);
    }
  );
}

else if (Prototype.Browser.IE) {
  $w('positionedOffset getOffsetParent viewportOffset').each(function(method) {
    Element.Methods[method] = Element.Methods[method].wrap(
      function(proceed, element) {
        element = $(element);
        var position = element.getStyle('position');
        if (position != 'static') return proceed(element);
        element.setStyle({ position: 'relative' });
        var value = proceed(element);
        element.setStyle({ position: position });
        return value;
      }
    );
  });

  Element.Methods.getStyle = function(element, style) {
    element = $(element);
    style = (style == 'float' || style == 'cssFloat') ? 'styleFloat' : style.camelize();
    var value = element.style[style];
    if (!value && element.currentStyle) value = element.currentStyle[style];

    if (style == 'opacity') {
      if (value = (element.getStyle('filter') || '').match(/alpha\(opacity=(.*)\)/))
        if (value[1]) return parseFloat(value[1]) / 100;
      return 1.0;
    }

    if (value == 'auto') {
      if ((style == 'width' || style == 'height') && (element.getStyle('display') != 'none'))
        return element['offset' + style.capitalize()] + 'px';
      return null;
    }
    return value;
  };

  Element.Methods.setOpacity = function(element, value) {
    function stripAlpha(filter){
      return filter.replace(/alpha\([^\)]*\)/gi,'');
    }
    element = $(element);
    var currentStyle = element.currentStyle;
    if ((currentStyle && !currentStyle.hasLayout) ||
      (!currentStyle && element.style.zoom == 'normal'))
        element.style.zoom = 1;

    var filter = element.getStyle('filter'), style = element.style;
    if (value == 1 || value === '') {
      (filter = stripAlpha(filter)) ?
        style.filter = filter : style.removeAttribute('filter');
      return element;
    } else if (value < 0.00001) value = 0;
    style.filter = stripAlpha(filter) +
      'alpha(opacity=' + (value * 100) + ')';
    return element;
  };

  Element._attributeTranslations = {
    read: {
      names: {
        'class': 'className',
        'for':   'htmlFor'
      },
      values: {
        _getAttr: function(element, attribute) {
          return element.getAttribute(attribute, 2);
        },
        _getAttrNode: function(element, attribute) {
          var node = element.getAttributeNode(attribute);
          return node ? node.value : "";
        },
        _getEv: function(element, attribute) {
          attribute = element.getAttribute(attribute);
          return attribute ? attribute.toString().slice(23, -2) : null;
        },
        _flag: function(element, attribute) {
          return $(element).hasAttribute(attribute) ? attribute : null;
        },
        style: function(element) {
          return element.style.cssText.toLowerCase();
        },
        title: function(element) {
          return element.title;
        }
      }
    }
  };

  Element._attributeTranslations.write = {
    names: Object.clone(Element._attributeTranslations.read.names),
    values: {
      checked: function(element, value) {
        element.checked = !!value;
      },

      style: function(element, value) {
        element.style.cssText = value ? value : '';
      }
    }
  };

  Element._attributeTranslations.has = {};

  $w('colSpan rowSpan vAlign dateTime accessKey tabIndex ' +
      'encType maxLength readOnly longDesc').each(function(attr) {
    Element._attributeTranslations.write.names[attr.toLowerCase()] = attr;
    Element._attributeTranslations.has[attr.toLowerCase()] = attr;
  });

  (function(v) {
    Object.extend(v, {
      href:        v._getAttr,
      src:         v._getAttr,
      type:        v._getAttr,
      action:      v._getAttrNode,
      disabled:    v._flag,
      checked:     v._flag,
      readonly:    v._flag,
      multiple:    v._flag,
      onload:      v._getEv,
      onunload:    v._getEv,
      onclick:     v._getEv,
      ondblclick:  v._getEv,
      onmousedown: v._getEv,
      onmouseup:   v._getEv,
      onmouseover: v._getEv,
      onmousemove: v._getEv,
      onmouseout:  v._getEv,
      onfocus:     v._getEv,
      onblur:      v._getEv,
      onkeypress:  v._getEv,
      onkeydown:   v._getEv,
      onkeyup:     v._getEv,
      onsubmit:    v._getEv,
      onreset:     v._getEv,
      onselect:    v._getEv,
      onchange:    v._getEv
    });
  })(Element._attributeTranslations.read.values);
}

else if (Prototype.Browser.Gecko && /rv:1\.8\.0/.test(navigator.userAgent)) {
  Element.Methods.setOpacity = function(element, value) {
    element = $(element);
    element.style.opacity = (value == 1) ? 0.999999 :
      (value === '') ? '' : (value < 0.00001) ? 0 : value;
    return element;
  };
}

else if (Prototype.Browser.WebKit) {
  Element.Methods.setOpacity = function(element, value) {
    element = $(element);
    element.style.opacity = (value == 1 || value === '') ? '' :
      (value < 0.00001) ? 0 : value;

    if (value == 1)
      if(element.tagName == 'IMG' && element.width) {
        element.width++; element.width--;
      } else try {
        var n = document.createTextNode(' ');
        element.appendChild(n);
        element.removeChild(n);
      } catch (e) { }

    return element;
  };

  // Safari returns margins on body which is incorrect if the child is absolutely
  // positioned.  For performance reasons, redefine Element#cumulativeOffset for
  // KHTML/WebKit only.
  Element.Methods.cumulativeOffset = function(element) {
    var valueT = 0, valueL = 0;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;
      if (element.offsetParent == document.body)
        if (Element.getStyle(element, 'position') == 'absolute') break;

      element = element.offsetParent;
    } while (element);

    return Element._returnOffset(valueL, valueT);
  };
}

if (Prototype.Browser.IE || Prototype.Browser.Opera) {
  // IE and Opera are missing .innerHTML support for TABLE-related and SELECT elements
  Element.Methods.update = function(element, content) {
    element = $(element);

    if (content && content.toElement) content = content.toElement();
    if (Object.isElement(content)) return element.update().insert(content);

    content = Object.toHTML(content);
    var tagName = element.tagName.toUpperCase();

    if (tagName in Element._insertionTranslations.tags) {
      $A(element.childNodes).each(function(node) { element.removeChild(node) });
      Element._getContentFromAnonymousElement(tagName, content.stripScripts())
        .each(function(node) { element.appendChild(node) });
    }
    else element.innerHTML = content.stripScripts();

    content.evalScripts.bind(content).defer();
    return element;
  };
}

if (document.createElement('div').outerHTML) {
  Element.Methods.replace = function(element, content) {
    element = $(element);

    if (content && content.toElement) content = content.toElement();
    if (Object.isElement(content)) {
      element.parentNode.replaceChild(content, element);
      return element;
    }

    content = Object.toHTML(content);
    var parent = element.parentNode, tagName = parent.tagName.toUpperCase();

    if (Element._insertionTranslations.tags[tagName]) {
      var nextSibling = element.next();
      var fragments = Element._getContentFromAnonymousElement(tagName, content.stripScripts());
      parent.removeChild(element);
      if (nextSibling)
        fragments.each(function(node) { parent.insertBefore(node, nextSibling) });
      else
        fragments.each(function(node) { parent.appendChild(node) });
    }
    else element.outerHTML = content.stripScripts();

    content.evalScripts.bind(content).defer();
    return element;
  };
}

Element._returnOffset = function(l, t) {
  var result = [l, t];
  result.left = l;
  result.top = t;
  return result;
};

Element._getContentFromAnonymousElement = function(tagName, html) {
  var div = new Element('div'), t = Element._insertionTranslations.tags[tagName];
  div.innerHTML = t[0] + html + t[1];
  t[2].times(function() { div = div.firstChild });
  return $A(div.childNodes);
};

Element._insertionTranslations = {
  before: {
    adjacency: 'beforeBegin',
    insert: function(element, node) {
      element.parentNode.insertBefore(node, element);
    },
    initializeRange: function(element, range) {
      range.setStartBefore(element);
    }
  },
  top: {
    adjacency: 'afterBegin',
    insert: function(element, node) {
      element.insertBefore(node, element.firstChild);
    },
    initializeRange: function(element, range) {
      range.selectNodeContents(element);
      range.collapse(true);
    }
  },
  bottom: {
    adjacency: 'beforeEnd',
    insert: function(element, node) {
      element.appendChild(node);
    }
  },
  after: {
    adjacency: 'afterEnd',
    insert: function(element, node) {
      element.parentNode.insertBefore(node, element.nextSibling);
    },
    initializeRange: function(element, range) {
      range.setStartAfter(element);
    }
  },
  tags: {
    TABLE:  ['<table>',                '</table>',                   1],
    TBODY:  ['<table><tbody>',         '</tbody></table>',           2],
    TR:     ['<table><tbody><tr>',     '</tr></tbody></table>',      3],
    TD:     ['<table><tbody><tr><td>', '</td></tr></tbody></table>', 4],
    SELECT: ['<select>',               '</select>',                  1]
  }
};

(function() {
  this.bottom.initializeRange = this.top.initializeRange;
  Object.extend(this.tags, {
    THEAD: this.tags.TBODY,
    TFOOT: this.tags.TBODY,
    TH:    this.tags.TD
  });
}).call(Element._insertionTranslations);

Element.Methods.Simulated = {
  hasAttribute: function(element, attribute) {
    attribute = Element._attributeTranslations.has[attribute] || attribute;
    var node = $(element).getAttributeNode(attribute);
    return node && node.specified;
  }
};

Element.Methods.ByTag = { };

Object.extend(Element, Element.Methods);

if (!Prototype.BrowserFeatures.ElementExtensions &&
    document.createElement('div').__proto__) {
  window.HTMLElement = { };
  window.HTMLElement.prototype = document.createElement('div').__proto__;
  Prototype.BrowserFeatures.ElementExtensions = true;
}

Element.extend = (function() {
  if (Prototype.BrowserFeatures.SpecificElementExtensions)
    return Prototype.K;

  var Methods = { }, ByTag = Element.Methods.ByTag;

  var extend = Object.extend(function(element) {
    if (!element || element._extendedByPrototype ||
        element.nodeType != 1 || element == window) return element;

    var methods = Object.clone(Methods),
      tagName = element.tagName, property, value;

    // extend methods for specific tags
    if (ByTag[tagName]) Object.extend(methods, ByTag[tagName]);

    for (property in methods) {
      value = methods[property];
      if (Object.isFunction(value) && !(property in element))
        element[property] = value.methodize();
    }

    element._extendedByPrototype = Prototype.emptyFunction;
    return element;

  }, {
    refresh: function() {
      // extend methods for all tags (Safari doesn't need this)
      if (!Prototype.BrowserFeatures.ElementExtensions) {
        Object.extend(Methods, Element.Methods);
        Object.extend(Methods, Element.Methods.Simulated);
      }
    }
  });

  extend.refresh();
  return extend;
})();

Element.hasAttribute = function(element, attribute) {
  if (element.hasAttribute) return element.hasAttribute(attribute);
  return Element.Methods.Simulated.hasAttribute(element, attribute);
};

Element.addMethods = function(methods) {
  var F = Prototype.BrowserFeatures, T = Element.Methods.ByTag;

  if (!methods) {
    Object.extend(Form, Form.Methods);
    Object.extend(Form.Element, Form.Element.Methods);
    Object.extend(Element.Methods.ByTag, {
      "FORM":     Object.clone(Form.Methods),
      "INPUT":    Object.clone(Form.Element.Methods),
      "SELECT":   Object.clone(Form.Element.Methods),
      "TEXTAREA": Object.clone(Form.Element.Methods)
    });
  }

  if (arguments.length == 2) {
    var tagName = methods;
    methods = arguments[1];
  }

  if (!tagName) Object.extend(Element.Methods, methods || { });
  else {
    if (Object.isArray(tagName)) tagName.each(extend);
    else extend(tagName);
  }

  function extend(tagName) {
    tagName = tagName.toUpperCase();
    if (!Element.Methods.ByTag[tagName])
      Element.Methods.ByTag[tagName] = { };
    Object.extend(Element.Methods.ByTag[tagName], methods);
  }

  function copy(methods, destination, onlyIfAbsent) {
    onlyIfAbsent = onlyIfAbsent || false;
    for (var property in methods) {
      var value = methods[property];
      if (!Object.isFunction(value)) continue;
      if (!onlyIfAbsent || !(property in destination))
        destination[property] = value.methodize();
    }
  }

  function findDOMClass(tagName) {
    var klass;
    var trans = {
      "OPTGROUP": "OptGroup", "TEXTAREA": "TextArea", "P": "Paragraph",
      "FIELDSET": "FieldSet", "UL": "UList", "OL": "OList", "DL": "DList",
      "DIR": "Directory", "H1": "Heading", "H2": "Heading", "H3": "Heading",
      "H4": "Heading", "H5": "Heading", "H6": "Heading", "Q": "Quote",
      "INS": "Mod", "DEL": "Mod", "A": "Anchor", "IMG": "Image", "CAPTION":
      "TableCaption", "COL": "TableCol", "COLGROUP": "TableCol", "THEAD":
      "TableSection", "TFOOT": "TableSection", "TBODY": "TableSection", "TR":
      "TableRow", "TH": "TableCell", "TD": "TableCell", "FRAMESET":
      "FrameSet", "IFRAME": "IFrame"
    };
    if (trans[tagName]) klass = 'HTML' + trans[tagName] + 'Element';
    if (window[klass]) return window[klass];
    klass = 'HTML' + tagName + 'Element';
    if (window[klass]) return window[klass];
    klass = 'HTML' + tagName.capitalize() + 'Element';
    if (window[klass]) return window[klass];

    window[klass] = { };
    window[klass].prototype = document.createElement(tagName).__proto__;
    return window[klass];
  }

  if (F.ElementExtensions) {
    copy(Element.Methods, HTMLElement.prototype);
    copy(Element.Methods.Simulated, HTMLElement.prototype, true);
  }

  if (F.SpecificElementExtensions) {
    for (var tag in Element.Methods.ByTag) {
      var klass = findDOMClass(tag);
      if (Object.isUndefined(klass)) continue;
      copy(T[tag], klass.prototype);
    }
  }

  Object.extend(Element, Element.Methods);
  delete Element.ByTag;

  if (Element.extend.refresh) Element.extend.refresh();
  Element.cache = { };
};

document.viewport = {
  getDimensions: function() {
    var dimensions = { };
    var B = Prototype.Browser;
    $w('width height').each(function(d) {
      var D = d.capitalize();
      dimensions[d] = (B.WebKit && !document.evaluate) ? self['inner' + D] :
        (B.Opera) ? document.body['client' + D] : document.documentElement['client' + D];
    });
    return dimensions;
  },

  getWidth: function() {
    return this.getDimensions().width;
  },

  getHeight: function() {
    return this.getDimensions().height;
  },

  getScrollOffsets: function() {
    return Element._returnOffset(
      window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft,
      window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop);
  }
};
/* Portions of the Selector class are derived from Jack Slocum’s DomQuery,
 * part of YUI-Ext version 0.40, distributed under the terms of an MIT-style
 * license.  Please see http://www.yui-ext.com/ for more information. */

var Selector = Class.create({
  initialize: function(expression) {
    this.expression = expression.strip();
    this.compileMatcher();
  },

  shouldUseXPath: function() {
    if (!Prototype.BrowserFeatures.XPath) return false;

    var e = this.expression;

    // Safari 3 chokes on :*-of-type and :empty
    if (Prototype.Browser.WebKit &&
     (e.include("-of-type") || e.include(":empty")))
      return false;

    // XPath can't do namespaced attributes, nor can it read
    // the "checked" property from DOM nodes
    if ((/(\[[\w-]*?:|:checked)/).test(this.expression))
      return false;

    return true;
  },

  compileMatcher: function() {
    if (this.shouldUseXPath())
      return this.compileXPathMatcher();

    var e = this.expression, ps = Selector.patterns, h = Selector.handlers,
        c = Selector.criteria, le, p, m;

    if (Selector._cache[e]) {
      this.matcher = Selector._cache[e];
      return;
    }

    this.matcher = ["this.matcher = function(root) {",
                    "var r = root, h = Selector.handlers, c = false, n;"];

    while (e && le != e && (/\S/).test(e)) {
      le = e;
      for (var i in ps) {
        p = ps[i];
        if (m = e.match(p)) {
          this.matcher.push(Object.isFunction(c[i]) ? c[i](m) :
    	      new Template(c[i]).evaluate(m));
          e = e.replace(m[0], '');
          break;
        }
      }
    }

    this.matcher.push("return h.unique(n);\n}");
    eval(this.matcher.join('\n'));
    Selector._cache[this.expression] = this.matcher;
  },

  compileXPathMatcher: function() {
    var e = this.expression, ps = Selector.patterns,
        x = Selector.xpath, le, m;

    if (Selector._cache[e]) {
      this.xpath = Selector._cache[e]; return;
    }

    this.matcher = ['.//*'];
    while (e && le != e && (/\S/).test(e)) {
      le = e;
      for (var i in ps) {
        if (m = e.match(ps[i])) {
          this.matcher.push(Object.isFunction(x[i]) ? x[i](m) :
            new Template(x[i]).evaluate(m));
          e = e.replace(m[0], '');
          break;
        }
      }
    }

    this.xpath = this.matcher.join('');
    Selector._cache[this.expression] = this.xpath;
  },

  findElements: function(root) {
    root = root || document;
    if (this.xpath) return document._getElementsByXPath(this.xpath, root);
    return this.matcher(root);
  },

  match: function(element) {
    this.tokens = [];

    var e = this.expression, ps = Selector.patterns, as = Selector.assertions;
    var le, p, m;

    while (e && le !== e && (/\S/).test(e)) {
      le = e;
      for (var i in ps) {
        p = ps[i];
        if (m = e.match(p)) {
          // use the Selector.assertions methods unless the selector
          // is too complex.
          if (as[i]) {
            this.tokens.push([i, Object.clone(m)]);
            e = e.replace(m[0], '');
          } else {
            // reluctantly do a document-wide search
            // and look for a match in the array
            return this.findElements(document).include(element);
          }
        }
      }
    }

    var match = true, name, matches;
    for (var i = 0, token; token = this.tokens[i]; i++) {
      name = token[0], matches = token[1];
      if (!Selector.assertions[name](element, matches)) {
        match = false; break;
      }
    }

    return match;
  },

  toString: function() {
    return this.expression;
  },

  inspect: function() {
    return "#<Selector:" + this.expression.inspect() + ">";
  }
});

Object.extend(Selector, {
  _cache: { },

  xpath: {
    descendant:   "//*",
    child:        "/*",
    adjacent:     "/following-sibling::*[1]",
    laterSibling: '/following-sibling::*',
    tagName:      function(m) {
      if (m[1] == '*') return '';
      return "[local-name()='" + m[1].toLowerCase() +
             "' or local-name()='" + m[1].toUpperCase() + "']";
    },
    className:    "[contains(concat(' ', @class, ' '), ' #{1} ')]",
    id:           "[@id='#{1}']",
    attrPresence: function(m) {
      m[1] = m[1].toLowerCase();
      return new Template("[@#{1}]").evaluate(m);
    },
    attr: function(m) {
      m[1] = m[1].toLowerCase();
      m[3] = m[5] || m[6];
      return new Template(Selector.xpath.operators[m[2]]).evaluate(m);
    },
    pseudo: function(m) {
      var h = Selector.xpath.pseudos[m[1]];
      if (!h) return '';
      if (Object.isFunction(h)) return h(m);
      return new Template(Selector.xpath.pseudos[m[1]]).evaluate(m);
    },
    operators: {
      '=':  "[@#{1}='#{3}']",
      '!=': "[@#{1}!='#{3}']",
      '^=': "[starts-with(@#{1}, '#{3}')]",
      '$=': "[substring(@#{1}, (string-length(@#{1}) - string-length('#{3}') + 1))='#{3}']",
      '*=': "[contains(@#{1}, '#{3}')]",
      '~=': "[contains(concat(' ', @#{1}, ' '), ' #{3} ')]",
      '|=': "[contains(concat('-', @#{1}, '-'), '-#{3}-')]"
    },
    pseudos: {
      'first-child': '[not(preceding-sibling::*)]',
      'last-child':  '[not(following-sibling::*)]',
      'only-child':  '[not(preceding-sibling::* or following-sibling::*)]',
      'empty':       "[count(*) = 0 and (count(text()) = 0 or translate(text(), ' \t\r\n', '') = '')]",
      'checked':     "[@checked]",
      'disabled':    "[@disabled]",
      'enabled':     "[not(@disabled)]",
      'not': function(m) {
        var e = m[6], p = Selector.patterns,
            x = Selector.xpath, le, v;

        var exclusion = [];
        while (e && le != e && (/\S/).test(e)) {
          le = e;
          for (var i in p) {
            if (m = e.match(p[i])) {
              v = Object.isFunction(x[i]) ? x[i](m) : new Template(x[i]).evaluate(m);
              exclusion.push("(" + v.substring(1, v.length - 1) + ")");
              e = e.replace(m[0], '');
              break;
            }
          }
        }
        return "[not(" + exclusion.join(" and ") + ")]";
      },
      'nth-child':      function(m) {
        return Selector.xpath.pseudos.nth("(count(./preceding-sibling::*) + 1) ", m);
      },
      'nth-last-child': function(m) {
        return Selector.xpath.pseudos.nth("(count(./following-sibling::*) + 1) ", m);
      },
      'nth-of-type':    function(m) {
        return Selector.xpath.pseudos.nth("position() ", m);
      },
      'nth-last-of-type': function(m) {
        return Selector.xpath.pseudos.nth("(last() + 1 - position()) ", m);
      },
      'first-of-type':  function(m) {
        m[6] = "1"; return Selector.xpath.pseudos['nth-of-type'](m);
      },
      'last-of-type':   function(m) {
        m[6] = "1"; return Selector.xpath.pseudos['nth-last-of-type'](m);
      },
      'only-of-type':   function(m) {
        var p = Selector.xpath.pseudos; return p['first-of-type'](m) + p['last-of-type'](m);
      },
      nth: function(fragment, m) {
        var mm, formula = m[6], predicate;
        if (formula == 'even') formula = '2n+0';
        if (formula == 'odd')  formula = '2n+1';
        if (mm = formula.match(/^(\d+)$/)) // digit only
          return '[' + fragment + "= " + mm[1] + ']';
        if (mm = formula.match(/^(-?\d*)?n(([+-])(\d+))?/)) { // an+b
          if (mm[1] == "-") mm[1] = -1;
          var a = mm[1] ? Number(mm[1]) : 1;
          var b = mm[2] ? Number(mm[2]) : 0;
          predicate = "[((#{fragment} - #{b}) mod #{a} = 0) and " +
          "((#{fragment} - #{b}) div #{a} >= 0)]";
          return new Template(predicate).evaluate({
            fragment: fragment, a: a, b: b });
        }
      }
    }
  },

  criteria: {
    tagName:      'n = h.tagName(n, r, "#{1}", c);   c = false;',
    className:    'n = h.className(n, r, "#{1}", c); c = false;',
    id:           'n = h.id(n, r, "#{1}", c);        c = false;',
    attrPresence: 'n = h.attrPresence(n, r, "#{1}"); c = false;',
    attr: function(m) {
      m[3] = (m[5] || m[6]);
      return new Template('n = h.attr(n, r, "#{1}", "#{3}", "#{2}"); c = false;').evaluate(m);
    },
    pseudo: function(m) {
      if (m[6]) m[6] = m[6].replace(/"/g, '\\"');
      return new Template('n = h.pseudo(n, "#{1}", "#{6}", r, c); c = false;').evaluate(m);
    },
    descendant:   'c = "descendant";',
    child:        'c = "child";',
    adjacent:     'c = "adjacent";',
    laterSibling: 'c = "laterSibling";'
  },

  patterns: {
    // combinators must be listed first
    // (and descendant needs to be last combinator)
    laterSibling: /^\s*~\s*/,
    child:        /^\s*>\s*/,
    adjacent:     /^\s*\+\s*/,
    descendant:   /^\s/,

    // selectors follow
    tagName:      /^\s*(\*|[\w\-]+)(\b|$)?/,
    id:           /^#([\w\-\*]+)(\b|$)/,
    className:    /^\.([\w\-\*]+)(\b|$)/,
    pseudo:       /^:((first|last|nth|nth-last|only)(-child|-of-type)|empty|checked|(en|dis)abled|not)(\((.*?)\))?(\b|$|(?=\s)|(?=:))/,
    attrPresence: /^\[([\w]+)\]/,
    attr:         /\[((?:[\w-]*:)?[\w-]+)\s*(?:([!^$*~|]?=)\s*((['"])([^\4]*?)\4|([^'"][^\]]*?)))?\]/
  },

  // for Selector.match and Element#match
  assertions: {
    tagName: function(element, matches) {
      return matches[1].toUpperCase() == element.tagName.toUpperCase();
    },

    className: function(element, matches) {
      return Element.hasClassName(element, matches[1]);
    },

    id: function(element, matches) {
      return element.id === matches[1];
    },

    attrPresence: function(element, matches) {
      return Element.hasAttribute(element, matches[1]);
    },

    attr: function(element, matches) {
      var nodeValue = Element.readAttribute(element, matches[1]);
      return Selector.operators[matches[2]](nodeValue, matches[3]);
    }
  },

  handlers: {
    // UTILITY FUNCTIONS
    // joins two collections
    concat: function(a, b) {
      for (var i = 0, node; node = b[i]; i++)
        a.push(node);
      return a;
    },

    // marks an array of nodes for counting
    mark: function(nodes) {
      for (var i = 0, node; node = nodes[i]; i++)
        node._counted = true;
      return nodes;
    },

    unmark: function(nodes) {
      for (var i = 0, node; node = nodes[i]; i++)
        node._counted = undefined;
      return nodes;
    },

    // mark each child node with its position (for nth calls)
    // "ofType" flag indicates whether we're indexing for nth-of-type
    // rather than nth-child
    index: function(parentNode, reverse, ofType) {
      parentNode._counted = true;
      if (reverse) {
        for (var nodes = parentNode.childNodes, i = nodes.length - 1, j = 1; i >= 0; i--) {
          var node = nodes[i];
          if (node.nodeType == 1 && (!ofType || node._counted)) node.nodeIndex = j++;
        }
      } else {
        for (var i = 0, j = 1, nodes = parentNode.childNodes; node = nodes[i]; i++)
          if (node.nodeType == 1 && (!ofType || node._counted)) node.nodeIndex = j++;
      }
    },

    // filters out duplicates and extends all nodes
    unique: function(nodes) {
      if (nodes.length == 0) return nodes;
      var results = [], n;
      for (var i = 0, l = nodes.length; i < l; i++)
        if (!(n = nodes[i])._counted) {
          n._counted = true;
          results.push(Element.extend(n));
        }
      return Selector.handlers.unmark(results);
    },

    // COMBINATOR FUNCTIONS
    descendant: function(nodes) {
      var h = Selector.handlers;
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        h.concat(results, node.getElementsByTagName('*'));
      return results;
    },

    child: function(nodes) {
      var h = Selector.handlers;
      for (var i = 0, results = [], node; node = nodes[i]; i++) {
        for (var j = 0, child; child = node.childNodes[j]; j++)
          if (child.nodeType == 1 && child.tagName != '!') results.push(child);
      }
      return results;
    },

    adjacent: function(nodes) {
      for (var i = 0, results = [], node; node = nodes[i]; i++) {
        var next = this.nextElementSibling(node);
        if (next) results.push(next);
      }
      return results;
    },

    laterSibling: function(nodes) {
      var h = Selector.handlers;
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        h.concat(results, Element.nextSiblings(node));
      return results;
    },

    nextElementSibling: function(node) {
      while (node = node.nextSibling)
	      if (node.nodeType == 1) return node;
      return null;
    },

    previousElementSibling: function(node) {
      while (node = node.previousSibling)
        if (node.nodeType == 1) return node;
      return null;
    },

    // TOKEN FUNCTIONS
    tagName: function(nodes, root, tagName, combinator) {
      tagName = tagName.toUpperCase();
      var results = [], h = Selector.handlers;
      if (nodes) {
        if (combinator) {
          // fastlane for ordinary descendant combinators
          if (combinator == "descendant") {
            for (var i = 0, node; node = nodes[i]; i++)
              h.concat(results, node.getElementsByTagName(tagName));
            return results;
          } else nodes = this[combinator](nodes);
          if (tagName == "*") return nodes;
        }
        for (var i = 0, node; node = nodes[i]; i++)
          if (node.tagName.toUpperCase() == tagName) results.push(node);
        return results;
      } else return root.getElementsByTagName(tagName);
    },

    id: function(nodes, root, id, combinator) {
      var targetNode = $(id), h = Selector.handlers;
      if (!targetNode) return [];
      if (!nodes && root == document) return [targetNode];
      if (nodes) {
        if (combinator) {
          if (combinator == 'child') {
            for (var i = 0, node; node = nodes[i]; i++)
              if (targetNode.parentNode == node) return [targetNode];
          } else if (combinator == 'descendant') {
            for (var i = 0, node; node = nodes[i]; i++)
              if (Element.descendantOf(targetNode, node)) return [targetNode];
          } else if (combinator == 'adjacent') {
            for (var i = 0, node; node = nodes[i]; i++)
              if (Selector.handlers.previousElementSibling(targetNode) == node)
                return [targetNode];
          } else nodes = h[combinator](nodes);
        }
        for (var i = 0, node; node = nodes[i]; i++)
          if (node == targetNode) return [targetNode];
        return [];
      }
      return (targetNode && Element.descendantOf(targetNode, root)) ? [targetNode] : [];
    },

    className: function(nodes, root, className, combinator) {
      if (nodes && combinator) nodes = this[combinator](nodes);
      return Selector.handlers.byClassName(nodes, root, className);
    },

    byClassName: function(nodes, root, className) {
      if (!nodes) nodes = Selector.handlers.descendant([root]);
      var needle = ' ' + className + ' ';
      for (var i = 0, results = [], node, nodeClassName; node = nodes[i]; i++) {
        nodeClassName = node.className;
        if (nodeClassName.length == 0) continue;
        if (nodeClassName == className || (' ' + nodeClassName + ' ').include(needle))
          results.push(node);
      }
      return results;
    },

    attrPresence: function(nodes, root, attr) {
      if (!nodes) nodes = root.getElementsByTagName("*");
      var results = [];
      for (var i = 0, node; node = nodes[i]; i++)
        if (Element.hasAttribute(node, attr)) results.push(node);
      return results;
    },

    attr: function(nodes, root, attr, value, operator) {
      if (!nodes) nodes = root.getElementsByTagName("*");
      var handler = Selector.operators[operator], results = [];
      for (var i = 0, node; node = nodes[i]; i++) {
        var nodeValue = Element.readAttribute(node, attr);
        if (nodeValue === null) continue;
        if (handler(nodeValue, value)) results.push(node);
      }
      return results;
    },

    pseudo: function(nodes, name, value, root, combinator) {
      if (nodes && combinator) nodes = this[combinator](nodes);
      if (!nodes) nodes = root.getElementsByTagName("*");
      return Selector.pseudos[name](nodes, value, root);
    }
  },

  pseudos: {
    'first-child': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++) {
        if (Selector.handlers.previousElementSibling(node)) continue;
          results.push(node);
      }
      return results;
    },
    'last-child': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++) {
        if (Selector.handlers.nextElementSibling(node)) continue;
          results.push(node);
      }
      return results;
    },
    'only-child': function(nodes, value, root) {
      var h = Selector.handlers;
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        if (!h.previousElementSibling(node) && !h.nextElementSibling(node))
          results.push(node);
      return results;
    },
    'nth-child':        function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, formula, root);
    },
    'nth-last-child':   function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, formula, root, true);
    },
    'nth-of-type':      function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, formula, root, false, true);
    },
    'nth-last-of-type': function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, formula, root, true, true);
    },
    'first-of-type':    function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, "1", root, false, true);
    },
    'last-of-type':     function(nodes, formula, root) {
      return Selector.pseudos.nth(nodes, "1", root, true, true);
    },
    'only-of-type':     function(nodes, formula, root) {
      var p = Selector.pseudos;
      return p['last-of-type'](p['first-of-type'](nodes, formula, root), formula, root);
    },

    // handles the an+b logic
    getIndices: function(a, b, total) {
      if (a == 0) return b > 0 ? [b] : [];
      return $R(1, total).inject([], function(memo, i) {
        if (0 == (i - b) % a && (i - b) / a >= 0) memo.push(i);
        return memo;
      });
    },

    // handles nth(-last)-child, nth(-last)-of-type, and (first|last)-of-type
    nth: function(nodes, formula, root, reverse, ofType) {
      if (nodes.length == 0) return [];
      if (formula == 'even') formula = '2n+0';
      if (formula == 'odd')  formula = '2n+1';
      var h = Selector.handlers, results = [], indexed = [], m;
      h.mark(nodes);
      for (var i = 0, node; node = nodes[i]; i++) {
        if (!node.parentNode._counted) {
          h.index(node.parentNode, reverse, ofType);
          indexed.push(node.parentNode);
        }
      }
      if (formula.match(/^\d+$/)) { // just a number
        formula = Number(formula);
        for (var i = 0, node; node = nodes[i]; i++)
          if (node.nodeIndex == formula) results.push(node);
      } else if (m = formula.match(/^(-?\d*)?n(([+-])(\d+))?/)) { // an+b
        if (m[1] == "-") m[1] = -1;
        var a = m[1] ? Number(m[1]) : 1;
        var b = m[2] ? Number(m[2]) : 0;
        var indices = Selector.pseudos.getIndices(a, b, nodes.length);
        for (var i = 0, node, l = indices.length; node = nodes[i]; i++) {
          for (var j = 0; j < l; j++)
            if (node.nodeIndex == indices[j]) results.push(node);
        }
      }
      h.unmark(nodes);
      h.unmark(indexed);
      return results;
    },

    'empty': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++) {
        // IE treats comments as element nodes
        if (node.tagName == '!' || (node.firstChild && !node.innerHTML.match(/^\s*$/))) continue;
        results.push(node);
      }
      return results;
    },

    'not': function(nodes, selector, root) {
      var h = Selector.handlers, selectorType, m;
      var exclusions = new Selector(selector).findElements(root);
      h.mark(exclusions);
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        if (!node._counted) results.push(node);
      h.unmark(exclusions);
      return results;
    },

    'enabled': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        if (!node.disabled) results.push(node);
      return results;
    },

    'disabled': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        if (node.disabled) results.push(node);
      return results;
    },

    'checked': function(nodes, value, root) {
      for (var i = 0, results = [], node; node = nodes[i]; i++)
        if (node.checked) results.push(node);
      return results;
    }
  },

  operators: {
    '=':  function(nv, v) { return nv == v; },
    '!=': function(nv, v) { return nv != v; },
    '^=': function(nv, v) { return nv.startsWith(v); },
    '$=': function(nv, v) { return nv.endsWith(v); },
    '*=': function(nv, v) { return nv.include(v); },
    '~=': function(nv, v) { return (' ' + nv + ' ').include(' ' + v + ' '); },
    '|=': function(nv, v) { return ('-' + nv.toUpperCase() + '-').include('-' + v.toUpperCase() + '-'); }
  },

  matchElements: function(elements, expression) {
    var matches = new Selector(expression).findElements(), h = Selector.handlers;
    h.mark(matches);
    for (var i = 0, results = [], element; element = elements[i]; i++)
      if (element._counted) results.push(element);
    h.unmark(matches);
    return results;
  },

  findElement: function(elements, expression, index) {
    if (Object.isNumber(expression)) {
      index = expression; expression = false;
    }
    return Selector.matchElements(elements, expression || '*')[index || 0];
  },

  findChildElements: function(element, expressions) {
    var exprs = expressions.join(',');
    expressions = [];
    exprs.scan(/(([\w#:.~>+()\s-]+|\*|\[.*?\])+)\s*(,|$)/, function(m) {
      expressions.push(m[1].strip());
    });
    var results = [], h = Selector.handlers;
    for (var i = 0, l = expressions.length, selector; i < l; i++) {
      selector = new Selector(expressions[i].strip());
      h.concat(results, selector.findElements(element));
    }
    return (l > 1) ? h.unique(results) : results;
  }
});

if (Prototype.Browser.IE) {
  // IE returns comment nodes on getElementsByTagName("*").
  // Filter them out.
  Selector.handlers.concat = function(a, b) {
    for (var i = 0, node; node = b[i]; i++)
      if (node.tagName !== "!") a.push(node);
    return a;
  };
}

function $$() {
  return Selector.findChildElements(document, $A(arguments));
}
var Form = {
  reset: function(form) {
    $(form).reset();
    return form;
  },

  serializeElements: function(elements, options) {
    if (typeof options != 'object') options = { hash: !!options };
    else if (Object.isUndefined(options.hash)) options.hash = true;
    var key, value, submitted = false, submit = options.submit;

    var data = elements.inject({ }, function(result, element) {
      if (!element.disabled && element.name) {
        key = element.name; value = $(element).getValue();
        if (value != null && (element.type != 'submit' || (!submitted &&
            submit !== false && (!submit || key == submit) && (submitted = true)))) {
          if (key in result) {
            // a key is already present; construct an array of values
            if (!Object.isArray(result[key])) result[key] = [result[key]];
            result[key].push(value);
          }
          else result[key] = value;
        }
      }
      return result;
    });

    return options.hash ? data : Object.toQueryString(data);
  }
};

Form.Methods = {
  serialize: function(form, options) {
    return Form.serializeElements(Form.getElements(form), options);
  },

  getElements: function(form) {
    return $A($(form).getElementsByTagName('*')).inject([],
      function(elements, child) {
        if (Form.Element.Serializers[child.tagName.toLowerCase()])
          elements.push(Element.extend(child));
        return elements;
      }
    );
  },

  getInputs: function(form, typeName, name) {
    form = $(form);
    var inputs = form.getElementsByTagName('input');

    if (!typeName && !name) return $A(inputs).map(Element.extend);

    for (var i = 0, matchingInputs = [], length = inputs.length; i < length; i++) {
      var input = inputs[i];
      if ((typeName && input.type != typeName) || (name && input.name != name))
        continue;
      matchingInputs.push(Element.extend(input));
    }

    return matchingInputs;
  },

  disable: function(form) {
    form = $(form);
    Form.getElements(form).invoke('disable');
    return form;
  },

  enable: function(form) {
    form = $(form);
    Form.getElements(form).invoke('enable');
    return form;
  },

  findFirstElement: function(form) {
    var elements = $(form).getElements().findAll(function(element) {
      return 'hidden' != element.type && !element.disabled;
    });
    var firstByIndex = elements.findAll(function(element) {
      return element.hasAttribute('tabIndex') && element.tabIndex >= 0;
    }).sortBy(function(element) { return element.tabIndex }).first();

    return firstByIndex ? firstByIndex : elements.find(function(element) {
      return ['input', 'select', 'textarea'].include(element.tagName.toLowerCase());
    });
  },

  focusFirstElement: function(form) {
    form = $(form);
    form.findFirstElement().activate();
    return form;
  },

  request: function(form, options) {
    form = $(form), options = Object.clone(options || { });

    var params = options.parameters, action = form.readAttribute('action') || '';
    if (action.blank()) action = window.location.href;
    options.parameters = form.serialize(true);

    if (params) {
      if (Object.isString(params)) params = params.toQueryParams();
      Object.extend(options.parameters, params);
    }

    if (form.hasAttribute('method') && !options.method)
      options.method = form.method;

    return new Ajax.Request(action, options);
  }
};

/*--------------------------------------------------------------------------*/

Form.Element = {
  focus: function(element) {
    $(element).focus();
    return element;
  },

  select: function(element) {
    $(element).select();
    return element;
  }
};

Form.Element.Methods = {
  serialize: function(element) {
    element = $(element);
    if (!element.disabled && element.name) {
      var value = element.getValue();
      if (value != undefined) {
        var pair = { };
        pair[element.name] = value;
        return Object.toQueryString(pair);
      }
    }
    return '';
  },

  getValue: function(element) {
    element = $(element);
    var method = element.tagName.toLowerCase();
    return Form.Element.Serializers[method](element);
  },

  setValue: function(element, value) {
    element = $(element);
    var method = element.tagName.toLowerCase();
    Form.Element.Serializers[method](element, value);
    return element;
  },

  clear: function(element) {
    $(element).value = '';
    return element;
  },

  present: function(element) {
    return $(element).value != '';
  },

  activate: function(element) {
    element = $(element);
    try {
      element.focus();
      if (element.select && (element.tagName.toLowerCase() != 'input' ||
          !['button', 'reset', 'submit'].include(element.type)))
        element.select();
    } catch (e) { }
    return element;
  },

  disable: function(element) {
    element = $(element);
    element.blur();
    element.disabled = true;
    return element;
  },

  enable: function(element) {
    element = $(element);
    element.disabled = false;
    return element;
  }
};

/*--------------------------------------------------------------------------*/

var Field = Form.Element;
var $F = Form.Element.Methods.getValue;

/*--------------------------------------------------------------------------*/

Form.Element.Serializers = {
  input: function(element, value) {
    switch (element.type.toLowerCase()) {
      case 'checkbox':
      case 'radio':
        return Form.Element.Serializers.inputSelector(element, value);
      default:
        return Form.Element.Serializers.textarea(element, value);
    }
  },

  inputSelector: function(element, value) {
    if (Object.isUndefined(value)) return element.checked ? element.value : null;
    else element.checked = !!value;
  },

  textarea: function(element, value) {
    if (Object.isUndefined(value)) return element.value;
    else element.value = value;
  },

  select: function(element, index) {
    if (Object.isUndefined(index))
      return this[element.type == 'select-one' ?
        'selectOne' : 'selectMany'](element);
    else {
      var opt, value, single = !Object.isArray(index);
      for (var i = 0, length = element.length; i < length; i++) {
        opt = element.options[i];
        value = this.optionValue(opt);
        if (single) {
          if (value == index) {
            opt.selected = true;
            return;
          }
        }
        else opt.selected = index.include(value);
      }
    }
  },

  selectOne: function(element) {
    var index = element.selectedIndex;
    return index >= 0 ? this.optionValue(element.options[index]) : null;
  },

  selectMany: function(element) {
    var values, length = element.length;
    if (!length) return null;

    for (var i = 0, values = []; i < length; i++) {
      var opt = element.options[i];
      if (opt.selected) values.push(this.optionValue(opt));
    }
    return values;
  },

  optionValue: function(opt) {
    // extend element because hasAttribute may not be native
    return Element.extend(opt).hasAttribute('value') ? opt.value : opt.text;
  }
};

/*--------------------------------------------------------------------------*/

Abstract.TimedObserver = Class.create(PeriodicalExecuter, {
  initialize: function($super, element, frequency, callback) {
    $super(callback, frequency);
    this.element   = $(element);
    this.lastValue = this.getValue();
  },

  execute: function() {
    var value = this.getValue();
    if (Object.isString(this.lastValue) && Object.isString(value) ?
        this.lastValue != value : String(this.lastValue) != String(value)) {
      this.callback(this.element, value);
      this.lastValue = value;
    }
  }
});

Form.Element.Observer = Class.create(Abstract.TimedObserver, {
  getValue: function() {
    return Form.Element.getValue(this.element);
  }
});

Form.Observer = Class.create(Abstract.TimedObserver, {
  getValue: function() {
    return Form.serialize(this.element);
  }
});

/*--------------------------------------------------------------------------*/

Abstract.EventObserver = Class.create({
  initialize: function(element, callback) {
    this.element  = $(element);
    this.callback = callback;

    this.lastValue = this.getValue();
    if (this.element.tagName.toLowerCase() == 'form')
      this.registerFormCallbacks();
    else
      this.registerCallback(this.element);
  },

  onElementEvent: function() {
    var value = this.getValue();
    if (this.lastValue != value) {
      this.callback(this.element, value);
      this.lastValue = value;
    }
  },

  registerFormCallbacks: function() {
    Form.getElements(this.element).each(this.registerCallback, this);
  },

  registerCallback: function(element) {
    if (element.type) {
      switch (element.type.toLowerCase()) {
        case 'checkbox':
        case 'radio':
          Event.observe(element, 'click', this.onElementEvent.bind(this));
          break;
        default:
          Event.observe(element, 'change', this.onElementEvent.bind(this));
          break;
      }
    }
  }
});

Form.Element.EventObserver = Class.create(Abstract.EventObserver, {
  getValue: function() {
    return Form.Element.getValue(this.element);
  }
});

Form.EventObserver = Class.create(Abstract.EventObserver, {
  getValue: function() {
    return Form.serialize(this.element);
  }
});
if (!window.Event) var Event = { };

Object.extend(Event, {
  KEY_BACKSPACE: 8,
  KEY_TAB:       9,
  KEY_RETURN:   13,
  KEY_ESC:      27,
  KEY_LEFT:     37,
  KEY_UP:       38,
  KEY_RIGHT:    39,
  KEY_DOWN:     40,
  KEY_DELETE:   46,
  KEY_HOME:     36,
  KEY_END:      35,
  KEY_PAGEUP:   33,
  KEY_PAGEDOWN: 34,
  KEY_INSERT:   45,

  cache: { },

  relatedTarget: function(event) {
    var element;
    switch(event.type) {
      case 'mouseover': element = event.fromElement; break;
      case 'mouseout':  element = event.toElement;   break;
      default: return null;
    }
    return Element.extend(element);
  }
});

Event.Methods = (function() {
  var isButton;

  if (Prototype.Browser.IE) {
    var buttonMap = { 0: 1, 1: 4, 2: 2 };
    isButton = function(event, code) {
      return event.button == buttonMap[code];
    };

  } else if (Prototype.Browser.WebKit) {
    isButton = function(event, code) {
      switch (code) {
        case 0: return event.which == 1 && !event.metaKey;
        case 1: return event.which == 1 && event.metaKey;
        default: return false;
      }
    };

  } else {
    isButton = function(event, code) {
      return event.which ? (event.which === code + 1) : (event.button === code);
    };
  }

  return {
    isLeftClick:   function(event) { return isButton(event, 0) },
    isMiddleClick: function(event) { return isButton(event, 1) },
    isRightClick:  function(event) { return isButton(event, 2) },

    element: function(event) {
      var node = Event.extend(event).target;
      return Element.extend(node.nodeType == Node.TEXT_NODE ? node.parentNode : node);
    },

    findElement: function(event, expression) {
      var element = Event.element(event);
      if (!expression) return element;
      var elements = [element].concat(element.ancestors());
      return Selector.findElement(elements, expression, 0);
    },

    pointer: function(event) {
      return {
        x: event.pageX || (event.clientX +
          (document.documentElement.scrollLeft || document.body.scrollLeft)),
        y: event.pageY || (event.clientY +
          (document.documentElement.scrollTop || document.body.scrollTop))
      };
    },

    pointerX: function(event) { return Event.pointer(event).x },
    pointerY: function(event) { return Event.pointer(event).y },

    stop: function(event) {
      Event.extend(event);
      event.preventDefault();
      event.stopPropagation();
      event.stopped = true;
    }
  };
})();

Event.extend = (function() {
  var methods = Object.keys(Event.Methods).inject({ }, function(m, name) {
    m[name] = Event.Methods[name].methodize();
    return m;
  });

  if (Prototype.Browser.IE) {
    Object.extend(methods, {
      stopPropagation: function() { this.cancelBubble = true },
      preventDefault:  function() { this.returnValue = false },
      inspect: function() { return "[object Event]" }
    });

    return function(event) {
      if (!event) return false;
      if (event._extendedByPrototype) return event;

      event._extendedByPrototype = Prototype.emptyFunction;
      var pointer = Event.pointer(event);
      Object.extend(event, {
        target: event.srcElement,
        relatedTarget: Event.relatedTarget(event),
        pageX:  pointer.x,
        pageY:  pointer.y
      });
      return Object.extend(event, methods);
    };

  } else {
    Event.prototype = Event.prototype || document.createEvent("HTMLEvents").__proto__;
    Object.extend(Event.prototype, methods);
    return Prototype.K;
  }
})();

Object.extend(Event, (function() {
  var cache = Event.cache;

  function getEventID(element) {
    if (element._eventID) return element._eventID;
    arguments.callee.id = arguments.callee.id || 1;
    return element._eventID = ++arguments.callee.id;
  }

  function getDOMEventName(eventName) {
    if (eventName && eventName.include(':')) return "dataavailable";
    return eventName;
  }

  function getCacheForID(id) {
    return cache[id] = cache[id] || { };
  }

  function getWrappersForEventName(id, eventName) {
    var c = getCacheForID(id);
    return c[eventName] = c[eventName] || [];
  }

  function createWrapper(element, eventName, handler) {
    var id = getEventID(element);
    var c = getWrappersForEventName(id, eventName);
    if (c.pluck("handler").include(handler)) return false;

    var wrapper = function(event) {
      if (!Event || !Event.extend ||
        (event.eventName && event.eventName != eventName))
          return false;

      Event.extend(event);
      handler.call(element, event)
    };

    wrapper.handler = handler;
    c.push(wrapper);
    return wrapper;
  }

  function findWrapper(id, eventName, handler) {
    var c = getWrappersForEventName(id, eventName);
    return c.find(function(wrapper) { return wrapper.handler == handler });
  }

  function destroyWrapper(id, eventName, handler) {
    var c = getCacheForID(id);
    if (!c[eventName]) return false;
    c[eventName] = c[eventName].without(findWrapper(id, eventName, handler));
  }

  function destroyCache() {
    for (var id in cache)
      for (var eventName in cache[id])
        cache[id][eventName] = null;
  }

  if (window.attachEvent) {
    window.attachEvent("onunload", destroyCache);
  }

  return {
    observe: function(element, eventName, handler) {
      element = $(element);
      var name = getDOMEventName(eventName);

      var wrapper = createWrapper(element, eventName, handler);
      if (!wrapper) return element;

      if (element.addEventListener) {
        element.addEventListener(name, wrapper, false);
      } else {
        element.attachEvent("on" + name, wrapper);
      }

      return element;
    },

    stopObserving: function(element, eventName, handler) {
      element = $(element);
      var id = getEventID(element), name = getDOMEventName(eventName);

      if (!handler && eventName) {
        getWrappersForEventName(id, eventName).each(function(wrapper) {
          element.stopObserving(eventName, wrapper.handler);
        });
        return element;

      } else if (!eventName) {
        Object.keys(getCacheForID(id)).each(function(eventName) {
          element.stopObserving(eventName);
        });
        return element;
      }

      var wrapper = findWrapper(id, eventName, handler);
      if (!wrapper) return element;

      if (element.removeEventListener) {
        element.removeEventListener(name, wrapper, false);
      } else {
        element.detachEvent("on" + name, wrapper);
      }

      destroyWrapper(id, eventName, handler);

      return element;
    },

    fire: function(element, eventName, memo) {
      element = $(element);
      if (element == document && document.createEvent && !element.dispatchEvent)
        element = document.documentElement;

      if (document.createEvent) {
        var event = document.createEvent("HTMLEvents");
        event.initEvent("dataavailable", true, true);
      } else {
        var event = document.createEventObject();
        event.eventType = "ondataavailable";
      }

      event.eventName = eventName;
      event.memo = memo || { };

      if (document.createEvent) {
        element.dispatchEvent(event);
      } else {
        element.fireEvent(event.eventType, event);
      }

      return Event.extend(event);
    }
  };
})());

Object.extend(Event, Event.Methods);

Element.addMethods({
  fire:          Event.fire,
  observe:       Event.observe,
  stopObserving: Event.stopObserving
});

Object.extend(document, {
  fire:          Element.Methods.fire.methodize(),
  observe:       Element.Methods.observe.methodize(),
  stopObserving: Element.Methods.stopObserving.methodize()
});

(function() {
  /* Support for the DOMContentLoaded event is based on work by Dan Webb,
     Matthias Miller, Dean Edwards and John Resig. */

  var timer, fired = false;

  function fireContentLoadedEvent() {
    if (fired) return;
    if (timer) window.clearInterval(timer);
    document.fire("dom:loaded");
    fired = true;
  }

  if (document.addEventListener) {
    if (Prototype.Browser.WebKit) {
      timer = window.setInterval(function() {
        if (/loaded|complete/.test(document.readyState))
          fireContentLoadedEvent();
      }, 0);

      Event.observe(window, "load", fireContentLoadedEvent);

    } else {
      document.addEventListener("DOMContentLoaded",
        fireContentLoadedEvent, false);
    }

  } else {
    document.write("<script id=__onDOMContentLoaded defer src=//:><\/script>");
    $("__onDOMContentLoaded").onreadystatechange = function() {
      if (this.readyState == "complete") {
        this.onreadystatechange = null;
        fireContentLoadedEvent();
      }
    };
  }
})();
/*------------------------------- DEPRECATED -------------------------------*/

Hash.toQueryString = Object.toQueryString;

var Toggle = { display: Element.toggle };

Element.Methods.childOf = Element.Methods.descendantOf;

var Insertion = {
  Before: function(element, content) {
    return Element.insert(element, {before:content});
  },

  Top: function(element, content) {
    return Element.insert(element, {top:content});
  },

  Bottom: function(element, content) {
    return Element.insert(element, {bottom:content});
  },

  After: function(element, content) {
    return Element.insert(element, {after:content});
  }
};

var $continue = new Error('"throw $continue" is deprecated, use "return" instead');

// This should be moved to script.aculo.us; notice the deprecated methods
// further below, that map to the newer Element methods.
var Position = {
  // set to true if needed, warning: firefox performance problems
  // NOT neeeded for page scrolling, only if draggable contained in
  // scrollable elements
  includeScrollOffsets: false,

  // must be called before calling withinIncludingScrolloffset, every time the
  // page is scrolled
  prepare: function() {
    this.deltaX =  window.pageXOffset
                || document.documentElement.scrollLeft
                || document.body.scrollLeft
                || 0;
    this.deltaY =  window.pageYOffset
                || document.documentElement.scrollTop
                || document.body.scrollTop
                || 0;
  },

  // caches x/y coordinate pair to use with overlap
  within: function(element, x, y) {
    if (this.includeScrollOffsets)
      return this.withinIncludingScrolloffsets(element, x, y);
    this.xcomp = x;
    this.ycomp = y;
    this.offset = Element.cumulativeOffset(element);

    return (y >= this.offset[1] &&
            y <  this.offset[1] + element.offsetHeight &&
            x >= this.offset[0] &&
            x <  this.offset[0] + element.offsetWidth);
  },

  withinIncludingScrolloffsets: function(element, x, y) {
    var offsetcache = Element.cumulativeScrollOffset(element);

    this.xcomp = x + offsetcache[0] - this.deltaX;
    this.ycomp = y + offsetcache[1] - this.deltaY;
    this.offset = Element.cumulativeOffset(element);

    return (this.ycomp >= this.offset[1] &&
            this.ycomp <  this.offset[1] + element.offsetHeight &&
            this.xcomp >= this.offset[0] &&
            this.xcomp <  this.offset[0] + element.offsetWidth);
  },

  // within must be called directly before
  overlap: function(mode, element) {
    if (!mode) return 0;
    if (mode == 'vertical')
      return ((this.offset[1] + element.offsetHeight) - this.ycomp) /
        element.offsetHeight;
    if (mode == 'horizontal')
      return ((this.offset[0] + element.offsetWidth) - this.xcomp) /
        element.offsetWidth;
  },

  // Deprecation layer -- use newer Element methods now (1.5.2).

  cumulativeOffset: Element.Methods.cumulativeOffset,

  positionedOffset: Element.Methods.positionedOffset,

  absolutize: function(element) {
    Position.prepare();
    return Element.absolutize(element);
  },

  relativize: function(element) {
    Position.prepare();
    return Element.relativize(element);
  },

  realOffset: Element.Methods.cumulativeScrollOffset,

  offsetParent: Element.Methods.getOffsetParent,

  page: Element.Methods.viewportOffset,

  clone: function(source, target, options) {
    options = options || { };
    return Element.clonePosition(target, source, options);
  }
};

/*--------------------------------------------------------------------------*/

if (!document.getElementsByClassName) document.getElementsByClassName = function(instanceMethods){
  function iter(name) {
    return name.blank() ? null : "[contains(concat(' ', @class, ' '), ' " + name + " ')]";
  }

  instanceMethods.getElementsByClassName = Prototype.BrowserFeatures.XPath ?
  function(element, className) {
    className = className.toString().strip();
    var cond = /\s/.test(className) ? $w(className).map(iter).join('') : iter(className);
    return cond ? document._getElementsByXPath('.//*' + cond, element) : [];
  } : function(element, className) {
    className = className.toString().strip();
    var elements = [], classNames = (/\s/.test(className) ? $w(className) : null);
    if (!classNames && !className) return elements;

    var nodes = $(element).getElementsByTagName('*');
    className = ' ' + className + ' ';

    for (var i = 0, child, cn; child = nodes[i]; i++) {
      if (child.className && (cn = ' ' + child.className + ' ') && (cn.include(className) ||
          (classNames && classNames.all(function(name) {
            return !name.toString().blank() && cn.include(' ' + name + ' ');
          }))))
        elements.push(Element.extend(child));
    }
    return elements;
  };

  return function(className, parentElement) {
    return $(parentElement || document.body).getElementsByClassName(className);
  };
}(Element.Methods);

/*--------------------------------------------------------------------------*/

Element.ClassNames = Class.create();
Element.ClassNames.prototype = {
  initialize: function(element) {
    this.element = $(element);
  },

  _each: function(iterator) {
    this.element.className.split(/\s+/).select(function(name) {
      return name.length > 0;
    })._each(iterator);
  },

  set: function(className) {
    this.element.className = className;
  },

  add: function(classNameToAdd) {
    if (this.include(classNameToAdd)) return;
    this.set($A(this).concat(classNameToAdd).join(' '));
  },

  remove: function(classNameToRemove) {
    if (!this.include(classNameToRemove)) return;
    this.set($A(this).without(classNameToRemove).join(' '));
  },

  toString: function() {
    return $A(this).join(' ');
  }
};

Object.extend(Element.ClassNames.prototype, Enumerable);

/*--------------------------------------------------------------------------*/

Element.addMethods();/*
 * Ext JS Library 2.0.2
 * Copyright(c) 2006-2008, Ext JS, LLC.
 * licensing@extjs.com
 * 
 * http://extjs.com/license
 */

Ext={version:"2.0.2"};window["undefined"]=window["undefined"];Ext.apply=function(C,D,B){if(B){Ext.apply(C,B)}if(C&&D&&typeof D=="object"){for(var A in D){C[A]=D[A]}}return C};(function(){var idSeed=0;var ua=navigator.userAgent.toLowerCase();var isStrict=document.compatMode=="CSS1Compat",isOpera=ua.indexOf("opera")>-1,isSafari=(/webkit|khtml/).test(ua),isSafari3=isSafari&&ua.indexOf("webkit/5")!=-1,isIE=!isOpera&&ua.indexOf("msie")>-1,isIE7=!isOpera&&ua.indexOf("msie 7")>-1,isGecko=!isSafari&&ua.indexOf("gecko")>-1,isBorderBox=isIE&&!isStrict,isWindows=(ua.indexOf("windows")!=-1||ua.indexOf("win32")!=-1),isMac=(ua.indexOf("macintosh")!=-1||ua.indexOf("mac os x")!=-1),isAir=(ua.indexOf("adobeair")!=-1),isLinux=(ua.indexOf("linux")!=-1),isSecure=window.location.href.toLowerCase().indexOf("https")===0;if(isIE&&!isIE7){try{document.execCommand("BackgroundImageCache",false,true)}catch(e){}}Ext.apply(Ext,{isStrict:isStrict,isSecure:isSecure,isReady:false,enableGarbageCollector:true,enableListenerCollection:false,SSL_SECURE_URL:"javascript:false",BLANK_IMAGE_URL:"http:/"+"/extjs.com/s.gif",emptyFn:function(){},applyIf:function(o,c){if(o&&c){for(var p in c){if(typeof o[p]=="undefined"){o[p]=c[p]}}}return o},addBehaviors:function(o){if(!Ext.isReady){Ext.onReady(function(){Ext.addBehaviors(o)});return }var cache={};for(var b in o){var parts=b.split("@");if(parts[1]){var s=parts[0];if(!cache[s]){cache[s]=Ext.select(s)}cache[s].on(parts[1],o[b])}}cache=null},id:function(el,prefix){prefix=prefix||"ext-gen";el=Ext.getDom(el);var id=prefix+(++idSeed);return el?(el.id?el.id:(el.id=id)):id},extend:function(){var io=function(o){for(var m in o){this[m]=o[m]}};var oc=Object.prototype.constructor;return function(sb,sp,overrides){if(typeof sp=="object"){overrides=sp;sp=sb;sb=overrides.constructor!=oc?overrides.constructor:function(){sp.apply(this,arguments)}}var F=function(){},sbp,spp=sp.prototype;F.prototype=spp;sbp=sb.prototype=new F();sbp.constructor=sb;sb.superclass=spp;if(spp.constructor==oc){spp.constructor=sp}sb.override=function(o){Ext.override(sb,o)};sbp.override=io;Ext.override(sb,overrides);sb.extend=function(o){Ext.extend(sb,o)};return sb}}(),override:function(origclass,overrides){if(overrides){var p=origclass.prototype;for(var method in overrides){p[method]=overrides[method]}}},namespace:function(){var a=arguments,o=null,i,j,d,rt;for(i=0;i<a.length;++i){d=a[i].split(".");rt=d[0];eval("if (typeof "+rt+" == \"undefined\"){"+rt+" = {};} o = "+rt+";");for(j=1;j<d.length;++j){o[d[j]]=o[d[j]]||{};o=o[d[j]]}}},urlEncode:function(o){if(!o){return""}var buf=[];for(var key in o){var ov=o[key],k=encodeURIComponent(key);var type=typeof ov;if(type=="undefined"){buf.push(k,"=&")}else{if(type!="function"&&type!="object"){buf.push(k,"=",encodeURIComponent(ov),"&")}else{if(Ext.isArray(ov)){if(ov.length){for(var i=0,len=ov.length;i<len;i++){buf.push(k,"=",encodeURIComponent(ov[i]===undefined?"":ov[i]),"&")}}else{buf.push(k,"=&")}}}}}buf.pop();return buf.join("")},urlDecode:function(string,overwrite){if(!string||!string.length){return{}}var obj={};var pairs=string.split("&");var pair,name,value;for(var i=0,len=pairs.length;i<len;i++){pair=pairs[i].split("=");name=decodeURIComponent(pair[0]);value=decodeURIComponent(pair[1]);if(overwrite!==true){if(typeof obj[name]=="undefined"){obj[name]=value}else{if(typeof obj[name]=="string"){obj[name]=[obj[name]];obj[name].push(value)}else{obj[name].push(value)}}}else{obj[name]=value}}return obj},each:function(array,fn,scope){if(typeof array.length=="undefined"||typeof array=="string"){array=[array]}for(var i=0,len=array.length;i<len;i++){if(fn.call(scope||array[i],array[i],i,array)===false){return i}}},combine:function(){var as=arguments,l=as.length,r=[];for(var i=0;i<l;i++){var a=as[i];if(Ext.isArray(a)){r=r.concat(a)}else{if(a.length!==undefined&&!a.substr){r=r.concat(Array.prototype.slice.call(a,0))}else{r.push(a)}}}return r},escapeRe:function(s){return s.replace(/([.*+?^${}()|[\]\/\\])/g,"\\$1")},callback:function(cb,scope,args,delay){if(typeof cb=="function"){if(delay){cb.defer(delay,scope,args||[])}else{cb.apply(scope,args||[])}}},getDom:function(el){if(!el||!document){return null}return el.dom?el.dom:(typeof el=="string"?document.getElementById(el):el)},getDoc:function(){return Ext.get(document)},getBody:function(){return Ext.get(document.body||document.documentElement)},getCmp:function(id){return Ext.ComponentMgr.get(id)},num:function(v,defaultValue){if(typeof v!="number"){return defaultValue}return v},destroy:function(){for(var i=0,a=arguments,len=a.length;i<len;i++){var as=a[i];if(as){if(typeof as.destroy=="function"){as.destroy()}else{if(as.dom){as.removeAllListeners();as.remove()}}}}},removeNode:isIE?function(){var d;return function(n){if(n&&n.tagName!="BODY"){d=d||document.createElement("div");d.appendChild(n);d.innerHTML=""}}}():function(n){if(n&&n.parentNode&&n.tagName!="BODY"){n.parentNode.removeChild(n)}},type:function(o){if(o===undefined||o===null){return false}if(o.htmlElement){return"element"}var t=typeof o;if(t=="object"&&o.nodeName){switch(o.nodeType){case 1:return"element";case 3:return(/\S/).test(o.nodeValue)?"textnode":"whitespace"}}if(t=="object"||t=="function"){switch(o.constructor){case Array:return"array";case RegExp:return"regexp"}if(typeof o.length=="number"&&typeof o.item=="function"){return"nodelist"}}return t},isEmpty:function(v,allowBlank){return v===null||v===undefined||(!allowBlank?v==="":false)},value:function(v,defaultValue,allowBlank){return Ext.isEmpty(v,allowBlank)?defaultValue:v},isArray:function(v){return v&&typeof v.pop=="function"},isDate:function(v){return v&&typeof v.getFullYear=="function"},isOpera:isOpera,isSafari:isSafari,isSafari3:isSafari3,isSafari2:isSafari&&!isSafari3,isIE:isIE,isIE6:isIE&&!isIE7,isIE7:isIE7,isGecko:isGecko,isBorderBox:isBorderBox,isLinux:isLinux,isWindows:isWindows,isMac:isMac,isAir:isAir,useShims:((isIE&&!isIE7)||(isGecko&&isMac))});Ext.ns=Ext.namespace})();Ext.ns("Ext","Ext.util","Ext.grid","Ext.dd","Ext.tree","Ext.data","Ext.form","Ext.menu","Ext.state","Ext.lib","Ext.layout","Ext.app","Ext.ux");Ext.apply(Function.prototype,{createCallback:function(){var A=arguments;var B=this;return function(){return B.apply(window,A)}},createDelegate:function(C,B,A){var D=this;return function(){var F=B||arguments;if(A===true){F=Array.prototype.slice.call(arguments,0);F=F.concat(B)}else{if(typeof A=="number"){F=Array.prototype.slice.call(arguments,0);var E=[A,0].concat(B);Array.prototype.splice.apply(F,E)}}return D.apply(C||window,F)}},defer:function(C,E,B,A){var D=this.createDelegate(E,B,A);if(C){return setTimeout(D,C)}D();return 0},createSequence:function(B,A){if(typeof B!="function"){return this}var C=this;return function(){var D=C.apply(this||window,arguments);B.apply(A||this||window,arguments);return D}},createInterceptor:function(B,A){if(typeof B!="function"){return this}var C=this;return function(){B.target=this;B.method=C;if(B.apply(A||this||window,arguments)===false){return }return C.apply(this||window,arguments)}}});Ext.applyIf(String,{escape:function(A){return A.replace(/('|\\)/g,"\\$1")},leftPad:function(D,B,C){var A=new String(D);if(!C){C=" "}while(A.length<B){A=C+A}return A.toString()},format:function(B){var A=Array.prototype.slice.call(arguments,1);return B.replace(/\{(\d+)\}/g,function(C,D){return A[D]})}});String.prototype.toggle=function(B,A){return this==B?A:B};String.prototype.trim=function(){var A=/^\s+|\s+$/g;return function(){return this.replace(A,"")}}();Ext.applyIf(Number.prototype,{constrain:function(B,A){return Math.min(Math.max(this,B),A)}});Ext.applyIf(Array.prototype,{indexOf:function(C){for(var B=0,A=this.length;B<A;B++){if(this[B]==C){return B}}return -1},remove:function(B){var A=this.indexOf(B);if(A!=-1){this.splice(A,1)}return this}});Date.prototype.getElapsed=function(A){return Math.abs((A||new Date()).getTime()-this.getTime())};
(function(){var B;Ext.lib.Dom={getViewWidth:function(E){return E?this.getDocumentWidth():this.getViewportWidth()},getViewHeight:function(E){return E?this.getDocumentHeight():this.getViewportHeight()},getDocumentHeight:function(){var E=(document.compatMode!="CSS1Compat")?document.body.scrollHeight:document.documentElement.scrollHeight;return Math.max(E,this.getViewportHeight())},getDocumentWidth:function(){var E=(document.compatMode!="CSS1Compat")?document.body.scrollWidth:document.documentElement.scrollWidth;return Math.max(E,this.getViewportWidth())},getViewportHeight:function(){if(Ext.isIE){return Ext.isStrict?document.documentElement.clientHeight:document.body.clientHeight}else{return self.innerHeight}},getViewportWidth:function(){if(Ext.isIE){return Ext.isStrict?document.documentElement.clientWidth:document.body.clientWidth}else{return self.innerWidth}},isAncestor:function(F,G){F=Ext.getDom(F);G=Ext.getDom(G);if(!F||!G){return false}if(F.contains&&!Ext.isSafari){return F.contains(G)}else{if(F.compareDocumentPosition){return !!(F.compareDocumentPosition(G)&16)}else{var E=G.parentNode;while(E){if(E==F){return true}else{if(!E.tagName||E.tagName.toUpperCase()=="HTML"){return false}}E=E.parentNode}return false}}},getRegion:function(E){return Ext.lib.Region.getRegion(E)},getY:function(E){return this.getXY(E)[1]},getX:function(E){return this.getXY(E)[0]},getXY:function(G){var F,K,M,N,J=(document.body||document.documentElement);G=Ext.getDom(G);if(G==J){return[0,0]}if(G.getBoundingClientRect){M=G.getBoundingClientRect();N=C(document).getScroll();return[M.left+N.left,M.top+N.top]}var O=0,L=0;F=G;var E=C(G).getStyle("position")=="absolute";while(F){O+=F.offsetLeft;L+=F.offsetTop;if(!E&&C(F).getStyle("position")=="absolute"){E=true}if(Ext.isGecko){K=C(F);var P=parseInt(K.getStyle("borderTopWidth"),10)||0;var H=parseInt(K.getStyle("borderLeftWidth"),10)||0;O+=H;L+=P;if(F!=G&&K.getStyle("overflow")!="visible"){O+=H;L+=P}}F=F.offsetParent}if(Ext.isSafari&&E){O-=J.offsetLeft;L-=J.offsetTop}if(Ext.isGecko&&!E){var I=C(J);O+=parseInt(I.getStyle("borderLeftWidth"),10)||0;L+=parseInt(I.getStyle("borderTopWidth"),10)||0}F=G.parentNode;while(F&&F!=J){if(!Ext.isOpera||(F.tagName!="TR"&&C(F).getStyle("display")!="inline")){O-=F.scrollLeft;L-=F.scrollTop}F=F.parentNode}return[O,L]},setXY:function(E,F){E=Ext.fly(E,"_setXY");E.position();var G=E.translatePoints(F);if(F[0]!==false){E.dom.style.left=G.left+"px"}if(F[1]!==false){E.dom.style.top=G.top+"px"}},setX:function(F,E){this.setXY(F,[E,false])},setY:function(E,F){this.setXY(E,[false,F])}};Ext.lib.Event=function(){var F=false;var G=[];var K=[];var I=0;var H=[];var E=0;var J=null;return{POLL_RETRYS:200,POLL_INTERVAL:20,EL:0,TYPE:1,FN:2,WFN:3,OBJ:3,ADJ_SCOPE:4,_interval:null,startInterval:function(){if(!this._interval){var L=this;var M=function(){L._tryPreloadAttach()};this._interval=setInterval(M,this.POLL_INTERVAL)}},onAvailable:function(N,L,O,M){H.push({id:N,fn:L,obj:O,override:M,checkReady:false});I=this.POLL_RETRYS;this.startInterval()},addListener:function(Q,M,P){Q=Ext.getDom(Q);if(!Q||!P){return false}if("unload"==M){K[K.length]=[Q,M,P];return true}var O=function(R){return typeof Ext!="undefined"?P(Ext.lib.Event.getEvent(R)):false};var L=[Q,M,P,O];var N=G.length;G[N]=L;this.doAdd(Q,M,O,false);return true},removeListener:function(S,O,R){var Q,N;S=Ext.getDom(S);if(!R){return this.purgeElement(S,false,O)}if("unload"==O){for(Q=0,N=K.length;Q<N;Q++){var M=K[Q];if(M&&M[0]==S&&M[1]==O&&M[2]==R){K.splice(Q,1);return true}}return false}var L=null;var P=arguments[3];if("undefined"==typeof P){P=this._getCacheIndex(S,O,R)}if(P>=0){L=G[P]}if(!S||!L){return false}this.doRemove(S,O,L[this.WFN],false);delete G[P][this.WFN];delete G[P][this.FN];G.splice(P,1);return true},getTarget:function(N,M){N=N.browserEvent||N;var L=N.target||N.srcElement;return this.resolveTextNode(L)},resolveTextNode:function(L){if(Ext.isSafari&&L&&3==L.nodeType){return L.parentNode}else{return L}},getPageX:function(M){M=M.browserEvent||M;var L=M.pageX;if(!L&&0!==L){L=M.clientX||0;if(Ext.isIE){L+=this.getScroll()[1]}}return L},getPageY:function(L){L=L.browserEvent||L;var M=L.pageY;if(!M&&0!==M){M=L.clientY||0;if(Ext.isIE){M+=this.getScroll()[0]}}return M},getXY:function(L){L=L.browserEvent||L;return[this.getPageX(L),this.getPageY(L)]},getRelatedTarget:function(M){M=M.browserEvent||M;var L=M.relatedTarget;if(!L){if(M.type=="mouseout"){L=M.toElement}else{if(M.type=="mouseover"){L=M.fromElement}}}return this.resolveTextNode(L)},getTime:function(N){N=N.browserEvent||N;if(!N.time){var M=new Date().getTime();try{N.time=M}catch(L){this.lastError=L;return M}}return N.time},stopEvent:function(L){this.stopPropagation(L);this.preventDefault(L)},stopPropagation:function(L){L=L.browserEvent||L;if(L.stopPropagation){L.stopPropagation()}else{L.cancelBubble=true}},preventDefault:function(L){L=L.browserEvent||L;if(L.preventDefault){L.preventDefault()}else{L.returnValue=false}},getEvent:function(M){var L=M||window.event;if(!L){var N=this.getEvent.caller;while(N){L=N.arguments[0];if(L&&Event==L.constructor){break}N=N.caller}}return L},getCharCode:function(L){L=L.browserEvent||L;return L.charCode||L.keyCode||0},_getCacheIndex:function(Q,N,P){for(var O=0,M=G.length;O<M;++O){var L=G[O];if(L&&L[this.FN]==P&&L[this.EL]==Q&&L[this.TYPE]==N){return O}}return -1},elCache:{},getEl:function(L){return document.getElementById(L)},clearCache:function(){},_load:function(M){F=true;var L=Ext.lib.Event;if(Ext.isIE){L.doRemove(window,"load",L._load)}},_tryPreloadAttach:function(){if(this.locked){return false}this.locked=true;var R=!F;if(!R){R=(I>0)}var Q=[];for(var M=0,L=H.length;M<L;++M){var P=H[M];if(P){var O=this.getEl(P.id);if(O){if(!P.checkReady||F||O.nextSibling||(document&&document.body)){var N=O;if(P.override){if(P.override===true){N=P.obj}else{N=P.override}}P.fn.call(N,P.obj);H[M]=null}}else{Q.push(P)}}}I=(Q.length===0)?0:I-1;if(R){this.startInterval()}else{clearInterval(this._interval);this._interval=null}this.locked=false;return true},purgeElement:function(P,Q,N){var R=this.getListeners(P,N);if(R){for(var O=0,L=R.length;O<L;++O){var M=R[O];this.removeListener(P,M.type,M.fn)}}if(Q&&P&&P.childNodes){for(O=0,L=P.childNodes.length;O<L;++O){this.purgeElement(P.childNodes[O],Q,N)}}},getListeners:function(M,R){var P=[],L;if(!R){L=[G,K]}else{if(R=="unload"){L=[K]}else{L=[G]}}for(var O=0;O<L.length;++O){var T=L[O];if(T&&T.length>0){for(var Q=0,S=T.length;Q<S;++Q){var N=T[Q];if(N&&N[this.EL]===M&&(!R||R===N[this.TYPE])){P.push({type:N[this.TYPE],fn:N[this.FN],obj:N[this.OBJ],adjust:N[this.ADJ_SCOPE],index:Q})}}}}return(P.length)?P:null},_unload:function(S){var R=Ext.lib.Event,P,O,M,L,N;for(P=0,L=K.length;P<L;++P){M=K[P];if(M){var Q=window;if(M[R.ADJ_SCOPE]){if(M[R.ADJ_SCOPE]===true){Q=M[R.OBJ]}else{Q=M[R.ADJ_SCOPE]}}M[R.FN].call(Q,R.getEvent(S),M[R.OBJ]);K[P]=null;M=null;Q=null}}K=null;if(G&&G.length>0){O=G.length;while(O){N=O-1;M=G[N];if(M){R.removeListener(M[R.EL],M[R.TYPE],M[R.FN],N)}O=O-1}M=null;R.clearCache()}R.doRemove(window,"unload",R._unload)},getScroll:function(){var L=document.documentElement,M=document.body;if(L&&(L.scrollTop||L.scrollLeft)){return[L.scrollTop,L.scrollLeft]}else{if(M){return[M.scrollTop,M.scrollLeft]}else{return[0,0]}}},doAdd:function(){if(window.addEventListener){return function(O,M,N,L){O.addEventListener(M,N,(L))}}else{if(window.attachEvent){return function(O,M,N,L){O.attachEvent("on"+M,N)}}else{return function(){}}}}(),doRemove:function(){if(window.removeEventListener){return function(O,M,N,L){O.removeEventListener(M,N,(L))}}else{if(window.detachEvent){return function(N,L,M){N.detachEvent("on"+L,M)}}else{return function(){}}}}()}}();var D=Ext.lib.Event;D.on=D.addListener;D.un=D.removeListener;if(document&&document.body){D._load()}else{D.doAdd(window,"load",D._load)}D.doAdd(window,"unload",D._unload);D._tryPreloadAttach();Ext.lib.Ajax={request:function(K,I,E,J,F){if(F){var G=F.headers;if(G){for(var H in G){if(G.hasOwnProperty(H)){this.initHeader(H,G[H],false)}}}if(F.xmlData){this.initHeader("Content-Type","text/xml",false);K="POST";J=F.xmlData}else{if(F.jsonData){this.initHeader("Content-Type","text/javascript",false);K="POST";J=typeof F.jsonData=="object"?Ext.encode(F.jsonData):F.jsonData}}}return this.asyncRequest(K,I,E,J)},serializeForm:function(F){if(typeof F=="string"){F=(document.getElementById(F)||document.forms[F])}var G,E,H,J,K="",M=false;for(var L=0;L<F.elements.length;L++){G=F.elements[L];J=F.elements[L].disabled;E=F.elements[L].name;H=F.elements[L].value;if(!J&&E){switch(G.type){case"select-one":case"select-multiple":for(var I=0;I<G.options.length;I++){if(G.options[I].selected){if(Ext.isIE){K+=encodeURIComponent(E)+"="+encodeURIComponent(G.options[I].attributes["value"].specified?G.options[I].value:G.options[I].text)+"&"}else{K+=encodeURIComponent(E)+"="+encodeURIComponent(G.options[I].hasAttribute("value")?G.options[I].value:G.options[I].text)+"&"}}}break;case"radio":case"checkbox":if(G.checked){K+=encodeURIComponent(E)+"="+encodeURIComponent(H)+"&"}break;case"file":case undefined:case"reset":case"button":break;case"submit":if(M==false){K+=encodeURIComponent(E)+"="+encodeURIComponent(H)+"&";M=true}break;default:K+=encodeURIComponent(E)+"="+encodeURIComponent(H)+"&";break}}}K=K.substr(0,K.length-1);return K},headers:{},hasHeaders:false,useDefaultHeader:true,defaultPostHeader:"application/x-www-form-urlencoded",useDefaultXhrHeader:true,defaultXhrHeader:"XMLHttpRequest",hasDefaultHeaders:true,defaultHeaders:{},poll:{},timeout:{},pollInterval:50,transactionId:0,setProgId:function(E){this.activeX.unshift(E)},setDefaultPostHeader:function(E){this.useDefaultHeader=E},setDefaultXhrHeader:function(E){this.useDefaultXhrHeader=E},setPollingInterval:function(E){if(typeof E=="number"&&isFinite(E)){this.pollInterval=E}},createXhrObject:function(I){var H,E;try{E=new XMLHttpRequest();H={conn:E,tId:I}}catch(G){for(var F=0;F<this.activeX.length;++F){try{E=new ActiveXObject(this.activeX[F]);H={conn:E,tId:I};break}catch(G){}}}finally{return H}},getConnectionObject:function(){var F;var G=this.transactionId;try{F=this.createXhrObject(G);if(F){this.transactionId++}}catch(E){}finally{return F}},asyncRequest:function(I,F,H,E){var G=this.getConnectionObject();if(!G){return null}else{G.conn.open(I,F,true);if(this.useDefaultXhrHeader){if(!this.defaultHeaders["X-Requested-With"]){this.initHeader("X-Requested-With",this.defaultXhrHeader,true)}}if(E&&this.useDefaultHeader){this.initHeader("Content-Type",this.defaultPostHeader)}if(this.hasDefaultHeaders||this.hasHeaders){this.setHeader(G)}this.handleReadyState(G,H);G.conn.send(E||null);return G}},handleReadyState:function(F,G){var E=this;if(G&&G.timeout){this.timeout[F.tId]=window.setTimeout(function(){E.abort(F,G,true)},G.timeout)}this.poll[F.tId]=window.setInterval(function(){if(F.conn&&F.conn.readyState==4){window.clearInterval(E.poll[F.tId]);delete E.poll[F.tId];if(G&&G.timeout){window.clearTimeout(E.timeout[F.tId]);delete E.timeout[F.tId]}E.handleTransactionResponse(F,G)}},this.pollInterval)},handleTransactionResponse:function(I,J,E){if(!J){this.releaseObject(I);return }var G,F;try{if(I.conn.status!==undefined&&I.conn.status!=0){G=I.conn.status}else{G=13030}}catch(H){G=13030}if(G>=200&&G<300){F=this.createResponseObject(I,J.argument);if(J.success){if(!J.scope){J.success(F)}else{J.success.apply(J.scope,[F])}}}else{switch(G){case 12002:case 12029:case 12030:case 12031:case 12152:case 13030:F=this.createExceptionObject(I.tId,J.argument,(E?E:false));if(J.failure){if(!J.scope){J.failure(F)}else{J.failure.apply(J.scope,[F])}}break;default:F=this.createResponseObject(I,J.argument);if(J.failure){if(!J.scope){J.failure(F)}else{J.failure.apply(J.scope,[F])}}}}this.releaseObject(I);F=null},createResponseObject:function(E,K){var H={};var M={};try{var G=E.conn.getAllResponseHeaders();var J=G.split("\n");for(var I=0;I<J.length;I++){var F=J[I].indexOf(":");if(F!=-1){M[J[I].substring(0,F)]=J[I].substring(F+2)}}}catch(L){}H.tId=E.tId;H.status=E.conn.status;H.statusText=E.conn.statusText;H.getResponseHeader=M;H.getAllResponseHeaders=G;H.responseText=E.conn.responseText;H.responseXML=E.conn.responseXML;if(typeof K!==undefined){H.argument=K}return H},createExceptionObject:function(L,H,E){var J=0;var K="communication failure";var G=-1;var F="transaction aborted";var I={};I.tId=L;if(E){I.status=G;I.statusText=F}else{I.status=J;I.statusText=K}if(H){I.argument=H}return I},initHeader:function(E,H,G){var F=(G)?this.defaultHeaders:this.headers;if(F[E]===undefined){F[E]=H}else{F[E]=H+","+F[E]}if(G){this.hasDefaultHeaders=true}else{this.hasHeaders=true}},setHeader:function(E){if(this.hasDefaultHeaders){for(var F in this.defaultHeaders){if(this.defaultHeaders.hasOwnProperty(F)){E.conn.setRequestHeader(F,this.defaultHeaders[F])}}}if(this.hasHeaders){for(var F in this.headers){if(this.headers.hasOwnProperty(F)){E.conn.setRequestHeader(F,this.headers[F])}}this.headers={};this.hasHeaders=false}},resetDefaultHeaders:function(){delete this.defaultHeaders;this.defaultHeaders={};this.hasDefaultHeaders=false},abort:function(F,G,E){if(this.isCallInProgress(F)){F.conn.abort();window.clearInterval(this.poll[F.tId]);delete this.poll[F.tId];if(E){delete this.timeout[F.tId]}this.handleTransactionResponse(F,G,true);return true}else{return false}},isCallInProgress:function(E){if(E.conn){return E.conn.readyState!=4&&E.conn.readyState!=0}else{return false}},releaseObject:function(E){E.conn=null;E=null},activeX:["MSXML2.XMLHTTP.3.0","MSXML2.XMLHTTP","Microsoft.XMLHTTP"]};Ext.lib.Region=function(G,H,E,F){this.top=G;this[1]=G;this.right=H;this.bottom=E;this.left=F;this[0]=F};Ext.lib.Region.prototype={contains:function(E){return(E.left>=this.left&&E.right<=this.right&&E.top>=this.top&&E.bottom<=this.bottom)},getArea:function(){return((this.bottom-this.top)*(this.right-this.left))},intersect:function(I){var G=Math.max(this.top,I.top);var H=Math.min(this.right,I.right);var E=Math.min(this.bottom,I.bottom);var F=Math.max(this.left,I.left);if(E>=G&&H>=F){return new Ext.lib.Region(G,H,E,F)}else{return null}},union:function(I){var G=Math.min(this.top,I.top);var H=Math.max(this.right,I.right);var E=Math.max(this.bottom,I.bottom);var F=Math.min(this.left,I.left);return new Ext.lib.Region(G,H,E,F)},constrainTo:function(E){this.top=this.top.constrain(E.top,E.bottom);this.bottom=this.bottom.constrain(E.top,E.bottom);this.left=this.left.constrain(E.left,E.right);this.right=this.right.constrain(E.left,E.right);return this},adjust:function(G,F,E,H){this.top+=G;this.left+=F;this.right+=H;this.bottom+=E;return this}};Ext.lib.Region.getRegion=function(H){var J=Ext.lib.Dom.getXY(H);var G=J[1];var I=J[0]+H.offsetWidth;var E=J[1]+H.offsetHeight;var F=J[0];return new Ext.lib.Region(G,I,E,F)};Ext.lib.Point=function(E,F){if(Ext.isArray(E)){F=E[1];E=E[0]}this.x=this.right=this.left=this[0]=E;this.y=this.top=this.bottom=this[1]=F};Ext.lib.Point.prototype=new Ext.lib.Region();Ext.lib.Anim={scroll:function(H,F,I,J,E,G){return this.run(H,F,I,J,E,G,Ext.lib.Scroll)},motion:function(H,F,I,J,E,G){return this.run(H,F,I,J,E,G,Ext.lib.Motion)},color:function(H,F,I,J,E,G){return this.run(H,F,I,J,E,G,Ext.lib.ColorAnim)},run:function(I,F,K,L,E,H,G){G=G||Ext.lib.AnimBase;if(typeof L=="string"){L=Ext.lib.Easing[L]}var J=new G(I,F,K,L);J.animateX(function(){Ext.callback(E,H)});return J}};function C(E){if(!B){B=new Ext.Element.Flyweight()}B.dom=E;return B}if(Ext.isIE){function A(){var E=Function.prototype;delete E.createSequence;delete E.defer;delete E.createDelegate;delete E.createCallback;delete E.createInterceptor;window.detachEvent("onunload",A)}window.attachEvent("onunload",A)}Ext.lib.AnimBase=function(F,E,G,H){if(F){this.init(F,E,G,H)}};Ext.lib.AnimBase.prototype={toString:function(){var E=this.getEl();var F=E.id||E.tagName;return("Anim "+F)},patterns:{noNegatives:/width|height|opacity|padding/i,offsetAttribute:/^((width|height)|(top|left))$/,defaultUnit:/width|height|top$|bottom$|left$|right$/i,offsetUnit:/\d+(em|%|en|ex|pt|in|cm|mm|pc)$/i},doMethod:function(E,G,F){return this.method(this.currentFrame,G,F-G,this.totalFrames)},setAttribute:function(E,G,F){if(this.patterns.noNegatives.test(E)){G=(G>0)?G:0}Ext.fly(this.getEl(),"_anim").setStyle(E,G+F)},getAttribute:function(E){var G=this.getEl();var I=C(G).getStyle(E);if(I!=="auto"&&!this.patterns.offsetUnit.test(I)){return parseFloat(I)}var F=this.patterns.offsetAttribute.exec(E)||[];var J=!!(F[3]);var H=!!(F[2]);if(H||(C(G).getStyle("position")=="absolute"&&J)){I=G["offset"+F[0].charAt(0).toUpperCase()+F[0].substr(1)]}else{I=0}return I},getDefaultUnit:function(E){if(this.patterns.defaultUnit.test(E)){return"px"}return""},animateX:function(G,E){var F=function(){this.onComplete.removeListener(F);if(typeof G=="function"){G.call(E||this,this)}};this.onComplete.addListener(F,this);this.animate()},setRuntimeAttribute:function(F){var K;var G;var H=this.attributes;this.runtimeAttributes[F]={};var J=function(L){return(typeof L!=="undefined")};if(!J(H[F]["to"])&&!J(H[F]["by"])){return false}K=(J(H[F]["from"]))?H[F]["from"]:this.getAttribute(F);if(J(H[F]["to"])){G=H[F]["to"]}else{if(J(H[F]["by"])){if(K.constructor==Array){G=[];for(var I=0,E=K.length;I<E;++I){G[I]=K[I]+H[F]["by"][I]}}else{G=K+H[F]["by"]}}}this.runtimeAttributes[F].start=K;this.runtimeAttributes[F].end=G;this.runtimeAttributes[F].unit=(J(H[F].unit))?H[F]["unit"]:this.getDefaultUnit(F)},init:function(G,L,K,E){var F=false;var H=null;var J=0;G=Ext.getDom(G);this.attributes=L||{};this.duration=K||1;this.method=E||Ext.lib.Easing.easeNone;this.useSeconds=true;this.currentFrame=0;this.totalFrames=Ext.lib.AnimMgr.fps;this.getEl=function(){return G};this.isAnimated=function(){return F};this.getStartTime=function(){return H};this.runtimeAttributes={};this.animate=function(){if(this.isAnimated()){return false}this.currentFrame=0;this.totalFrames=(this.useSeconds)?Math.ceil(Ext.lib.AnimMgr.fps*this.duration):this.duration;Ext.lib.AnimMgr.registerElement(this)};this.stop=function(O){if(O){this.currentFrame=this.totalFrames;this._onTween.fire()}Ext.lib.AnimMgr.stop(this)};var N=function(){this.onStart.fire();this.runtimeAttributes={};for(var O in this.attributes){this.setRuntimeAttribute(O)}F=true;J=0;H=new Date()};var M=function(){var Q={duration:new Date()-this.getStartTime(),currentFrame:this.currentFrame};Q.toString=function(){return("duration: "+Q.duration+", currentFrame: "+Q.currentFrame)};this.onTween.fire(Q);var P=this.runtimeAttributes;for(var O in P){this.setAttribute(O,this.doMethod(O,P[O].start,P[O].end),P[O].unit)}J+=1};var I=function(){var O=(new Date()-H)/1000;var P={duration:O,frames:J,fps:J/O};P.toString=function(){return("duration: "+P.duration+", frames: "+P.frames+", fps: "+P.fps)};F=false;J=0;this.onComplete.fire(P)};this._onStart=new Ext.util.Event(this);this.onStart=new Ext.util.Event(this);this.onTween=new Ext.util.Event(this);this._onTween=new Ext.util.Event(this);this.onComplete=new Ext.util.Event(this);this._onComplete=new Ext.util.Event(this);this._onStart.addListener(N);this._onTween.addListener(M);this._onComplete.addListener(I)}};Ext.lib.AnimMgr=new function(){var G=null;var F=[];var E=0;this.fps=1000;this.delay=1;this.registerElement=function(J){F[F.length]=J;E+=1;J._onStart.fire();this.start()};this.unRegister=function(K,J){K._onComplete.fire();J=J||I(K);if(J!=-1){F.splice(J,1)}E-=1;if(E<=0){this.stop()}};this.start=function(){if(G===null){G=setInterval(this.run,this.delay)}};this.stop=function(L){if(!L){clearInterval(G);for(var K=0,J=F.length;K<J;++K){if(F[0].isAnimated()){this.unRegister(F[0],0)}}F=[];G=null;E=0}else{this.unRegister(L)}};this.run=function(){for(var L=0,J=F.length;L<J;++L){var K=F[L];if(!K||!K.isAnimated()){continue}if(K.currentFrame<K.totalFrames||K.totalFrames===null){K.currentFrame+=1;if(K.useSeconds){H(K)}K._onTween.fire()}else{Ext.lib.AnimMgr.stop(K,L)}}};var I=function(L){for(var K=0,J=F.length;K<J;++K){if(F[K]==L){return K}}return -1};var H=function(K){var N=K.totalFrames;var M=K.currentFrame;var L=(K.currentFrame*K.duration*1000/K.totalFrames);var J=(new Date()-K.getStartTime());var O=0;if(J<K.duration*1000){O=Math.round((J/L-1)*K.currentFrame)}else{O=N-(M+1)}if(O>0&&isFinite(O)){if(K.currentFrame+O>=N){O=N-(M+1)}K.currentFrame+=O}}};Ext.lib.Bezier=new function(){this.getPosition=function(I,H){var J=I.length;var G=[];for(var F=0;F<J;++F){G[F]=[I[F][0],I[F][1]]}for(var E=1;E<J;++E){for(F=0;F<J-E;++F){G[F][0]=(1-H)*G[F][0]+H*G[parseInt(F+1,10)][0];G[F][1]=(1-H)*G[F][1]+H*G[parseInt(F+1,10)][1]}}return[G[0][0],G[0][1]]}};(function(){Ext.lib.ColorAnim=function(I,H,J,K){Ext.lib.ColorAnim.superclass.constructor.call(this,I,H,J,K)};Ext.extend(Ext.lib.ColorAnim,Ext.lib.AnimBase);var F=Ext.lib;var G=F.ColorAnim.superclass;var E=F.ColorAnim.prototype;E.toString=function(){var H=this.getEl();var I=H.id||H.tagName;return("ColorAnim "+I)};E.patterns.color=/color$/i;E.patterns.rgb=/^rgb\(([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\)$/i;E.patterns.hex=/^#?([0-9A-F]{2})([0-9A-F]{2})([0-9A-F]{2})$/i;E.patterns.hex3=/^#?([0-9A-F]{1})([0-9A-F]{1})([0-9A-F]{1})$/i;E.patterns.transparent=/^transparent|rgba\(0, 0, 0, 0\)$/;E.parseColor=function(H){if(H.length==3){return H}var I=this.patterns.hex.exec(H);if(I&&I.length==4){return[parseInt(I[1],16),parseInt(I[2],16),parseInt(I[3],16)]}I=this.patterns.rgb.exec(H);if(I&&I.length==4){return[parseInt(I[1],10),parseInt(I[2],10),parseInt(I[3],10)]}I=this.patterns.hex3.exec(H);if(I&&I.length==4){return[parseInt(I[1]+I[1],16),parseInt(I[2]+I[2],16),parseInt(I[3]+I[3],16)]}return null};E.getAttribute=function(H){var J=this.getEl();if(this.patterns.color.test(H)){var K=C(J).getStyle(H);if(this.patterns.transparent.test(K)){var I=J.parentNode;K=C(I).getStyle(H);while(I&&this.patterns.transparent.test(K)){I=I.parentNode;K=C(I).getStyle(H);if(I.tagName.toUpperCase()=="HTML"){K="#fff"}}}}else{K=G.getAttribute.call(this,H)}return K};E.doMethod=function(I,M,J){var L;if(this.patterns.color.test(I)){L=[];for(var K=0,H=M.length;K<H;++K){L[K]=G.doMethod.call(this,I,M[K],J[K])}L="rgb("+Math.floor(L[0])+","+Math.floor(L[1])+","+Math.floor(L[2])+")"}else{L=G.doMethod.call(this,I,M,J)}return L};E.setRuntimeAttribute=function(I){G.setRuntimeAttribute.call(this,I);if(this.patterns.color.test(I)){var K=this.attributes;var M=this.parseColor(this.runtimeAttributes[I].start);var J=this.parseColor(this.runtimeAttributes[I].end);if(typeof K[I]["to"]==="undefined"&&typeof K[I]["by"]!=="undefined"){J=this.parseColor(K[I].by);for(var L=0,H=M.length;L<H;++L){J[L]=M[L]+J[L]}}this.runtimeAttributes[I].start=M;this.runtimeAttributes[I].end=J}}})();Ext.lib.Easing={easeNone:function(F,E,H,G){return H*F/G+E},easeIn:function(F,E,H,G){return H*(F/=G)*F+E},easeOut:function(F,E,H,G){return -H*(F/=G)*(F-2)+E},easeBoth:function(F,E,H,G){if((F/=G/2)<1){return H/2*F*F+E}return -H/2*((--F)*(F-2)-1)+E},easeInStrong:function(F,E,H,G){return H*(F/=G)*F*F*F+E},easeOutStrong:function(F,E,H,G){return -H*((F=F/G-1)*F*F*F-1)+E},easeBothStrong:function(F,E,H,G){if((F/=G/2)<1){return H/2*F*F*F*F+E}return -H/2*((F-=2)*F*F*F-2)+E},elasticIn:function(G,E,K,J,F,I){if(G==0){return E}if((G/=J)==1){return E+K}if(!I){I=J*0.3}if(!F||F<Math.abs(K)){F=K;var H=I/4}else{var H=I/(2*Math.PI)*Math.asin(K/F)}return -(F*Math.pow(2,10*(G-=1))*Math.sin((G*J-H)*(2*Math.PI)/I))+E},elasticOut:function(G,E,K,J,F,I){if(G==0){return E}if((G/=J)==1){return E+K}if(!I){I=J*0.3}if(!F||F<Math.abs(K)){F=K;var H=I/4}else{var H=I/(2*Math.PI)*Math.asin(K/F)}return F*Math.pow(2,-10*G)*Math.sin((G*J-H)*(2*Math.PI)/I)+K+E},elasticBoth:function(G,E,K,J,F,I){if(G==0){return E}if((G/=J/2)==2){return E+K}if(!I){I=J*(0.3*1.5)}if(!F||F<Math.abs(K)){F=K;var H=I/4}else{var H=I/(2*Math.PI)*Math.asin(K/F)}if(G<1){return -0.5*(F*Math.pow(2,10*(G-=1))*Math.sin((G*J-H)*(2*Math.PI)/I))+E}return F*Math.pow(2,-10*(G-=1))*Math.sin((G*J-H)*(2*Math.PI)/I)*0.5+K+E},backIn:function(F,E,I,H,G){if(typeof G=="undefined"){G=1.70158}return I*(F/=H)*F*((G+1)*F-G)+E},backOut:function(F,E,I,H,G){if(typeof G=="undefined"){G=1.70158}return I*((F=F/H-1)*F*((G+1)*F+G)+1)+E},backBoth:function(F,E,I,H,G){if(typeof G=="undefined"){G=1.70158}if((F/=H/2)<1){return I/2*(F*F*(((G*=(1.525))+1)*F-G))+E}return I/2*((F-=2)*F*(((G*=(1.525))+1)*F+G)+2)+E},bounceIn:function(F,E,H,G){return H-Ext.lib.Easing.bounceOut(G-F,0,H,G)+E},bounceOut:function(F,E,H,G){if((F/=G)<(1/2.75)){return H*(7.5625*F*F)+E}else{if(F<(2/2.75)){return H*(7.5625*(F-=(1.5/2.75))*F+0.75)+E}else{if(F<(2.5/2.75)){return H*(7.5625*(F-=(2.25/2.75))*F+0.9375)+E}}}return H*(7.5625*(F-=(2.625/2.75))*F+0.984375)+E},bounceBoth:function(F,E,H,G){if(F<G/2){return Ext.lib.Easing.bounceIn(F*2,0,H,G)*0.5+E}return Ext.lib.Easing.bounceOut(F*2-G,0,H,G)*0.5+H*0.5+E}};(function(){Ext.lib.Motion=function(K,J,L,M){if(K){Ext.lib.Motion.superclass.constructor.call(this,K,J,L,M)}};Ext.extend(Ext.lib.Motion,Ext.lib.ColorAnim);var H=Ext.lib;var I=H.Motion.superclass;var F=H.Motion.prototype;F.toString=function(){var J=this.getEl();var K=J.id||J.tagName;return("Motion "+K)};F.patterns.points=/^points$/i;F.setAttribute=function(J,L,K){if(this.patterns.points.test(J)){K=K||"px";I.setAttribute.call(this,"left",L[0],K);I.setAttribute.call(this,"top",L[1],K)}else{I.setAttribute.call(this,J,L,K)}};F.getAttribute=function(J){if(this.patterns.points.test(J)){var K=[I.getAttribute.call(this,"left"),I.getAttribute.call(this,"top")]}else{K=I.getAttribute.call(this,J)}return K};F.doMethod=function(J,N,K){var M=null;if(this.patterns.points.test(J)){var L=this.method(this.currentFrame,0,100,this.totalFrames)/100;M=H.Bezier.getPosition(this.runtimeAttributes[J],L)}else{M=I.doMethod.call(this,J,N,K)}return M};F.setRuntimeAttribute=function(S){if(this.patterns.points.test(S)){var K=this.getEl();var M=this.attributes;var J;var O=M["points"]["control"]||[];var L;var P,R;if(O.length>0&&!Ext.isArray(O[0])){O=[O]}else{var N=[];for(P=0,R=O.length;P<R;++P){N[P]=O[P]}O=N}Ext.fly(K).position();if(G(M["points"]["from"])){Ext.lib.Dom.setXY(K,M["points"]["from"])}else{Ext.lib.Dom.setXY(K,Ext.lib.Dom.getXY(K))}J=this.getAttribute("points");if(G(M["points"]["to"])){L=E.call(this,M["points"]["to"],J);var Q=Ext.lib.Dom.getXY(this.getEl());for(P=0,R=O.length;P<R;++P){O[P]=E.call(this,O[P],J)}}else{if(G(M["points"]["by"])){L=[J[0]+M["points"]["by"][0],J[1]+M["points"]["by"][1]];for(P=0,R=O.length;P<R;++P){O[P]=[J[0]+O[P][0],J[1]+O[P][1]]}}}this.runtimeAttributes[S]=[J];if(O.length>0){this.runtimeAttributes[S]=this.runtimeAttributes[S].concat(O)}this.runtimeAttributes[S][this.runtimeAttributes[S].length]=L}else{I.setRuntimeAttribute.call(this,S)}};var E=function(J,L){var K=Ext.lib.Dom.getXY(this.getEl());J=[J[0]-K[0]+L[0],J[1]-K[1]+L[1]];return J};var G=function(J){return(typeof J!=="undefined")}})();(function(){Ext.lib.Scroll=function(I,H,J,K){if(I){Ext.lib.Scroll.superclass.constructor.call(this,I,H,J,K)}};Ext.extend(Ext.lib.Scroll,Ext.lib.ColorAnim);var F=Ext.lib;var G=F.Scroll.superclass;var E=F.Scroll.prototype;E.toString=function(){var H=this.getEl();var I=H.id||H.tagName;return("Scroll "+I)};E.doMethod=function(H,K,I){var J=null;if(H=="scroll"){J=[this.method(this.currentFrame,K[0],I[0]-K[0],this.totalFrames),this.method(this.currentFrame,K[1],I[1]-K[1],this.totalFrames)]}else{J=G.doMethod.call(this,H,K,I)}return J};E.getAttribute=function(H){var J=null;var I=this.getEl();if(H=="scroll"){J=[I.scrollLeft,I.scrollTop]}else{J=G.getAttribute.call(this,H)}return J};E.setAttribute=function(H,K,J){var I=this.getEl();if(H=="scroll"){I.scrollLeft=K[0];I.scrollTop=K[1]}else{G.setAttribute.call(this,H,K,J)}}})()})();
/*
 * Ext JS Library 2.0.2
 * Copyright(c) 2006-2008, Ext JS, LLC.
 * licensing@extjs.com
 * 
 * http://extjs.com/license
 */

Ext.DomHelper=function(){var L=null;var F=/^(?:br|frame|hr|img|input|link|meta|range|spacer|wbr|area|param|col)$/i;var B=/^table|tbody|tr|td$/i;var A=function(T){if(typeof T=="string"){return T}var O="";if(Ext.isArray(T)){for(var R=0,P=T.length;R<P;R++){O+=A(T[R])}return O}if(!T.tag){T.tag="div"}O+="<"+T.tag;for(var N in T){if(N=="tag"||N=="children"||N=="cn"||N=="html"||typeof T[N]=="function"){continue}if(N=="style"){var S=T["style"];if(typeof S=="function"){S=S.call()}if(typeof S=="string"){O+=" style=\""+S+"\""}else{if(typeof S=="object"){O+=" style=\"";for(var Q in S){if(typeof S[Q]!="function"){O+=Q+":"+S[Q]+";"}}O+="\""}}}else{if(N=="cls"){O+=" class=\""+T["cls"]+"\""}else{if(N=="htmlFor"){O+=" for=\""+T["htmlFor"]+"\""}else{O+=" "+N+"=\""+T[N]+"\""}}}}if(F.test(T.tag)){O+="/>"}else{O+=">";var U=T.children||T.cn;if(U){O+=A(U)}else{if(T.html){O+=T.html}}O+="</"+T.tag+">"}return O};var M=function(T,O){var S;if(Ext.isArray(T)){S=document.createDocumentFragment();for(var R=0,P=T.length;R<P;R++){M(T[R],S)}}else{if(typeof T=="string)"){S=document.createTextNode(T)}else{S=document.createElement(T.tag||"div");var Q=!!S.setAttribute;for(var N in T){if(N=="tag"||N=="children"||N=="cn"||N=="html"||N=="style"||typeof T[N]=="function"){continue}if(N=="cls"){S.className=T["cls"]}else{if(Q){S.setAttribute(N,T[N])}else{S[N]=T[N]}}}Ext.DomHelper.applyStyles(S,T.style);var U=T.children||T.cn;if(U){M(U,S)}else{if(T.html){S.innerHTML=T.html}}}}if(O){O.appendChild(S)}return S};var I=function(S,Q,P,R){L.innerHTML=[Q,P,R].join("");var N=-1,O=L;while(++N<S){O=O.firstChild}return O};var J="<table>",E="</table>",C=J+"<tbody>",K="</tbody>"+E,H=C+"<tr>",D="</tr>"+K;var G=function(N,O,Q,P){if(!L){L=document.createElement("div")}var R;var S=null;if(N=="td"){if(O=="afterbegin"||O=="beforeend"){return }if(O=="beforebegin"){S=Q;Q=Q.parentNode}else{S=Q.nextSibling;Q=Q.parentNode}R=I(4,H,P,D)}else{if(N=="tr"){if(O=="beforebegin"){S=Q;Q=Q.parentNode;R=I(3,C,P,K)}else{if(O=="afterend"){S=Q.nextSibling;Q=Q.parentNode;R=I(3,C,P,K)}else{if(O=="afterbegin"){S=Q.firstChild}R=I(4,H,P,D)}}}else{if(N=="tbody"){if(O=="beforebegin"){S=Q;Q=Q.parentNode;R=I(2,J,P,E)}else{if(O=="afterend"){S=Q.nextSibling;Q=Q.parentNode;R=I(2,J,P,E)}else{if(O=="afterbegin"){S=Q.firstChild}R=I(3,C,P,K)}}}else{if(O=="beforebegin"||O=="afterend"){return }if(O=="afterbegin"){S=Q.firstChild}R=I(2,J,P,E)}}}Q.insertBefore(R,S);return R};return{useDom:false,markup:function(N){return A(N)},applyStyles:function(P,Q){if(Q){P=Ext.fly(P);if(typeof Q=="string"){var O=/\s?([a-z\-]*)\:\s?([^;]*);?/gi;var R;while((R=O.exec(Q))!=null){P.setStyle(R[1],R[2])}}else{if(typeof Q=="object"){for(var N in Q){P.setStyle(N,Q[N])}}else{if(typeof Q=="function"){Ext.DomHelper.applyStyles(P,Q.call())}}}}},insertHtml:function(P,R,Q){P=P.toLowerCase();if(R.insertAdjacentHTML){if(B.test(R.tagName)){var O;if(O=G(R.tagName.toLowerCase(),P,R,Q)){return O}}switch(P){case"beforebegin":R.insertAdjacentHTML("BeforeBegin",Q);return R.previousSibling;case"afterbegin":R.insertAdjacentHTML("AfterBegin",Q);return R.firstChild;case"beforeend":R.insertAdjacentHTML("BeforeEnd",Q);return R.lastChild;case"afterend":R.insertAdjacentHTML("AfterEnd",Q);return R.nextSibling}throw"Illegal insertion point -> \""+P+"\""}var N=R.ownerDocument.createRange();var S;switch(P){case"beforebegin":N.setStartBefore(R);S=N.createContextualFragment(Q);R.parentNode.insertBefore(S,R);return R.previousSibling;case"afterbegin":if(R.firstChild){N.setStartBefore(R.firstChild);S=N.createContextualFragment(Q);R.insertBefore(S,R.firstChild);return R.firstChild}else{R.innerHTML=Q;return R.firstChild}case"beforeend":if(R.lastChild){N.setStartAfter(R.lastChild);S=N.createContextualFragment(Q);R.appendChild(S);return R.lastChild}else{R.innerHTML=Q;return R.lastChild}case"afterend":N.setStartAfter(R);S=N.createContextualFragment(Q);R.parentNode.insertBefore(S,R.nextSibling);return R.nextSibling}throw"Illegal insertion point -> \""+P+"\""},insertBefore:function(N,P,O){return this.doInsert(N,P,O,"beforeBegin")},insertAfter:function(N,P,O){return this.doInsert(N,P,O,"afterEnd","nextSibling")},insertFirst:function(N,P,O){return this.doInsert(N,P,O,"afterBegin","firstChild")},doInsert:function(Q,S,R,T,P){Q=Ext.getDom(Q);var O;if(this.useDom){O=M(S,null);(P==="firstChild"?Q:Q.parentNode).insertBefore(O,P?Q[P]:Q)}else{var N=A(S);O=this.insertHtml(T,Q,N)}return R?Ext.get(O,true):O},append:function(P,R,Q){P=Ext.getDom(P);var O;if(this.useDom){O=M(R,null);P.appendChild(O)}else{var N=A(R);O=this.insertHtml("beforeEnd",P,N)}return Q?Ext.get(O,true):O},overwrite:function(N,P,O){N=Ext.getDom(N);N.innerHTML=A(P);return O?Ext.get(N.firstChild,true):N.firstChild},createTemplate:function(O){var N=A(O);return new Ext.Template(N)}}}();
Ext.Template=function(E){var B=arguments;if(Ext.isArray(E)){E=E.join("")}else{if(B.length>1){var C=[];for(var D=0,A=B.length;D<A;D++){if(typeof B[D]=="object"){Ext.apply(this,B[D])}else{C[C.length]=B[D]}}E=C.join("")}}this.html=E;if(this.compiled){this.compile()}};Ext.Template.prototype={applyTemplate:function(B){if(this.compiled){return this.compiled(B)}var A=this.disableFormats!==true;var E=Ext.util.Format,C=this;var D=function(G,I,L,H){if(L&&A){if(L.substr(0,5)=="this."){return C.call(L.substr(5),B[I],B)}else{if(H){var K=/^\s*['"](.*)["']\s*$/;H=H.split(",");for(var J=0,F=H.length;J<F;J++){H[J]=H[J].replace(K,"$1")}H=[B[I]].concat(H)}else{H=[B[I]]}return E[L].apply(E,H)}}else{return B[I]!==undefined?B[I]:""}};return this.html.replace(this.re,D)},set:function(A,B){this.html=A;this.compiled=null;if(B){this.compile()}return this},disableFormats:false,re:/\{([\w-]+)(?:\:([\w\.]*)(?:\((.*?)?\))?)?\}/g,compile:function(){var fm=Ext.util.Format;var useF=this.disableFormats!==true;var sep=Ext.isGecko?"+":",";var fn=function(m,name,format,args){if(format&&useF){args=args?","+args:"";if(format.substr(0,5)!="this."){format="fm."+format+"("}else{format="this.call(\""+format.substr(5)+"\", ";args=", values"}}else{args="";format="(values['"+name+"'] == undefined ? '' : "}return"'"+sep+format+"values['"+name+"']"+args+")"+sep+"'"};var body;if(Ext.isGecko){body="this.compiled = function(values){ return '"+this.html.replace(/\\/g,"\\\\").replace(/(\r\n|\n)/g,"\\n").replace(/'/g,"\\'").replace(this.re,fn)+"';};"}else{body=["this.compiled = function(values){ return ['"];body.push(this.html.replace(/\\/g,"\\\\").replace(/(\r\n|\n)/g,"\\n").replace(/'/g,"\\'").replace(this.re,fn));body.push("'].join('');};");body=body.join("")}eval(body);return this},call:function(C,B,A){return this[C](B,A)},insertFirst:function(B,A,C){return this.doInsert("afterBegin",B,A,C)},insertBefore:function(B,A,C){return this.doInsert("beforeBegin",B,A,C)},insertAfter:function(B,A,C){return this.doInsert("afterEnd",B,A,C)},append:function(B,A,C){return this.doInsert("beforeEnd",B,A,C)},doInsert:function(C,E,B,A){E=Ext.getDom(E);var D=Ext.DomHelper.insertHtml(C,E,this.applyTemplate(B));return A?Ext.get(D,true):D},overwrite:function(B,A,C){B=Ext.getDom(B);B.innerHTML=this.applyTemplate(A);return C?Ext.get(B.firstChild,true):B.firstChild}};Ext.Template.prototype.apply=Ext.Template.prototype.applyTemplate;Ext.DomHelper.Template=Ext.Template;Ext.Template.from=function(B,A){B=Ext.getDom(B);return new Ext.Template(B.value||B.innerHTML,A||"")};
Ext.DomQuery=function(){var cache={},simpleCache={},valueCache={};var nonSpace=/\S/;var trimRe=/^\s+|\s+$/g;var tplRe=/\{(\d+)\}/g;var modeRe=/^(\s?[\/>+~]\s?|\s|$)/;var tagTokenRe=/^(#)?([\w-\*]+)/;var nthRe=/(\d*)n\+?(\d*)/,nthRe2=/\D/;function child(p,index){var i=0;var n=p.firstChild;while(n){if(n.nodeType==1){if(++i==index){return n}}n=n.nextSibling}return null}function next(n){while((n=n.nextSibling)&&n.nodeType!=1){}return n}function prev(n){while((n=n.previousSibling)&&n.nodeType!=1){}return n}function children(d){var n=d.firstChild,ni=-1;while(n){var nx=n.nextSibling;if(n.nodeType==3&&!nonSpace.test(n.nodeValue)){d.removeChild(n)}else{n.nodeIndex=++ni}n=nx}return this}function byClassName(c,a,v){if(!v){return c}var r=[],ri=-1,cn;for(var i=0,ci;ci=c[i];i++){if((" "+ci.className+" ").indexOf(v)!=-1){r[++ri]=ci}}return r}function attrValue(n,attr){if(!n.tagName&&typeof n.length!="undefined"){n=n[0]}if(!n){return null}if(attr=="for"){return n.htmlFor}if(attr=="class"||attr=="className"){return n.className}return n.getAttribute(attr)||n[attr]}function getNodes(ns,mode,tagName){var result=[],ri=-1,cs;if(!ns){return result}tagName=tagName||"*";if(typeof ns.getElementsByTagName!="undefined"){ns=[ns]}if(!mode){for(var i=0,ni;ni=ns[i];i++){cs=ni.getElementsByTagName(tagName);for(var j=0,ci;ci=cs[j];j++){result[++ri]=ci}}}else{if(mode=="/"||mode==">"){var utag=tagName.toUpperCase();for(var i=0,ni,cn;ni=ns[i];i++){cn=ni.children||ni.childNodes;for(var j=0,cj;cj=cn[j];j++){if(cj.nodeName==utag||cj.nodeName==tagName||tagName=="*"){result[++ri]=cj}}}}else{if(mode=="+"){var utag=tagName.toUpperCase();for(var i=0,n;n=ns[i];i++){while((n=n.nextSibling)&&n.nodeType!=1){}if(n&&(n.nodeName==utag||n.nodeName==tagName||tagName=="*")){result[++ri]=n}}}else{if(mode=="~"){for(var i=0,n;n=ns[i];i++){while((n=n.nextSibling)&&(n.nodeType!=1||(tagName=="*"||n.tagName.toLowerCase()!=tagName))){}if(n){result[++ri]=n}}}}}}return result}function concat(a,b){if(b.slice){return a.concat(b)}for(var i=0,l=b.length;i<l;i++){a[a.length]=b[i]}return a}function byTag(cs,tagName){if(cs.tagName||cs==document){cs=[cs]}if(!tagName){return cs}var r=[],ri=-1;tagName=tagName.toLowerCase();for(var i=0,ci;ci=cs[i];i++){if(ci.nodeType==1&&ci.tagName.toLowerCase()==tagName){r[++ri]=ci}}return r}function byId(cs,attr,id){if(cs.tagName||cs==document){cs=[cs]}if(!id){return cs}var r=[],ri=-1;for(var i=0,ci;ci=cs[i];i++){if(ci&&ci.id==id){r[++ri]=ci;return r}}return r}function byAttribute(cs,attr,value,op,custom){var r=[],ri=-1,st=custom=="{";var f=Ext.DomQuery.operators[op];for(var i=0,ci;ci=cs[i];i++){var a;if(st){a=Ext.DomQuery.getStyle(ci,attr)}else{if(attr=="class"||attr=="className"){a=ci.className}else{if(attr=="for"){a=ci.htmlFor}else{if(attr=="href"){a=ci.getAttribute("href",2)}else{a=ci.getAttribute(attr)}}}}if((f&&f(a,value))||(!f&&a)){r[++ri]=ci}}return r}function byPseudo(cs,name,value){return Ext.DomQuery.pseudos[name](cs,value)}var isIE=window.ActiveXObject?true:false;eval("var batch = 30803;");var key=30803;function nodupIEXml(cs){var d=++key;cs[0].setAttribute("_nodup",d);var r=[cs[0]];for(var i=1,len=cs.length;i<len;i++){var c=cs[i];if(!c.getAttribute("_nodup")!=d){c.setAttribute("_nodup",d);r[r.length]=c}}for(var i=0,len=cs.length;i<len;i++){cs[i].removeAttribute("_nodup")}return r}function nodup(cs){if(!cs){return[]}var len=cs.length,c,i,r=cs,cj,ri=-1;if(!len||typeof cs.nodeType!="undefined"||len==1){return cs}if(isIE&&typeof cs[0].selectSingleNode!="undefined"){return nodupIEXml(cs)}var d=++key;cs[0]._nodup=d;for(i=1;c=cs[i];i++){if(c._nodup!=d){c._nodup=d}else{r=[];for(var j=0;j<i;j++){r[++ri]=cs[j]}for(j=i+1;cj=cs[j];j++){if(cj._nodup!=d){cj._nodup=d;r[++ri]=cj}}return r}}return r}function quickDiffIEXml(c1,c2){var d=++key;for(var i=0,len=c1.length;i<len;i++){c1[i].setAttribute("_qdiff",d)}var r=[];for(var i=0,len=c2.length;i<len;i++){if(c2[i].getAttribute("_qdiff")!=d){r[r.length]=c2[i]}}for(var i=0,len=c1.length;i<len;i++){c1[i].removeAttribute("_qdiff")}return r}function quickDiff(c1,c2){var len1=c1.length;if(!len1){return c2}if(isIE&&c1[0].selectSingleNode){return quickDiffIEXml(c1,c2)}var d=++key;for(var i=0;i<len1;i++){c1[i]._qdiff=d}var r=[];for(var i=0,len=c2.length;i<len;i++){if(c2[i]._qdiff!=d){r[r.length]=c2[i]}}return r}function quickId(ns,mode,root,id){if(ns==root){var d=root.ownerDocument||root;return d.getElementById(id)}ns=getNodes(ns,mode,"*");return byId(ns,null,id)}return{getStyle:function(el,name){return Ext.fly(el).getStyle(name)},compile:function(path,type){type=type||"select";var fn=["var f = function(root){\n var mode; ++batch; var n = root || document;\n"];var q=path,mode,lq;var tk=Ext.DomQuery.matchers;var tklen=tk.length;var mm;var lmode=q.match(modeRe);if(lmode&&lmode[1]){fn[fn.length]="mode=\""+lmode[1].replace(trimRe,"")+"\";";q=q.replace(lmode[1],"")}while(path.substr(0,1)=="/"){path=path.substr(1)}while(q&&lq!=q){lq=q;var tm=q.match(tagTokenRe);if(type=="select"){if(tm){if(tm[1]=="#"){fn[fn.length]="n = quickId(n, mode, root, \""+tm[2]+"\");"}else{fn[fn.length]="n = getNodes(n, mode, \""+tm[2]+"\");"}q=q.replace(tm[0],"")}else{if(q.substr(0,1)!="@"){fn[fn.length]="n = getNodes(n, mode, \"*\");"}}}else{if(tm){if(tm[1]=="#"){fn[fn.length]="n = byId(n, null, \""+tm[2]+"\");"}else{fn[fn.length]="n = byTag(n, \""+tm[2]+"\");"}q=q.replace(tm[0],"")}}while(!(mm=q.match(modeRe))){var matched=false;for(var j=0;j<tklen;j++){var t=tk[j];var m=q.match(t.re);if(m){fn[fn.length]=t.select.replace(tplRe,function(x,i){return m[i]});q=q.replace(m[0],"");matched=true;break}}if(!matched){throw"Error parsing selector, parsing failed at \""+q+"\""}}if(mm[1]){fn[fn.length]="mode=\""+mm[1].replace(trimRe,"")+"\";";q=q.replace(mm[1],"")}}fn[fn.length]="return nodup(n);\n}";eval(fn.join(""));return f},select:function(path,root,type){if(!root||root==document){root=document}if(typeof root=="string"){root=document.getElementById(root)}var paths=path.split(",");var results=[];for(var i=0,len=paths.length;i<len;i++){var p=paths[i].replace(trimRe,"");if(!cache[p]){cache[p]=Ext.DomQuery.compile(p);if(!cache[p]){throw p+" is not a valid selector"}}var result=cache[p](root);if(result&&result!=document){results=results.concat(result)}}if(paths.length>1){return nodup(results)}return results},selectNode:function(path,root){return Ext.DomQuery.select(path,root)[0]},selectValue:function(path,root,defaultValue){path=path.replace(trimRe,"");if(!valueCache[path]){valueCache[path]=Ext.DomQuery.compile(path,"select")}var n=valueCache[path](root);n=n[0]?n[0]:n;var v=(n&&n.firstChild?n.firstChild.nodeValue:null);return((v===null||v===undefined||v==="")?defaultValue:v)},selectNumber:function(path,root,defaultValue){var v=Ext.DomQuery.selectValue(path,root,defaultValue||0);return parseFloat(v)},is:function(el,ss){if(typeof el=="string"){el=document.getElementById(el)}var isArray=Ext.isArray(el);var result=Ext.DomQuery.filter(isArray?el:[el],ss);return isArray?(result.length==el.length):(result.length>0)},filter:function(els,ss,nonMatches){ss=ss.replace(trimRe,"");if(!simpleCache[ss]){simpleCache[ss]=Ext.DomQuery.compile(ss,"simple")}var result=simpleCache[ss](els);return nonMatches?quickDiff(result,els):result},matchers:[{re:/^\.([\w-]+)/,select:"n = byClassName(n, null, \" {1} \");"},{re:/^\:([\w-]+)(?:\(((?:[^\s>\/]*|.*?))\))?/,select:"n = byPseudo(n, \"{1}\", \"{2}\");"},{re:/^(?:([\[\{])(?:@)?([\w-]+)\s?(?:(=|.=)\s?['"]?(.*?)["']?)?[\]\}])/,select:"n = byAttribute(n, \"{2}\", \"{4}\", \"{3}\", \"{1}\");"},{re:/^#([\w-]+)/,select:"n = byId(n, null, \"{1}\");"},{re:/^@([\w-]+)/,select:"return {firstChild:{nodeValue:attrValue(n, \"{1}\")}};"}],operators:{"=":function(a,v){return a==v},"!=":function(a,v){return a!=v},"^=":function(a,v){return a&&a.substr(0,v.length)==v},"$=":function(a,v){return a&&a.substr(a.length-v.length)==v},"*=":function(a,v){return a&&a.indexOf(v)!==-1},"%=":function(a,v){return(a%v)==0},"|=":function(a,v){return a&&(a==v||a.substr(0,v.length+1)==v+"-")},"~=":function(a,v){return a&&(" "+a+" ").indexOf(" "+v+" ")!=-1}},pseudos:{"first-child":function(c){var r=[],ri=-1,n;for(var i=0,ci;ci=n=c[i];i++){while((n=n.previousSibling)&&n.nodeType!=1){}if(!n){r[++ri]=ci}}return r},"last-child":function(c){var r=[],ri=-1,n;for(var i=0,ci;ci=n=c[i];i++){while((n=n.nextSibling)&&n.nodeType!=1){}if(!n){r[++ri]=ci}}return r},"nth-child":function(c,a){var r=[],ri=-1;var m=nthRe.exec(a=="even"&&"2n"||a=="odd"&&"2n+1"||!nthRe2.test(a)&&"n+"+a||a);var f=(m[1]||1)-0,l=m[2]-0;for(var i=0,n;n=c[i];i++){var pn=n.parentNode;if(batch!=pn._batch){var j=0;for(var cn=pn.firstChild;cn;cn=cn.nextSibling){if(cn.nodeType==1){cn.nodeIndex=++j}}pn._batch=batch}if(f==1){if(l==0||n.nodeIndex==l){r[++ri]=n}}else{if((n.nodeIndex+l)%f==0){r[++ri]=n}}}return r},"only-child":function(c){var r=[],ri=-1;for(var i=0,ci;ci=c[i];i++){if(!prev(ci)&&!next(ci)){r[++ri]=ci}}return r},"empty":function(c){var r=[],ri=-1;for(var i=0,ci;ci=c[i];i++){var cns=ci.childNodes,j=0,cn,empty=true;while(cn=cns[j]){++j;if(cn.nodeType==1||cn.nodeType==3){empty=false;break}}if(empty){r[++ri]=ci}}return r},"contains":function(c,v){var r=[],ri=-1;for(var i=0,ci;ci=c[i];i++){if((ci.textContent||ci.innerText||"").indexOf(v)!=-1){r[++ri]=ci}}return r},"nodeValue":function(c,v){var r=[],ri=-1;for(var i=0,ci;ci=c[i];i++){if(ci.firstChild&&ci.firstChild.nodeValue==v){r[++ri]=ci}}return r},"checked":function(c){var r=[],ri=-1;for(var i=0,ci;ci=c[i];i++){if(ci.checked==true){r[++ri]=ci}}return r},"not":function(c,ss){return Ext.DomQuery.filter(c,ss,true)},"any":function(c,selectors){var ss=selectors.split("|");var r=[],ri=-1,s;for(var i=0,ci;ci=c[i];i++){for(var j=0;s=ss[j];j++){if(Ext.DomQuery.is(ci,s)){r[++ri]=ci;break}}}return r},"odd":function(c){return this["nth-child"](c,"odd")},"even":function(c){return this["nth-child"](c,"even")},"nth":function(c,a){return c[a-1]||[]},"first":function(c){return c[0]||[]},"last":function(c){return c[c.length-1]||[]},"has":function(c,ss){var s=Ext.DomQuery.select;var r=[],ri=-1;for(var i=0,ci;ci=c[i];i++){if(s(ss,ci).length>0){r[++ri]=ci}}return r},"next":function(c,ss){var is=Ext.DomQuery.is;var r=[],ri=-1;for(var i=0,ci;ci=c[i];i++){var n=next(ci);if(n&&is(n,ss)){r[++ri]=ci}}return r},"prev":function(c,ss){var is=Ext.DomQuery.is;var r=[],ri=-1;for(var i=0,ci;ci=c[i];i++){var n=prev(ci);if(n&&is(n,ss)){r[++ri]=ci}}return r}}}}();Ext.query=Ext.DomQuery.select;
Ext.util.Observable=function(){if(this.listeners){this.on(this.listeners);delete this.listeners}};Ext.util.Observable.prototype={fireEvent:function(){if(this.eventsSuspended!==true){var A=this.events[arguments[0].toLowerCase()];if(typeof A=="object"){return A.fire.apply(A,Array.prototype.slice.call(arguments,1))}}return true},filterOptRe:/^(?:scope|delay|buffer|single)$/,addListener:function(A,C,B,F){if(typeof A=="object"){F=A;for(var E in F){if(this.filterOptRe.test(E)){continue}if(typeof F[E]=="function"){this.addListener(E,F[E],F.scope,F)}else{this.addListener(E,F[E].fn,F[E].scope,F[E])}}return }F=(!F||typeof F=="boolean")?{}:F;A=A.toLowerCase();var D=this.events[A]||true;if(typeof D=="boolean"){D=new Ext.util.Event(this,A);this.events[A]=D}D.addListener(C,B,F)},removeListener:function(A,C,B){var D=this.events[A.toLowerCase()];if(typeof D=="object"){D.removeListener(C,B)}},purgeListeners:function(){for(var A in this.events){if(typeof this.events[A]=="object"){this.events[A].clearListeners()}}},relayEvents:function(F,D){var E=function(G){return function(){return this.fireEvent.apply(this,Ext.combine(G,Array.prototype.slice.call(arguments,0)))}};for(var C=0,A=D.length;C<A;C++){var B=D[C];if(!this.events[B]){this.events[B]=true}F.on(B,E(B),this)}},addEvents:function(D){if(!this.events){this.events={}}if(typeof D=="string"){for(var C=0,A=arguments,B;B=A[C];C++){if(!this.events[A[C]]){D[A[C]]=true}}}else{Ext.applyIf(this.events,D)}},hasListener:function(A){var B=this.events[A];return typeof B=="object"&&B.listeners.length>0},suspendEvents:function(){this.eventsSuspended=true},resumeEvents:function(){this.eventsSuspended=false},getMethodEvent:function(G){if(!this.methodEvents){this.methodEvents={}}var F=this.methodEvents[G];if(!F){F={};this.methodEvents[G]=F;F.originalFn=this[G];F.methodName=G;F.before=[];F.after=[];var C,B,D;var E=this;var A=function(J,I,H){if((B=J.apply(I||E,H))!==undefined){if(typeof B==="object"){if(B.returnValue!==undefined){C=B.returnValue}else{C=B}if(B.cancel===true){D=true}}else{if(B===false){D=true}else{C=B}}}};this[G]=function(){C=B=undefined;D=false;var I=Array.prototype.slice.call(arguments,0);for(var J=0,H=F.before.length;J<H;J++){A(F.before[J].fn,F.before[J].scope,I);if(D){return C}}if((B=F.originalFn.apply(E,I))!==undefined){C=B}for(var J=0,H=F.after.length;J<H;J++){A(F.after[J].fn,F.after[J].scope,I);if(D){return C}}return C}}return F},beforeMethod:function(D,B,A){var C=this.getMethodEvent(D);C.before.push({fn:B,scope:A})},afterMethod:function(D,B,A){var C=this.getMethodEvent(D);C.after.push({fn:B,scope:A})},removeMethodListener:function(F,D,C){var E=this.getMethodEvent(F);for(var B=0,A=E.before.length;B<A;B++){if(E.before[B].fn==D&&E.before[B].scope==C){E.before.splice(B,1);return }}for(var B=0,A=E.after.length;B<A;B++){if(E.after[B].fn==D&&E.after[B].scope==C){E.after.splice(B,1);return }}}};Ext.util.Observable.prototype.on=Ext.util.Observable.prototype.addListener;Ext.util.Observable.prototype.un=Ext.util.Observable.prototype.removeListener;Ext.util.Observable.capture=function(C,B,A){C.fireEvent=C.fireEvent.createInterceptor(B,A)};Ext.util.Observable.releaseCapture=function(A){A.fireEvent=Ext.util.Observable.prototype.fireEvent};(function(){var B=function(F,G,E){var D=new Ext.util.DelayedTask();return function(){D.delay(G.buffer,F,E,Array.prototype.slice.call(arguments,0))}};var C=function(F,G,E,D){return function(){G.removeListener(E,D);return F.apply(D,arguments)}};var A=function(E,F,D){return function(){var G=Array.prototype.slice.call(arguments,0);setTimeout(function(){E.apply(D,G)},F.delay||10)}};Ext.util.Event=function(E,D){this.name=D;this.obj=E;this.listeners=[]};Ext.util.Event.prototype={addListener:function(G,F,E){F=F||this.obj;if(!this.isListening(G,F)){var D=this.createListener(G,F,E);if(!this.firing){this.listeners.push(D)}else{this.listeners=this.listeners.slice(0);this.listeners.push(D)}}},createListener:function(G,F,H){H=H||{};F=F||this.obj;var D={fn:G,scope:F,options:H};var E=G;if(H.delay){E=A(E,H,F)}if(H.single){E=C(E,this,G,F)}if(H.buffer){E=B(E,H,F)}D.fireFn=E;return D},findListener:function(I,H){H=H||this.obj;var F=this.listeners;for(var G=0,D=F.length;G<D;G++){var E=F[G];if(E.fn==I&&E.scope==H){return G}}return -1},isListening:function(E,D){return this.findListener(E,D)!=-1},removeListener:function(F,E){var D;if((D=this.findListener(F,E))!=-1){if(!this.firing){this.listeners.splice(D,1)}else{this.listeners=this.listeners.slice(0);this.listeners.splice(D,1)}return true}return false},clearListeners:function(){this.listeners=[]},fire:function(){var F=this.listeners,I,D=F.length;if(D>0){this.firing=true;var G=Array.prototype.slice.call(arguments,0);for(var H=0;H<D;H++){var E=F[H];if(E.fireFn.apply(E.scope||this.obj||window,arguments)===false){this.firing=false;return false}}this.firing=false}return true}}})();
Ext.EventManager=function(){var T,M,I=false;var K,S,C,O;var L=Ext.lib.Event;var N=Ext.lib.Dom;var B=function(){if(!I){I=true;Ext.isReady=true;if(M){clearInterval(M)}if(Ext.isGecko||Ext.isOpera){document.removeEventListener("DOMContentLoaded",B,false)}if(Ext.isIE){var D=document.getElementById("ie-deferred-loader");if(D){D.onreadystatechange=null;D.parentNode.removeChild(D)}}if(T){T.fire();T.clearListeners()}}};var A=function(){T=new Ext.util.Event();if(Ext.isGecko||Ext.isOpera){document.addEventListener("DOMContentLoaded",B,false)}else{if(Ext.isIE){document.write("<s"+"cript id=\"ie-deferred-loader\" defer=\"defer\" src=\"/"+"/:\"></s"+"cript>");var D=document.getElementById("ie-deferred-loader");D.onreadystatechange=function(){if(this.readyState=="complete"){B()}}}else{if(Ext.isSafari){M=setInterval(function(){var E=document.readyState;if(E=="complete"){B()}},10)}}}L.on(window,"load",B)};var R=function(E,U){var D=new Ext.util.DelayedTask(E);return function(V){V=new Ext.EventObjectImpl(V);D.delay(U.buffer,E,null,[V])}};var P=function(V,U,D,E){return function(W){Ext.EventManager.removeListener(U,D,E);V(W)}};var F=function(D,E){return function(U){U=new Ext.EventObjectImpl(U);setTimeout(function(){D(U)},E.delay||10)}};var J=function(U,E,D,Y,X){var Z=(!D||typeof D=="boolean")?{}:D;Y=Y||Z.fn;X=X||Z.scope;var W=Ext.getDom(U);if(!W){throw"Error listening for \""+E+"\". Element \""+U+"\" doesn't exist."}var V=function(b){b=Ext.EventObject.setEvent(b);var a;if(Z.delegate){a=b.getTarget(Z.delegate,W);if(!a){return }}else{a=b.target}if(Z.stopEvent===true){b.stopEvent()}if(Z.preventDefault===true){b.preventDefault()}if(Z.stopPropagation===true){b.stopPropagation()}if(Z.normalized===false){b=b.browserEvent}Y.call(X||W,b,a,Z)};if(Z.delay){V=F(V,Z)}if(Z.single){V=P(V,W,E,Y)}if(Z.buffer){V=R(V,Z)}Y._handlers=Y._handlers||[];Y._handlers.push([Ext.id(W),E,V]);L.on(W,E,V);if(E=="mousewheel"&&W.addEventListener){W.addEventListener("DOMMouseScroll",V,false);L.on(window,"unload",function(){W.removeEventListener("DOMMouseScroll",V,false)})}if(E=="mousedown"&&W==document){Ext.EventManager.stoppedMouseDownEvent.addListener(V)}return V};var G=function(E,U,Z){var D=Ext.id(E),a=Z._handlers,X=Z;if(a){for(var V=0,Y=a.length;V<Y;V++){var W=a[V];if(W[0]==D&&W[1]==U){X=W[2];a.splice(V,1);break}}}L.un(E,U,X);E=Ext.getDom(E);if(U=="mousewheel"&&E.addEventListener){E.removeEventListener("DOMMouseScroll",X,false)}if(U=="mousedown"&&E==document){Ext.EventManager.stoppedMouseDownEvent.removeListener(X)}};var H=/^(?:scope|delay|buffer|single|stopEvent|preventDefault|stopPropagation|normalized|args|delegate)$/;var Q={addListener:function(U,D,W,V,E){if(typeof D=="object"){var Y=D;for(var X in Y){if(H.test(X)){continue}if(typeof Y[X]=="function"){J(U,X,Y,Y[X],Y.scope)}else{J(U,X,Y[X])}}return }return J(U,D,E,W,V)},removeListener:function(E,D,U){return G(E,D,U)},onDocumentReady:function(U,E,D){if(I){T.addListener(U,E,D);T.fire();T.clearListeners();return }if(!T){A()}T.addListener(U,E,D)},onWindowResize:function(U,E,D){if(!K){K=new Ext.util.Event();S=new Ext.util.DelayedTask(function(){K.fire(N.getViewWidth(),N.getViewHeight())});L.on(window,"resize",this.fireWindowResize,this)}K.addListener(U,E,D)},fireWindowResize:function(){if(K){if((Ext.isIE||Ext.isAir)&&S){S.delay(50)}else{K.fire(N.getViewWidth(),N.getViewHeight())}}},onTextResize:function(V,U,D){if(!C){C=new Ext.util.Event();var E=new Ext.Element(document.createElement("div"));E.dom.className="x-text-resize";E.dom.innerHTML="X";E.appendTo(document.body);O=E.dom.offsetHeight;setInterval(function(){if(E.dom.offsetHeight!=O){C.fire(O,O=E.dom.offsetHeight)}},this.textResizeInterval)}C.addListener(V,U,D)},removeResizeListener:function(E,D){if(K){K.removeListener(E,D)}},fireResize:function(){if(K){K.fire(N.getViewWidth(),N.getViewHeight())}},ieDeferSrc:false,textResizeInterval:50};Q.on=Q.addListener;Q.un=Q.removeListener;Q.stoppedMouseDownEvent=new Ext.util.Event();return Q}();Ext.onReady=Ext.EventManager.onDocumentReady;Ext.onReady(function(){var B=Ext.getBody();if(!B){return }var A=[Ext.isIE?"ext-ie "+(Ext.isIE6?"ext-ie6":"ext-ie7"):Ext.isGecko?"ext-gecko":Ext.isOpera?"ext-opera":Ext.isSafari?"ext-safari":""];if(Ext.isMac){A.push("ext-mac")}if(Ext.isLinux){A.push("ext-linux")}if(Ext.isBorderBox){A.push("ext-border-box")}if(Ext.isStrict){var C=B.dom.parentNode;if(C){C.className+=" ext-strict"}}B.addClass(A.join(" "))});Ext.EventObject=function(){var B=Ext.lib.Event;var A={63234:37,63235:39,63232:38,63233:40,63276:33,63277:34,63272:46,63273:36,63275:35};var C=Ext.isIE?{1:0,4:1,2:2}:(Ext.isSafari?{1:0,2:1,3:2}:{0:0,1:1,2:2});Ext.EventObjectImpl=function(D){if(D){this.setEvent(D.browserEvent||D)}};Ext.EventObjectImpl.prototype={browserEvent:null,button:-1,shiftKey:false,ctrlKey:false,altKey:false,BACKSPACE:8,TAB:9,RETURN:13,ENTER:13,SHIFT:16,CONTROL:17,ESC:27,SPACE:32,PAGEUP:33,PAGEDOWN:34,END:35,HOME:36,LEFT:37,UP:38,RIGHT:39,DOWN:40,DELETE:46,F5:116,setEvent:function(D){if(D==this||(D&&D.browserEvent)){return D}this.browserEvent=D;if(D){this.button=D.button?C[D.button]:(D.which?D.which-1:-1);if(D.type=="click"&&this.button==-1){this.button=0}this.type=D.type;this.shiftKey=D.shiftKey;this.ctrlKey=D.ctrlKey||D.metaKey;this.altKey=D.altKey;this.keyCode=D.keyCode;this.charCode=D.charCode;this.target=B.getTarget(D);this.xy=B.getXY(D)}else{this.button=-1;this.shiftKey=false;this.ctrlKey=false;this.altKey=false;this.keyCode=0;this.charCode=0;this.target=null;this.xy=[0,0]}return this},stopEvent:function(){if(this.browserEvent){if(this.browserEvent.type=="mousedown"){Ext.EventManager.stoppedMouseDownEvent.fire(this)}B.stopEvent(this.browserEvent)}},preventDefault:function(){if(this.browserEvent){B.preventDefault(this.browserEvent)}},isNavKeyPress:function(){var D=this.keyCode;D=Ext.isSafari?(A[D]||D):D;return(D>=33&&D<=40)||D==this.RETURN||D==this.TAB||D==this.ESC},isSpecialKey:function(){var D=this.keyCode;return(this.type=="keypress"&&this.ctrlKey)||D==9||D==13||D==40||D==27||(D==16)||(D==17)||(D>=18&&D<=20)||(D>=33&&D<=35)||(D>=36&&D<=39)||(D>=44&&D<=45)},stopPropagation:function(){if(this.browserEvent){if(this.browserEvent.type=="mousedown"){Ext.EventManager.stoppedMouseDownEvent.fire(this)}B.stopPropagation(this.browserEvent)}},getCharCode:function(){return this.charCode||this.keyCode},getKey:function(){var D=this.keyCode||this.charCode;return Ext.isSafari?(A[D]||D):D},getPageX:function(){return this.xy[0]},getPageY:function(){return this.xy[1]},getTime:function(){if(this.browserEvent){return B.getTime(this.browserEvent)}return null},getXY:function(){return this.xy},getTarget:function(E,G,D){var F=Ext.get(this.target);return E?F.findParent(E,G,D):(D?F:this.target)},getRelatedTarget:function(){if(this.browserEvent){return B.getRelatedTarget(this.browserEvent)}return null},getWheelDelta:function(){var D=this.browserEvent;var E=0;if(D.wheelDelta){E=D.wheelDelta/120}else{if(D.detail){E=-D.detail/3}}return E},hasModifier:function(){return((this.ctrlKey||this.altKey)||this.shiftKey)?true:false},within:function(E,F){var D=this[F?"getRelatedTarget":"getTarget"]();return D&&Ext.fly(E).contains(D)},getPoint:function(){return new Ext.lib.Point(this.xy[0],this.xy[1])}};return new Ext.EventObjectImpl()}();
(function(){var D=Ext.lib.Dom;var E=Ext.lib.Event;var A=Ext.lib.Anim;var propCache={};var camelRe=/(-[a-z])/gi;var camelFn=function(m,a){return a.charAt(1).toUpperCase()};var view=document.defaultView;Ext.Element=function(element,forceNew){var dom=typeof element=="string"?document.getElementById(element):element;if(!dom){return null}var id=dom.id;if(forceNew!==true&&id&&Ext.Element.cache[id]){return Ext.Element.cache[id]}this.dom=dom;this.id=id||Ext.id(dom)};var El=Ext.Element;El.prototype={originalDisplay:"",visibilityMode:1,defaultUnit:"px",setVisibilityMode:function(visMode){this.visibilityMode=visMode;return this},enableDisplayMode:function(display){this.setVisibilityMode(El.DISPLAY);if(typeof display!="undefined"){this.originalDisplay=display}return this},findParent:function(simpleSelector,maxDepth,returnEl){var p=this.dom,b=document.body,depth=0,dq=Ext.DomQuery,stopEl;maxDepth=maxDepth||50;if(typeof maxDepth!="number"){stopEl=Ext.getDom(maxDepth);maxDepth=10}while(p&&p.nodeType==1&&depth<maxDepth&&p!=b&&p!=stopEl){if(dq.is(p,simpleSelector)){return returnEl?Ext.get(p):p}depth++;p=p.parentNode}return null},findParentNode:function(simpleSelector,maxDepth,returnEl){var p=Ext.fly(this.dom.parentNode,"_internal");return p?p.findParent(simpleSelector,maxDepth,returnEl):null},up:function(simpleSelector,maxDepth){return this.findParentNode(simpleSelector,maxDepth,true)},is:function(simpleSelector){return Ext.DomQuery.is(this.dom,simpleSelector)},animate:function(args,duration,onComplete,easing,animType){this.anim(args,{duration:duration,callback:onComplete,easing:easing},animType);return this},anim:function(args,opt,animType,defaultDur,defaultEase,cb){animType=animType||"run";opt=opt||{};var anim=Ext.lib.Anim[animType](this.dom,args,(opt.duration||defaultDur)||0.35,(opt.easing||defaultEase)||"easeOut",function(){Ext.callback(cb,this);Ext.callback(opt.callback,opt.scope||this,[this,opt])},this);opt.anim=anim;return anim},preanim:function(a,i){return !a[i]?false:(typeof a[i]=="object"?a[i]:{duration:a[i+1],callback:a[i+2],easing:a[i+3]})},clean:function(forceReclean){if(this.isCleaned&&forceReclean!==true){return this}var ns=/\S/;var d=this.dom,n=d.firstChild,ni=-1;while(n){var nx=n.nextSibling;if(n.nodeType==3&&!ns.test(n.nodeValue)){d.removeChild(n)}else{n.nodeIndex=++ni}n=nx}this.isCleaned=true;return this},scrollIntoView:function(container,hscroll){var c=Ext.getDom(container)||Ext.getBody().dom;var el=this.dom;var o=this.getOffsetsTo(c),l=o[0]+c.scrollLeft,t=o[1]+c.scrollTop,b=t+el.offsetHeight,r=l+el.offsetWidth;var ch=c.clientHeight;var ct=parseInt(c.scrollTop,10);var cl=parseInt(c.scrollLeft,10);var cb=ct+ch;var cr=cl+c.clientWidth;if(el.offsetHeight>ch||t<ct){c.scrollTop=t}else{if(b>cb){c.scrollTop=b-ch}}c.scrollTop=c.scrollTop;if(hscroll!==false){if(el.offsetWidth>c.clientWidth||l<cl){c.scrollLeft=l}else{if(r>cr){c.scrollLeft=r-c.clientWidth}}c.scrollLeft=c.scrollLeft}return this},scrollChildIntoView:function(child,hscroll){Ext.fly(child,"_scrollChildIntoView").scrollIntoView(this,hscroll)},autoHeight:function(animate,duration,onComplete,easing){var oldHeight=this.getHeight();this.clip();this.setHeight(1);setTimeout(function(){var height=parseInt(this.dom.scrollHeight,10);if(!animate){this.setHeight(height);this.unclip();if(typeof onComplete=="function"){onComplete()}}else{this.setHeight(oldHeight);this.setHeight(height,animate,duration,function(){this.unclip();if(typeof onComplete=="function"){onComplete()}}.createDelegate(this),easing)}}.createDelegate(this),0);return this},contains:function(el){if(!el){return false}return D.isAncestor(this.dom,el.dom?el.dom:el)},isVisible:function(deep){var vis=!(this.getStyle("visibility")=="hidden"||this.getStyle("display")=="none");if(deep!==true||!vis){return vis}var p=this.dom.parentNode;while(p&&p.tagName.toLowerCase()!="body"){if(!Ext.fly(p,"_isVisible").isVisible()){return false}p=p.parentNode}return true},select:function(selector,unique){return El.select(selector,unique,this.dom)},query:function(selector,unique){return Ext.DomQuery.select(selector,this.dom)},child:function(selector,returnDom){var n=Ext.DomQuery.selectNode(selector,this.dom);return returnDom?n:Ext.get(n)},down:function(selector,returnDom){var n=Ext.DomQuery.selectNode(" > "+selector,this.dom);return returnDom?n:Ext.get(n)},initDD:function(group,config,overrides){var dd=new Ext.dd.DD(Ext.id(this.dom),group,config);return Ext.apply(dd,overrides)},initDDProxy:function(group,config,overrides){var dd=new Ext.dd.DDProxy(Ext.id(this.dom),group,config);return Ext.apply(dd,overrides)},initDDTarget:function(group,config,overrides){var dd=new Ext.dd.DDTarget(Ext.id(this.dom),group,config);return Ext.apply(dd,overrides)},setVisible:function(visible,animate){if(!animate||!A){if(this.visibilityMode==El.DISPLAY){this.setDisplayed(visible)}else{this.fixDisplay();this.dom.style.visibility=visible?"visible":"hidden"}}else{var dom=this.dom;var visMode=this.visibilityMode;if(visible){this.setOpacity(0.01);this.setVisible(true)}this.anim({opacity:{to:(visible?1:0)}},this.preanim(arguments,1),null,0.35,"easeIn",function(){if(!visible){if(visMode==El.DISPLAY){dom.style.display="none"}else{dom.style.visibility="hidden"}Ext.get(dom).setOpacity(1)}})}return this},isDisplayed:function(){return this.getStyle("display")!="none"},toggle:function(animate){this.setVisible(!this.isVisible(),this.preanim(arguments,0));return this},setDisplayed:function(value){if(typeof value=="boolean"){value=value?this.originalDisplay:"none"}this.setStyle("display",value);return this},focus:function(){try{this.dom.focus()}catch(e){}return this},blur:function(){try{this.dom.blur()}catch(e){}return this},addClass:function(className){if(Ext.isArray(className)){for(var i=0,len=className.length;i<len;i++){this.addClass(className[i])}}else{if(className&&!this.hasClass(className)){this.dom.className=this.dom.className+" "+className}}return this},radioClass:function(className){var siblings=this.dom.parentNode.childNodes;for(var i=0;i<siblings.length;i++){var s=siblings[i];if(s.nodeType==1){Ext.get(s).removeClass(className)}}this.addClass(className);return this},removeClass:function(className){if(!className||!this.dom.className){return this}if(Ext.isArray(className)){for(var i=0,len=className.length;i<len;i++){this.removeClass(className[i])}}else{if(this.hasClass(className)){var re=this.classReCache[className];if(!re){re=new RegExp("(?:^|\\s+)"+className+"(?:\\s+|$)","g");this.classReCache[className]=re}this.dom.className=this.dom.className.replace(re," ")}}return this},classReCache:{},toggleClass:function(className){if(this.hasClass(className)){this.removeClass(className)}else{this.addClass(className)}return this},hasClass:function(className){return className&&(" "+this.dom.className+" ").indexOf(" "+className+" ")!=-1},replaceClass:function(oldClassName,newClassName){this.removeClass(oldClassName);this.addClass(newClassName);return this},getStyles:function(){var a=arguments,len=a.length,r={};for(var i=0;i<len;i++){r[a[i]]=this.getStyle(a[i])}return r},getStyle:function(){return view&&view.getComputedStyle?function(prop){var el=this.dom,v,cs,camel;if(prop=="float"){prop="cssFloat"}if(v=el.style[prop]){return v}if(cs=view.getComputedStyle(el,"")){if(!(camel=propCache[prop])){camel=propCache[prop]=prop.replace(camelRe,camelFn)}return cs[camel]}return null}:function(prop){var el=this.dom,v,cs,camel;if(prop=="opacity"){if(typeof el.style.filter=="string"){var m=el.style.filter.match(/alpha\(opacity=(.*)\)/i);if(m){var fv=parseFloat(m[1]);if(!isNaN(fv)){return fv?fv/100:0}}}return 1}else{if(prop=="float"){prop="styleFloat"}}if(!(camel=propCache[prop])){camel=propCache[prop]=prop.replace(camelRe,camelFn)}if(v=el.style[camel]){return v}if(cs=el.currentStyle){return cs[camel]}return null}}(),setStyle:function(prop,value){if(typeof prop=="string"){var camel;if(!(camel=propCache[prop])){camel=propCache[prop]=prop.replace(camelRe,camelFn)}if(camel=="opacity"){this.setOpacity(value)}else{this.dom.style[camel]=value}}else{for(var style in prop){if(typeof prop[style]!="function"){this.setStyle(style,prop[style])}}}return this},applyStyles:function(style){Ext.DomHelper.applyStyles(this.dom,style);return this},getX:function(){return D.getX(this.dom)},getY:function(){return D.getY(this.dom)},getXY:function(){return D.getXY(this.dom)},getOffsetsTo:function(el){var o=this.getXY();var e=Ext.fly(el,"_internal").getXY();return[o[0]-e[0],o[1]-e[1]]},setX:function(x,animate){if(!animate||!A){D.setX(this.dom,x)}else{this.setXY([x,this.getY()],this.preanim(arguments,1))}return this},setY:function(y,animate){if(!animate||!A){D.setY(this.dom,y)}else{this.setXY([this.getX(),y],this.preanim(arguments,1))}return this},setLeft:function(left){this.setStyle("left",this.addUnits(left));return this},setTop:function(top){this.setStyle("top",this.addUnits(top));return this},setRight:function(right){this.setStyle("right",this.addUnits(right));return this},setBottom:function(bottom){this.setStyle("bottom",this.addUnits(bottom));return this},setXY:function(pos,animate){if(!animate||!A){D.setXY(this.dom,pos)}else{this.anim({points:{to:pos}},this.preanim(arguments,1),"motion")}return this},setLocation:function(x,y,animate){this.setXY([x,y],this.preanim(arguments,2));return this},moveTo:function(x,y,animate){this.setXY([x,y],this.preanim(arguments,2));return this},getRegion:function(){return D.getRegion(this.dom)},getHeight:function(contentHeight){var h=this.dom.offsetHeight||0;h=contentHeight!==true?h:h-this.getBorderWidth("tb")-this.getPadding("tb");return h<0?0:h},getWidth:function(contentWidth){var w=this.dom.offsetWidth||0;w=contentWidth!==true?w:w-this.getBorderWidth("lr")-this.getPadding("lr");return w<0?0:w},getComputedHeight:function(){var h=Math.max(this.dom.offsetHeight,this.dom.clientHeight);if(!h){h=parseInt(this.getStyle("height"),10)||0;if(!this.isBorderBox()){h+=this.getFrameWidth("tb")}}return h},getComputedWidth:function(){var w=Math.max(this.dom.offsetWidth,this.dom.clientWidth);if(!w){w=parseInt(this.getStyle("width"),10)||0;if(!this.isBorderBox()){w+=this.getFrameWidth("lr")}}return w},getSize:function(contentSize){return{width:this.getWidth(contentSize),height:this.getHeight(contentSize)}},getStyleSize:function(){var w,h,d=this.dom,s=d.style;if(s.width&&s.width!="auto"){w=parseInt(s.width,10);if(Ext.isBorderBox){w-=this.getFrameWidth("lr")}}if(s.height&&s.height!="auto"){h=parseInt(s.height,10);if(Ext.isBorderBox){h-=this.getFrameWidth("tb")}}return{width:w||this.getWidth(true),height:h||this.getHeight(true)}},getViewSize:function(){var d=this.dom,doc=document,aw=0,ah=0;if(d==doc||d==doc.body){return{width:D.getViewWidth(),height:D.getViewHeight()}}else{return{width:d.clientWidth,height:d.clientHeight}}},getValue:function(asNumber){return asNumber?parseInt(this.dom.value,10):this.dom.value},adjustWidth:function(width){if(typeof width=="number"){if(this.autoBoxAdjust&&!this.isBorderBox()){width-=(this.getBorderWidth("lr")+this.getPadding("lr"))}if(width<0){width=0}}return width},adjustHeight:function(height){if(typeof height=="number"){if(this.autoBoxAdjust&&!this.isBorderBox()){height-=(this.getBorderWidth("tb")+this.getPadding("tb"))}if(height<0){height=0}}return height},setWidth:function(width,animate){width=this.adjustWidth(width);if(!animate||!A){this.dom.style.width=this.addUnits(width)}else{this.anim({width:{to:width}},this.preanim(arguments,1))}return this},setHeight:function(height,animate){height=this.adjustHeight(height);if(!animate||!A){this.dom.style.height=this.addUnits(height)}else{this.anim({height:{to:height}},this.preanim(arguments,1))}return this},setSize:function(width,height,animate){if(typeof width=="object"){height=width.height;width=width.width}width=this.adjustWidth(width);height=this.adjustHeight(height);if(!animate||!A){this.dom.style.width=this.addUnits(width);this.dom.style.height=this.addUnits(height)}else{this.anim({width:{to:width},height:{to:height}},this.preanim(arguments,2))}return this},setBounds:function(x,y,width,height,animate){if(!animate||!A){this.setSize(width,height);this.setLocation(x,y)}else{width=this.adjustWidth(width);height=this.adjustHeight(height);this.anim({points:{to:[x,y]},width:{to:width},height:{to:height}},this.preanim(arguments,4),"motion")}return this},setRegion:function(region,animate){this.setBounds(region.left,region.top,region.right-region.left,region.bottom-region.top,this.preanim(arguments,1));return this},addListener:function(eventName,fn,scope,options){Ext.EventManager.on(this.dom,eventName,fn,scope||this,options)},removeListener:function(eventName,fn){Ext.EventManager.removeListener(this.dom,eventName,fn);return this},removeAllListeners:function(){E.purgeElement(this.dom);return this},relayEvent:function(eventName,observable){this.on(eventName,function(e){observable.fireEvent(eventName,e)})},setOpacity:function(opacity,animate){if(!animate||!A){var s=this.dom.style;if(Ext.isIE){s.zoom=1;s.filter=(s.filter||"").replace(/alpha\([^\)]*\)/gi,"")+(opacity==1?"":" alpha(opacity="+opacity*100+")")}else{s.opacity=opacity}}else{this.anim({opacity:{to:opacity}},this.preanim(arguments,1),null,0.35,"easeIn")}return this},getLeft:function(local){if(!local){return this.getX()}else{return parseInt(this.getStyle("left"),10)||0}},getRight:function(local){if(!local){return this.getX()+this.getWidth()}else{return(this.getLeft(true)+this.getWidth())||0}},getTop:function(local){if(!local){return this.getY()}else{return parseInt(this.getStyle("top"),10)||0}},getBottom:function(local){if(!local){return this.getY()+this.getHeight()}else{return(this.getTop(true)+this.getHeight())||0}},position:function(pos,zIndex,x,y){if(!pos){if(this.getStyle("position")=="static"){this.setStyle("position","relative")}}else{this.setStyle("position",pos)}if(zIndex){this.setStyle("z-index",zIndex)}if(x!==undefined&&y!==undefined){this.setXY([x,y])}else{if(x!==undefined){this.setX(x)}else{if(y!==undefined){this.setY(y)}}}},clearPositioning:function(value){value=value||"";this.setStyle({"left":value,"right":value,"top":value,"bottom":value,"z-index":"","position":"static"});return this},getPositioning:function(){var l=this.getStyle("left");var t=this.getStyle("top");return{"position":this.getStyle("position"),"left":l,"right":l?"":this.getStyle("right"),"top":t,"bottom":t?"":this.getStyle("bottom"),"z-index":this.getStyle("z-index")}},getBorderWidth:function(side){return this.addStyles(side,El.borders)},getPadding:function(side){return this.addStyles(side,El.paddings)},setPositioning:function(pc){this.applyStyles(pc);if(pc.right=="auto"){this.dom.style.right=""}if(pc.bottom=="auto"){this.dom.style.bottom=""}return this},fixDisplay:function(){if(this.getStyle("display")=="none"){this.setStyle("visibility","hidden");this.setStyle("display",this.originalDisplay);if(this.getStyle("display")=="none"){this.setStyle("display","block")}}},setOverflow:function(v){if(v=="auto"&&Ext.isMac&&Ext.isGecko){this.dom.style.overflow="hidden";(function(){this.dom.style.overflow="auto"}).defer(1,this)}else{this.dom.style.overflow=v}},setLeftTop:function(left,top){this.dom.style.left=this.addUnits(left);this.dom.style.top=this.addUnits(top);return this},move:function(direction,distance,animate){var xy=this.getXY();direction=direction.toLowerCase();switch(direction){case"l":case"left":this.moveTo(xy[0]-distance,xy[1],this.preanim(arguments,2));break;case"r":case"right":this.moveTo(xy[0]+distance,xy[1],this.preanim(arguments,2));break;case"t":case"top":case"up":this.moveTo(xy[0],xy[1]-distance,this.preanim(arguments,2));break;case"b":case"bottom":case"down":this.moveTo(xy[0],xy[1]+distance,this.preanim(arguments,2));break}return this},clip:function(){if(!this.isClipped){this.isClipped=true;this.originalClip={"o":this.getStyle("overflow"),"x":this.getStyle("overflow-x"),"y":this.getStyle("overflow-y")};this.setStyle("overflow","hidden");this.setStyle("overflow-x","hidden");this.setStyle("overflow-y","hidden")}return this},unclip:function(){if(this.isClipped){this.isClipped=false;var o=this.originalClip;if(o.o){this.setStyle("overflow",o.o)}if(o.x){this.setStyle("overflow-x",o.x)}if(o.y){this.setStyle("overflow-y",o.y)}}return this},getAnchorXY:function(anchor,local,s){var w,h,vp=false;if(!s){var d=this.dom;if(d==document.body||d==document){vp=true;w=D.getViewWidth();h=D.getViewHeight()}else{w=this.getWidth();h=this.getHeight()}}else{w=s.width;h=s.height}var x=0,y=0,r=Math.round;switch((anchor||"tl").toLowerCase()){case"c":x=r(w*0.5);y=r(h*0.5);break;case"t":x=r(w*0.5);y=0;break;case"l":x=0;y=r(h*0.5);break;case"r":x=w;y=r(h*0.5);break;case"b":x=r(w*0.5);y=h;break;case"tl":x=0;y=0;break;case"bl":x=0;y=h;break;case"br":x=w;y=h;break;case"tr":x=w;y=0;break}if(local===true){return[x,y]}if(vp){var sc=this.getScroll();return[x+sc.left,y+sc.top]}var o=this.getXY();return[x+o[0],y+o[1]]},getAlignToXY:function(el,p,o){el=Ext.get(el);if(!el||!el.dom){throw"Element.alignToXY with an element that doesn't exist"}var d=this.dom;var c=false;var p1="",p2="";o=o||[0,0];if(!p){p="tl-bl"}else{if(p=="?"){p="tl-bl?"}else{if(p.indexOf("-")==-1){p="tl-"+p}}}p=p.toLowerCase();var m=p.match(/^([a-z]+)-([a-z]+)(\?)?$/);if(!m){throw"Element.alignTo with an invalid alignment "+p}p1=m[1];p2=m[2];c=!!m[3];var a1=this.getAnchorXY(p1,true);var a2=el.getAnchorXY(p2,false);var x=a2[0]-a1[0]+o[0];var y=a2[1]-a1[1]+o[1];if(c){var w=this.getWidth(),h=this.getHeight(),r=el.getRegion();var dw=D.getViewWidth()-5,dh=D.getViewHeight()-5;var p1y=p1.charAt(0),p1x=p1.charAt(p1.length-1);var p2y=p2.charAt(0),p2x=p2.charAt(p2.length-1);var swapY=((p1y=="t"&&p2y=="b")||(p1y=="b"&&p2y=="t"));var swapX=((p1x=="r"&&p2x=="l")||(p1x=="l"&&p2x=="r"));var doc=document;var scrollX=(doc.documentElement.scrollLeft||doc.body.scrollLeft||0)+5;var scrollY=(doc.documentElement.scrollTop||doc.body.scrollTop||0)+5;if((x+w)>dw+scrollX){x=swapX?r.left-w:dw+scrollX-w}if(x<scrollX){x=swapX?r.right:scrollX}if((y+h)>dh+scrollY){y=swapY?r.top-h:dh+scrollY-h}if(y<scrollY){y=swapY?r.bottom:scrollY}}return[x,y]},getConstrainToXY:function(){var os={top:0,left:0,bottom:0,right:0};return function(el,local,offsets,proposedXY){el=Ext.get(el);offsets=offsets?Ext.applyIf(offsets,os):os;var vw,vh,vx=0,vy=0;if(el.dom==document.body||el.dom==document){vw=Ext.lib.Dom.getViewWidth();vh=Ext.lib.Dom.getViewHeight()}else{vw=el.dom.clientWidth;vh=el.dom.clientHeight;if(!local){var vxy=el.getXY();vx=vxy[0];vy=vxy[1]}}var s=el.getScroll();vx+=offsets.left+s.left;vy+=offsets.top+s.top;vw-=offsets.right;vh-=offsets.bottom;var vr=vx+vw;var vb=vy+vh;var xy=proposedXY||(!local?this.getXY():[this.getLeft(true),this.getTop(true)]);var x=xy[0],y=xy[1];var w=this.dom.offsetWidth,h=this.dom.offsetHeight;var moved=false;if((x+w)>vr){x=vr-w;moved=true}if((y+h)>vb){y=vb-h;moved=true}if(x<vx){x=vx;moved=true}if(y<vy){y=vy;moved=true}return moved?[x,y]:false}}(),adjustForConstraints:function(xy,parent,offsets){return this.getConstrainToXY(parent||document,false,offsets,xy)||xy},alignTo:function(element,position,offsets,animate){var xy=this.getAlignToXY(element,position,offsets);this.setXY(xy,this.preanim(arguments,3));return this},anchorTo:function(el,alignment,offsets,animate,monitorScroll,callback){var action=function(){this.alignTo(el,alignment,offsets,animate);Ext.callback(callback,this)};Ext.EventManager.onWindowResize(action,this);var tm=typeof monitorScroll;if(tm!="undefined"){Ext.EventManager.on(window,"scroll",action,this,{buffer:tm=="number"?monitorScroll:50})}action.call(this);return this},clearOpacity:function(){if(window.ActiveXObject){if(typeof this.dom.style.filter=="string"&&(/alpha/i).test(this.dom.style.filter)){this.dom.style.filter=""}}else{this.dom.style.opacity="";this.dom.style["-moz-opacity"]="";this.dom.style["-khtml-opacity"]=""}return this},hide:function(animate){this.setVisible(false,this.preanim(arguments,0));return this},show:function(animate){this.setVisible(true,this.preanim(arguments,0));return this},addUnits:function(size){return Ext.Element.addUnits(size,this.defaultUnit)},update:function(html,loadScripts,callback){if(typeof html=="undefined"){html=""}if(loadScripts!==true){this.dom.innerHTML=html;if(typeof callback=="function"){callback()}return this}var id=Ext.id();var dom=this.dom;html+="<span id=\""+id+"\"></span>";E.onAvailable(id,function(){var hd=document.getElementsByTagName("head")[0];var re=/(?:<script([^>]*)?>)((\n|\r|.)*?)(?:<\/script>)/ig;var srcRe=/\ssrc=([\'\"])(.*?)\1/i;var typeRe=/\stype=([\'\"])(.*?)\1/i;var match;while(match=re.exec(html)){var attrs=match[1];var srcMatch=attrs?attrs.match(srcRe):false;if(srcMatch&&srcMatch[2]){var s=document.createElement("script");s.src=srcMatch[2];var typeMatch=attrs.match(typeRe);if(typeMatch&&typeMatch[2]){s.type=typeMatch[2]}hd.appendChild(s)}else{if(match[2]&&match[2].length>0){if(window.execScript){window.execScript(match[2])}else{window.eval(match[2])}}}}var el=document.getElementById(id);if(el){Ext.removeNode(el)}if(typeof callback=="function"){callback()}});dom.innerHTML=html.replace(/(?:<script.*?>)((\n|\r|.)*?)(?:<\/script>)/ig,"");return this},load:function(){var um=this.getUpdater();um.update.apply(um,arguments);return this},getUpdater:function(){if(!this.updateManager){this.updateManager=new Ext.Updater(this)}return this.updateManager},unselectable:function(){this.dom.unselectable="on";this.swallowEvent("selectstart",true);this.applyStyles("-moz-user-select:none;-khtml-user-select:none;");this.addClass("x-unselectable");return this},getCenterXY:function(){return this.getAlignToXY(document,"c-c")},center:function(centerIn){this.alignTo(centerIn||document,"c-c");return this},isBorderBox:function(){return noBoxAdjust[this.dom.tagName.toLowerCase()]||Ext.isBorderBox},getBox:function(contentBox,local){var xy;if(!local){xy=this.getXY()}else{var left=parseInt(this.getStyle("left"),10)||0;var top=parseInt(this.getStyle("top"),10)||0;xy=[left,top]}var el=this.dom,w=el.offsetWidth,h=el.offsetHeight,bx;if(!contentBox){bx={x:xy[0],y:xy[1],0:xy[0],1:xy[1],width:w,height:h}}else{var l=this.getBorderWidth("l")+this.getPadding("l");var r=this.getBorderWidth("r")+this.getPadding("r");var t=this.getBorderWidth("t")+this.getPadding("t");var b=this.getBorderWidth("b")+this.getPadding("b");bx={x:xy[0]+l,y:xy[1]+t,0:xy[0]+l,1:xy[1]+t,width:w-(l+r),height:h-(t+b)}}bx.right=bx.x+bx.width;bx.bottom=bx.y+bx.height;return bx},getFrameWidth:function(sides,onlyContentBox){return onlyContentBox&&Ext.isBorderBox?0:(this.getPadding(sides)+this.getBorderWidth(sides))},setBox:function(box,adjust,animate){var w=box.width,h=box.height;if((adjust&&!this.autoBoxAdjust)&&!this.isBorderBox()){w-=(this.getBorderWidth("lr")+this.getPadding("lr"));h-=(this.getBorderWidth("tb")+this.getPadding("tb"))}this.setBounds(box.x,box.y,w,h,this.preanim(arguments,2));return this},repaint:function(){var dom=this.dom;this.addClass("x-repaint");setTimeout(function(){Ext.get(dom).removeClass("x-repaint")},1);return this},getMargins:function(side){if(!side){return{top:parseInt(this.getStyle("margin-top"),10)||0,left:parseInt(this.getStyle("margin-left"),10)||0,bottom:parseInt(this.getStyle("margin-bottom"),10)||0,right:parseInt(this.getStyle("margin-right"),10)||0}}else{return this.addStyles(side,El.margins)}},addStyles:function(sides,styles){var val=0,v,w;for(var i=0,len=sides.length;i<len;i++){v=this.getStyle(styles[sides.charAt(i)]);if(v){w=parseInt(v,10);if(w){val+=(w>=0?w:-1*w)}}}return val},createProxy:function(config,renderTo,matchBox){config=typeof config=="object"?config:{tag:"div",cls:config};var proxy;if(renderTo){proxy=Ext.DomHelper.append(renderTo,config,true)}else{proxy=Ext.DomHelper.insertBefore(this.dom,config,true)}if(matchBox){proxy.setBox(this.getBox())}return proxy},mask:function(msg,msgCls){if(this.getStyle("position")=="static"){this.setStyle("position","relative")}if(this._maskMsg){this._maskMsg.remove()}if(this._mask){this._mask.remove()}this._mask=Ext.DomHelper.append(this.dom,{cls:"ext-el-mask"},true);this.addClass("x-masked");this._mask.setDisplayed(true);if(typeof msg=="string"){this._maskMsg=Ext.DomHelper.append(this.dom,{cls:"ext-el-mask-msg",cn:{tag:"div"}},true);var mm=this._maskMsg;mm.dom.className=msgCls?"ext-el-mask-msg "+msgCls:"ext-el-mask-msg";mm.dom.firstChild.innerHTML=msg;mm.setDisplayed(true);mm.center(this)}if(Ext.isIE&&!(Ext.isIE7&&Ext.isStrict)&&this.getStyle("height")=="auto"){this._mask.setSize(this.dom.clientWidth,this.getHeight())}return this._mask},unmask:function(){if(this._mask){if(this._maskMsg){this._maskMsg.remove();delete this._maskMsg}this._mask.remove();delete this._mask}this.removeClass("x-masked")},isMasked:function(){return this._mask&&this._mask.isVisible()},createShim:function(){var el=document.createElement("iframe");el.frameBorder="no";el.className="ext-shim";if(Ext.isIE&&Ext.isSecure){el.src=Ext.SSL_SECURE_URL}var shim=Ext.get(this.dom.parentNode.insertBefore(el,this.dom));shim.autoBoxAdjust=false;return shim},remove:function(){Ext.removeNode(this.dom);delete El.cache[this.dom.id]},hover:function(overFn,outFn,scope){var preOverFn=function(e){if(!e.within(this,true)){overFn.apply(scope||this,arguments)}};var preOutFn=function(e){if(!e.within(this,true)){outFn.apply(scope||this,arguments)}};this.on("mouseover",preOverFn,this.dom);this.on("mouseout",preOutFn,this.dom);return this},addClassOnOver:function(className,preventFlicker){this.hover(function(){Ext.fly(this,"_internal").addClass(className)},function(){Ext.fly(this,"_internal").removeClass(className)});return this},addClassOnFocus:function(className){this.on("focus",function(){Ext.fly(this,"_internal").addClass(className)},this.dom);this.on("blur",function(){Ext.fly(this,"_internal").removeClass(className)},this.dom);return this},addClassOnClick:function(className){var dom=this.dom;this.on("mousedown",function(){Ext.fly(dom,"_internal").addClass(className);var d=Ext.getDoc();var fn=function(){Ext.fly(dom,"_internal").removeClass(className);d.removeListener("mouseup",fn)};d.on("mouseup",fn)});return this},swallowEvent:function(eventName,preventDefault){var fn=function(e){e.stopPropagation();if(preventDefault){e.preventDefault()}};if(Ext.isArray(eventName)){for(var i=0,len=eventName.length;i<len;i++){this.on(eventName[i],fn)}return this}this.on(eventName,fn);return this},parent:function(selector,returnDom){return this.matchNode("parentNode","parentNode",selector,returnDom)},next:function(selector,returnDom){return this.matchNode("nextSibling","nextSibling",selector,returnDom)},prev:function(selector,returnDom){return this.matchNode("previousSibling","previousSibling",selector,returnDom)},first:function(selector,returnDom){return this.matchNode("nextSibling","firstChild",selector,returnDom)},last:function(selector,returnDom){return this.matchNode("previousSibling","lastChild",selector,returnDom)},matchNode:function(dir,start,selector,returnDom){var n=this.dom[start];while(n){if(n.nodeType==1&&(!selector||Ext.DomQuery.is(n,selector))){return !returnDom?Ext.get(n):n}n=n[dir]}return null},appendChild:function(el){el=Ext.get(el);el.appendTo(this);return this},createChild:function(config,insertBefore,returnDom){config=config||{tag:"div"};if(insertBefore){return Ext.DomHelper.insertBefore(insertBefore,config,returnDom!==true)}return Ext.DomHelper[!this.dom.firstChild?"overwrite":"append"](this.dom,config,returnDom!==true)},appendTo:function(el){el=Ext.getDom(el);el.appendChild(this.dom);return this},insertBefore:function(el){el=Ext.getDom(el);el.parentNode.insertBefore(this.dom,el);return this},insertAfter:function(el){el=Ext.getDom(el);el.parentNode.insertBefore(this.dom,el.nextSibling);return this},insertFirst:function(el,returnDom){el=el||{};if(typeof el=="object"&&!el.nodeType&&!el.dom){return this.createChild(el,this.dom.firstChild,returnDom)}else{el=Ext.getDom(el);this.dom.insertBefore(el,this.dom.firstChild);return !returnDom?Ext.get(el):el}},insertSibling:function(el,where,returnDom){var rt;if(Ext.isArray(el)){for(var i=0,len=el.length;i<len;i++){rt=this.insertSibling(el[i],where,returnDom)}return rt}where=where?where.toLowerCase():"before";el=el||{};var refNode=where=="before"?this.dom:this.dom.nextSibling;if(typeof el=="object"&&!el.nodeType&&!el.dom){if(where=="after"&&!this.dom.nextSibling){rt=Ext.DomHelper.append(this.dom.parentNode,el,!returnDom)}else{rt=Ext.DomHelper[where=="after"?"insertAfter":"insertBefore"](this.dom,el,!returnDom)}}else{rt=this.dom.parentNode.insertBefore(Ext.getDom(el),refNode);if(!returnDom){rt=Ext.get(rt)}}return rt},wrap:function(config,returnDom){if(!config){config={tag:"div"}}var newEl=Ext.DomHelper.insertBefore(this.dom,config,!returnDom);newEl.dom?newEl.dom.appendChild(this.dom):newEl.appendChild(this.dom);return newEl},replace:function(el){el=Ext.get(el);this.insertBefore(el);el.remove();return this},replaceWith:function(el){if(typeof el=="object"&&!el.nodeType&&!el.dom){el=this.insertSibling(el,"before")}else{el=Ext.getDom(el);this.dom.parentNode.insertBefore(el,this.dom)}El.uncache(this.id);this.dom.parentNode.removeChild(this.dom);this.dom=el;this.id=Ext.id(el);El.cache[this.id]=this;return this},insertHtml:function(where,html,returnEl){var el=Ext.DomHelper.insertHtml(where,this.dom,html);return returnEl?Ext.get(el):el},set:function(o,useSet){var el=this.dom;useSet=typeof useSet=="undefined"?(el.setAttribute?true:false):useSet;for(var attr in o){if(attr=="style"||typeof o[attr]=="function"){continue}if(attr=="cls"){el.className=o["cls"]}else{if(o.hasOwnProperty(attr)){if(useSet){el.setAttribute(attr,o[attr])}else{el[attr]=o[attr]}}}}if(o.style){Ext.DomHelper.applyStyles(el,o.style)}return this},addKeyListener:function(key,fn,scope){var config;if(typeof key!="object"||Ext.isArray(key)){config={key:key,fn:fn,scope:scope}}else{config={key:key.key,shift:key.shift,ctrl:key.ctrl,alt:key.alt,fn:fn,scope:scope}}return new Ext.KeyMap(this,config)},addKeyMap:function(config){return new Ext.KeyMap(this,config)},isScrollable:function(){var dom=this.dom;return dom.scrollHeight>dom.clientHeight||dom.scrollWidth>dom.clientWidth},scrollTo:function(side,value,animate){var prop=side.toLowerCase()=="left"?"scrollLeft":"scrollTop";if(!animate||!A){this.dom[prop]=value}else{var to=prop=="scrollLeft"?[value,this.dom.scrollTop]:[this.dom.scrollLeft,value];this.anim({scroll:{"to":to}},this.preanim(arguments,2),"scroll")}return this},scroll:function(direction,distance,animate){if(!this.isScrollable()){return }var el=this.dom;var l=el.scrollLeft,t=el.scrollTop;var w=el.scrollWidth,h=el.scrollHeight;var cw=el.clientWidth,ch=el.clientHeight;direction=direction.toLowerCase();var scrolled=false;var a=this.preanim(arguments,2);switch(direction){case"l":case"left":if(w-l>cw){var v=Math.min(l+distance,w-cw);this.scrollTo("left",v,a);scrolled=true}break;case"r":case"right":if(l>0){var v=Math.max(l-distance,0);this.scrollTo("left",v,a);scrolled=true}break;case"t":case"top":case"up":if(t>0){var v=Math.max(t-distance,0);this.scrollTo("top",v,a);scrolled=true}break;case"b":case"bottom":case"down":if(h-t>ch){var v=Math.min(t+distance,h-ch);this.scrollTo("top",v,a);scrolled=true}break}return scrolled},translatePoints:function(x,y){if(typeof x=="object"||Ext.isArray(x)){y=x[1];x=x[0]}var p=this.getStyle("position");var o=this.getXY();var l=parseInt(this.getStyle("left"),10);var t=parseInt(this.getStyle("top"),10);if(isNaN(l)){l=(p=="relative")?0:this.dom.offsetLeft}if(isNaN(t)){t=(p=="relative")?0:this.dom.offsetTop}return{left:(x-o[0]+l),top:(y-o[1]+t)}},getScroll:function(){var d=this.dom,doc=document;if(d==doc||d==doc.body){var l,t;if(Ext.isIE&&Ext.isStrict){l=doc.documentElement.scrollLeft||(doc.body.scrollLeft||0);t=doc.documentElement.scrollTop||(doc.body.scrollTop||0)}else{l=window.pageXOffset||(doc.body.scrollLeft||0);t=window.pageYOffset||(doc.body.scrollTop||0)}return{left:l,top:t}}else{return{left:d.scrollLeft,top:d.scrollTop}}},getColor:function(attr,defaultValue,prefix){var v=this.getStyle(attr);if(!v||v=="transparent"||v=="inherit"){return defaultValue}var color=typeof prefix=="undefined"?"#":prefix;if(v.substr(0,4)=="rgb("){var rvs=v.slice(4,v.length-1).split(",");for(var i=0;i<3;i++){var h=parseInt(rvs[i]);var s=h.toString(16);if(h<16){s="0"+s}color+=s}}else{if(v.substr(0,1)=="#"){if(v.length==4){for(var i=1;i<4;i++){var c=v.charAt(i);color+=c+c}}else{if(v.length==7){color+=v.substr(1)}}}}return(color.length>5?color.toLowerCase():defaultValue)},boxWrap:function(cls){cls=cls||"x-box";var el=Ext.get(this.insertHtml("beforeBegin",String.format("<div class=\"{0}\">"+El.boxMarkup+"</div>",cls)));el.child("."+cls+"-mc").dom.appendChild(this.dom);return el},getAttributeNS:Ext.isIE?function(ns,name){var d=this.dom;var type=typeof d[ns+":"+name];if(type!="undefined"&&type!="unknown"){return d[ns+":"+name]}return d[name]}:function(ns,name){var d=this.dom;return d.getAttributeNS(ns,name)||d.getAttribute(ns+":"+name)||d.getAttribute(name)||d[name]},getTextWidth:function(text,min,max){return(Ext.util.TextMetrics.measure(this.dom,Ext.value(text,this.dom.innerHTML,true)).width).constrain(min||0,max||1000000)}};var ep=El.prototype;ep.on=ep.addListener;ep.mon=ep.addListener;ep.getUpdateManager=ep.getUpdater;ep.un=ep.removeListener;ep.autoBoxAdjust=true;El.unitPattern=/\d+(px|em|%|en|ex|pt|in|cm|mm|pc)$/i;El.addUnits=function(v,defaultUnit){if(v===""||v=="auto"){return v}if(v===undefined){return""}if(typeof v=="number"||!El.unitPattern.test(v)){return v+(defaultUnit||"px")}return v};El.boxMarkup="<div class=\"{0}-tl\"><div class=\"{0}-tr\"><div class=\"{0}-tc\"></div></div></div><div class=\"{0}-ml\"><div class=\"{0}-mr\"><div class=\"{0}-mc\"></div></div></div><div class=\"{0}-bl\"><div class=\"{0}-br\"><div class=\"{0}-bc\"></div></div></div>";El.VISIBILITY=1;El.DISPLAY=2;El.borders={l:"border-left-width",r:"border-right-width",t:"border-top-width",b:"border-bottom-width"};El.paddings={l:"padding-left",r:"padding-right",t:"padding-top",b:"padding-bottom"};El.margins={l:"margin-left",r:"margin-right",t:"margin-top",b:"margin-bottom"};El.cache={};var docEl;El.get=function(el){var ex,elm,id;if(!el){return null}if(typeof el=="string"){if(!(elm=document.getElementById(el))){return null}if(ex=El.cache[el]){ex.dom=elm}else{ex=El.cache[el]=new El(elm)}return ex}else{if(el.tagName){if(!(id=el.id)){id=Ext.id(el)}if(ex=El.cache[id]){ex.dom=el}else{ex=El.cache[id]=new El(el)}return ex}else{if(el instanceof El){if(el!=docEl){el.dom=document.getElementById(el.id)||el.dom;El.cache[el.id]=el}return el}else{if(el.isComposite){return el}else{if(Ext.isArray(el)){return El.select(el)}else{if(el==document){if(!docEl){var f=function(){};f.prototype=El.prototype;docEl=new f();docEl.dom=document}return docEl}}}}}}return null};El.uncache=function(el){for(var i=0,a=arguments,len=a.length;i<len;i++){if(a[i]){delete El.cache[a[i].id||a[i]]}}};El.garbageCollect=function(){if(!Ext.enableGarbageCollector){clearInterval(El.collectorThread);return }for(var eid in El.cache){var el=El.cache[eid],d=el.dom;if(!d||!d.parentNode||(!d.offsetParent&&!document.getElementById(eid))){delete El.cache[eid];if(d&&Ext.enableListenerCollection){E.purgeElement(d)}}}};El.collectorThreadId=setInterval(El.garbageCollect,30000);var flyFn=function(){};flyFn.prototype=El.prototype;var _cls=new flyFn();El.Flyweight=function(dom){this.dom=dom};El.Flyweight.prototype=_cls;El.Flyweight.prototype.isFlyweight=true;El._flyweights={};El.fly=function(el,named){named=named||"_global";el=Ext.getDom(el);if(!el){return null}if(!El._flyweights[named]){El._flyweights[named]=new El.Flyweight()}El._flyweights[named].dom=el;return El._flyweights[named]};Ext.get=El.get;Ext.fly=El.fly;var noBoxAdjust=Ext.isStrict?{select:1}:{input:1,select:1,textarea:1};if(Ext.isIE||Ext.isGecko){noBoxAdjust["button"]=1}Ext.EventManager.on(window,"unload",function(){delete El.cache;delete El._flyweights})})();
Ext.enableFx=true;Ext.Fx={slideIn:function(A,C){var B=this.getFxEl();C=C||{};B.queueFx(C,function(){A=A||"t";this.fixDisplay();var D=this.getFxRestore();var I=this.getBox();this.setSize(I);var F=this.fxWrap(D.pos,C,"hidden");var K=this.dom.style;K.visibility="visible";K.position="absolute";var E=function(){B.fxUnwrap(F,D.pos,C);K.width=D.width;K.height=D.height;B.afterFx(C)};var J,L={to:[I.x,I.y]},H={to:I.width},G={to:I.height};switch(A.toLowerCase()){case"t":F.setSize(I.width,0);K.left=K.bottom="0";J={height:G};break;case"l":F.setSize(0,I.height);K.right=K.top="0";J={width:H};break;case"r":F.setSize(0,I.height);F.setX(I.right);K.left=K.top="0";J={width:H,points:L};break;case"b":F.setSize(I.width,0);F.setY(I.bottom);K.left=K.top="0";J={height:G,points:L};break;case"tl":F.setSize(0,0);K.right=K.bottom="0";J={width:H,height:G};break;case"bl":F.setSize(0,0);F.setY(I.y+I.height);K.right=K.top="0";J={width:H,height:G,points:L};break;case"br":F.setSize(0,0);F.setXY([I.right,I.bottom]);K.left=K.top="0";J={width:H,height:G,points:L};break;case"tr":F.setSize(0,0);F.setX(I.x+I.width);K.left=K.bottom="0";J={width:H,height:G,points:L};break}this.dom.style.visibility="visible";F.show();arguments.callee.anim=F.fxanim(J,C,"motion",0.5,"easeOut",E)});return this},slideOut:function(A,C){var B=this.getFxEl();C=C||{};B.queueFx(C,function(){A=A||"t";var I=this.getFxRestore();var D=this.getBox();this.setSize(D);var G=this.fxWrap(I.pos,C,"visible");var F=this.dom.style;F.visibility="visible";F.position="absolute";G.setSize(D);var J=function(){if(C.useDisplay){B.setDisplayed(false)}else{B.hide()}B.fxUnwrap(G,I.pos,C);F.width=I.width;F.height=I.height;B.afterFx(C)};var E,H={to:0};switch(A.toLowerCase()){case"t":F.left=F.bottom="0";E={height:H};break;case"l":F.right=F.top="0";E={width:H};break;case"r":F.left=F.top="0";E={width:H,points:{to:[D.right,D.y]}};break;case"b":F.left=F.top="0";E={height:H,points:{to:[D.x,D.bottom]}};break;case"tl":F.right=F.bottom="0";E={width:H,height:H};break;case"bl":F.right=F.top="0";E={width:H,height:H,points:{to:[D.x,D.bottom]}};break;case"br":F.left=F.top="0";E={width:H,height:H,points:{to:[D.x+D.width,D.bottom]}};break;case"tr":F.left=F.bottom="0";E={width:H,height:H,points:{to:[D.right,D.y]}};break}arguments.callee.anim=G.fxanim(E,C,"motion",0.5,"easeOut",J)});return this},puff:function(B){var A=this.getFxEl();B=B||{};A.queueFx(B,function(){this.clearOpacity();this.show();var F=this.getFxRestore();var D=this.dom.style;var G=function(){if(B.useDisplay){A.setDisplayed(false)}else{A.hide()}A.clearOpacity();A.setPositioning(F.pos);D.width=F.width;D.height=F.height;D.fontSize="";A.afterFx(B)};var E=this.getWidth();var C=this.getHeight();arguments.callee.anim=this.fxanim({width:{to:this.adjustWidth(E*2)},height:{to:this.adjustHeight(C*2)},points:{by:[-(E*0.5),-(C*0.5)]},opacity:{to:0},fontSize:{to:200,unit:"%"}},B,"motion",0.5,"easeOut",G)});return this},switchOff:function(B){var A=this.getFxEl();B=B||{};A.queueFx(B,function(){this.clearOpacity();this.clip();var D=this.getFxRestore();var C=this.dom.style;var E=function(){if(B.useDisplay){A.setDisplayed(false)}else{A.hide()}A.clearOpacity();A.setPositioning(D.pos);C.width=D.width;C.height=D.height;A.afterFx(B)};this.fxanim({opacity:{to:0.3}},null,null,0.1,null,function(){this.clearOpacity();(function(){this.fxanim({height:{to:1},points:{by:[0,this.getHeight()*0.5]}},B,"motion",0.3,"easeIn",E)}).defer(100,this)})});return this},highlight:function(A,C){var B=this.getFxEl();C=C||{};B.queueFx(C,function(){A=A||"ffff9c";var D=C.attr||"backgroundColor";this.clearOpacity();this.show();var G=this.getColor(D);var H=this.dom.style[D];var F=(C.endColor||G)||"ffffff";var I=function(){B.dom.style[D]=H;B.afterFx(C)};var E={};E[D]={from:A,to:F};arguments.callee.anim=this.fxanim(E,C,"color",1,"easeIn",I)});return this},frame:function(A,C,D){var B=this.getFxEl();D=D||{};B.queueFx(D,function(){A=A||"#C3DAF9";if(A.length==6){A="#"+A}C=C||1;var G=D.duration||1;this.show();var E=this.getBox();var F=function(){var H=Ext.getBody().createChild({style:{visbility:"hidden",position:"absolute","z-index":"35000",border:"0px solid "+A}});var I=Ext.isBorderBox?2:1;H.animate({top:{from:E.y,to:E.y-20},left:{from:E.x,to:E.x-20},borderWidth:{from:0,to:10},opacity:{from:1,to:0},height:{from:E.height,to:(E.height+(20*I))},width:{from:E.width,to:(E.width+(20*I))}},G,function(){H.remove();if(--C>0){F()}else{B.afterFx(D)}})};F.call(this)});return this},pause:function(C){var A=this.getFxEl();var B={};A.queueFx(B,function(){setTimeout(function(){A.afterFx(B)},C*1000)});return this},fadeIn:function(B){var A=this.getFxEl();B=B||{};A.queueFx(B,function(){this.setOpacity(0);this.fixDisplay();this.dom.style.visibility="visible";var C=B.endOpacity||1;arguments.callee.anim=this.fxanim({opacity:{to:C}},B,null,0.5,"easeOut",function(){if(C==1){this.clearOpacity()}A.afterFx(B)})});return this},fadeOut:function(B){var A=this.getFxEl();B=B||{};A.queueFx(B,function(){arguments.callee.anim=this.fxanim({opacity:{to:B.endOpacity||0}},B,null,0.5,"easeOut",function(){if(this.visibilityMode==Ext.Element.DISPLAY||B.useDisplay){this.dom.style.display="none"}else{this.dom.style.visibility="hidden"}this.clearOpacity();A.afterFx(B)})});return this},scale:function(A,B,C){this.shift(Ext.apply({},C,{width:A,height:B}));return this},shift:function(B){var A=this.getFxEl();B=B||{};A.queueFx(B,function(){var E={},D=B.width,F=B.height,C=B.x,H=B.y,G=B.opacity;if(D!==undefined){E.width={to:this.adjustWidth(D)}}if(F!==undefined){E.height={to:this.adjustHeight(F)}}if(C!==undefined||H!==undefined){E.points={to:[C!==undefined?C:this.getX(),H!==undefined?H:this.getY()]}}if(G!==undefined){E.opacity={to:G}}if(B.xy!==undefined){E.points={to:B.xy}}arguments.callee.anim=this.fxanim(E,B,"motion",0.35,"easeOut",function(){A.afterFx(B)})});return this},ghost:function(A,C){var B=this.getFxEl();C=C||{};B.queueFx(C,function(){A=A||"b";var H=this.getFxRestore();var E=this.getWidth(),G=this.getHeight();var F=this.dom.style;var J=function(){if(C.useDisplay){B.setDisplayed(false)}else{B.hide()}B.clearOpacity();B.setPositioning(H.pos);F.width=H.width;F.height=H.height;B.afterFx(C)};var D={opacity:{to:0},points:{}},I=D.points;switch(A.toLowerCase()){case"t":I.by=[0,-G];break;case"l":I.by=[-E,0];break;case"r":I.by=[E,0];break;case"b":I.by=[0,G];break;case"tl":I.by=[-E,-G];break;case"bl":I.by=[-E,G];break;case"br":I.by=[E,G];break;case"tr":I.by=[E,-G];break}arguments.callee.anim=this.fxanim(D,C,"motion",0.5,"easeOut",J)});return this},syncFx:function(){this.fxDefaults=Ext.apply(this.fxDefaults||{},{block:false,concurrent:true,stopFx:false});return this},sequenceFx:function(){this.fxDefaults=Ext.apply(this.fxDefaults||{},{block:false,concurrent:false,stopFx:false});return this},nextFx:function(){var A=this.fxQueue[0];if(A){A.call(this)}},hasActiveFx:function(){return this.fxQueue&&this.fxQueue[0]},stopFx:function(){if(this.hasActiveFx()){var A=this.fxQueue[0];if(A&&A.anim&&A.anim.isAnimated()){this.fxQueue=[A];A.anim.stop(true)}}return this},beforeFx:function(A){if(this.hasActiveFx()&&!A.concurrent){if(A.stopFx){this.stopFx();return true}return false}return true},hasFxBlock:function(){var A=this.fxQueue;return A&&A[0]&&A[0].block},queueFx:function(C,A){if(!this.fxQueue){this.fxQueue=[]}if(!this.hasFxBlock()){Ext.applyIf(C,this.fxDefaults);if(!C.concurrent){var B=this.beforeFx(C);A.block=C.block;this.fxQueue.push(A);if(B){this.nextFx()}}else{A.call(this)}}return this},fxWrap:function(F,D,C){var B;if(!D.wrap||!(B=Ext.get(D.wrap))){var A;if(D.fixPosition){A=this.getXY()}var E=document.createElement("div");E.style.visibility=C;B=Ext.get(this.dom.parentNode.insertBefore(E,this.dom));B.setPositioning(F);if(B.getStyle("position")=="static"){B.position("relative")}this.clearPositioning("auto");B.clip();B.dom.appendChild(this.dom);if(A){B.setXY(A)}}return B},fxUnwrap:function(A,C,B){this.clearPositioning();this.setPositioning(C);if(!B.wrap){A.dom.parentNode.insertBefore(this.dom,A.dom);A.remove()}},getFxRestore:function(){var A=this.dom.style;return{pos:this.getPositioning(),width:A.width,height:A.height}},afterFx:function(A){if(A.afterStyle){this.applyStyles(A.afterStyle)}if(A.afterCls){this.addClass(A.afterCls)}if(A.remove===true){this.remove()}Ext.callback(A.callback,A.scope,[this]);if(!A.concurrent){this.fxQueue.shift();this.nextFx()}},getFxEl:function(){return Ext.get(this.dom)},fxanim:function(D,E,B,F,C,A){B=B||"run";E=E||{};var G=Ext.lib.Anim[B](this.dom,D,(E.duration||F)||0.35,(E.easing||C)||"easeOut",function(){Ext.callback(A,this)},this);E.anim=G;return G}};Ext.Fx.resize=Ext.Fx.scale;Ext.apply(Ext.Element.prototype,Ext.Fx);
Ext.CompositeElement=function(A){this.elements=[];this.addElements(A)};Ext.CompositeElement.prototype={isComposite:true,addElements:function(E){if(!E){return this}if(typeof E=="string"){E=Ext.Element.selectorFunction(E)}var D=this.elements;var B=D.length-1;for(var C=0,A=E.length;C<A;C++){D[++B]=Ext.get(E[C])}return this},fill:function(A){this.elements=[];this.add(A);return this},filter:function(A){var B=[];this.each(function(C){if(C.is(A)){B[B.length]=C.dom}});this.fill(B);return this},invoke:function(E,B){var D=this.elements;for(var C=0,A=D.length;C<A;C++){Ext.Element.prototype[E].apply(D[C],B)}return this},add:function(A){if(typeof A=="string"){this.addElements(Ext.Element.selectorFunction(A))}else{if(A.length!==undefined){this.addElements(A)}else{this.addElements([A])}}return this},each:function(E,D){var C=this.elements;for(var B=0,A=C.length;B<A;B++){if(E.call(D||C[B],C[B],this,B)===false){break}}return this},item:function(A){return this.elements[A]||null},first:function(){return this.item(0)},last:function(){return this.item(this.elements.length-1)},getCount:function(){return this.elements.length},contains:function(A){return this.indexOf(A)!==-1},indexOf:function(A){return this.elements.indexOf(Ext.get(A))},removeElement:function(D,F){if(Ext.isArray(D)){for(var C=0,A=D.length;C<A;C++){this.removeElement(D[C])}return this}var B=typeof D=="number"?D:this.indexOf(D);if(B!==-1&&this.elements[B]){if(F){var E=this.elements[B];if(E.dom){E.remove()}else{Ext.removeNode(E)}}this.elements.splice(B,1)}return this},replaceElement:function(D,C,A){var B=typeof D=="number"?D:this.indexOf(D);if(B!==-1){if(A){this.elements[B].replaceWith(C)}else{this.elements.splice(B,1,Ext.get(C))}}return this},clear:function(){this.elements=[]}};(function(){Ext.CompositeElement.createCall=function(B,C){if(!B[C]){B[C]=function(){return this.invoke(C,arguments)}}};for(var A in Ext.Element.prototype){if(typeof Ext.Element.prototype[A]=="function"){Ext.CompositeElement.createCall(Ext.CompositeElement.prototype,A)}}})();Ext.CompositeElementLite=function(A){Ext.CompositeElementLite.superclass.constructor.call(this,A);this.el=new Ext.Element.Flyweight()};Ext.extend(Ext.CompositeElementLite,Ext.CompositeElement,{addElements:function(E){if(E){if(Ext.isArray(E)){this.elements=this.elements.concat(E)}else{var D=this.elements;var B=D.length-1;for(var C=0,A=E.length;C<A;C++){D[++B]=E[C]}}}return this},invoke:function(F,B){var D=this.elements;var E=this.el;for(var C=0,A=D.length;C<A;C++){E.dom=D[C];Ext.Element.prototype[F].apply(E,B)}return this},item:function(A){if(!this.elements[A]){return null}this.el.dom=this.elements[A];return this.el},addListener:function(B,G,F,E){var D=this.elements;for(var C=0,A=D.length;C<A;C++){Ext.EventManager.on(D[C],B,G,F||D[C],E)}return this},each:function(F,E){var C=this.elements;var D=this.el;for(var B=0,A=C.length;B<A;B++){D.dom=C[B];if(F.call(E||D,D,this,B)===false){break}}return this},indexOf:function(A){return this.elements.indexOf(Ext.getDom(A))},replaceElement:function(D,C,A){var B=typeof D=="number"?D:this.indexOf(D);if(B!==-1){C=Ext.getDom(C);if(A){var E=this.elements[B];E.parentNode.insertBefore(C,E);Ext.removeNode(E)}this.elements.splice(B,1,C)}return this}});Ext.CompositeElementLite.prototype.on=Ext.CompositeElementLite.prototype.addListener;if(Ext.DomQuery){Ext.Element.selectorFunction=Ext.DomQuery.select}Ext.Element.select=function(A,D,B){var C;if(typeof A=="string"){C=Ext.Element.selectorFunction(A,B)}else{if(A.length!==undefined){C=A}else{throw"Invalid selector"}}if(D===true){return new Ext.CompositeElement(C)}else{return new Ext.CompositeElementLite(C)}};Ext.select=Ext.Element.select;
Ext.data.Connection=function(A){Ext.apply(this,A);this.addEvents("beforerequest","requestcomplete","requestexception");Ext.data.Connection.superclass.constructor.call(this)};Ext.extend(Ext.data.Connection,Ext.util.Observable,{timeout:30000,autoAbort:false,disableCaching:true,request:function(E){if(this.fireEvent("beforerequest",this,E)!==false){var C=E.params;if(typeof C=="function"){C=C.call(E.scope||window,E)}if(typeof C=="object"){C=Ext.urlEncode(C)}if(this.extraParams){var G=Ext.urlEncode(this.extraParams);C=C?(C+"&"+G):G}var B=E.url||this.url;if(typeof B=="function"){B=B.call(E.scope||window,E)}if(E.form){var D=Ext.getDom(E.form);B=B||D.action;var I=D.getAttribute("enctype");if(E.isUpload||(I&&I.toLowerCase()=="multipart/form-data")){return this.doFormUpload(E,C,B)}var H=Ext.lib.Ajax.serializeForm(D);C=C?(C+"&"+H):H}var J=E.headers;if(this.defaultHeaders){J=Ext.apply(J||{},this.defaultHeaders);if(!E.headers){E.headers=J}}var F={success:this.handleResponse,failure:this.handleFailure,scope:this,argument:{options:E},timeout:E.timeout||this.timeout};var A=E.method||this.method||(C?"POST":"GET");if(A=="GET"&&(this.disableCaching&&E.disableCaching!==false)||E.disableCaching===true){B+=(B.indexOf("?")!=-1?"&":"?")+"_dc="+(new Date().getTime())}if(typeof E.autoAbort=="boolean"){if(E.autoAbort){this.abort()}}else{if(this.autoAbort!==false){this.abort()}}if((A=="GET"&&C)||E.xmlData||E.jsonData){B+=(B.indexOf("?")!=-1?"&":"?")+C;C=""}this.transId=Ext.lib.Ajax.request(A,B,F,C,E);return this.transId}else{Ext.callback(E.callback,E.scope,[E,null,null]);return null}},isLoading:function(A){if(A){return Ext.lib.Ajax.isCallInProgress(A)}else{return this.transId?true:false}},abort:function(A){if(A||this.isLoading()){Ext.lib.Ajax.abort(A||this.transId)}},handleResponse:function(A){this.transId=false;var B=A.argument.options;A.argument=B?B.argument:null;this.fireEvent("requestcomplete",this,A,B);Ext.callback(B.success,B.scope,[A,B]);Ext.callback(B.callback,B.scope,[B,true,A])},handleFailure:function(A,C){this.transId=false;var B=A.argument.options;A.argument=B?B.argument:null;this.fireEvent("requestexception",this,A,B,C);Ext.callback(B.failure,B.scope,[A,B]);Ext.callback(B.callback,B.scope,[B,false,A])},doFormUpload:function(E,A,B){var C=Ext.id();var F=document.createElement("iframe");F.id=C;F.name=C;F.className="x-hidden";if(Ext.isIE){F.src=Ext.SSL_SECURE_URL}document.body.appendChild(F);if(Ext.isIE){document.frames[C].name=C}var D=Ext.getDom(E.form);D.target=C;D.method="POST";D.enctype=D.encoding="multipart/form-data";if(B){D.action=B}var L,J;if(A){L=[];A=Ext.urlDecode(A,false);for(var H in A){if(A.hasOwnProperty(H)){J=document.createElement("input");J.type="hidden";J.name=H;J.value=A[H];D.appendChild(J);L.push(J)}}}function G(){var M={responseText:"",responseXML:null};M.argument=E?E.argument:null;try{var O;if(Ext.isIE){O=F.contentWindow.document}else{O=(F.contentDocument||window.frames[C].document)}if(O&&O.body){M.responseText=O.body.innerHTML}if(O&&O.XMLDocument){M.responseXML=O.XMLDocument}else{M.responseXML=O}}catch(N){}Ext.EventManager.removeListener(F,"load",G,this);this.fireEvent("requestcomplete",this,M,E);Ext.callback(E.success,E.scope,[M,E]);Ext.callback(E.callback,E.scope,[E,true,M]);setTimeout(function(){Ext.removeNode(F)},100)}Ext.EventManager.on(F,"load",G,this);D.submit();if(L){for(var I=0,K=L.length;I<K;I++){Ext.removeNode(L[I])}}}});Ext.Ajax=new Ext.data.Connection({autoAbort:false,serializeForm:function(A){return Ext.lib.Ajax.serializeForm(A)}});
Ext.Updater=function(B,A){B=Ext.get(B);if(!A&&B.updateManager){return B.updateManager}this.el=B;this.defaultUrl=null;this.addEvents("beforeupdate","update","failure");var C=Ext.Updater.defaults;this.sslBlankUrl=C.sslBlankUrl;this.disableCaching=C.disableCaching;this.indicatorText=C.indicatorText;this.showLoadIndicator=C.showLoadIndicator;this.timeout=C.timeout;this.loadScripts=C.loadScripts;this.transaction=null;this.autoRefreshProcId=null;this.refreshDelegate=this.refresh.createDelegate(this);this.updateDelegate=this.update.createDelegate(this);this.formUpdateDelegate=this.formUpdate.createDelegate(this);if(!this.renderer){this.renderer=new Ext.Updater.BasicRenderer()}Ext.Updater.superclass.constructor.call(this)};Ext.extend(Ext.Updater,Ext.util.Observable,{getEl:function(){return this.el},update:function(B,F,H,D){if(this.fireEvent("beforeupdate",this.el,B,F)!==false){var G=this.method,A,C;if(typeof B=="object"){A=B;B=A.url;F=F||A.params;H=H||A.callback;D=D||A.discardUrl;C=A.scope;if(typeof A.method!="undefined"){G=A.method}if(typeof A.nocache!="undefined"){this.disableCaching=A.nocache}if(typeof A.text!="undefined"){this.indicatorText="<div class=\"loading-indicator\">"+A.text+"</div>"}if(typeof A.scripts!="undefined"){this.loadScripts=A.scripts}if(typeof A.timeout!="undefined"){this.timeout=A.timeout}}this.showLoading();if(!D){this.defaultUrl=B}if(typeof B=="function"){B=B.call(this)}G=G||(F?"POST":"GET");if(G=="GET"){B=this.prepareUrl(B)}var E=Ext.apply(A||{},{url:B,params:(typeof F=="function"&&C)?F.createDelegate(C):F,success:this.processSuccess,failure:this.processFailure,scope:this,callback:undefined,timeout:(this.timeout*1000),argument:{"options":A,"url":B,"form":null,"callback":H,"scope":C||window,"params":F}});this.transaction=Ext.Ajax.request(E)}},formUpdate:function(C,A,B,D){if(this.fireEvent("beforeupdate",this.el,C,A)!==false){if(typeof A=="function"){A=A.call(this)}C=Ext.getDom(C);this.transaction=Ext.Ajax.request({form:C,url:A,success:this.processSuccess,failure:this.processFailure,scope:this,timeout:(this.timeout*1000),argument:{"url":A,"form":C,"callback":D,"reset":B}});this.showLoading.defer(1,this)}},refresh:function(A){if(this.defaultUrl==null){return }this.update(this.defaultUrl,null,A,true)},startAutoRefresh:function(B,C,D,E,A){if(A){this.update(C||this.defaultUrl,D,E,true)}if(this.autoRefreshProcId){clearInterval(this.autoRefreshProcId)}this.autoRefreshProcId=setInterval(this.update.createDelegate(this,[C||this.defaultUrl,D,E,true]),B*1000)},stopAutoRefresh:function(){if(this.autoRefreshProcId){clearInterval(this.autoRefreshProcId);delete this.autoRefreshProcId}},isAutoRefreshing:function(){return this.autoRefreshProcId?true:false},showLoading:function(){if(this.showLoadIndicator){this.el.update(this.indicatorText)}},prepareUrl:function(B){if(this.disableCaching){var A="_dc="+(new Date().getTime());if(B.indexOf("?")!==-1){B+="&"+A}else{B+="?"+A}}return B},processSuccess:function(A){this.transaction=null;if(A.argument.form&&A.argument.reset){try{A.argument.form.reset()}catch(B){}}if(this.loadScripts){this.renderer.render(this.el,A,this,this.updateComplete.createDelegate(this,[A]))}else{this.renderer.render(this.el,A,this);this.updateComplete(A)}},updateComplete:function(A){this.fireEvent("update",this.el,A);if(typeof A.argument.callback=="function"){A.argument.callback.call(A.argument.scope,this.el,true,A,A.argument.options)}},processFailure:function(A){this.transaction=null;this.fireEvent("failure",this.el,A);if(typeof A.argument.callback=="function"){A.argument.callback.call(A.argument.scope,this.el,false,A,A.argument.options)}},setRenderer:function(A){this.renderer=A},getRenderer:function(){return this.renderer},setDefaultUrl:function(A){this.defaultUrl=A},abort:function(){if(this.transaction){Ext.Ajax.abort(this.transaction)}},isUpdating:function(){if(this.transaction){return Ext.Ajax.isLoading(this.transaction)}return false}});Ext.Updater.defaults={timeout:30,loadScripts:false,sslBlankUrl:(Ext.SSL_SECURE_URL||"javascript:false"),disableCaching:false,showLoadIndicator:true,indicatorText:"<div class=\"loading-indicator\">Loading...</div>"};Ext.Updater.updateElement=function(D,C,E,B){var A=Ext.get(D).getUpdater();Ext.apply(A,B);A.update(C,E,B?B.callback:null)};Ext.Updater.update=Ext.Updater.updateElement;Ext.Updater.BasicRenderer=function(){};Ext.Updater.BasicRenderer.prototype={render:function(C,A,B,D){C.update(A.responseText,B.loadScripts,D)}};Ext.UpdateManager=Ext.Updater;
Date.parseFunctions={count:0};Date.parseRegexes=[];Date.formatFunctions={count:0};Date.prototype.dateFormat=function(B){if(Date.formatFunctions[B]==null){Date.createNewFormat(B)}var A=Date.formatFunctions[B];return this[A]()};Date.prototype.format=Date.prototype.dateFormat;Date.createNewFormat=function(format){var funcName="format"+Date.formatFunctions.count++;Date.formatFunctions[format]=funcName;var code="Date.prototype."+funcName+" = function(){return ";var special=false;var ch="";for(var i=0;i<format.length;++i){ch=format.charAt(i);if(!special&&ch=="\\"){special=true}else{if(special){special=false;code+="'"+String.escape(ch)+"' + "}else{code+=Date.getFormatCode(ch)}}}eval(code.substring(0,code.length-3)+";}")};Date.getFormatCode=function(D){switch(D){case"d":return"String.leftPad(this.getDate(), 2, '0') + ";case"D":return"Date.getShortDayName(this.getDay()) + ";case"j":return"this.getDate() + ";case"l":return"Date.dayNames[this.getDay()] + ";case"N":return"(this.getDay() ? this.getDay() : 7) + ";case"S":return"this.getSuffix() + ";case"w":return"this.getDay() + ";case"z":return"this.getDayOfYear() + ";case"W":return"String.leftPad(this.getWeekOfYear(), 2, '0') + ";case"F":return"Date.monthNames[this.getMonth()] + ";case"m":return"String.leftPad(this.getMonth() + 1, 2, '0') + ";case"M":return"Date.getShortMonthName(this.getMonth()) + ";case"n":return"(this.getMonth() + 1) + ";case"t":return"this.getDaysInMonth() + ";case"L":return"(this.isLeapYear() ? 1 : 0) + ";case"o":return"(this.getFullYear() + (this.getWeekOfYear() == 1 && this.getMonth() > 0 ? +1 : (this.getWeekOfYear() >= 52 && this.getMonth() < 11 ? -1 : 0))) + ";case"Y":return"this.getFullYear() + ";case"y":return"('' + this.getFullYear()).substring(2, 4) + ";case"a":return"(this.getHours() < 12 ? 'am' : 'pm') + ";case"A":return"(this.getHours() < 12 ? 'AM' : 'PM') + ";case"g":return"((this.getHours() % 12) ? this.getHours() % 12 : 12) + ";case"G":return"this.getHours() + ";case"h":return"String.leftPad((this.getHours() % 12) ? this.getHours() % 12 : 12, 2, '0') + ";case"H":return"String.leftPad(this.getHours(), 2, '0') + ";case"i":return"String.leftPad(this.getMinutes(), 2, '0') + ";case"s":return"String.leftPad(this.getSeconds(), 2, '0') + ";case"u":return"String.leftPad(this.getMilliseconds(), 3, '0') + ";case"O":return"this.getGMTOffset() + ";case"P":return"this.getGMTOffset(true) + ";case"T":return"this.getTimezone() + ";case"Z":return"(this.getTimezoneOffset() * -60) + ";case"c":for(var F=Date.getFormatCode,G="Y-m-dTH:i:sP",C="",B=0,A=G.length;B<A;++B){var E=G.charAt(B);C+=E=="T"?"'T' + ":F(E)}return C;case"U":return"Math.round(this.getTime() / 1000) + ";default:return"'"+String.escape(D)+"' + "}};Date.parseDate=function(A,C){if(Date.parseFunctions[C]==null){Date.createParser(C)}var B=Date.parseFunctions[C];return Date[B](A)};Date.createParser=function(format){var funcName="parse"+Date.parseFunctions.count++;var regexNum=Date.parseRegexes.length;var currentGroup=1;Date.parseFunctions[format]=funcName;var code="Date."+funcName+" = function(input){\n"+"var y = -1, m = -1, d = -1, h = -1, i = -1, s = -1, ms = -1, o, z, u, v;\n"+"input = String(input);var d = new Date();\n"+"y = d.getFullYear();\n"+"m = d.getMonth();\n"+"d = d.getDate();\n"+"var results = input.match(Date.parseRegexes["+regexNum+"]);\n"+"if (results && results.length > 0) {";var regex="";var special=false;var ch="";for(var i=0;i<format.length;++i){ch=format.charAt(i);if(!special&&ch=="\\"){special=true}else{if(special){special=false;regex+=String.escape(ch)}else{var obj=Date.formatCodeToRegex(ch,currentGroup);currentGroup+=obj.g;regex+=obj.s;if(obj.g&&obj.c){code+=obj.c}}}}code+="if (u)\n"+"{v = new Date(u * 1000);}"+"else if (y >= 0 && m >= 0 && d > 0 && h >= 0 && i >= 0 && s >= 0 && ms >= 0)\n"+"{v = new Date(y, m, d, h, i, s, ms);}\n"+"else if (y >= 0 && m >= 0 && d > 0 && h >= 0 && i >= 0 && s >= 0)\n"+"{v = new Date(y, m, d, h, i, s);}\n"+"else if (y >= 0 && m >= 0 && d > 0 && h >= 0 && i >= 0)\n"+"{v = new Date(y, m, d, h, i);}\n"+"else if (y >= 0 && m >= 0 && d > 0 && h >= 0)\n"+"{v = new Date(y, m, d, h);}\n"+"else if (y >= 0 && m >= 0 && d > 0)\n"+"{v = new Date(y, m, d);}\n"+"else if (y >= 0 && m >= 0)\n"+"{v = new Date(y, m);}\n"+"else if (y >= 0)\n"+"{v = new Date(y);}\n"+"}return (v && (z || o))?\n"+"    (z ? v.add(Date.SECOND, (v.getTimezoneOffset() * 60) + (z*1)) :\n"+"        v.add(Date.HOUR, (v.getGMTOffset() / 100) + (o / -100))) : v\n"+";}";Date.parseRegexes[regexNum]=new RegExp("^"+regex+"$","i");eval(code)};Date.formatCodeToRegex=function(G,F){switch(G){case"d":return{g:1,c:"d = parseInt(results["+F+"], 10);\n",s:"(\\d{2})"};case"D":for(var C=[],E=0;E<7;C.push(Date.getShortDayName(E)),++E){}return{g:0,c:null,s:"(?:"+C.join("|")+")"};case"j":return{g:1,c:"d = parseInt(results["+F+"], 10);\n",s:"(\\d{1,2})"};case"l":return{g:0,c:null,s:"(?:"+Date.dayNames.join("|")+")"};case"N":return{g:0,c:null,s:"[1-7]"};case"S":return{g:0,c:null,s:"(?:st|nd|rd|th)"};case"w":return{g:0,c:null,s:"[0-6]"};case"z":return{g:0,c:null,s:"(?:\\d{1,3}"};case"W":return{g:0,c:null,s:"(?:\\d{2})"};case"F":return{g:1,c:"m = parseInt(Date.getMonthNumber(results["+F+"]), 10);\n",s:"("+Date.monthNames.join("|")+")"};case"m":return{g:1,c:"m = parseInt(results["+F+"], 10) - 1;\n",s:"(\\d{2})"};case"M":for(var C=[],E=0;E<12;C.push(Date.getShortMonthName(E)),++E){}return{g:1,c:"m = parseInt(Date.getMonthNumber(results["+F+"]), 10);\n",s:"("+C.join("|")+")"};case"n":return{g:1,c:"m = parseInt(results["+F+"], 10) - 1;\n",s:"(\\d{1,2})"};case"t":return{g:0,c:null,s:"(?:\\d{2})"};case"L":return{g:0,c:null,s:"(?:1|0)"};case"o":case"Y":return{g:1,c:"y = parseInt(results["+F+"], 10);\n",s:"(\\d{4})"};case"y":return{g:1,c:"var ty = parseInt(results["+F+"], 10);\n"+"y = ty > Date.y2kYear ? 1900 + ty : 2000 + ty;\n",s:"(\\d{1,2})"};case"a":return{g:1,c:"if (results["+F+"] == 'am') {\n"+"if (h == 12) { h = 0; }\n"+"} else { if (h < 12) { h += 12; }}",s:"(am|pm)"};case"A":return{g:1,c:"if (results["+F+"] == 'AM') {\n"+"if (h == 12) { h = 0; }\n"+"} else { if (h < 12) { h += 12; }}",s:"(AM|PM)"};case"g":case"G":return{g:1,c:"h = parseInt(results["+F+"], 10);\n",s:"(\\d{1,2})"};case"h":case"H":return{g:1,c:"h = parseInt(results["+F+"], 10);\n",s:"(\\d{2})"};case"i":return{g:1,c:"i = parseInt(results["+F+"], 10);\n",s:"(\\d{2})"};case"s":return{g:1,c:"s = parseInt(results["+F+"], 10);\n",s:"(\\d{2})"};case"u":return{g:1,c:"ms = parseInt(results["+F+"], 10);\n",s:"(\\d{3})"};case"O":return{g:1,c:["o = results[",F,"];\n","var sn = o.substring(0,1);\n","var hr = o.substring(1,3)*1 + Math.floor(o.substring(3,5) / 60);\n","var mn = o.substring(3,5) % 60;\n","o = ((-12 <= (hr*60 + mn)/60) && ((hr*60 + mn)/60 <= 14))?\n","    (sn + String.leftPad(hr, 2, '0') + String.leftPad(mn, 2, '0')) : null;\n"].join(""),s:"([+-]\\d{4})"};case"P":return{g:1,c:["o = results[",F,"];\n","var sn = o.substring(0,1);\n","var hr = o.substring(1,3)*1 + Math.floor(o.substring(4,6) / 60);\n","var mn = o.substring(4,6) % 60;\n","o = ((-12 <= (hr*60 + mn)/60) && ((hr*60 + mn)/60 <= 14))?\n","    (sn + String.leftPad(hr, 2, '0') + String.leftPad(mn, 2, '0')) : null;\n"].join(""),s:"([+-]\\d{2}:\\d{2})"};case"T":return{g:0,c:null,s:"[A-Z]{1,4}"};case"Z":return{g:1,c:"z = results["+F+"] * 1;\n"+"z = (-43200 <= z && z <= 50400)? z : null;\n",s:"([+-]?\\d{1,5})"};case"c":var H=Date.formatCodeToRegex,D=[];var A=[H("Y",1),H("m",2),H("d",3),H("h",4),H("i",5),H("s",6),H("P",7)];for(var E=0,B=A.length;E<B;++E){D.push(A[E].c)}return{g:1,c:D.join(""),s:A[0].s+"-"+A[1].s+"-"+A[2].s+"T"+A[3].s+":"+A[4].s+":"+A[5].s+A[6].s};case"U":return{g:1,c:"u = parseInt(results["+F+"], 10);\n",s:"(-?\\d+)"};default:return{g:0,c:null,s:Ext.escapeRe(G)}}};Date.prototype.getTimezone=function(){return this.toString().replace(/^.* (?:\((.*)\)|([A-Z]{1,4})(?:[\-+][0-9]{4})?(?: -?\d+)?)$/,"$1$2").replace(/[^A-Z]/g,"")};Date.prototype.getGMTOffset=function(A){return(this.getTimezoneOffset()>0?"-":"+")+String.leftPad(Math.abs(Math.floor(this.getTimezoneOffset()/60)),2,"0")+(A?":":"")+String.leftPad(this.getTimezoneOffset()%60,2,"0")};Date.prototype.getDayOfYear=function(){var A=0;Date.daysInMonth[1]=this.isLeapYear()?29:28;for(var B=0;B<this.getMonth();++B){A+=Date.daysInMonth[B]}return A+this.getDate()-1};Date.prototype.getWeekOfYear=function(){var B=86400000;var C=7*B;var D=Date.UTC(this.getFullYear(),this.getMonth(),this.getDate()+3)/B;var A=Math.floor(D/7);var E=new Date(A*C).getUTCFullYear();return A-Math.floor(Date.UTC(E,0,7)/C)+1};Date.prototype.isLeapYear=function(){var A=this.getFullYear();return !!((A&3)==0&&(A%100||(A%400==0&&A)))};Date.prototype.getFirstDayOfMonth=function(){var A=(this.getDay()-(this.getDate()-1))%7;return(A<0)?(A+7):A};Date.prototype.getLastDayOfMonth=function(){var A=(this.getDay()+(Date.daysInMonth[this.getMonth()]-this.getDate()))%7;return(A<0)?(A+7):A};Date.prototype.getFirstDateOfMonth=function(){return new Date(this.getFullYear(),this.getMonth(),1)};Date.prototype.getLastDateOfMonth=function(){return new Date(this.getFullYear(),this.getMonth(),this.getDaysInMonth())};Date.prototype.getDaysInMonth=function(){Date.daysInMonth[1]=this.isLeapYear()?29:28;return Date.daysInMonth[this.getMonth()]};Date.prototype.getSuffix=function(){switch(this.getDate()){case 1:case 21:case 31:return"st";case 2:case 22:return"nd";case 3:case 23:return"rd";default:return"th"}};Date.daysInMonth=[31,28,31,30,31,30,31,31,30,31,30,31];Date.monthNames=["January","February","March","April","May","June","July","August","September","October","November","December"];Date.getShortMonthName=function(A){return Date.monthNames[A].substring(0,3)};Date.dayNames=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];Date.getShortDayName=function(A){return Date.dayNames[A].substring(0,3)};Date.y2kYear=50;Date.monthNumbers={Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};Date.getMonthNumber=function(A){return Date.monthNumbers[A.substring(0,1).toUpperCase()+A.substring(1,3).toLowerCase()]};Date.prototype.clone=function(){return new Date(this.getTime())};Date.prototype.clearTime=function(A){if(A){return this.clone().clearTime()}this.setHours(0);this.setMinutes(0);this.setSeconds(0);this.setMilliseconds(0);return this};if(Ext.isSafari){Date.brokenSetMonth=Date.prototype.setMonth;Date.prototype.setMonth=function(A){if(A<=-1){var D=Math.ceil(-A);var C=Math.ceil(D/12);var B=(D%12)?12-D%12:0;this.setFullYear(this.getFullYear()-C);return Date.brokenSetMonth.call(this,B)}else{return Date.brokenSetMonth.apply(this,arguments)}}}Date.MILLI="ms";Date.SECOND="s";Date.MINUTE="mi";Date.HOUR="h";Date.DAY="d";Date.MONTH="mo";Date.YEAR="y";Date.prototype.add=function(B,C){var D=this.clone();if(!B||C===0){return D}switch(B.toLowerCase()){case Date.MILLI:D.setMilliseconds(this.getMilliseconds()+C);break;case Date.SECOND:D.setSeconds(this.getSeconds()+C);break;case Date.MINUTE:D.setMinutes(this.getMinutes()+C);break;case Date.HOUR:D.setHours(this.getHours()+C);break;case Date.DAY:D.setDate(this.getDate()+C);break;case Date.MONTH:var A=this.getDate();if(A>28){A=Math.min(A,this.getFirstDateOfMonth().add("mo",C).getLastDateOfMonth().getDate())}D.setDate(A);D.setMonth(this.getMonth()+C);break;case Date.YEAR:D.setFullYear(this.getFullYear()+C);break}return D};Date.prototype.between=function(C,A){var B=this.getTime();return C.getTime()<=B&&B<=A.getTime()};
Ext.util.DelayedTask=function(E,D,A){var G=null,F,B;var C=function(){var H=new Date().getTime();if(H-B>=F){clearInterval(G);G=null;E.apply(D,A||[])}};this.delay=function(I,K,J,H){if(G&&I!=F){this.cancel()}F=I;B=new Date().getTime();E=K||E;D=J||D;A=H||A;if(!G){G=setInterval(C,F)}};this.cancel=function(){if(G){clearInterval(G);G=null}}};
Ext.util.TaskRunner=function(E){E=E||10;var F=[],A=[];var B=0;var G=false;var D=function(){G=false;clearInterval(B);B=0};var H=function(){if(!G){G=true;B=setInterval(I,E)}};var C=function(J){A.push(J);if(J.onStop){J.onStop.apply(J.scope||J)}};var I=function(){if(A.length>0){for(var O=0,K=A.length;O<K;O++){F.remove(A[O])}A=[];if(F.length<1){D();return }}var M=new Date().getTime();for(var O=0,K=F.length;O<K;++O){var N=F[O];var J=M-N.taskRunTime;if(N.interval<=J){var L=N.run.apply(N.scope||N,N.args||[++N.taskRunCount]);N.taskRunTime=M;if(L===false||N.taskRunCount===N.repeat){C(N);return }}if(N.duration&&N.duration<=(M-N.taskStartTime)){C(N)}}};this.start=function(J){F.push(J);J.taskStartTime=new Date().getTime();J.taskRunTime=0;J.taskRunCount=0;H();return J};this.stop=function(J){C(J);return J};this.stopAll=function(){D();for(var K=0,J=F.length;K<J;K++){if(F[K].onStop){F[K].onStop()}}F=[];A=[]}};Ext.TaskMgr=new Ext.util.TaskRunner();
Ext.util.MixedCollection=function(B,A){this.items=[];this.map={};this.keys=[];this.length=0;this.addEvents("clear","add","replace","remove","sort");this.allowFunctions=B===true;if(A){this.getKey=A}Ext.util.MixedCollection.superclass.constructor.call(this)};Ext.extend(Ext.util.MixedCollection,Ext.util.Observable,{allowFunctions:false,add:function(B,C){if(arguments.length==1){C=arguments[0];B=this.getKey(C)}if(typeof B=="undefined"||B===null){this.length++;this.items.push(C);this.keys.push(null)}else{var A=this.map[B];if(A){return this.replace(B,C)}this.length++;this.items.push(C);this.map[B]=C;this.keys.push(B)}this.fireEvent("add",this.length-1,C,B);return C},getKey:function(A){return A.id},replace:function(C,D){if(arguments.length==1){D=arguments[0];C=this.getKey(D)}var A=this.item(C);if(typeof C=="undefined"||C===null||typeof A=="undefined"){return this.add(C,D)}var B=this.indexOfKey(C);this.items[B]=D;this.map[C]=D;this.fireEvent("replace",C,A,D);return D},addAll:function(E){if(arguments.length>1||Ext.isArray(E)){var B=arguments.length>1?arguments:E;for(var D=0,A=B.length;D<A;D++){this.add(B[D])}}else{for(var C in E){if(this.allowFunctions||typeof E[C]!="function"){this.add(C,E[C])}}}},each:function(E,D){var B=[].concat(this.items);for(var C=0,A=B.length;C<A;C++){if(E.call(D||B[C],B[C],C,A)===false){break}}},eachKey:function(D,C){for(var B=0,A=this.keys.length;B<A;B++){D.call(C||window,this.keys[B],this.items[B],B,A)}},find:function(D,C){for(var B=0,A=this.items.length;B<A;B++){if(D.call(C||window,this.items[B],this.keys[B])){return this.items[B]}}return null},insert:function(A,B,C){if(arguments.length==2){C=arguments[1];B=this.getKey(C)}if(A>=this.length){return this.add(B,C)}this.length++;this.items.splice(A,0,C);if(typeof B!="undefined"&&B!=null){this.map[B]=C}this.keys.splice(A,0,B);this.fireEvent("add",A,C,B);return C},remove:function(A){return this.removeAt(this.indexOf(A))},removeAt:function(A){if(A<this.length&&A>=0){this.length--;var C=this.items[A];this.items.splice(A,1);var B=this.keys[A];if(typeof B!="undefined"){delete this.map[B]}this.keys.splice(A,1);this.fireEvent("remove",C,B);return C}return false},removeKey:function(A){return this.removeAt(this.indexOfKey(A))},getCount:function(){return this.length},indexOf:function(A){return this.items.indexOf(A)},indexOfKey:function(A){return this.keys.indexOf(A)},item:function(A){var B=typeof this.map[A]!="undefined"?this.map[A]:this.items[A];return typeof B!="function"||this.allowFunctions?B:null},itemAt:function(A){return this.items[A]},key:function(A){return this.map[A]},contains:function(A){return this.indexOf(A)!=-1},containsKey:function(A){return typeof this.map[A]!="undefined"},clear:function(){this.length=0;this.items=[];this.keys=[];this.map={};this.fireEvent("clear")},first:function(){return this.items[0]},last:function(){return this.items[this.length-1]},_sort:function(I,A,H){var C=String(A).toUpperCase()=="DESC"?-1:1;H=H||function(K,J){return K-J};var G=[],B=this.keys,F=this.items;for(var D=0,E=F.length;D<E;D++){G[G.length]={key:B[D],value:F[D],index:D}}G.sort(function(K,J){var L=H(K[I],J[I])*C;if(L==0){L=(K.index<J.index?-1:1)}return L});for(var D=0,E=G.length;D<E;D++){F[D]=G[D].value;B[D]=G[D].key}this.fireEvent("sort",this)},sort:function(A,B){this._sort("value",A,B)},keySort:function(A,B){this._sort("key",A,B||function(D,C){return String(D).toUpperCase()-String(C).toUpperCase()})},getRange:function(E,A){var B=this.items;if(B.length<1){return[]}E=E||0;A=Math.min(typeof A=="undefined"?this.length-1:A,this.length-1);var D=[];if(E<=A){for(var C=E;C<=A;C++){D[D.length]=B[C]}}else{for(var C=E;C>=A;C--){D[D.length]=B[C]}}return D},filter:function(C,B,D,A){if(Ext.isEmpty(B,false)){return this.clone()}B=this.createValueMatcher(B,D,A);return this.filterBy(function(E){return E&&B.test(E[C])})},filterBy:function(F,E){var G=new Ext.util.MixedCollection();G.getKey=this.getKey;var B=this.keys,D=this.items;for(var C=0,A=D.length;C<A;C++){if(F.call(E||this,D[C],B[C])){G.add(B[C],D[C])}}return G},findIndex:function(C,B,E,D,A){if(Ext.isEmpty(B,false)){return -1}B=this.createValueMatcher(B,D,A);return this.findIndexBy(function(F){return F&&B.test(F[C])},null,E)},findIndexBy:function(F,E,G){var B=this.keys,D=this.items;for(var C=(G||0),A=D.length;C<A;C++){if(F.call(E||this,D[C],B[C])){return C}}if(typeof G=="number"&&G>0){for(var C=0;C<G;C++){if(F.call(E||this,D[C],B[C])){return C}}}return -1},createValueMatcher:function(B,C,A){if(!B.exec){B=String(B);B=new RegExp((C===true?"":"^")+Ext.escapeRe(B),A?"":"i")}return B},clone:function(){var E=new Ext.util.MixedCollection();var B=this.keys,D=this.items;for(var C=0,A=D.length;C<A;C++){E.add(B[C],D[C])}E.getKey=this.getKey;return E}});Ext.util.MixedCollection.prototype.get=Ext.util.MixedCollection.prototype.item;
Ext.util.JSON=new (function(){var useHasOwn={}.hasOwnProperty?true:false;var pad=function(n){return n<10?"0"+n:n};var m={"\b":"\\b","\t":"\\t","\n":"\\n","\f":"\\f","\r":"\\r","\"":"\\\"","\\":"\\\\"};var encodeString=function(s){if(/["\\\x00-\x1f]/.test(s)){return"\""+s.replace(/([\x00-\x1f\\"])/g,function(a,b){var c=m[b];if(c){return c}c=b.charCodeAt();return"\\u00"+Math.floor(c/16).toString(16)+(c%16).toString(16)})+"\""}return"\""+s+"\""};var encodeArray=function(o){var a=["["],b,i,l=o.length,v;for(i=0;i<l;i+=1){v=o[i];switch(typeof v){case"undefined":case"function":case"unknown":break;default:if(b){a.push(",")}a.push(v===null?"null":Ext.util.JSON.encode(v));b=true}}a.push("]");return a.join("")};var encodeDate=function(o){return"\""+o.getFullYear()+"-"+pad(o.getMonth()+1)+"-"+pad(o.getDate())+"T"+pad(o.getHours())+":"+pad(o.getMinutes())+":"+pad(o.getSeconds())+"\""};this.encode=function(o){if(typeof o=="undefined"||o===null){return"null"}else{if(Ext.isArray(o)){return encodeArray(o)}else{if(Ext.isDate(o)){return encodeDate(o)}else{if(typeof o=="string"){return encodeString(o)}else{if(typeof o=="number"){return isFinite(o)?String(o):"null"}else{if(typeof o=="boolean"){return String(o)}else{var a=["{"],b,i,v;for(i in o){if(!useHasOwn||o.hasOwnProperty(i)){v=o[i];switch(typeof v){case"undefined":case"function":case"unknown":break;default:if(b){a.push(",")}a.push(this.encode(i),":",v===null?"null":this.encode(v));b=true}}}a.push("}");return a.join("")}}}}}}};this.decode=function(json){return eval("("+json+")")}})();Ext.encode=Ext.util.JSON.encode;Ext.decode=Ext.util.JSON.decode;
Ext.util.Format=function(){var trimRe=/^\s+|\s+$/g;return{ellipsis:function(value,len){if(value&&value.length>len){return value.substr(0,len-3)+"..."}return value},undef:function(value){return value!==undefined?value:""},defaultValue:function(value,defaultValue){return value!==undefined&&value!==""?value:defaultValue},htmlEncode:function(value){return !value?value:String(value).replace(/&/g,"&amp;").replace(/>/g,"&gt;").replace(/</g,"&lt;").replace(/"/g,"&quot;")},htmlDecode:function(value){return !value?value:String(value).replace(/&amp;/g,"&").replace(/&gt;/g,">").replace(/&lt;/g,"<").replace(/&quot;/g,"\"")},trim:function(value){return String(value).replace(trimRe,"")},substr:function(value,start,length){return String(value).substr(start,length)},lowercase:function(value){return String(value).toLowerCase()},uppercase:function(value){return String(value).toUpperCase()},capitalize:function(value){return !value?value:value.charAt(0).toUpperCase()+value.substr(1).toLowerCase()},call:function(value,fn){if(arguments.length>2){var args=Array.prototype.slice.call(arguments,2);args.unshift(value);return eval(fn).apply(window,args)}else{return eval(fn).call(window,value)}},usMoney:function(v){v=(Math.round((v-0)*100))/100;v=(v==Math.floor(v))?v+".00":((v*10==Math.floor(v*10))?v+"0":v);v=String(v);var ps=v.split(".");var whole=ps[0];var sub=ps[1]?"."+ps[1]:".00";var r=/(\d+)(\d{3})/;while(r.test(whole)){whole=whole.replace(r,"$1"+","+"$2")}v=whole+sub;if(v.charAt(0)=="-"){return"-$"+v.substr(1)}return"$"+v},date:function(v,format){if(!v){return""}if(!Ext.isDate(v)){v=new Date(Date.parse(v))}return v.dateFormat(format||"m/d/Y")},dateRenderer:function(format){return function(v){return Ext.util.Format.date(v,format)}},stripTagsRE:/<\/?[^>]+>/gi,stripTags:function(v){return !v?v:String(v).replace(this.stripTagsRE,"")},stripScriptsRe:/(?:<script.*?>)((\n|\r|.)*?)(?:<\/script>)/ig,stripScripts:function(v){return !v?v:String(v).replace(this.stripScriptsRe,"")},fileSize:function(size){if(size<1024){return size+" bytes"}else{if(size<1048576){return(Math.round(((size*10)/1024))/10)+" KB"}else{return(Math.round(((size*10)/1048576))/10)+" MB"}}},math:function(){var fns={};return function(v,a){if(!fns[a]){fns[a]=new Function("v","return v "+a+";")}return fns[a](v)}}()}}();
Ext.XTemplate=function(){Ext.XTemplate.superclass.constructor.apply(this,arguments);var P=this.html;P=["<tpl>",P,"</tpl>"].join("");var O=/<tpl\b[^>]*>((?:(?=([^<]+))\2|<(?!tpl\b[^>]*>))*?)<\/tpl>/;var N=/^<tpl\b[^>]*?for="(.*?)"/;var L=/^<tpl\b[^>]*?if="(.*?)"/;var J=/^<tpl\b[^>]*?exec="(.*?)"/;var C,B=0;var G=[];while(C=P.match(O)){var M=C[0].match(N);var K=C[0].match(L);var I=C[0].match(J);var E=null,H=null,D=null;var A=M&&M[1]?M[1]:"";if(K){E=K&&K[1]?K[1]:null;if(E){H=new Function("values","parent","xindex","xcount","with(values){ return "+(Ext.util.Format.htmlDecode(E))+"; }")}}if(I){E=I&&I[1]?I[1]:null;if(E){D=new Function("values","parent","xindex","xcount","with(values){ "+(Ext.util.Format.htmlDecode(E))+"; }")}}if(A){switch(A){case".":A=new Function("values","parent","with(values){ return values; }");break;case"..":A=new Function("values","parent","with(values){ return parent; }");break;default:A=new Function("values","parent","with(values){ return "+A+"; }")}}G.push({id:B,target:A,exec:D,test:H,body:C[1]||""});P=P.replace(C[0],"{xtpl"+B+"}");++B}for(var F=G.length-1;F>=0;--F){this.compileTpl(G[F])}this.master=G[G.length-1];this.tpls=G};Ext.extend(Ext.XTemplate,Ext.Template,{re:/\{([\w-\.\#]+)(?:\:([\w\.]*)(?:\((.*?)?\))?)?(\s?[\+\-\*\\]\s?[\d\.\+\-\*\\\(\)]+)?\}/g,codeRe:/\{\[((?:\\\]|.|\n)*?)\]\}/g,applySubTemplate:function(A,H,G,D,C){var J=this.tpls[A];if(J.test&&!J.test.call(this,H,G,D,C)){return""}if(J.exec&&J.exec.call(this,H,G,D,C)){return""}var I=J.target?J.target.call(this,H,G):H;G=J.target?H:G;if(J.target&&Ext.isArray(I)){var B=[];for(var E=0,F=I.length;E<F;E++){B[B.length]=J.compiled.call(this,I[E],G,E+1,F)}return B.join("")}return J.compiled.call(this,I,G,D,C)},compileTpl:function(tpl){var fm=Ext.util.Format;var useF=this.disableFormats!==true;var sep=Ext.isGecko?"+":",";var fn=function(m,name,format,args,math){if(name.substr(0,4)=="xtpl"){return"'"+sep+"this.applySubTemplate("+name.substr(4)+", values, parent, xindex, xcount)"+sep+"'"}var v;if(name==="."){v="values"}else{if(name==="#"){v="xindex"}else{if(name.indexOf(".")!=-1){v=name}else{v="values['"+name+"']"}}}if(math){v="("+v+math+")"}if(format&&useF){args=args?","+args:"";if(format.substr(0,5)!="this."){format="fm."+format+"("}else{format="this.call(\""+format.substr(5)+"\", ";args=", values"}}else{args="";format="("+v+" === undefined ? '' : "}return"'"+sep+format+v+args+")"+sep+"'"};var codeFn=function(m,code){return"'"+sep+"("+code+")"+sep+"'"};var body;if(Ext.isGecko){body="tpl.compiled = function(values, parent, xindex, xcount){ return '"+tpl.body.replace(/(\r\n|\n)/g,"\\n").replace(/'/g,"\\'").replace(this.re,fn).replace(this.codeRe,codeFn)+"';};"}else{body=["tpl.compiled = function(values, parent, xindex, xcount){ return ['"];body.push(tpl.body.replace(/(\r\n|\n)/g,"\\n").replace(/'/g,"\\'").replace(this.re,fn).replace(this.codeRe,codeFn));body.push("'].join('');};");body=body.join("")}eval(body);return this},apply:function(A){return this.master.compiled.call(this,A,{},1,1)},applyTemplate:function(A){return this.master.compiled.call(this,A,{},1,1)},compile:function(){return this}});Ext.XTemplate.from=function(A){A=Ext.getDom(A);return new Ext.XTemplate(A.value||A.innerHTML)};
Ext.util.CSS=function(){var D=null;var C=document;var B=/(-[a-z])/gi;var A=function(E,F){return F.charAt(1).toUpperCase()};return{createStyleSheet:function(G,J){var F;var E=C.getElementsByTagName("head")[0];var I=C.createElement("style");I.setAttribute("type","text/css");if(J){I.setAttribute("id",J)}if(Ext.isIE){E.appendChild(I);F=I.styleSheet;F.cssText=G}else{try{I.appendChild(C.createTextNode(G))}catch(H){I.cssText=G}E.appendChild(I);F=I.styleSheet?I.styleSheet:(I.sheet||C.styleSheets[C.styleSheets.length-1])}this.cacheStyleSheet(F);return F},removeStyleSheet:function(F){var E=C.getElementById(F);if(E){E.parentNode.removeChild(E)}},swapStyleSheet:function(G,E){this.removeStyleSheet(G);var F=C.createElement("link");F.setAttribute("rel","stylesheet");F.setAttribute("type","text/css");F.setAttribute("id",G);F.setAttribute("href",E);C.getElementsByTagName("head")[0].appendChild(F)},refreshCache:function(){return this.getRules(true)},cacheStyleSheet:function(F){if(!D){D={}}try{var H=F.cssRules||F.rules;for(var E=H.length-1;E>=0;--E){D[H[E].selectorText]=H[E]}}catch(G){}},getRules:function(F){if(D==null||F){D={};var H=C.styleSheets;for(var G=0,E=H.length;G<E;G++){try{this.cacheStyleSheet(H[G])}catch(I){}}}return D},getRule:function(E,G){var F=this.getRules(G);if(!Ext.isArray(E)){return F[E]}for(var H=0;H<E.length;H++){if(F[E[H]]){return F[E[H]]}}return null},updateRule:function(E,H,G){if(!Ext.isArray(E)){var I=this.getRule(E);if(I){I.style[H.replace(B,A)]=G;return true}}else{for(var F=0;F<E.length;F++){if(this.updateRule(E[F],H,G)){return true}}}return false}}}();
Ext.util.ClickRepeater=function(B,A){this.el=Ext.get(B);this.el.unselectable();Ext.apply(this,A);this.addEvents("mousedown","click","mouseup");this.el.on("mousedown",this.handleMouseDown,this);if(this.preventDefault||this.stopDefault){this.el.on("click",function(C){if(this.preventDefault){C.preventDefault()}if(this.stopDefault){C.stopEvent()}},this)}if(this.handler){this.on("click",this.handler,this.scope||this)}Ext.util.ClickRepeater.superclass.constructor.call(this)};Ext.extend(Ext.util.ClickRepeater,Ext.util.Observable,{interval:20,delay:250,preventDefault:true,stopDefault:false,timer:0,handleMouseDown:function(){clearTimeout(this.timer);this.el.blur();if(this.pressClass){this.el.addClass(this.pressClass)}this.mousedownTime=new Date();Ext.getDoc().on("mouseup",this.handleMouseUp,this);this.el.on("mouseout",this.handleMouseOut,this);this.fireEvent("mousedown",this);this.fireEvent("click",this);if(this.accelerate){this.delay=400}this.timer=this.click.defer(this.delay||this.interval,this)},click:function(){this.fireEvent("click",this);this.timer=this.click.defer(this.accelerate?this.easeOutExpo(this.mousedownTime.getElapsed(),400,-390,12000):this.interval,this)},easeOutExpo:function(B,A,D,C){return(B==C)?A+D:D*(-Math.pow(2,-10*B/C)+1)+A},handleMouseOut:function(){clearTimeout(this.timer);if(this.pressClass){this.el.removeClass(this.pressClass)}this.el.on("mouseover",this.handleMouseReturn,this)},handleMouseReturn:function(){this.el.un("mouseover",this.handleMouseReturn);if(this.pressClass){this.el.addClass(this.pressClass)}this.click()},handleMouseUp:function(){clearTimeout(this.timer);this.el.un("mouseover",this.handleMouseReturn);this.el.un("mouseout",this.handleMouseOut);Ext.getDoc().un("mouseup",this.handleMouseUp);this.el.removeClass(this.pressClass);this.fireEvent("mouseup",this)}});
Ext.KeyNav=function(B,A){this.el=Ext.get(B);Ext.apply(this,A);if(!this.disabled){this.disabled=true;this.enable()}};Ext.KeyNav.prototype={disabled:false,defaultEventAction:"stopEvent",forceKeyDown:false,prepareEvent:function(C){var A=C.getKey();var B=this.keyToHandler[A];if(Ext.isSafari&&B&&A>=37&&A<=40){C.stopEvent()}},relay:function(C){var A=C.getKey();var B=this.keyToHandler[A];if(B&&this[B]){if(this.doRelay(C,this[B],B)!==true){C[this.defaultEventAction]()}}},doRelay:function(C,B,A){return B.call(this.scope||this,C)},enter:false,left:false,right:false,up:false,down:false,tab:false,esc:false,pageUp:false,pageDown:false,del:false,home:false,end:false,keyToHandler:{37:"left",39:"right",38:"up",40:"down",33:"pageUp",34:"pageDown",46:"del",36:"home",35:"end",13:"enter",27:"esc",9:"tab"},enable:function(){if(this.disabled){if(this.forceKeyDown||Ext.isIE||Ext.isAir){this.el.on("keydown",this.relay,this)}else{this.el.on("keydown",this.prepareEvent,this);this.el.on("keypress",this.relay,this)}this.disabled=false}},disable:function(){if(!this.disabled){if(this.forceKeyDown||Ext.isIE||Ext.isAir){this.el.un("keydown",this.relay)}else{this.el.un("keydown",this.prepareEvent);this.el.un("keypress",this.relay)}this.disabled=true}}};
Ext.KeyMap=function(C,B,A){this.el=Ext.get(C);this.eventName=A||"keydown";this.bindings=[];if(B){this.addBinding(B)}this.enable()};Ext.KeyMap.prototype={stopEvent:false,addBinding:function(D){if(Ext.isArray(D)){for(var F=0,H=D.length;F<H;F++){this.addBinding(D[F])}return }var N=D.key,C=D.shift,A=D.ctrl,G=D.alt,J=D.fn||D.handler,M=D.scope;if(typeof N=="string"){var K=[];var I=N.toUpperCase();for(var E=0,H=I.length;E<H;E++){K.push(I.charCodeAt(E))}N=K}var B=Ext.isArray(N);var L=function(R){if((!C||R.shiftKey)&&(!A||R.ctrlKey)&&(!G||R.altKey)){var P=R.getKey();if(B){for(var Q=0,O=N.length;Q<O;Q++){if(N[Q]==P){if(this.stopEvent){R.stopEvent()}J.call(M||window,P,R);return }}}else{if(P==N){if(this.stopEvent){R.stopEvent()}J.call(M||window,P,R)}}}};this.bindings.push(L)},on:function(B,D,C){var G,A,E,F;if(typeof B=="object"&&!Ext.isArray(B)){G=B.key;A=B.shift;E=B.ctrl;F=B.alt}else{G=B}this.addBinding({key:G,shift:A,ctrl:E,alt:F,fn:D,scope:C})},handleKeyDown:function(D){if(this.enabled){var B=this.bindings;for(var C=0,A=B.length;C<A;C++){B[C].call(this,D)}}},isEnabled:function(){return this.enabled},enable:function(){if(!this.enabled){this.el.on(this.eventName,this.handleKeyDown,this);this.enabled=true}},disable:function(){if(this.enabled){this.el.removeListener(this.eventName,this.handleKeyDown,this);this.enabled=false}}};
Ext.util.TextMetrics=function(){var A;return{measure:function(B,C,D){if(!A){A=Ext.util.TextMetrics.Instance(B,D)}A.bind(B);A.setFixedWidth(D||"auto");return A.getSize(C)},createInstance:function(B,C){return Ext.util.TextMetrics.Instance(B,C)}}}();Ext.util.TextMetrics.Instance=function(B,D){var C=new Ext.Element(document.createElement("div"));document.body.appendChild(C.dom);C.position("absolute");C.setLeftTop(-1000,-1000);C.hide();if(D){C.setWidth(D)}var A={getSize:function(F){C.update(F);var E=C.getSize();C.update("");return E},bind:function(E){C.setStyle(Ext.fly(E).getStyles("font-size","font-style","font-weight","font-family","line-height"))},setFixedWidth:function(E){C.setWidth(E)},getWidth:function(E){C.dom.style.width="auto";return this.getSize(E).width},getHeight:function(E){return this.getSize(E).height}};A.bind(B);return A};Ext.Element.measureText=Ext.util.TextMetrics.measure;
(function(){var A=Ext.EventManager;var B=Ext.lib.Dom;Ext.dd.DragDrop=function(E,C,D){if(E){this.init(E,C,D)}};Ext.dd.DragDrop.prototype={id:null,config:null,dragElId:null,handleElId:null,invalidHandleTypes:null,invalidHandleIds:null,invalidHandleClasses:null,startPageX:0,startPageY:0,groups:null,locked:false,lock:function(){this.locked=true},unlock:function(){this.locked=false},isTarget:true,padding:null,_domRef:null,__ygDragDrop:true,constrainX:false,constrainY:false,minX:0,maxX:0,minY:0,maxY:0,maintainOffset:false,xTicks:null,yTicks:null,primaryButtonOnly:true,available:false,hasOuterHandles:false,b4StartDrag:function(C,D){},startDrag:function(C,D){},b4Drag:function(C){},onDrag:function(C){},onDragEnter:function(C,D){},b4DragOver:function(C){},onDragOver:function(C,D){},b4DragOut:function(C){},onDragOut:function(C,D){},b4DragDrop:function(C){},onDragDrop:function(C,D){},onInvalidDrop:function(C){},b4EndDrag:function(C){},endDrag:function(C){},b4MouseDown:function(C){},onMouseDown:function(C){},onMouseUp:function(C){},onAvailable:function(){},defaultPadding:{left:0,right:0,top:0,bottom:0},constrainTo:function(H,F,M){if(typeof F=="number"){F={left:F,right:F,top:F,bottom:F}}F=F||this.defaultPadding;var J=Ext.get(this.getEl()).getBox();var C=Ext.get(H);var L=C.getScroll();var I,D=C.dom;if(D==document.body){I={x:L.left,y:L.top,width:Ext.lib.Dom.getViewWidth(),height:Ext.lib.Dom.getViewHeight()}}else{var K=C.getXY();I={x:K[0]+L.left,y:K[1]+L.top,width:D.clientWidth,height:D.clientHeight}}var G=J.y-I.y;var E=J.x-I.x;this.resetConstraints();this.setXConstraint(E-(F.left||0),I.width-E-J.width-(F.right||0),this.xTickSize);this.setYConstraint(G-(F.top||0),I.height-G-J.height-(F.bottom||0),this.yTickSize)},getEl:function(){if(!this._domRef){this._domRef=Ext.getDom(this.id)}return this._domRef},getDragEl:function(){return Ext.getDom(this.dragElId)},init:function(E,C,D){this.initTarget(E,C,D);A.on(this.id,"mousedown",this.handleMouseDown,this)},initTarget:function(E,C,D){this.config=D||{};this.DDM=Ext.dd.DDM;this.groups={};if(typeof E!=="string"){E=Ext.id(E)}this.id=E;this.addToGroup((C)?C:"default");this.handleElId=E;this.setDragElId(E);this.invalidHandleTypes={A:"A"};this.invalidHandleIds={};this.invalidHandleClasses=[];this.applyConfig();this.handleOnAvailable()},applyConfig:function(){this.padding=this.config.padding||[0,0,0,0];this.isTarget=(this.config.isTarget!==false);this.maintainOffset=(this.config.maintainOffset);this.primaryButtonOnly=(this.config.primaryButtonOnly!==false)},handleOnAvailable:function(){this.available=true;this.resetConstraints();this.onAvailable()},setPadding:function(E,C,F,D){if(!C&&0!==C){this.padding=[E,E,E,E]}else{if(!F&&0!==F){this.padding=[E,C,E,C]}else{this.padding=[E,C,F,D]}}},setInitPosition:function(F,E){var G=this.getEl();if(!this.DDM.verifyEl(G)){return }var D=F||0;var C=E||0;var H=B.getXY(G);this.initPageX=H[0]-D;this.initPageY=H[1]-C;this.lastPageX=H[0];this.lastPageY=H[1];this.setStartPosition(H)},setStartPosition:function(D){var C=D||B.getXY(this.getEl());this.deltaSetXY=null;this.startPageX=C[0];this.startPageY=C[1]},addToGroup:function(C){this.groups[C]=true;this.DDM.regDragDrop(this,C)},removeFromGroup:function(C){if(this.groups[C]){delete this.groups[C]}this.DDM.removeDDFromGroup(this,C)},setDragElId:function(C){this.dragElId=C},setHandleElId:function(C){if(typeof C!=="string"){C=Ext.id(C)}this.handleElId=C;this.DDM.regHandle(this.id,C)},setOuterHandleElId:function(C){if(typeof C!=="string"){C=Ext.id(C)}A.on(C,"mousedown",this.handleMouseDown,this);this.setHandleElId(C);this.hasOuterHandles=true},unreg:function(){A.un(this.id,"mousedown",this.handleMouseDown);this._domRef=null;this.DDM._remove(this)},destroy:function(){this.unreg()},isLocked:function(){return(this.DDM.isLocked()||this.locked)},handleMouseDown:function(E,D){if(this.primaryButtonOnly&&E.button!=0){return }if(this.isLocked()){return }this.DDM.refreshCache(this.groups);var C=new Ext.lib.Point(Ext.lib.Event.getPageX(E),Ext.lib.Event.getPageY(E));if(!this.hasOuterHandles&&!this.DDM.isOverTarget(C,this)){}else{if(this.clickValidator(E)){this.setStartPosition();this.b4MouseDown(E);this.onMouseDown(E);this.DDM.handleMouseDown(E,this);this.DDM.stopEvent(E)}else{}}},clickValidator:function(D){var C=D.getTarget();return(this.isValidHandleChild(C)&&(this.id==this.handleElId||this.DDM.handleWasClicked(C,this.id)))},addInvalidHandleType:function(C){var D=C.toUpperCase();this.invalidHandleTypes[D]=D},addInvalidHandleId:function(C){if(typeof C!=="string"){C=Ext.id(C)}this.invalidHandleIds[C]=C},addInvalidHandleClass:function(C){this.invalidHandleClasses.push(C)},removeInvalidHandleType:function(C){var D=C.toUpperCase();delete this.invalidHandleTypes[D]},removeInvalidHandleId:function(C){if(typeof C!=="string"){C=Ext.id(C)}delete this.invalidHandleIds[C]},removeInvalidHandleClass:function(D){for(var E=0,C=this.invalidHandleClasses.length;E<C;++E){if(this.invalidHandleClasses[E]==D){delete this.invalidHandleClasses[E]}}},isValidHandleChild:function(F){var E=true;var H;try{H=F.nodeName.toUpperCase()}catch(G){H=F.nodeName}E=E&&!this.invalidHandleTypes[H];E=E&&!this.invalidHandleIds[F.id];for(var D=0,C=this.invalidHandleClasses.length;E&&D<C;++D){E=!B.hasClass(F,this.invalidHandleClasses[D])}return E},setXTicks:function(F,C){this.xTicks=[];this.xTickSize=C;var E={};for(var D=this.initPageX;D>=this.minX;D=D-C){if(!E[D]){this.xTicks[this.xTicks.length]=D;E[D]=true}}for(D=this.initPageX;D<=this.maxX;D=D+C){if(!E[D]){this.xTicks[this.xTicks.length]=D;E[D]=true}}this.xTicks.sort(this.DDM.numericSort)},setYTicks:function(F,C){this.yTicks=[];this.yTickSize=C;var E={};for(var D=this.initPageY;D>=this.minY;D=D-C){if(!E[D]){this.yTicks[this.yTicks.length]=D;E[D]=true}}for(D=this.initPageY;D<=this.maxY;D=D+C){if(!E[D]){this.yTicks[this.yTicks.length]=D;E[D]=true}}this.yTicks.sort(this.DDM.numericSort)},setXConstraint:function(E,D,C){this.leftConstraint=E;this.rightConstraint=D;this.minX=this.initPageX-E;this.maxX=this.initPageX+D;if(C){this.setXTicks(this.initPageX,C)}this.constrainX=true},clearConstraints:function(){this.constrainX=false;this.constrainY=false;this.clearTicks()},clearTicks:function(){this.xTicks=null;this.yTicks=null;this.xTickSize=0;this.yTickSize=0},setYConstraint:function(C,E,D){this.topConstraint=C;this.bottomConstraint=E;this.minY=this.initPageY-C;this.maxY=this.initPageY+E;if(D){this.setYTicks(this.initPageY,D)}this.constrainY=true},resetConstraints:function(){if(this.initPageX||this.initPageX===0){var D=(this.maintainOffset)?this.lastPageX-this.initPageX:0;var C=(this.maintainOffset)?this.lastPageY-this.initPageY:0;this.setInitPosition(D,C)}else{this.setInitPosition()}if(this.constrainX){this.setXConstraint(this.leftConstraint,this.rightConstraint,this.xTickSize)}if(this.constrainY){this.setYConstraint(this.topConstraint,this.bottomConstraint,this.yTickSize)}},getTick:function(I,F){if(!F){return I}else{if(F[0]>=I){return F[0]}else{for(var D=0,C=F.length;D<C;++D){var E=D+1;if(F[E]&&F[E]>=I){var H=I-F[D];var G=F[E]-I;return(G>H)?F[D]:F[E]}}return F[F.length-1]}}},toString:function(){return("DragDrop "+this.id)}}})();if(!Ext.dd.DragDropMgr){Ext.dd.DragDropMgr=function(){var A=Ext.EventManager;return{ids:{},handleIds:{},dragCurrent:null,dragOvers:{},deltaX:0,deltaY:0,preventDefault:true,stopPropagation:true,initalized:false,locked:false,init:function(){this.initialized=true},POINT:0,INTERSECT:1,mode:0,_execOnAll:function(D,C){for(var E in this.ids){for(var B in this.ids[E]){var F=this.ids[E][B];if(!this.isTypeOfDD(F)){continue}F[D].apply(F,C)}}},_onLoad:function(){this.init();A.on(document,"mouseup",this.handleMouseUp,this,true);A.on(document,"mousemove",this.handleMouseMove,this,true);A.on(window,"unload",this._onUnload,this,true);A.on(window,"resize",this._onResize,this,true)},_onResize:function(B){this._execOnAll("resetConstraints",[])},lock:function(){this.locked=true},unlock:function(){this.locked=false},isLocked:function(){return this.locked},locationCache:{},useCache:true,clickPixelThresh:3,clickTimeThresh:350,dragThreshMet:false,clickTimeout:null,startX:0,startY:0,regDragDrop:function(C,B){if(!this.initialized){this.init()}if(!this.ids[B]){this.ids[B]={}}this.ids[B][C.id]=C},removeDDFromGroup:function(D,B){if(!this.ids[B]){this.ids[B]={}}var C=this.ids[B];if(C&&C[D.id]){delete C[D.id]}},_remove:function(C){for(var B in C.groups){if(B&&this.ids[B][C.id]){delete this.ids[B][C.id]}}delete this.handleIds[C.id]},regHandle:function(C,B){if(!this.handleIds[C]){this.handleIds[C]={}}this.handleIds[C][B]=B},isDragDrop:function(B){return(this.getDDById(B))?true:false},getRelated:function(F,C){var E=[];for(var D in F.groups){for(j in this.ids[D]){var B=this.ids[D][j];if(!this.isTypeOfDD(B)){continue}if(!C||B.isTarget){E[E.length]=B}}}return E},isLegalTarget:function(F,E){var C=this.getRelated(F,true);for(var D=0,B=C.length;D<B;++D){if(C[D].id==E.id){return true}}return false},isTypeOfDD:function(B){return(B&&B.__ygDragDrop)},isHandle:function(C,B){return(this.handleIds[C]&&this.handleIds[C][B])},getDDById:function(C){for(var B in this.ids){if(this.ids[B][C]){return this.ids[B][C]}}return null},handleMouseDown:function(D,C){if(Ext.QuickTips){Ext.QuickTips.disable()}this.currentTarget=D.getTarget();this.dragCurrent=C;var B=C.getEl();this.startX=D.getPageX();this.startY=D.getPageY();this.deltaX=this.startX-B.offsetLeft;this.deltaY=this.startY-B.offsetTop;this.dragThreshMet=false;this.clickTimeout=setTimeout(function(){var E=Ext.dd.DDM;E.startDrag(E.startX,E.startY)},this.clickTimeThresh)},startDrag:function(B,C){clearTimeout(this.clickTimeout);if(this.dragCurrent){this.dragCurrent.b4StartDrag(B,C);this.dragCurrent.startDrag(B,C)}this.dragThreshMet=true},handleMouseUp:function(B){if(Ext.QuickTips){Ext.QuickTips.enable()}if(!this.dragCurrent){return }clearTimeout(this.clickTimeout);if(this.dragThreshMet){this.fireEvents(B,true)}else{}this.stopDrag(B);this.stopEvent(B)},stopEvent:function(B){if(this.stopPropagation){B.stopPropagation()}if(this.preventDefault){B.preventDefault()}},stopDrag:function(B){if(this.dragCurrent){if(this.dragThreshMet){this.dragCurrent.b4EndDrag(B);this.dragCurrent.endDrag(B)}this.dragCurrent.onMouseUp(B)}this.dragCurrent=null;this.dragOvers={}},handleMouseMove:function(D){if(!this.dragCurrent){return true}if(Ext.isIE&&(D.button!==0&&D.button!==1&&D.button!==2)){this.stopEvent(D);return this.handleMouseUp(D)}if(!this.dragThreshMet){var C=Math.abs(this.startX-D.getPageX());var B=Math.abs(this.startY-D.getPageY());if(C>this.clickPixelThresh||B>this.clickPixelThresh){this.startDrag(this.startX,this.startY)}}if(this.dragThreshMet){this.dragCurrent.b4Drag(D);this.dragCurrent.onDrag(D);if(!this.dragCurrent.moveOnly){this.fireEvents(D,false)}}this.stopEvent(D);return true},fireEvents:function(K,L){var N=this.dragCurrent;if(!N||N.isLocked()){return }var O=K.getPoint();var B=[];var E=[];var I=[];var G=[];var D=[];for(var F in this.dragOvers){var C=this.dragOvers[F];if(!this.isTypeOfDD(C)){continue}if(!this.isOverTarget(O,C,this.mode)){E.push(C)}B[F]=true;delete this.dragOvers[F]}for(var M in N.groups){if("string"!=typeof M){continue}for(F in this.ids[M]){var H=this.ids[M][F];if(!this.isTypeOfDD(H)){continue}if(H.isTarget&&!H.isLocked()&&H!=N){if(this.isOverTarget(O,H,this.mode)){if(L){G.push(H)}else{if(!B[H.id]){D.push(H)}else{I.push(H)}this.dragOvers[H.id]=H}}}}}if(this.mode){if(E.length){N.b4DragOut(K,E);N.onDragOut(K,E)}if(D.length){N.onDragEnter(K,D)}if(I.length){N.b4DragOver(K,I);N.onDragOver(K,I)}if(G.length){N.b4DragDrop(K,G);N.onDragDrop(K,G)}}else{var J=0;for(F=0,J=E.length;F<J;++F){N.b4DragOut(K,E[F].id);N.onDragOut(K,E[F].id)}for(F=0,J=D.length;F<J;++F){N.onDragEnter(K,D[F].id)}for(F=0,J=I.length;F<J;++F){N.b4DragOver(K,I[F].id);N.onDragOver(K,I[F].id)}for(F=0,J=G.length;F<J;++F){N.b4DragDrop(K,G[F].id);N.onDragDrop(K,G[F].id)}}if(L&&!G.length){N.onInvalidDrop(K)}},getBestMatch:function(D){var F=null;var C=D.length;if(C==1){F=D[0]}else{for(var E=0;E<C;++E){var B=D[E];if(B.cursorIsOver){F=B;break}else{if(!F||F.overlap.getArea()<B.overlap.getArea()){F=B}}}}return F},refreshCache:function(C){for(var B in C){if("string"!=typeof B){continue}for(var D in this.ids[B]){var E=this.ids[B][D];if(this.isTypeOfDD(E)){var F=this.getLocation(E);if(F){this.locationCache[E.id]=F}else{delete this.locationCache[E.id]}}}}},verifyEl:function(C){if(C){var B;if(Ext.isIE){try{B=C.offsetParent}catch(D){}}else{B=C.offsetParent}if(B){return true}}return false},getLocation:function(G){if(!this.isTypeOfDD(G)){return null}var E=G.getEl(),J,D,C,L,K,M,B,I,F;try{J=Ext.lib.Dom.getXY(E)}catch(H){}if(!J){return null}D=J[0];C=D+E.offsetWidth;L=J[1];K=L+E.offsetHeight;M=L-G.padding[0];B=C+G.padding[1];I=K+G.padding[2];F=D-G.padding[3];return new Ext.lib.Region(M,B,I,F)},isOverTarget:function(J,B,D){var F=this.locationCache[B.id];if(!F||!this.useCache){F=this.getLocation(B);this.locationCache[B.id]=F}if(!F){return false}B.cursorIsOver=F.contains(J);var I=this.dragCurrent;if(!I||!I.getTargetCoord||(!D&&!I.constrainX&&!I.constrainY)){return B.cursorIsOver}B.overlap=null;var G=I.getTargetCoord(J.x,J.y);var C=I.getDragEl();var E=new Ext.lib.Region(G.y,G.x+C.offsetWidth,G.y+C.offsetHeight,G.x);var H=E.intersect(F);if(H){B.overlap=H;return(D)?true:B.cursorIsOver}else{return false}},_onUnload:function(C,B){Ext.dd.DragDropMgr.unregAll()},unregAll:function(){if(this.dragCurrent){this.stopDrag();this.dragCurrent=null}this._execOnAll("unreg",[]);for(var B in this.elementCache){delete this.elementCache[B]}this.elementCache={};this.ids={}},elementCache:{},getElWrapper:function(C){var B=this.elementCache[C];if(!B||!B.el){B=this.elementCache[C]=new this.ElementWrapper(Ext.getDom(C))}return B},getElement:function(B){return Ext.getDom(B)},getCss:function(C){var B=Ext.getDom(C);return(B)?B.style:null},ElementWrapper:function(B){this.el=B||null;this.id=this.el&&B.id;this.css=this.el&&B.style},getPosX:function(B){return Ext.lib.Dom.getX(B)},getPosY:function(B){return Ext.lib.Dom.getY(B)},swapNode:function(D,B){if(D.swapNode){D.swapNode(B)}else{var E=B.parentNode;var C=B.nextSibling;if(C==D){E.insertBefore(D,B)}else{if(B==D.nextSibling){E.insertBefore(B,D)}else{D.parentNode.replaceChild(B,D);E.insertBefore(D,C)}}}},getScroll:function(){var D,B,E=document.documentElement,C=document.body;if(E&&(E.scrollTop||E.scrollLeft)){D=E.scrollTop;B=E.scrollLeft}else{if(C){D=C.scrollTop;B=C.scrollLeft}else{}}return{top:D,left:B}},getStyle:function(C,B){return Ext.fly(C).getStyle(B)},getScrollTop:function(){return this.getScroll().top},getScrollLeft:function(){return this.getScroll().left},moveToEl:function(B,D){var C=Ext.lib.Dom.getXY(D);Ext.lib.Dom.setXY(B,C)},numericSort:function(C,B){return(C-B)},_timeoutCount:0,_addListeners:function(){var B=Ext.dd.DDM;if(Ext.lib.Event&&document){B._onLoad()}else{if(B._timeoutCount>2000){}else{setTimeout(B._addListeners,10);if(document&&document.body){B._timeoutCount+=1}}}},handleWasClicked:function(B,D){if(this.isHandle(D,B.id)){return true}else{var C=B.parentNode;while(C){if(this.isHandle(D,C.id)){return true}else{C=C.parentNode}}}return false}}}();Ext.dd.DDM=Ext.dd.DragDropMgr;Ext.dd.DDM._addListeners()}Ext.dd.DD=function(C,A,B){if(C){this.init(C,A,B)}};Ext.extend(Ext.dd.DD,Ext.dd.DragDrop,{scroll:true,autoOffset:function(C,B){var A=C-this.startPageX;var D=B-this.startPageY;this.setDelta(A,D)},setDelta:function(B,A){this.deltaX=B;this.deltaY=A},setDragElPos:function(C,B){var A=this.getDragEl();this.alignElWithMouse(A,C,B)},alignElWithMouse:function(C,G,F){var E=this.getTargetCoord(G,F);var B=C.dom?C:Ext.fly(C,"_dd");if(!this.deltaSetXY){var H=[E.x,E.y];B.setXY(H);var D=B.getLeft(true);var A=B.getTop(true);this.deltaSetXY=[D-E.x,A-E.y]}else{B.setLeftTop(E.x+this.deltaSetXY[0],E.y+this.deltaSetXY[1])}this.cachePosition(E.x,E.y);this.autoScroll(E.x,E.y,C.offsetHeight,C.offsetWidth);return E},cachePosition:function(B,A){if(B){this.lastPageX=B;this.lastPageY=A}else{var C=Ext.lib.Dom.getXY(this.getEl());this.lastPageX=C[0];this.lastPageY=C[1]}},autoScroll:function(J,I,E,K){if(this.scroll){var L=Ext.lib.Dom.getViewHeight();var B=Ext.lib.Dom.getViewWidth();var N=this.DDM.getScrollTop();var D=this.DDM.getScrollLeft();var H=E+I;var M=K+J;var G=(L+N-I-this.deltaY);var F=(B+D-J-this.deltaX);var C=40;var A=(document.all)?80:30;if(H>L&&G<C){window.scrollTo(D,N+A)}if(I<N&&N>0&&I-N<C){window.scrollTo(D,N-A)}if(M>B&&F<C){window.scrollTo(D+A,N)}if(J<D&&D>0&&J-D<C){window.scrollTo(D-A,N)}}},getTargetCoord:function(C,B){var A=C-this.deltaX;var D=B-this.deltaY;if(this.constrainX){if(A<this.minX){A=this.minX}if(A>this.maxX){A=this.maxX}}if(this.constrainY){if(D<this.minY){D=this.minY}if(D>this.maxY){D=this.maxY}}A=this.getTick(A,this.xTicks);D=this.getTick(D,this.yTicks);return{x:A,y:D}},applyConfig:function(){Ext.dd.DD.superclass.applyConfig.call(this);this.scroll=(this.config.scroll!==false)},b4MouseDown:function(A){this.autoOffset(A.getPageX(),A.getPageY())},b4Drag:function(A){this.setDragElPos(A.getPageX(),A.getPageY())},toString:function(){return("DD "+this.id)}});Ext.dd.DDProxy=function(C,A,B){if(C){this.init(C,A,B);this.initFrame()}};Ext.dd.DDProxy.dragElId="ygddfdiv";Ext.extend(Ext.dd.DDProxy,Ext.dd.DD,{resizeFrame:true,centerFrame:false,createFrame:function(){var B=this;var A=document.body;if(!A||!A.firstChild){setTimeout(function(){B.createFrame()},50);return }var D=this.getDragEl();if(!D){D=document.createElement("div");D.id=this.dragElId;var C=D.style;C.position="absolute";C.visibility="hidden";C.cursor="move";C.border="2px solid #aaa";C.zIndex=999;A.insertBefore(D,A.firstChild)}},initFrame:function(){this.createFrame()},applyConfig:function(){Ext.dd.DDProxy.superclass.applyConfig.call(this);this.resizeFrame=(this.config.resizeFrame!==false);this.centerFrame=(this.config.centerFrame);this.setDragElId(this.config.dragElId||Ext.dd.DDProxy.dragElId)},showFrame:function(E,D){var C=this.getEl();var A=this.getDragEl();var B=A.style;this._resizeProxy();if(this.centerFrame){this.setDelta(Math.round(parseInt(B.width,10)/2),Math.round(parseInt(B.height,10)/2))}this.setDragElPos(E,D);Ext.fly(A).show()},_resizeProxy:function(){if(this.resizeFrame){var A=this.getEl();Ext.fly(this.getDragEl()).setSize(A.offsetWidth,A.offsetHeight)}},b4MouseDown:function(B){var A=B.getPageX();var C=B.getPageY();this.autoOffset(A,C);this.setDragElPos(A,C)},b4StartDrag:function(A,B){this.showFrame(A,B)},b4EndDrag:function(A){Ext.fly(this.getDragEl()).hide()},endDrag:function(C){var B=this.getEl();var A=this.getDragEl();A.style.visibility="";this.beforeMove();B.style.visibility="hidden";Ext.dd.DDM.moveToEl(B,A);A.style.visibility="hidden";B.style.visibility="";this.afterDrag()},beforeMove:function(){},afterDrag:function(){},toString:function(){return("DDProxy "+this.id)}});Ext.dd.DDTarget=function(C,A,B){if(C){this.initTarget(C,A,B)}};Ext.extend(Ext.dd.DDTarget,Ext.dd.DragDrop,{toString:function(){return("DDTarget "+this.id)}});
Ext.dd.DragTracker=function(A){Ext.apply(this,A);this.addEvents("mousedown","mouseup","mousemove","dragstart","dragend","drag");this.dragRegion=new Ext.lib.Region(0,0,0,0);if(this.el){this.initEl(this.el)}};Ext.extend(Ext.dd.DragTracker,Ext.util.Observable,{active:false,tolerance:5,autoStart:false,initEl:function(A){this.el=Ext.get(A);A.on("mousedown",this.onMouseDown,this,this.delegate?{delegate:this.delegate}:undefined)},destroy:function(){this.el.un("mousedown",this.onMouseDown,this)},onMouseDown:function(C,B){if(this.fireEvent("mousedown",this,C)!==false&&this.onBeforeStart(C)!==false){this.startXY=this.lastXY=C.getXY();this.dragTarget=this.delegate?B:this.el.dom;C.preventDefault();var A=Ext.getDoc();A.on("mouseup",this.onMouseUp,this);A.on("mousemove",this.onMouseMove,this);A.on("selectstart",this.stopSelect,this);if(this.autoStart){this.timer=this.triggerStart.defer(this.autoStart===true?1000:this.autoStart,this)}}},onMouseMove:function(D,C){D.preventDefault();var B=D.getXY(),A=this.startXY;this.lastXY=B;if(!this.active){if(Math.abs(A[0]-B[0])>this.tolerance||Math.abs(A[1]-B[1])>this.tolerance){this.triggerStart()}else{return }}this.fireEvent("mousemove",this,D);this.onDrag(D);this.fireEvent("drag",this,D)},onMouseUp:function(B){var A=Ext.getDoc();A.un("mousemove",this.onMouseMove,this);A.un("mouseup",this.onMouseUp,this);A.un("selectstart",this.stopSelect,this);B.preventDefault();this.clearStart();this.active=false;delete this.elRegion;this.fireEvent("mouseup",this,B);this.onEnd(B);this.fireEvent("dragend",this,B)},triggerStart:function(A){this.clearStart();this.active=true;this.onStart(this.startXY);this.fireEvent("dragstart",this,this.startXY)},clearStart:function(){if(this.timer){clearTimeout(this.timer);delete this.timer}},stopSelect:function(A){A.stopEvent();return false},onBeforeStart:function(A){},onStart:function(A){},onDrag:function(A){},onEnd:function(A){},getDragTarget:function(){return this.dragTarget},getDragCt:function(){return this.el},getXY:function(A){return A?this.constrainModes[A].call(this,this.lastXY):this.lastXY},getOffset:function(C){var B=this.getXY(C);var A=this.startXY;return[A[0]-B[0],A[1]-B[1]]},constrainModes:{"point":function(B){if(!this.elRegion){this.elRegion=this.getDragCt().getRegion()}var A=this.dragRegion;A.left=B[0];A.top=B[1];A.right=B[0];A.bottom=B[1];A.constrainTo(this.elRegion);return[A.left,A.top]}}});
Ext.dd.ScrollManager=function(){var C=Ext.dd.DragDropMgr;var E={};var B=null;var H={};var G=function(K){B=null;A()};var I=function(){if(C.dragCurrent){C.refreshCache(C.dragCurrent.groups)}};var D=function(){if(C.dragCurrent){var K=Ext.dd.ScrollManager;var L=H.el.ddScrollConfig?H.el.ddScrollConfig.increment:K.increment;if(!K.animate){if(H.el.scroll(H.dir,L)){I()}}else{H.el.scroll(H.dir,L,true,K.animDuration,I)}}};var A=function(){if(H.id){clearInterval(H.id)}H.id=0;H.el=null;H.dir=""};var F=function(L,K){A();H.el=L;H.dir=K;H.id=setInterval(D,Ext.dd.ScrollManager.frequency)};var J=function(N,P){if(P||!C.dragCurrent){return }var Q=Ext.dd.ScrollManager;if(!B||B!=C.dragCurrent){B=C.dragCurrent;Q.refreshCache()}var R=Ext.lib.Event.getXY(N);var S=new Ext.lib.Point(R[0],R[1]);for(var L in E){var M=E[L],K=M._region;var O=M.ddScrollConfig?M.ddScrollConfig:Q;if(K&&K.contains(S)&&M.isScrollable()){if(K.bottom-S.y<=O.vthresh){if(H.el!=M){F(M,"down")}return }else{if(K.right-S.x<=O.hthresh){if(H.el!=M){F(M,"left")}return }else{if(S.y-K.top<=O.vthresh){if(H.el!=M){F(M,"up")}return }else{if(S.x-K.left<=O.hthresh){if(H.el!=M){F(M,"right")}return }}}}}}A()};C.fireEvents=C.fireEvents.createSequence(J,C);C.stopDrag=C.stopDrag.createSequence(G,C);return{register:function(M){if(Ext.isArray(M)){for(var L=0,K=M.length;L<K;L++){this.register(M[L])}}else{M=Ext.get(M);E[M.id]=M}},unregister:function(M){if(Ext.isArray(M)){for(var L=0,K=M.length;L<K;L++){this.unregister(M[L])}}else{M=Ext.get(M);delete E[M.id]}},vthresh:25,hthresh:25,increment:100,frequency:500,animate:true,animDuration:0.4,refreshCache:function(){for(var K in E){if(typeof E[K]=="object"){E[K]._region=E[K].getRegion()}}}}}();
Ext.dd.Registry=function(){var D={};var B={};var A=0;var C=function(F,E){if(typeof F=="string"){return F}var G=F.id;if(!G&&E!==false){G="extdd-"+(++A);F.id=G}return G};return{register:function(H,I){I=I||{};if(typeof H=="string"){H=document.getElementById(H)}I.ddel=H;D[C(H)]=I;if(I.isHandle!==false){B[I.ddel.id]=I}if(I.handles){var G=I.handles;for(var F=0,E=G.length;F<E;F++){B[C(G[F])]=I}}},unregister:function(H){var J=C(H,false);var I=D[J];if(I){delete D[J];if(I.handles){var G=I.handles;for(var F=0,E=G.length;F<E;F++){delete B[C(G[F],false)]}}}},getHandle:function(E){if(typeof E!="string"){E=E.id}return B[E]},getHandleFromEvent:function(F){var E=Ext.lib.Event.getTarget(F);return E?B[E.id]:null},getTarget:function(E){if(typeof E!="string"){E=E.id}return D[E]},getTargetFromEvent:function(F){var E=Ext.lib.Event.getTarget(F);return E?D[E.id]||B[E.id]:null}}}();
Ext.dd.StatusProxy=function(A){Ext.apply(this,A);this.id=this.id||Ext.id();this.el=new Ext.Layer({dh:{id:this.id,tag:"div",cls:"x-dd-drag-proxy "+this.dropNotAllowed,children:[{tag:"div",cls:"x-dd-drop-icon"},{tag:"div",cls:"x-dd-drag-ghost"}]},shadow:!A||A.shadow!==false});this.ghost=Ext.get(this.el.dom.childNodes[1]);this.dropStatus=this.dropNotAllowed};Ext.dd.StatusProxy.prototype={dropAllowed:"x-dd-drop-ok",dropNotAllowed:"x-dd-drop-nodrop",setStatus:function(A){A=A||this.dropNotAllowed;if(this.dropStatus!=A){this.el.replaceClass(this.dropStatus,A);this.dropStatus=A}},reset:function(A){this.el.dom.className="x-dd-drag-proxy "+this.dropNotAllowed;this.dropStatus=this.dropNotAllowed;if(A){this.ghost.update("")}},update:function(A){if(typeof A=="string"){this.ghost.update(A)}else{this.ghost.update("");A.style.margin="0";this.ghost.dom.appendChild(A)}},getEl:function(){return this.el},getGhost:function(){return this.ghost},hide:function(A){this.el.hide();if(A){this.reset(true)}},stop:function(){if(this.anim&&this.anim.isAnimated&&this.anim.isAnimated()){this.anim.stop()}},show:function(){this.el.show()},sync:function(){this.el.sync()},repair:function(B,C,A){this.callback=C;this.scope=A;if(B&&this.animRepair!==false){this.el.addClass("x-dd-drag-repair");this.el.hideUnders(true);this.anim=this.el.shift({duration:this.repairDuration||0.5,easing:"easeOut",xy:B,stopFx:true,callback:this.afterRepair,scope:this})}else{this.afterRepair()}},afterRepair:function(){this.hide(true);if(typeof this.callback=="function"){this.callback.call(this.scope||this)}this.callback=null;this.scope=null}};
Ext.dd.DragSource=function(B,A){this.el=Ext.get(B);if(!this.dragData){this.dragData={}}Ext.apply(this,A);if(!this.proxy){this.proxy=new Ext.dd.StatusProxy()}Ext.dd.DragSource.superclass.constructor.call(this,this.el.dom,this.ddGroup||this.group,{dragElId:this.proxy.id,resizeFrame:false,isTarget:false,scroll:this.scroll===true});this.dragging=false};Ext.extend(Ext.dd.DragSource,Ext.dd.DDProxy,{dropAllowed:"x-dd-drop-ok",dropNotAllowed:"x-dd-drop-nodrop",getDragData:function(A){return this.dragData},onDragEnter:function(C,D){var B=Ext.dd.DragDropMgr.getDDById(D);this.cachedTarget=B;if(this.beforeDragEnter(B,C,D)!==false){if(B.isNotifyTarget){var A=B.notifyEnter(this,C,this.dragData);this.proxy.setStatus(A)}else{this.proxy.setStatus(this.dropAllowed)}if(this.afterDragEnter){this.afterDragEnter(B,C,D)}}},beforeDragEnter:function(B,A,C){return true},alignElWithMouse:function(){Ext.dd.DragSource.superclass.alignElWithMouse.apply(this,arguments);this.proxy.sync()},onDragOver:function(C,D){var B=this.cachedTarget||Ext.dd.DragDropMgr.getDDById(D);if(this.beforeDragOver(B,C,D)!==false){if(B.isNotifyTarget){var A=B.notifyOver(this,C,this.dragData);this.proxy.setStatus(A)}if(this.afterDragOver){this.afterDragOver(B,C,D)}}},beforeDragOver:function(B,A,C){return true},onDragOut:function(B,C){var A=this.cachedTarget||Ext.dd.DragDropMgr.getDDById(C);if(this.beforeDragOut(A,B,C)!==false){if(A.isNotifyTarget){A.notifyOut(this,B,this.dragData)}this.proxy.reset();if(this.afterDragOut){this.afterDragOut(A,B,C)}}this.cachedTarget=null},beforeDragOut:function(B,A,C){return true},onDragDrop:function(B,C){var A=this.cachedTarget||Ext.dd.DragDropMgr.getDDById(C);if(this.beforeDragDrop(A,B,C)!==false){if(A.isNotifyTarget){if(A.notifyDrop(this,B,this.dragData)){this.onValidDrop(A,B,C)}else{this.onInvalidDrop(A,B,C)}}else{this.onValidDrop(A,B,C)}if(this.afterDragDrop){this.afterDragDrop(A,B,C)}}delete this.cachedTarget},beforeDragDrop:function(B,A,C){return true},onValidDrop:function(B,A,C){this.hideProxy();if(this.afterValidDrop){this.afterValidDrop(B,A,C)}},getRepairXY:function(B,A){return this.el.getXY()},onInvalidDrop:function(B,A,C){this.beforeInvalidDrop(B,A,C);if(this.cachedTarget){if(this.cachedTarget.isNotifyTarget){this.cachedTarget.notifyOut(this,A,this.dragData)}this.cacheTarget=null}this.proxy.repair(this.getRepairXY(A,this.dragData),this.afterRepair,this);if(this.afterInvalidDrop){this.afterInvalidDrop(A,C)}},afterRepair:function(){if(Ext.enableFx){this.el.highlight(this.hlColor||"c3daf9")}this.dragging=false},beforeInvalidDrop:function(B,A,C){return true},handleMouseDown:function(B){if(this.dragging){return }var A=this.getDragData(B);if(A&&this.onBeforeDrag(A,B)!==false){this.dragData=A;this.proxy.stop();Ext.dd.DragSource.superclass.handleMouseDown.apply(this,arguments)}},onBeforeDrag:function(A,B){return true},onStartDrag:Ext.emptyFn,startDrag:function(A,B){this.proxy.reset();this.dragging=true;this.proxy.update("");this.onInitDrag(A,B);this.proxy.show()},onInitDrag:function(A,C){var B=this.el.dom.cloneNode(true);B.id=Ext.id();this.proxy.update(B);this.onStartDrag(A,C);return true},getProxy:function(){return this.proxy},hideProxy:function(){this.proxy.hide();this.proxy.reset(true);this.dragging=false},triggerCacheRefresh:function(){Ext.dd.DDM.refreshCache(this.groups)},b4EndDrag:function(A){},endDrag:function(A){this.onEndDrag(this.dragData,A)},onEndDrag:function(A,B){},autoOffset:function(A,B){this.setDelta(-12,-20)}});
Ext.dd.DropTarget=function(B,A){this.el=Ext.get(B);Ext.apply(this,A);if(this.containerScroll){Ext.dd.ScrollManager.register(this.el)}Ext.dd.DropTarget.superclass.constructor.call(this,this.el.dom,this.ddGroup||this.group,{isTarget:true})};Ext.extend(Ext.dd.DropTarget,Ext.dd.DDTarget,{dropAllowed:"x-dd-drop-ok",dropNotAllowed:"x-dd-drop-nodrop",isTarget:true,isNotifyTarget:true,notifyEnter:function(A,C,B){if(this.overClass){this.el.addClass(this.overClass)}return this.dropAllowed},notifyOver:function(A,C,B){return this.dropAllowed},notifyOut:function(A,C,B){if(this.overClass){this.el.removeClass(this.overClass)}},notifyDrop:function(A,C,B){return false}});
Ext.dd.DragZone=function(B,A){Ext.dd.DragZone.superclass.constructor.call(this,B,A);if(this.containerScroll){Ext.dd.ScrollManager.register(this.el)}};Ext.extend(Ext.dd.DragZone,Ext.dd.DragSource,{getDragData:function(A){return Ext.dd.Registry.getHandleFromEvent(A)},onInitDrag:function(A,B){this.proxy.update(this.dragData.ddel.cloneNode(true));this.onStartDrag(A,B);return true},afterRepair:function(){if(Ext.enableFx){Ext.Element.fly(this.dragData.ddel).highlight(this.hlColor||"c3daf9")}this.dragging=false},getRepairXY:function(A){return Ext.Element.fly(this.dragData.ddel).getXY()}});
Ext.dd.DropZone=function(B,A){Ext.dd.DropZone.superclass.constructor.call(this,B,A)};Ext.extend(Ext.dd.DropZone,Ext.dd.DropTarget,{getTargetFromEvent:function(A){return Ext.dd.Registry.getTargetFromEvent(A)},onNodeEnter:function(D,A,C,B){},onNodeOver:function(D,A,C,B){return this.dropAllowed},onNodeOut:function(D,A,C,B){},onNodeDrop:function(D,A,C,B){return false},onContainerOver:function(A,C,B){return this.dropNotAllowed},onContainerDrop:function(A,C,B){return false},notifyEnter:function(A,C,B){return this.dropNotAllowed},notifyOver:function(A,C,B){var D=this.getTargetFromEvent(C);if(!D){if(this.lastOverNode){this.onNodeOut(this.lastOverNode,A,C,B);this.lastOverNode=null}return this.onContainerOver(A,C,B)}if(this.lastOverNode!=D){if(this.lastOverNode){this.onNodeOut(this.lastOverNode,A,C,B)}this.onNodeEnter(D,A,C,B);this.lastOverNode=D}return this.onNodeOver(D,A,C,B)},notifyOut:function(A,C,B){if(this.lastOverNode){this.onNodeOut(this.lastOverNode,A,C,B);this.lastOverNode=null}},notifyDrop:function(A,C,B){if(this.lastOverNode){this.onNodeOut(this.lastOverNode,A,C,B);this.lastOverNode=null}var D=this.getTargetFromEvent(C);return D?this.onNodeDrop(D,A,C,B):this.onContainerDrop(A,C,B)},triggerCacheRefresh:function(){Ext.dd.DDM.refreshCache(this.groups)}});
Ext.data.SortTypes={none:function(A){return A},stripTagsRE:/<\/?[^>]+>/gi,asText:function(A){return String(A).replace(this.stripTagsRE,"")},asUCText:function(A){return String(A).toUpperCase().replace(this.stripTagsRE,"")},asUCString:function(A){return String(A).toUpperCase()},asDate:function(A){if(!A){return 0}if(Ext.isDate(A)){return A.getTime()}return Date.parse(String(A))},asFloat:function(A){var B=parseFloat(String(A).replace(/,/g,""));if(isNaN(B)){B=0}return B},asInt:function(A){var B=parseInt(String(A).replace(/,/g,""));if(isNaN(B)){B=0}return B}};
Ext.data.Record=function(A,B){this.id=(B||B===0)?B:++Ext.data.Record.AUTO_ID;this.data=A};Ext.data.Record.create=function(E){var C=Ext.extend(Ext.data.Record,{});var D=C.prototype;D.fields=new Ext.util.MixedCollection(false,function(F){return F.name});for(var B=0,A=E.length;B<A;B++){D.fields.add(new Ext.data.Field(E[B]))}C.getField=function(F){return D.fields.get(F)};return C};Ext.data.Record.AUTO_ID=1000;Ext.data.Record.EDIT="edit";Ext.data.Record.REJECT="reject";Ext.data.Record.COMMIT="commit";Ext.data.Record.prototype={dirty:false,editing:false,error:null,modified:null,join:function(A){this.store=A},set:function(A,B){if(String(this.data[A])==String(B)){return }this.dirty=true;if(!this.modified){this.modified={}}if(typeof this.modified[A]=="undefined"){this.modified[A]=this.data[A]}this.data[A]=B;if(!this.editing&&this.store){this.store.afterEdit(this)}},get:function(A){return this.data[A]},beginEdit:function(){this.editing=true;this.modified={}},cancelEdit:function(){this.editing=false;delete this.modified},endEdit:function(){this.editing=false;if(this.dirty&&this.store){this.store.afterEdit(this)}},reject:function(B){var A=this.modified;for(var C in A){if(typeof A[C]!="function"){this.data[C]=A[C]}}this.dirty=false;delete this.modified;this.editing=false;if(this.store&&B!==true){this.store.afterReject(this)}},commit:function(A){this.dirty=false;delete this.modified;this.editing=false;if(this.store&&A!==true){this.store.afterCommit(this)}},getChanges:function(){var A=this.modified,B={};for(var C in A){if(A.hasOwnProperty(C)){B[C]=this.data[C]}}return B},hasError:function(){return this.error!=null},clearError:function(){this.error=null},copy:function(A){return new this.constructor(Ext.apply({},this.data),A||this.id)},isModified:function(A){return this.modified&&this.modified.hasOwnProperty(A)}};
Ext.StoreMgr=Ext.apply(new Ext.util.MixedCollection(),{register:function(){for(var A=0,B;B=arguments[A];A++){this.add(B)}},unregister:function(){for(var A=0,B;B=arguments[A];A++){this.remove(this.lookup(B))}},lookup:function(A){return typeof A=="object"?A:this.get(A)},getKey:function(A){return A.storeId||A.id}});
Ext.data.Store=function(A){this.data=new Ext.util.MixedCollection(false);this.data.getKey=function(B){return B.id};this.baseParams={};this.paramNames={"start":"start","limit":"limit","sort":"sort","dir":"dir"};if(A&&A.data){this.inlineData=A.data;delete A.data}Ext.apply(this,A);if(this.url&&!this.proxy){this.proxy=new Ext.data.HttpProxy({url:this.url})}if(this.reader){if(!this.recordType){this.recordType=this.reader.recordType}if(this.reader.onMetaChange){this.reader.onMetaChange=this.onMetaChange.createDelegate(this)}}if(this.recordType){this.fields=this.recordType.prototype.fields}this.modified=[];this.addEvents("datachanged","metachange","add","remove","update","clear","beforeload","load","loadexception");if(this.proxy){this.relayEvents(this.proxy,["loadexception"])}this.sortToggle={};if(this.sortInfo){this.setDefaultSort(this.sortInfo.field,this.sortInfo.direction)}Ext.data.Store.superclass.constructor.call(this);if(this.storeId||this.id){Ext.StoreMgr.register(this)}if(this.inlineData){this.loadData(this.inlineData);delete this.inlineData}else{if(this.autoLoad){this.load.defer(10,this,[typeof this.autoLoad=="object"?this.autoLoad:undefined])}}};Ext.extend(Ext.data.Store,Ext.util.Observable,{remoteSort:false,pruneModifiedRecords:false,lastOptions:null,destroy:function(){if(this.id){Ext.StoreMgr.unregister(this)}this.data=null;this.purgeListeners()},add:function(B){B=[].concat(B);if(B.length<1){return }for(var D=0,A=B.length;D<A;D++){B[D].join(this)}var C=this.data.length;this.data.addAll(B);if(this.snapshot){this.snapshot.addAll(B)}this.fireEvent("add",this,B,C)},addSorted:function(A){var B=this.findInsertIndex(A);this.insert(B,A)},remove:function(A){var B=this.data.indexOf(A);this.data.removeAt(B);if(this.pruneModifiedRecords){this.modified.remove(A)}if(this.snapshot){this.snapshot.remove(A)}this.fireEvent("remove",this,A,B)},removeAll:function(){this.data.clear();if(this.snapshot){this.snapshot.clear()}if(this.pruneModifiedRecords){this.modified=[]}this.fireEvent("clear",this)},insert:function(C,B){B=[].concat(B);for(var D=0,A=B.length;D<A;D++){this.data.insert(C,B[D]);B[D].join(this)}this.fireEvent("add",this,B,C)},indexOf:function(A){return this.data.indexOf(A)},indexOfId:function(A){return this.data.indexOfKey(A)},getById:function(A){return this.data.key(A)},getAt:function(A){return this.data.itemAt(A)},getRange:function(B,A){return this.data.getRange(B,A)},storeOptions:function(A){A=Ext.apply({},A);delete A.callback;delete A.scope;this.lastOptions=A},load:function(B){B=B||{};if(this.fireEvent("beforeload",this,B)!==false){this.storeOptions(B);var C=Ext.apply(B.params||{},this.baseParams);if(this.sortInfo&&this.remoteSort){var A=this.paramNames;C[A["sort"]]=this.sortInfo.field;C[A["dir"]]=this.sortInfo.direction}this.proxy.load(C,this.reader,this.loadRecords,this,B);return true}else{return false}},reload:function(A){this.load(Ext.applyIf(A||{},this.lastOptions))},loadRecords:function(G,B,F){if(!G||F===false){if(F!==false){this.fireEvent("load",this,[],B)}if(B.callback){B.callback.call(B.scope||this,[],B,false)}return }var E=G.records,D=G.totalRecords||E.length;if(!B||B.add!==true){if(this.pruneModifiedRecords){this.modified=[]}for(var C=0,A=E.length;C<A;C++){E[C].join(this)}if(this.snapshot){this.data=this.snapshot;delete this.snapshot}this.data.clear();this.data.addAll(E);this.totalLength=D;this.applySort();this.fireEvent("datachanged",this)}else{this.totalLength=Math.max(D,this.data.length+E.length);this.add(E)}this.fireEvent("load",this,E,B);if(B.callback){B.callback.call(B.scope||this,E,B,true)}},loadData:function(C,A){var B=this.reader.readRecords(C);this.loadRecords(B,{add:A},true)},getCount:function(){return this.data.length||0},getTotalCount:function(){return this.totalLength||0},getSortState:function(){return this.sortInfo},applySort:function(){if(this.sortInfo&&!this.remoteSort){var A=this.sortInfo,B=A.field;this.sortData(B,A.direction)}},sortData:function(C,D){D=D||"ASC";var A=this.fields.get(C).sortType;var B=function(F,E){var H=A(F.data[C]),G=A(E.data[C]);return H>G?1:(H<G?-1:0)};this.data.sort(D,B);if(this.snapshot&&this.snapshot!=this.data){this.snapshot.sort(D,B)}},setDefaultSort:function(B,A){A=A?A.toUpperCase():"ASC";this.sortInfo={field:B,direction:A};this.sortToggle[B]=A},sort:function(E,C){var D=this.fields.get(E);if(!D){return false}if(!C){if(this.sortInfo&&this.sortInfo.field==D.name){C=(this.sortToggle[D.name]||"ASC").toggle("ASC","DESC")}else{C=D.sortDir}}var B=(this.sortToggle)?this.sortToggle[D.name]:null;var A=(this.sortInfo)?this.sortInfo:null;this.sortToggle[D.name]=C;this.sortInfo={field:D.name,direction:C};if(!this.remoteSort){this.applySort();this.fireEvent("datachanged",this)}else{if(!this.load(this.lastOptions)){if(B){this.sortToggle[D.name]=B}if(A){this.sortInfo=A}}}},each:function(B,A){this.data.each(B,A)},getModifiedRecords:function(){return this.modified},createFilterFn:function(C,B,D,A){if(Ext.isEmpty(B,false)){return false}B=this.data.createValueMatcher(B,D,A);return function(E){return B.test(E.data[C])}},sum:function(E,F,A){var C=this.data.items,B=0;F=F||0;A=(A||A===0)?A:C.length-1;for(var D=F;D<=A;D++){B+=(C[D].data[E]||0)}return B},filter:function(D,C,E,A){var B=this.createFilterFn(D,C,E,A);return B?this.filterBy(B):this.clearFilter()},filterBy:function(B,A){this.snapshot=this.snapshot||this.data;this.data=this.queryBy(B,A||this);this.fireEvent("datachanged",this)},query:function(D,C,E,A){var B=this.createFilterFn(D,C,E,A);return B?this.queryBy(B):this.data.clone()},queryBy:function(B,A){var C=this.snapshot||this.data;return C.filterBy(B,A||this)},find:function(D,C,F,E,A){var B=this.createFilterFn(D,C,E,A);return B?this.data.findIndexBy(B,null,F):-1},findBy:function(B,A,C){return this.data.findIndexBy(B,A,C)},collect:function(G,H,B){var F=(B===true&&this.snapshot)?this.snapshot.items:this.data.items;var I,J,A=[],C={};for(var D=0,E=F.length;D<E;D++){I=F[D].data[G];J=String(I);if((H||!Ext.isEmpty(I))&&!C[J]){C[J]=true;A[A.length]=I}}return A},clearFilter:function(A){if(this.isFiltered()){this.data=this.snapshot;delete this.snapshot;if(A!==true){this.fireEvent("datachanged",this)}}},isFiltered:function(){return this.snapshot&&this.snapshot!=this.data},afterEdit:function(A){if(this.modified.indexOf(A)==-1){this.modified.push(A)}this.fireEvent("update",this,A,Ext.data.Record.EDIT)},afterReject:function(A){this.modified.remove(A);this.fireEvent("update",this,A,Ext.data.Record.REJECT)},afterCommit:function(A){this.modified.remove(A);this.fireEvent("update",this,A,Ext.data.Record.COMMIT)},commitChanges:function(){var B=this.modified.slice(0);this.modified=[];for(var C=0,A=B.length;C<A;C++){B[C].commit()}},rejectChanges:function(){var B=this.modified.slice(0);this.modified=[];for(var C=0,A=B.length;C<A;C++){B[C].reject()}},onMetaChange:function(B,A,C){this.recordType=A;this.fields=A.prototype.fields;delete this.snapshot;this.sortInfo=B.sortInfo;this.modified=[];this.fireEvent("metachange",this,this.reader.meta)},findInsertIndex:function(A){this.suspendEvents();var C=this.data.clone();this.data.add(A);this.applySort();var B=this.data.indexOf(A);this.data=C;this.resumeEvents();return B}});
Ext.data.SimpleStore=function(A){Ext.data.SimpleStore.superclass.constructor.call(this,Ext.apply(A,{reader:new Ext.data.ArrayReader({id:A.id},Ext.data.Record.create(A.fields))}))};Ext.extend(Ext.data.SimpleStore,Ext.data.Store,{loadData:function(E,B){if(this.expandData===true){var D=[];for(var C=0,A=E.length;C<A;C++){D[D.length]=[E[C]]}E=D}Ext.data.SimpleStore.superclass.loadData.call(this,E,B)}});
Ext.data.JsonStore=function(A){Ext.data.JsonStore.superclass.constructor.call(this,Ext.apply(A,{proxy:!A.data?new Ext.data.HttpProxy({url:A.url}):undefined,reader:new Ext.data.JsonReader(A,A.fields)}))};Ext.extend(Ext.data.JsonStore,Ext.data.Store);
Ext.data.Field=function(D){if(typeof D=="string"){D={name:D}}Ext.apply(this,D);if(!this.type){this.type="auto"}var C=Ext.data.SortTypes;if(typeof this.sortType=="string"){this.sortType=C[this.sortType]}if(!this.sortType){switch(this.type){case"string":this.sortType=C.asUCString;break;case"date":this.sortType=C.asDate;break;default:this.sortType=C.none}}var E=/[\$,%]/g;if(!this.convert){var B,A=this.dateFormat;switch(this.type){case"":case"auto":case undefined:B=function(F){return F};break;case"string":B=function(F){return(F===undefined||F===null)?"":String(F)};break;case"int":B=function(F){return F!==undefined&&F!==null&&F!==""?parseInt(String(F).replace(E,""),10):""};break;case"float":B=function(F){return F!==undefined&&F!==null&&F!==""?parseFloat(String(F).replace(E,""),10):""};break;case"bool":case"boolean":B=function(F){return F===true||F==="true"||F==1};break;case"date":B=function(G){if(!G){return""}if(Ext.isDate(G)){return G}if(A){if(A=="timestamp"){return new Date(G*1000)}if(A=="time"){return new Date(parseInt(G,10))}return Date.parseDate(G,A)}var F=Date.parse(G);return F?new Date(F):null};break}this.convert=B}};Ext.data.Field.prototype={dateFormat:null,defaultValue:"",mapping:null,sortType:null,sortDir:"ASC"};
Ext.data.DataReader=function(A,B){this.meta=A;this.recordType=Ext.isArray(B)?Ext.data.Record.create(B):B};Ext.data.DataReader.prototype={};
Ext.data.DataProxy=function(){this.addEvents("beforeload","load","loadexception");Ext.data.DataProxy.superclass.constructor.call(this)};Ext.extend(Ext.data.DataProxy,Ext.util.Observable);
Ext.data.MemoryProxy=function(A){Ext.data.MemoryProxy.superclass.constructor.call(this);this.data=A};Ext.extend(Ext.data.MemoryProxy,Ext.data.DataProxy,{load:function(F,C,G,D,B){F=F||{};var A;try{A=C.readRecords(this.data)}catch(E){this.fireEvent("loadexception",this,B,null,E);G.call(D,null,B,false);return }G.call(D,A,B,true)},update:function(B,A){}});
Ext.data.HttpProxy=function(A){Ext.data.HttpProxy.superclass.constructor.call(this);this.conn=A;this.useAjax=!A||!A.events};Ext.extend(Ext.data.HttpProxy,Ext.data.DataProxy,{getConnection:function(){return this.useAjax?Ext.Ajax:this.conn},load:function(E,B,F,C,A){if(this.fireEvent("beforeload",this,E)!==false){var D={params:E||{},request:{callback:F,scope:C,arg:A},reader:B,callback:this.loadResponse,scope:this};if(this.useAjax){Ext.applyIf(D,this.conn);if(this.activeRequest){Ext.Ajax.abort(this.activeRequest)}this.activeRequest=Ext.Ajax.request(D)}else{this.conn.request(D)}}else{F.call(C||this,null,A,false)}},loadResponse:function(E,D,B){delete this.activeRequest;if(!D){this.fireEvent("loadexception",this,E,B);E.request.callback.call(E.request.scope,null,E.request.arg,false);return }var A;try{A=E.reader.read(B)}catch(C){this.fireEvent("loadexception",this,E,B,C);E.request.callback.call(E.request.scope,null,E.request.arg,false);return }this.fireEvent("load",this,E,E.request.arg);E.request.callback.call(E.request.scope,A,E.request.arg,true)},update:function(A){},updateResponse:function(A){}});
Ext.data.ScriptTagProxy=function(A){Ext.data.ScriptTagProxy.superclass.constructor.call(this);Ext.apply(this,A);this.head=document.getElementsByTagName("head")[0]};Ext.data.ScriptTagProxy.TRANS_ID=1000;Ext.extend(Ext.data.ScriptTagProxy,Ext.data.DataProxy,{timeout:30000,callbackParam:"callback",nocache:true,load:function(E,F,H,I,J){if(this.fireEvent("beforeload",this,E)!==false){var C=Ext.urlEncode(Ext.apply(E,this.extraParams));var B=this.url;B+=(B.indexOf("?")!=-1?"&":"?")+C;if(this.nocache){B+="&_dc="+(new Date().getTime())}var A=++Ext.data.ScriptTagProxy.TRANS_ID;var K={id:A,cb:"stcCallback"+A,scriptId:"stcScript"+A,params:E,arg:J,url:B,callback:H,scope:I,reader:F};var D=this;window[K.cb]=function(L){D.handleResponse(L,K)};B+=String.format("&{0}={1}",this.callbackParam,K.cb);if(this.autoAbort!==false){this.abort()}K.timeoutId=this.handleFailure.defer(this.timeout,this,[K]);var G=document.createElement("script");G.setAttribute("src",B);G.setAttribute("type","text/javascript");G.setAttribute("id",K.scriptId);this.head.appendChild(G);this.trans=K}else{H.call(I||this,null,J,false)}},isLoading:function(){return this.trans?true:false},abort:function(){if(this.isLoading()){this.destroyTrans(this.trans)}},destroyTrans:function(B,A){this.head.removeChild(document.getElementById(B.scriptId));clearTimeout(B.timeoutId);if(A){window[B.cb]=undefined;try{delete window[B.cb]}catch(C){}}else{window[B.cb]=function(){window[B.cb]=undefined;try{delete window[B.cb]}catch(D){}}}},handleResponse:function(D,B){this.trans=false;this.destroyTrans(B,true);var A;try{A=B.reader.readRecords(D)}catch(C){this.fireEvent("loadexception",this,D,B.arg,C);B.callback.call(B.scope||window,null,B.arg,false);return }this.fireEvent("load",this,D,B.arg);B.callback.call(B.scope||window,A,B.arg,true)},handleFailure:function(A){this.trans=false;this.destroyTrans(A,false);this.fireEvent("loadexception",this,null,A.arg);A.callback.call(A.scope||window,null,A.arg,false)}});
Ext.data.JsonReader=function(A,B){A=A||{};Ext.data.JsonReader.superclass.constructor.call(this,A,B||A.fields)};Ext.extend(Ext.data.JsonReader,Ext.data.DataReader,{read:function(response){var json=response.responseText;var o=eval("("+json+")");if(!o){throw {message:"JsonReader.read: Json object not found"}}if(o.metaData){delete this.ef;this.meta=o.metaData;this.recordType=Ext.data.Record.create(o.metaData.fields);this.onMetaChange(this.meta,this.recordType,o)}return this.readRecords(o)},onMetaChange:function(A,C,B){},simpleAccess:function(B,A){return B[A]},getJsonAccessor:function(){var A=/[\[\.]/;return function(C){try{return(A.test(C))?new Function("obj","return obj."+C):function(D){return D[C]}}catch(B){}return Ext.emptyFn}}(),readRecords:function(K){this.jsonData=K;var H=this.meta,A=this.recordType,R=A.prototype.fields,F=R.items,E=R.length;if(!this.ef){if(H.totalProperty){this.getTotal=this.getJsonAccessor(H.totalProperty)}if(H.successProperty){this.getSuccess=this.getJsonAccessor(H.successProperty)}this.getRoot=H.root?this.getJsonAccessor(H.root):function(U){return U};if(H.id){var Q=this.getJsonAccessor(H.id);this.getId=function(V){var U=Q(V);return(U===undefined||U==="")?null:U}}else{this.getId=function(){return null}}this.ef=[];for(var O=0;O<E;O++){R=F[O];var T=(R.mapping!==undefined&&R.mapping!==null)?R.mapping:R.name;this.ef[O]=this.getJsonAccessor(T)}}var M=this.getRoot(K),S=M.length,I=S,D=true;if(H.totalProperty){var G=parseInt(this.getTotal(K),10);if(!isNaN(G)){I=G}}if(H.successProperty){var G=this.getSuccess(K);if(G===false||G==="false"){D=false}}var P=[];for(var O=0;O<S;O++){var L=M[O];var B={};var J=this.getId(L);for(var N=0;N<E;N++){R=F[N];var G=this.ef[N](L);B[R.name]=R.convert((G!==undefined)?G:R.defaultValue,L)}var C=new A(B,J);C.json=L;P[O]=C}return{success:D,records:P,totalRecords:I}}});
Ext.data.XmlReader=function(A,B){A=A||{};Ext.data.XmlReader.superclass.constructor.call(this,A,B||A.fields)};Ext.extend(Ext.data.XmlReader,Ext.data.DataReader,{read:function(A){var B=A.responseXML;if(!B){throw {message:"XmlReader.read: XML Document not available"}}return this.readRecords(B)},readRecords:function(T){this.xmlData=T;var N=T.documentElement||T;var I=Ext.DomQuery;var B=this.recordType,L=B.prototype.fields;var D=this.meta.id;var G=0,E=true;if(this.meta.totalRecords){G=I.selectNumber(this.meta.totalRecords,N,0)}if(this.meta.success){var K=I.selectValue(this.meta.success,N,true);E=K!==false&&K!=="false"}var Q=[];var U=I.select(this.meta.record,N);for(var P=0,R=U.length;P<R;P++){var M=U[P];var A={};var J=D?I.selectValue(D,M):undefined;for(var O=0,H=L.length;O<H;O++){var S=L.items[O];var F=I.selectValue(S.mapping||S.name,M,S.defaultValue);F=S.convert(F,M);A[S.name]=F}var C=new B(A,J);C.node=M;Q[Q.length]=C}return{success:E,records:Q,totalRecords:G||Q.length}}});
Ext.data.ArrayReader=Ext.extend(Ext.data.JsonReader,{readRecords:function(C){var B=this.meta?this.meta.id:null;var G=this.recordType,K=G.prototype.fields;var E=[];var M=C;for(var I=0;I<M.length;I++){var D=M[I];var O={};var A=((B||B===0)&&D[B]!==undefined&&D[B]!==""?D[B]:null);for(var H=0,P=K.length;H<P;H++){var L=K.items[H];var F=L.mapping!==undefined&&L.mapping!==null?L.mapping:H;var N=D[F]!==undefined?D[F]:L.defaultValue;N=L.convert(N,D);O[L.name]=N}var J=new G(O,A);J.json=D;E[E.length]=J}return{records:E,totalRecords:E.length}}});
Ext.data.Tree=function(A){this.nodeHash={};this.root=null;if(A){this.setRootNode(A)}this.addEvents("append","remove","move","insert","beforeappend","beforeremove","beforemove","beforeinsert");Ext.data.Tree.superclass.constructor.call(this)};Ext.extend(Ext.data.Tree,Ext.util.Observable,{pathSeparator:"/",proxyNodeEvent:function(){return this.fireEvent.apply(this,arguments)},getRootNode:function(){return this.root},setRootNode:function(A){this.root=A;A.ownerTree=this;A.isRoot=true;this.registerNode(A);return A},getNodeById:function(A){return this.nodeHash[A]},registerNode:function(A){this.nodeHash[A.id]=A},unregisterNode:function(A){delete this.nodeHash[A.id]},toString:function(){return"[Tree"+(this.id?" "+this.id:"")+"]"}});Ext.data.Node=function(A){this.attributes=A||{};this.leaf=this.attributes.leaf;this.id=this.attributes.id;if(!this.id){this.id=Ext.id(null,"ynode-");this.attributes.id=this.id}this.childNodes=[];if(!this.childNodes.indexOf){this.childNodes.indexOf=function(D){for(var C=0,B=this.length;C<B;C++){if(this[C]==D){return C}}return -1}}this.parentNode=null;this.firstChild=null;this.lastChild=null;this.previousSibling=null;this.nextSibling=null;this.addEvents({"append":true,"remove":true,"move":true,"insert":true,"beforeappend":true,"beforeremove":true,"beforemove":true,"beforeinsert":true});this.listeners=this.attributes.listeners;Ext.data.Node.superclass.constructor.call(this)};Ext.extend(Ext.data.Node,Ext.util.Observable,{fireEvent:function(B){if(Ext.data.Node.superclass.fireEvent.apply(this,arguments)===false){return false}var A=this.getOwnerTree();if(A){if(A.proxyNodeEvent.apply(A,arguments)===false){return false}}return true},isLeaf:function(){return this.leaf===true},setFirstChild:function(A){this.firstChild=A},setLastChild:function(A){this.lastChild=A},isLast:function(){return(!this.parentNode?true:this.parentNode.lastChild==this)},isFirst:function(){return(!this.parentNode?true:this.parentNode.firstChild==this)},hasChildNodes:function(){return !this.isLeaf()&&this.childNodes.length>0},appendChild:function(E){var F=false;if(Ext.isArray(E)){F=E}else{if(arguments.length>1){F=arguments}}if(F){for(var D=0,A=F.length;D<A;D++){this.appendChild(F[D])}}else{if(this.fireEvent("beforeappend",this.ownerTree,this,E)===false){return false}var B=this.childNodes.length;var C=E.parentNode;if(C){if(E.fireEvent("beforemove",E.getOwnerTree(),E,C,this,B)===false){return false}C.removeChild(E)}B=this.childNodes.length;if(B==0){this.setFirstChild(E)}this.childNodes.push(E);E.parentNode=this;var G=this.childNodes[B-1];if(G){E.previousSibling=G;G.nextSibling=E}else{E.previousSibling=null}E.nextSibling=null;this.setLastChild(E);E.setOwnerTree(this.getOwnerTree());this.fireEvent("append",this.ownerTree,this,E,B);if(C){E.fireEvent("move",this.ownerTree,E,C,this,B)}return E}},removeChild:function(B){var A=this.childNodes.indexOf(B);if(A==-1){return false}if(this.fireEvent("beforeremove",this.ownerTree,this,B)===false){return false}this.childNodes.splice(A,1);if(B.previousSibling){B.previousSibling.nextSibling=B.nextSibling}if(B.nextSibling){B.nextSibling.previousSibling=B.previousSibling}if(this.firstChild==B){this.setFirstChild(B.nextSibling)}if(this.lastChild==B){this.setLastChild(B.previousSibling)}B.setOwnerTree(null);B.parentNode=null;B.previousSibling=null;B.nextSibling=null;this.fireEvent("remove",this.ownerTree,this,B);return B},insertBefore:function(D,A){if(!A){return this.appendChild(D)}if(D==A){return false}if(this.fireEvent("beforeinsert",this.ownerTree,this,D,A)===false){return false}var B=this.childNodes.indexOf(A);var C=D.parentNode;var E=B;if(C==this&&this.childNodes.indexOf(D)<B){E--}if(C){if(D.fireEvent("beforemove",D.getOwnerTree(),D,C,this,B,A)===false){return false}C.removeChild(D)}if(E==0){this.setFirstChild(D)}this.childNodes.splice(E,0,D);D.parentNode=this;var F=this.childNodes[E-1];if(F){D.previousSibling=F;F.nextSibling=D}else{D.previousSibling=null}D.nextSibling=A;A.previousSibling=D;D.setOwnerTree(this.getOwnerTree());this.fireEvent("insert",this.ownerTree,this,D,A);if(C){D.fireEvent("move",this.ownerTree,D,C,this,E,A)}return D},remove:function(){this.parentNode.removeChild(this);return this},item:function(A){return this.childNodes[A]},replaceChild:function(A,B){this.insertBefore(A,B);this.removeChild(B);return B},indexOf:function(A){return this.childNodes.indexOf(A)},getOwnerTree:function(){if(!this.ownerTree){var A=this;while(A){if(A.ownerTree){this.ownerTree=A.ownerTree;break}A=A.parentNode}}return this.ownerTree},getDepth:function(){var B=0;var A=this;while(A.parentNode){++B;A=A.parentNode}return B},setOwnerTree:function(B){if(B!=this.ownerTree){if(this.ownerTree){this.ownerTree.unregisterNode(this)}this.ownerTree=B;var D=this.childNodes;for(var C=0,A=D.length;C<A;C++){D[C].setOwnerTree(B)}if(B){B.registerNode(this)}}},getPath:function(B){B=B||"id";var D=this.parentNode;var A=[this.attributes[B]];while(D){A.unshift(D.attributes[B]);D=D.parentNode}var C=this.getOwnerTree().pathSeparator;return C+A.join(C)},bubble:function(C,B,A){var D=this;while(D){if(C.apply(B||D,A||[D])===false){break}D=D.parentNode}},cascade:function(F,E,B){if(F.apply(E||this,B||[this])!==false){var D=this.childNodes;for(var C=0,A=D.length;C<A;C++){D[C].cascade(F,E,B)}}},eachChild:function(F,E,B){var D=this.childNodes;for(var C=0,A=D.length;C<A;C++){if(F.apply(E||this,B||[D[C]])===false){break}}},findChild:function(D,E){var C=this.childNodes;for(var B=0,A=C.length;B<A;B++){if(C[B].attributes[D]==E){return C[B]}}return null},findChildBy:function(E,D){var C=this.childNodes;for(var B=0,A=C.length;B<A;B++){if(E.call(D||C[B],C[B])===true){return C[B]}}return null},sort:function(E,D){var C=this.childNodes;var A=C.length;if(A>0){var F=D?function(){E.apply(D,arguments)}:E;C.sort(F);for(var B=0;B<A;B++){var G=C[B];G.previousSibling=C[B-1];G.nextSibling=C[B+1];if(B==0){this.setFirstChild(G)}if(B==A-1){this.setLastChild(G)}}}},contains:function(A){return A.isAncestor(this)},isAncestor:function(A){var B=this.parentNode;while(B){if(B==A){return true}B=B.parentNode}return false},toString:function(){return"[Node"+(this.id?" "+this.id:"")+"]"}});
Ext.data.GroupingStore=Ext.extend(Ext.data.Store,{remoteGroup:false,groupOnSort:false,clearGrouping:function(){this.groupField=false;if(this.remoteGroup){if(this.baseParams){delete this.baseParams.groupBy}this.reload()}else{this.applySort();this.fireEvent("datachanged",this)}},groupBy:function(C,B){if(this.groupField==C&&!B){return }this.groupField=C;if(this.remoteGroup){if(!this.baseParams){this.baseParams={}}this.baseParams["groupBy"]=C}if(this.groupOnSort){this.sort(C);return }if(this.remoteGroup){this.reload()}else{var A=this.sortInfo||{};if(A.field!=C){this.applySort()}else{this.sortData(C)}this.fireEvent("datachanged",this)}},applySort:function(){Ext.data.GroupingStore.superclass.applySort.call(this);if(!this.groupOnSort&&!this.remoteGroup){var A=this.getGroupState();if(A&&A!=this.sortInfo.field){this.sortData(this.groupField)}}},applyGrouping:function(A){if(this.groupField!==false){this.groupBy(this.groupField,true);return true}else{if(A===true){this.fireEvent("datachanged",this)}return false}},getGroupState:function(){return this.groupOnSort&&this.groupField!==false?(this.sortInfo?this.sortInfo.field:undefined):this.groupField}});
Ext.ComponentMgr=function(){var B=new Ext.util.MixedCollection();var A={};return{register:function(C){B.add(C)},unregister:function(C){B.remove(C)},get:function(C){return B.get(C)},onAvailable:function(E,D,C){B.on("add",function(F,G){if(G.id==E){D.call(C||G,G);B.un("add",D,C)}})},all:B,registerType:function(D,C){A[D]=C;C.xtype=D},create:function(C,D){return new A[C.xtype||D](C)}}}();Ext.reg=Ext.ComponentMgr.registerType;
Ext.Component=function(B){B=B||{};if(B.initialConfig){if(B.isAction){this.baseAction=B}B=B.initialConfig}else{if(B.tagName||B.dom||typeof B=="string"){B={applyTo:B,id:B.id||B}}}this.initialConfig=B;Ext.apply(this,B);this.addEvents("disable","enable","beforeshow","show","beforehide","hide","beforerender","render","beforedestroy","destroy","beforestaterestore","staterestore","beforestatesave","statesave");this.getId();Ext.ComponentMgr.register(this);Ext.Component.superclass.constructor.call(this);if(this.baseAction){this.baseAction.addComponent(this)}this.initComponent();if(this.plugins){if(Ext.isArray(this.plugins)){for(var C=0,A=this.plugins.length;C<A;C++){this.plugins[C].init(this)}}else{this.plugins.init(this)}}if(this.stateful!==false){this.initState(B)}if(this.applyTo){this.applyToMarkup(this.applyTo);delete this.applyTo}else{if(this.renderTo){this.render(this.renderTo);delete this.renderTo}}};Ext.Component.AUTO_ID=1000;Ext.extend(Ext.Component,Ext.util.Observable,{disabledClass:"x-item-disabled",allowDomMove:true,autoShow:false,hideMode:"display",hideParent:false,hidden:false,disabled:false,rendered:false,ctype:"Ext.Component",actionMode:"el",getActionEl:function(){return this[this.actionMode]},initComponent:Ext.emptyFn,render:function(B,A){if(!this.rendered&&this.fireEvent("beforerender",this)!==false){if(!B&&this.el){this.el=Ext.get(this.el);B=this.el.dom.parentNode;this.allowDomMove=false}this.container=Ext.get(B);if(this.ctCls){this.container.addClass(this.ctCls)}this.rendered=true;if(A!==undefined){if(typeof A=="number"){A=this.container.dom.childNodes[A]}else{A=Ext.getDom(A)}}this.onRender(this.container,A||null);if(this.autoShow){this.el.removeClass(["x-hidden","x-hide-"+this.hideMode])}if(this.cls){this.el.addClass(this.cls);delete this.cls}if(this.style){this.el.applyStyles(this.style);delete this.style}this.fireEvent("render",this);this.afterRender(this.container);if(this.hidden){this.hide()}if(this.disabled){this.disable()}this.initStateEvents()}return this},initState:function(A){if(Ext.state.Manager){var B=Ext.state.Manager.get(this.stateId||this.id);if(B){if(this.fireEvent("beforestaterestore",this,B)!==false){this.applyState(B);this.fireEvent("staterestore",this,B)}}}},initStateEvents:function(){if(this.stateEvents){for(var A=0,B;B=this.stateEvents[A];A++){this.on(B,this.saveState,this,{delay:100})}}},applyState:function(B,A){if(B){Ext.apply(this,B)}},getState:function(){return null},saveState:function(){if(Ext.state.Manager){var A=this.getState();if(this.fireEvent("beforestatesave",this,A)!==false){Ext.state.Manager.set(this.stateId||this.id,A);this.fireEvent("statesave",this,A)}}},applyToMarkup:function(A){this.allowDomMove=false;this.el=Ext.get(A);this.render(this.el.dom.parentNode)},addClass:function(A){if(this.el){this.el.addClass(A)}else{this.cls=this.cls?this.cls+" "+A:A}},removeClass:function(A){if(this.el){this.el.removeClass(A)}else{if(this.cls){this.cls=this.cls.split(" ").remove(A).join(" ")}}},onRender:function(B,A){if(this.autoEl){if(typeof this.autoEl=="string"){this.el=document.createElement(this.autoEl)}else{var C=document.createElement("div");Ext.DomHelper.overwrite(C,this.autoEl);this.el=C.firstChild}if(!this.el.id){this.el.id=this.getId()}}if(this.el){this.el=Ext.get(this.el);if(this.allowDomMove!==false){B.dom.insertBefore(this.el.dom,A)}}},getAutoCreate:function(){var A=typeof this.autoCreate=="object"?this.autoCreate:Ext.apply({},this.defaultAutoCreate);if(this.id&&!A.id){A.id=this.id}return A},afterRender:Ext.emptyFn,destroy:function(){if(this.fireEvent("beforedestroy",this)!==false){this.beforeDestroy();if(this.rendered){this.el.removeAllListeners();this.el.remove();if(this.actionMode=="container"){this.container.remove()}}this.onDestroy();Ext.ComponentMgr.unregister(this);this.fireEvent("destroy",this);this.purgeListeners()}},beforeDestroy:Ext.emptyFn,onDestroy:Ext.emptyFn,getEl:function(){return this.el},getId:function(){return this.id||(this.id="ext-comp-"+(++Ext.Component.AUTO_ID))},getItemId:function(){return this.itemId||this.getId()},focus:function(B,A){if(A){this.focus.defer(typeof A=="number"?A:10,this,[B,false]);return }if(this.rendered){this.el.focus();if(B===true){this.el.dom.select()}}return this},blur:function(){if(this.rendered){this.el.blur()}return this},disable:function(){if(this.rendered){this.onDisable()}this.disabled=true;this.fireEvent("disable",this);return this},onDisable:function(){this.getActionEl().addClass(this.disabledClass);this.el.dom.disabled=true},enable:function(){if(this.rendered){this.onEnable()}this.disabled=false;this.fireEvent("enable",this);return this},onEnable:function(){this.getActionEl().removeClass(this.disabledClass);this.el.dom.disabled=false},setDisabled:function(A){this[A?"disable":"enable"]()},show:function(){if(this.fireEvent("beforeshow",this)!==false){this.hidden=false;if(this.autoRender){this.render(typeof this.autoRender=="boolean"?Ext.getBody():this.autoRender)}if(this.rendered){this.onShow()}this.fireEvent("show",this)}return this},onShow:function(){if(this.hideParent){this.container.removeClass("x-hide-"+this.hideMode)}else{this.getActionEl().removeClass("x-hide-"+this.hideMode)}},hide:function(){if(this.fireEvent("beforehide",this)!==false){this.hidden=true;if(this.rendered){this.onHide()}this.fireEvent("hide",this)}return this},onHide:function(){if(this.hideParent){this.container.addClass("x-hide-"+this.hideMode)}else{this.getActionEl().addClass("x-hide-"+this.hideMode)}},setVisible:function(A){if(A){this.show()}else{this.hide()}return this},isVisible:function(){return this.rendered&&this.getActionEl().isVisible()},cloneConfig:function(B){B=B||{};var C=B.id||Ext.id();var A=Ext.applyIf(B,this.initialConfig);A.id=C;return new this.constructor(A)},getXType:function(){return this.constructor.xtype},isXType:function(B,A){return !A?("/"+this.getXTypes()+"/").indexOf("/"+B+"/")!=-1:this.constructor.xtype==B},getXTypes:function(){var A=this.constructor;if(!A.xtypes){var C=[],B=this;while(B&&B.constructor.xtype){C.unshift(B.constructor.xtype);B=B.constructor.superclass}A.xtypeChain=C;A.xtypes=C.join("/")}return A.xtypes},findParentBy:function(A){for(var B=this.ownerCt;(B!=null)&&!A(B,this);B=B.ownerCt){}return B||null},findParentByType:function(A){return typeof A=="function"?this.findParentBy(function(B){return B.constructor===A}):this.findParentBy(function(B){return B.constructor.xtype===A})}});Ext.reg("component",Ext.Component);
Ext.Action=function(A){this.initialConfig=A;this.items=[]};Ext.Action.prototype={isAction:true,setText:function(A){this.initialConfig.text=A;this.callEach("setText",[A])},getText:function(){return this.initialConfig.text},setIconClass:function(A){this.initialConfig.iconCls=A;this.callEach("setIconClass",[A])},getIconClass:function(){return this.initialConfig.iconCls},setDisabled:function(A){this.initialConfig.disabled=A;this.callEach("setDisabled",[A])},enable:function(){this.setDisabled(false)},disable:function(){this.setDisabled(true)},isDisabled:function(){return this.initialConfig.disabled},setHidden:function(A){this.initialConfig.hidden=A;this.callEach("setVisible",[!A])},show:function(){this.setHidden(false)},hide:function(){this.setHidden(true)},isHidden:function(){return this.initialConfig.hidden},setHandler:function(B,A){this.initialConfig.handler=B;this.initialConfig.scope=A;this.callEach("setHandler",[B,A])},each:function(B,A){Ext.each(this.items,B,A)},callEach:function(E,B){var D=this.items;for(var C=0,A=D.length;C<A;C++){D[C][E].apply(D[C],B)}},addComponent:function(A){this.items.push(A);A.on("destroy",this.removeComponent,this)},removeComponent:function(A){this.items.remove(A)},execute:function(){this.initialConfig.handler.apply(this.initialConfig.scope||window,arguments)}};
(function(){Ext.Layer=function(D,C){D=D||{};var E=Ext.DomHelper;var G=D.parentEl,F=G?Ext.getDom(G):document.body;if(C){this.dom=Ext.getDom(C)}if(!this.dom){var H=D.dh||{tag:"div",cls:"x-layer"};this.dom=E.append(F,H)}if(D.cls){this.addClass(D.cls)}this.constrain=D.constrain!==false;this.visibilityMode=Ext.Element.VISIBILITY;if(D.id){this.id=this.dom.id=D.id}else{this.id=Ext.id(this.dom)}this.zindex=D.zindex||this.getZIndex();this.position("absolute",this.zindex);if(D.shadow){this.shadowOffset=D.shadowOffset||4;this.shadow=new Ext.Shadow({offset:this.shadowOffset,mode:D.shadow})}else{this.shadowOffset=0}this.useShim=D.shim!==false&&Ext.useShims;this.useDisplay=D.useDisplay;this.hide()};var A=Ext.Element.prototype;var B=[];Ext.extend(Ext.Layer,Ext.Element,{getZIndex:function(){return this.zindex||parseInt(this.getStyle("z-index"),10)||11000},getShim:function(){if(!this.useShim){return null}if(this.shim){return this.shim}var D=B.shift();if(!D){D=this.createShim();D.enableDisplayMode("block");D.dom.style.display="none";D.dom.style.visibility="visible"}var C=this.dom.parentNode;if(D.dom.parentNode!=C){C.insertBefore(D.dom,this.dom)}D.setStyle("z-index",this.getZIndex()-2);this.shim=D;return D},hideShim:function(){if(this.shim){this.shim.setDisplayed(false);B.push(this.shim);delete this.shim}},disableShadow:function(){if(this.shadow){this.shadowDisabled=true;this.shadow.hide();this.lastShadowOffset=this.shadowOffset;this.shadowOffset=0}},enableShadow:function(C){if(this.shadow){this.shadowDisabled=false;this.shadowOffset=this.lastShadowOffset;delete this.lastShadowOffset;if(C){this.sync(true)}}},sync:function(C){var I=this.shadow;if(!this.updating&&this.isVisible()&&(I||this.useShim)){var F=this.getShim();var H=this.getWidth(),E=this.getHeight();var D=this.getLeft(true),J=this.getTop(true);if(I&&!this.shadowDisabled){if(C&&!I.isVisible()){I.show(this)}else{I.realign(D,J,H,E)}if(F){if(C){F.show()}var G=I.adjusts,K=F.dom.style;K.left=(Math.min(D,D+G.l))+"px";K.top=(Math.min(J,J+G.t))+"px";K.width=(H+G.w)+"px";K.height=(E+G.h)+"px"}}else{if(F){if(C){F.show()}F.setSize(H,E);F.setLeftTop(D,J)}}}},destroy:function(){this.hideShim();if(this.shadow){this.shadow.hide()}this.removeAllListeners();Ext.removeNode(this.dom);Ext.Element.uncache(this.id)},remove:function(){this.destroy()},beginUpdate:function(){this.updating=true},endUpdate:function(){this.updating=false;this.sync(true)},hideUnders:function(C){if(this.shadow){this.shadow.hide()}this.hideShim()},constrainXY:function(){if(this.constrain){var G=Ext.lib.Dom.getViewWidth(),C=Ext.lib.Dom.getViewHeight();var L=Ext.getDoc().getScroll();var K=this.getXY();var H=K[0],F=K[1];var I=this.dom.offsetWidth+this.shadowOffset,D=this.dom.offsetHeight+this.shadowOffset;var E=false;if((H+I)>G+L.left){H=G-I-this.shadowOffset;E=true}if((F+D)>C+L.top){F=C-D-this.shadowOffset;E=true}if(H<L.left){H=L.left;E=true}if(F<L.top){F=L.top;E=true}if(E){if(this.avoidY){var J=this.avoidY;if(F<=J&&(F+D)>=J){F=J-D-5}}K=[H,F];this.storeXY(K);A.setXY.call(this,K);this.sync()}}},isVisible:function(){return this.visible},showAction:function(){this.visible=true;if(this.useDisplay===true){this.setDisplayed("")}else{if(this.lastXY){A.setXY.call(this,this.lastXY)}else{if(this.lastLT){A.setLeftTop.call(this,this.lastLT[0],this.lastLT[1])}}}},hideAction:function(){this.visible=false;if(this.useDisplay===true){this.setDisplayed(false)}else{this.setLeftTop(-10000,-10000)}},setVisible:function(E,D,G,H,F){if(E){this.showAction()}if(D&&E){var C=function(){this.sync(true);if(H){H()}}.createDelegate(this);A.setVisible.call(this,true,true,G,C,F)}else{if(!E){this.hideUnders(true)}var C=H;if(D){C=function(){this.hideAction();if(H){H()}}.createDelegate(this)}A.setVisible.call(this,E,D,G,C,F);if(E){this.sync(true)}else{if(!D){this.hideAction()}}}},storeXY:function(C){delete this.lastLT;this.lastXY=C},storeLeftTop:function(D,C){delete this.lastXY;this.lastLT=[D,C]},beforeFx:function(){this.beforeAction();return Ext.Layer.superclass.beforeFx.apply(this,arguments)},afterFx:function(){Ext.Layer.superclass.afterFx.apply(this,arguments);this.sync(this.isVisible())},beforeAction:function(){if(!this.updating&&this.shadow){this.shadow.hide()}},setLeft:function(C){this.storeLeftTop(C,this.getTop(true));A.setLeft.apply(this,arguments);this.sync()},setTop:function(C){this.storeLeftTop(this.getLeft(true),C);A.setTop.apply(this,arguments);this.sync()},setLeftTop:function(D,C){this.storeLeftTop(D,C);A.setLeftTop.apply(this,arguments);this.sync()},setXY:function(F,D,G,H,E){this.fixDisplay();this.beforeAction();this.storeXY(F);var C=this.createCB(H);A.setXY.call(this,F,D,G,C,E);if(!D){C()}},createCB:function(D){var C=this;return function(){C.constrainXY();C.sync(true);if(D){D()}}},setX:function(C,D,F,G,E){this.setXY([C,this.getY()],D,F,G,E)},setY:function(G,C,E,F,D){this.setXY([this.getX(),G],C,E,F,D)},setSize:function(E,F,D,H,I,G){this.beforeAction();var C=this.createCB(I);A.setSize.call(this,E,F,D,H,C,G);if(!D){C()}},setWidth:function(E,D,G,H,F){this.beforeAction();var C=this.createCB(H);A.setWidth.call(this,E,D,G,C,F);if(!D){C()}},setHeight:function(E,D,G,H,F){this.beforeAction();var C=this.createCB(H);A.setHeight.call(this,E,D,G,C,F);if(!D){C()}},setBounds:function(J,H,K,D,I,F,G,E){this.beforeAction();var C=this.createCB(G);if(!I){this.storeXY([J,H]);A.setXY.call(this,[J,H]);A.setSize.call(this,K,D,I,F,C,E);C()}else{A.setBounds.call(this,J,H,K,D,I,F,C,E)}return this},setZIndex:function(C){this.zindex=C;this.setStyle("z-index",C+2);if(this.shadow){this.shadow.setZIndex(C+1)}if(this.shim){this.shim.setStyle("z-index",C)}}})})();
Ext.Shadow=function(C){Ext.apply(this,C);if(typeof this.mode!="string"){this.mode=this.defaultMode}var D=this.offset,B={h:0};var A=Math.floor(this.offset/2);switch(this.mode.toLowerCase()){case"drop":B.w=0;B.l=B.t=D;B.t-=1;if(Ext.isIE){B.l-=this.offset+A;B.t-=this.offset+A;B.w-=A;B.h-=A;B.t+=1}break;case"sides":B.w=(D*2);B.l=-D;B.t=D-1;if(Ext.isIE){B.l-=(this.offset-A);B.t-=this.offset+A;B.l+=1;B.w-=(this.offset-A)*2;B.w-=A+1;B.h-=1}break;case"frame":B.w=B.h=(D*2);B.l=B.t=-D;B.t+=1;B.h-=2;if(Ext.isIE){B.l-=(this.offset-A);B.t-=(this.offset-A);B.l+=1;B.w-=(this.offset+A+1);B.h-=(this.offset+A);B.h+=1}break}this.adjusts=B};Ext.Shadow.prototype={offset:4,defaultMode:"drop",show:function(A){A=Ext.get(A);if(!this.el){this.el=Ext.Shadow.Pool.pull();if(this.el.dom.nextSibling!=A.dom){this.el.insertBefore(A)}}this.el.setStyle("z-index",this.zIndex||parseInt(A.getStyle("z-index"),10)-1);if(Ext.isIE){this.el.dom.style.filter="progid:DXImageTransform.Microsoft.alpha(opacity=50) progid:DXImageTransform.Microsoft.Blur(pixelradius="+(this.offset)+")"}this.realign(A.getLeft(true),A.getTop(true),A.getWidth(),A.getHeight());this.el.dom.style.display="block"},isVisible:function(){return this.el?true:false},realign:function(A,M,L,D){if(!this.el){return }var I=this.adjusts,G=this.el.dom,N=G.style;var E=0;N.left=(A+I.l)+"px";N.top=(M+I.t)+"px";var K=(L+I.w),C=(D+I.h),F=K+"px",J=C+"px";if(N.width!=F||N.height!=J){N.width=F;N.height=J;if(!Ext.isIE){var H=G.childNodes;var B=Math.max(0,(K-12))+"px";H[0].childNodes[1].style.width=B;H[1].childNodes[1].style.width=B;H[2].childNodes[1].style.width=B;H[1].style.height=Math.max(0,(C-12))+"px"}}},hide:function(){if(this.el){this.el.dom.style.display="none";Ext.Shadow.Pool.push(this.el);delete this.el}},setZIndex:function(A){this.zIndex=A;if(this.el){this.el.setStyle("z-index",A)}}};Ext.Shadow.Pool=function(){var B=[];var A=Ext.isIE?"<div class=\"x-ie-shadow\"></div>":"<div class=\"x-shadow\"><div class=\"xst\"><div class=\"xstl\"></div><div class=\"xstc\"></div><div class=\"xstr\"></div></div><div class=\"xsc\"><div class=\"xsml\"></div><div class=\"xsmc\"></div><div class=\"xsmr\"></div></div><div class=\"xsb\"><div class=\"xsbl\"></div><div class=\"xsbc\"></div><div class=\"xsbr\"></div></div></div>";return{pull:function(){var C=B.shift();if(!C){C=Ext.get(Ext.DomHelper.insertHtml("beforeBegin",document.body.firstChild,A));C.autoBoxAdjust=false}return C},push:function(C){B.push(C)}}}();
Ext.BoxComponent=Ext.extend(Ext.Component,{initComponent:function(){Ext.BoxComponent.superclass.initComponent.call(this);this.addEvents("resize","move")},boxReady:false,deferHeight:false,setSize:function(B,D){if(typeof B=="object"){D=B.height;B=B.width}if(!this.boxReady){this.width=B;this.height=D;return this}if(this.lastSize&&this.lastSize.width==B&&this.lastSize.height==D){return this}this.lastSize={width:B,height:D};var C=this.adjustSize(B,D);var F=C.width,A=C.height;if(F!==undefined||A!==undefined){var E=this.getResizeEl();if(!this.deferHeight&&F!==undefined&&A!==undefined){E.setSize(F,A)}else{if(!this.deferHeight&&A!==undefined){E.setHeight(A)}else{if(F!==undefined){E.setWidth(F)}}}this.onResize(F,A,B,D);this.fireEvent("resize",this,F,A,B,D)}return this},setWidth:function(A){return this.setSize(A)},setHeight:function(A){return this.setSize(undefined,A)},getSize:function(){return this.el.getSize()},getPosition:function(A){if(A===true){return[this.el.getLeft(true),this.el.getTop(true)]}return this.xy||this.el.getXY()},getBox:function(A){var B=this.el.getSize();if(A===true){B.x=this.el.getLeft(true);B.y=this.el.getTop(true)}else{var C=this.xy||this.el.getXY();B.x=C[0];B.y=C[1]}return B},updateBox:function(A){this.setSize(A.width,A.height);this.setPagePosition(A.x,A.y);return this},getResizeEl:function(){return this.resizeEl||this.el},getPositionEl:function(){return this.positionEl||this.el},setPosition:function(A,F){if(A&&typeof A[1]=="number"){F=A[1];A=A[0]}this.x=A;this.y=F;if(!this.boxReady){return this}var B=this.adjustPosition(A,F);var E=B.x,D=B.y;var C=this.getPositionEl();if(E!==undefined||D!==undefined){if(E!==undefined&&D!==undefined){C.setLeftTop(E,D)}else{if(E!==undefined){C.setLeft(E)}else{if(D!==undefined){C.setTop(D)}}}this.onPosition(E,D);this.fireEvent("move",this,E,D)}return this},setPagePosition:function(A,C){if(A&&typeof A[1]=="number"){C=A[1];A=A[0]}this.pageX=A;this.pageY=C;if(!this.boxReady){return }if(A===undefined||C===undefined){return }var B=this.el.translatePoints(A,C);this.setPosition(B.left,B.top);return this},onRender:function(B,A){Ext.BoxComponent.superclass.onRender.call(this,B,A);if(this.resizeEl){this.resizeEl=Ext.get(this.resizeEl)}if(this.positionEl){this.positionEl=Ext.get(this.positionEl)}},afterRender:function(){Ext.BoxComponent.superclass.afterRender.call(this);this.boxReady=true;this.setSize(this.width,this.height);if(this.x||this.y){this.setPosition(this.x,this.y)}else{if(this.pageX||this.pageY){this.setPagePosition(this.pageX,this.pageY)}}},syncSize:function(){delete this.lastSize;this.setSize(this.autoWidth?undefined:this.el.getWidth(),this.autoHeight?undefined:this.el.getHeight());return this},onResize:function(D,B,A,C){},onPosition:function(A,B){},adjustSize:function(A,B){if(this.autoWidth){A="auto"}if(this.autoHeight){B="auto"}return{width:A,height:B}},adjustPosition:function(A,B){return{x:A,y:B}}});Ext.reg("box",Ext.BoxComponent);
Ext.SplitBar=function(C,E,B,D,A){this.el=Ext.get(C,true);this.el.dom.unselectable="on";this.resizingEl=Ext.get(E,true);this.orientation=B||Ext.SplitBar.HORIZONTAL;this.minSize=0;this.maxSize=2000;this.animate=false;this.useShim=false;this.shim=null;if(!A){this.proxy=Ext.SplitBar.createProxy(this.orientation)}else{this.proxy=Ext.get(A).dom}this.dd=new Ext.dd.DDProxy(this.el.dom.id,"XSplitBars",{dragElId:this.proxy.id});this.dd.b4StartDrag=this.onStartProxyDrag.createDelegate(this);this.dd.endDrag=this.onEndProxyDrag.createDelegate(this);this.dragSpecs={};this.adapter=new Ext.SplitBar.BasicLayoutAdapter();this.adapter.init(this);if(this.orientation==Ext.SplitBar.HORIZONTAL){this.placement=D||(this.el.getX()>this.resizingEl.getX()?Ext.SplitBar.LEFT:Ext.SplitBar.RIGHT);this.el.addClass("x-splitbar-h")}else{this.placement=D||(this.el.getY()>this.resizingEl.getY()?Ext.SplitBar.TOP:Ext.SplitBar.BOTTOM);this.el.addClass("x-splitbar-v")}this.addEvents("resize","moved","beforeresize","beforeapply");Ext.SplitBar.superclass.constructor.call(this)};Ext.extend(Ext.SplitBar,Ext.util.Observable,{onStartProxyDrag:function(A,E){this.fireEvent("beforeresize",this);this.overlay=Ext.DomHelper.append(document.body,{cls:"x-drag-overlay",html:"&#160;"},true);this.overlay.unselectable();this.overlay.setSize(Ext.lib.Dom.getViewWidth(true),Ext.lib.Dom.getViewHeight(true));this.overlay.show();Ext.get(this.proxy).setDisplayed("block");var C=this.adapter.getElementSize(this);this.activeMinSize=this.getMinimumSize();this.activeMaxSize=this.getMaximumSize();var D=C-this.activeMinSize;var B=Math.max(this.activeMaxSize-C,0);if(this.orientation==Ext.SplitBar.HORIZONTAL){this.dd.resetConstraints();this.dd.setXConstraint(this.placement==Ext.SplitBar.LEFT?D:B,this.placement==Ext.SplitBar.LEFT?B:D);this.dd.setYConstraint(0,0)}else{this.dd.resetConstraints();this.dd.setXConstraint(0,0);this.dd.setYConstraint(this.placement==Ext.SplitBar.TOP?D:B,this.placement==Ext.SplitBar.TOP?B:D)}this.dragSpecs.startSize=C;this.dragSpecs.startPoint=[A,E];Ext.dd.DDProxy.prototype.b4StartDrag.call(this.dd,A,E)},onEndProxyDrag:function(C){Ext.get(this.proxy).setDisplayed(false);var B=Ext.lib.Event.getXY(C);if(this.overlay){this.overlay.remove();delete this.overlay}var A;if(this.orientation==Ext.SplitBar.HORIZONTAL){A=this.dragSpecs.startSize+(this.placement==Ext.SplitBar.LEFT?B[0]-this.dragSpecs.startPoint[0]:this.dragSpecs.startPoint[0]-B[0])}else{A=this.dragSpecs.startSize+(this.placement==Ext.SplitBar.TOP?B[1]-this.dragSpecs.startPoint[1]:this.dragSpecs.startPoint[1]-B[1])}A=Math.min(Math.max(A,this.activeMinSize),this.activeMaxSize);if(A!=this.dragSpecs.startSize){if(this.fireEvent("beforeapply",this,A)!==false){this.adapter.setElementSize(this,A);this.fireEvent("moved",this,A);this.fireEvent("resize",this,A)}}},getAdapter:function(){return this.adapter},setAdapter:function(A){this.adapter=A;this.adapter.init(this)},getMinimumSize:function(){return this.minSize},setMinimumSize:function(A){this.minSize=A},getMaximumSize:function(){return this.maxSize},setMaximumSize:function(A){this.maxSize=A},setCurrentSize:function(B){var A=this.animate;this.animate=false;this.adapter.setElementSize(this,B);this.animate=A},destroy:function(A){if(this.shim){this.shim.remove()}this.dd.unreg();Ext.removeNode(this.proxy);if(A){this.el.remove()}}});Ext.SplitBar.createProxy=function(B){var C=new Ext.Element(document.createElement("div"));C.unselectable();var A="x-splitbar-proxy";C.addClass(A+" "+(B==Ext.SplitBar.HORIZONTAL?A+"-h":A+"-v"));document.body.appendChild(C.dom);return C.dom};Ext.SplitBar.BasicLayoutAdapter=function(){};Ext.SplitBar.BasicLayoutAdapter.prototype={init:function(A){},getElementSize:function(A){if(A.orientation==Ext.SplitBar.HORIZONTAL){return A.resizingEl.getWidth()}else{return A.resizingEl.getHeight()}},setElementSize:function(B,A,C){if(B.orientation==Ext.SplitBar.HORIZONTAL){if(!B.animate){B.resizingEl.setWidth(A);if(C){C(B,A)}}else{B.resizingEl.setWidth(A,true,0.1,C,"easeOut")}}else{if(!B.animate){B.resizingEl.setHeight(A);if(C){C(B,A)}}else{B.resizingEl.setHeight(A,true,0.1,C,"easeOut")}}}};Ext.SplitBar.AbsoluteLayoutAdapter=function(A){this.basic=new Ext.SplitBar.BasicLayoutAdapter();this.container=Ext.get(A)};Ext.SplitBar.AbsoluteLayoutAdapter.prototype={init:function(A){this.basic.init(A)},getElementSize:function(A){return this.basic.getElementSize(A)},setElementSize:function(B,A,C){this.basic.setElementSize(B,A,this.moveSplitter.createDelegate(this,[B]))},moveSplitter:function(A){var B=Ext.SplitBar;switch(A.placement){case B.LEFT:A.el.setX(A.resizingEl.getRight());break;case B.RIGHT:A.el.setStyle("right",(this.container.getWidth()-A.resizingEl.getLeft())+"px");break;case B.TOP:A.el.setY(A.resizingEl.getBottom());break;case B.BOTTOM:A.el.setY(A.resizingEl.getTop()-A.el.getHeight());break}}};Ext.SplitBar.VERTICAL=1;Ext.SplitBar.HORIZONTAL=2;Ext.SplitBar.LEFT=1;Ext.SplitBar.RIGHT=2;Ext.SplitBar.TOP=3;Ext.SplitBar.BOTTOM=4;
Ext.Container=Ext.extend(Ext.BoxComponent,{autoDestroy:true,defaultType:"panel",initComponent:function(){Ext.Container.superclass.initComponent.call(this);this.addEvents("afterlayout","beforeadd","beforeremove","add","remove");var A=this.items;if(A){delete this.items;if(Ext.isArray(A)){this.add.apply(this,A)}else{this.add(A)}}},initItems:function(){if(!this.items){this.items=new Ext.util.MixedCollection(false,this.getComponentId);this.getLayout()}},setLayout:function(A){if(this.layout&&this.layout!=A){this.layout.setContainer(null)}this.initItems();this.layout=A;A.setContainer(this)},render:function(){Ext.Container.superclass.render.apply(this,arguments);if(this.layout){if(typeof this.layout=="string"){this.layout=new Ext.Container.LAYOUTS[this.layout.toLowerCase()](this.layoutConfig)}this.setLayout(this.layout);if(this.activeItem!==undefined){var A=this.activeItem;delete this.activeItem;this.layout.setActiveItem(A);return }}if(!this.ownerCt){this.doLayout()}if(this.monitorResize===true){Ext.EventManager.onWindowResize(this.doLayout,this,[false])}},getLayoutTarget:function(){return this.el},getComponentId:function(A){return A.itemId||A.id},add:function(C){if(!this.items){this.initItems()}var B=arguments,A=B.length;if(A>1){for(var D=0;D<A;D++){this.add(B[D])}return }var F=this.lookupComponent(this.applyDefaults(C));var E=this.items.length;if(this.fireEvent("beforeadd",this,F,E)!==false&&this.onBeforeAdd(F)!==false){this.items.add(F);F.ownerCt=this;this.fireEvent("add",this,F,E)}return F},insert:function(D,C){if(!this.items){this.initItems()}var B=arguments,A=B.length;if(A>2){for(var E=A-1;E>=1;--E){this.insert(D,B[E])}return }var F=this.lookupComponent(this.applyDefaults(C));if(F.ownerCt==this&&this.items.indexOf(F)<D){--D}if(this.fireEvent("beforeadd",this,F,D)!==false&&this.onBeforeAdd(F)!==false){this.items.insert(D,F);F.ownerCt=this;this.fireEvent("add",this,F,D)}return F},applyDefaults:function(A){if(this.defaults){if(typeof A=="string"){A=Ext.ComponentMgr.get(A);Ext.apply(A,this.defaults)}else{if(!A.events){Ext.applyIf(A,this.defaults)}else{Ext.apply(A,this.defaults)}}}return A},onBeforeAdd:function(A){if(A.ownerCt){A.ownerCt.remove(A,false)}if(this.hideBorders===true){A.border=(A.border===true)}},remove:function(A,B){var C=this.getComponent(A);if(C&&this.fireEvent("beforeremove",this,C)!==false){this.items.remove(C);delete C.ownerCt;if(B===true||(B!==false&&this.autoDestroy)){C.destroy()}if(this.layout&&this.layout.activeItem==C){delete this.layout.activeItem}this.fireEvent("remove",this,C)}return C},getComponent:function(A){if(typeof A=="object"){return A}return this.items.get(A)},lookupComponent:function(A){if(typeof A=="string"){return Ext.ComponentMgr.get(A)}else{if(!A.events){return this.createComponent(A)}}return A},createComponent:function(A){return Ext.ComponentMgr.create(A,this.defaultType)},doLayout:function(D){if(this.rendered&&this.layout){this.layout.layout()}if(D!==false&&this.items){var C=this.items.items;for(var B=0,A=C.length;B<A;B++){var E=C[B];if(E.doLayout){E.doLayout()}}}},getLayout:function(){if(!this.layout){var A=new Ext.layout.ContainerLayout(this.layoutConfig);this.setLayout(A)}return this.layout},onDestroy:function(){if(this.items){var C=this.items.items;for(var B=0,A=C.length;B<A;B++){Ext.destroy(C[B])}}if(this.monitorResize){Ext.EventManager.removeResizeListener(this.doLayout,this)}Ext.Container.superclass.onDestroy.call(this)},bubble:function(C,B,A){var D=this;while(D){if(C.apply(B||D,A||[D])===false){break}D=D.ownerCt}},cascade:function(F,E,B){if(F.apply(E||this,B||[this])!==false){if(this.items){var D=this.items.items;for(var C=0,A=D.length;C<A;C++){if(D[C].cascade){D[C].cascade(F,E,B)}else{F.apply(E||this,B||[D[C]])}}}}},findById:function(C){var A,B=this;this.cascade(function(D){if(B!=D&&D.id===C){A=D;return false}});return A||null},findByType:function(A){return typeof A=="function"?this.findBy(function(B){return B.constructor===A}):this.findBy(function(B){return B.constructor.xtype===A})},find:function(B,A){return this.findBy(function(C){return C[B]===A})},findBy:function(D,C){var A=[],B=this;this.cascade(function(E){if(B!=E&&D.call(C||E,E,B)===true){A.push(E)}});return A}});Ext.Container.LAYOUTS={};Ext.reg("container",Ext.Container);
Ext.layout.ContainerLayout=function(A){Ext.apply(this,A)};Ext.layout.ContainerLayout.prototype={monitorResize:false,activeItem:null,layout:function(){var A=this.container.getLayoutTarget();this.onLayout(this.container,A);this.container.fireEvent("afterlayout",this.container,this)},onLayout:function(A,B){this.renderAll(A,B)},isValidParent:function(C,B){var A=C.getPositionEl?C.getPositionEl():C.getEl();return A.dom.parentNode==B.dom},renderAll:function(D,E){var B=D.items.items;for(var C=0,A=B.length;C<A;C++){var F=B[C];if(F&&(!F.rendered||!this.isValidParent(F,E))){this.renderItem(F,C,E)}}},renderItem:function(D,A,C){if(D&&!D.rendered){D.render(C,A);if(this.extraCls){var B=D.getPositionEl?D.getPositionEl():D;B.addClass(this.extraCls)}if(this.renderHidden&&D!=this.activeItem){D.hide()}}else{if(D&&!this.isValidParent(D,C)){if(this.extraCls){D.addClass(this.extraCls)}if(typeof A=="number"){A=C.dom.childNodes[A]}C.dom.insertBefore(D.getEl().dom,A||null);if(this.renderHidden&&D!=this.activeItem){D.hide()}}}},onResize:function(){if(this.container.collapsed){return }var A=this.container.bufferResize;if(A){if(!this.resizeTask){this.resizeTask=new Ext.util.DelayedTask(this.layout,this);this.resizeBuffer=typeof A=="number"?A:100}this.resizeTask.delay(this.resizeBuffer)}else{this.layout()}},setContainer:function(A){if(this.monitorResize&&A!=this.container){if(this.container){this.container.un("resize",this.onResize,this)}if(A){A.on("resize",this.onResize,this)}}this.container=A},parseMargins:function(B){var C=B.split(" ");var A=C.length;if(A==1){C[1]=C[0];C[2]=C[0];C[3]=C[0]}if(A==2){C[2]=C[0];C[3]=C[1]}return{top:parseInt(C[0],10)||0,right:parseInt(C[1],10)||0,bottom:parseInt(C[2],10)||0,left:parseInt(C[3],10)||0}}};Ext.Container.LAYOUTS["auto"]=Ext.layout.ContainerLayout;
Ext.layout.FitLayout=Ext.extend(Ext.layout.ContainerLayout,{monitorResize:true,onLayout:function(A,B){Ext.layout.FitLayout.superclass.onLayout.call(this,A,B);if(!this.container.collapsed){this.setItemSize(this.activeItem||A.items.itemAt(0),B.getStyleSize())}},setItemSize:function(B,A){if(B&&A.height>0){B.setSize(A)}}});Ext.Container.LAYOUTS["fit"]=Ext.layout.FitLayout;
Ext.layout.CardLayout=Ext.extend(Ext.layout.FitLayout,{deferredRender:false,renderHidden:true,setActiveItem:function(A){A=this.container.getComponent(A);if(this.activeItem!=A){if(this.activeItem){this.activeItem.hide()}this.activeItem=A;A.show();this.layout()}},renderAll:function(A,B){if(this.deferredRender){this.renderItem(this.activeItem,undefined,B)}else{Ext.layout.CardLayout.superclass.renderAll.call(this,A,B)}}});Ext.Container.LAYOUTS["card"]=Ext.layout.CardLayout;
Ext.layout.AnchorLayout=Ext.extend(Ext.layout.ContainerLayout,{monitorResize:true,getAnchorViewSize:function(A,B){return B.dom==document.body?B.getViewSize():B.getStyleSize()},onLayout:function(F,I){Ext.layout.AnchorLayout.superclass.onLayout.call(this,F,I);var O=this.getAnchorViewSize(F,I);var M=O.width,E=O.height;if(M<20||E<20){return }var B,K;if(F.anchorSize){if(typeof F.anchorSize=="number"){B=F.anchorSize}else{B=F.anchorSize.width;K=F.anchorSize.height}}else{B=F.initialConfig.width;K=F.initialConfig.height}var H=F.items.items,G=H.length,D,J,L,C,A;for(D=0;D<G;D++){J=H[D];if(J.anchor){L=J.anchorSpec;if(!L){var N=J.anchor.split(" ");J.anchorSpec=L={right:this.parseAnchor(N[0],J.initialConfig.width,B),bottom:this.parseAnchor(N[1],J.initialConfig.height,K)}}C=L.right?this.adjustWidthAnchor(L.right(M),J):undefined;A=L.bottom?this.adjustHeightAnchor(L.bottom(E),J):undefined;if(C||A){J.setSize(C||undefined,A||undefined)}}}},parseAnchor:function(B,F,A){if(B&&B!="none"){var D;if(/^(r|right|b|bottom)$/i.test(B)){var E=A-F;return function(G){if(G!==D){D=G;return G-E}}}else{if(B.indexOf("%")!=-1){var C=parseFloat(B.replace("%",""))*0.01;return function(G){if(G!==D){D=G;return Math.floor(G*C)}}}else{B=parseInt(B,10);if(!isNaN(B)){return function(G){if(G!==D){D=G;return G+B}}}}}}return false},adjustWidthAnchor:function(B,A){return B},adjustHeightAnchor:function(B,A){return B}});Ext.Container.LAYOUTS["anchor"]=Ext.layout.AnchorLayout;
Ext.layout.ColumnLayout=Ext.extend(Ext.layout.ContainerLayout,{monitorResize:true,extraCls:"x-column",scrollOffset:0,isValidParent:function(B,A){return B.getEl().dom.parentNode==this.innerCt.dom},onLayout:function(C,F){var D=C.items.items,E=D.length,G,A;if(!this.innerCt){F.addClass("x-column-layout-ct");this.innerCt=F.createChild({cls:"x-column-inner"});this.innerCt.createChild({cls:"x-clear"})}this.renderAll(C,this.innerCt);var J=F.getViewSize();if(J.width<1&&J.height<1){return }var H=J.width-F.getPadding("lr")-this.scrollOffset,B=J.height-F.getPadding("tb"),I=H;this.innerCt.setWidth(H);for(A=0;A<E;A++){G=D[A];if(!G.columnWidth){I-=(G.getSize().width+G.getEl().getMargins("lr"))}}I=I<0?0:I;for(A=0;A<E;A++){G=D[A];if(G.columnWidth){G.setSize(Math.floor(G.columnWidth*I)-G.getEl().getMargins("lr"))}}}});Ext.Container.LAYOUTS["column"]=Ext.layout.ColumnLayout;
Ext.layout.BorderLayout=Ext.extend(Ext.layout.ContainerLayout,{monitorResize:true,rendered:false,onLayout:function(B,X){var C;if(!this.rendered){X.position();X.addClass("x-border-layout-ct");var M=B.items.items;C=[];for(var Q=0,R=M.length;Q<R;Q++){var U=M[Q];var F=U.region;if(U.collapsed){C.push(U)}U.collapsed=false;if(!U.rendered){U.cls=U.cls?U.cls+" x-border-panel":"x-border-panel";U.render(X,Q)}this[F]=F!="center"&&U.split?new Ext.layout.BorderLayout.SplitRegion(this,U.initialConfig,F):new Ext.layout.BorderLayout.Region(this,U.initialConfig,F);this[F].render(X,U)}this.rendered=true}var L=X.getViewSize();if(L.width<20||L.height<20){if(C){this.restoreCollapsed=C}return }else{if(this.restoreCollapsed){C=this.restoreCollapsed;delete this.restoreCollapsed}}var J=L.width,S=L.height;var I=J,P=S,G=0,H=0;var N=this.north,K=this.south,E=this.west,T=this.east,U=this.center;if(!U){throw"No center region defined in BorderLayout "+B.id}if(N&&N.isVisible()){var W=N.getSize();var O=N.getMargins();W.width=J-(O.left+O.right);W.x=O.left;W.y=O.top;G=W.height+W.y+O.bottom;P-=G;N.applyLayout(W)}if(K&&K.isVisible()){var W=K.getSize();var O=K.getMargins();W.width=J-(O.left+O.right);W.x=O.left;var V=(W.height+O.top+O.bottom);W.y=S-V+O.top;P-=V;K.applyLayout(W)}if(E&&E.isVisible()){var W=E.getSize();var O=E.getMargins();W.height=P-(O.top+O.bottom);W.x=O.left;W.y=G+O.top;var A=(W.width+O.left+O.right);H+=A;I-=A;E.applyLayout(W)}if(T&&T.isVisible()){var W=T.getSize();var O=T.getMargins();W.height=P-(O.top+O.bottom);var A=(W.width+O.left+O.right);W.x=J-A+O.left;W.y=G+O.top;I-=A;T.applyLayout(W)}var O=U.getMargins();var D={x:H+O.left,y:G+O.top,width:I-(O.left+O.right),height:P-(O.top+O.bottom)};U.applyLayout(D);if(C){for(var Q=0,R=C.length;Q<R;Q++){C[Q].collapse(false)}}if(Ext.isIE&&Ext.isStrict){X.repaint()}}});Ext.layout.BorderLayout.Region=function(B,A,C){Ext.apply(this,A);this.layout=B;this.position=C;this.state={};if(typeof this.margins=="string"){this.margins=this.layout.parseMargins(this.margins)}this.margins=Ext.applyIf(this.margins||{},this.defaultMargins);if(this.collapsible){if(typeof this.cmargins=="string"){this.cmargins=this.layout.parseMargins(this.cmargins)}if(this.collapseMode=="mini"&&!this.cmargins){this.cmargins={left:0,top:0,right:0,bottom:0}}else{this.cmargins=Ext.applyIf(this.cmargins||{},C=="north"||C=="south"?this.defaultNSCMargins:this.defaultEWCMargins)}}};Ext.layout.BorderLayout.Region.prototype={collapsible:false,split:false,floatable:true,minWidth:50,minHeight:50,defaultMargins:{left:0,top:0,right:0,bottom:0},defaultNSCMargins:{left:5,top:5,right:5,bottom:5},defaultEWCMargins:{left:5,top:0,right:5,bottom:0},isCollapsed:false,render:function(B,C){this.panel=C;C.el.enableDisplayMode();this.targetEl=B;this.el=C.el;var A=C.getState,D=this.position;C.getState=function(){return Ext.apply(A.call(C)||{},this.state)}.createDelegate(this);if(D!="center"){C.allowQueuedExpand=false;C.on({beforecollapse:this.beforeCollapse,collapse:this.onCollapse,beforeexpand:this.beforeExpand,expand:this.onExpand,hide:this.onHide,show:this.onShow,scope:this});if(this.collapsible){C.collapseEl="el";C.slideAnchor=this.getSlideAnchor()}if(C.tools&&C.tools.toggle){C.tools.toggle.addClass("x-tool-collapse-"+D);C.tools.toggle.addClassOnOver("x-tool-collapse-"+D+"-over")}}},getCollapsedEl:function(){if(!this.collapsedEl){if(!this.toolTemplate){var B=new Ext.Template("<div class=\"x-tool x-tool-{id}\">&#160;</div>");B.disableFormats=true;B.compile();Ext.layout.BorderLayout.Region.prototype.toolTemplate=B}this.collapsedEl=this.targetEl.createChild({cls:"x-layout-collapsed x-layout-collapsed-"+this.position,id:this.panel.id+"-xcollapsed"});this.collapsedEl.enableDisplayMode("block");if(this.collapseMode=="mini"){this.collapsedEl.addClass("x-layout-cmini-"+this.position);this.miniCollapsedEl=this.collapsedEl.createChild({cls:"x-layout-mini x-layout-mini-"+this.position,html:"&#160;"});this.miniCollapsedEl.addClassOnOver("x-layout-mini-over");this.collapsedEl.addClassOnOver("x-layout-collapsed-over");this.collapsedEl.on("click",this.onExpandClick,this,{stopEvent:true})}else{var A=this.toolTemplate.append(this.collapsedEl.dom,{id:"expand-"+this.position},true);A.addClassOnOver("x-tool-expand-"+this.position+"-over");A.on("click",this.onExpandClick,this,{stopEvent:true});if(this.floatable!==false){this.collapsedEl.addClassOnOver("x-layout-collapsed-over");this.collapsedEl.on("click",this.collapseClick,this)}}}return this.collapsedEl},onExpandClick:function(A){if(this.isSlid){this.afterSlideIn();this.panel.expand(false)}else{this.panel.expand()}},onCollapseClick:function(A){this.panel.collapse()},beforeCollapse:function(B,A){this.lastAnim=A;if(this.splitEl){this.splitEl.hide()}this.getCollapsedEl().show();this.panel.el.setStyle("z-index",100);this.isCollapsed=true;this.layout.layout()},onCollapse:function(A){this.panel.el.setStyle("z-index",1);if(this.lastAnim===false||this.panel.animCollapse===false){this.getCollapsedEl().dom.style.visibility="visible"}else{this.getCollapsedEl().slideIn(this.panel.slideAnchor,{duration:0.2})}this.state.collapsed=true;this.panel.saveState()},beforeExpand:function(A){var B=this.getCollapsedEl();this.el.show();if(this.position=="east"||this.position=="west"){this.panel.setSize(undefined,B.getHeight())}else{this.panel.setSize(B.getWidth(),undefined)}B.hide();B.dom.style.visibility="hidden";this.panel.el.setStyle("z-index",100)},onExpand:function(){this.isCollapsed=false;if(this.splitEl){this.splitEl.show()}this.layout.layout();this.panel.el.setStyle("z-index",1);this.state.collapsed=false;this.panel.saveState()},collapseClick:function(A){if(this.isSlid){A.stopPropagation();this.slideIn()}else{A.stopPropagation();this.slideOut()}},onHide:function(){if(this.isCollapsed){this.getCollapsedEl().hide()}else{if(this.splitEl){this.splitEl.hide()}}},onShow:function(){if(this.isCollapsed){this.getCollapsedEl().show()}else{if(this.splitEl){this.splitEl.show()}}},isVisible:function(){return !this.panel.hidden},getMargins:function(){return this.isCollapsed&&this.cmargins?this.cmargins:this.margins},getSize:function(){return this.isCollapsed?this.getCollapsedEl().getSize():this.panel.getSize()},setPanel:function(A){this.panel=A},getMinWidth:function(){return this.minWidth},getMinHeight:function(){return this.minHeight},applyLayoutCollapsed:function(A){var B=this.getCollapsedEl();B.setLeftTop(A.x,A.y);B.setSize(A.width,A.height)},applyLayout:function(A){if(this.isCollapsed){this.applyLayoutCollapsed(A)}else{this.panel.setPosition(A.x,A.y);this.panel.setSize(A.width,A.height)}},beforeSlide:function(){this.panel.beforeEffect()},afterSlide:function(){this.panel.afterEffect()},initAutoHide:function(){if(this.autoHide!==false){if(!this.autoHideHd){var A=new Ext.util.DelayedTask(this.slideIn,this);this.autoHideHd={"mouseout":function(B){if(!B.within(this.el,true)){A.delay(500)}},"mouseover":function(B){A.cancel()},scope:this}}this.el.on(this.autoHideHd)}},clearAutoHide:function(){if(this.autoHide!==false){this.el.un("mouseout",this.autoHideHd.mouseout);this.el.un("mouseover",this.autoHideHd.mouseover)}},clearMonitor:function(){Ext.getDoc().un("click",this.slideInIf,this)},slideOut:function(){if(this.isSlid||this.el.hasActiveFx()){return }this.isSlid=true;var A=this.panel.tools;if(A&&A.toggle){A.toggle.hide()}this.el.show();if(this.position=="east"||this.position=="west"){this.panel.setSize(undefined,this.collapsedEl.getHeight())}else{this.panel.setSize(this.collapsedEl.getWidth(),undefined)}this.restoreLT=[this.el.dom.style.left,this.el.dom.style.top];this.el.alignTo(this.collapsedEl,this.getCollapseAnchor());this.el.setStyle("z-index",102);if(this.animFloat!==false){this.beforeSlide();this.el.slideIn(this.getSlideAnchor(),{callback:function(){this.afterSlide();this.initAutoHide();Ext.getDoc().on("click",this.slideInIf,this)},scope:this,block:true})}else{this.initAutoHide();Ext.getDoc().on("click",this.slideInIf,this)}},afterSlideIn:function(){this.clearAutoHide();this.isSlid=false;this.clearMonitor();this.el.setStyle("z-index","");this.el.dom.style.left=this.restoreLT[0];this.el.dom.style.top=this.restoreLT[1];var A=this.panel.tools;if(A&&A.toggle){A.toggle.show()}},slideIn:function(A){if(!this.isSlid||this.el.hasActiveFx()){Ext.callback(A);return }this.isSlid=false;if(this.animFloat!==false){this.beforeSlide();this.el.slideOut(this.getSlideAnchor(),{callback:function(){this.el.hide();this.afterSlide();this.afterSlideIn();Ext.callback(A)},scope:this,block:true})}else{this.el.hide();this.afterSlideIn()}},slideInIf:function(A){if(!A.within(this.el)){this.slideIn()}},anchors:{"west":"left","east":"right","north":"top","south":"bottom"},sanchors:{"west":"l","east":"r","north":"t","south":"b"},canchors:{"west":"tl-tr","east":"tr-tl","north":"tl-bl","south":"bl-tl"},getAnchor:function(){return this.anchors[this.position]},getCollapseAnchor:function(){return this.canchors[this.position]},getSlideAnchor:function(){return this.sanchors[this.position]},getAlignAdj:function(){var A=this.cmargins;switch(this.position){case"west":return[0,0];break;case"east":return[0,0];break;case"north":return[0,0];break;case"south":return[0,0];break}},getExpandAdj:function(){var B=this.collapsedEl,A=this.cmargins;switch(this.position){case"west":return[-(A.right+B.getWidth()+A.left),0];break;case"east":return[A.right+B.getWidth()+A.left,0];break;case"north":return[0,-(A.top+A.bottom+B.getHeight())];break;case"south":return[0,A.top+A.bottom+B.getHeight()];break}}};Ext.layout.BorderLayout.SplitRegion=function(B,A,C){Ext.layout.BorderLayout.SplitRegion.superclass.constructor.call(this,B,A,C);this.applyLayout=this.applyFns[C]};Ext.extend(Ext.layout.BorderLayout.SplitRegion,Ext.layout.BorderLayout.Region,{splitTip:"Drag to resize.",collapsibleSplitTip:"Drag to resize. Double click to hide.",useSplitTips:false,splitSettings:{north:{orientation:Ext.SplitBar.VERTICAL,placement:Ext.SplitBar.TOP,maxFn:"getVMaxSize",minProp:"minHeight",maxProp:"maxHeight"},south:{orientation:Ext.SplitBar.VERTICAL,placement:Ext.SplitBar.BOTTOM,maxFn:"getVMaxSize",minProp:"minHeight",maxProp:"maxHeight"},east:{orientation:Ext.SplitBar.HORIZONTAL,placement:Ext.SplitBar.RIGHT,maxFn:"getHMaxSize",minProp:"minWidth",maxProp:"maxWidth"},west:{orientation:Ext.SplitBar.HORIZONTAL,placement:Ext.SplitBar.LEFT,maxFn:"getHMaxSize",minProp:"minWidth",maxProp:"maxWidth"}},applyFns:{west:function(C){if(this.isCollapsed){return this.applyLayoutCollapsed(C)}var D=this.splitEl.dom,B=D.style;this.panel.setPosition(C.x,C.y);var A=D.offsetWidth;B.left=(C.x+C.width-A)+"px";B.top=(C.y)+"px";B.height=Math.max(0,C.height)+"px";this.panel.setSize(C.width-A,C.height)},east:function(C){if(this.isCollapsed){return this.applyLayoutCollapsed(C)}var D=this.splitEl.dom,B=D.style;var A=D.offsetWidth;this.panel.setPosition(C.x+A,C.y);B.left=(C.x)+"px";B.top=(C.y)+"px";B.height=Math.max(0,C.height)+"px";this.panel.setSize(C.width-A,C.height)},north:function(C){if(this.isCollapsed){return this.applyLayoutCollapsed(C)}var D=this.splitEl.dom,B=D.style;var A=D.offsetHeight;this.panel.setPosition(C.x,C.y);B.left=(C.x)+"px";B.top=(C.y+C.height-A)+"px";B.width=Math.max(0,C.width)+"px";this.panel.setSize(C.width,C.height-A)},south:function(C){if(this.isCollapsed){return this.applyLayoutCollapsed(C)}var D=this.splitEl.dom,B=D.style;var A=D.offsetHeight;this.panel.setPosition(C.x,C.y+A);B.left=(C.x)+"px";B.top=(C.y)+"px";B.width=Math.max(0,C.width)+"px";this.panel.setSize(C.width,C.height-A)}},render:function(A,C){Ext.layout.BorderLayout.SplitRegion.superclass.render.call(this,A,C);var D=this.position;this.splitEl=A.createChild({cls:"x-layout-split x-layout-split-"+D,html:"&#160;",id:this.panel.id+"-xsplit"});if(this.collapseMode=="mini"){this.miniSplitEl=this.splitEl.createChild({cls:"x-layout-mini x-layout-mini-"+D,html:"&#160;"});this.miniSplitEl.addClassOnOver("x-layout-mini-over");this.miniSplitEl.on("click",this.onCollapseClick,this,{stopEvent:true})}var B=this.splitSettings[D];this.split=new Ext.SplitBar(this.splitEl.dom,C.el,B.orientation);this.split.placement=B.placement;this.split.getMaximumSize=this[B.maxFn].createDelegate(this);this.split.minSize=this.minSize||this[B.minProp];this.split.on("beforeapply",this.onSplitMove,this);this.split.useShim=this.useShim===true;this.maxSize=this.maxSize||this[B.maxProp];if(C.hidden){this.splitEl.hide()}if(this.useSplitTips){this.splitEl.dom.title=this.collapsible?this.collapsibleSplitTip:this.splitTip}if(this.collapsible){this.splitEl.on("dblclick",this.onCollapseClick,this)}},getSize:function(){if(this.isCollapsed){return this.collapsedEl.getSize()}var A=this.panel.getSize();if(this.position=="north"||this.position=="south"){A.height+=this.splitEl.dom.offsetHeight}else{A.width+=this.splitEl.dom.offsetWidth}return A},getHMaxSize:function(){var B=this.maxSize||10000;var A=this.layout.center;return Math.min(B,(this.el.getWidth()+A.el.getWidth())-A.getMinWidth())},getVMaxSize:function(){var B=this.maxSize||10000;var A=this.layout.center;return Math.min(B,(this.el.getHeight()+A.el.getHeight())-A.getMinHeight())},onSplitMove:function(B,A){var C=this.panel.getSize();this.lastSplitSize=A;if(this.position=="north"||this.position=="south"){this.panel.setSize(C.width,A);this.state.height=A}else{this.panel.setSize(A,C.height);this.state.width=A}this.layout.layout();this.panel.saveState();return false},getSplitBar:function(){return this.split}});Ext.Container.LAYOUTS["border"]=Ext.layout.BorderLayout;
Ext.layout.FormLayout=Ext.extend(Ext.layout.AnchorLayout,{labelSeparator:":",getAnchorViewSize:function(A,B){return A.body.getStyleSize()},setContainer:function(B){Ext.layout.FormLayout.superclass.setContainer.call(this,B);if(B.labelAlign){B.addClass("x-form-label-"+B.labelAlign)}if(B.hideLabels){this.labelStyle="display:none";this.elementStyle="padding-left:0;";this.labelAdjust=0}else{this.labelSeparator=B.labelSeparator||this.labelSeparator;B.labelWidth=B.labelWidth||100;if(typeof B.labelWidth=="number"){var C=(typeof B.labelPad=="number"?B.labelPad:5);this.labelAdjust=B.labelWidth+C;this.labelStyle="width:"+B.labelWidth+"px;";this.elementStyle="padding-left:"+(B.labelWidth+C)+"px"}if(B.labelAlign=="top"){this.labelStyle="width:auto;";this.labelAdjust=0;this.elementStyle="padding-left:0;"}}if(!this.fieldTpl){var A=new Ext.Template("<div class=\"x-form-item {5}\" tabIndex=\"-1\">","<label for=\"{0}\" style=\"{2}\" class=\"x-form-item-label\">{1}{4}</label>","<div class=\"x-form-element\" id=\"x-form-el-{0}\" style=\"{3}\">","</div><div class=\"{6}\"></div>","</div>");A.disableFormats=true;A.compile();Ext.layout.FormLayout.prototype.fieldTpl=A}},renderItem:function(D,A,C){if(D&&!D.rendered&&D.isFormField&&D.inputType!="hidden"){var B=[D.id,D.fieldLabel,D.labelStyle||this.labelStyle||"",this.elementStyle||"",typeof D.labelSeparator=="undefined"?this.labelSeparator:D.labelSeparator,(D.itemCls||this.container.itemCls||"")+(D.hideLabel?" x-hide-label":""),D.clearCls||"x-form-clear-left"];if(typeof A=="number"){A=C.dom.childNodes[A]||null}if(A){this.fieldTpl.insertBefore(A,B)}else{this.fieldTpl.append(C,B)}D.render("x-form-el-"+D.id)}else{Ext.layout.FormLayout.superclass.renderItem.apply(this,arguments)}},adjustWidthAnchor:function(B,A){return B-(A.isFormField?(A.hideLabel?0:this.labelAdjust):0)},isValidParent:function(B,A){return true}});Ext.Container.LAYOUTS["form"]=Ext.layout.FormLayout;
Ext.layout.Accordion=Ext.extend(Ext.layout.FitLayout,{fill:true,autoWidth:true,titleCollapse:true,hideCollapseTool:false,collapseFirst:false,animate:false,sequence:false,activeOnTop:false,renderItem:function(A){if(this.animate===false){A.animCollapse=false}A.collapsible=true;if(this.autoWidth){A.autoWidth=true}if(this.titleCollapse){A.titleCollapse=true}if(this.hideCollapseTool){A.hideCollapseTool=true}if(this.collapseFirst!==undefined){A.collapseFirst=this.collapseFirst}if(!this.activeItem&&!A.collapsed){this.activeItem=A}else{if(this.activeItem){A.collapsed=true}}Ext.layout.Accordion.superclass.renderItem.apply(this,arguments);A.header.addClass("x-accordion-hd");A.on("beforeexpand",this.beforeExpand,this)},beforeExpand:function(C,B){var A=this.activeItem;if(A){if(this.sequence){delete this.activeItem;A.collapse({callback:function(){C.expand(B||true)},scope:this});return false}else{A.collapse(this.animate)}}this.activeItem=C;if(this.activeOnTop){C.el.dom.parentNode.insertBefore(C.el.dom,C.el.dom.parentNode.firstChild)}this.layout()},setItemSize:function(F,E){if(this.fill&&F){var B=this.container.items.items;var D=0;for(var C=0,A=B.length;C<A;C++){var G=B[C];if(G!=F){D+=(G.getSize().height-G.bwrap.getHeight())}}E.height-=D;F.setSize(E)}}});Ext.Container.LAYOUTS["accordion"]=Ext.layout.Accordion;
Ext.layout.TableLayout=Ext.extend(Ext.layout.ContainerLayout,{monitorResize:false,setContainer:function(A){Ext.layout.TableLayout.superclass.setContainer.call(this,A);this.currentRow=0;this.currentColumn=0;this.cells=[]},onLayout:function(C,E){var D=C.items.items,A=D.length,F,B;if(!this.table){E.addClass("x-table-layout-ct");this.table=E.createChild({tag:"table",cls:"x-table-layout",cellspacing:0,cn:{tag:"tbody"}},null,true);this.renderAll(C,E)}},getRow:function(A){var B=this.table.tBodies[0].childNodes[A];if(!B){B=document.createElement("tr");this.table.tBodies[0].appendChild(B)}return B},getNextCell:function(H){var A=this.getNextNonSpan(this.currentColumn,this.currentRow);var E=this.currentColumn=A[0],D=this.currentRow=A[1];for(var G=D;G<D+(H.rowspan||1);G++){if(!this.cells[G]){this.cells[G]=[]}for(var C=E;C<E+(H.colspan||1);C++){this.cells[G][C]=true}}var F=document.createElement("td");if(H.cellId){F.id=H.cellId}var B="x-table-layout-cell";if(H.cellCls){B+=" "+H.cellCls}F.className=B;if(H.colspan){F.colSpan=H.colspan}if(H.rowspan){F.rowSpan=H.rowspan}this.getRow(D).appendChild(F);return F},getNextNonSpan:function(A,C){var B=this.columns;while((B&&A>=B)||(this.cells[C]&&this.cells[C][A])){if(B&&A>=B){C++;A=0}else{A++}}return[A,C]},renderItem:function(C,A,B){if(C&&!C.rendered){C.render(this.getNextCell(C))}},isValidParent:function(B,A){return true}});Ext.Container.LAYOUTS["table"]=Ext.layout.TableLayout;
Ext.layout.AbsoluteLayout=Ext.extend(Ext.layout.AnchorLayout,{extraCls:"x-abs-layout-item",isForm:false,setContainer:function(A){Ext.layout.AbsoluteLayout.superclass.setContainer.call(this,A);if(A.isXType("form")){this.isForm=true}},onLayout:function(A,B){if(this.isForm){A.body.position()}else{B.position()}Ext.layout.AbsoluteLayout.superclass.onLayout.call(this,A,B)},getAnchorViewSize:function(A,B){return this.isForm?A.body.getStyleSize():Ext.layout.AbsoluteLayout.superclass.getAnchorViewSize.call(this,A,B)},isValidParent:function(B,A){return this.isForm?true:Ext.layout.AbsoluteLayout.superclass.isValidParent.call(this,B,A)},adjustWidthAnchor:function(B,A){return B?B-A.getPosition(true)[0]:B},adjustHeightAnchor:function(B,A){return B?B-A.getPosition(true)[1]:B}});Ext.Container.LAYOUTS["absolute"]=Ext.layout.AbsoluteLayout;
Ext.Viewport=Ext.extend(Ext.Container,{initComponent:function(){Ext.Viewport.superclass.initComponent.call(this);document.getElementsByTagName("html")[0].className+=" x-viewport";this.el=Ext.getBody();this.el.setHeight=Ext.emptyFn;this.el.setWidth=Ext.emptyFn;this.el.setSize=Ext.emptyFn;this.el.dom.scroll="no";this.allowDomMove=false;this.autoWidth=true;this.autoHeight=true;Ext.EventManager.onWindowResize(this.fireResize,this);this.renderTo=this.el},fireResize:function(A,B){this.fireEvent("resize",this,A,B,A,B)}});Ext.reg("viewport",Ext.Viewport);
Ext.Panel=Ext.extend(Ext.Container,{baseCls:"x-panel",collapsedCls:"x-panel-collapsed",maskDisabled:true,animCollapse:Ext.enableFx,headerAsText:true,buttonAlign:"right",collapsed:false,collapseFirst:true,minButtonWidth:75,elements:"body",toolTarget:"header",collapseEl:"bwrap",slideAnchor:"t",deferHeight:true,expandDefaults:{duration:0.25},collapseDefaults:{duration:0.25},initComponent:function(){Ext.Panel.superclass.initComponent.call(this);this.addEvents("bodyresize","titlechange","collapse","expand","beforecollapse","beforeexpand","beforeclose","close","activate","deactivate");if(this.tbar){this.elements+=",tbar";if(typeof this.tbar=="object"){this.topToolbar=this.tbar}delete this.tbar}if(this.bbar){this.elements+=",bbar";if(typeof this.bbar=="object"){this.bottomToolbar=this.bbar}delete this.bbar}if(this.header===true){this.elements+=",header";delete this.header}else{if(this.title&&this.header!==false){this.elements+=",header"}}if(this.footer===true){this.elements+=",footer";delete this.footer}if(this.buttons){var C=this.buttons;this.buttons=[];for(var B=0,A=C.length;B<A;B++){if(C[B].render){this.buttons.push(C[B])}else{this.addButton(C[B])}}}if(this.autoLoad){this.on("render",this.doAutoLoad,this,{delay:10})}},createElement:function(A,C){if(this[A]){C.appendChild(this[A].dom);return }if(A==="bwrap"||this.elements.indexOf(A)!=-1){if(this[A+"Cfg"]){this[A]=Ext.fly(C).createChild(this[A+"Cfg"])}else{var B=document.createElement("div");B.className=this[A+"Cls"];this[A]=Ext.get(C.appendChild(B))}}},onRender:function(H,G){Ext.Panel.superclass.onRender.call(this,H,G);this.createClasses();if(this.el){this.el.addClass(this.baseCls);this.header=this.el.down("."+this.headerCls);this.bwrap=this.el.down("."+this.bwrapCls);var M=this.bwrap?this.bwrap:this.el;this.tbar=M.down("."+this.tbarCls);this.body=M.down("."+this.bodyCls);this.bbar=M.down("."+this.bbarCls);this.footer=M.down("."+this.footerCls);this.fromMarkup=true}else{this.el=H.createChild({id:this.id,cls:this.baseCls},G)}var A=this.el,K=A.dom;if(this.cls){this.el.addClass(this.cls)}if(this.buttons){this.elements+=",footer"}if(this.frame){A.insertHtml("afterBegin",String.format(Ext.Element.boxMarkup,this.baseCls));this.createElement("header",K.firstChild.firstChild.firstChild);this.createElement("bwrap",K);var O=this.bwrap.dom;var E=K.childNodes[1],B=K.childNodes[2];O.appendChild(E);O.appendChild(B);var P=O.firstChild.firstChild.firstChild;this.createElement("tbar",P);this.createElement("body",P);this.createElement("bbar",P);this.createElement("footer",O.lastChild.firstChild.firstChild);if(!this.footer){this.bwrap.dom.lastChild.className+=" x-panel-nofooter"}}else{this.createElement("header",K);this.createElement("bwrap",K);var O=this.bwrap.dom;this.createElement("tbar",O);this.createElement("body",O);this.createElement("bbar",O);this.createElement("footer",O);if(!this.header){this.body.addClass(this.bodyCls+"-noheader");if(this.tbar){this.tbar.addClass(this.tbarCls+"-noheader")}}}if(this.border===false){this.el.addClass(this.baseCls+"-noborder");this.body.addClass(this.bodyCls+"-noborder");if(this.header){this.header.addClass(this.headerCls+"-noborder")}if(this.footer){this.footer.addClass(this.footerCls+"-noborder")}if(this.tbar){this.tbar.addClass(this.tbarCls+"-noborder")}if(this.bbar){this.bbar.addClass(this.bbarCls+"-noborder")}}if(this.bodyBorder===false){this.body.addClass(this.bodyCls+"-noborder")}if(this.bodyStyle){this.body.applyStyles(this.bodyStyle)}this.bwrap.enableDisplayMode("block");if(this.header){this.header.unselectable();if(this.headerAsText){this.header.dom.innerHTML="<span class=\""+this.headerTextCls+"\">"+this.header.dom.innerHTML+"</span>";if(this.iconCls){this.setIconClass(this.iconCls)}}}if(this.floating){this.makeFloating(this.floating)}if(this.collapsible){this.tools=this.tools?this.tools.slice(0):[];if(!this.hideCollapseTool){this.tools[this.collapseFirst?"unshift":"push"]({id:"toggle",handler:this.toggleCollapse,scope:this})}if(this.titleCollapse&&this.header){this.header.on("click",this.toggleCollapse,this);this.header.setStyle("cursor","pointer")}}if(this.tools){var J=this.tools;this.tools={};this.addTool.apply(this,J)}else{this.tools={}}if(this.buttons&&this.buttons.length>0){var D=this.footer.createChild({cls:"x-panel-btns-ct",cn:{cls:"x-panel-btns x-panel-btns-"+this.buttonAlign,html:"<table cellspacing=\"0\"><tbody><tr></tr></tbody></table><div class=\"x-clear\"></div>"}},null,true);var L=D.getElementsByTagName("tr")[0];for(var F=0,I=this.buttons.length;F<I;F++){var N=this.buttons[F];var C=document.createElement("td");C.className="x-panel-btn-td";N.render(L.appendChild(C))}}if(this.tbar&&this.topToolbar){if(Ext.isArray(this.topToolbar)){this.topToolbar=new Ext.Toolbar(this.topToolbar)}this.topToolbar.render(this.tbar)}if(this.bbar&&this.bottomToolbar){if(Ext.isArray(this.bottomToolbar)){this.bottomToolbar=new Ext.Toolbar(this.bottomToolbar)}this.bottomToolbar.render(this.bbar)}},setIconClass:function(B){var A=this.iconCls;this.iconCls=B;if(this.rendered&&this.header){if(this.frame){this.header.addClass("x-panel-icon");this.header.replaceClass(A,this.iconCls)}else{var D=this.header.dom;var C=D.firstChild&&String(D.firstChild.tagName).toLowerCase()=="img"?D.firstChild:null;if(C){Ext.fly(C).replaceClass(A,this.iconCls)}else{Ext.DomHelper.insertBefore(D.firstChild,{tag:"img",src:Ext.BLANK_IMAGE_URL,cls:"x-panel-inline-icon "+this.iconCls})}}}},makeFloating:function(A){this.floating=true;this.el=new Ext.Layer(typeof A=="object"?A:{shadow:this.shadow!==undefined?this.shadow:"sides",shadowOffset:this.shadowOffset,constrain:false,shim:this.shim===false?false:undefined},this.el)},getTopToolbar:function(){return this.topToolbar},getBottomToolbar:function(){return this.bottomToolbar},addButton:function(A,D,C){var E={handler:D,scope:C,minWidth:this.minButtonWidth,hideParent:true};if(typeof A=="string"){E.text=A}else{Ext.apply(E,A)}var B=new Ext.Button(E);B.ownerCt=this;if(!this.buttons){this.buttons=[]}this.buttons.push(B);return B},addTool:function(){if(!this[this.toolTarget]){return }if(!this.toolTemplate){var F=new Ext.Template("<div class=\"x-tool x-tool-{id}\">&#160;</div>");F.disableFormats=true;F.compile();Ext.Panel.prototype.toolTemplate=F}for(var E=0,C=arguments,B=C.length;E<B;E++){var A=C[E],G="x-tool-"+A.id+"-over";var D=this.toolTemplate.insertFirst(this[this.toolTarget],A,true);this.tools[A.id]=D;D.enableDisplayMode("block");D.on("click",this.createToolHandler(D,A,G,this));if(A.on){D.on(A.on)}if(A.hidden){D.hide()}if(A.qtip){if(typeof A.qtip=="object"){Ext.QuickTips.register(Ext.apply({target:D.id},A.qtip))}else{D.dom.qtip=A.qtip}}D.addClassOnOver(G)}},onShow:function(){if(this.floating){return this.el.show()}Ext.Panel.superclass.onShow.call(this)},onHide:function(){if(this.floating){return this.el.hide()}Ext.Panel.superclass.onHide.call(this)},createToolHandler:function(C,A,D,B){return function(E){C.removeClass(D);E.stopEvent();if(A.handler){A.handler.call(A.scope||C,E,C,B)}}},afterRender:function(){if(this.fromMarkup&&this.height===undefined&&!this.autoHeight){this.height=this.el.getHeight()}if(this.floating&&!this.hidden&&!this.initHidden){this.el.show()}if(this.title){this.setTitle(this.title)}this.setAutoScroll();if(this.html){this.body.update(typeof this.html=="object"?Ext.DomHelper.markup(this.html):this.html);delete this.html}if(this.contentEl){var A=Ext.getDom(this.contentEl);Ext.fly(A).removeClass(["x-hidden","x-hide-display"]);this.body.dom.appendChild(A)}if(this.collapsed){this.collapsed=false;this.collapse(false)}Ext.Panel.superclass.afterRender.call(this);this.initEvents()},setAutoScroll:function(){if(this.rendered&&this.autoScroll){this.body.setOverflow("auto")}},getKeyMap:function(){if(!this.keyMap){this.keyMap=new Ext.KeyMap(this.el,this.keys)}return this.keyMap},initEvents:function(){if(this.keys){this.getKeyMap()}if(this.draggable){this.initDraggable()}},initDraggable:function(){this.dd=new Ext.Panel.DD(this,typeof this.draggable=="boolean"?null:this.draggable)},beforeEffect:function(){if(this.floating){this.el.beforeAction()}this.el.addClass("x-panel-animated")},afterEffect:function(){this.syncShadow();this.el.removeClass("x-panel-animated")},createEffect:function(B,A,C){var D={scope:C,block:true};if(B===true){D.callback=A;return D}else{if(!B.callback){D.callback=A}else{D.callback=function(){A.call(C);Ext.callback(B.callback,B.scope)}}}return Ext.applyIf(D,B)},collapse:function(B){if(this.collapsed||this.el.hasFxBlock()||this.fireEvent("beforecollapse",this,B)===false){return }var A=B===true||(B!==false&&this.animCollapse);this.beforeEffect();this.onCollapse(A,B);return this},onCollapse:function(A,B){if(A){this[this.collapseEl].slideOut(this.slideAnchor,Ext.apply(this.createEffect(B||true,this.afterCollapse,this),this.collapseDefaults))}else{this[this.collapseEl].hide();this.afterCollapse()}},afterCollapse:function(){this.collapsed=true;this.el.addClass(this.collapsedCls);this.afterEffect();this.fireEvent("collapse",this)},expand:function(B){if(!this.collapsed||this.el.hasFxBlock()||this.fireEvent("beforeexpand",this,B)===false){return }var A=B===true||(B!==false&&this.animCollapse);this.el.removeClass(this.collapsedCls);this.beforeEffect();this.onExpand(A,B);return this},onExpand:function(A,B){if(A){this[this.collapseEl].slideIn(this.slideAnchor,Ext.apply(this.createEffect(B||true,this.afterExpand,this),this.expandDefaults))}else{this[this.collapseEl].show();this.afterExpand()}},afterExpand:function(){this.collapsed=false;this.afterEffect();this.fireEvent("expand",this)},toggleCollapse:function(A){this[this.collapsed?"expand":"collapse"](A);return this},onDisable:function(){if(this.rendered&&this.maskDisabled){this.el.mask()}Ext.Panel.superclass.onDisable.call(this)},onEnable:function(){if(this.rendered&&this.maskDisabled){this.el.unmask()}Ext.Panel.superclass.onEnable.call(this)},onResize:function(A,B){if(A!==undefined||B!==undefined){if(!this.collapsed){if(typeof A=="number"){this.body.setWidth(this.adjustBodyWidth(A-this.getFrameWidth()))}else{if(A=="auto"){this.body.setWidth(A)}}if(typeof B=="number"){this.body.setHeight(this.adjustBodyHeight(B-this.getFrameHeight()))}else{if(B=="auto"){this.body.setHeight(B)}}}else{this.queuedBodySize={width:A,height:B};if(!this.queuedExpand&&this.allowQueuedExpand!==false){this.queuedExpand=true;this.on("expand",function(){delete this.queuedExpand;this.onResize(this.queuedBodySize.width,this.queuedBodySize.height);this.doLayout()},this,{single:true})}}this.fireEvent("bodyresize",this,A,B)}this.syncShadow()},adjustBodyHeight:function(A){return A},adjustBodyWidth:function(A){return A},onPosition:function(){this.syncShadow()},onDestroy:function(){if(this.tools){for(var B in this.tools){Ext.destroy(this.tools[B])}}if(this.buttons){for(var A in this.buttons){Ext.destroy(this.buttons[A])}}Ext.destroy(this.topToolbar,this.bottomToolbar);Ext.Panel.superclass.onDestroy.call(this)},getFrameWidth:function(){var B=this.el.getFrameWidth("lr");if(this.frame){var A=this.bwrap.dom.firstChild;B+=(Ext.fly(A).getFrameWidth("l")+Ext.fly(A.firstChild).getFrameWidth("r"));var C=this.bwrap.dom.firstChild.firstChild.firstChild;B+=Ext.fly(C).getFrameWidth("lr")}return B},getFrameHeight:function(){var A=this.el.getFrameWidth("tb");A+=(this.tbar?this.tbar.getHeight():0)+(this.bbar?this.bbar.getHeight():0);if(this.frame){var C=this.el.dom.firstChild;var D=this.bwrap.dom.lastChild;A+=(C.offsetHeight+D.offsetHeight);var B=this.bwrap.dom.firstChild.firstChild.firstChild;A+=Ext.fly(B).getFrameWidth("tb")}else{A+=(this.header?this.header.getHeight():0)+(this.footer?this.footer.getHeight():0)}return A},getInnerWidth:function(){return this.getSize().width-this.getFrameWidth()},getInnerHeight:function(){return this.getSize().height-this.getFrameHeight()},syncShadow:function(){if(this.floating){this.el.sync(true)}},getLayoutTarget:function(){return this.body},setTitle:function(B,A){this.title=B;if(this.header&&this.headerAsText){this.header.child("span").update(B)}if(A){this.setIconClass(A)}this.fireEvent("titlechange",this,B);return this},getUpdater:function(){return this.body.getUpdater()},load:function(){var A=this.body.getUpdater();A.update.apply(A,arguments);return this},beforeDestroy:function(){Ext.Element.uncache(this.header,this.tbar,this.bbar,this.footer,this.body)},createClasses:function(){this.headerCls=this.baseCls+"-header";this.headerTextCls=this.baseCls+"-header-text";this.bwrapCls=this.baseCls+"-bwrap";this.tbarCls=this.baseCls+"-tbar";this.bodyCls=this.baseCls+"-body";this.bbarCls=this.baseCls+"-bbar";this.footerCls=this.baseCls+"-footer"},createGhost:function(A,E,B){var D=document.createElement("div");D.className="x-panel-ghost "+(A?A:"");if(this.header){D.appendChild(this.el.dom.firstChild.cloneNode(true))}Ext.fly(D.appendChild(document.createElement("ul"))).setHeight(this.bwrap.getHeight());D.style.width=this.el.dom.offsetWidth+"px";if(!B){this.container.dom.appendChild(D)}else{Ext.getDom(B).appendChild(D)}if(E!==false&&this.el.useShim!==false){var C=new Ext.Layer({shadow:false,useDisplay:true,constrain:false},D);C.show();return C}else{return new Ext.Element(D)}},doAutoLoad:function(){this.body.load(typeof this.autoLoad=="object"?this.autoLoad:{url:this.autoLoad})}});Ext.reg("panel",Ext.Panel);
Ext.Window=Ext.extend(Ext.Panel,{baseCls:"x-window",resizable:true,draggable:true,closable:true,constrain:false,constrainHeader:false,plain:false,minimizable:false,maximizable:false,minHeight:100,minWidth:200,expandOnShow:true,closeAction:"close",collapsible:false,initHidden:true,monitorResize:true,elements:"header,body",frame:true,floating:true,initComponent:function(){Ext.Window.superclass.initComponent.call(this);this.addEvents("resize","maximize","minimize","restore")},getState:function(){return Ext.apply(Ext.Window.superclass.getState.call(this)||{},this.getBox())},onRender:function(B,A){Ext.Window.superclass.onRender.call(this,B,A);if(this.plain){this.el.addClass("x-window-plain")}this.focusEl=this.el.createChild({tag:"a",href:"#",cls:"x-dlg-focus",tabIndex:"-1",html:"&#160;"});this.focusEl.swallowEvent("click",true);this.proxy=this.el.createProxy("x-window-proxy");this.proxy.enableDisplayMode("block");if(this.modal){this.mask=this.container.createChild({cls:"ext-el-mask"},this.el.dom);this.mask.enableDisplayMode("block");this.mask.hide()}},initEvents:function(){Ext.Window.superclass.initEvents.call(this);if(this.animateTarget){this.setAnimateTarget(this.animateTarget)}if(this.resizable){this.resizer=new Ext.Resizable(this.el,{minWidth:this.minWidth,minHeight:this.minHeight,handles:this.resizeHandles||"all",pinned:true,resizeElement:this.resizerAction});this.resizer.window=this;this.resizer.on("beforeresize",this.beforeResize,this)}if(this.draggable){this.header.addClass("x-window-draggable")}this.initTools();this.el.on("mousedown",this.toFront,this);this.manager=this.manager||Ext.WindowMgr;this.manager.register(this);this.hidden=true;if(this.maximized){this.maximized=false;this.maximize()}if(this.closable){var A=this.getKeyMap();A.on(27,this.onEsc,this);A.disable()}},initDraggable:function(){this.dd=new Ext.Window.DD(this)},onEsc:function(){this[this.closeAction]()},beforeDestroy:function(){Ext.destroy(this.resizer,this.dd,this.proxy,this.mask);Ext.Window.superclass.beforeDestroy.call(this)},onDestroy:function(){if(this.manager){this.manager.unregister(this)}Ext.Window.superclass.onDestroy.call(this)},initTools:function(){if(this.minimizable){this.addTool({id:"minimize",handler:this.minimize.createDelegate(this,[])})}if(this.maximizable){this.addTool({id:"maximize",handler:this.maximize.createDelegate(this,[])});this.addTool({id:"restore",handler:this.restore.createDelegate(this,[]),hidden:true});this.header.on("dblclick",this.toggleMaximize,this)}if(this.closable){this.addTool({id:"close",handler:this[this.closeAction].createDelegate(this,[])})}},resizerAction:function(){var A=this.proxy.getBox();this.proxy.hide();this.window.handleResize(A);return A},beforeResize:function(){this.resizer.minHeight=Math.max(this.minHeight,this.getFrameHeight()+40);this.resizer.minWidth=Math.max(this.minWidth,this.getFrameWidth()+40);this.resizeBox=this.el.getBox()},updateHandles:function(){if(Ext.isIE&&this.resizer){this.resizer.syncHandleHeight();this.el.repaint()}},handleResize:function(B){var A=this.resizeBox;if(A.x!=B.x||A.y!=B.y){this.updateBox(B)}else{this.setSize(B)}this.focus();this.updateHandles();this.saveState();this.fireEvent("resize",this,B.width,B.height)},focus:function(){var C=this.focusEl,A=this.defaultButton,B=typeof A;if(B!="undefined"){if(B=="number"){C=this.buttons[A]}else{if(B=="string"){C=Ext.getCmp(A)}else{C=A}}}C.focus.defer(10,C)},setAnimateTarget:function(A){A=Ext.get(A);this.animateTarget=A},beforeShow:function(){delete this.el.lastXY;delete this.el.lastLT;if(this.x===undefined||this.y===undefined){var A=this.el.getAlignToXY(this.container,"c-c");var B=this.el.translatePoints(A[0],A[1]);this.x=this.x===undefined?B.left:this.x;this.y=this.y===undefined?B.top:this.y}this.el.setLeftTop(this.x,this.y);if(this.expandOnShow){this.expand(false)}if(this.modal){Ext.getBody().addClass("x-body-masked");this.mask.setSize(Ext.lib.Dom.getViewWidth(true),Ext.lib.Dom.getViewHeight(true));this.mask.show()}},show:function(C,A,B){if(!this.rendered){this.render(Ext.getBody())}if(this.hidden===false){this.toFront();return }if(this.fireEvent("beforeshow",this)===false){return }if(A){this.on("show",A,B,{single:true})}this.hidden=false;if(C!==undefined){this.setAnimateTarget(C)}this.beforeShow();if(this.animateTarget){this.animShow()}else{this.afterShow()}},afterShow:function(){this.proxy.hide();this.el.setStyle("display","block");this.el.show();if(this.maximized){this.fitContainer()}if(Ext.isMac&&Ext.isGecko){this.cascade(this.setAutoScroll)}if(this.monitorResize||this.modal||this.constrain||this.constrainHeader){Ext.EventManager.onWindowResize(this.onWindowResize,this)}this.doConstrain();if(this.layout){this.doLayout()}if(this.keyMap){this.keyMap.enable()}this.toFront();this.updateHandles();this.fireEvent("show",this)},animShow:function(){this.proxy.show();this.proxy.setBox(this.animateTarget.getBox());this.proxy.setOpacity(0);var A=this.getBox(false);A.callback=this.afterShow;A.scope=this;A.duration=0.25;A.easing="easeNone";A.opacity=0.5;A.block=true;this.el.setStyle("display","none");this.proxy.shift(A)},hide:function(C,A,B){if(this.hidden||this.fireEvent("beforehide",this)===false){return }if(A){this.on("hide",A,B,{single:true})}this.hidden=true;if(C!==undefined){this.setAnimateTarget(C)}if(this.animateTarget){this.animHide()}else{this.el.hide();this.afterHide()}},afterHide:function(){this.proxy.hide();if(this.monitorResize||this.modal||this.constrain||this.constrainHeader){Ext.EventManager.removeResizeListener(this.onWindowResize,this)}if(this.modal){this.mask.hide();Ext.getBody().removeClass("x-body-masked")}if(this.keyMap){this.keyMap.disable()}this.fireEvent("hide",this)},animHide:function(){this.proxy.setOpacity(0.5);this.proxy.show();var B=this.getBox(false);this.proxy.setBox(B);this.el.hide();var A=this.animateTarget.getBox();A.callback=this.afterHide;A.scope=this;A.duration=0.25;A.easing="easeNone";A.block=true;A.opacity=0;this.proxy.shift(A)},onWindowResize:function(){if(this.maximized){this.fitContainer()}if(this.modal){this.mask.setSize("100%","100%");var A=this.mask.dom.offsetHeight;this.mask.setSize(Ext.lib.Dom.getViewWidth(true),Ext.lib.Dom.getViewHeight(true))}this.doConstrain()},doConstrain:function(){if(this.constrain||this.constrainHeader){var B;if(this.constrain){B={right:this.el.shadowOffset,left:this.el.shadowOffset,bottom:this.el.shadowOffset}}else{var A=this.getSize();B={right:-(A.width-100),bottom:-(A.height-25)}}var C=this.el.getConstrainToXY(this.container,true,B);if(C){this.setPosition(C[0],C[1])}}},ghost:function(A){var C=this.createGhost(A);var B=this.getBox(true);C.setLeftTop(B.x,B.y);C.setWidth(B.width);this.el.hide();this.activeGhost=C;return C},unghost:function(B,A){if(B!==false){this.el.show();this.focus();if(Ext.isMac&&Ext.isGecko){this.cascade(this.setAutoScroll)}}if(A!==false){this.setPosition(this.activeGhost.getLeft(true),this.activeGhost.getTop(true))}this.activeGhost.hide();this.activeGhost.remove();delete this.activeGhost},minimize:function(){this.fireEvent("minimize",this)},close:function(){if(this.fireEvent("beforeclose",this)!==false){this.hide(null,function(){this.fireEvent("close",this);this.destroy()},this)}},maximize:function(){if(!this.maximized){this.expand(false);this.restoreSize=this.getSize();this.restorePos=this.getPosition(true);this.tools.maximize.hide();this.tools.restore.show();this.maximized=true;this.el.disableShadow();if(this.dd){this.dd.lock()}if(this.collapsible){this.tools.toggle.hide()}this.el.addClass("x-window-maximized");this.container.addClass("x-window-maximized-ct");this.setPosition(0,0);this.fitContainer();this.fireEvent("maximize",this)}},restore:function(){if(this.maximized){this.el.removeClass("x-window-maximized");this.tools.restore.hide();this.tools.maximize.show();this.setPosition(this.restorePos[0],this.restorePos[1]);this.setSize(this.restoreSize.width,this.restoreSize.height);delete this.restorePos;delete this.restoreSize;this.maximized=false;this.el.enableShadow(true);if(this.dd){this.dd.unlock()}if(this.collapsible){this.tools.toggle.show()}this.container.removeClass("x-window-maximized-ct");this.doConstrain();this.fireEvent("restore",this)}},toggleMaximize:function(){this[this.maximized?"restore":"maximize"]()},fitContainer:function(){var A=this.container.getViewSize();this.setSize(A.width,A.height)},setZIndex:function(A){if(this.modal){this.mask.setStyle("z-index",A)}this.el.setZIndex(++A);A+=5;if(this.resizer){this.resizer.proxy.setStyle("z-index",++A)}this.lastZIndex=A},alignTo:function(B,A,C){var D=this.el.getAlignToXY(B,A,C);this.setPagePosition(D[0],D[1]);return this},anchorTo:function(C,G,D,B,F){var E=function(){this.alignTo(C,G,D)};Ext.EventManager.onWindowResize(E,this);var A=typeof B;if(A!="undefined"){Ext.EventManager.on(window,"scroll",E,this,{buffer:A=="number"?B:50})}E.call(this);this[F]=E;return this},toFront:function(){if(this.manager.bringToFront(this)){this.focus()}return this},setActive:function(A){if(A){if(!this.maximized){this.el.enableShadow(true)}this.fireEvent("activate",this)}else{this.el.disableShadow();this.fireEvent("deactivate",this)}},toBack:function(){this.manager.sendToBack(this);return this},center:function(){var A=this.el.getAlignToXY(this.container,"c-c");this.setPagePosition(A[0],A[1]);return this}});Ext.reg("window",Ext.Window);Ext.Window.DD=function(A){this.win=A;Ext.Window.DD.superclass.constructor.call(this,A.el.id,"WindowDD-"+A.id);this.setHandleElId(A.header.id);this.scroll=false};Ext.extend(Ext.Window.DD,Ext.dd.DD,{moveOnly:true,headerOffsets:[100,25],startDrag:function(){var A=this.win;this.proxy=A.ghost();if(A.constrain!==false){var C=A.el.shadowOffset;this.constrainTo(A.container,{right:C,left:C,bottom:C})}else{if(A.constrainHeader!==false){var B=this.proxy.getSize();this.constrainTo(A.container,{right:-(B.width-this.headerOffsets[0]),bottom:-(B.height-this.headerOffsets[1])})}}},b4Drag:Ext.emptyFn,onDrag:function(A){this.alignElWithMouse(this.proxy,A.getPageX(),A.getPageY())},endDrag:function(A){this.win.unghost();this.win.saveState()}});
Ext.WindowGroup=function(){var F={};var D=[];var E=null;var C=function(I,H){return(!I._lastAccess||I._lastAccess<H._lastAccess)?-1:1};var G=function(){var J=D,H=J.length;if(H>0){J.sort(C);var I=J[0].manager.zseed;for(var K=0;K<H;K++){var L=J[K];if(L&&!L.hidden){L.setZIndex(I+(K*10))}}}A()};var B=function(H){if(H!=E){if(E){E.setActive(false)}E=H;if(H){H.setActive(true)}}};var A=function(){for(var H=D.length-1;H>=0;--H){if(!D[H].hidden){B(D[H]);return }}B(null)};return{zseed:9000,register:function(H){F[H.id]=H;D.push(H);H.on("hide",A)},unregister:function(H){delete F[H.id];H.un("hide",A);D.remove(H)},get:function(H){return typeof H=="object"?H:F[H]},bringToFront:function(H){H=this.get(H);if(H!=E){H._lastAccess=new Date().getTime();G();return true}return false},sendToBack:function(H){H=this.get(H);H._lastAccess=-(new Date().getTime());G();return H},hideAll:function(){for(var H in F){if(F[H]&&typeof F[H]!="function"&&F[H].isVisible()){F[H].hide()}}},getActive:function(){return E},getBy:function(J,I){var K=[];for(var H=D.length-1;H>=0;--H){var L=D[H];if(J.call(I||L,L)!==false){K.push(L)}}return K},each:function(I,H){for(var J in F){if(F[J]&&typeof F[J]!="function"){if(I.call(H||F[J],F[J])===false){return }}}}}};Ext.WindowMgr=new Ext.WindowGroup();
Ext.dd.PanelProxy=function(A,B){this.panel=A;this.id=this.panel.id+"-ddproxy";Ext.apply(this,B)};Ext.dd.PanelProxy.prototype={insertProxy:true,setStatus:Ext.emptyFn,reset:Ext.emptyFn,update:Ext.emptyFn,stop:Ext.emptyFn,sync:Ext.emptyFn,getEl:function(){return this.ghost},getGhost:function(){return this.ghost},getProxy:function(){return this.proxy},hide:function(){if(this.ghost){if(this.proxy){this.proxy.remove();delete this.proxy}this.panel.el.dom.style.display="";this.ghost.remove();delete this.ghost}},show:function(){if(!this.ghost){this.ghost=this.panel.createGhost(undefined,undefined,Ext.getBody());this.ghost.setXY(this.panel.el.getXY());if(this.insertProxy){this.proxy=this.panel.el.insertSibling({cls:"x-panel-dd-spacer"});this.proxy.setSize(this.panel.getSize())}this.panel.el.dom.style.display="none"}},repair:function(B,C,A){this.hide();if(typeof C=="function"){C.call(A||this)}},moveProxy:function(A,B){if(this.proxy){A.insertBefore(this.proxy.dom,B)}}};Ext.Panel.DD=function(B,A){this.panel=B;this.dragData={panel:B};this.proxy=new Ext.dd.PanelProxy(B,A);Ext.Panel.DD.superclass.constructor.call(this,B.el,A);this.setHandleElId(B.header.id);B.header.setStyle("cursor","move");this.scroll=false};Ext.extend(Ext.Panel.DD,Ext.dd.DragSource,{showFrame:Ext.emptyFn,startDrag:Ext.emptyFn,b4StartDrag:function(A,B){this.proxy.show()},b4MouseDown:function(B){var A=B.getPageX();var C=B.getPageY();this.autoOffset(A,C)},onInitDrag:function(A,B){this.onStartDrag(A,B);return true},createFrame:Ext.emptyFn,getDragEl:function(A){return this.proxy.ghost.dom},endDrag:function(A){this.proxy.hide();this.panel.saveState()},autoOffset:function(A,B){A-=this.startPageX;B-=this.startPageY;this.setDelta(A,B)}});
Ext.state.Provider=function(){this.addEvents("statechange");this.state={};Ext.state.Provider.superclass.constructor.call(this)};Ext.extend(Ext.state.Provider,Ext.util.Observable,{get:function(B,A){return typeof this.state[B]=="undefined"?A:this.state[B]},clear:function(A){delete this.state[A];this.fireEvent("statechange",this,A,null)},set:function(A,B){this.state[A]=B;this.fireEvent("statechange",this,A,B)},decodeValue:function(A){var J=/^(a|n|d|b|s|o)\:(.*)$/;var C=J.exec(unescape(A));if(!C||!C[1]){return }var F=C[1];var H=C[2];switch(F){case"n":return parseFloat(H);case"d":return new Date(Date.parse(H));case"b":return(H=="1");case"a":var G=[];var I=H.split("^");for(var B=0,D=I.length;B<D;B++){G.push(this.decodeValue(I[B]))}return G;case"o":var G={};var I=H.split("^");for(var B=0,D=I.length;B<D;B++){var E=I[B].split("=");G[E[0]]=this.decodeValue(E[1])}return G;default:return H}},encodeValue:function(C){var B;if(typeof C=="number"){B="n:"+C}else{if(typeof C=="boolean"){B="b:"+(C?"1":"0")}else{if(Ext.isDate(C)){B="d:"+C.toGMTString()}else{if(Ext.isArray(C)){var F="";for(var E=0,A=C.length;E<A;E++){F+=this.encodeValue(C[E]);if(E!=A-1){F+="^"}}B="a:"+F}else{if(typeof C=="object"){var F="";for(var D in C){if(typeof C[D]!="function"&&C[D]!==undefined){F+=D+"="+this.encodeValue(C[D])+"^"}}B="o:"+F.substring(0,F.length-1)}else{B="s:"+C}}}}}return escape(B)}});
Ext.state.Manager=function(){var A=new Ext.state.Provider();return{setProvider:function(B){A=B},get:function(C,B){return A.get(C,B)},set:function(B,C){A.set(B,C)},clear:function(B){A.clear(B)},getProvider:function(){return A}}}();
Ext.state.CookieProvider=function(A){Ext.state.CookieProvider.superclass.constructor.call(this);this.path="/";this.expires=new Date(new Date().getTime()+(1000*60*60*24*7));this.domain=null;this.secure=false;Ext.apply(this,A);this.state=this.readCookies()};Ext.extend(Ext.state.CookieProvider,Ext.state.Provider,{set:function(A,B){if(typeof B=="undefined"||B===null){this.clear(A);return }this.setCookie(A,B);Ext.state.CookieProvider.superclass.set.call(this,A,B)},clear:function(A){this.clearCookie(A);Ext.state.CookieProvider.superclass.clear.call(this,A)},readCookies:function(){var C={};var F=document.cookie+";";var B=/\s?(.*?)=(.*?);/g;var E;while((E=B.exec(F))!=null){var A=E[1];var D=E[2];if(A&&A.substring(0,3)=="ys-"){C[A.substr(3)]=this.decodeValue(D)}}return C},setCookie:function(A,B){document.cookie="ys-"+A+"="+this.encodeValue(B)+((this.expires==null)?"":("; expires="+this.expires.toGMTString()))+((this.path==null)?"":("; path="+this.path))+((this.domain==null)?"":("; domain="+this.domain))+((this.secure==true)?"; secure":"")},clearCookie:function(A){document.cookie="ys-"+A+"=null; expires=Thu, 01-Jan-70 00:00:01 GMT"+((this.path==null)?"":("; path="+this.path))+((this.domain==null)?"":("; domain="+this.domain))+((this.secure==true)?"; secure":"")}});
Ext.DataView=Ext.extend(Ext.BoxComponent,{selectedClass:"x-view-selected",emptyText:"",last:false,initComponent:function(){Ext.DataView.superclass.initComponent.call(this);if(typeof this.tpl=="string"){this.tpl=new Ext.XTemplate(this.tpl)}this.addEvents("beforeclick","click","containerclick","dblclick","contextmenu","selectionchange","beforeselect");this.all=new Ext.CompositeElementLite();this.selected=new Ext.CompositeElementLite()},onRender:function(){if(!this.el){this.el=document.createElement("div")}Ext.DataView.superclass.onRender.apply(this,arguments)},afterRender:function(){Ext.DataView.superclass.afterRender.call(this);this.el.on({"click":this.onClick,"dblclick":this.onDblClick,"contextmenu":this.onContextMenu,scope:this});if(this.overClass){this.el.on({"mouseover":this.onMouseOver,"mouseout":this.onMouseOut,scope:this})}if(this.store){this.setStore(this.store,true)}},refresh:function(){this.clearSelections(false,true);this.el.update("");var B=[];var A=this.store.getRange();if(A.length<1){this.el.update(this.emptyText);this.all.clear();return }this.tpl.overwrite(this.el,this.collectData(A,0));this.all.fill(Ext.query(this.itemSelector,this.el.dom));this.updateIndexes(0)},prepareData:function(A){return A},collectData:function(B,E){var D=[];for(var C=0,A=B.length;C<A;C++){D[D.length]=this.prepareData(B[C].data,E+C,B[C])}return D},bufferRender:function(A){var B=document.createElement("div");this.tpl.overwrite(B,this.collectData(A));return Ext.query(this.itemSelector,B)},onUpdate:function(F,A){var B=this.store.indexOf(A);var E=this.isSelected(B);var C=this.all.elements[B];var D=this.bufferRender([A],B)[0];this.all.replaceElement(B,D,true);if(E){this.selected.replaceElement(C,D);this.all.item(B).addClass(this.selectedClass)}this.updateIndexes(B,B)},onAdd:function(D,B,C){if(this.all.getCount()==0){this.refresh();return }var A=this.bufferRender(B,C),E;if(C<this.all.getCount()){E=this.all.item(C).insertSibling(A,"before",true);this.all.elements.splice(C,0,E)}else{E=this.all.last().insertSibling(A,"after",true);this.all.elements.push(E)}this.updateIndexes(C)},onRemove:function(C,A,B){this.deselect(B);this.all.removeElement(B,true);this.updateIndexes(B)},refreshNode:function(A){this.onUpdate(this.store,this.store.getAt(A))},updateIndexes:function(D,C){var B=this.all.elements;D=D||0;C=C||((C===0)?0:(B.length-1));for(var A=D;A<=C;A++){B[A].viewIndex=A}},setStore:function(A,B){if(!B&&this.store){this.store.un("beforeload",this.onBeforeLoad,this);this.store.un("datachanged",this.refresh,this);this.store.un("add",this.onAdd,this);this.store.un("remove",this.onRemove,this);this.store.un("update",this.onUpdate,this);this.store.un("clear",this.refresh,this)}if(A){A=Ext.StoreMgr.lookup(A);A.on("beforeload",this.onBeforeLoad,this);A.on("datachanged",this.refresh,this);A.on("add",this.onAdd,this);A.on("remove",this.onRemove,this);A.on("update",this.onUpdate,this);A.on("clear",this.refresh,this)}this.store=A;if(A){this.refresh()}},findItemFromChild:function(A){return Ext.fly(A).findParent(this.itemSelector,this.el)},onClick:function(C){var B=C.getTarget(this.itemSelector,this.el);if(B){var A=this.indexOf(B);if(this.onItemClick(B,A,C)!==false){this.fireEvent("click",this,A,B,C)}}else{if(this.fireEvent("containerclick",this,C)!==false){this.clearSelections()}}},onContextMenu:function(B){var A=B.getTarget(this.itemSelector,this.el);if(A){this.fireEvent("contextmenu",this,this.indexOf(A),A,B)}},onDblClick:function(B){var A=B.getTarget(this.itemSelector,this.el);if(A){this.fireEvent("dblclick",this,this.indexOf(A),A,B)}},onMouseOver:function(B){var A=B.getTarget(this.itemSelector,this.el);if(A&&A!==this.lastItem){this.lastItem=A;Ext.fly(A).addClass(this.overClass)}},onMouseOut:function(A){if(this.lastItem){if(!A.within(this.lastItem,true)){Ext.fly(this.lastItem).removeClass(this.overClass);delete this.lastItem}}},onItemClick:function(B,A,C){if(this.fireEvent("beforeclick",this,A,B,C)===false){return false}if(this.multiSelect){this.doMultiSelection(B,A,C);C.preventDefault()}else{if(this.singleSelect){this.doSingleSelection(B,A,C);C.preventDefault()}}return true},doSingleSelection:function(B,A,C){if(C.ctrlKey&&this.isSelected(A)){this.deselect(A)}else{this.select(A,false)}},doMultiSelection:function(C,A,D){if(D.shiftKey&&this.last!==false){var B=this.last;this.selectRange(B,A,D.ctrlKey);this.last=B}else{if((D.ctrlKey||this.simpleSelect)&&this.isSelected(A)){this.deselect(A)}else{this.select(A,D.ctrlKey||D.shiftKey||this.simpleSelect)}}},getSelectionCount:function(){return this.selected.getCount()},getSelectedNodes:function(){return this.selected.elements},getSelectedIndexes:function(){var B=[],D=this.selected.elements;for(var C=0,A=D.length;C<A;C++){B.push(D[C].viewIndex)}return B},getSelectedRecords:function(){var D=[],C=this.selected.elements;for(var B=0,A=C.length;B<A;B++){D[D.length]=this.store.getAt(C[B].viewIndex)}return D},getRecords:function(B){var E=[],D=B;for(var C=0,A=D.length;C<A;C++){E[E.length]=this.store.getAt(D[C].viewIndex)}return E},getRecord:function(A){return this.store.getAt(A.viewIndex)},clearSelections:function(A,B){if(this.multiSelect||this.singleSelect){if(!B){this.selected.removeClass(this.selectedClass)}this.selected.clear();this.last=false;if(!A){this.fireEvent("selectionchange",this,this.selected.elements)}}},isSelected:function(A){return this.selected.contains(this.getNode(A))},deselect:function(A){if(this.isSelected(A)){var A=this.getNode(A);this.selected.removeElement(A);if(this.last==A.viewIndex){this.last=false}Ext.fly(A).removeClass(this.selectedClass);this.fireEvent("selectionchange",this,this.selected.elements)}},select:function(D,F,B){if(Ext.isArray(D)){if(!F){this.clearSelections(true)}for(var C=0,A=D.length;C<A;C++){this.select(D[C],true,true)}}else{var E=this.getNode(D);if(!F){this.clearSelections(true)}if(E&&!this.isSelected(E)){if(this.fireEvent("beforeselect",this,E,this.selected.elements)!==false){Ext.fly(E).addClass(this.selectedClass);this.selected.add(E);this.last=E.viewIndex;if(!B){this.fireEvent("selectionchange",this,this.selected.elements)}}}}},selectRange:function(C,A,B){if(!B){this.clearSelections(true)}this.select(this.getNodes(C,A),true)},getNode:function(A){if(typeof A=="string"){return document.getElementById(A)}else{if(typeof A=="number"){return this.all.elements[A]}}return A},getNodes:function(E,A){var D=this.all.elements;E=E||0;A=typeof A=="undefined"?D.length-1:A;var B=[],C;if(E<=A){for(C=E;C<=A;C++){B.push(D[C])}}else{for(C=E;C>=A;C--){B.push(D[C])}}return B},indexOf:function(A){A=this.getNode(A);if(typeof A.viewIndex=="number"){return A.viewIndex}return this.all.indexOf(A)},onBeforeLoad:function(){if(this.loadingText){this.clearSelections(false,true);this.el.update("<div class=\"loading-indicator\">"+this.loadingText+"</div>");this.all.clear()}}});Ext.reg("dataview",Ext.DataView);
Ext.ColorPalette=function(A){Ext.ColorPalette.superclass.constructor.call(this,A);this.addEvents("select");if(this.handler){this.on("select",this.handler,this.scope,true)}};Ext.extend(Ext.ColorPalette,Ext.Component,{itemCls:"x-color-palette",value:null,clickEvent:"click",ctype:"Ext.ColorPalette",allowReselect:false,colors:["000000","993300","333300","003300","003366","000080","333399","333333","800000","FF6600","808000","008000","008080","0000FF","666699","808080","FF0000","FF9900","99CC00","339966","33CCCC","3366FF","800080","969696","FF00FF","FFCC00","FFFF00","00FF00","00FFFF","00CCFF","993366","C0C0C0","FF99CC","FFCC99","FFFF99","CCFFCC","CCFFFF","99CCFF","CC99FF","FFFFFF"],onRender:function(B,A){var C=this.tpl||new Ext.XTemplate("<tpl for=\".\"><a href=\"#\" class=\"color-{.}\" hidefocus=\"on\"><em><span style=\"background:#{.}\" unselectable=\"on\">&#160;</span></em></a></tpl>");var D=document.createElement("div");D.className=this.itemCls;C.overwrite(D,this.colors);B.dom.insertBefore(D,A);this.el=Ext.get(D);this.el.on(this.clickEvent,this.handleClick,this,{delegate:"a"});if(this.clickEvent!="click"){this.el.on("click",Ext.emptyFn,this,{delegate:"a",preventDefault:true})}},afterRender:function(){Ext.ColorPalette.superclass.afterRender.call(this);if(this.value){var A=this.value;this.value=null;this.select(A)}},handleClick:function(B,A){B.preventDefault();if(!this.disabled){var C=A.className.match(/(?:^|\s)color-(.{6})(?:\s|$)/)[1];this.select(C.toUpperCase())}},select:function(A){A=A.replace("#","");if(A!=this.value||this.allowReselect){var B=this.el;if(this.value){B.child("a.color-"+this.value).removeClass("x-color-palette-sel")}B.child("a.color-"+A).addClass("x-color-palette-sel");this.value=A;this.fireEvent("select",this,A)}}});Ext.reg("colorpalette",Ext.ColorPalette);
Ext.DatePicker=Ext.extend(Ext.Component,{todayText:"Today",okText:"&#160;OK&#160;",cancelText:"Cancel",todayTip:"{0} (Spacebar)",minDate:null,maxDate:null,minText:"This date is before the minimum date",maxText:"This date is after the maximum date",format:"m/d/y",disabledDays:null,disabledDaysText:"",disabledDatesRE:null,disabledDatesText:"",constrainToViewport:true,monthNames:Date.monthNames,dayNames:Date.dayNames,nextText:"Next Month (Control+Right)",prevText:"Previous Month (Control+Left)",monthYearText:"Choose a month (Control+Up/Down to move years)",startDay:0,initComponent:function(){Ext.DatePicker.superclass.initComponent.call(this);this.value=this.value?this.value.clearTime():new Date().clearTime();this.addEvents("select");if(this.handler){this.on("select",this.handler,this.scope||this)}this.initDisabledDays()},initDisabledDays:function(){if(!this.disabledDatesRE&&this.disabledDates){var A=this.disabledDates;var C="(?:";for(var B=0;B<A.length;B++){C+=A[B];if(B!=A.length-1){C+="|"}}this.disabledDatesRE=new RegExp(C+")")}},setValue:function(B){var A=this.value;this.value=B.clearTime(true);if(this.el){this.update(this.value)}},getValue:function(){return this.value},focus:function(){if(this.el){this.update(this.activeDate)}},onRender:function(A,F){var C=["<table cellspacing=\"0\">","<tr><td class=\"x-date-left\"><a href=\"#\" title=\"",this.prevText,"\">&#160;</a></td><td class=\"x-date-middle\" align=\"center\"></td><td class=\"x-date-right\"><a href=\"#\" title=\"",this.nextText,"\">&#160;</a></td></tr>","<tr><td colspan=\"3\"><table class=\"x-date-inner\" cellspacing=\"0\"><thead><tr>"];var E=this.dayNames;for(var D=0;D<7;D++){var G=this.startDay+D;if(G>6){G=G-7}C.push("<th><span>",E[G].substr(0,1),"</span></th>")}C[C.length]="</tr></thead><tbody><tr>";for(var D=0;D<42;D++){if(D%7==0&&D!=0){C[C.length]="</tr><tr>"}C[C.length]="<td><a href=\"#\" hidefocus=\"on\" class=\"x-date-date\" tabIndex=\"1\"><em><span></span></em></a></td>"}C[C.length]="</tr></tbody></table></td></tr><tr><td colspan=\"3\" class=\"x-date-bottom\" align=\"center\"></td></tr></table><div class=\"x-date-mp\"></div>";var B=document.createElement("div");B.className="x-date-picker";B.innerHTML=C.join("");A.dom.insertBefore(B,F);this.el=Ext.get(B);this.eventEl=Ext.get(B.firstChild);new Ext.util.ClickRepeater(this.el.child("td.x-date-left a"),{handler:this.showPrevMonth,scope:this,preventDefault:true,stopDefault:true});new Ext.util.ClickRepeater(this.el.child("td.x-date-right a"),{handler:this.showNextMonth,scope:this,preventDefault:true,stopDefault:true});this.eventEl.on("mousewheel",this.handleMouseWheel,this);this.monthPicker=this.el.down("div.x-date-mp");this.monthPicker.enableDisplayMode("block");var I=new Ext.KeyNav(this.eventEl,{"left":function(J){J.ctrlKey?this.showPrevMonth():this.update(this.activeDate.add("d",-1))},"right":function(J){J.ctrlKey?this.showNextMonth():this.update(this.activeDate.add("d",1))},"up":function(J){J.ctrlKey?this.showNextYear():this.update(this.activeDate.add("d",-7))},"down":function(J){J.ctrlKey?this.showPrevYear():this.update(this.activeDate.add("d",7))},"pageUp":function(J){this.showNextMonth()},"pageDown":function(J){this.showPrevMonth()},"enter":function(J){J.stopPropagation();return true},scope:this});this.eventEl.on("click",this.handleDateClick,this,{delegate:"a.x-date-date"});this.eventEl.addKeyListener(Ext.EventObject.SPACE,this.selectToday,this);this.el.unselectable();this.cells=this.el.select("table.x-date-inner tbody td");this.textNodes=this.el.query("table.x-date-inner tbody span");this.mbtn=new Ext.Button({text:"&#160;",tooltip:this.monthYearText,renderTo:this.el.child("td.x-date-middle",true)});this.mbtn.on("click",this.showMonthPicker,this);this.mbtn.el.child(this.mbtn.menuClassTarget).addClass("x-btn-with-menu");var H=(new Date()).dateFormat(this.format);this.todayBtn=new Ext.Button({renderTo:this.el.child("td.x-date-bottom",true),text:String.format(this.todayText,H),tooltip:String.format(this.todayTip,H),handler:this.selectToday,scope:this});if(Ext.isIE){this.el.repaint()}this.update(this.value)},createMonthPicker:function(){if(!this.monthPicker.dom.firstChild){var A=["<table border=\"0\" cellspacing=\"0\">"];for(var B=0;B<6;B++){A.push("<tr><td class=\"x-date-mp-month\"><a href=\"#\">",this.monthNames[B].substr(0,3),"</a></td>","<td class=\"x-date-mp-month x-date-mp-sep\"><a href=\"#\">",this.monthNames[B+6].substr(0,3),"</a></td>",B==0?"<td class=\"x-date-mp-ybtn\" align=\"center\"><a class=\"x-date-mp-prev\"></a></td><td class=\"x-date-mp-ybtn\" align=\"center\"><a class=\"x-date-mp-next\"></a></td></tr>":"<td class=\"x-date-mp-year\"><a href=\"#\"></a></td><td class=\"x-date-mp-year\"><a href=\"#\"></a></td></tr>")}A.push("<tr class=\"x-date-mp-btns\"><td colspan=\"4\"><button type=\"button\" class=\"x-date-mp-ok\">",this.okText,"</button><button type=\"button\" class=\"x-date-mp-cancel\">",this.cancelText,"</button></td></tr>","</table>");this.monthPicker.update(A.join(""));this.monthPicker.on("click",this.onMonthClick,this);this.monthPicker.on("dblclick",this.onMonthDblClick,this);this.mpMonths=this.monthPicker.select("td.x-date-mp-month");this.mpYears=this.monthPicker.select("td.x-date-mp-year");this.mpMonths.each(function(C,D,E){E+=1;if((E%2)==0){C.dom.xmonth=5+Math.round(E*0.5)}else{C.dom.xmonth=Math.round((E-1)*0.5)}})}},showMonthPicker:function(){this.createMonthPicker();var A=this.el.getSize();this.monthPicker.setSize(A);this.monthPicker.child("table").setSize(A);this.mpSelMonth=(this.activeDate||this.value).getMonth();this.updateMPMonth(this.mpSelMonth);this.mpSelYear=(this.activeDate||this.value).getFullYear();this.updateMPYear(this.mpSelYear);this.monthPicker.slideIn("t",{duration:0.2})},updateMPYear:function(E){this.mpyear=E;var C=this.mpYears.elements;for(var B=1;B<=10;B++){var D=C[B-1],A;if((B%2)==0){A=E+Math.round(B*0.5);D.firstChild.innerHTML=A;D.xyear=A}else{A=E-(5-Math.round(B*0.5));D.firstChild.innerHTML=A;D.xyear=A}this.mpYears.item(B-1)[A==this.mpSelYear?"addClass":"removeClass"]("x-date-mp-sel")}},updateMPMonth:function(A){this.mpMonths.each(function(B,C,D){B[B.dom.xmonth==A?"addClass":"removeClass"]("x-date-mp-sel")})},selectMPMonth:function(A){},onMonthClick:function(D,B){D.stopEvent();var C=new Ext.Element(B),A;if(C.is("button.x-date-mp-cancel")){this.hideMonthPicker()}else{if(C.is("button.x-date-mp-ok")){this.update(new Date(this.mpSelYear,this.mpSelMonth,(this.activeDate||this.value).getDate()));this.hideMonthPicker()}else{if(A=C.up("td.x-date-mp-month",2)){this.mpMonths.removeClass("x-date-mp-sel");A.addClass("x-date-mp-sel");this.mpSelMonth=A.dom.xmonth}else{if(A=C.up("td.x-date-mp-year",2)){this.mpYears.removeClass("x-date-mp-sel");A.addClass("x-date-mp-sel");this.mpSelYear=A.dom.xyear}else{if(C.is("a.x-date-mp-prev")){this.updateMPYear(this.mpyear-10)}else{if(C.is("a.x-date-mp-next")){this.updateMPYear(this.mpyear+10)}}}}}}},onMonthDblClick:function(D,B){D.stopEvent();var C=new Ext.Element(B),A;if(A=C.up("td.x-date-mp-month",2)){this.update(new Date(this.mpSelYear,A.dom.xmonth,(this.activeDate||this.value).getDate()));this.hideMonthPicker()}else{if(A=C.up("td.x-date-mp-year",2)){this.update(new Date(A.dom.xyear,this.mpSelMonth,(this.activeDate||this.value).getDate()));this.hideMonthPicker()}}},hideMonthPicker:function(A){if(this.monthPicker){if(A===true){this.monthPicker.hide()}else{this.monthPicker.slideOut("t",{duration:0.2})}}},showPrevMonth:function(A){this.update(this.activeDate.add("mo",-1))},showNextMonth:function(A){this.update(this.activeDate.add("mo",1))},showPrevYear:function(){this.update(this.activeDate.add("y",-1))},showNextYear:function(){this.update(this.activeDate.add("y",1))},handleMouseWheel:function(A){var B=A.getWheelDelta();if(B>0){this.showPrevMonth();A.stopEvent()}else{if(B<0){this.showNextMonth();A.stopEvent()}}},handleDateClick:function(B,A){B.stopEvent();if(A.dateValue&&!Ext.fly(A.parentNode).hasClass("x-date-disabled")){this.setValue(new Date(A.dateValue));this.fireEvent("select",this,this.value)}},selectToday:function(){this.setValue(new Date().clearTime());this.fireEvent("select",this,this.value)},update:function(W){var A=this.activeDate;this.activeDate=W;if(A&&this.el){var I=W.getTime();if(A.getMonth()==W.getMonth()&&A.getFullYear()==W.getFullYear()){this.cells.removeClass("x-date-selected");this.cells.each(function(a){if(a.dom.firstChild.dateValue==I){a.addClass("x-date-selected");setTimeout(function(){try{a.dom.firstChild.focus()}catch(b){}},50);return false}});return }}var F=W.getDaysInMonth();var J=W.getFirstDateOfMonth();var C=J.getDay()-this.startDay;if(C<=this.startDay){C+=7}var S=W.add("mo",-1);var D=S.getDaysInMonth()-C;var B=this.cells.elements;var K=this.textNodes;F+=C;var P=86400000;var U=(new Date(S.getFullYear(),S.getMonth(),D)).clearTime();var T=new Date().clearTime().getTime();var N=W.clearTime().getTime();var M=this.minDate?this.minDate.clearTime():Number.NEGATIVE_INFINITY;var Q=this.maxDate?this.maxDate.clearTime():Number.POSITIVE_INFINITY;var X=this.disabledDatesRE;var L=this.disabledDatesText;var Z=this.disabledDays?this.disabledDays.join(""):false;var V=this.disabledDaysText;var R=this.format;var G=function(d,a){a.title="";var b=U.getTime();a.firstChild.dateValue=b;if(b==T){a.className+=" x-date-today";a.title=d.todayText}if(b==N){a.className+=" x-date-selected";setTimeout(function(){try{a.firstChild.focus()}catch(f){}},50)}if(b<M){a.className=" x-date-disabled";a.title=d.minText;return }if(b>Q){a.className=" x-date-disabled";a.title=d.maxText;return }if(Z){if(Z.indexOf(U.getDay())!=-1){a.title=V;a.className=" x-date-disabled"}}if(X&&R){var c=U.dateFormat(R);if(X.test(c)){a.title=L.replace("%0",c);a.className=" x-date-disabled"}}};var O=0;for(;O<C;O++){K[O].innerHTML=(++D);U.setDate(U.getDate()+1);B[O].className="x-date-prevday";G(this,B[O])}for(;O<F;O++){intDay=O-C+1;K[O].innerHTML=(intDay);U.setDate(U.getDate()+1);B[O].className="x-date-active";G(this,B[O])}var Y=0;for(;O<42;O++){K[O].innerHTML=(++Y);U.setDate(U.getDate()+1);B[O].className="x-date-nextday";G(this,B[O])}this.mbtn.setText(this.monthNames[W.getMonth()]+" "+W.getFullYear());if(!this.internalRender){var E=this.el.dom.firstChild;var H=E.offsetWidth;this.el.setWidth(H+this.el.getBorderWidth("lr"));Ext.fly(E).setWidth(H);this.internalRender=true;if(Ext.isOpera&&!this.secondPass){E.rows[0].cells[1].style.width=(H-(E.rows[0].cells[0].offsetWidth+E.rows[0].cells[2].offsetWidth))+"px";this.secondPass=true;this.update.defer(10,this,[W])}}},beforeDestroy:function(){this.mbtn.destroy();this.todayBtn.destroy()}});Ext.reg("datepicker",Ext.DatePicker);
Ext.TabPanel=Ext.extend(Ext.Panel,{monitorResize:true,deferredRender:true,tabWidth:120,minTabWidth:30,resizeTabs:false,enableTabScroll:false,scrollIncrement:0,scrollRepeatInterval:400,scrollDuration:0.35,animScroll:true,tabPosition:"top",baseCls:"x-tab-panel",autoTabs:false,autoTabSelector:"div.x-tab",activeTab:null,tabMargin:2,plain:false,wheelIncrement:20,idDelimiter:"__",itemCls:"x-tab-item",elements:"body",headerAsText:false,frame:false,hideBorders:true,initComponent:function(){this.frame=false;Ext.TabPanel.superclass.initComponent.call(this);this.addEvents("beforetabchange","tabchange","contextmenu");this.setLayout(new Ext.layout.CardLayout({deferredRender:this.deferredRender}));if(this.tabPosition=="top"){this.elements+=",header";this.stripTarget="header"}else{this.elements+=",footer";this.stripTarget="footer"}if(!this.stack){this.stack=Ext.TabPanel.AccessStack()}this.initItems()},render:function(){Ext.TabPanel.superclass.render.apply(this,arguments);if(this.activeTab!==undefined){var A=this.activeTab;delete this.activeTab;this.setActiveTab(A)}},onRender:function(C,A){Ext.TabPanel.superclass.onRender.call(this,C,A);if(this.plain){var E=this.tabPosition=="top"?"header":"footer";this[E].addClass("x-tab-panel-"+E+"-plain")}var B=this[this.stripTarget];this.stripWrap=B.createChild({cls:"x-tab-strip-wrap",cn:{tag:"ul",cls:"x-tab-strip x-tab-strip-"+this.tabPosition}});this.stripSpacer=B.createChild({cls:"x-tab-strip-spacer"});this.strip=new Ext.Element(this.stripWrap.dom.firstChild);this.edge=this.strip.createChild({tag:"li",cls:"x-tab-edge"});this.strip.createChild({cls:"x-clear"});this.body.addClass("x-tab-panel-body-"+this.tabPosition);if(!this.itemTpl){var D=new Ext.Template("<li class=\"{cls}\" id=\"{id}\"><a class=\"x-tab-strip-close\" onclick=\"return false;\"></a>","<a class=\"x-tab-right\" href=\"#\" onclick=\"return false;\"><em class=\"x-tab-left\">","<span class=\"x-tab-strip-inner\"><span class=\"x-tab-strip-text {iconCls}\">{text}</span></span>","</em></a></li>");D.disableFormats=true;D.compile();Ext.TabPanel.prototype.itemTpl=D}this.items.each(this.initTab,this)},afterRender:function(){Ext.TabPanel.superclass.afterRender.call(this);if(this.autoTabs){this.readTabs(false)}},initEvents:function(){Ext.TabPanel.superclass.initEvents.call(this);this.on("add",this.onAdd,this);this.on("remove",this.onRemove,this);this.strip.on("mousedown",this.onStripMouseDown,this);this.strip.on("click",this.onStripClick,this);this.strip.on("contextmenu",this.onStripContextMenu,this);if(this.enableTabScroll){this.strip.on("mousewheel",this.onWheel,this)}},findTargets:function(C){var B=null;var A=C.getTarget("li",this.strip);if(A){B=this.getComponent(A.id.split(this.idDelimiter)[1]);if(B.disabled){return{close:null,item:null,el:null}}}return{close:C.getTarget(".x-tab-strip-close",this.strip),item:B,el:A}},onStripMouseDown:function(B){B.preventDefault();if(B.button!=0){return }var A=this.findTargets(B);if(A.close){this.remove(A.item);return }if(A.item&&A.item!=this.activeTab){this.setActiveTab(A.item)}},onStripClick:function(B){var A=this.findTargets(B);if(!A.close&&A.item&&A.item!=this.activeTab){this.setActiveTab(A.item)}},onStripContextMenu:function(B){B.preventDefault();var A=this.findTargets(B);if(A.item){this.fireEvent("contextmenu",this,A.item,B)}},readTabs:function(D){if(D===true){this.items.each(function(G){this.remove(G)},this)}var C=this.el.query(this.autoTabSelector);for(var B=0,A=C.length;B<A;B++){var E=C[B];var F=E.getAttribute("title");E.removeAttribute("title");this.add({title:F,el:E})}},initTab:function(D,B){var E=this.strip.dom.childNodes[B];var A=D.closable?"x-tab-strip-closable":"";if(D.disabled){A+=" x-item-disabled"}if(D.iconCls){A+=" x-tab-with-icon"}if(D.tabCls){A+=" "+D.tabCls}var F={id:this.id+this.idDelimiter+D.getItemId(),text:D.title,cls:A,iconCls:D.iconCls||""};var C=E?this.itemTpl.insertBefore(E,F):this.itemTpl.append(this.strip,F);Ext.fly(C).addClassOnOver("x-tab-strip-over");if(D.tabTip){Ext.fly(C).child("span.x-tab-strip-text",true).qtip=D.tabTip}D.on("disable",this.onItemDisabled,this);D.on("enable",this.onItemEnabled,this);D.on("titlechange",this.onItemTitleChanged,this);D.on("beforeshow",this.onBeforeShowItem,this)},onAdd:function(C,B,A){this.initTab(B,A);if(this.items.getCount()==1){this.syncSize()}this.delegateUpdates()},onBeforeAdd:function(B){var A=B.events?(this.items.containsKey(B.getItemId())?B:null):this.items.get(B);if(A){this.setActiveTab(B);return false}Ext.TabPanel.superclass.onBeforeAdd.apply(this,arguments);var C=B.elements;B.elements=C?C.replace(",header",""):C;B.border=(B.border===true)},onRemove:function(C,B){Ext.removeNode(this.getTabEl(B));this.stack.remove(B);if(B==this.activeTab){var A=this.stack.next();if(A){this.setActiveTab(A)}else{this.setActiveTab(0)}}this.delegateUpdates()},onBeforeShowItem:function(A){if(A!=this.activeTab){this.setActiveTab(A);return false}},onItemDisabled:function(B){var A=this.getTabEl(B);if(A){Ext.fly(A).addClass("x-item-disabled")}this.stack.remove(B)},onItemEnabled:function(B){var A=this.getTabEl(B);if(A){Ext.fly(A).removeClass("x-item-disabled")}},onItemTitleChanged:function(B){var A=this.getTabEl(B);if(A){Ext.fly(A).child("span.x-tab-strip-text",true).innerHTML=B.title}},getTabEl:function(A){var B=(typeof A==="number")?this.items.items[A].getItemId():A.getItemId();return document.getElementById(this.id+this.idDelimiter+B)},onResize:function(){Ext.TabPanel.superclass.onResize.apply(this,arguments);this.delegateUpdates()},beginUpdate:function(){this.suspendUpdates=true},endUpdate:function(){this.suspendUpdates=false;this.delegateUpdates()},hideTabStripItem:function(B){B=this.getComponent(B);var A=this.getTabEl(B);if(A){A.style.display="none";this.delegateUpdates()}},unhideTabStripItem:function(B){B=this.getComponent(B);var A=this.getTabEl(B);if(A){A.style.display="";this.delegateUpdates()}},delegateUpdates:function(){if(this.suspendUpdates){return }if(this.resizeTabs&&this.rendered){this.autoSizeTabs()}if(this.enableTabScroll&&this.rendered){this.autoScrollTabs()}},autoSizeTabs:function(){var G=this.items.length;var B=this.tabPosition!="bottom"?"header":"footer";var C=this[B].dom.offsetWidth;var A=this[B].dom.clientWidth;if(!this.resizeTabs||G<1||!A){return }var I=Math.max(Math.min(Math.floor((A-4)/G)-this.tabMargin,this.tabWidth),this.minTabWidth);this.lastTabWidth=I;var K=this.stripWrap.dom.getElementsByTagName("li");for(var E=0,H=K.length-1;E<H;E++){var J=K[E];var L=J.childNodes[1].firstChild.firstChild;var F=J.offsetWidth;var D=L.offsetWidth;L.style.width=(I-(F-D))+"px"}},adjustBodyWidth:function(A){if(this.header){this.header.setWidth(A)}if(this.footer){this.footer.setWidth(A)}return A},setActiveTab:function(C){C=this.getComponent(C);if(!C||this.fireEvent("beforetabchange",this,C,this.activeTab)===false){return }if(!this.rendered){this.activeTab=C;return }if(this.activeTab!=C){if(this.activeTab){var A=this.getTabEl(this.activeTab);if(A){Ext.fly(A).removeClass("x-tab-strip-active")}this.activeTab.fireEvent("deactivate",this.activeTab)}var B=this.getTabEl(C);Ext.fly(B).addClass("x-tab-strip-active");this.activeTab=C;this.stack.add(C);this.layout.setActiveItem(C);if(this.layoutOnTabChange&&C.doLayout){C.doLayout()}if(this.scrolling){this.scrollToTab(C,this.animScroll)}C.fireEvent("activate",C);this.fireEvent("tabchange",this,C)}},getActiveTab:function(){return this.activeTab||null},getItem:function(A){return this.getComponent(A)},autoScrollTabs:function(){var G=this.items.length;var D=this.header.dom.offsetWidth;var C=this.header.dom.clientWidth;var F=this.stripWrap;var E=F.dom;var B=E.offsetWidth;var H=this.getScrollPos();var A=this.edge.getOffsetsTo(this.stripWrap)[0]+H;if(!this.enableTabScroll||G<1||B<20){return }if(A<=C){E.scrollLeft=0;F.setWidth(C);if(this.scrolling){this.scrolling=false;this.header.removeClass("x-tab-scrolling");this.scrollLeft.hide();this.scrollRight.hide();if(Ext.isAir){E.style.marginLeft="";E.style.marginRight=""}}}else{if(!this.scrolling){this.header.addClass("x-tab-scrolling");if(Ext.isAir){E.style.marginLeft="18px";E.style.marginRight="18px"}}C-=F.getMargins("lr");F.setWidth(C>20?C:20);if(!this.scrolling){if(!this.scrollLeft){this.createScrollers()}else{this.scrollLeft.show();this.scrollRight.show()}}this.scrolling=true;if(H>(A-C)){E.scrollLeft=A-C}else{this.scrollToTab(this.activeTab,false)}this.updateScrollButtons()}},createScrollers:function(){var C=this.stripWrap.dom.offsetHeight;var A=this.header.insertFirst({cls:"x-tab-scroller-left"});A.setHeight(C);A.addClassOnOver("x-tab-scroller-left-over");this.leftRepeater=new Ext.util.ClickRepeater(A,{interval:this.scrollRepeatInterval,handler:this.onScrollLeft,scope:this});this.scrollLeft=A;var B=this.header.insertFirst({cls:"x-tab-scroller-right"});B.setHeight(C);B.addClassOnOver("x-tab-scroller-right-over");this.rightRepeater=new Ext.util.ClickRepeater(B,{interval:this.scrollRepeatInterval,handler:this.onScrollRight,scope:this});this.scrollRight=B},getScrollWidth:function(){return this.edge.getOffsetsTo(this.stripWrap)[0]+this.getScrollPos()},getScrollPos:function(){return parseInt(this.stripWrap.dom.scrollLeft,10)||0},getScrollArea:function(){return parseInt(this.stripWrap.dom.clientWidth,10)||0},getScrollAnim:function(){return{duration:this.scrollDuration,callback:this.updateScrollButtons,scope:this}},getScrollIncrement:function(){return this.scrollIncrement||(this.resizeTabs?this.lastTabWidth+2:100)},scrollToTab:function(E,A){if(!E){return }var C=this.getTabEl(E);var G=this.getScrollPos(),D=this.getScrollArea();var F=Ext.fly(C).getOffsetsTo(this.stripWrap)[0]+G;var B=F+C.offsetWidth;if(F<G){this.scrollTo(F,A)}else{if(B>(G+D)){this.scrollTo(B-D,A)}}},scrollTo:function(B,A){this.stripWrap.scrollTo("left",B,A?this.getScrollAnim():false);if(!A){this.updateScrollButtons()}},onWheel:function(D){var E=D.getWheelDelta()*this.wheelIncrement*-1;D.stopEvent();var F=this.getScrollPos();var C=F+E;var A=this.getScrollWidth()-this.getScrollArea();var B=Math.max(0,Math.min(A,C));if(B!=F){this.scrollTo(B,false)}},onScrollRight:function(){var A=this.getScrollWidth()-this.getScrollArea();var C=this.getScrollPos();var B=Math.min(A,C+this.getScrollIncrement());if(B!=C){this.scrollTo(B,this.animScroll)}},onScrollLeft:function(){var B=this.getScrollPos();var A=Math.max(0,B-this.getScrollIncrement());if(A!=B){this.scrollTo(A,this.animScroll)}},updateScrollButtons:function(){var A=this.getScrollPos();this.scrollLeft[A==0?"addClass":"removeClass"]("x-tab-scroller-left-disabled");this.scrollRight[A>=(this.getScrollWidth()-this.getScrollArea())?"addClass":"removeClass"]("x-tab-scroller-right-disabled")}});Ext.reg("tabpanel",Ext.TabPanel);Ext.TabPanel.prototype.activate=Ext.TabPanel.prototype.setActiveTab;Ext.TabPanel.AccessStack=function(){var A=[];return{add:function(B){A.push(B);if(A.length>10){A.shift()}},remove:function(E){var D=[];for(var C=0,B=A.length;C<B;C++){if(A[C]!=E){D.push(A[C])}}A=D},next:function(){return A.pop()}}};
Ext.Button=Ext.extend(Ext.Component,{hidden:false,disabled:false,pressed:false,enableToggle:false,menuAlign:"tl-bl?",type:"button",menuClassTarget:"tr",clickEvent:"click",handleMouseEvents:true,tooltipType:"qtip",buttonSelector:"button:first",initComponent:function(){Ext.Button.superclass.initComponent.call(this);this.addEvents("click","toggle","mouseover","mouseout","menushow","menuhide","menutriggerover","menutriggerout");if(this.menu){this.menu=Ext.menu.MenuMgr.get(this.menu)}if(typeof this.toggleGroup==="string"){this.enableToggle=true}},onRender:function(C,A){if(!this.template){if(!Ext.Button.buttonTemplate){Ext.Button.buttonTemplate=new Ext.Template("<table border=\"0\" cellpadding=\"0\" cellspacing=\"0\" class=\"x-btn-wrap\"><tbody><tr>","<td class=\"x-btn-left\"><i>&#160;</i></td><td class=\"x-btn-center\"><em unselectable=\"on\"><button class=\"x-btn-text\" type=\"{1}\">{0}</button></em></td><td class=\"x-btn-right\"><i>&#160;</i></td>","</tr></tbody></table>")}this.template=Ext.Button.buttonTemplate}var B,E=[this.text||"&#160;",this.type];if(A){B=this.template.insertBefore(A,E,true)}else{B=this.template.append(C,E,true)}var D=B.child(this.buttonSelector);D.on("focus",this.onFocus,this);D.on("blur",this.onBlur,this);this.initButtonEl(B,D);if(this.menu){this.el.child(this.menuClassTarget).addClass("x-btn-with-menu")}Ext.ButtonToggleMgr.register(this)},initButtonEl:function(B,C){this.el=B;B.addClass("x-btn");if(this.icon){C.setStyle("background-image","url("+this.icon+")")}if(this.iconCls){C.addClass(this.iconCls);if(!this.cls){B.addClass(this.text?"x-btn-text-icon":"x-btn-icon")}}if(this.tabIndex!==undefined){C.dom.tabIndex=this.tabIndex}if(this.tooltip){if(typeof this.tooltip=="object"){Ext.QuickTips.register(Ext.apply({target:C.id},this.tooltip))}else{C.dom[this.tooltipType]=this.tooltip}}if(this.pressed){this.el.addClass("x-btn-pressed")}if(this.handleMouseEvents){B.on("mouseover",this.onMouseOver,this);B.on("mousedown",this.onMouseDown,this)}if(this.menu){this.menu.on("show",this.onMenuShow,this);this.menu.on("hide",this.onMenuHide,this)}if(this.id){this.el.dom.id=this.el.id=this.id}if(this.repeat){var A=new Ext.util.ClickRepeater(B,typeof this.repeat=="object"?this.repeat:{});A.on("click",this.onClick,this)}B.on(this.clickEvent,this.onClick,this)},afterRender:function(){Ext.Button.superclass.afterRender.call(this);if(Ext.isIE6){this.autoWidth.defer(1,this)}else{this.autoWidth()}},setIconClass:function(A){if(this.el){this.el.child(this.buttonSelector).replaceClass(this.iconCls,A)}this.iconCls=A},beforeDestroy:function(){if(this.rendered){var A=this.el.child(this.buttonSelector);if(A){A.removeAllListeners()}}if(this.menu){Ext.destroy(this.menu)}},onDestroy:function(){if(this.rendered){Ext.ButtonToggleMgr.unregister(this)}},autoWidth:function(){if(this.el){this.el.setWidth("auto");if(Ext.isIE7&&Ext.isStrict){var A=this.el.child(this.buttonSelector);if(A&&A.getWidth()>20){A.clip();A.setWidth(Ext.util.TextMetrics.measure(A,this.text).width+A.getFrameWidth("lr"))}}if(this.minWidth){if(this.el.getWidth()<this.minWidth){this.el.setWidth(this.minWidth)}}}},setHandler:function(B,A){this.handler=B;this.scope=A},setText:function(A){this.text=A;if(this.el){this.el.child("td.x-btn-center "+this.buttonSelector).update(A)}this.autoWidth()},getText:function(){return this.text},toggle:function(A){A=A===undefined?!this.pressed:A;if(A!=this.pressed){if(A){this.el.addClass("x-btn-pressed");this.pressed=true;this.fireEvent("toggle",this,true)}else{this.el.removeClass("x-btn-pressed");this.pressed=false;this.fireEvent("toggle",this,false)}if(this.toggleHandler){this.toggleHandler.call(this.scope||this,this,A)}}},focus:function(){this.el.child(this.buttonSelector).focus()},onDisable:function(){if(this.el){if(!Ext.isIE6||!this.text){this.el.addClass(this.disabledClass)}this.el.dom.disabled=true}this.disabled=true},onEnable:function(){if(this.el){if(!Ext.isIE6||!this.text){this.el.removeClass(this.disabledClass)}this.el.dom.disabled=false}this.disabled=false},showMenu:function(){if(this.menu){this.menu.show(this.el,this.menuAlign)}return this},hideMenu:function(){if(this.menu){this.menu.hide()}return this},hasVisibleMenu:function(){return this.menu&&this.menu.isVisible()},onClick:function(A){if(A){A.preventDefault()}if(A.button!=0){return }if(!this.disabled){if(this.enableToggle&&(this.allowDepress!==false||!this.pressed)){this.toggle()}if(this.menu&&!this.menu.isVisible()&&!this.ignoreNextClick){this.showMenu()}this.fireEvent("click",this,A);if(this.handler){this.handler.call(this.scope||this,this,A)}}},isMenuTriggerOver:function(B,A){return this.menu&&!A},isMenuTriggerOut:function(B,A){return this.menu&&!A},onMouseOver:function(B){if(!this.disabled){var A=B.within(this.el,true);if(!A){this.el.addClass("x-btn-over");Ext.getDoc().on("mouseover",this.monitorMouseOver,this);this.fireEvent("mouseover",this,B)}if(this.isMenuTriggerOver(B,A)){this.fireEvent("menutriggerover",this,this.menu,B)}}},monitorMouseOver:function(A){if(A.target!=this.el.dom&&!A.within(this.el)){Ext.getDoc().un("mouseover",this.monitorMouseOver,this);this.onMouseOut(A)}},onMouseOut:function(B){var A=B.within(this.el)&&B.target!=this.el.dom;this.el.removeClass("x-btn-over");this.fireEvent("mouseout",this,B);if(this.isMenuTriggerOut(B,A)){this.fireEvent("menutriggerout",this,this.menu,B)}},onFocus:function(A){if(!this.disabled){this.el.addClass("x-btn-focus")}},onBlur:function(A){this.el.removeClass("x-btn-focus")},getClickEl:function(B,A){return this.el},onMouseDown:function(A){if(!this.disabled&&A.button==0){this.getClickEl(A).addClass("x-btn-click");Ext.getDoc().on("mouseup",this.onMouseUp,this)}},onMouseUp:function(A){if(A.button==0){this.getClickEl(A,true).removeClass("x-btn-click");Ext.getDoc().un("mouseup",this.onMouseUp,this)}},onMenuShow:function(A){this.ignoreNextClick=0;this.el.addClass("x-btn-menu-active");this.fireEvent("menushow",this,this.menu)},onMenuHide:function(A){this.el.removeClass("x-btn-menu-active");this.ignoreNextClick=this.restoreClick.defer(250,this);this.fireEvent("menuhide",this,this.menu)},restoreClick:function(){this.ignoreNextClick=0}});Ext.reg("button",Ext.Button);Ext.ButtonToggleMgr=function(){var A={};function B(E,G){if(G){var F=A[E.toggleGroup];for(var D=0,C=F.length;D<C;D++){if(F[D]!=E){F[D].toggle(false)}}}}return{register:function(C){if(!C.toggleGroup){return }var D=A[C.toggleGroup];if(!D){D=A[C.toggleGroup]=[]}D.push(C);C.on("toggle",B)},unregister:function(C){if(!C.toggleGroup){return }var D=A[C.toggleGroup];if(D){D.remove(C);C.un("toggle",B)}}}}();
Ext.SplitButton=Ext.extend(Ext.Button,{arrowSelector:"button:last",initComponent:function(){Ext.SplitButton.superclass.initComponent.call(this);this.addEvents("arrowclick")},onRender:function(D,A){var B=new Ext.Template("<table cellspacing=\"0\" class=\"x-btn-menu-wrap x-btn\"><tr><td>","<table cellspacing=\"0\" class=\"x-btn-wrap x-btn-menu-text-wrap\"><tbody>","<tr><td class=\"x-btn-left\"><i>&#160;</i></td><td class=\"x-btn-center\"><button class=\"x-btn-text\" type=\"{1}\">{0}</button></td></tr>","</tbody></table></td><td>","<table cellspacing=\"0\" class=\"x-btn-wrap x-btn-menu-arrow-wrap\"><tbody>","<tr><td class=\"x-btn-center\"><button class=\"x-btn-menu-arrow-el\" type=\"button\">&#160;</button></td><td class=\"x-btn-right\"><i>&#160;</i></td></tr>","</tbody></table></td></tr></table>");var C,F=[this.text||"&#160;",this.type];if(A){C=B.insertBefore(A,F,true)}else{C=B.append(D,F,true)}var E=C.child(this.buttonSelector);this.initButtonEl(C,E);this.arrowBtnTable=C.child("table:last");if(this.arrowTooltip){C.child(this.arrowSelector).dom[this.tooltipType]=this.arrowTooltip}},autoWidth:function(){if(this.el){var C=this.el.child("table:first");var B=this.el.child("table:last");this.el.setWidth("auto");C.setWidth("auto");if(Ext.isIE7&&Ext.isStrict){var A=this.el.child(this.buttonSelector);if(A&&A.getWidth()>20){A.clip();A.setWidth(Ext.util.TextMetrics.measure(A,this.text).width+A.getFrameWidth("lr"))}}if(this.minWidth){if((C.getWidth()+B.getWidth())<this.minWidth){C.setWidth(this.minWidth-B.getWidth())}}this.el.setWidth(C.getWidth()+B.getWidth())}},setArrowHandler:function(B,A){this.arrowHandler=B;this.scope=A},onClick:function(A){A.preventDefault();if(!this.disabled){if(A.getTarget(".x-btn-menu-arrow-wrap")){if(this.menu&&!this.menu.isVisible()&&!this.ignoreNextClick){this.showMenu()}this.fireEvent("arrowclick",this,A);if(this.arrowHandler){this.arrowHandler.call(this.scope||this,this,A)}}else{if(this.enableToggle){this.toggle()}this.fireEvent("click",this,A);if(this.handler){this.handler.call(this.scope||this,this,A)}}}},getClickEl:function(B,A){if(!A){return(this.lastClickEl=B.getTarget("table",10,true))}return this.lastClickEl},onDisable:function(){if(this.el){if(!Ext.isIE6){this.el.addClass("x-item-disabled")}this.el.child(this.buttonSelector).dom.disabled=true;this.el.child(this.arrowSelector).dom.disabled=true}this.disabled=true},onEnable:function(){if(this.el){if(!Ext.isIE6){this.el.removeClass("x-item-disabled")}this.el.child(this.buttonSelector).dom.disabled=false;this.el.child(this.arrowSelector).dom.disabled=false}this.disabled=false},isMenuTriggerOver:function(A){return this.menu&&A.within(this.arrowBtnTable)&&!A.within(this.arrowBtnTable,true)},isMenuTriggerOut:function(B,A){return this.menu&&!B.within(this.arrowBtnTable)},onDestroy:function(){Ext.destroy(this.arrowBtnTable);Ext.SplitButton.superclass.onDestroy.call(this)}});Ext.MenuButton=Ext.SplitButton;Ext.reg("splitbutton",Ext.SplitButton);
Ext.CycleButton=Ext.extend(Ext.SplitButton,{getItemText:function(A){if(A&&this.showText===true){var B="";if(this.prependText){B+=this.prependText}B+=A.text;return B}return undefined},setActiveItem:function(C,A){if(typeof C!="object"){C=this.menu.items.get(C)}if(C){if(!this.rendered){this.text=this.getItemText(C);this.iconCls=C.iconCls}else{var B=this.getItemText(C);if(B){this.setText(B)}this.setIconClass(C.iconCls)}this.activeItem=C;if(!C.checked){C.setChecked(true,true)}if(this.forceIcon){this.setIconClass(this.forceIcon)}if(!A){this.fireEvent("change",this,C)}}},getActiveItem:function(){return this.activeItem},initComponent:function(){this.addEvents("change");if(this.changeHandler){this.on("change",this.changeHandler,this.scope||this);delete this.changeHandler}this.itemCount=this.items.length;this.menu={cls:"x-cycle-menu",items:[]};var D;for(var B=0,A=this.itemCount;B<A;B++){var C=this.items[B];C.group=C.group||this.id;C.itemIndex=B;C.checkHandler=this.checkHandler;C.scope=this;C.checked=C.checked||false;this.menu.items.push(C);if(C.checked){D=C}}this.setActiveItem(D,true);Ext.CycleButton.superclass.initComponent.call(this);this.on("click",this.toggleSelected,this)},checkHandler:function(A,B){if(B){this.setActiveItem(A)}},toggleSelected:function(){this.menu.render();var C,A;for(var B=1;B<this.itemCount;B++){C=(this.activeItem.itemIndex+B)%this.itemCount;A=this.menu.items.itemAt(C);if(!A.disabled){A.setChecked(true);break}}}});Ext.reg("cycle",Ext.CycleButton);
Ext.Toolbar=function(A){if(Ext.isArray(A)){A={buttons:A}}Ext.Toolbar.superclass.constructor.call(this,A)};(function(){var A=Ext.Toolbar;Ext.extend(A,Ext.BoxComponent,{trackMenus:true,initComponent:function(){A.superclass.initComponent.call(this);if(this.items){this.buttons=this.items}this.items=new Ext.util.MixedCollection(false,function(B){return B.itemId||B.id||Ext.id()})},autoCreate:{cls:"x-toolbar x-small-editor",html:"<table cellspacing=\"0\"><tr></tr></table>"},onRender:function(C,B){this.el=C.createChild(Ext.apply({id:this.id},this.autoCreate),B);this.tr=this.el.child("tr",true)},afterRender:function(){A.superclass.afterRender.call(this);if(this.buttons){this.add.apply(this,this.buttons);delete this.buttons}},add:function(){var C=arguments,B=C.length;for(var D=0;D<B;D++){var E=C[D];if(E.isFormField){this.addField(E)}else{if(E.render){this.addItem(E)}else{if(typeof E=="string"){if(E=="separator"||E=="-"){this.addSeparator()}else{if(E==" "){this.addSpacer()}else{if(E=="->"){this.addFill()}else{this.addText(E)}}}}else{if(E.tagName){this.addElement(E)}else{if(typeof E=="object"){if(E.xtype){this.addField(Ext.ComponentMgr.create(E,"button"))}else{this.addButton(E)}}}}}}}},addSeparator:function(){return this.addItem(new A.Separator())},addSpacer:function(){return this.addItem(new A.Spacer())},addFill:function(){return this.addItem(new A.Fill())},addElement:function(B){return this.addItem(new A.Item(B))},addItem:function(B){var C=this.nextBlock();this.initMenuTracking(B);B.render(C);this.items.add(B);return B},addButton:function(D){if(Ext.isArray(D)){var F=[];for(var E=0,C=D.length;E<C;E++){F.push(this.addButton(D[E]))}return F}var B=D;if(!(D instanceof A.Button)){B=D.split?new A.SplitButton(D):new A.Button(D)}var G=this.nextBlock();this.initMenuTracking(B);B.render(G);this.items.add(B);return B},initMenuTracking:function(B){if(this.trackMenus&&B.menu){B.on({"menutriggerover":this.onButtonTriggerOver,"menushow":this.onButtonMenuShow,"menuhide":this.onButtonMenuHide,scope:this})}},addText:function(B){return this.addItem(new A.TextItem(B))},insertButton:function(C,F){if(Ext.isArray(F)){var E=[];for(var D=0,B=F.length;D<B;D++){E.push(this.insertButton(C+D,F[D]))}return E}if(!(F instanceof A.Button)){F=new A.Button(F)}var G=document.createElement("td");this.tr.insertBefore(G,this.tr.childNodes[C]);this.initMenuTracking(F);F.render(G);this.items.insert(C,F);return F},addDom:function(C,B){var E=this.nextBlock();Ext.DomHelper.overwrite(E,C);var D=new A.Item(E.firstChild);D.render(E);this.items.add(D);return D},addField:function(C){var D=this.nextBlock();C.render(D);var B=new A.Item(D.firstChild);B.render(D);this.items.add(B);return B},nextBlock:function(){var B=document.createElement("td");this.tr.appendChild(B);return B},onDestroy:function(){Ext.Toolbar.superclass.onDestroy.call(this);if(this.rendered){if(this.items){Ext.destroy.apply(Ext,this.items.items)}Ext.Element.uncache(this.tr)}},onDisable:function(){this.items.each(function(B){if(B.disable){B.disable()}})},onEnable:function(){this.items.each(function(B){if(B.enable){B.enable()}})},onButtonTriggerOver:function(B){if(this.activeMenuBtn&&this.activeMenuBtn!=B){this.activeMenuBtn.hideMenu();B.showMenu();this.activeMenuBtn=B}},onButtonMenuShow:function(B){this.activeMenuBtn=B},onButtonMenuHide:function(B){delete this.activeMenuBtn}});Ext.reg("toolbar",Ext.Toolbar);A.Item=function(B){this.el=Ext.getDom(B);this.id=Ext.id(this.el);this.hidden=false};A.Item.prototype={getEl:function(){return this.el},render:function(B){this.td=B;B.appendChild(this.el)},destroy:function(){if(this.td&&this.td.parentNode){this.td.parentNode.removeChild(this.td)}},show:function(){this.hidden=false;this.td.style.display=""},hide:function(){this.hidden=true;this.td.style.display="none"},setVisible:function(B){if(B){this.show()}else{this.hide()}},focus:function(){Ext.fly(this.el).focus()},disable:function(){Ext.fly(this.td).addClass("x-item-disabled");this.disabled=true;this.el.disabled=true},enable:function(){Ext.fly(this.td).removeClass("x-item-disabled");this.disabled=false;this.el.disabled=false}};Ext.reg("tbitem",A.Item);A.Separator=function(){var B=document.createElement("span");B.className="ytb-sep";A.Separator.superclass.constructor.call(this,B)};Ext.extend(A.Separator,A.Item,{enable:Ext.emptyFn,disable:Ext.emptyFn,focus:Ext.emptyFn});Ext.reg("tbseparator",A.Separator);A.Spacer=function(){var B=document.createElement("div");B.className="ytb-spacer";A.Spacer.superclass.constructor.call(this,B)};Ext.extend(A.Spacer,A.Item,{enable:Ext.emptyFn,disable:Ext.emptyFn,focus:Ext.emptyFn});Ext.reg("tbspacer",A.Spacer);A.Fill=Ext.extend(A.Spacer,{render:function(B){B.style.width="100%";A.Fill.superclass.render.call(this,B)}});Ext.reg("tbfill",A.Fill);A.TextItem=function(B){var C=document.createElement("span");C.className="ytb-text";C.innerHTML=B.text?B.text:B;A.TextItem.superclass.constructor.call(this,C)};Ext.extend(A.TextItem,A.Item,{enable:Ext.emptyFn,disable:Ext.emptyFn,focus:Ext.emptyFn});Ext.reg("tbtext",A.TextItem);A.Button=Ext.extend(Ext.Button,{hideParent:true,onDestroy:function(){A.Button.superclass.onDestroy.call(this);if(this.container){this.container.remove()}}});Ext.reg("tbbutton",A.Button);A.SplitButton=Ext.extend(Ext.SplitButton,{hideParent:true,onDestroy:function(){A.SplitButton.superclass.onDestroy.call(this);if(this.container){this.container.remove()}}});Ext.reg("tbsplit",A.SplitButton);A.MenuButton=A.SplitButton})();
Ext.PagingToolbar=Ext.extend(Ext.Toolbar,{pageSize:20,displayMsg:"Displaying {0} - {1} of {2}",emptyMsg:"No data to display",beforePageText:"Page",afterPageText:"of {0}",firstText:"First Page",prevText:"Previous Page",nextText:"Next Page",lastText:"Last Page",refreshText:"Refresh",paramNames:{start:"start",limit:"limit"},initComponent:function(){Ext.PagingToolbar.superclass.initComponent.call(this);this.cursor=0;this.bind(this.store)},onRender:function(B,A){Ext.PagingToolbar.superclass.onRender.call(this,B,A);this.first=this.addButton({tooltip:this.firstText,iconCls:"x-tbar-page-first",disabled:true,handler:this.onClick.createDelegate(this,["first"])});this.prev=this.addButton({tooltip:this.prevText,iconCls:"x-tbar-page-prev",disabled:true,handler:this.onClick.createDelegate(this,["prev"])});this.addSeparator();this.add(this.beforePageText);this.field=Ext.get(this.addDom({tag:"input",type:"text",size:"3",value:"1",cls:"x-tbar-page-number"}).el);this.field.on("keydown",this.onPagingKeydown,this);this.field.on("focus",function(){this.dom.select()});this.afterTextEl=this.addText(String.format(this.afterPageText,1));this.field.setHeight(18);this.addSeparator();this.next=this.addButton({tooltip:this.nextText,iconCls:"x-tbar-page-next",disabled:true,handler:this.onClick.createDelegate(this,["next"])});this.last=this.addButton({tooltip:this.lastText,iconCls:"x-tbar-page-last",disabled:true,handler:this.onClick.createDelegate(this,["last"])});this.addSeparator();this.loading=this.addButton({tooltip:this.refreshText,iconCls:"x-tbar-loading",handler:this.onClick.createDelegate(this,["refresh"])});if(this.displayInfo){this.displayEl=Ext.fly(this.el.dom).createChild({cls:"x-paging-info"})}if(this.dsLoaded){this.onLoad.apply(this,this.dsLoaded)}},updateInfo:function(){if(this.displayEl){var A=this.store.getCount();var B=A==0?this.emptyMsg:String.format(this.displayMsg,this.cursor+1,this.cursor+A,this.store.getTotalCount());this.displayEl.update(B)}},onLoad:function(A,C,F){if(!this.rendered){this.dsLoaded=[A,C,F];return }this.cursor=F.params?F.params[this.paramNames.start]:0;var E=this.getPageData(),B=E.activePage,D=E.pages;this.afterTextEl.el.innerHTML=String.format(this.afterPageText,E.pages);this.field.dom.value=B;this.first.setDisabled(B==1);this.prev.setDisabled(B==1);this.next.setDisabled(B==D);this.last.setDisabled(B==D);this.loading.enable();this.updateInfo()},getPageData:function(){var A=this.store.getTotalCount();return{total:A,activePage:Math.ceil((this.cursor+this.pageSize)/this.pageSize),pages:A<this.pageSize?1:Math.ceil(A/this.pageSize)}},onLoadError:function(){if(!this.rendered){return }this.loading.enable()},readPage:function(C){var A=this.field.dom.value,B;if(!A||isNaN(B=parseInt(A,10))){this.field.dom.value=C.activePage;return false}return B},onPagingKeydown:function(D){var B=D.getKey(),E=this.getPageData(),C;if(B==D.RETURN){D.stopEvent();if(C=this.readPage(E)){C=Math.min(Math.max(1,C),E.pages)-1;this.doLoad(C*this.pageSize)}}else{if(B==D.HOME||B==D.END){D.stopEvent();C=B==D.HOME?1:E.pages;this.field.dom.value=C}else{if(B==D.UP||B==D.PAGEUP||B==D.DOWN||B==D.PAGEDOWN){D.stopEvent();if(C=this.readPage(E)){var A=D.shiftKey?10:1;if(B==D.DOWN||B==D.PAGEDOWN){A*=-1}C+=A;if(C>=1&C<=E.pages){this.field.dom.value=C}}}}}},beforeLoad:function(){if(this.rendered&&this.loading){this.loading.disable()}},doLoad:function(C){var B={},A=this.paramNames;B[A.start]=C;B[A.limit]=this.pageSize;this.store.load({params:B})},onClick:function(E){var B=this.store;switch(E){case"first":this.doLoad(0);break;case"prev":this.doLoad(Math.max(0,this.cursor-this.pageSize));break;case"next":this.doLoad(this.cursor+this.pageSize);break;case"last":var D=B.getTotalCount();var A=D%this.pageSize;var C=A?(D-A):D-this.pageSize;this.doLoad(C);break;case"refresh":this.doLoad(this.cursor);break}},unbind:function(A){A=Ext.StoreMgr.lookup(A);A.un("beforeload",this.beforeLoad,this);A.un("load",this.onLoad,this);A.un("loadexception",this.onLoadError,this);this.store=undefined},bind:function(A){A=Ext.StoreMgr.lookup(A);A.on("beforeload",this.beforeLoad,this);A.on("load",this.onLoad,this);A.on("loadexception",this.onLoadError,this);this.store=A}});Ext.reg("paging",Ext.PagingToolbar);
Ext.Resizable=function(D,E){this.el=Ext.get(D);if(E&&E.wrap){E.resizeChild=this.el;this.el=this.el.wrap(typeof E.wrap=="object"?E.wrap:{cls:"xresizable-wrap"});this.el.id=this.el.dom.id=E.resizeChild.id+"-rzwrap";this.el.setStyle("overflow","hidden");this.el.setPositioning(E.resizeChild.getPositioning());E.resizeChild.clearPositioning();if(!E.width||!E.height){var F=E.resizeChild.getSize();this.el.setSize(F.width,F.height)}if(E.pinned&&!E.adjustments){E.adjustments="auto"}}this.proxy=this.el.createProxy({tag:"div",cls:"x-resizable-proxy",id:this.el.id+"-rzproxy"});this.proxy.unselectable();this.proxy.enableDisplayMode("block");Ext.apply(this,E);if(this.pinned){this.disableTrackOver=true;this.el.addClass("x-resizable-pinned")}var I=this.el.getStyle("position");if(I!="absolute"&&I!="fixed"){this.el.setStyle("position","relative")}if(!this.handles){this.handles="s,e,se";if(this.multiDirectional){this.handles+=",n,w"}}if(this.handles=="all"){this.handles="n s e w ne nw se sw"}var M=this.handles.split(/\s*?[,;]\s*?| /);var C=Ext.Resizable.positions;for(var H=0,J=M.length;H<J;H++){if(M[H]&&C[M[H]]){var L=C[M[H]];this[L]=new Ext.Resizable.Handle(this,L,this.disableTrackOver,this.transparent)}}this.corner=this.southeast;if(this.handles.indexOf("n")!=-1||this.handles.indexOf("w")!=-1){this.updateBox=true}this.activeHandle=null;if(this.resizeChild){if(typeof this.resizeChild=="boolean"){this.resizeChild=Ext.get(this.el.dom.firstChild,true)}else{this.resizeChild=Ext.get(this.resizeChild,true)}}if(this.adjustments=="auto"){var B=this.resizeChild;var K=this.west,G=this.east,A=this.north,M=this.south;if(B&&(K||A)){B.position("relative");B.setLeft(K?K.el.getWidth():0);B.setTop(A?A.el.getHeight():0)}this.adjustments=[(G?-G.el.getWidth():0)+(K?-K.el.getWidth():0),(A?-A.el.getHeight():0)+(M?-M.el.getHeight():0)-1]}if(this.draggable){this.dd=this.dynamic?this.el.initDD(null):this.el.initDDProxy(null,{dragElId:this.proxy.id});this.dd.setHandleElId(this.resizeChild?this.resizeChild.id:this.el.id)}this.addEvents("beforeresize","resize");if(this.width!==null&&this.height!==null){this.resizeTo(this.width,this.height)}else{this.updateChildSize()}if(Ext.isIE){this.el.dom.style.zoom=1}Ext.Resizable.superclass.constructor.call(this)};Ext.extend(Ext.Resizable,Ext.util.Observable,{resizeChild:false,adjustments:[0,0],minWidth:5,minHeight:5,maxWidth:10000,maxHeight:10000,enabled:true,animate:false,duration:0.35,dynamic:false,handles:false,multiDirectional:false,disableTrackOver:false,easing:"easeOutStrong",widthIncrement:0,heightIncrement:0,pinned:false,width:null,height:null,preserveRatio:false,transparent:false,minX:0,minY:0,draggable:false,resizeTo:function(B,A){this.el.setSize(B,A);this.updateChildSize();this.fireEvent("resize",this,B,A,null)},startSizing:function(C,B){this.fireEvent("beforeresize",this,C);if(this.enabled){if(!this.overlay){this.overlay=this.el.createProxy({tag:"div",cls:"x-resizable-overlay",html:"&#160;"},Ext.getBody());this.overlay.unselectable();this.overlay.enableDisplayMode("block");this.overlay.on("mousemove",this.onMouseMove,this);this.overlay.on("mouseup",this.onMouseUp,this)}this.overlay.setStyle("cursor",B.el.getStyle("cursor"));this.resizing=true;this.startBox=this.el.getBox();this.startPoint=C.getXY();this.offsets=[(this.startBox.x+this.startBox.width)-this.startPoint[0],(this.startBox.y+this.startBox.height)-this.startPoint[1]];this.overlay.setSize(Ext.lib.Dom.getViewWidth(true),Ext.lib.Dom.getViewHeight(true));this.overlay.show();if(this.constrainTo){var A=Ext.get(this.constrainTo);this.resizeRegion=A.getRegion().adjust(A.getFrameWidth("t"),A.getFrameWidth("l"),-A.getFrameWidth("b"),-A.getFrameWidth("r"))}this.proxy.setStyle("visibility","hidden");this.proxy.show();this.proxy.setBox(this.startBox);if(!this.dynamic){this.proxy.setStyle("visibility","visible")}}},onMouseDown:function(A,B){if(this.enabled){B.stopEvent();this.activeHandle=A;this.startSizing(B,A)}},onMouseUp:function(B){var A=this.resizeElement();this.resizing=false;this.handleOut();this.overlay.hide();this.proxy.hide();this.fireEvent("resize",this,A.width,A.height,B)},updateChildSize:function(){if(this.resizeChild){var C=this.el;var D=this.resizeChild;var B=this.adjustments;if(C.dom.offsetWidth){var A=C.getSize(true);D.setSize(A.width+B[0],A.height+B[1])}if(Ext.isIE){setTimeout(function(){if(C.dom.offsetWidth){var E=C.getSize(true);D.setSize(E.width+B[0],E.height+B[1])}},10)}}},snap:function(C,E,B){if(!E||!C){return C}var D=C;var A=C%E;if(A>0){if(A>(E/2)){D=C+(E-A)}else{D=C-A}}return Math.max(B,D)},resizeElement:function(){var A=this.proxy.getBox();if(this.updateBox){this.el.setBox(A,false,this.animate,this.duration,null,this.easing)}else{this.el.setSize(A.width,A.height,this.animate,this.duration,null,this.easing)}this.updateChildSize();if(!this.dynamic){this.proxy.hide()}return A},constrain:function(B,C,A,D){if(B-C<A){C=B-A}else{if(B-C>D){C=D-B}}return C},onMouseMove:function(S){if(this.enabled){try{if(this.resizeRegion&&!this.resizeRegion.contains(S.getPoint())){return }var Q=this.curSize||this.startBox;var I=this.startBox.x,H=this.startBox.y;var C=I,B=H;var J=Q.width,R=Q.height;var D=J,L=R;var K=this.minWidth,T=this.minHeight;var P=this.maxWidth,W=this.maxHeight;var F=this.widthIncrement;var A=this.heightIncrement;var U=S.getXY();var O=-(this.startPoint[0]-Math.max(this.minX,U[0]));var M=-(this.startPoint[1]-Math.max(this.minY,U[1]));var G=this.activeHandle.position;switch(G){case"east":J+=O;J=Math.min(Math.max(K,J),P);break;case"south":R+=M;R=Math.min(Math.max(T,R),W);break;case"southeast":J+=O;R+=M;J=Math.min(Math.max(K,J),P);R=Math.min(Math.max(T,R),W);break;case"north":M=this.constrain(R,M,T,W);H+=M;R-=M;break;case"west":O=this.constrain(J,O,K,P);I+=O;J-=O;break;case"northeast":J+=O;J=Math.min(Math.max(K,J),P);M=this.constrain(R,M,T,W);H+=M;R-=M;break;case"northwest":O=this.constrain(J,O,K,P);M=this.constrain(R,M,T,W);H+=M;R-=M;I+=O;J-=O;break;case"southwest":O=this.constrain(J,O,K,P);R+=M;R=Math.min(Math.max(T,R),W);I+=O;J-=O;break}var N=this.snap(J,F,K);var V=this.snap(R,A,T);if(N!=J||V!=R){switch(G){case"northeast":H-=V-R;break;case"north":H-=V-R;break;case"southwest":I-=N-J;break;case"west":I-=N-J;break;case"northwest":I-=N-J;H-=V-R;break}J=N;R=V}if(this.preserveRatio){switch(G){case"southeast":case"east":R=L*(J/D);R=Math.min(Math.max(T,R),W);J=D*(R/L);break;case"south":J=D*(R/L);J=Math.min(Math.max(K,J),P);R=L*(J/D);break;case"northeast":J=D*(R/L);J=Math.min(Math.max(K,J),P);R=L*(J/D);break;case"north":var X=J;J=D*(R/L);J=Math.min(Math.max(K,J),P);R=L*(J/D);I+=(X-J)/2;break;case"southwest":R=L*(J/D);R=Math.min(Math.max(T,R),W);var X=J;J=D*(R/L);I+=X-J;break;case"west":var E=R;R=L*(J/D);R=Math.min(Math.max(T,R),W);H+=(E-R)/2;var X=J;J=D*(R/L);I+=X-J;break;case"northwest":var X=J;var E=R;R=L*(J/D);R=Math.min(Math.max(T,R),W);J=D*(R/L);H+=E-R;I+=X-J;break}}this.proxy.setBounds(I,H,J,R);if(this.dynamic){this.resizeElement()}}catch(S){}}},handleOver:function(){if(this.enabled){this.el.addClass("x-resizable-over")}},handleOut:function(){if(!this.resizing){this.el.removeClass("x-resizable-over")}},getEl:function(){return this.el},getResizeChild:function(){return this.resizeChild},destroy:function(C){this.proxy.remove();if(this.overlay){this.overlay.removeAllListeners();this.overlay.remove()}var D=Ext.Resizable.positions;for(var A in D){if(typeof D[A]!="function"&&this[D[A]]){var B=this[D[A]];B.el.removeAllListeners();B.el.remove()}}if(C){this.el.update("");this.el.remove()}},syncHandleHeight:function(){var A=this.el.getHeight(true);if(this.west){this.west.el.setHeight(A)}if(this.east){this.east.el.setHeight(A)}}});Ext.Resizable.positions={n:"north",s:"south",e:"east",w:"west",se:"southeast",sw:"southwest",nw:"northwest",ne:"northeast"};Ext.Resizable.Handle=function(C,E,B,D){if(!this.tpl){var A=Ext.DomHelper.createTemplate({tag:"div",cls:"x-resizable-handle x-resizable-handle-{0}"});A.compile();Ext.Resizable.Handle.prototype.tpl=A}this.position=E;this.rz=C;this.el=this.tpl.append(C.el.dom,[this.position],true);this.el.unselectable();if(D){this.el.setOpacity(0)}this.el.on("mousedown",this.onMouseDown,this);if(!B){this.el.on("mouseover",this.onMouseOver,this);this.el.on("mouseout",this.onMouseOut,this)}};Ext.Resizable.Handle.prototype={afterResize:function(A){},onMouseDown:function(A){this.rz.onMouseDown(this,A)},onMouseOver:function(A){this.rz.handleOver(this,A)},onMouseOut:function(A){this.rz.handleOut(this,A)}};
Ext.Editor=function(B,A){this.field=B;Ext.Editor.superclass.constructor.call(this,A)};Ext.extend(Ext.Editor,Ext.Component,{value:"",alignment:"c-c?",shadow:"frame",constrain:false,swallowKeys:true,completeOnEnter:false,cancelOnEsc:false,updateEl:false,initComponent:function(){Ext.Editor.superclass.initComponent.call(this);this.addEvents("beforestartedit","startedit","beforecomplete","complete","specialkey")},onRender:function(B,A){this.el=new Ext.Layer({shadow:this.shadow,cls:"x-editor",parentEl:B,shim:this.shim,shadowOffset:4,id:this.id,constrain:this.constrain});this.el.setStyle("overflow",Ext.isGecko?"auto":"hidden");if(this.field.msgTarget!="title"){this.field.msgTarget="qtip"}this.field.inEditor=true;this.field.render(this.el);if(Ext.isGecko){this.field.el.dom.setAttribute("autocomplete","off")}this.field.on("specialkey",this.onSpecialKey,this);if(this.swallowKeys){this.field.el.swallowEvent(["keydown","keypress"])}this.field.show();this.field.on("blur",this.onBlur,this);if(this.field.grow){this.field.on("autosize",this.el.sync,this.el,{delay:1})}},onSpecialKey:function(B,A){if(this.completeOnEnter&&A.getKey()==A.ENTER){A.stopEvent();this.completeEdit()}else{if(this.cancelOnEsc&&A.getKey()==A.ESC){this.cancelEdit()}else{this.fireEvent("specialkey",B,A)}}},startEdit:function(B,C){if(this.editing){this.completeEdit()}this.boundEl=Ext.get(B);var A=C!==undefined?C:this.boundEl.dom.innerHTML;if(!this.rendered){this.render(this.parentEl||document.body)}if(this.fireEvent("beforestartedit",this,this.boundEl,A)===false){return }this.startValue=A;this.field.setValue(A);this.doAutoSize();this.el.alignTo(this.boundEl,this.alignment);this.editing=true;this.show()},doAutoSize:function(){if(this.autoSize){var A=this.boundEl.getSize();switch(this.autoSize){case"width":this.setSize(A.width,"");break;case"height":this.setSize("",A.height);break;default:this.setSize(A.width,A.height)}}},setSize:function(A,B){delete this.field.lastSize;this.field.setSize(A,B);if(this.el){this.el.sync()}},realign:function(){this.el.alignTo(this.boundEl,this.alignment)},completeEdit:function(A){if(!this.editing){return }var B=this.getValue();if(this.revertInvalid!==false&&!this.field.isValid()){B=this.startValue;this.cancelEdit(true)}if(String(B)===String(this.startValue)&&this.ignoreNoChange){this.editing=false;this.hide();return }if(this.fireEvent("beforecomplete",this,B,this.startValue)!==false){this.editing=false;if(this.updateEl&&this.boundEl){this.boundEl.update(B)}if(A!==true){this.hide()}this.fireEvent("complete",this,B,this.startValue)}},onShow:function(){this.el.show();if(this.hideEl!==false){this.boundEl.hide()}this.field.show();if(Ext.isIE&&!this.fixIEFocus){this.fixIEFocus=true;this.deferredFocus.defer(50,this)}else{this.field.focus()}this.fireEvent("startedit",this.boundEl,this.startValue)},deferredFocus:function(){if(this.editing){this.field.focus()}},cancelEdit:function(A){if(this.editing){this.setValue(this.startValue);if(A!==true){this.hide()}}},onBlur:function(){if(this.allowBlur!==true&&this.editing){this.completeEdit()}},onHide:function(){if(this.editing){this.completeEdit();return }this.field.blur();if(this.field.collapse){this.field.collapse()}this.el.hide();if(this.hideEl!==false){this.boundEl.show()}},setValue:function(A){this.field.setValue(A)},getValue:function(){return this.field.getValue()},beforeDestroy:function(){this.field.destroy();this.field=null}});Ext.reg("editor",Ext.Editor);
Ext.MessageBox=function(){var R,B,N,Q;var G,J,P,A,K,M,H,F;var O,S,L,C="";var D=function(U){R.hide();Ext.callback(B.fn,B.scope||window,[U,S.dom.value],1)};var T=function(){if(B&&B.cls){R.el.removeClass(B.cls)}K.reset()};var E=function(W,U,V){if(B&&B.closable!==false){R.hide()}if(V){V.stopEvent()}};var I=function(U){var W=0;if(!U){O["ok"].hide();O["cancel"].hide();O["yes"].hide();O["no"].hide();return W}R.footer.dom.style.display="";for(var V in O){if(typeof O[V]!="function"){if(U[V]){O[V].show();O[V].setText(typeof U[V]=="string"?U[V]:Ext.MessageBox.buttonText[V]);W+=O[V].el.getWidth()+15}else{O[V].hide()}}}return W};return{getDialog:function(U){if(!R){R=new Ext.Window({autoCreate:true,title:U,resizable:false,constrain:true,constrainHeader:true,minimizable:false,maximizable:false,stateful:false,modal:true,shim:true,buttonAlign:"center",width:400,height:100,minHeight:80,plain:true,footer:true,closable:true,close:function(){if(B&&B.buttons&&B.buttons.no&&!B.buttons.cancel){D("no")}else{D("cancel")}}});O={};var V=this.buttonText;O["ok"]=R.addButton(V["ok"],D.createCallback("ok"));O["yes"]=R.addButton(V["yes"],D.createCallback("yes"));O["no"]=R.addButton(V["no"],D.createCallback("no"));O["cancel"]=R.addButton(V["cancel"],D.createCallback("cancel"));O["ok"].hideMode=O["yes"].hideMode=O["no"].hideMode=O["cancel"].hideMode="offsets";R.render(document.body);R.getEl().addClass("x-window-dlg");N=R.mask;G=R.body.createChild({html:"<div class=\"ext-mb-icon\"></div><div class=\"ext-mb-content\"><span class=\"ext-mb-text\"></span><br /><input type=\"text\" class=\"ext-mb-input\" /><textarea class=\"ext-mb-textarea\"></textarea></div>"});H=Ext.get(G.dom.firstChild);var W=G.dom.childNodes[1];J=Ext.get(W.firstChild);P=Ext.get(W.childNodes[2]);P.enableDisplayMode();P.addKeyListener([10,13],function(){if(R.isVisible()&&B&&B.buttons){if(B.buttons.ok){D("ok")}else{if(B.buttons.yes){D("yes")}}}});A=Ext.get(W.childNodes[3]);A.enableDisplayMode();K=new Ext.ProgressBar({renderTo:G});G.createChild({cls:"x-clear"})}return R},updateText:function(X){if(!R.isVisible()&&!B.width){R.setSize(this.maxWidth,100)}J.update(X||"&#160;");var V=C!=""?(H.getWidth()+H.getMargins("lr")):0;var Z=J.getWidth()+J.getMargins("lr");var W=R.getFrameWidth("lr");var Y=R.body.getFrameWidth("lr");if(Ext.isIE&&V>0){V+=3}var U=Math.max(Math.min(B.width||V+Z+W+Y,this.maxWidth),Math.max(B.minWidth||this.minWidth,L||0));if(B.prompt===true){S.setWidth(U-V-W-Y)}if(B.progress===true||B.wait===true){K.setSize(U-V-W-Y)}R.setSize(U,"auto").center();return this},updateProgress:function(V,U,W){K.updateProgress(V,U);if(W){this.updateText(W)}return this},isVisible:function(){return R&&R.isVisible()},hide:function(){if(this.isVisible()){R.hide();T()}return this},show:function(X){if(this.isVisible()){this.hide()}B=X;var Y=this.getDialog(B.title||"&#160;");Y.setTitle(B.title||"&#160;");var U=(B.closable!==false&&B.progress!==true&&B.wait!==true);Y.tools.close.setDisplayed(U);S=P;B.prompt=B.prompt||(B.multiline?true:false);if(B.prompt){if(B.multiline){P.hide();A.show();A.setHeight(typeof B.multiline=="number"?B.multiline:this.defaultTextHeight);S=A}else{P.show();A.hide()}}else{P.hide();A.hide()}S.dom.value=B.value||"";if(B.prompt){Y.focusEl=S}else{var W=B.buttons;var V=null;if(W&&W.ok){V=O["ok"]}else{if(W&&W.yes){V=O["yes"]}}if(V){Y.focusEl=V}}this.setIcon(B.icon);L=I(B.buttons);K.setVisible(B.progress===true||B.wait===true);this.updateProgress(0,B.progressText);this.updateText(B.msg);if(B.cls){Y.el.addClass(B.cls)}Y.proxyDrag=B.proxyDrag===true;Y.modal=B.modal!==false;Y.mask=B.modal!==false?N:false;if(!Y.isVisible()){document.body.appendChild(R.el.dom);Y.setAnimateTarget(B.animEl);Y.show(B.animEl)}Y.on("show",function(){if(U===true){Y.keyMap.enable()}else{Y.keyMap.disable()}},this,{single:true});if(B.wait===true){K.wait(B.waitConfig)}return this},setIcon:function(U){if(U&&U!=""){H.removeClass("x-hidden");H.replaceClass(C,U);C=U}else{H.replaceClass(C,"x-hidden");C=""}return this},progress:function(W,V,U){this.show({title:W,msg:V,buttons:false,progress:true,closable:false,minWidth:this.minProgressWidth,progressText:U});return this},wait:function(W,V,U){this.show({title:V,msg:W,buttons:false,closable:false,wait:true,modal:true,minWidth:this.minProgressWidth,waitConfig:U});return this},alert:function(X,W,V,U){this.show({title:X,msg:W,buttons:this.OK,fn:V,scope:U});return this},confirm:function(X,W,V,U){this.show({title:X,msg:W,buttons:this.YESNO,fn:V,scope:U,icon:this.QUESTION});return this},prompt:function(Y,X,W,V,U){this.show({title:Y,msg:X,buttons:this.OKCANCEL,fn:W,minWidth:250,scope:V,prompt:true,multiline:U});return this},OK:{ok:true},CANCEL:{cancel:true},OKCANCEL:{ok:true,cancel:true},YESNO:{yes:true,no:true},YESNOCANCEL:{yes:true,no:true,cancel:true},INFO:"ext-mb-info",WARNING:"ext-mb-warning",QUESTION:"ext-mb-question",ERROR:"ext-mb-error",defaultTextHeight:75,maxWidth:600,minWidth:100,minProgressWidth:250,buttonText:{ok:"OK",cancel:"Cancel",yes:"Yes",no:"No"}}}();Ext.Msg=Ext.MessageBox;
Ext.Tip=Ext.extend(Ext.Panel,{minWidth:40,maxWidth:300,shadow:"sides",defaultAlign:"tl-bl?",autoRender:true,quickShowInterval:250,frame:true,hidden:true,baseCls:"x-tip",floating:{shadow:true,shim:true,useDisplay:true,constrain:false},autoHeight:true,initComponent:function(){Ext.Tip.superclass.initComponent.call(this);if(this.closable&&!this.title){this.elements+=",header"}},afterRender:function(){Ext.Tip.superclass.afterRender.call(this);if(this.closable){this.addTool({id:"close",handler:this.hide,scope:this})}},showAt:function(A){Ext.Tip.superclass.show.call(this);if(this.measureWidth!==false&&(!this.initialConfig||typeof this.initialConfig.width!="number")){var B=this.body.getTextWidth();if(this.title){B=Math.max(B,this.header.child("span").getTextWidth(this.title))}B+=this.getFrameWidth()+(this.closable?20:0)+this.body.getPadding("lr");this.setWidth(B.constrain(this.minWidth,this.maxWidth))}if(this.constrainPosition){A=this.el.adjustForConstraints(A)}this.setPagePosition(A[0],A[1])},showBy:function(A,B){if(!this.rendered){this.render(Ext.getBody())}this.showAt(this.el.getAlignToXY(A,B||this.defaultAlign))},initDraggable:function(){this.dd=new Ext.Tip.DD(this,typeof this.draggable=="boolean"?null:this.draggable);this.header.addClass("x-tip-draggable")}});Ext.Tip.DD=function(B,A){Ext.apply(this,A);this.tip=B;Ext.Tip.DD.superclass.constructor.call(this,B.el.id,"WindowDD-"+B.id);this.setHandleElId(B.header.id);this.scroll=false};Ext.extend(Ext.Tip.DD,Ext.dd.DD,{moveOnly:true,scroll:false,headerOffsets:[100,25],startDrag:function(){this.tip.el.disableShadow()},endDrag:function(A){this.tip.el.enableShadow(true)}});
Ext.ToolTip=Ext.extend(Ext.Tip,{showDelay:500,hideDelay:200,dismissDelay:5000,mouseOffset:[15,18],trackMouse:false,constrainPosition:true,initComponent:function(){Ext.ToolTip.superclass.initComponent.call(this);this.lastActive=new Date();this.initTarget()},initTarget:function(){if(this.target){this.target=Ext.get(this.target);this.target.on("mouseover",this.onTargetOver,this);this.target.on("mouseout",this.onTargetOut,this);this.target.on("mousemove",this.onMouseMove,this)}},onMouseMove:function(A){this.targetXY=A.getXY();if(!this.hidden&&this.trackMouse){this.setPagePosition(this.getTargetXY())}},getTargetXY:function(){return[this.targetXY[0]+this.mouseOffset[0],this.targetXY[1]+this.mouseOffset[1]]},onTargetOver:function(A){if(this.disabled||A.within(this.target.dom,true)){return }this.clearTimer("hide");this.targetXY=A.getXY();this.delayShow()},delayShow:function(){if(this.hidden&&!this.showTimer){if(this.lastActive.getElapsed()<this.quickShowInterval){this.show()}else{this.showTimer=this.show.defer(this.showDelay,this)}}else{if(!this.hidden&&this.autoHide!==false){this.show()}}},onTargetOut:function(A){if(this.disabled||A.within(this.target.dom,true)){return }this.clearTimer("show");if(this.autoHide!==false){this.delayHide()}},delayHide:function(){if(!this.hidden&&!this.hideTimer){this.hideTimer=this.hide.defer(this.hideDelay,this)}},hide:function(){this.clearTimer("dismiss");this.lastActive=new Date();Ext.ToolTip.superclass.hide.call(this)},show:function(){this.showAt(this.getTargetXY())},showAt:function(A){this.lastActive=new Date();this.clearTimers();Ext.ToolTip.superclass.showAt.call(this,A);if(this.dismissDelay&&this.autoHide!==false){this.dismissTimer=this.hide.defer(this.dismissDelay,this)}},clearTimer:function(A){A=A+"Timer";clearTimeout(this[A]);delete this[A]},clearTimers:function(){this.clearTimer("show");this.clearTimer("dismiss");this.clearTimer("hide")},onShow:function(){Ext.ToolTip.superclass.onShow.call(this);Ext.getDoc().on("mousedown",this.onDocMouseDown,this)},onHide:function(){Ext.ToolTip.superclass.onHide.call(this);Ext.getDoc().un("mousedown",this.onDocMouseDown,this)},onDocMouseDown:function(A){if(this.autoHide!==false&&!A.within(this.el.dom)){this.disable();this.enable.defer(100,this)}},onDisable:function(){this.clearTimers();this.hide()},adjustPosition:function(A,D){var C=this.targetXY[1],B=this.getSize().height;if(this.constrainPosition&&D<=C&&(D+B)>=C){D=C-B-5}return{x:A,y:D}},onDestroy:function(){Ext.ToolTip.superclass.onDestroy.call(this);if(this.target){this.target.un("mouseover",this.onTargetOver,this);this.target.un("mouseout",this.onTargetOut,this);this.target.un("mousemove",this.onMouseMove,this)}}});
Ext.QuickTip=Ext.extend(Ext.ToolTip,{interceptTitles:false,tagConfig:{namespace:"ext",attribute:"qtip",width:"qwidth",target:"target",title:"qtitle",hide:"hide",cls:"qclass",align:"qalign"},initComponent:function(){this.target=this.target||Ext.getDoc();this.targets=this.targets||{};Ext.QuickTip.superclass.initComponent.call(this)},register:function(D){var F=Ext.isArray(D)?D:arguments;for(var E=0,A=F.length;E<A;E++){var H=F[E];var G=H.target;if(G){if(Ext.isArray(G)){for(var C=0,B=G.length;C<B;C++){this.targets[Ext.id(G[C])]=H}}else{this.targets[Ext.id(G)]=H}}}},unregister:function(A){delete this.targets[Ext.id(A)]},onTargetOver:function(G){if(this.disabled){return }this.targetXY=G.getXY();var C=G.getTarget();if(!C||C.nodeType!==1||C==document||C==document.body){return }if(this.activeTarget&&C==this.activeTarget.el){this.clearTimer("hide");this.show();return }if(C&&this.targets[C.id]){this.activeTarget=this.targets[C.id];this.activeTarget.el=C;this.delayShow();return }var E,F=Ext.fly(C),B=this.tagConfig;var D=B.namespace;if(this.interceptTitles&&C.title){E=C.title;C.qtip=E;C.removeAttribute("title");G.preventDefault()}else{E=C.qtip||F.getAttributeNS(D,B.attribute)}if(E){var A=F.getAttributeNS(D,B.hide);this.activeTarget={el:C,text:E,width:F.getAttributeNS(D,B.width),autoHide:A!="user"&&A!=="false",title:F.getAttributeNS(D,B.title),cls:F.getAttributeNS(D,B.cls),align:F.getAttributeNS(D,B.align)};this.delayShow()}},onTargetOut:function(A){this.clearTimer("show");if(this.autoHide!==false){this.delayHide()}},showAt:function(B){var A=this.activeTarget;if(A){if(!this.rendered){this.render(Ext.getBody());this.activeTarget=A}if(A.width){this.setWidth(A.width);this.body.setWidth(this.adjustBodyWidth(A.width-this.getFrameWidth()));this.measureWidth=false}else{this.measureWidth=true}this.setTitle(A.title||"");this.body.update(A.text);this.autoHide=A.autoHide;this.dismissDelay=A.dismissDelay||this.dismissDelay;if(this.lastCls){this.el.removeClass(this.lastCls);delete this.lastCls}if(A.cls){this.el.addClass(A.cls);this.lastCls=A.cls}if(A.align){B=this.el.getAlignToXY(A.el,A.align);this.constrainPosition=false}else{this.constrainPosition=true}}Ext.QuickTip.superclass.showAt.call(this,B)},hide:function(){delete this.activeTarget;Ext.QuickTip.superclass.hide.call(this)}});
Ext.QuickTips=function(){var B,A=[];return{init:function(){if(!B){B=new Ext.QuickTip({elements:"header,body"})}},enable:function(){if(B){A.pop();if(A.length<1){B.enable()}}},disable:function(){if(B){B.disable()}A.push(1)},isEnabled:function(){return B&&!B.disabled},getQuickTip:function(){return B},register:function(){B.register.apply(B,arguments)},unregister:function(){B.unregister.apply(B,arguments)},tips:function(){B.register.apply(B,arguments)}}}();
Ext.tree.TreePanel=Ext.extend(Ext.Panel,{rootVisible:true,animate:Ext.enableFx,lines:true,enableDD:false,hlDrop:Ext.enableFx,pathSeparator:"/",initComponent:function(){Ext.tree.TreePanel.superclass.initComponent.call(this);if(!this.eventModel){this.eventModel=new Ext.tree.TreeEventModel(this)}this.nodeHash={};if(this.root){this.setRootNode(this.root)}this.addEvents("append","remove","movenode","insert","beforeappend","beforeremove","beforemovenode","beforeinsert","beforeload","load","textchange","beforeexpandnode","beforecollapsenode","expandnode","disabledchange","collapsenode","beforeclick","click","checkchange","dblclick","contextmenu","beforechildrenrendered","startdrag","enddrag","dragdrop","beforenodedrop","nodedrop","nodedragover");if(this.singleExpand){this.on("beforeexpandnode",this.restrictExpand,this)}},proxyNodeEvent:function(C,B,A,G,F,E,D){if(C=="collapse"||C=="expand"||C=="beforecollapse"||C=="beforeexpand"||C=="move"||C=="beforemove"){C=C+"node"}return this.fireEvent(C,B,A,G,F,E,D)},getRootNode:function(){return this.root},setRootNode:function(B){this.root=B;B.ownerTree=this;B.isRoot=true;this.registerNode(B);if(!this.rootVisible){var A=B.attributes.uiProvider;B.ui=A?new A(B):new Ext.tree.RootTreeNodeUI(B)}return B},getNodeById:function(A){return this.nodeHash[A]},registerNode:function(A){this.nodeHash[A.id]=A},unregisterNode:function(A){delete this.nodeHash[A.id]},toString:function(){return"[Tree"+(this.id?" "+this.id:"")+"]"},restrictExpand:function(A){var B=A.parentNode;if(B){if(B.expandedChild&&B.expandedChild.parentNode==B){B.expandedChild.collapse()}B.expandedChild=A}},getChecked:function(A,B){B=B||this.root;var C=[];var D=function(){if(this.attributes.checked){C.push(!A?this:(A=="id"?this.id:this.attributes[A]))}};B.cascade(D);return C},getEl:function(){return this.el},getLoader:function(){return this.loader},expandAll:function(){this.root.expand(true)},collapseAll:function(){this.root.collapse(true)},getSelectionModel:function(){if(!this.selModel){this.selModel=new Ext.tree.DefaultSelectionModel()}return this.selModel},expandPath:function(F,A,G){A=A||"id";var D=F.split(this.pathSeparator);var C=this.root;if(C.attributes[A]!=D[1]){if(G){G(false,null)}return }var B=1;var E=function(){if(++B==D.length){if(G){G(true,C)}return }var H=C.findChild(A,D[B]);if(!H){if(G){G(false,C)}return }C=H;H.expand(false,false,E)};C.expand(false,false,E)},selectPath:function(E,A,F){A=A||"id";var C=E.split(this.pathSeparator);var B=C.pop();if(C.length>0){var D=function(H,G){if(H&&G){var I=G.findChild(A,B);if(I){I.select();if(F){F(true,I)}}else{if(F){F(false,I)}}}else{if(F){F(false,I)}}};this.expandPath(C.join(this.pathSeparator),A,D)}else{this.root.select();if(F){F(true,this.root)}}},getTreeEl:function(){return this.body},onRender:function(B,A){Ext.tree.TreePanel.superclass.onRender.call(this,B,A);this.el.addClass("x-tree");this.innerCt=this.body.createChild({tag:"ul",cls:"x-tree-root-ct "+(this.useArrows?"x-tree-arrows":this.lines?"x-tree-lines":"x-tree-no-lines")})},initEvents:function(){Ext.tree.TreePanel.superclass.initEvents.call(this);if(this.containerScroll){Ext.dd.ScrollManager.register(this.body)}if((this.enableDD||this.enableDrop)&&!this.dropZone){this.dropZone=new Ext.tree.TreeDropZone(this,this.dropConfig||{ddGroup:this.ddGroup||"TreeDD",appendOnly:this.ddAppendOnly===true})}if((this.enableDD||this.enableDrag)&&!this.dragZone){this.dragZone=new Ext.tree.TreeDragZone(this,this.dragConfig||{ddGroup:this.ddGroup||"TreeDD",scroll:this.ddScroll})}this.getSelectionModel().init(this)},afterRender:function(){Ext.tree.TreePanel.superclass.afterRender.call(this);this.root.render();if(!this.rootVisible){this.root.renderChildren()}},onDestroy:function(){if(this.rendered){this.body.removeAllListeners();Ext.dd.ScrollManager.unregister(this.body);if(this.dropZone){this.dropZone.unreg()}if(this.dragZone){this.dragZone.unreg()}}this.root.destroy();this.nodeHash=null;Ext.tree.TreePanel.superclass.onDestroy.call(this)}});Ext.reg("treepanel",Ext.tree.TreePanel);
Ext.tree.TreeEventModel=function(A){this.tree=A;this.tree.on("render",this.initEvents,this)};Ext.tree.TreeEventModel.prototype={initEvents:function(){var A=this.tree.getTreeEl();A.on("click",this.delegateClick,this);if(this.tree.trackMouseOver!==false){A.on("mouseover",this.delegateOver,this);A.on("mouseout",this.delegateOut,this)}A.on("dblclick",this.delegateDblClick,this);A.on("contextmenu",this.delegateContextMenu,this)},getNode:function(B){var A;if(A=B.getTarget(".x-tree-node-el",10)){var C=Ext.fly(A,"_treeEvents").getAttributeNS("ext","tree-node-id");if(C){return this.tree.getNodeById(C)}}return null},getNodeTarget:function(B){var A=B.getTarget(".x-tree-node-icon",1);if(!A){A=B.getTarget(".x-tree-node-el",6)}return A},delegateOut:function(B,A){if(!this.beforeEvent(B)){return }if(B.getTarget(".x-tree-ec-icon",1)){var C=this.getNode(B);this.onIconOut(B,C);if(C==this.lastEcOver){delete this.lastEcOver}}if((A=this.getNodeTarget(B))&&!B.within(A,true)){this.onNodeOut(B,this.getNode(B))}},delegateOver:function(B,A){if(!this.beforeEvent(B)){return }if(this.lastEcOver){this.onIconOut(B,this.lastEcOver);delete this.lastEcOver}if(B.getTarget(".x-tree-ec-icon",1)){this.lastEcOver=this.getNode(B);this.onIconOver(B,this.lastEcOver)}if(A=this.getNodeTarget(B)){this.onNodeOver(B,this.getNode(B))}},delegateClick:function(B,A){if(!this.beforeEvent(B)){return }if(B.getTarget("input[type=checkbox]",1)){this.onCheckboxClick(B,this.getNode(B))}else{if(B.getTarget(".x-tree-ec-icon",1)){this.onIconClick(B,this.getNode(B))}else{if(this.getNodeTarget(B)){this.onNodeClick(B,this.getNode(B))}}}},delegateDblClick:function(B,A){if(this.beforeEvent(B)&&this.getNodeTarget(B)){this.onNodeDblClick(B,this.getNode(B))}},delegateContextMenu:function(B,A){if(this.beforeEvent(B)&&this.getNodeTarget(B)){this.onNodeContextMenu(B,this.getNode(B))}},onNodeClick:function(B,A){A.ui.onClick(B)},onNodeOver:function(B,A){A.ui.onOver(B)},onNodeOut:function(B,A){A.ui.onOut(B)},onIconOver:function(B,A){A.ui.addClass("x-tree-ec-over")},onIconOut:function(B,A){A.ui.removeClass("x-tree-ec-over")},onIconClick:function(B,A){A.ui.ecClick(B)},onCheckboxClick:function(B,A){A.ui.onCheckChange(B)},onNodeDblClick:function(B,A){A.ui.onDblClick(B)},onNodeContextMenu:function(B,A){A.ui.onContextMenu(B)},beforeEvent:function(A){if(this.disabled){A.stopEvent();return false}return true},disable:function(){this.disabled=true},enable:function(){this.disabled=false}};
Ext.tree.DefaultSelectionModel=function(A){this.selNode=null;this.addEvents("selectionchange","beforeselect");Ext.apply(this,A);Ext.tree.DefaultSelectionModel.superclass.constructor.call(this)};Ext.extend(Ext.tree.DefaultSelectionModel,Ext.util.Observable,{init:function(A){this.tree=A;A.getTreeEl().on("keydown",this.onKeyDown,this);A.on("click",this.onNodeClick,this)},onNodeClick:function(A,B){this.select(A)},select:function(B){var A=this.selNode;if(A!=B&&this.fireEvent("beforeselect",this,B,A)!==false){if(A){A.ui.onSelectedChange(false)}this.selNode=B;B.ui.onSelectedChange(true);this.fireEvent("selectionchange",this,B,A)}return B},unselect:function(A){if(this.selNode==A){this.clearSelections()}},clearSelections:function(){var A=this.selNode;if(A){A.ui.onSelectedChange(false);this.selNode=null;this.fireEvent("selectionchange",this,null)}return A},getSelectedNode:function(){return this.selNode},isSelected:function(A){return this.selNode==A},selectPrevious:function(){var A=this.selNode||this.lastSelNode;if(!A){return null}var C=A.previousSibling;if(C){if(!C.isExpanded()||C.childNodes.length<1){return this.select(C)}else{var B=C.lastChild;while(B&&B.isExpanded()&&B.childNodes.length>0){B=B.lastChild}return this.select(B)}}else{if(A.parentNode&&(this.tree.rootVisible||!A.parentNode.isRoot)){return this.select(A.parentNode)}}return null},selectNext:function(){var B=this.selNode||this.lastSelNode;if(!B){return null}if(B.firstChild&&B.isExpanded()){return this.select(B.firstChild)}else{if(B.nextSibling){return this.select(B.nextSibling)}else{if(B.parentNode){var A=null;B.parentNode.bubble(function(){if(this.nextSibling){A=this.getOwnerTree().selModel.select(this.nextSibling);return false}});return A}}}return null},onKeyDown:function(C){var B=this.selNode||this.lastSelNode;var D=this;if(!B){return }var A=C.getKey();switch(A){case C.DOWN:C.stopEvent();this.selectNext();break;case C.UP:C.stopEvent();this.selectPrevious();break;case C.RIGHT:C.preventDefault();if(B.hasChildNodes()){if(!B.isExpanded()){B.expand()}else{if(B.firstChild){this.select(B.firstChild,C)}}}break;case C.LEFT:C.preventDefault();if(B.hasChildNodes()&&B.isExpanded()){B.collapse()}else{if(B.parentNode&&(this.tree.rootVisible||B.parentNode!=this.tree.getRootNode())){this.select(B.parentNode,C)}}break}}});Ext.tree.MultiSelectionModel=function(A){this.selNodes=[];this.selMap={};this.addEvents("selectionchange");Ext.apply(this,A);Ext.tree.MultiSelectionModel.superclass.constructor.call(this)};Ext.extend(Ext.tree.MultiSelectionModel,Ext.util.Observable,{init:function(A){this.tree=A;A.getTreeEl().on("keydown",this.onKeyDown,this);A.on("click",this.onNodeClick,this)},onNodeClick:function(A,B){this.select(A,B,B.ctrlKey)},select:function(A,C,B){if(B!==true){this.clearSelections(true)}if(this.isSelected(A)){this.lastSelNode=A;return A}this.selNodes.push(A);this.selMap[A.id]=A;this.lastSelNode=A;A.ui.onSelectedChange(true);this.fireEvent("selectionchange",this,this.selNodes);return A},unselect:function(B){if(this.selMap[B.id]){B.ui.onSelectedChange(false);var C=this.selNodes;var A=C.indexOf(B);if(A!=-1){this.selNodes.splice(A,1)}delete this.selMap[B.id];this.fireEvent("selectionchange",this,this.selNodes)}},clearSelections:function(B){var D=this.selNodes;if(D.length>0){for(var C=0,A=D.length;C<A;C++){D[C].ui.onSelectedChange(false)}this.selNodes=[];this.selMap={};if(B!==true){this.fireEvent("selectionchange",this,this.selNodes)}}},isSelected:function(A){return this.selMap[A.id]?true:false},getSelectedNodes:function(){return this.selNodes},onKeyDown:Ext.tree.DefaultSelectionModel.prototype.onKeyDown,selectNext:Ext.tree.DefaultSelectionModel.prototype.selectNext,selectPrevious:Ext.tree.DefaultSelectionModel.prototype.selectPrevious});
Ext.tree.TreeNode=function(A){A=A||{};if(typeof A=="string"){A={text:A}}this.childrenRendered=false;this.rendered=false;Ext.tree.TreeNode.superclass.constructor.call(this,A);this.expanded=A.expanded===true;this.isTarget=A.isTarget!==false;this.draggable=A.draggable!==false&&A.allowDrag!==false;this.allowChildren=A.allowChildren!==false&&A.allowDrop!==false;this.text=A.text;this.disabled=A.disabled===true;this.addEvents("textchange","beforeexpand","beforecollapse","expand","disabledchange","collapse","beforeclick","click","checkchange","dblclick","contextmenu","beforechildrenrendered");var B=this.attributes.uiProvider||this.defaultUI||Ext.tree.TreeNodeUI;this.ui=new B(this)};Ext.extend(Ext.tree.TreeNode,Ext.data.Node,{preventHScroll:true,isExpanded:function(){return this.expanded},getUI:function(){return this.ui},setFirstChild:function(A){var B=this.firstChild;Ext.tree.TreeNode.superclass.setFirstChild.call(this,A);if(this.childrenRendered&&B&&A!=B){B.renderIndent(true,true)}if(this.rendered){this.renderIndent(true,true)}},setLastChild:function(B){var A=this.lastChild;Ext.tree.TreeNode.superclass.setLastChild.call(this,B);if(this.childrenRendered&&A&&B!=A){A.renderIndent(true,true)}if(this.rendered){this.renderIndent(true,true)}},appendChild:function(){var A=Ext.tree.TreeNode.superclass.appendChild.apply(this,arguments);if(A&&this.childrenRendered){A.render()}this.ui.updateExpandIcon();return A},removeChild:function(A){this.ownerTree.getSelectionModel().unselect(A);Ext.tree.TreeNode.superclass.removeChild.apply(this,arguments);if(this.childrenRendered){A.ui.remove()}if(this.childNodes.length<1){this.collapse(false,false)}else{this.ui.updateExpandIcon()}if(!this.firstChild&&!this.isHiddenRoot()){this.childrenRendered=false}return A},insertBefore:function(C,A){var B=Ext.tree.TreeNode.superclass.insertBefore.apply(this,arguments);if(B&&A&&this.childrenRendered){C.render()}this.ui.updateExpandIcon();return B},setText:function(B){var A=this.text;this.text=B;this.attributes.text=B;if(this.rendered){this.ui.onTextChange(this,B,A)}this.fireEvent("textchange",this,B,A)},select:function(){this.getOwnerTree().getSelectionModel().select(this)},unselect:function(){this.getOwnerTree().getSelectionModel().unselect(this)},isSelected:function(){return this.getOwnerTree().getSelectionModel().isSelected(this)},expand:function(A,B,C){if(!this.expanded){if(this.fireEvent("beforeexpand",this,A,B)===false){return }if(!this.childrenRendered){this.renderChildren()}this.expanded=true;if(!this.isHiddenRoot()&&(this.getOwnerTree().animate&&B!==false)||B){this.ui.animExpand(function(){this.fireEvent("expand",this);if(typeof C=="function"){C(this)}if(A===true){this.expandChildNodes(true)}}.createDelegate(this));return }else{this.ui.expand();this.fireEvent("expand",this);if(typeof C=="function"){C(this)}}}else{if(typeof C=="function"){C(this)}}if(A===true){this.expandChildNodes(true)}},isHiddenRoot:function(){return this.isRoot&&!this.getOwnerTree().rootVisible},collapse:function(B,E){if(this.expanded&&!this.isHiddenRoot()){if(this.fireEvent("beforecollapse",this,B,E)===false){return }this.expanded=false;if((this.getOwnerTree().animate&&E!==false)||E){this.ui.animCollapse(function(){this.fireEvent("collapse",this);if(B===true){this.collapseChildNodes(true)}}.createDelegate(this));return }else{this.ui.collapse();this.fireEvent("collapse",this)}}if(B===true){var D=this.childNodes;for(var C=0,A=D.length;C<A;C++){D[C].collapse(true,false)}}},delayedExpand:function(A){if(!this.expandProcId){this.expandProcId=this.expand.defer(A,this)}},cancelExpand:function(){if(this.expandProcId){clearTimeout(this.expandProcId)}this.expandProcId=false},toggle:function(){if(this.expanded){this.collapse()}else{this.expand()}},ensureVisible:function(B){var A=this.getOwnerTree();A.expandPath(this.parentNode.getPath(),false,function(){var C=A.getNodeById(this.id);A.getTreeEl().scrollChildIntoView(C.ui.anchor);Ext.callback(B)}.createDelegate(this))},expandChildNodes:function(B){var D=this.childNodes;for(var C=0,A=D.length;C<A;C++){D[C].expand(B)}},collapseChildNodes:function(B){var D=this.childNodes;for(var C=0,A=D.length;C<A;C++){D[C].collapse(B)}},disable:function(){this.disabled=true;this.unselect();if(this.rendered&&this.ui.onDisableChange){this.ui.onDisableChange(this,true)}this.fireEvent("disabledchange",this,true)},enable:function(){this.disabled=false;if(this.rendered&&this.ui.onDisableChange){this.ui.onDisableChange(this,false)}this.fireEvent("disabledchange",this,false)},renderChildren:function(B){if(B!==false){this.fireEvent("beforechildrenrendered",this)}var D=this.childNodes;for(var C=0,A=D.length;C<A;C++){D[C].render(true)}this.childrenRendered=true},sort:function(E,D){Ext.tree.TreeNode.superclass.sort.apply(this,arguments);if(this.childrenRendered){var C=this.childNodes;for(var B=0,A=C.length;B<A;B++){C[B].render(true)}}},render:function(A){this.ui.render(A);if(!this.rendered){this.getOwnerTree().registerNode(this);this.rendered=true;if(this.expanded){this.expanded=false;this.expand(false,false)}}},renderIndent:function(B,E){if(E){this.ui.childIndent=null}this.ui.renderIndent();if(B===true&&this.childrenRendered){var D=this.childNodes;for(var C=0,A=D.length;C<A;C++){D[C].renderIndent(true,E)}}},beginUpdate:function(){this.childrenRendered=false},endUpdate:function(){if(this.expanded){this.renderChildren()}},destroy:function(){for(var B=0,A=this.childNodes.length;B<A;B++){this.childNodes[B].destroy()}this.childNodes=null;if(this.ui.destroy){this.ui.destroy()}}});
Ext.tree.AsyncTreeNode=function(A){this.loaded=false;this.loading=false;Ext.tree.AsyncTreeNode.superclass.constructor.apply(this,arguments);this.addEvents("beforeload","load")};Ext.extend(Ext.tree.AsyncTreeNode,Ext.tree.TreeNode,{expand:function(B,D,F){if(this.loading){var E;var C=function(){if(!this.loading){clearInterval(E);this.expand(B,D,F)}}.createDelegate(this);E=setInterval(C,200);return }if(!this.loaded){if(this.fireEvent("beforeload",this)===false){return }this.loading=true;this.ui.beforeLoad(this);var A=this.loader||this.attributes.loader||this.getOwnerTree().getLoader();if(A){A.load(this,this.loadComplete.createDelegate(this,[B,D,F]));return }}Ext.tree.AsyncTreeNode.superclass.expand.call(this,B,D,F)},isLoading:function(){return this.loading},loadComplete:function(A,B,C){this.loading=false;this.loaded=true;this.ui.afterLoad(this);this.fireEvent("load",this);this.expand(A,B,C)},isLoaded:function(){return this.loaded},hasChildNodes:function(){if(!this.isLeaf()&&!this.loaded){return true}else{return Ext.tree.AsyncTreeNode.superclass.hasChildNodes.call(this)}},reload:function(A){this.collapse(false,false);while(this.firstChild){this.removeChild(this.firstChild)}this.childrenRendered=false;this.loaded=false;if(this.isHiddenRoot()){this.expanded=false}this.expand(false,false,A)}});
Ext.tree.TreeNodeUI=function(A){this.node=A;this.rendered=false;this.animating=false;this.wasLeaf=true;this.ecc="x-tree-ec-icon x-tree-elbow";this.emptyIcon=Ext.BLANK_IMAGE_URL};Ext.tree.TreeNodeUI.prototype={removeChild:function(A){if(this.rendered){this.ctNode.removeChild(A.ui.getEl())}},beforeLoad:function(){this.addClass("x-tree-node-loading")},afterLoad:function(){this.removeClass("x-tree-node-loading")},onTextChange:function(B,C,A){if(this.rendered){this.textNode.innerHTML=C}},onDisableChange:function(A,B){this.disabled=B;if(this.checkbox){this.checkbox.disabled=B}if(B){this.addClass("x-tree-node-disabled")}else{this.removeClass("x-tree-node-disabled")}},onSelectedChange:function(A){if(A){this.focus();this.addClass("x-tree-selected")}else{this.removeClass("x-tree-selected")}},onMove:function(A,G,E,F,D,B){this.childIndent=null;if(this.rendered){var H=F.ui.getContainer();if(!H){this.holder=document.createElement("div");this.holder.appendChild(this.wrap);return }var C=B?B.ui.getEl():null;if(C){H.insertBefore(this.wrap,C)}else{H.appendChild(this.wrap)}this.node.renderIndent(true)}},addClass:function(A){if(this.elNode){Ext.fly(this.elNode).addClass(A)}},removeClass:function(A){if(this.elNode){Ext.fly(this.elNode).removeClass(A)}},remove:function(){if(this.rendered){this.holder=document.createElement("div");this.holder.appendChild(this.wrap)}},fireEvent:function(){return this.node.fireEvent.apply(this.node,arguments)},initEvents:function(){this.node.on("move",this.onMove,this);if(this.node.disabled){this.addClass("x-tree-node-disabled");if(this.checkbox){this.checkbox.disabled=true}}if(this.node.hidden){this.hide()}var B=this.node.getOwnerTree();var A=B.enableDD||B.enableDrag||B.enableDrop;if(A&&(!this.node.isRoot||B.rootVisible)){Ext.dd.Registry.register(this.elNode,{node:this.node,handles:this.getDDHandles(),isHandle:false})}},getDDHandles:function(){return[this.iconNode,this.textNode,this.elNode]},hide:function(){this.node.hidden=true;if(this.wrap){this.wrap.style.display="none"}},show:function(){this.node.hidden=false;if(this.wrap){this.wrap.style.display=""}},onContextMenu:function(A){if(this.node.hasListener("contextmenu")||this.node.getOwnerTree().hasListener("contextmenu")){A.preventDefault();this.focus();this.fireEvent("contextmenu",this.node,A)}},onClick:function(B){if(this.dropping){B.stopEvent();return }if(this.fireEvent("beforeclick",this.node,B)!==false){var A=B.getTarget("a");if(!this.disabled&&this.node.attributes.href&&A){this.fireEvent("click",this.node,B);return }else{if(A&&B.ctrlKey){B.stopEvent()}}B.preventDefault();if(this.disabled){return }if(this.node.attributes.singleClickExpand&&!this.animating&&this.node.hasChildNodes()){this.node.toggle()}this.fireEvent("click",this.node,B)}else{B.stopEvent()}},onDblClick:function(A){A.preventDefault();if(this.disabled){return }if(this.checkbox){this.toggleCheck()}if(!this.animating&&this.node.hasChildNodes()){this.node.toggle()}this.fireEvent("dblclick",this.node,A)},onOver:function(A){this.addClass("x-tree-node-over")},onOut:function(A){this.removeClass("x-tree-node-over")},onCheckChange:function(){var A=this.checkbox.checked;this.node.attributes.checked=A;this.fireEvent("checkchange",this.node,A)},ecClick:function(A){if(!this.animating&&(this.node.hasChildNodes()||this.node.attributes.expandable)){this.node.toggle()}},startDrop:function(){this.dropping=true},endDrop:function(){setTimeout(function(){this.dropping=false}.createDelegate(this),50)},expand:function(){this.updateExpandIcon();this.ctNode.style.display=""},focus:function(){if(!this.node.preventHScroll){try{this.anchor.focus()}catch(C){}}else{if(!Ext.isIE){try{var B=this.node.getOwnerTree().getTreeEl().dom;var A=B.scrollLeft;this.anchor.focus();B.scrollLeft=A}catch(C){}}}},toggleCheck:function(B){var A=this.checkbox;if(A){A.checked=(B===undefined?!A.checked:B)}},blur:function(){try{this.anchor.blur()}catch(A){}},animExpand:function(B){var A=Ext.get(this.ctNode);A.stopFx();if(!this.node.hasChildNodes()){this.updateExpandIcon();this.ctNode.style.display="";Ext.callback(B);return }this.animating=true;this.updateExpandIcon();A.slideIn("t",{callback:function(){this.animating=false;Ext.callback(B)},scope:this,duration:this.node.ownerTree.duration||0.25})},highlight:function(){var A=this.node.getOwnerTree();Ext.fly(this.wrap).highlight(A.hlColor||"C3DAF9",{endColor:A.hlBaseColor})},collapse:function(){this.updateExpandIcon();this.ctNode.style.display="none"},animCollapse:function(B){var A=Ext.get(this.ctNode);A.enableDisplayMode("block");A.stopFx();this.animating=true;this.updateExpandIcon();A.slideOut("t",{callback:function(){this.animating=false;Ext.callback(B)},scope:this,duration:this.node.ownerTree.duration||0.25})},getContainer:function(){return this.ctNode},getEl:function(){return this.wrap},appendDDGhost:function(A){A.appendChild(this.elNode.cloneNode(true))},getDDRepairXY:function(){return Ext.lib.Dom.getXY(this.iconNode)},onRender:function(){this.render()},render:function(B){var D=this.node,A=D.attributes;var C=D.parentNode?D.parentNode.ui.getContainer():D.ownerTree.innerCt.dom;if(!this.rendered){this.rendered=true;this.renderElements(D,A,C,B);if(A.qtip){if(this.textNode.setAttributeNS){this.textNode.setAttributeNS("ext","qtip",A.qtip);if(A.qtipTitle){this.textNode.setAttributeNS("ext","qtitle",A.qtipTitle)}}else{this.textNode.setAttribute("ext:qtip",A.qtip);if(A.qtipTitle){this.textNode.setAttribute("ext:qtitle",A.qtipTitle)}}}else{if(A.qtipCfg){A.qtipCfg.target=Ext.id(this.textNode);Ext.QuickTips.register(A.qtipCfg)}}this.initEvents();if(!this.node.expanded){this.updateExpandIcon(true)}}else{if(B===true){C.appendChild(this.wrap)}}},renderElements:function(D,I,H,J){this.indentMarkup=D.parentNode?D.parentNode.ui.getChildIndent():"";var E=typeof I.checked=="boolean";var B=I.href?I.href:Ext.isGecko?"":"#";var C=["<li class=\"x-tree-node\"><div ext:tree-node-id=\"",D.id,"\" class=\"x-tree-node-el x-tree-node-leaf x-unselectable ",I.cls,"\" unselectable=\"on\">","<span class=\"x-tree-node-indent\">",this.indentMarkup,"</span>","<img src=\"",this.emptyIcon,"\" class=\"x-tree-ec-icon x-tree-elbow\" />","<img src=\"",I.icon||this.emptyIcon,"\" class=\"x-tree-node-icon",(I.icon?" x-tree-node-inline-icon":""),(I.iconCls?" "+I.iconCls:""),"\" unselectable=\"on\" />",E?("<input class=\"x-tree-node-cb\" type=\"checkbox\" "+(I.checked?"checked=\"checked\" />":"/>")):"","<a hidefocus=\"on\" class=\"x-tree-node-anchor\" href=\"",B,"\" tabIndex=\"1\" ",I.hrefTarget?" target=\""+I.hrefTarget+"\"":"","><span unselectable=\"on\">",D.text,"</span></a></div>","<ul class=\"x-tree-node-ct\" style=\"display:none;\"></ul>","</li>"].join("");var A;if(J!==true&&D.nextSibling&&(A=D.nextSibling.ui.getEl())){this.wrap=Ext.DomHelper.insertHtml("beforeBegin",A,C)}else{this.wrap=Ext.DomHelper.insertHtml("beforeEnd",H,C)}this.elNode=this.wrap.childNodes[0];this.ctNode=this.wrap.childNodes[1];var G=this.elNode.childNodes;this.indentNode=G[0];this.ecNode=G[1];this.iconNode=G[2];var F=3;if(E){this.checkbox=G[3];F++}this.anchor=G[F];this.textNode=G[F].firstChild},getAnchor:function(){return this.anchor},getTextEl:function(){return this.textNode},getIconEl:function(){return this.iconNode},isChecked:function(){return this.checkbox?this.checkbox.checked:false},updateExpandIcon:function(){if(this.rendered){var F=this.node,D,C;var A=F.isLast()?"x-tree-elbow-end":"x-tree-elbow";var E=F.hasChildNodes();if(E||F.attributes.expandable){if(F.expanded){A+="-minus";D="x-tree-node-collapsed";C="x-tree-node-expanded"}else{A+="-plus";D="x-tree-node-expanded";C="x-tree-node-collapsed"}if(this.wasLeaf){this.removeClass("x-tree-node-leaf");this.wasLeaf=false}if(this.c1!=D||this.c2!=C){Ext.fly(this.elNode).replaceClass(D,C);this.c1=D;this.c2=C}}else{if(!this.wasLeaf){Ext.fly(this.elNode).replaceClass("x-tree-node-expanded","x-tree-node-leaf");delete this.c1;delete this.c2;this.wasLeaf=true}}var B="x-tree-ec-icon "+A;if(this.ecc!=B){this.ecNode.className=B;this.ecc=B}}},getChildIndent:function(){if(!this.childIndent){var A=[];var B=this.node;while(B){if(!B.isRoot||(B.isRoot&&B.ownerTree.rootVisible)){if(!B.isLast()){A.unshift("<img src=\""+this.emptyIcon+"\" class=\"x-tree-elbow-line\" />")}else{A.unshift("<img src=\""+this.emptyIcon+"\" class=\"x-tree-icon\" />")}}B=B.parentNode}this.childIndent=A.join("")}return this.childIndent},renderIndent:function(){if(this.rendered){var A="";var B=this.node.parentNode;if(B){A=B.ui.getChildIndent()}if(this.indentMarkup!=A){this.indentNode.innerHTML=A;this.indentMarkup=A}this.updateExpandIcon()}},destroy:function(){if(this.elNode){Ext.dd.Registry.unregister(this.elNode.id)}delete this.elNode;delete this.ctNode;delete this.indentNode;delete this.ecNode;delete this.iconNode;delete this.checkbox;delete this.anchor;delete this.textNode;Ext.removeNode(this.ctNode)}};Ext.tree.RootTreeNodeUI=Ext.extend(Ext.tree.TreeNodeUI,{render:function(){if(!this.rendered){var A=this.node.ownerTree.innerCt.dom;this.node.expanded=true;A.innerHTML="<div class=\"x-tree-root-node\"></div>";this.wrap=this.ctNode=A.firstChild}},collapse:Ext.emptyFn,expand:Ext.emptyFn});
Ext.tree.TreeLoader=function(A){this.baseParams={};this.requestMethod="POST";Ext.apply(this,A);this.addEvents("beforeload","load","loadexception");Ext.tree.TreeLoader.superclass.constructor.call(this)};Ext.extend(Ext.tree.TreeLoader,Ext.util.Observable,{uiProviders:{},clearOnLoad:true,load:function(A,B){if(this.clearOnLoad){while(A.firstChild){A.removeChild(A.firstChild)}}if(this.doPreload(A)){if(typeof B=="function"){B()}}else{if(this.dataUrl||this.url){this.requestData(A,B)}}},doPreload:function(D){if(D.attributes.children){if(D.childNodes.length<1){var C=D.attributes.children;D.beginUpdate();for(var B=0,A=C.length;B<A;B++){var E=D.appendChild(this.createNode(C[B]));if(this.preloadChildren){this.doPreload(E)}}D.endUpdate()}return true}else{return false}},getParams:function(D){var A=[],C=this.baseParams;for(var B in C){if(typeof C[B]!="function"){A.push(encodeURIComponent(B),"=",encodeURIComponent(C[B]),"&")}}A.push("node=",encodeURIComponent(D.id));return A.join("")},requestData:function(A,B){if(this.fireEvent("beforeload",this,A,B)!==false){this.transId=Ext.Ajax.request({method:this.requestMethod,url:this.dataUrl||this.url,success:this.handleResponse,failure:this.handleFailure,scope:this,argument:{callback:B,node:A},params:this.getParams(A)})}else{if(typeof B=="function"){B()}}},isLoading:function(){return this.transId?true:false},abort:function(){if(this.isLoading()){Ext.Ajax.abort(this.transId)}},createNode:function(attr){if(this.baseAttrs){Ext.applyIf(attr,this.baseAttrs)}if(this.applyLoader!==false){attr.loader=this}if(typeof attr.uiProvider=="string"){attr.uiProvider=this.uiProviders[attr.uiProvider]||eval(attr.uiProvider)}return(attr.leaf?new Ext.tree.TreeNode(attr):new Ext.tree.AsyncTreeNode(attr))},processResponse:function(response,node,callback){var json=response.responseText;try{var o=eval("("+json+")");node.beginUpdate();for(var i=0,len=o.length;i<len;i++){var n=this.createNode(o[i]);if(n){node.appendChild(n)}}node.endUpdate();if(typeof callback=="function"){callback(this,node)}}catch(e){this.handleFailure(response)}},handleResponse:function(B){this.transId=false;var A=B.argument;this.processResponse(B,A.node,A.callback);this.fireEvent("load",this,A.node,B)},handleFailure:function(B){this.transId=false;var A=B.argument;this.fireEvent("loadexception",this,A.node,B);if(typeof A.callback=="function"){A.callback(this,A.node)}}});
Ext.tree.TreeFilter=function(A,B){this.tree=A;this.filtered={};Ext.apply(this,B)};Ext.tree.TreeFilter.prototype={clearBlank:false,reverse:false,autoClear:false,remove:false,filter:function(D,A,B){A=A||"text";var C;if(typeof D=="string"){var E=D.length;if(E==0&&this.clearBlank){this.clear();return }D=D.toLowerCase();C=function(F){return F.attributes[A].substr(0,E).toLowerCase()==D}}else{if(D.exec){C=function(F){return D.test(F.attributes[A])}}else{throw"Illegal filter type, must be string or regex"}}this.filterBy(C,null,B)},filterBy:function(D,C,B){B=B||this.tree.root;if(this.autoClear){this.clear()}var A=this.filtered,H=this.reverse;var E=function(J){if(J==B){return true}if(A[J.id]){return false}var I=D.call(C||J,J);if(!I||H){A[J.id]=J;J.ui.hide();return false}return true};B.cascade(E);if(this.remove){for(var G in A){if(typeof G!="function"){var F=A[G];if(F&&F.parentNode){F.parentNode.removeChild(F)}}}}},clear:function(){var B=this.tree;var A=this.filtered;for(var D in A){if(typeof D!="function"){var C=A[D];if(C){C.ui.show()}}}this.filtered={}}};
Ext.tree.TreeSorter=function(B,C){Ext.apply(this,C);B.on("beforechildrenrendered",this.doSort,this);B.on("append",this.updateSort,this);B.on("insert",this.updateSort,this);B.on("textchange",this.updateSortParent,this);var E=this.dir&&this.dir.toLowerCase()=="desc";var F=this.property||"text";var G=this.sortType;var A=this.folderSort;var D=this.caseSensitive===true;var H=this.leafAttr||"leaf";this.sortFn=function(J,I){if(A){if(J.attributes[H]&&!I.attributes[H]){return 1}if(!J.attributes[H]&&I.attributes[H]){return -1}}var L=G?G(J):(D?J.attributes[F]:J.attributes[F].toUpperCase());var K=G?G(I):(D?I.attributes[F]:I.attributes[F].toUpperCase());if(L<K){return E?+1:-1}else{if(L>K){return E?-1:+1}else{return 0}}}};Ext.tree.TreeSorter.prototype={doSort:function(A){A.sort(this.sortFn)},compareNodes:function(B,A){return(B.text.toUpperCase()>A.text.toUpperCase()?1:-1)},updateSort:function(A,B){if(B.childrenRendered){this.doSort.defer(1,this,[B])}},updateSortParent:function(A){var B=A.parentNode;if(B&&B.childrenRendered){this.doSort.defer(1,this,[B])}}};
if(Ext.dd.DropZone){Ext.tree.TreeDropZone=function(A,B){this.allowParentInsert=false;this.allowContainerDrop=false;this.appendOnly=false;Ext.tree.TreeDropZone.superclass.constructor.call(this,A.innerCt,B);this.tree=A;this.dragOverData={};this.lastInsertClass="x-tree-no-status"};Ext.extend(Ext.tree.TreeDropZone,Ext.dd.DropZone,{ddGroup:"TreeDD",expandDelay:1000,expandNode:function(A){if(A.hasChildNodes()&&!A.isExpanded()){A.expand(false,null,this.triggerCacheRefresh.createDelegate(this))}},queueExpand:function(A){this.expandProcId=this.expandNode.defer(this.expandDelay,this,[A])},cancelExpand:function(){if(this.expandProcId){clearTimeout(this.expandProcId);this.expandProcId=false}},isValidDropPoint:function(A,I,G,D,C){if(!A||!C){return false}var E=A.node;var F=C.node;if(!(E&&E.isTarget&&I)){return false}if(I=="append"&&E.allowChildren===false){return false}if((I=="above"||I=="below")&&(E.parentNode&&E.parentNode.allowChildren===false)){return false}if(F&&(E==F||F.contains(E))){return false}var B=this.dragOverData;B.tree=this.tree;B.target=E;B.data=C;B.point=I;B.source=G;B.rawEvent=D;B.dropNode=F;B.cancel=false;var H=this.tree.fireEvent("nodedragover",B);return B.cancel===false&&H!==false},getDropPoint:function(E,D,I){var J=D.node;if(J.isRoot){return J.allowChildren!==false?"append":false}var B=D.ddel;var K=Ext.lib.Dom.getY(B),G=K+B.offsetHeight;var F=Ext.lib.Event.getPageY(E);var H=J.allowChildren===false||J.isLeaf();if(this.appendOnly||J.parentNode.allowChildren===false){return H?false:"append"}var C=false;if(!this.allowParentInsert){C=J.hasChildNodes()&&J.isExpanded()}var A=(G-K)/(H?2:3);if(F>=K&&F<(K+A)){return"above"}else{if(!C&&(H||F>=G-A&&F<=G)){return"below"}else{return"append"}}},onNodeEnter:function(D,A,C,B){this.cancelExpand()},onNodeOver:function(B,G,F,E){var I=this.getDropPoint(F,B,G);var C=B.node;if(!this.expandProcId&&I=="append"&&C.hasChildNodes()&&!B.node.isExpanded()){this.queueExpand(C)}else{if(I!="append"){this.cancelExpand()}}var D=this.dropNotAllowed;if(this.isValidDropPoint(B,I,G,F,E)){if(I){var A=B.ddel;var H;if(I=="above"){D=B.node.isFirst()?"x-tree-drop-ok-above":"x-tree-drop-ok-between";H="x-tree-drag-insert-above"}else{if(I=="below"){D=B.node.isLast()?"x-tree-drop-ok-below":"x-tree-drop-ok-between";H="x-tree-drag-insert-below"}else{D="x-tree-drop-ok-append";H="x-tree-drag-append"}}if(this.lastInsertClass!=H){Ext.fly(A).replaceClass(this.lastInsertClass,H);this.lastInsertClass=H}}}return D},onNodeOut:function(D,A,C,B){this.cancelExpand();this.removeDropIndicators(D)},onNodeDrop:function(C,I,E,D){var H=this.getDropPoint(E,C,I);var F=C.node;F.ui.startDrop();if(!this.isValidDropPoint(C,H,I,E,D)){F.ui.endDrop();return false}var G=D.node||(I.getTreeNode?I.getTreeNode(D,F,H,E):null);var B={tree:this.tree,target:F,data:D,point:H,source:I,rawEvent:E,dropNode:G,cancel:!G,dropStatus:false};var A=this.tree.fireEvent("beforenodedrop",B);if(A===false||B.cancel===true||!B.dropNode){F.ui.endDrop();return B.dropStatus}F=B.target;if(H=="append"&&!F.isExpanded()){F.expand(false,null,function(){this.completeDrop(B)}.createDelegate(this))}else{this.completeDrop(B)}return true},completeDrop:function(G){var D=G.dropNode,E=G.point,C=G.target;if(!Ext.isArray(D)){D=[D]}var F;for(var B=0,A=D.length;B<A;B++){F=D[B];if(E=="above"){C.parentNode.insertBefore(F,C)}else{if(E=="below"){C.parentNode.insertBefore(F,C.nextSibling)}else{C.appendChild(F)}}}F.ui.focus();if(this.tree.hlDrop){F.ui.highlight()}C.ui.endDrop();this.tree.fireEvent("nodedrop",G)},afterNodeMoved:function(A,C,E,D,B){if(this.tree.hlDrop){B.ui.focus();B.ui.highlight()}this.tree.fireEvent("nodedrop",this.tree,D,C,A,E)},getTree:function(){return this.tree},removeDropIndicators:function(B){if(B&&B.ddel){var A=B.ddel;Ext.fly(A).removeClass(["x-tree-drag-insert-above","x-tree-drag-insert-below","x-tree-drag-append"]);this.lastInsertClass="_noclass"}},beforeDragDrop:function(B,A,C){this.cancelExpand();return true},afterRepair:function(A){if(A&&Ext.enableFx){A.node.ui.highlight()}this.hideProxy()}})};
if(Ext.dd.DragZone){Ext.tree.TreeDragZone=function(A,B){Ext.tree.TreeDragZone.superclass.constructor.call(this,A.getTreeEl(),B);this.tree=A};Ext.extend(Ext.tree.TreeDragZone,Ext.dd.DragZone,{ddGroup:"TreeDD",onBeforeDrag:function(A,B){var C=A.node;return C&&C.draggable&&!C.disabled},onInitDrag:function(B){var A=this.dragData;this.tree.getSelectionModel().select(A.node);this.tree.eventModel.disable();this.proxy.update("");A.node.ui.appendDDGhost(this.proxy.ghost.dom);this.tree.fireEvent("startdrag",this.tree,A.node,B)},getRepairXY:function(B,A){return A.node.ui.getDDRepairXY()},onEndDrag:function(A,B){this.tree.eventModel.enable.defer(100,this.tree.eventModel);this.tree.fireEvent("enddrag",this.tree,A.node,B)},onValidDrop:function(A,B,C){this.tree.fireEvent("dragdrop",this.tree,this.dragData.node,A,B);this.hideProxy()},beforeInvalidDrop:function(A,C){var B=this.tree.getSelectionModel();B.clearSelections();B.select(this.dragData.node)}})};
Ext.tree.TreeEditor=function(A,B){B=B||{};var C=B.events?B:new Ext.form.TextField(B);Ext.tree.TreeEditor.superclass.constructor.call(this,C);this.tree=A;if(!A.rendered){A.on("render",this.initEditor,this)}else{this.initEditor(A)}};Ext.extend(Ext.tree.TreeEditor,Ext.Editor,{alignment:"l-l",autoSize:false,hideEl:false,cls:"x-small-editor x-tree-editor",shim:false,shadow:"frame",maxWidth:250,editDelay:350,initEditor:function(A){A.on("beforeclick",this.beforeNodeClick,this);A.on("dblclick",this.onNodeDblClick,this);this.on("complete",this.updateNode,this);this.on("beforestartedit",this.fitToTree,this);this.on("startedit",this.bindScroll,this,{delay:10});this.on("specialkey",this.onSpecialKey,this)},fitToTree:function(B,C){var E=this.tree.getTreeEl().dom,D=C.dom;if(E.scrollLeft>D.offsetLeft){E.scrollLeft=D.offsetLeft}var A=Math.min(this.maxWidth,(E.clientWidth>20?E.clientWidth:E.offsetWidth)-Math.max(0,D.offsetLeft-E.scrollLeft)-5);this.setSize(A,"")},triggerEdit:function(A,B){this.completeEdit();if(A.attributes.editable!==false){this.editNode=A;this.autoEditTimer=this.startEdit.defer(this.editDelay,this,[A.ui.textNode,A.text]);return false}},bindScroll:function(){this.tree.getTreeEl().on("scroll",this.cancelEdit,this)},beforeNodeClick:function(A,B){clearTimeout(this.autoEditTimer);if(this.tree.getSelectionModel().isSelected(A)){B.stopEvent();return this.triggerEdit(A)}},onNodeDblClick:function(A,B){clearTimeout(this.autoEditTimer)},updateNode:function(A,B){this.tree.getTreeEl().un("scroll",this.cancelEdit,this);this.editNode.setText(B)},onHide:function(){Ext.tree.TreeEditor.superclass.onHide.call(this);if(this.editNode){this.editNode.ui.focus.defer(50,this.editNode.ui)}},onSpecialKey:function(C,B){var A=B.getKey();if(A==B.ESC){B.stopEvent();this.cancelEdit()}else{if(A==B.ENTER&&!B.hasModifier()){B.stopEvent();this.completeEdit()}}}});
Ext.menu.Menu=function(A){if(Ext.isArray(A)){A={items:A}}Ext.apply(this,A);this.id=this.id||Ext.id();this.addEvents("beforeshow","beforehide","show","hide","click","mouseover","mouseout","itemclick");Ext.menu.MenuMgr.register(this);Ext.menu.Menu.superclass.constructor.call(this);var B=this.items;this.items=new Ext.util.MixedCollection();if(B){this.add.apply(this,B)}};Ext.extend(Ext.menu.Menu,Ext.util.Observable,{minWidth:120,shadow:"sides",subMenuAlign:"tl-tr?",defaultAlign:"tl-bl?",allowOtherMenus:false,hidden:true,createEl:function(){return new Ext.Layer({cls:"x-menu",shadow:this.shadow,constrain:false,parentEl:this.parentEl||document.body,zindex:15000})},render:function(){if(this.el){return }var B=this.el=this.createEl();if(!this.keyNav){this.keyNav=new Ext.menu.MenuNav(this)}if(this.plain){B.addClass("x-menu-plain")}if(this.cls){B.addClass(this.cls)}this.focusEl=B.createChild({tag:"a",cls:"x-menu-focus",href:"#",onclick:"return false;",tabIndex:"-1"});var A=B.createChild({tag:"ul",cls:"x-menu-list"});A.on("click",this.onClick,this);A.on("mouseover",this.onMouseOver,this);A.on("mouseout",this.onMouseOut,this);this.items.each(function(D){var C=document.createElement("li");C.className="x-menu-list-item";A.dom.appendChild(C);D.render(C,this)},this);this.ul=A;this.autoWidth()},autoWidth:function(){var D=this.el,C=this.ul;if(!D){return }var A=this.width;if(A){D.setWidth(A)}else{if(Ext.isIE){D.setWidth(this.minWidth);var B=D.dom.offsetWidth;D.setWidth(C.getWidth()+D.getFrameWidth("lr"))}}},delayAutoWidth:function(){if(this.el){if(!this.awTask){this.awTask=new Ext.util.DelayedTask(this.autoWidth,this)}this.awTask.delay(20)}},findTargetItem:function(B){var A=B.getTarget(".x-menu-list-item",this.ul,true);if(A&&A.menuItemId){return this.items.get(A.menuItemId)}},onClick:function(B){var A;if(A=this.findTargetItem(B)){A.onClick(B);this.fireEvent("click",this,A,B)}},setActiveItem:function(A,B){if(A!=this.activeItem){if(this.activeItem){this.activeItem.deactivate()}this.activeItem=A;A.activate(B)}else{if(B){A.expandMenu()}}},tryActivate:function(F,E){var B=this.items;for(var C=F,A=B.length;C>=0&&C<A;C+=E){var D=B.get(C);if(!D.disabled&&D.canActivate){this.setActiveItem(D,false);return D}}return false},onMouseOver:function(B){var A;if(A=this.findTargetItem(B)){if(A.canActivate&&!A.disabled){this.setActiveItem(A,true)}}this.fireEvent("mouseover",this,B,A)},onMouseOut:function(B){var A;if(A=this.findTargetItem(B)){if(A==this.activeItem&&A.shouldDeactivate(B)){this.activeItem.deactivate();delete this.activeItem}}this.fireEvent("mouseout",this,B,A)},isVisible:function(){return this.el&&!this.hidden},show:function(B,C,A){this.parentMenu=A;if(!this.el){this.render()}this.fireEvent("beforeshow",this);this.showAt(this.el.getAlignToXY(B,C||this.defaultAlign),A,false)},showAt:function(C,B,A){this.parentMenu=B;if(!this.el){this.render()}if(A!==false){this.fireEvent("beforeshow",this);C=this.el.adjustForConstraints(C)}this.el.setXY(C);this.el.show();this.hidden=false;this.focus();this.fireEvent("show",this)},focus:function(){if(!this.hidden){this.doFocus.defer(50,this)}},doFocus:function(){if(!this.hidden){this.focusEl.focus()}},hide:function(A){if(this.el&&this.isVisible()){this.fireEvent("beforehide",this);if(this.activeItem){this.activeItem.deactivate();this.activeItem=null}this.el.hide();this.hidden=true;this.fireEvent("hide",this)}if(A===true&&this.parentMenu){this.parentMenu.hide(true)}},add:function(){var B=arguments,A=B.length,E;for(var C=0;C<A;C++){var D=B[C];if(D.render){E=this.addItem(D)}else{if(typeof D=="string"){if(D=="separator"||D=="-"){E=this.addSeparator()}else{E=this.addText(D)}}else{if(D.tagName||D.el){E=this.addElement(D)}else{if(typeof D=="object"){Ext.applyIf(D,this.defaults);E=this.addMenuItem(D)}}}}}return E},getEl:function(){if(!this.el){this.render()}return this.el},addSeparator:function(){return this.addItem(new Ext.menu.Separator())},addElement:function(A){return this.addItem(new Ext.menu.BaseItem(A))},addItem:function(B){this.items.add(B);if(this.ul){var A=document.createElement("li");A.className="x-menu-list-item";this.ul.dom.appendChild(A);B.render(A,this);this.delayAutoWidth()}return B},addMenuItem:function(A){if(!(A instanceof Ext.menu.Item)){if(typeof A.checked=="boolean"){A=new Ext.menu.CheckItem(A)}else{A=new Ext.menu.Item(A)}}return this.addItem(A)},addText:function(A){return this.addItem(new Ext.menu.TextItem(A))},insert:function(B,C){this.items.insert(B,C);if(this.ul){var A=document.createElement("li");A.className="x-menu-list-item";this.ul.dom.insertBefore(A,this.ul.dom.childNodes[B]);C.render(A,this);this.delayAutoWidth()}return C},remove:function(A){this.items.removeKey(A.id);A.destroy()},removeAll:function(){var A;while(A=this.items.first()){this.remove(A)}},destroy:function(){this.beforeDestroy();Ext.menu.MenuMgr.unregister(this);if(this.keyNav){this.keyNav.disable()}this.removeAll();if(this.ul){this.ul.removeAllListeners()}if(this.el){this.el.destroy()}},beforeDestroy:Ext.emptyFn});Ext.menu.MenuNav=function(A){Ext.menu.MenuNav.superclass.constructor.call(this,A.el);this.scope=this.menu=A};Ext.extend(Ext.menu.MenuNav,Ext.KeyNav,{doRelay:function(C,B){var A=C.getKey();if(!this.menu.activeItem&&C.isNavKeyPress()&&A!=C.SPACE&&A!=C.RETURN){this.menu.tryActivate(0,1);return false}return B.call(this.scope||this,C,this.menu)},up:function(B,A){if(!A.tryActivate(A.items.indexOf(A.activeItem)-1,-1)){A.tryActivate(A.items.length-1,-1)}},down:function(B,A){if(!A.tryActivate(A.items.indexOf(A.activeItem)+1,1)){A.tryActivate(0,1)}},right:function(B,A){if(A.activeItem){A.activeItem.expandMenu(true)}},left:function(B,A){A.hide();if(A.parentMenu&&A.parentMenu.activeItem){A.parentMenu.activeItem.activate()}},enter:function(B,A){if(A.activeItem){B.stopPropagation();A.activeItem.onClick(B);A.fireEvent("click",this,A.activeItem);return true}}});
Ext.menu.MenuMgr=function(){var F,D,C={},A=false,K=new Date();function M(){F={};D=new Ext.util.MixedCollection();Ext.getDoc().addKeyListener(27,function(){if(D.length>0){H()}})}function H(){if(D&&D.length>0){var N=D.clone();N.each(function(O){O.hide()})}}function E(N){D.remove(N);if(D.length<1){Ext.getDoc().un("mousedown",L);A=false}}function J(N){var O=D.last();K=new Date();D.add(N);if(!A){Ext.getDoc().on("mousedown",L);A=true}if(N.parentMenu){N.getEl().setZIndex(parseInt(N.parentMenu.getEl().getStyle("z-index"),10)+3);N.parentMenu.activeChild=N}else{if(O&&O.isVisible()){N.getEl().setZIndex(parseInt(O.getEl().getStyle("z-index"),10)+3)}}}function B(N){if(N.activeChild){N.activeChild.hide()}if(N.autoHideTimer){clearTimeout(N.autoHideTimer);delete N.autoHideTimer}}function G(N){var O=N.parentMenu;if(!O&&!N.allowOtherMenus){H()}else{if(O&&O.activeChild){O.activeChild.hide()}}}function L(N){if(K.getElapsed()>50&&D.length>0&&!N.getTarget(".x-menu")){H()}}function I(O,R){if(R){var Q=C[O.group];for(var P=0,N=Q.length;P<N;P++){if(Q[P]!=O){Q[P].setChecked(false)}}}}return{hideAll:function(){H()},register:function(O){if(!F){M()}F[O.id]=O;O.on("beforehide",B);O.on("hide",E);O.on("beforeshow",G);O.on("show",J);var N=O.group;if(N&&O.events["checkchange"]){if(!C[N]){C[N]=[]}C[N].push(O);O.on("checkchange",onCheck)}},get:function(N){if(typeof N=="string"){if(!F){return null}return F[N]}else{if(N.events){return N}else{if(typeof N.length=="number"){return new Ext.menu.Menu({items:N})}else{return new Ext.menu.Menu(N)}}}},unregister:function(O){delete F[O.id];O.un("beforehide",B);O.un("hide",E);O.un("beforeshow",G);O.un("show",J);var N=O.group;if(N&&O.events["checkchange"]){C[N].remove(O);O.un("checkchange",onCheck)}},registerCheckable:function(N){var O=N.group;if(O){if(!C[O]){C[O]=[]}C[O].push(N);N.on("beforecheckchange",I)}},unregisterCheckable:function(N){var O=N.group;if(O){C[O].remove(N);N.un("beforecheckchange",I)}},getCheckedItem:function(P){var Q=C[P];if(Q){for(var O=0,N=Q.length;O<N;O++){if(Q[O].checked){return Q[O]}}}return null},setCheckedItem:function(P,R){var Q=C[P];if(Q){for(var O=0,N=Q.length;O<N;O++){if(Q[O].id==R){Q[O].setChecked(true)}}}return null}}}();
Ext.menu.BaseItem=function(A){Ext.menu.BaseItem.superclass.constructor.call(this,A);this.addEvents("click","activate","deactivate");if(this.handler){this.on("click",this.handler,this.scope)}};Ext.extend(Ext.menu.BaseItem,Ext.Component,{canActivate:false,activeClass:"x-menu-item-active",hideOnClick:true,hideDelay:100,ctype:"Ext.menu.BaseItem",actionMode:"container",render:function(A,B){this.parentMenu=B;Ext.menu.BaseItem.superclass.render.call(this,A);this.container.menuItemId=this.id},onRender:function(B,A){this.el=Ext.get(this.el);B.dom.appendChild(this.el.dom)},setHandler:function(B,A){if(this.handler){this.un("click",this.handler,this.scope)}this.on("click",this.handler=B,this.scope=A)},onClick:function(A){if(!this.disabled&&this.fireEvent("click",this,A)!==false&&this.parentMenu.fireEvent("itemclick",this,A)!==false){this.handleClick(A)}else{A.stopEvent()}},activate:function(){if(this.disabled){return false}var A=this.container;A.addClass(this.activeClass);this.region=A.getRegion().adjust(2,2,-2,-2);this.fireEvent("activate",this);return true},deactivate:function(){this.container.removeClass(this.activeClass);this.fireEvent("deactivate",this)},shouldDeactivate:function(A){return !this.region||!this.region.contains(A.getPoint())},handleClick:function(A){if(this.hideOnClick){this.parentMenu.hide.defer(this.hideDelay,this.parentMenu,[true])}},expandMenu:function(A){},hideMenu:function(){}});
Ext.menu.TextItem=function(A){this.text=A;Ext.menu.TextItem.superclass.constructor.call(this)};Ext.extend(Ext.menu.TextItem,Ext.menu.BaseItem,{hideOnClick:false,itemCls:"x-menu-text",onRender:function(){var A=document.createElement("span");A.className=this.itemCls;A.innerHTML=this.text;this.el=A;Ext.menu.TextItem.superclass.onRender.apply(this,arguments)}});
Ext.menu.Separator=function(A){Ext.menu.Separator.superclass.constructor.call(this,A)};Ext.extend(Ext.menu.Separator,Ext.menu.BaseItem,{itemCls:"x-menu-sep",hideOnClick:false,onRender:function(A){var B=document.createElement("span");B.className=this.itemCls;B.innerHTML="&#160;";this.el=B;A.addClass("x-menu-sep-li");Ext.menu.Separator.superclass.onRender.apply(this,arguments)}});
Ext.menu.Item=function(A){Ext.menu.Item.superclass.constructor.call(this,A);if(this.menu){this.menu=Ext.menu.MenuMgr.get(this.menu)}};Ext.extend(Ext.menu.Item,Ext.menu.BaseItem,{itemCls:"x-menu-item",canActivate:true,showDelay:200,hideDelay:200,ctype:"Ext.menu.Item",onRender:function(B,A){var C=document.createElement("a");C.hideFocus=true;C.unselectable="on";C.href=this.href||"#";if(this.hrefTarget){C.target=this.hrefTarget}C.className=this.itemCls+(this.menu?" x-menu-item-arrow":"")+(this.cls?" "+this.cls:"");C.innerHTML=String.format("<img src=\"{0}\" class=\"x-menu-item-icon {2}\" />{1}",this.icon||Ext.BLANK_IMAGE_URL,this.itemText||this.text,this.iconCls||"");this.el=C;Ext.menu.Item.superclass.onRender.call(this,B,A)},setText:function(A){this.text=A;if(this.rendered){this.el.update(String.format("<img src=\"{0}\" class=\"x-menu-item-icon {2}\">{1}",this.icon||Ext.BLANK_IMAGE_URL,this.text,this.iconCls||""));this.parentMenu.autoWidth()}},setIconClass:function(A){var B=this.iconCls;this.iconCls=A;if(this.rendered){this.el.child("img.x-menu-item-icon").replaceClass(B,this.iconCls)}},handleClick:function(A){if(!this.href){A.stopEvent()}Ext.menu.Item.superclass.handleClick.apply(this,arguments)},activate:function(A){if(Ext.menu.Item.superclass.activate.apply(this,arguments)){this.focus();if(A){this.expandMenu()}}return true},shouldDeactivate:function(A){if(Ext.menu.Item.superclass.shouldDeactivate.call(this,A)){if(this.menu&&this.menu.isVisible()){return !this.menu.getEl().getRegion().contains(A.getPoint())}return true}return false},deactivate:function(){Ext.menu.Item.superclass.deactivate.apply(this,arguments);this.hideMenu()},expandMenu:function(A){if(!this.disabled&&this.menu){clearTimeout(this.hideTimer);delete this.hideTimer;if(!this.menu.isVisible()&&!this.showTimer){this.showTimer=this.deferExpand.defer(this.showDelay,this,[A])}else{if(this.menu.isVisible()&&A){this.menu.tryActivate(0,1)}}}},deferExpand:function(A){delete this.showTimer;this.menu.show(this.container,this.parentMenu.subMenuAlign||"tl-tr?",this.parentMenu);if(A){this.menu.tryActivate(0,1)}},hideMenu:function(){clearTimeout(this.showTimer);delete this.showTimer;if(!this.hideTimer&&this.menu&&this.menu.isVisible()){this.hideTimer=this.deferHide.defer(this.hideDelay,this)}},deferHide:function(){delete this.hideTimer;this.menu.hide()}});
Ext.menu.CheckItem=function(A){Ext.menu.CheckItem.superclass.constructor.call(this,A);this.addEvents("beforecheckchange","checkchange");if(this.checkHandler){this.on("checkchange",this.checkHandler,this.scope)}Ext.menu.MenuMgr.registerCheckable(this)};Ext.extend(Ext.menu.CheckItem,Ext.menu.Item,{itemCls:"x-menu-item x-menu-check-item",groupClass:"x-menu-group-item",checked:false,ctype:"Ext.menu.CheckItem",onRender:function(A){Ext.menu.CheckItem.superclass.onRender.apply(this,arguments);if(this.group){this.el.addClass(this.groupClass)}if(this.checked){this.checked=false;this.setChecked(true,true)}},destroy:function(){Ext.menu.MenuMgr.unregisterCheckable(this);Ext.menu.CheckItem.superclass.destroy.apply(this,arguments)},setChecked:function(B,A){if(this.checked!=B&&this.fireEvent("beforecheckchange",this,B)!==false){if(this.container){this.container[B?"addClass":"removeClass"]("x-menu-item-checked")}this.checked=B;if(A!==true){this.fireEvent("checkchange",this,B)}}},handleClick:function(A){if(!this.disabled&&!(this.checked&&this.group)){this.setChecked(!this.checked)}Ext.menu.CheckItem.superclass.handleClick.apply(this,arguments)}});
Ext.menu.Adapter=function(B,A){Ext.menu.Adapter.superclass.constructor.call(this,A);this.component=B};Ext.extend(Ext.menu.Adapter,Ext.menu.BaseItem,{canActivate:true,onRender:function(B,A){this.component.render(B);this.el=this.component.getEl()},activate:function(){if(this.disabled){return false}this.component.focus();this.fireEvent("activate",this);return true},deactivate:function(){this.fireEvent("deactivate",this)},disable:function(){this.component.disable();Ext.menu.Adapter.superclass.disable.call(this)},enable:function(){this.component.enable();Ext.menu.Adapter.superclass.enable.call(this)}});
Ext.menu.DateItem=function(A){Ext.menu.DateItem.superclass.constructor.call(this,new Ext.DatePicker(A),A);this.picker=this.component;this.addEvents("select");this.picker.on("render",function(B){B.getEl().swallowEvent("click");B.container.addClass("x-menu-date-item")});this.picker.on("select",this.onSelect,this)};Ext.extend(Ext.menu.DateItem,Ext.menu.Adapter,{onSelect:function(B,A){this.fireEvent("select",this,A,B);Ext.menu.DateItem.superclass.handleClick.call(this)}});
Ext.menu.ColorItem=function(A){Ext.menu.ColorItem.superclass.constructor.call(this,new Ext.ColorPalette(A),A);this.palette=this.component;this.relayEvents(this.palette,["select"]);if(this.selectHandler){this.on("select",this.selectHandler,this.scope)}};Ext.extend(Ext.menu.ColorItem,Ext.menu.Adapter);
Ext.menu.DateMenu=function(A){Ext.menu.DateMenu.superclass.constructor.call(this,A);this.plain=true;var B=new Ext.menu.DateItem(A);this.add(B);this.picker=B.picker;this.relayEvents(B,["select"]);this.on("beforeshow",function(){if(this.picker){this.picker.hideMonthPicker(true)}},this)};Ext.extend(Ext.menu.DateMenu,Ext.menu.Menu,{cls:"x-date-menu",beforeDestroy:function(){this.picker.destroy()}});
Ext.menu.ColorMenu=function(A){Ext.menu.ColorMenu.superclass.constructor.call(this,A);this.plain=true;var B=new Ext.menu.ColorItem(A);this.add(B);this.palette=B.palette;this.relayEvents(B,["select"])};Ext.extend(Ext.menu.ColorMenu,Ext.menu.Menu);
Ext.form.Field=Ext.extend(Ext.BoxComponent,{invalidClass:"x-form-invalid",invalidText:"The value in this field is invalid",focusClass:"x-form-focus",validationEvent:"keyup",validateOnBlur:true,validationDelay:250,defaultAutoCreate:{tag:"input",type:"text",size:"20",autocomplete:"off"},fieldClass:"x-form-field",msgTarget:"qtip",msgFx:"normal",readOnly:false,disabled:false,isFormField:true,hasFocus:false,initComponent:function(){Ext.form.Field.superclass.initComponent.call(this);this.addEvents("focus","blur","specialkey","change","invalid","valid")},getName:function(){return this.rendered&&this.el.dom.name?this.el.dom.name:(this.hiddenName||"")},onRender:function(C,A){Ext.form.Field.superclass.onRender.call(this,C,A);if(!this.el){var B=this.getAutoCreate();if(!B.name){B.name=this.name||this.id}if(this.inputType){B.type=this.inputType}this.el=C.createChild(B,A)}var D=this.el.dom.type;if(D){if(D=="password"){D="text"}this.el.addClass("x-form-"+D)}if(this.readOnly){this.el.dom.readOnly=true}if(this.tabIndex!==undefined){this.el.dom.setAttribute("tabIndex",this.tabIndex)}this.el.addClass([this.fieldClass,this.cls]);this.initValue()},initValue:function(){if(this.value!==undefined){this.setValue(this.value)}else{if(this.el.dom.value.length>0){this.setValue(this.el.dom.value)}}},isDirty:function(){if(this.disabled){return false}return String(this.getValue())!==String(this.originalValue)},afterRender:function(){Ext.form.Field.superclass.afterRender.call(this);this.initEvents()},fireKey:function(A){if(A.isSpecialKey()){this.fireEvent("specialkey",this,A)}},reset:function(){this.setValue(this.originalValue);this.clearInvalid()},initEvents:function(){this.el.on(Ext.isIE?"keydown":"keypress",this.fireKey,this);this.el.on("focus",this.onFocus,this);this.el.on("blur",this.onBlur,this);this.originalValue=this.getValue()},onFocus:function(){if(!Ext.isOpera&&this.focusClass){this.el.addClass(this.focusClass)}if(!this.hasFocus){this.hasFocus=true;this.startValue=this.getValue();this.fireEvent("focus",this)}},beforeBlur:Ext.emptyFn,onBlur:function(){this.beforeBlur();if(!Ext.isOpera&&this.focusClass){this.el.removeClass(this.focusClass)}this.hasFocus=false;if(this.validationEvent!==false&&this.validateOnBlur&&this.validationEvent!="blur"){this.validate()}var A=this.getValue();if(String(A)!==String(this.startValue)){this.fireEvent("change",this,A,this.startValue)}this.fireEvent("blur",this)},isValid:function(A){if(this.disabled){return true}var C=this.preventMark;this.preventMark=A===true;var B=this.validateValue(this.processValue(this.getRawValue()));this.preventMark=C;return B},validate:function(){if(this.disabled||this.validateValue(this.processValue(this.getRawValue()))){this.clearInvalid();return true}return false},processValue:function(A){return A},validateValue:function(A){return true},markInvalid:function(C){if(!this.rendered||this.preventMark){return }this.el.addClass(this.invalidClass);C=C||this.invalidText;switch(this.msgTarget){case"qtip":this.el.dom.qtip=C;this.el.dom.qclass="x-form-invalid-tip";if(Ext.QuickTips){Ext.QuickTips.enable()}break;case"title":this.el.dom.title=C;break;case"under":if(!this.errorEl){var B=this.el.findParent(".x-form-element",5,true);this.errorEl=B.createChild({cls:"x-form-invalid-msg"});this.errorEl.setWidth(B.getWidth(true)-20)}this.errorEl.update(C);Ext.form.Field.msgFx[this.msgFx].show(this.errorEl,this);break;case"side":if(!this.errorIcon){var B=this.el.findParent(".x-form-element",5,true);this.errorIcon=B.createChild({cls:"x-form-invalid-icon"})}this.alignErrorIcon();this.errorIcon.dom.qtip=C;this.errorIcon.dom.qclass="x-form-invalid-tip";this.errorIcon.show();this.on("resize",this.alignErrorIcon,this);break;default:var A=Ext.getDom(this.msgTarget);A.innerHTML=C;A.style.display=this.msgDisplay;break}this.fireEvent("invalid",this,C)},alignErrorIcon:function(){this.errorIcon.alignTo(this.el,"tl-tr",[2,0])},clearInvalid:function(){if(!this.rendered||this.preventMark){return }this.el.removeClass(this.invalidClass);switch(this.msgTarget){case"qtip":this.el.dom.qtip="";break;case"title":this.el.dom.title="";break;case"under":if(this.errorEl){Ext.form.Field.msgFx[this.msgFx].hide(this.errorEl,this)}break;case"side":if(this.errorIcon){this.errorIcon.dom.qtip="";this.errorIcon.hide();this.un("resize",this.alignErrorIcon,this)}break;default:var A=Ext.getDom(this.msgTarget);A.innerHTML="";A.style.display="none";break}this.fireEvent("valid",this)},getRawValue:function(){var A=this.rendered?this.el.getValue():Ext.value(this.value,"");if(A===this.emptyText){A=""}return A},getValue:function(){if(!this.rendered){return this.value}var A=this.el.getValue();if(A===this.emptyText||A===undefined){A=""}return A},setRawValue:function(A){return this.el.dom.value=(A===null||A===undefined?"":A)},setValue:function(A){this.value=A;if(this.rendered){this.el.dom.value=(A===null||A===undefined?"":A);this.validate()}},adjustSize:function(A,C){var B=Ext.form.Field.superclass.adjustSize.call(this,A,C);B.width=this.adjustWidth(this.el.dom.tagName,B.width);return B},adjustWidth:function(A,B){A=A.toLowerCase();if(typeof B=="number"&&!Ext.isSafari){if(Ext.isIE&&(A=="input"||A=="textarea")){if(A=="input"&&!Ext.isStrict){return this.inEditor?B:B-3}if(A=="input"&&Ext.isStrict){return B-(Ext.isIE6?4:1)}if(A="textarea"&&Ext.isStrict){return B-2}}else{if(Ext.isOpera&&Ext.isStrict){if(A=="input"){return B+2}if(A="textarea"){return B-2}}}}return B}});Ext.form.Field.msgFx={normal:{show:function(A,B){A.setDisplayed("block")},hide:function(A,B){A.setDisplayed(false).update("")}},slide:{show:function(A,B){A.slideIn("t",{stopFx:true})},hide:function(A,B){A.slideOut("t",{stopFx:true,useDisplay:true})}},slideRight:{show:function(A,B){A.fixDisplay();A.alignTo(B.el,"tl-tr");A.slideIn("l",{stopFx:true})},hide:function(A,B){A.slideOut("l",{stopFx:true,useDisplay:true})}}};Ext.reg("field",Ext.form.Field);
Ext.form.TextField=Ext.extend(Ext.form.Field,{grow:false,growMin:30,growMax:800,vtype:null,maskRe:null,disableKeyFilter:false,allowBlank:true,minLength:0,maxLength:Number.MAX_VALUE,minLengthText:"The minimum length for this field is {0}",maxLengthText:"The maximum length for this field is {0}",selectOnFocus:false,blankText:"This field is required",validator:null,regex:null,regexText:"",emptyText:null,emptyClass:"x-form-empty-field",initComponent:function(){Ext.form.TextField.superclass.initComponent.call(this);this.addEvents("autosize")},initEvents:function(){Ext.form.TextField.superclass.initEvents.call(this);if(this.validationEvent=="keyup"){this.validationTask=new Ext.util.DelayedTask(this.validate,this);this.el.on("keyup",this.filterValidation,this)}else{if(this.validationEvent!==false){this.el.on(this.validationEvent,this.validate,this,{buffer:this.validationDelay})}}if(this.selectOnFocus||this.emptyText){this.on("focus",this.preFocus,this);if(this.emptyText){this.on("blur",this.postBlur,this);this.applyEmptyText()}}if(this.maskRe||(this.vtype&&this.disableKeyFilter!==true&&(this.maskRe=Ext.form.VTypes[this.vtype+"Mask"]))){this.el.on("keypress",this.filterKeys,this)}if(this.grow){this.el.on("keyup",this.onKeyUp,this,{buffer:50});this.el.on("click",this.autoSize,this)}},processValue:function(A){if(this.stripCharsRe){var B=A.replace(this.stripCharsRe,"");if(B!==A){this.setRawValue(B);return B}}return A},filterValidation:function(A){if(!A.isNavKeyPress()){this.validationTask.delay(this.validationDelay)}},onKeyUp:function(A){if(!A.isNavKeyPress()){this.autoSize()}},reset:function(){Ext.form.TextField.superclass.reset.call(this);this.applyEmptyText()},applyEmptyText:function(){if(this.rendered&&this.emptyText&&this.getRawValue().length<1){this.setRawValue(this.emptyText);this.el.addClass(this.emptyClass)}},preFocus:function(){if(this.emptyText){if(this.el.dom.value==this.emptyText){this.setRawValue("")}this.el.removeClass(this.emptyClass)}if(this.selectOnFocus){this.el.dom.select()}},postBlur:function(){this.applyEmptyText()},filterKeys:function(B){var A=B.getKey();if(!Ext.isIE&&(B.isNavKeyPress()||A==B.BACKSPACE||(A==B.DELETE&&B.button==-1))){return }var D=B.getCharCode(),C=String.fromCharCode(D);if(Ext.isIE&&(B.isSpecialKey()||!C)){return }if(!this.maskRe.test(C)){B.stopEvent()}},setValue:function(A){if(this.emptyText&&this.el&&A!==undefined&&A!==null&&A!==""){this.el.removeClass(this.emptyClass)}Ext.form.TextField.superclass.setValue.apply(this,arguments);this.applyEmptyText();this.autoSize()},validateValue:function(A){if(A.length<1||A===this.emptyText){if(this.allowBlank){this.clearInvalid();return true}else{this.markInvalid(this.blankText);return false}}if(A.length<this.minLength){this.markInvalid(String.format(this.minLengthText,this.minLength));return false}if(A.length>this.maxLength){this.markInvalid(String.format(this.maxLengthText,this.maxLength));return false}if(this.vtype){var C=Ext.form.VTypes;if(!C[this.vtype](A,this)){this.markInvalid(this.vtypeText||C[this.vtype+"Text"]);return false}}if(typeof this.validator=="function"){var B=this.validator(A);if(B!==true){this.markInvalid(B);return false}}if(this.regex&&!this.regex.test(A)){this.markInvalid(this.regexText);return false}return true},selectText:function(E,A){var C=this.getRawValue();if(C.length>0){E=E===undefined?0:E;A=A===undefined?C.length:A;var D=this.el.dom;if(D.setSelectionRange){D.setSelectionRange(E,A)}else{if(D.createTextRange){var B=D.createTextRange();B.moveStart("character",E);B.moveEnd("character",A-C.length);B.select()}}}},autoSize:function(){if(!this.grow||!this.rendered){return }if(!this.metrics){this.metrics=Ext.util.TextMetrics.createInstance(this.el)}var C=this.el;var B=C.dom.value;var D=document.createElement("div");D.appendChild(document.createTextNode(B));B=D.innerHTML;D=null;B+="&#160;";var A=Math.min(this.growMax,Math.max(this.metrics.getWidth(B)+10,this.growMin));this.el.setWidth(A);this.fireEvent("autosize",this,A)}});Ext.reg("textfield",Ext.form.TextField);
Ext.form.TriggerField=Ext.extend(Ext.form.TextField,{defaultAutoCreate:{tag:"input",type:"text",size:"16",autocomplete:"off"},hideTrigger:false,autoSize:Ext.emptyFn,monitorTab:true,deferHeight:true,mimicing:false,onResize:function(A,B){Ext.form.TriggerField.superclass.onResize.call(this,A,B);if(typeof A=="number"){this.el.setWidth(this.adjustWidth("input",A-this.trigger.getWidth()))}this.wrap.setWidth(this.el.getWidth()+this.trigger.getWidth())},adjustSize:Ext.BoxComponent.prototype.adjustSize,getResizeEl:function(){return this.wrap},getPositionEl:function(){return this.wrap},alignErrorIcon:function(){this.errorIcon.alignTo(this.wrap,"tl-tr",[2,0])},onRender:function(B,A){Ext.form.TriggerField.superclass.onRender.call(this,B,A);this.wrap=this.el.wrap({cls:"x-form-field-wrap"});this.trigger=this.wrap.createChild(this.triggerConfig||{tag:"img",src:Ext.BLANK_IMAGE_URL,cls:"x-form-trigger "+this.triggerClass});if(this.hideTrigger){this.trigger.setDisplayed(false)}this.initTrigger();if(!this.width){this.wrap.setWidth(this.el.getWidth()+this.trigger.getWidth())}},initTrigger:function(){this.trigger.on("click",this.onTriggerClick,this,{preventDefault:true});this.trigger.addClassOnOver("x-form-trigger-over");this.trigger.addClassOnClick("x-form-trigger-click")},onDestroy:function(){if(this.trigger){this.trigger.removeAllListeners();this.trigger.remove()}if(this.wrap){this.wrap.remove()}Ext.form.TriggerField.superclass.onDestroy.call(this)},onFocus:function(){Ext.form.TriggerField.superclass.onFocus.call(this);if(!this.mimicing){this.wrap.addClass("x-trigger-wrap-focus");this.mimicing=true;Ext.get(Ext.isIE?document.body:document).on("mousedown",this.mimicBlur,this,{delay:10});if(this.monitorTab){this.el.on("keydown",this.checkTab,this)}}},checkTab:function(A){if(A.getKey()==A.TAB){this.triggerBlur()}},onBlur:function(){},mimicBlur:function(A){if(!this.wrap.contains(A.target)&&this.validateBlur(A)){this.triggerBlur()}},triggerBlur:function(){this.mimicing=false;Ext.get(Ext.isIE?document.body:document).un("mousedown",this.mimicBlur);if(this.monitorTab){this.el.un("keydown",this.checkTab,this)}this.beforeBlur();this.wrap.removeClass("x-trigger-wrap-focus");Ext.form.TriggerField.superclass.onBlur.call(this)},beforeBlur:Ext.emptyFn,validateBlur:function(A){return true},onDisable:function(){Ext.form.TriggerField.superclass.onDisable.call(this);if(this.wrap){this.wrap.addClass("x-item-disabled")}},onEnable:function(){Ext.form.TriggerField.superclass.onEnable.call(this);if(this.wrap){this.wrap.removeClass("x-item-disabled")}},onShow:function(){if(this.wrap){this.wrap.dom.style.display="";this.wrap.dom.style.visibility="visible"}},onHide:function(){this.wrap.dom.style.display="none"},onTriggerClick:Ext.emptyFn});Ext.form.TwinTriggerField=Ext.extend(Ext.form.TriggerField,{initComponent:function(){Ext.form.TwinTriggerField.superclass.initComponent.call(this);this.triggerConfig={tag:"span",cls:"x-form-twin-triggers",cn:[{tag:"img",src:Ext.BLANK_IMAGE_URL,cls:"x-form-trigger "+this.trigger1Class},{tag:"img",src:Ext.BLANK_IMAGE_URL,cls:"x-form-trigger "+this.trigger2Class}]}},getTrigger:function(A){return this.triggers[A]},initTrigger:function(){var A=this.trigger.select(".x-form-trigger",true);this.wrap.setStyle("overflow","hidden");var B=this;A.each(function(D,F,C){D.hide=function(){var G=B.wrap.getWidth();this.dom.style.display="none";B.el.setWidth(G-B.trigger.getWidth())};D.show=function(){var G=B.wrap.getWidth();this.dom.style.display="";B.el.setWidth(G-B.trigger.getWidth())};var E="Trigger"+(C+1);if(this["hide"+E]){D.dom.style.display="none"}D.on("click",this["on"+E+"Click"],this,{preventDefault:true});D.addClassOnOver("x-form-trigger-over");D.addClassOnClick("x-form-trigger-click")},this);this.triggers=A.elements},onTrigger1Click:Ext.emptyFn,onTrigger2Click:Ext.emptyFn});Ext.reg("trigger",Ext.form.TriggerField);
Ext.form.TextArea=Ext.extend(Ext.form.TextField,{growMin:60,growMax:1000,growAppend:"&#160;\n&#160;",growPad:0,enterIsSpecial:false,preventScrollbars:false,onRender:function(B,A){if(!this.el){this.defaultAutoCreate={tag:"textarea",style:"width:100px;height:60px;",autocomplete:"off"}}Ext.form.TextArea.superclass.onRender.call(this,B,A);if(this.grow){this.textSizeEl=Ext.DomHelper.append(document.body,{tag:"pre",cls:"x-form-grow-sizer"});if(this.preventScrollbars){this.el.setStyle("overflow","hidden")}this.el.setHeight(this.growMin)}},onDestroy:function(){if(this.textSizeEl){Ext.removeNode(this.textSizeEl)}Ext.form.TextArea.superclass.onDestroy.call(this)},fireKey:function(A){if(A.isSpecialKey()&&(this.enterIsSpecial||(A.getKey()!=A.ENTER||A.hasModifier()))){this.fireEvent("specialkey",this,A)}},onKeyUp:function(A){if(!A.isNavKeyPress()||A.getKey()==A.ENTER){this.autoSize()}},autoSize:function(){if(!this.grow||!this.textSizeEl){return }var C=this.el;var A=C.dom.value;var D=this.textSizeEl;D.innerHTML="";D.appendChild(document.createTextNode(A));A=D.innerHTML;Ext.fly(D).setWidth(this.el.getWidth());if(A.length<1){A="&#160;&#160;"}else{if(Ext.isIE){A=A.replace(/\n/g,"<p>&#160;</p>")}A+=this.growAppend}D.innerHTML=A;var B=Math.min(this.growMax,Math.max(D.offsetHeight,this.growMin)+this.growPad);if(B!=this.lastHeight){this.lastHeight=B;this.el.setHeight(B);this.fireEvent("autosize",this,B)}}});Ext.reg("textarea",Ext.form.TextArea);
Ext.form.NumberField=Ext.extend(Ext.form.TextField,{fieldClass:"x-form-field x-form-num-field",allowDecimals:true,decimalSeparator:".",decimalPrecision:2,allowNegative:true,minValue:Number.NEGATIVE_INFINITY,maxValue:Number.MAX_VALUE,minText:"The minimum value for this field is {0}",maxText:"The maximum value for this field is {0}",nanText:"{0} is not a valid number",baseChars:"0123456789",initEvents:function(){Ext.form.NumberField.superclass.initEvents.call(this);var B=this.baseChars+"";if(this.allowDecimals){B+=this.decimalSeparator}if(this.allowNegative){B+="-"}this.stripCharsRe=new RegExp("[^"+B+"]","gi");var A=function(D){var C=D.getKey();if(!Ext.isIE&&(D.isSpecialKey()||C==D.BACKSPACE||C==D.DELETE)){return }var E=D.getCharCode();if(B.indexOf(String.fromCharCode(E))===-1){D.stopEvent()}};this.el.on("keypress",A,this)},validateValue:function(B){if(!Ext.form.NumberField.superclass.validateValue.call(this,B)){return false}if(B.length<1){return true}B=String(B).replace(this.decimalSeparator,".");if(isNaN(B)){this.markInvalid(String.format(this.nanText,B));return false}var A=this.parseValue(B);if(A<this.minValue){this.markInvalid(String.format(this.minText,this.minValue));return false}if(A>this.maxValue){this.markInvalid(String.format(this.maxText,this.maxValue));return false}return true},getValue:function(){return this.fixPrecision(this.parseValue(Ext.form.NumberField.superclass.getValue.call(this)))},setValue:function(A){A=parseFloat(A);A=isNaN(A)?"":String(A).replace(".",this.decimalSeparator);Ext.form.NumberField.superclass.setValue.call(this,A)},parseValue:function(A){A=parseFloat(String(A).replace(this.decimalSeparator,"."));return isNaN(A)?"":A},fixPrecision:function(B){var A=isNaN(B);if(!this.allowDecimals||this.decimalPrecision==-1||A||!B){return A?"":B}return parseFloat(parseFloat(B).toFixed(this.decimalPrecision))},beforeBlur:function(){var A=this.parseValue(this.getRawValue());if(A){this.setValue(this.fixPrecision(A))}}});Ext.reg("numberfield",Ext.form.NumberField);
Ext.form.DateField=Ext.extend(Ext.form.TriggerField,{format:"m/d/y",altFormats:"m/d/Y|n/j/Y|n/j/y|m/j/y|n/d/y|m/j/Y|n/d/Y|m-d-y|m-d-Y|m/d|m-d|md|mdy|mdY|d|Y-m-d",disabledDays:null,disabledDaysText:"Disabled",disabledDates:null,disabledDatesText:"Disabled",minValue:null,maxValue:null,minText:"The date in this field must be equal to or after {0}",maxText:"The date in this field must be equal to or before {0}",invalidText:"{0} is not a valid date - it must be in the format {1}",triggerClass:"x-form-date-trigger",defaultAutoCreate:{tag:"input",type:"text",size:"10",autocomplete:"off"},initComponent:function(){Ext.form.DateField.superclass.initComponent.call(this);if(typeof this.minValue=="string"){this.minValue=this.parseDate(this.minValue)}if(typeof this.maxValue=="string"){this.maxValue=this.parseDate(this.maxValue)}this.ddMatch=null;if(this.disabledDates){var A=this.disabledDates;var C="(?:";for(var B=0;B<A.length;B++){C+=A[B];if(B!=A.length-1){C+="|"}}this.ddMatch=new RegExp(C+")")}},validateValue:function(E){E=this.formatDate(E);if(!Ext.form.DateField.superclass.validateValue.call(this,E)){return false}if(E.length<1){return true}var C=E;E=this.parseDate(E);if(!E){this.markInvalid(String.format(this.invalidText,C,this.format));return false}var F=E.getTime();if(this.minValue&&F<this.minValue.getTime()){this.markInvalid(String.format(this.minText,this.formatDate(this.minValue)));return false}if(this.maxValue&&F>this.maxValue.getTime()){this.markInvalid(String.format(this.maxText,this.formatDate(this.maxValue)));return false}if(this.disabledDays){var A=E.getDay();for(var B=0;B<this.disabledDays.length;B++){if(A===this.disabledDays[B]){this.markInvalid(this.disabledDaysText);return false}}}var D=this.formatDate(E);if(this.ddMatch&&this.ddMatch.test(D)){this.markInvalid(String.format(this.disabledDatesText,D));return false}return true},validateBlur:function(){return !this.menu||!this.menu.isVisible()},getValue:function(){return this.parseDate(Ext.form.DateField.superclass.getValue.call(this))||""},setValue:function(A){Ext.form.DateField.superclass.setValue.call(this,this.formatDate(this.parseDate(A)))},parseDate:function(D){if(!D||Ext.isDate(D)){return D}var B=Date.parseDate(D,this.format);if(!B&&this.altFormats){if(!this.altFormatsArray){this.altFormatsArray=this.altFormats.split("|")}for(var C=0,A=this.altFormatsArray.length;C<A&&!B;C++){B=Date.parseDate(D,this.altFormatsArray[C])}}return B},onDestroy:function(){if(this.menu){this.menu.destroy()}if(this.wrap){this.wrap.remove()}Ext.form.DateField.superclass.onDestroy.call(this)},formatDate:function(A){return Ext.isDate(A)?A.dateFormat(this.format):A},menuListeners:{select:function(A,B){this.setValue(B)},show:function(){this.onFocus()},hide:function(){this.focus.defer(10,this);var A=this.menuListeners;this.menu.un("select",A.select,this);this.menu.un("show",A.show,this);this.menu.un("hide",A.hide,this)}},onTriggerClick:function(){if(this.disabled){return }if(this.menu==null){this.menu=new Ext.menu.DateMenu()}Ext.apply(this.menu.picker,{minDate:this.minValue,maxDate:this.maxValue,disabledDatesRE:this.ddMatch,disabledDatesText:this.disabledDatesText,disabledDays:this.disabledDays,disabledDaysText:this.disabledDaysText,format:this.format,minText:String.format(this.minText,this.formatDate(this.minValue)),maxText:String.format(this.maxText,this.formatDate(this.maxValue))});this.menu.on(Ext.apply({},this.menuListeners,{scope:this}));this.menu.picker.setValue(this.getValue()||new Date());this.menu.show(this.el,"tl-bl?")},beforeBlur:function(){var A=this.parseDate(this.getRawValue());if(A){this.setValue(A)}}});Ext.reg("datefield",Ext.form.DateField);
Ext.form.ComboBox=Ext.extend(Ext.form.TriggerField,{defaultAutoCreate:{tag:"input",type:"text",size:"24",autocomplete:"off"},listClass:"",selectedClass:"x-combo-selected",triggerClass:"x-form-arrow-trigger",shadow:"sides",listAlign:"tl-bl?",maxHeight:300,minHeight:90,triggerAction:"query",minChars:4,typeAhead:false,queryDelay:500,pageSize:0,selectOnFocus:false,queryParam:"query",loadingText:"Loading...",resizable:false,handleHeight:8,editable:true,allQuery:"",mode:"remote",minListWidth:70,forceSelection:false,typeAheadDelay:250,lazyInit:true,initComponent:function(){Ext.form.ComboBox.superclass.initComponent.call(this);this.addEvents("expand","collapse","beforeselect","select","beforequery");if(this.transform){this.allowDomMove=false;var C=Ext.getDom(this.transform);if(!this.hiddenName){this.hiddenName=C.name}if(!this.store){this.mode="local";var G=[],D=C.options;for(var B=0,A=D.length;B<A;B++){var F=D[B];var E=(Ext.isIE?F.getAttributeNode("value").specified:F.hasAttribute("value"))?F.value:F.text;if(F.selected){this.value=E}G.push([E,F.text])}this.store=new Ext.data.SimpleStore({"id":0,fields:["value","text"],data:G});this.valueField="value";this.displayField="text"}C.name=Ext.id();if(!this.lazyRender){this.target=true;this.el=Ext.DomHelper.insertBefore(C,this.autoCreate||this.defaultAutoCreate);Ext.removeNode(C);this.render(this.el.parentNode)}else{Ext.removeNode(C)}}this.selectedIndex=-1;if(this.mode=="local"){if(this.initialConfig.queryDelay===undefined){this.queryDelay=10}if(this.initialConfig.minChars===undefined){this.minChars=0}}},onRender:function(B,A){Ext.form.ComboBox.superclass.onRender.call(this,B,A);if(this.hiddenName){this.hiddenField=this.el.insertSibling({tag:"input",type:"hidden",name:this.hiddenName,id:(this.hiddenId||this.hiddenName)},"before",true);this.hiddenField.value=this.hiddenValue!==undefined?this.hiddenValue:this.value!==undefined?this.value:"";this.el.dom.removeAttribute("name")}if(Ext.isGecko){this.el.dom.setAttribute("autocomplete","off")}if(!this.lazyInit){this.initList()}else{this.on("focus",this.initList,this,{single:true})}if(!this.editable){this.editable=true;this.setEditable(false)}},initList:function(){if(!this.list){var A="x-combo-list";this.list=new Ext.Layer({shadow:this.shadow,cls:[A,this.listClass].join(" "),constrain:false});var B=this.listWidth||Math.max(this.wrap.getWidth(),this.minListWidth);this.list.setWidth(B);this.list.swallowEvent("mousewheel");this.assetHeight=0;if(this.title){this.header=this.list.createChild({cls:A+"-hd",html:this.title});this.assetHeight+=this.header.getHeight()}this.innerList=this.list.createChild({cls:A+"-inner"});this.innerList.on("mouseover",this.onViewOver,this);this.innerList.on("mousemove",this.onViewMove,this);this.innerList.setWidth(B-this.list.getFrameWidth("lr"));if(this.pageSize){this.footer=this.list.createChild({cls:A+"-ft"});this.pageTb=new Ext.PagingToolbar({store:this.store,pageSize:this.pageSize,renderTo:this.footer});this.assetHeight+=this.footer.getHeight()}if(!this.tpl){this.tpl="<tpl for=\".\"><div class=\""+A+"-item\">{"+this.displayField+"}</div></tpl>"}this.view=new Ext.DataView({applyTo:this.innerList,tpl:this.tpl,singleSelect:true,selectedClass:this.selectedClass,itemSelector:this.itemSelector||"."+A+"-item"});this.view.on("click",this.onViewClick,this);this.bindStore(this.store,true);if(this.resizable){this.resizer=new Ext.Resizable(this.list,{pinned:true,handles:"se"});this.resizer.on("resize",function(E,C,D){this.maxHeight=D-this.handleHeight-this.list.getFrameWidth("tb")-this.assetHeight;this.listWidth=C;this.innerList.setWidth(C-this.list.getFrameWidth("lr"));this.restrictHeight()},this);this[this.pageSize?"footer":"innerList"].setStyle("margin-bottom",this.handleHeight+"px")}}},bindStore:function(A,B){if(this.store&&!B){this.store.un("beforeload",this.onBeforeLoad,this);this.store.un("load",this.onLoad,this);this.store.un("loadexception",this.collapse,this);if(!A){this.store=null;if(this.view){this.view.setStore(null)}}}if(A){this.store=Ext.StoreMgr.lookup(A);this.store.on("beforeload",this.onBeforeLoad,this);this.store.on("load",this.onLoad,this);this.store.on("loadexception",this.collapse,this);if(this.view){this.view.setStore(A)}}},initEvents:function(){Ext.form.ComboBox.superclass.initEvents.call(this);this.keyNav=new Ext.KeyNav(this.el,{"up":function(A){this.inKeyMode=true;this.selectPrev()},"down":function(A){if(!this.isExpanded()){this.onTriggerClick()}else{this.inKeyMode=true;this.selectNext()}},"enter":function(A){this.onViewClick();this.delayedCheck=true;this.unsetDelayCheck.defer(10,this)},"esc":function(A){this.collapse()},"tab":function(A){this.onViewClick(false);return true},scope:this,doRelay:function(C,B,A){if(A=="down"||this.scope.isExpanded()){return Ext.KeyNav.prototype.doRelay.apply(this,arguments)}return true},forceKeyDown:true});this.queryDelay=Math.max(this.queryDelay||10,this.mode=="local"?10:250);this.dqTask=new Ext.util.DelayedTask(this.initQuery,this);if(this.typeAhead){this.taTask=new Ext.util.DelayedTask(this.onTypeAhead,this)}if(this.editable!==false){this.el.on("keyup",this.onKeyUp,this)}if(this.forceSelection){this.on("blur",this.doForce,this)}},onDestroy:function(){if(this.view){this.view.el.removeAllListeners();this.view.el.remove();this.view.purgeListeners()}if(this.list){this.list.destroy()}this.bindStore(null);Ext.form.ComboBox.superclass.onDestroy.call(this)},unsetDelayCheck:function(){delete this.delayedCheck},fireKey:function(A){if(A.isNavKeyPress()&&!this.isExpanded()&&!this.delayedCheck){this.fireEvent("specialkey",this,A)}},onResize:function(A,B){Ext.form.ComboBox.superclass.onResize.apply(this,arguments);if(this.list&&this.listWidth===undefined){var C=Math.max(A,this.minListWidth);this.list.setWidth(C);this.innerList.setWidth(C-this.list.getFrameWidth("lr"))}},onEnable:function(){Ext.form.ComboBox.superclass.onEnable.apply(this,arguments);if(this.hiddenField){this.hiddenField.disabled=false}},onDisable:function(){Ext.form.ComboBox.superclass.onDisable.apply(this,arguments);if(this.hiddenField){this.hiddenField.disabled=true}},setEditable:function(A){if(A==this.editable){return }this.editable=A;if(!A){this.el.dom.setAttribute("readOnly",true);this.el.on("mousedown",this.onTriggerClick,this);this.el.addClass("x-combo-noedit")}else{this.el.dom.setAttribute("readOnly",false);this.el.un("mousedown",this.onTriggerClick,this);this.el.removeClass("x-combo-noedit")}},onBeforeLoad:function(){if(!this.hasFocus){return }this.innerList.update(this.loadingText?"<div class=\"loading-indicator\">"+this.loadingText+"</div>":"");this.restrictHeight();this.selectedIndex=-1},onLoad:function(){if(!this.hasFocus){return }if(this.store.getCount()>0){this.expand();this.restrictHeight();if(this.lastQuery==this.allQuery){if(this.editable){this.el.dom.select()}if(!this.selectByValue(this.value,true)){this.select(0,true)}}else{this.selectNext();if(this.typeAhead&&this.lastKey!=Ext.EventObject.BACKSPACE&&this.lastKey!=Ext.EventObject.DELETE){this.taTask.delay(this.typeAheadDelay)}}}else{this.onEmptyResults()}},onTypeAhead:function(){if(this.store.getCount()>0){var B=this.store.getAt(0);var C=B.data[this.displayField];var A=C.length;var D=this.getRawValue().length;if(D!=A){this.setRawValue(C);this.selectText(D,C.length)}}},onSelect:function(A,B){if(this.fireEvent("beforeselect",this,A,B)!==false){this.setValue(A.data[this.valueField||this.displayField]);this.collapse();this.fireEvent("select",this,A,B)}},getValue:function(){if(this.valueField){return typeof this.value!="undefined"?this.value:""}else{return Ext.form.ComboBox.superclass.getValue.call(this)}},clearValue:function(){if(this.hiddenField){this.hiddenField.value=""}this.setRawValue("");this.lastSelectionText="";this.applyEmptyText();this.value=""},setValue:function(A){var C=A;if(this.valueField){var B=this.findRecord(this.valueField,A);if(B){C=B.data[this.displayField]}else{if(this.valueNotFoundText!==undefined){C=this.valueNotFoundText}}}this.lastSelectionText=C;if(this.hiddenField){this.hiddenField.value=A}Ext.form.ComboBox.superclass.setValue.call(this,C);this.value=A},findRecord:function(C,B){var A;if(this.store.getCount()>0){this.store.each(function(D){if(D.data[C]==B){A=D;return false}})}return A},onViewMove:function(B,A){this.inKeyMode=false},onViewOver:function(D,B){if(this.inKeyMode){return }var C=this.view.findItemFromChild(B);if(C){var A=this.view.indexOf(C);this.select(A,false)}},onViewClick:function(B){var A=this.view.getSelectedIndexes()[0];var C=this.store.getAt(A);if(C){this.onSelect(C,A)}if(B!==false){this.el.focus()}},restrictHeight:function(){this.innerList.dom.style.height="";var B=this.innerList.dom;var E=this.list.getFrameWidth("tb")+(this.resizable?this.handleHeight:0)+this.assetHeight;var C=Math.max(B.clientHeight,B.offsetHeight,B.scrollHeight);var A=this.getPosition()[1]-Ext.getBody().getScroll().top;var F=Ext.lib.Dom.getViewHeight()-A-this.getSize().height;var D=Math.max(A,F,this.minHeight||0)-this.list.shadow.offset-E-2;C=Math.min(C,D,this.maxHeight);this.innerList.setHeight(C);this.list.beginUpdate();this.list.setHeight(C+E);this.list.alignTo(this.el,this.listAlign);this.list.endUpdate()},onEmptyResults:function(){this.collapse()},isExpanded:function(){return this.list&&this.list.isVisible()},selectByValue:function(A,C){if(A!==undefined&&A!==null){var B=this.findRecord(this.valueField||this.displayField,A);if(B){this.select(this.store.indexOf(B),C);return true}}return false},select:function(A,C){this.selectedIndex=A;this.view.select(A);if(C!==false){var B=this.view.getNode(A);if(B){this.innerList.scrollChildIntoView(B,false)}}},selectNext:function(){var A=this.store.getCount();if(A>0){if(this.selectedIndex==-1){this.select(0)}else{if(this.selectedIndex<A-1){this.select(this.selectedIndex+1)}}}},selectPrev:function(){var A=this.store.getCount();if(A>0){if(this.selectedIndex==-1){this.select(0)}else{if(this.selectedIndex!=0){this.select(this.selectedIndex-1)}}}},onKeyUp:function(A){if(this.editable!==false&&!A.isSpecialKey()){this.lastKey=A.getKey();this.dqTask.delay(this.queryDelay)}},validateBlur:function(){return !this.list||!this.list.isVisible()},initQuery:function(){this.doQuery(this.getRawValue())},doForce:function(){if(this.el.dom.value.length>0){this.el.dom.value=this.lastSelectionText===undefined?"":this.lastSelectionText;this.applyEmptyText()}},doQuery:function(C,B){if(C===undefined||C===null){C=""}var A={query:C,forceAll:B,combo:this,cancel:false};if(this.fireEvent("beforequery",A)===false||A.cancel){return false}C=A.query;B=A.forceAll;if(B===true||(C.length>=this.minChars)){if(this.lastQuery!==C){this.lastQuery=C;if(this.mode=="local"){this.selectedIndex=-1;if(B){this.store.clearFilter()}else{this.store.filter(this.displayField,C)}this.onLoad()}else{this.store.baseParams[this.queryParam]=C;this.store.load({params:this.getParams(C)});this.expand()}}else{this.selectedIndex=-1;this.onLoad()}}},getParams:function(A){var B={};if(this.pageSize){B.start=0;B.limit=this.pageSize}return B},collapse:function(){if(!this.isExpanded()){return }this.list.hide();Ext.getDoc().un("mousewheel",this.collapseIf,this);Ext.getDoc().un("mousedown",this.collapseIf,this);this.fireEvent("collapse",this)},collapseIf:function(A){if(!A.within(this.wrap)&&!A.within(this.list)){this.collapse()}},expand:function(){if(this.isExpanded()||!this.hasFocus){return }this.list.alignTo(this.wrap,this.listAlign);this.list.show();this.innerList.setOverflow("auto");Ext.getDoc().on("mousewheel",this.collapseIf,this);Ext.getDoc().on("mousedown",this.collapseIf,this);this.fireEvent("expand",this)},onTriggerClick:function(){if(this.disabled){return }if(this.isExpanded()){this.collapse();this.el.focus()}else{this.onFocus({});if(this.triggerAction=="all"){this.doQuery(this.allQuery,true)}else{this.doQuery(this.getRawValue())}this.el.focus()}}});Ext.reg("combo",Ext.form.ComboBox);
Ext.form.Checkbox=Ext.extend(Ext.form.Field,{focusClass:undefined,fieldClass:"x-form-field",checked:false,defaultAutoCreate:{tag:"input",type:"checkbox",autocomplete:"off"},initComponent:function(){Ext.form.Checkbox.superclass.initComponent.call(this);this.addEvents("check")},onResize:function(){Ext.form.Checkbox.superclass.onResize.apply(this,arguments);if(!this.boxLabel){this.el.alignTo(this.wrap,"c-c")}},initEvents:function(){Ext.form.Checkbox.superclass.initEvents.call(this);this.el.on("click",this.onClick,this);this.el.on("change",this.onClick,this)},getResizeEl:function(){return this.wrap},getPositionEl:function(){return this.wrap},markInvalid:Ext.emptyFn,clearInvalid:Ext.emptyFn,onRender:function(B,A){Ext.form.Checkbox.superclass.onRender.call(this,B,A);if(this.inputValue!==undefined){this.el.dom.value=this.inputValue}this.wrap=this.el.wrap({cls:"x-form-check-wrap"});if(this.boxLabel){this.wrap.createChild({tag:"label",htmlFor:this.el.id,cls:"x-form-cb-label",html:this.boxLabel})}if(this.checked){this.setValue(true)}else{this.checked=this.el.dom.checked}},onDestroy:function(){if(this.wrap){this.wrap.remove()}Ext.form.Checkbox.superclass.onDestroy.call(this)},initValue:Ext.emptyFn,getValue:function(){if(this.rendered){return this.el.dom.checked}return false},onClick:function(){if(this.el.dom.checked!=this.checked){this.setValue(this.el.dom.checked)}},setValue:function(A){this.checked=(A===true||A==="true"||A=="1"||String(A).toLowerCase()=="on");if(this.el&&this.el.dom){this.el.dom.checked=this.checked;this.el.dom.defaultChecked=this.checked}this.fireEvent("check",this,this.checked)}});Ext.reg("checkbox",Ext.form.Checkbox);
Ext.form.Radio=Ext.extend(Ext.form.Checkbox,{inputType:"radio",markInvalid:Ext.emptyFn,clearInvalid:Ext.emptyFn,getGroupValue:function(){var A=this.el.up("form")||Ext.getBody();var B=A.child("input[name="+this.el.dom.name+"]:checked",true);return B?B.value:null},onClick:function(){if(this.el.dom.checked!=this.checked){var B=this.el.up("form")||Ext.getBody();var A=B.select("input[name="+this.el.dom.name+"]");A.each(function(C){if(C.dom.id==this.id){this.setValue(true)}else{Ext.getCmp(C.dom.id).setValue(false)}},this)}},setValue:function(A){if(typeof A=="boolean"){Ext.form.Radio.superclass.setValue.call(this,A)}else{var B=this.el.up("form").child("input[name="+this.el.dom.name+"][value="+A+"]",true);if(B){B.checked=true}}}});Ext.reg("radio",Ext.form.Radio);
Ext.form.Hidden=Ext.extend(Ext.form.Field,{inputType:"hidden",onRender:function(){Ext.form.Hidden.superclass.onRender.apply(this,arguments)},initEvents:function(){this.originalValue=this.getValue()},setSize:Ext.emptyFn,setWidth:Ext.emptyFn,setHeight:Ext.emptyFn,setPosition:Ext.emptyFn,setPagePosition:Ext.emptyFn,markInvalid:Ext.emptyFn,clearInvalid:Ext.emptyFn});Ext.reg("hidden",Ext.form.Hidden);
Ext.form.BasicForm=function(B,A){Ext.apply(this,A);this.items=new Ext.util.MixedCollection(false,function(C){return C.id||(C.id=Ext.id())});this.addEvents("beforeaction","actionfailed","actioncomplete");if(B){this.initEl(B)}Ext.form.BasicForm.superclass.constructor.call(this)};Ext.extend(Ext.form.BasicForm,Ext.util.Observable,{timeout:30,activeAction:null,trackResetOnLoad:false,initEl:function(A){this.el=Ext.get(A);this.id=this.el.id||Ext.id();if(!this.standardSubmit){this.el.on("submit",this.onSubmit,this)}this.el.addClass("x-form")},getEl:function(){return this.el},onSubmit:function(A){A.stopEvent()},destroy:function(){this.items.each(function(A){Ext.destroy(A)});if(this.el){this.el.removeAllListeners();this.el.remove()}this.purgeListeners()},isValid:function(){var A=true;this.items.each(function(B){if(!B.validate()){A=false}});return A},isDirty:function(){var A=false;this.items.each(function(B){if(B.isDirty()){A=true;return false}});return A},doAction:function(B,A){if(typeof B=="string"){B=new Ext.form.Action.ACTION_TYPES[B](this,A)}if(this.fireEvent("beforeaction",this,B)!==false){this.beforeAction(B);B.run.defer(100,B)}return this},submit:function(B){if(this.standardSubmit){var A=this.isValid();if(A){this.el.dom.submit()}return A}this.doAction("submit",B);return this},load:function(A){this.doAction("load",A);return this},updateRecord:function(B){B.beginEdit();var A=B.fields;A.each(function(C){var D=this.findField(C.name);if(D){B.set(C.name,D.getValue())}},this);B.endEdit();return this},loadRecord:function(A){this.setValues(A.data);return this},beforeAction:function(A){var B=A.options;if(B.waitMsg){if(this.waitMsgTarget===true){this.el.mask(B.waitMsg,"x-mask-loading")}else{if(this.waitMsgTarget){this.waitMsgTarget=Ext.get(this.waitMsgTarget);this.waitMsgTarget.mask(B.waitMsg,"x-mask-loading")}else{Ext.MessageBox.wait(B.waitMsg,B.waitTitle||this.waitTitle||"Please Wait...")}}}},afterAction:function(A,C){this.activeAction=null;var B=A.options;if(B.waitMsg){if(this.waitMsgTarget===true){this.el.unmask()}else{if(this.waitMsgTarget){this.waitMsgTarget.unmask()}else{Ext.MessageBox.updateProgress(1);Ext.MessageBox.hide()}}}if(C){if(B.reset){this.reset()}Ext.callback(B.success,B.scope,[this,A]);this.fireEvent("actioncomplete",this,A)}else{Ext.callback(B.failure,B.scope,[this,A]);this.fireEvent("actionfailed",this,A)}},findField:function(B){var A=this.items.get(B);if(!A){this.items.each(function(C){if(C.isFormField&&(C.dataIndex==B||C.id==B||C.getName()==B)){A=C;return false}})}return A||null},markInvalid:function(G){if(Ext.isArray(G)){for(var C=0,A=G.length;C<A;C++){var B=G[C];var D=this.findField(B.id);if(D){D.markInvalid(B.msg)}}}else{var E,F;for(F in G){if(typeof G[F]!="function"&&(E=this.findField(F))){E.markInvalid(G[F])}}}return this},setValues:function(C){if(Ext.isArray(C)){for(var D=0,A=C.length;D<A;D++){var B=C[D];var E=this.findField(B.id);if(E){E.setValue(B.value);if(this.trackResetOnLoad){E.originalValue=E.getValue()}}}}else{var F,G;for(G in C){if(typeof C[G]!="function"&&(F=this.findField(G))){F.setValue(C[G]);if(this.trackResetOnLoad){F.originalValue=F.getValue()}}}}return this},getValues:function(B){var A=Ext.lib.Ajax.serializeForm(this.el.dom);if(B===true){return A}return Ext.urlDecode(A)},clearInvalid:function(){this.items.each(function(A){A.clearInvalid()});return this},reset:function(){this.items.each(function(A){A.reset()});return this},add:function(){this.items.addAll(Array.prototype.slice.call(arguments,0));return this},remove:function(A){this.items.remove(A);return this},render:function(){this.items.each(function(A){if(A.isFormField&&!A.rendered&&document.getElementById(A.id)){A.applyToMarkup(A.id)}});return this},applyToFields:function(A){this.items.each(function(B){Ext.apply(B,A)});return this},applyIfToFields:function(A){this.items.each(function(B){Ext.applyIf(B,A)});return this}});Ext.BasicForm=Ext.form.BasicForm;
Ext.FormPanel=Ext.extend(Ext.Panel,{buttonAlign:"center",minButtonWidth:75,labelAlign:"left",monitorValid:false,monitorPoll:200,layout:"form",initComponent:function(){this.form=this.createForm();Ext.FormPanel.superclass.initComponent.call(this);this.addEvents("clientvalidation");this.relayEvents(this.form,["beforeaction","actionfailed","actioncomplete"])},createForm:function(){delete this.initialConfig.listeners;return new Ext.form.BasicForm(null,this.initialConfig)},initFields:function(){var C=this.form;var A=this;var B=function(D){if(D.doLayout&&D!=A){Ext.applyIf(D,{labelAlign:D.ownerCt.labelAlign,labelWidth:D.ownerCt.labelWidth,itemCls:D.ownerCt.itemCls});if(D.items){D.items.each(B)}}else{if(D.isFormField){C.add(D)}}};this.items.each(B)},getLayoutTarget:function(){return this.form.el},getForm:function(){return this.form},onRender:function(B,A){this.initFields();Ext.FormPanel.superclass.onRender.call(this,B,A);var C={tag:"form",method:this.method||"POST",id:this.formId||Ext.id()};if(this.fileUpload){C.enctype="multipart/form-data"}this.form.initEl(this.body.createChild(C))},beforeDestroy:function(){Ext.FormPanel.superclass.beforeDestroy.call(this);Ext.destroy(this.form)},initEvents:function(){Ext.FormPanel.superclass.initEvents.call(this);this.items.on("remove",this.onRemove,this);this.items.on("add",this.onAdd,this);if(this.monitorValid){this.startMonitoring()}},onAdd:function(A,B){if(B.isFormField){this.form.add(B)}},onRemove:function(A){if(A.isFormField){Ext.destroy(A.container.up(".x-form-item"));this.form.remove(A)}},startMonitoring:function(){if(!this.bound){this.bound=true;Ext.TaskMgr.start({run:this.bindHandler,interval:this.monitorPoll||200,scope:this})}},stopMonitoring:function(){this.bound=false},load:function(){this.form.load.apply(this.form,arguments)},onDisable:function(){Ext.FormPanel.superclass.onDisable.call(this);if(this.form){this.form.items.each(function(){this.disable()})}},onEnable:function(){Ext.FormPanel.superclass.onEnable.call(this);if(this.form){this.form.items.each(function(){this.enable()})}},bindHandler:function(){if(!this.bound){return false}var D=true;this.form.items.each(function(E){if(!E.isValid(true)){D=false;return false}});if(this.buttons){for(var C=0,A=this.buttons.length;C<A;C++){var B=this.buttons[C];if(B.formBind===true&&B.disabled===D){B.setDisabled(!D)}}}this.fireEvent("clientvalidation",this,D)}});Ext.reg("form",Ext.FormPanel);Ext.form.FormPanel=Ext.FormPanel;
Ext.form.FieldSet=Ext.extend(Ext.Panel,{baseCls:"x-fieldset",layout:"form",onRender:function(B,A){if(!this.el){this.el=document.createElement("fieldset");this.el.id=this.id;if(this.title||this.header||this.checkboxToggle){this.el.appendChild(document.createElement("legend")).className="x-fieldset-header"}}Ext.form.FieldSet.superclass.onRender.call(this,B,A);if(this.checkboxToggle){var C=typeof this.checkboxToggle=="object"?this.checkboxToggle:{tag:"input",type:"checkbox",name:this.checkboxName||this.id+"-checkbox"};this.checkbox=this.header.insertFirst(C);this.checkbox.dom.checked=!this.collapsed;this.checkbox.on("click",this.onCheckClick,this)}},onCollapse:function(A,B){if(this.checkbox){this.checkbox.dom.checked=false}this.afterCollapse()},onExpand:function(A,B){if(this.checkbox){this.checkbox.dom.checked=true}this.afterExpand()},onCheckClick:function(){this[this.checkbox.dom.checked?"expand":"collapse"]()}});Ext.reg("fieldset",Ext.form.FieldSet);
Ext.form.HtmlEditor=Ext.extend(Ext.form.Field,{enableFormat:true,enableFontSize:true,enableColors:true,enableAlignments:true,enableLists:true,enableSourceEdit:true,enableLinks:true,enableFont:true,createLinkText:"Please enter the URL for the link:",defaultLinkValue:"http:/"+"/",fontFamilies:["Arial","Courier New","Tahoma","Times New Roman","Verdana"],defaultFont:"tahoma",validationEvent:false,deferHeight:true,initialized:false,activated:false,sourceEditMode:false,onFocus:Ext.emptyFn,iframePad:3,hideMode:"offsets",defaultAutoCreate:{tag:"textarea",style:"width:500px;height:300px;",autocomplete:"off"},initComponent:function(){this.addEvents("initialize","activate","beforesync","beforepush","sync","push","editmodechange")},createFontOptions:function(){var D=[],B=this.fontFamilies,C,F;for(var E=0,A=B.length;E<A;E++){C=B[E];F=C.toLowerCase();D.push("<option value=\"",F,"\" style=\"font-family:",C,";\"",(this.defaultFont==F?" selected=\"true\">":">"),C,"</option>")}return D.join("")},createToolbar:function(C){function B(F,D,E){return{itemId:F,cls:"x-btn-icon x-edit-"+F,enableToggle:D!==false,scope:C,handler:E||C.relayBtnCmd,clickEvent:"mousedown",tooltip:C.buttonTips[F]||undefined,tabIndex:-1}}var A=new Ext.Toolbar({renderTo:this.wrap.dom.firstChild});A.el.on("click",function(D){D.preventDefault()});if(this.enableFont&&!Ext.isSafari){this.fontSelect=A.el.createChild({tag:"select",cls:"x-font-select",html:this.createFontOptions()});this.fontSelect.on("change",function(){var D=this.fontSelect.dom.value;this.relayCmd("fontname",D);this.deferFocus()},this);A.add(this.fontSelect.dom,"-")}if(this.enableFormat){A.add(B("bold"),B("italic"),B("underline"))}if(this.enableFontSize){A.add("-",B("increasefontsize",false,this.adjustFont),B("decreasefontsize",false,this.adjustFont))}if(this.enableColors){A.add("-",{itemId:"forecolor",cls:"x-btn-icon x-edit-forecolor",clickEvent:"mousedown",tooltip:C.buttonTips["forecolor"]||undefined,tabIndex:-1,menu:new Ext.menu.ColorMenu({allowReselect:true,focus:Ext.emptyFn,value:"000000",plain:true,selectHandler:function(E,D){this.execCmd("forecolor",Ext.isSafari||Ext.isIE?"#"+D:D);this.deferFocus()},scope:this,clickEvent:"mousedown"})},{itemId:"backcolor",cls:"x-btn-icon x-edit-backcolor",clickEvent:"mousedown",tooltip:C.buttonTips["backcolor"]||undefined,tabIndex:-1,menu:new Ext.menu.ColorMenu({focus:Ext.emptyFn,value:"FFFFFF",plain:true,allowReselect:true,selectHandler:function(E,D){if(Ext.isGecko){this.execCmd("useCSS",false);this.execCmd("hilitecolor",D);this.execCmd("useCSS",true);this.deferFocus()}else{this.execCmd(Ext.isOpera?"hilitecolor":"backcolor",Ext.isSafari||Ext.isIE?"#"+D:D);this.deferFocus()}},scope:this,clickEvent:"mousedown"})})}if(this.enableAlignments){A.add("-",B("justifyleft"),B("justifycenter"),B("justifyright"))}if(!Ext.isSafari){if(this.enableLinks){A.add("-",B("createlink",false,this.createLink))}if(this.enableLists){A.add("-",B("insertorderedlist"),B("insertunorderedlist"))}if(this.enableSourceEdit){A.add("-",B("sourceedit",true,function(D){this.toggleSourceEdit(D.pressed)}))}}this.tb=A},getDocMarkup:function(){return"<html><head><style type=\"text/css\">body{border:0;margin:0;padding:3px;height:98%;cursor:text;}</style></head><body></body></html>"},getEditorBody:function(){return this.doc.body||this.doc.documentElement},onRender:function(C,A){Ext.form.HtmlEditor.superclass.onRender.call(this,C,A);this.el.dom.style.border="0 none";this.el.dom.setAttribute("tabIndex",-1);this.el.addClass("x-hidden");if(Ext.isIE){this.el.applyStyles("margin-top:-1px;margin-bottom:-1px;")}this.wrap=this.el.wrap({cls:"x-html-editor-wrap",cn:{cls:"x-html-editor-tb"}});this.createToolbar(this);this.tb.items.each(function(E){if(E.itemId!="sourceedit"){E.disable()}});var D=document.createElement("iframe");D.name=Ext.id();D.frameBorder="no";D.src=(Ext.SSL_SECURE_URL||"javascript:false");this.wrap.dom.appendChild(D);this.iframe=D;if(Ext.isIE){D.contentWindow.document.designMode="on";this.doc=D.contentWindow.document;this.win=D.contentWindow}else{this.doc=(D.contentDocument||window.frames[D.name].document);this.win=window.frames[D.name];this.doc.designMode="on"}this.doc.open();this.doc.write(this.getDocMarkup());this.doc.close();var B={run:function(){if(this.doc.body||this.doc.readyState=="complete"){Ext.TaskMgr.stop(B);this.doc.designMode="on";this.initEditor.defer(10,this)}},interval:10,duration:10000,scope:this};Ext.TaskMgr.start(B);if(!this.width){this.setSize(this.el.getSize())}},onResize:function(B,C){Ext.form.HtmlEditor.superclass.onResize.apply(this,arguments);if(this.el&&this.iframe){if(typeof B=="number"){var D=B-this.wrap.getFrameWidth("lr");this.el.setWidth(this.adjustWidth("textarea",D));this.iframe.style.width=D+"px"}if(typeof C=="number"){var A=C-this.wrap.getFrameWidth("tb")-this.tb.el.getHeight();this.el.setHeight(this.adjustWidth("textarea",A));this.iframe.style.height=A+"px";if(this.doc){this.getEditorBody().style.height=(A-(this.iframePad*2))+"px"}}}},toggleSourceEdit:function(A){if(A===undefined){A=!this.sourceEditMode}this.sourceEditMode=A===true;var C=this.tb.items.get("sourceedit");if(C.pressed!==this.sourceEditMode){C.toggle(this.sourceEditMode);return }if(this.sourceEditMode){this.tb.items.each(function(D){if(D.itemId!="sourceedit"){D.disable()}});this.syncValue();this.iframe.className="x-hidden";this.el.removeClass("x-hidden");this.el.dom.removeAttribute("tabIndex");this.el.focus()}else{if(this.initialized){this.tb.items.each(function(D){D.enable()})}this.pushValue();this.iframe.className="";this.el.addClass("x-hidden");this.el.dom.setAttribute("tabIndex",-1);this.deferFocus()}var B=this.lastSize;if(B){delete this.lastSize;this.setSize(B)}this.fireEvent("editmodechange",this,this.sourceEditMode)},createLink:function(){var A=prompt(this.createLinkText,this.defaultLinkValue);if(A&&A!="http:/"+"/"){this.relayCmd("createlink",A)}},adjustSize:Ext.BoxComponent.prototype.adjustSize,getResizeEl:function(){return this.wrap},getPositionEl:function(){return this.wrap},initEvents:function(){this.originalValue=this.getValue()},markInvalid:Ext.emptyFn,clearInvalid:Ext.emptyFn,setValue:function(A){Ext.form.HtmlEditor.superclass.setValue.call(this,A);this.pushValue()},cleanHtml:function(A){A=String(A);if(A.length>5){if(Ext.isSafari){A=A.replace(/\sclass="(?:Apple-style-span|khtml-block-placeholder)"/gi,"")}}if(A=="&nbsp;"){A=""}return A},syncValue:function(){if(this.initialized){var D=this.getEditorBody();var C=D.innerHTML;if(Ext.isSafari){var B=D.getAttribute("style");var A=B.match(/text-align:(.*?);/i);if(A&&A[1]){C="<div style=\""+A[0]+"\">"+C+"</div>"}}C=this.cleanHtml(C);if(this.fireEvent("beforesync",this,C)!==false){this.el.dom.value=C;this.fireEvent("sync",this,C)}}},pushValue:function(){if(this.initialized){var A=this.el.dom.value;if(!this.activated&&A.length<1){A="&nbsp;"}if(this.fireEvent("beforepush",this,A)!==false){this.getEditorBody().innerHTML=A;this.fireEvent("push",this,A)}}},deferFocus:function(){this.focus.defer(10,this)},focus:function(){if(this.win&&!this.sourceEditMode){this.win.focus()}else{this.el.focus()}},initEditor:function(){var B=this.getEditorBody();var A=this.el.getStyles("font-size","font-family","background-image","background-repeat");A["background-attachment"]="fixed";B.bgProperties="fixed";Ext.DomHelper.applyStyles(B,A);Ext.EventManager.on(this.doc,{"mousedown":this.onEditorEvent,"dblclick":this.onEditorEvent,"click":this.onEditorEvent,"keyup":this.onEditorEvent,buffer:100,scope:this});if(Ext.isGecko){Ext.EventManager.on(this.doc,"keypress",this.applyCommand,this)}if(Ext.isIE||Ext.isSafari||Ext.isOpera){Ext.EventManager.on(this.doc,"keydown",this.fixKeys,this)}this.initialized=true;this.fireEvent("initialize",this);this.pushValue()},onDestroy:function(){if(this.rendered){this.tb.items.each(function(A){if(A.menu){A.menu.removeAll();if(A.menu.el){A.menu.el.destroy()}}A.destroy()});this.wrap.dom.innerHTML="";this.wrap.remove()}},onFirstFocus:function(){this.activated=true;this.tb.items.each(function(D){D.enable()});if(Ext.isGecko){this.win.focus();var A=this.win.getSelection();if(!A.focusNode||A.focusNode.nodeType!=3){var B=A.getRangeAt(0);B.selectNodeContents(this.getEditorBody());B.collapse(true);this.deferFocus()}try{this.execCmd("useCSS",true);this.execCmd("styleWithCSS",false)}catch(C){}}this.fireEvent("activate",this)},adjustFont:function(B){var C=B.itemId=="increasefontsize"?1:-1;var A=parseInt(this.doc.queryCommandValue("FontSize")||2,10);if(Ext.isSafari3||Ext.isAir){if(A<=10){A=1+C}else{if(A<=13){A=2+C}else{if(A<=16){A=3+C}else{if(A<=18){A=4+C}else{if(A<=24){A=5+C}else{A=6+C}}}}}A=A.constrain(1,6)}else{if(Ext.isSafari){C*=2}A=Math.max(1,A+C)+(Ext.isSafari?"px":0)}this.execCmd("FontSize",A)},onEditorEvent:function(A){this.updateToolbar()},updateToolbar:function(){if(!this.activated){this.onFirstFocus();return }var B=this.tb.items.map,C=this.doc;if(this.enableFont&&!Ext.isSafari){var A=(this.doc.queryCommandValue("FontName")||this.defaultFont).toLowerCase();if(A!=this.fontSelect.dom.value){this.fontSelect.dom.value=A}}if(this.enableFormat){B.bold.toggle(C.queryCommandState("bold"));B.italic.toggle(C.queryCommandState("italic"));B.underline.toggle(C.queryCommandState("underline"))}if(this.enableAlignments){B.justifyleft.toggle(C.queryCommandState("justifyleft"));B.justifycenter.toggle(C.queryCommandState("justifycenter"));B.justifyright.toggle(C.queryCommandState("justifyright"))}if(!Ext.isSafari&&this.enableLists){B.insertorderedlist.toggle(C.queryCommandState("insertorderedlist"));B.insertunorderedlist.toggle(C.queryCommandState("insertunorderedlist"))}Ext.menu.MenuMgr.hideAll();this.syncValue()},relayBtnCmd:function(A){this.relayCmd(A.itemId)},relayCmd:function(B,A){this.win.focus();this.execCmd(B,A);this.updateToolbar();this.deferFocus()},execCmd:function(B,A){this.doc.execCommand(B,false,A===undefined?null:A);this.syncValue()},applyCommand:function(B){if(B.ctrlKey){var C=B.getCharCode(),A;if(C>0){C=String.fromCharCode(C);switch(C){case"b":A="bold";break;case"i":A="italic";break;case"u":A="underline";break}if(A){this.win.focus();this.execCmd(A);this.deferFocus();B.preventDefault()}}}},insertAtCursor:function(B){if(!this.activated){return }if(Ext.isIE){this.win.focus();var A=this.doc.selection.createRange();if(A){A.collapse(true);A.pasteHTML(B);this.syncValue();this.deferFocus()}}else{if(Ext.isGecko||Ext.isOpera){this.win.focus();this.execCmd("InsertHTML",B);this.deferFocus()}else{if(Ext.isSafari){this.execCmd("InsertText",B);this.deferFocus()}}}},fixKeys:function(){if(Ext.isIE){return function(D){var A=D.getKey(),B;if(A==D.TAB){D.stopEvent();B=this.doc.selection.createRange();if(B){B.collapse(true);B.pasteHTML("&nbsp;&nbsp;&nbsp;&nbsp;");this.deferFocus()}}else{if(A==D.ENTER){B=this.doc.selection.createRange();if(B){var C=B.parentElement();if(!C||C.tagName.toLowerCase()!="li"){D.stopEvent();B.pasteHTML("<br />");B.collapse(false);B.select()}}}}}}else{if(Ext.isOpera){return function(B){var A=B.getKey();if(A==B.TAB){B.stopEvent();this.win.focus();this.execCmd("InsertHTML","&nbsp;&nbsp;&nbsp;&nbsp;");this.deferFocus()}}}else{if(Ext.isSafari){return function(B){var A=B.getKey();if(A==B.TAB){B.stopEvent();this.execCmd("InsertText","\t");this.deferFocus()}}}}}}(),getToolbar:function(){return this.tb},buttonTips:{bold:{title:"Bold (Ctrl+B)",text:"Make the selected text bold.",cls:"x-html-editor-tip"},italic:{title:"Italic (Ctrl+I)",text:"Make the selected text italic.",cls:"x-html-editor-tip"},underline:{title:"Underline (Ctrl+U)",text:"Underline the selected text.",cls:"x-html-editor-tip"},increasefontsize:{title:"Grow Text",text:"Increase the font size.",cls:"x-html-editor-tip"},decreasefontsize:{title:"Shrink Text",text:"Decrease the font size.",cls:"x-html-editor-tip"},backcolor:{title:"Text Highlight Color",text:"Change the background color of the selected text.",cls:"x-html-editor-tip"},forecolor:{title:"Font Color",text:"Change the color of the selected text.",cls:"x-html-editor-tip"},justifyleft:{title:"Align Text Left",text:"Align text to the left.",cls:"x-html-editor-tip"},justifycenter:{title:"Center Text",text:"Center text in the editor.",cls:"x-html-editor-tip"},justifyright:{title:"Align Text Right",text:"Align text to the right.",cls:"x-html-editor-tip"},insertunorderedlist:{title:"Bullet List",text:"Start a bulleted list.",cls:"x-html-editor-tip"},insertorderedlist:{title:"Numbered List",text:"Start a numbered list.",cls:"x-html-editor-tip"},createlink:{title:"Hyperlink",text:"Make the selected text a hyperlink.",cls:"x-html-editor-tip"},sourceedit:{title:"Source Edit",text:"Switch to source editing mode.",cls:"x-html-editor-tip"}}});Ext.reg("htmleditor",Ext.form.HtmlEditor);
Ext.form.TimeField=Ext.extend(Ext.form.ComboBox,{minValue:null,maxValue:null,minText:"The time in this field must be equal to or after {0}",maxText:"The time in this field must be equal to or before {0}",invalidText:"{0} is not a valid time",format:"g:i A",altFormats:"g:ia|g:iA|g:i a|g:i A|h:i|g:i|H:i|ga|ha|gA|h a|g a|g A|gi|hi|gia|hia|g|H",increment:15,mode:"local",triggerAction:"all",typeAhead:false,initComponent:function(){Ext.form.TimeField.superclass.initComponent.call(this);if(typeof this.minValue=="string"){this.minValue=this.parseDate(this.minValue)}if(typeof this.maxValue=="string"){this.maxValue=this.parseDate(this.maxValue)}if(!this.store){var B=this.parseDate(this.minValue);if(!B){B=new Date().clearTime()}var A=this.parseDate(this.maxValue);if(!A){A=new Date().clearTime().add("mi",(24*60)-1)}var C=[];while(B<=A){C.push([B.dateFormat(this.format)]);B=B.add("mi",this.increment)}this.store=new Ext.data.SimpleStore({fields:["text"],data:C});this.displayField="text"}},getValue:function(){var A=Ext.form.TimeField.superclass.getValue.call(this);return this.formatDate(this.parseDate(A))||""},setValue:function(A){Ext.form.TimeField.superclass.setValue.call(this,this.formatDate(this.parseDate(A)))},validateValue:Ext.form.DateField.prototype.validateValue,parseDate:Ext.form.DateField.prototype.parseDate,formatDate:Ext.form.DateField.prototype.formatDate,beforeBlur:function(){var A=this.parseDate(this.getRawValue());if(A){this.setValue(A.dateFormat(this.format))}}});Ext.reg("timefield",Ext.form.TimeField);
Ext.form.Label=Ext.extend(Ext.BoxComponent,{onRender:function(B,A){if(!this.el){this.el=document.createElement("label");this.el.innerHTML=this.text?Ext.util.Format.htmlEncode(this.text):(this.html||"");if(this.forId){this.el.setAttribute("htmlFor",this.forId)}}Ext.form.Label.superclass.onRender.call(this,B,A)}});Ext.reg("label",Ext.form.Label);
Ext.form.Action=function(B,A){this.form=B;this.options=A||{}};Ext.form.Action.CLIENT_INVALID="client";Ext.form.Action.SERVER_INVALID="server";Ext.form.Action.CONNECT_FAILURE="connect";Ext.form.Action.LOAD_FAILURE="load";Ext.form.Action.prototype={type:"default",run:function(A){},success:function(A){},handleResponse:function(A){},failure:function(A){this.response=A;this.failureType=Ext.form.Action.CONNECT_FAILURE;this.form.afterAction(this,false)},processResponse:function(A){this.response=A;if(!A.responseText){return true}this.result=this.handleResponse(A);return this.result},getUrl:function(C){var A=this.options.url||this.form.url||this.form.el.dom.action;if(C){var B=this.getParams();if(B){A+=(A.indexOf("?")!=-1?"&":"?")+B}}return A},getMethod:function(){return(this.options.method||this.form.method||this.form.el.dom.method||"POST").toUpperCase()},getParams:function(){var A=this.form.baseParams;var B=this.options.params;if(B){if(typeof B=="object"){B=Ext.urlEncode(Ext.applyIf(B,A))}else{if(typeof B=="string"&&A){B+="&"+Ext.urlEncode(A)}}}else{if(A){B=Ext.urlEncode(A)}}return B},createCallback:function(A){var A=A||{};return{success:this.success,failure:this.failure,scope:this,timeout:(A.timeout*1000)||(this.form.timeout*1000),upload:this.form.fileUpload?this.success:undefined}}};Ext.form.Action.Submit=function(B,A){Ext.form.Action.Submit.superclass.constructor.call(this,B,A)};Ext.extend(Ext.form.Action.Submit,Ext.form.Action,{type:"submit",run:function(){var B=this.options;var C=this.getMethod();var A=C=="POST";if(B.clientValidation===false||this.form.isValid()){Ext.Ajax.request(Ext.apply(this.createCallback(B),{form:this.form.el.dom,url:this.getUrl(!A),method:C,params:A?this.getParams():null,isUpload:this.form.fileUpload}))}else{if(B.clientValidation!==false){this.failureType=Ext.form.Action.CLIENT_INVALID;this.form.afterAction(this,false)}}},success:function(B){var A=this.processResponse(B);if(A===true||A.success){this.form.afterAction(this,true);return }if(A.errors){this.form.markInvalid(A.errors);this.failureType=Ext.form.Action.SERVER_INVALID}this.form.afterAction(this,false)},handleResponse:function(C){if(this.form.errorReader){var B=this.form.errorReader.read(C);var F=[];if(B.records){for(var D=0,A=B.records.length;D<A;D++){var E=B.records[D];F[D]=E.data}}if(F.length<1){F=null}return{success:B.success,errors:F}}return Ext.decode(C.responseText)}});Ext.form.Action.Load=function(B,A){Ext.form.Action.Load.superclass.constructor.call(this,B,A);this.reader=this.form.reader};Ext.extend(Ext.form.Action.Load,Ext.form.Action,{type:"load",run:function(){Ext.Ajax.request(Ext.apply(this.createCallback(this.options),{method:this.getMethod(),url:this.getUrl(false),params:this.getParams()}))},success:function(B){var A=this.processResponse(B);if(A===true||!A.success||!A.data){this.failureType=Ext.form.Action.LOAD_FAILURE;this.form.afterAction(this,false);return }this.form.clearInvalid();this.form.setValues(A.data);this.form.afterAction(this,true)},handleResponse:function(B){if(this.form.reader){var A=this.form.reader.read(B);var C=A.records&&A.records[0]?A.records[0].data:null;return{success:A.success,data:C}}return Ext.decode(B.responseText)}});Ext.form.Action.ACTION_TYPES={"load":Ext.form.Action.Load,"submit":Ext.form.Action.Submit};
Ext.form.VTypes=function(){var C=/^[a-zA-Z_]+$/;var D=/^[a-zA-Z0-9_]+$/;var B=/^([\w]+)(.[\w]+)*@([\w-]+\.){1,5}([A-Za-z]){2,4}$/;var A=/(((https?)|(ftp)):\/\/([\-\w]+\.)+\w{2,3}(\/[%\-\w]+(\.\w{2,})?)*(([\w\-\.\?\\\/+@&#;`~=%!]*)(\.\w{2,})?)*\/?)/i;return{"email":function(E){return B.test(E)},"emailText":"This field should be an e-mail address in the format \"user@domain.com\"","emailMask":/[a-z0-9_\.\-@]/i,"url":function(E){return A.test(E)},"urlText":"This field should be a URL in the format \"http:/"+"/www.domain.com\"","alpha":function(E){return C.test(E)},"alphaText":"This field should only contain letters and _","alphaMask":/[a-z_]/i,"alphanum":function(E){return D.test(E)},"alphanumText":"This field should only contain letters, numbers and _","alphanumMask":/[a-z0-9_]/i}}();
Ext.grid.GridPanel=Ext.extend(Ext.Panel,{ddText:"{0} selected row{1}",minColumnWidth:25,trackMouseOver:true,enableDragDrop:false,enableColumnMove:true,enableColumnHide:true,enableHdMenu:true,stripeRows:false,autoExpandColumn:false,autoExpandMin:50,autoExpandMax:1000,view:null,loadMask:false,rendered:false,viewReady:false,stateEvents:["columnmove","columnresize","sortchange"],initComponent:function(){Ext.grid.GridPanel.superclass.initComponent.call(this);this.autoScroll=false;this.autoWidth=false;if(Ext.isArray(this.columns)){this.colModel=new Ext.grid.ColumnModel(this.columns);delete this.columns}if(this.ds){this.store=this.ds;delete this.ds}if(this.cm){this.colModel=this.cm;delete this.cm}if(this.sm){this.selModel=this.sm;delete this.sm}this.store=Ext.StoreMgr.lookup(this.store);this.addEvents("click","dblclick","contextmenu","mousedown","mouseup","mouseover","mouseout","keypress","keydown","cellmousedown","rowmousedown","headermousedown","cellclick","celldblclick","rowclick","rowdblclick","headerclick","headerdblclick","rowcontextmenu","cellcontextmenu","headercontextmenu","bodyscroll","columnresize","columnmove","sortchange")},onRender:function(C,A){Ext.grid.GridPanel.superclass.onRender.apply(this,arguments);var D=this.body;this.el.addClass("x-grid-panel");var B=this.getView();B.init(this);D.on("mousedown",this.onMouseDown,this);D.on("click",this.onClick,this);D.on("dblclick",this.onDblClick,this);D.on("contextmenu",this.onContextMenu,this);D.on("keydown",this.onKeyDown,this);this.relayEvents(D,["mousedown","mouseup","mouseover","mouseout","keypress"]);this.getSelectionModel().init(this);this.view.render()},initEvents:function(){Ext.grid.GridPanel.superclass.initEvents.call(this);if(this.loadMask){this.loadMask=new Ext.LoadMask(this.bwrap,Ext.apply({store:this.store},this.loadMask))}},initStateEvents:function(){Ext.grid.GridPanel.superclass.initStateEvents.call(this);this.colModel.on("hiddenchange",this.saveState,this,{delay:100})},applyState:function(F){var B=this.colModel;var E=F.columns;if(E){for(var C=0,A=E.length;C<A;C++){var D=E[C];var H=B.getColumnById(D.id);if(H){H.hidden=D.hidden;H.width=D.width;var G=B.getIndexById(D.id);if(G!=C){B.moveColumn(G,C)}}}}if(F.sort){this.store[this.store.remoteSort?"setDefaultSort":"sort"](F.sort.field,F.sort.direction)}},getState:function(){var C={columns:[]};for(var B=0,D;D=this.colModel.config[B];B++){C.columns[B]={id:D.id,width:D.width};if(D.hidden){C.columns[B].hidden=true}}var A=this.store.getSortState();if(A){C.sort=A}return C},afterRender:function(){Ext.grid.GridPanel.superclass.afterRender.call(this);this.view.layout();this.viewReady=true},reconfigure:function(A,B){if(this.loadMask){this.loadMask.destroy();this.loadMask=new Ext.LoadMask(this.bwrap,Ext.apply({store:A},this.initialConfig.loadMask))}this.view.bind(A,B);this.store=A;this.colModel=B;if(this.rendered){this.view.refresh(true)}},onKeyDown:function(A){this.fireEvent("keydown",A)},onDestroy:function(){if(this.rendered){if(this.loadMask){this.loadMask.destroy()}var A=this.body;A.removeAllListeners();this.view.destroy();A.update("")}this.colModel.purgeListeners();Ext.grid.GridPanel.superclass.onDestroy.call(this)},processEvent:function(C,E){this.fireEvent(C,E);var D=E.getTarget();var B=this.view;var G=B.findHeaderIndex(D);if(G!==false){this.fireEvent("header"+C,this,G,E)}else{var F=B.findRowIndex(D);var A=B.findCellIndex(D);if(F!==false){this.fireEvent("row"+C,this,F,E);if(A!==false){this.fireEvent("cell"+C,this,F,A,E)}}}},onClick:function(A){this.processEvent("click",A)},onMouseDown:function(A){this.processEvent("mousedown",A)},onContextMenu:function(B,A){this.processEvent("contextmenu",B)},onDblClick:function(A){this.processEvent("dblclick",A)},walkCells:function(J,C,B,E,I){var H=this.colModel,F=H.getColumnCount();var A=this.store,G=A.getCount(),D=true;if(B<0){if(C<0){J--;D=false}while(J>=0){if(!D){C=F-1}D=false;while(C>=0){if(E.call(I||this,J,C,H)===true){return[J,C]}C--}J--}}else{if(C>=F){J++;D=false}while(J<G){if(!D){C=0}D=false;while(C<F){if(E.call(I||this,J,C,H)===true){return[J,C]}C++}J++}}return null},getSelections:function(){return this.selModel.getSelections()},onResize:function(){Ext.grid.GridPanel.superclass.onResize.apply(this,arguments);if(this.viewReady){this.view.layout()}},getGridEl:function(){return this.body},stopEditing:function(){},getSelectionModel:function(){if(!this.selModel){this.selModel=new Ext.grid.RowSelectionModel(this.disableSelection?{selectRow:Ext.emptyFn}:null)}return this.selModel},getStore:function(){return this.store},getColumnModel:function(){return this.colModel},getView:function(){if(!this.view){this.view=new Ext.grid.GridView(this.viewConfig)}return this.view},getDragDropText:function(){var A=this.selModel.getCount();return String.format(this.ddText,A,A==1?"":"s")}});Ext.reg("grid",Ext.grid.GridPanel);
Ext.grid.GridView=function(A){Ext.apply(this,A);this.addEvents("beforerowremoved","beforerowsinserted","beforerefresh","rowremoved","rowsinserted","rowupdated","refresh");Ext.grid.GridView.superclass.constructor.call(this)};Ext.extend(Ext.grid.GridView,Ext.util.Observable,{scrollOffset:19,autoFill:false,forceFit:false,sortClasses:["sort-asc","sort-desc"],sortAscText:"Sort Ascending",sortDescText:"Sort Descending",columnsText:"Columns",borderWidth:2,initTemplates:function(){var C=this.templates||{};if(!C.master){C.master=new Ext.Template("<div class=\"x-grid3\" hidefocus=\"true\">","<div class=\"x-grid3-viewport\">","<div class=\"x-grid3-header\"><div class=\"x-grid3-header-inner\"><div class=\"x-grid3-header-offset\">{header}</div></div><div class=\"x-clear\"></div></div>","<div class=\"x-grid3-scroller\"><div class=\"x-grid3-body\">{body}</div><a href=\"#\" class=\"x-grid3-focus\" tabIndex=\"-1\"></a></div>","</div>","<div class=\"x-grid3-resize-marker\">&#160;</div>","<div class=\"x-grid3-resize-proxy\">&#160;</div>","</div>")}if(!C.header){C.header=new Ext.Template("<table border=\"0\" cellspacing=\"0\" cellpadding=\"0\" style=\"{tstyle}\">","<thead><tr class=\"x-grid3-hd-row\">{cells}</tr></thead>","</table>")}if(!C.hcell){C.hcell=new Ext.Template("<td class=\"x-grid3-hd x-grid3-cell x-grid3-td-{id}\" style=\"{style}\"><div {tooltip} {attr} class=\"x-grid3-hd-inner x-grid3-hd-{id}\" unselectable=\"on\" style=\"{istyle}\">",this.grid.enableHdMenu?"<a class=\"x-grid3-hd-btn\" href=\"#\"></a>":"","{value}<img class=\"x-grid3-sort-icon\" src=\"",Ext.BLANK_IMAGE_URL,"\" />","</div></td>")}if(!C.body){C.body=new Ext.Template("{rows}")}if(!C.row){C.row=new Ext.Template("<div class=\"x-grid3-row {alt}\" style=\"{tstyle}\"><table class=\"x-grid3-row-table\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\" style=\"{tstyle}\">","<tbody><tr>{cells}</tr>",(this.enableRowBody?"<tr class=\"x-grid3-row-body-tr\" style=\"{bodyStyle}\"><td colspan=\"{cols}\" class=\"x-grid3-body-cell\" tabIndex=\"0\" hidefocus=\"on\"><div class=\"x-grid3-row-body\">{body}</div></td></tr>":""),"</tbody></table></div>")}if(!C.cell){C.cell=new Ext.Template("<td class=\"x-grid3-col x-grid3-cell x-grid3-td-{id} {css}\" style=\"{style}\" tabIndex=\"0\" {cellAttr}>","<div class=\"x-grid3-cell-inner x-grid3-col-{id}\" unselectable=\"on\" {attr}>{value}</div>","</td>")}for(var A in C){var B=C[A];if(B&&typeof B.compile=="function"&&!B.compiled){B.disableFormats=true;B.compile()}}this.templates=C;this.tdClass="x-grid3-cell";this.cellSelector="td.x-grid3-cell";this.hdCls="x-grid3-hd";this.rowSelector="div.x-grid3-row";this.colRe=new RegExp("x-grid3-td-([^\\s]+)","")},fly:function(A){if(!this._flyweight){this._flyweight=new Ext.Element.Flyweight(document.body)}this._flyweight.dom=A;return this._flyweight},getEditorParent:function(A){return this.scroller.dom},initElements:function(){var C=Ext.Element;var B=this.grid.getGridEl().dom.firstChild;var A=B.childNodes;this.el=new C(B);this.mainWrap=new C(A[0]);this.mainHd=new C(this.mainWrap.dom.firstChild);if(this.grid.hideHeaders){this.mainHd.setDisplayed(false)}this.innerHd=this.mainHd.dom.firstChild;this.scroller=new C(this.mainWrap.dom.childNodes[1]);if(this.forceFit){this.scroller.setStyle("overflow-x","hidden")}this.mainBody=new C(this.scroller.dom.firstChild);this.focusEl=new C(this.scroller.dom.childNodes[1]);this.focusEl.swallowEvent("click",true);this.resizeMarker=new C(A[1]);this.resizeProxy=new C(A[2])},getRows:function(){return this.hasRows()?this.mainBody.dom.childNodes:[]},findCell:function(A){if(!A){return false}return this.fly(A).findParent(this.cellSelector,3)},findCellIndex:function(C,B){var A=this.findCell(C);if(A&&(!B||this.fly(A).hasClass(B))){return this.getCellIndex(A)}return false},getCellIndex:function(B){if(B){var A=B.className.match(this.colRe);if(A&&A[1]){return this.cm.getIndexById(A[1])}}return false},findHeaderCell:function(B){var A=this.findCell(B);return A&&this.fly(A).hasClass(this.hdCls)?A:null},findHeaderIndex:function(A){return this.findCellIndex(A,this.hdCls)},findRow:function(A){if(!A){return false}return this.fly(A).findParent(this.rowSelector,10)},findRowIndex:function(A){var B=this.findRow(A);return B?B.rowIndex:false},getRow:function(A){return this.getRows()[A]},getCell:function(B,A){return this.getRow(B).getElementsByTagName("td")[A]},getHeaderCell:function(A){return this.mainHd.dom.getElementsByTagName("td")[A]},addRowClass:function(C,A){var B=this.getRow(C);if(B){this.fly(B).addClass(A)}},removeRowClass:function(C,A){var B=this.getRow(C);if(B){this.fly(B).removeClass(A)}},removeRow:function(A){Ext.removeNode(this.getRow(A))},removeRows:function(C,A){var B=this.mainBody.dom;for(var D=C;D<=A;D++){Ext.removeNode(B.childNodes[C])}},getScrollState:function(){var A=this.scroller.dom;return{left:A.scrollLeft,top:A.scrollTop}},restoreScroll:function(A){var B=this.scroller.dom;B.scrollLeft=A.left;B.scrollTop=A.top},scrollToTop:function(){this.scroller.dom.scrollTop=0;this.scroller.dom.scrollLeft=0},syncScroll:function(){this.syncHeaderScroll();var A=this.scroller.dom;this.grid.fireEvent("bodyscroll",A.scrollLeft,A.scrollTop)},syncHeaderScroll:function(){var A=this.scroller.dom;this.innerHd.scrollLeft=A.scrollLeft;this.innerHd.scrollLeft=A.scrollLeft},updateSortIcon:function(B,A){var D=this.sortClasses;var C=this.mainHd.select("td").removeClass(D);C.item(B).addClass(D[A=="DESC"?1:0])},updateAllColumnWidths:function(){var D=this.getTotalWidth();var H=this.cm.getColumnCount();var F=[];for(var B=0;B<H;B++){F[B]=this.getColumnWidth(B)}this.innerHd.firstChild.firstChild.style.width=D;for(var B=0;B<H;B++){var C=this.getHeaderCell(B);C.style.width=F[B]}var G=this.getRows();for(var B=0,E=G.length;B<E;B++){G[B].style.width=D;G[B].firstChild.style.width=D;var I=G[B].firstChild.rows[0];for(var A=0;A<H;A++){I.childNodes[A].style.width=F[A]}}this.onAllColumnWidthsUpdated(F,D)},updateColumnWidth:function(D,G){var B=this.getColumnWidth(D);var C=this.getTotalWidth();this.innerHd.firstChild.firstChild.style.width=C;var H=this.getHeaderCell(D);H.style.width=B;var F=this.getRows();for(var E=0,A=F.length;E<A;E++){F[E].style.width=C;F[E].firstChild.style.width=C;F[E].firstChild.rows[0].childNodes[D].style.width=B}this.onColumnWidthUpdated(D,B,C)},updateColumnHidden:function(C,F){var B=this.getTotalWidth();this.innerHd.firstChild.firstChild.style.width=B;var H=F?"none":"";var G=this.getHeaderCell(C);G.style.display=H;var E=this.getRows();for(var D=0,A=E.length;D<A;D++){E[D].style.width=B;E[D].firstChild.style.width=B;E[D].firstChild.rows[0].childNodes[C].style.display=H}this.onColumnHiddenUpdated(C,F,B);delete this.lastViewWidth;this.layout()},doRender:function(E,G,M,A,L,Q){var B=this.templates,D=B.cell,F=B.row,H=L-1;var C="width:"+this.getTotalWidth()+";";var T=[],N,U,O={},I={tstyle:C},K;for(var P=0,S=G.length;P<S;P++){K=G[P];N=[];var J=(P+A);for(var R=0;R<L;R++){U=E[R];O.id=U.id;O.css=R==0?"x-grid3-cell-first ":(R==H?"x-grid3-cell-last ":"");O.attr=O.cellAttr="";O.value=U.renderer(K.data[U.name],O,K,J,R,M);O.style=U.style;if(O.value==undefined||O.value===""){O.value="&#160;"}if(K.dirty&&typeof K.modified[U.name]!=="undefined"){O.css+=" x-grid3-dirty-cell"}N[N.length]=D.apply(O)}var V=[];if(Q&&((J+1)%2==0)){V[0]="x-grid3-row-alt"}if(K.dirty){V[1]=" x-grid3-dirty-row"}I.cols=L;if(this.getRowClass){V[2]=this.getRowClass(K,J,I,M)}I.alt=V.join(" ");I.cells=N.join("");T[T.length]=F.apply(I)}return T.join("")},processRows:function(E,D){if(this.ds.getCount()<1){return }D=D||!this.grid.stripeRows;E=E||0;var I=this.getRows();var F=" x-grid3-row-alt ";for(var B=E,C=I.length;B<C;B++){var H=I[B];H.rowIndex=B;if(!D){var A=((B+1)%2==0);var G=(" "+H.className+" ").indexOf(F)!=-1;if(A==G){continue}if(A){H.className+=" x-grid3-row-alt"}else{H.className=H.className.replace("x-grid3-row-alt","")}}}},renderUI:function(){var E=this.renderHeaders();var B=this.templates.body.apply({rows:""});var C=this.templates.master.apply({body:B,header:E});var D=this.grid;D.getGridEl().dom.innerHTML=C;this.initElements();this.mainBody.dom.innerHTML=this.renderRows();this.processRows(0,true);Ext.fly(this.innerHd).on("click",this.handleHdDown,this);this.mainHd.on("mouseover",this.handleHdOver,this);this.mainHd.on("mouseout",this.handleHdOut,this);this.mainHd.on("mousemove",this.handleHdMove,this);this.scroller.on("scroll",this.syncScroll,this);if(D.enableColumnResize!==false){this.splitone=new Ext.grid.GridView.SplitDragZone(D,this.mainHd.dom)}if(D.enableColumnMove){this.columnDrag=new Ext.grid.GridView.ColumnDragZone(D,this.innerHd);this.columnDrop=new Ext.grid.HeaderDropZone(D,this.mainHd.dom)}if(D.enableHdMenu!==false){if(D.enableColumnHide!==false){this.colMenu=new Ext.menu.Menu({id:D.id+"-hcols-menu"});this.colMenu.on("beforeshow",this.beforeColMenuShow,this);this.colMenu.on("itemclick",this.handleHdMenuClick,this)}this.hmenu=new Ext.menu.Menu({id:D.id+"-hctx"});this.hmenu.add({id:"asc",text:this.sortAscText,cls:"xg-hmenu-sort-asc"},{id:"desc",text:this.sortDescText,cls:"xg-hmenu-sort-desc"});if(D.enableColumnHide!==false){this.hmenu.add("-",{id:"columns",text:this.columnsText,menu:this.colMenu,iconCls:"x-cols-icon"})}this.hmenu.on("itemclick",this.handleHdMenuClick,this)}if(D.enableDragDrop||D.enableDrag){var A=new Ext.grid.GridDragZone(D,{ddGroup:D.ddGroup||"GridDD"})}this.updateHeaderSortState()},layout:function(){if(!this.mainBody){return }var E=this.grid;var G=E.getGridEl(),I=this.cm,B=E.autoExpandColumn,A=this;var C=G.getSize(true);var H=C.width;if(H<20||C.height<20){return }if(E.autoHeight){this.scroller.dom.style.overflow="visible"}else{this.el.setSize(C.width,C.height);var F=this.mainHd.getHeight();var D=C.height-(F);this.scroller.setSize(H,D);if(this.innerHd){this.innerHd.style.width=(H)+"px"}}if(this.forceFit){if(this.lastViewWidth!=H){this.fitColumns(false,false);this.lastViewWidth=H}}else{this.autoExpand();this.syncHeaderScroll()}this.onLayout(H,D)},onLayout:function(A,B){},onColumnWidthUpdated:function(C,A,B){},onAllColumnWidthsUpdated:function(A,B){},onColumnHiddenUpdated:function(B,C,A){},updateColumnText:function(A,B){},afterMove:function(A){},init:function(A){this.grid=A;this.initTemplates();this.initData(A.store,A.colModel);this.initUI(A)},getColumnId:function(A){return this.cm.getColumnId(A)},renderHeaders:function(){var C=this.cm,F=this.templates;var E=F.hcell;var B=[],H=[],G={};for(var D=0,A=C.getColumnCount();D<A;D++){G.id=C.getColumnId(D);G.value=C.getColumnHeader(D)||"";G.style=this.getColumnStyle(D,true);G.tooltip=this.getColumnTooltip(D);if(C.config[D].align=="right"){G.istyle="padding-right:16px"}else{delete G.istyle}B[B.length]=E.apply(G)}return F.header.apply({cells:B.join(""),tstyle:"width:"+this.getTotalWidth()+";"})},getColumnTooltip:function(A){var B=this.cm.getColumnTooltip(A);if(B){if(Ext.QuickTips.isEnabled()){return"ext:qtip=\""+B+"\""}else{return"title=\""+B+"\""}}return""},beforeUpdate:function(){this.grid.stopEditing(true)},updateHeaders:function(){this.innerHd.firstChild.innerHTML=this.renderHeaders()},focusRow:function(A){this.focusCell(A,0,false)},focusCell:function(D,A,C){var B=this.ensureVisible(D,A,C);this.focusEl.setXY(B);if(Ext.isGecko){this.focusEl.focus()}else{this.focusEl.focus.defer(1,this.focusEl)}},ensureVisible:function(P,E,D){if(typeof P!="number"){P=P.rowIndex}if(!this.ds){return }if(P<0||P>=this.ds.getCount()){return }E=(E!==undefined?E:0);var I=this.getRow(P),F;if(!(D===false&&E===0)){while(this.cm.isHidden(E)){E++}F=this.getCell(P,E)}if(!I){return }var L=this.scroller.dom;var O=0;var C=I,M=this.el.dom;while(C&&C!=M){O+=C.offsetTop;C=C.offsetParent}O-=this.mainHd.dom.offsetHeight;var N=O+I.offsetHeight;var A=L.clientHeight;var M=parseInt(L.scrollTop,10);var K=M+A;if(O<M){L.scrollTop=O}else{if(N>K){L.scrollTop=N-A}}if(D!==false){var J=parseInt(F.offsetLeft,10);var H=J+F.offsetWidth;var G=parseInt(L.scrollLeft,10);var B=G+L.clientWidth;if(J<G){L.scrollLeft=J}else{if(H>B){L.scrollLeft=H-L.clientWidth}}}return F?Ext.fly(F).getXY():[L.scrollLeft,Ext.fly(I).getY()]},insertRows:function(A,F,C,E){if(!E&&F===0&&C==A.getCount()-1){this.refresh()}else{if(!E){this.fireEvent("beforerowsinserted",this,F,C)}var B=this.renderRows(F,C);var D=this.getRow(F);if(D){Ext.DomHelper.insertHtml("beforeBegin",D,B)}else{Ext.DomHelper.insertHtml("beforeEnd",this.mainBody.dom,B)}if(!E){this.fireEvent("rowsinserted",this,F,C);this.processRows(F)}}},deleteRows:function(A,C,B){if(A.getRowCount()<1){this.refresh()}else{this.fireEvent("beforerowsdeleted",this,C,B);this.removeRows(C,B);this.processRows(C);this.fireEvent("rowsdeleted",this,C,B)}},getColumnStyle:function(A,C){var B=!C?(this.cm.config[A].css||""):"";B+="width:"+this.getColumnWidth(A)+";";if(this.cm.isHidden(A)){B+="display:none;"}var D=this.cm.config[A].align;if(D){B+="text-align:"+D+";"}return B},getColumnWidth:function(B){var A=this.cm.getColumnWidth(B);if(typeof A=="number"){return(Ext.isBorderBox?A:(A-this.borderWidth>0?A-this.borderWidth:0))+"px"}return A},getTotalWidth:function(){return this.cm.getTotalWidth()+"px"},fitColumns:function(D,G,E){var F=this.cm,S,L,O;var R=F.getTotalWidth(false);var J=this.grid.getGridEl().getWidth(true)-this.scrollOffset;if(J<20){return }var B=J-R;if(B===0){return false}var A=F.getColumnCount(true);var P=A-(typeof E=="number"?1:0);if(P===0){P=1;E=undefined}var K=F.getColumnCount();var I=[];var N=0;var M=0;var H;for(O=0;O<K;O++){if(!F.isHidden(O)&&!F.isFixed(O)&&O!==E){H=F.getColumnWidth(O);I.push(O);N=O;I.push(H);M+=H}}var C=(J-F.getTotalWidth())/M;while(I.length){H=I.pop();O=I.pop();F.setColumnWidth(O,Math.max(this.grid.minColumnWidth,Math.floor(H+H*C)),true)}if((R=F.getTotalWidth(false))>J){var Q=P!=A?E:N;F.setColumnWidth(Q,Math.max(1,F.getColumnWidth(Q)-(R-J)),true)}if(D!==true){this.updateAllColumnWidths()}return true},autoExpand:function(B){var G=this.grid,A=this.cm;if(!this.userResized&&G.autoExpandColumn){var D=A.getTotalWidth(false);var H=this.grid.getGridEl().getWidth(true)-this.scrollOffset;if(D!=H){var F=A.getIndexById(G.autoExpandColumn);var E=A.getColumnWidth(F);var C=Math.min(Math.max(((H-D)+E),G.autoExpandMin),G.autoExpandMax);if(C!=E){A.setColumnWidth(F,C,true);if(B!==true){this.updateColumnWidth(F,C)}}}}},getColumnData:function(){var D=[],A=this.cm,E=A.getColumnCount();for(var C=0;C<E;C++){var B=A.getDataIndex(C);D[C]={name:(typeof B=="undefined"?this.ds.fields.get(C).name:B),renderer:A.getRenderer(C),id:A.getColumnId(C),style:this.getColumnStyle(C)}}return D},renderRows:function(H,C){var D=this.grid,F=D.colModel,A=D.store,I=D.stripeRows;var G=F.getColumnCount();if(A.getCount()<1){return""}var E=this.getColumnData();H=H||0;C=typeof C=="undefined"?A.getCount()-1:C;var B=A.getRange(H,C);return this.doRender(E,B,A,H,G,I)},renderBody:function(){var A=this.renderRows();return this.templates.body.apply({rows:A})},refreshRow:function(B){var D=this.ds,C;if(typeof B=="number"){C=B;B=D.getAt(C)}else{C=D.indexOf(B)}var A=[];this.insertRows(D,C,C,true);this.getRow(C).rowIndex=C;this.onRemove(D,B,C+1,true);this.fireEvent("rowupdated",this,C,B)},refresh:function(B){this.fireEvent("beforerefresh",this);this.grid.stopEditing(true);var A=this.renderBody();this.mainBody.update(A);if(B===true){this.updateHeaders();this.updateHeaderSortState()}this.processRows(0,true);this.layout();this.applyEmptyText();this.fireEvent("refresh",this)},applyEmptyText:function(){if(this.emptyText&&!this.hasRows()){this.mainBody.update("<div class=\"x-grid-empty\">"+this.emptyText+"</div>")}},updateHeaderSortState:function(){var B=this.ds.getSortState();if(!B){return }if(!this.sortState||(this.sortState.field!=B.field||this.sortState.direction!=B.direction)){this.grid.fireEvent("sortchange",this.grid,B)}this.sortState=B;var C=this.cm.findColumnIndex(B.field);if(C!=-1){var A=B.direction;this.updateSortIcon(C,A)}},destroy:function(){if(this.colMenu){this.colMenu.removeAll();Ext.menu.MenuMgr.unregister(this.colMenu);this.colMenu.getEl().remove();delete this.colMenu}if(this.hmenu){this.hmenu.removeAll();Ext.menu.MenuMgr.unregister(this.hmenu);this.hmenu.getEl().remove();delete this.hmenu}if(this.grid.enableColumnMove){var C=Ext.dd.DDM.ids["gridHeader"+this.grid.getGridEl().id];if(C){for(var A in C){if(!C[A].config.isTarget&&C[A].dragElId){var B=C[A].dragElId;C[A].unreg();Ext.get(B).remove()}else{if(C[A].config.isTarget){C[A].proxyTop.remove();C[A].proxyBottom.remove();C[A].unreg()}}if(Ext.dd.DDM.locationCache[A]){delete Ext.dd.DDM.locationCache[A]}}delete Ext.dd.DDM.ids["gridHeader"+this.grid.getGridEl().id]}}Ext.destroy(this.resizeMarker,this.resizeProxy);this.initData(null,null);Ext.EventManager.removeResizeListener(this.onWindowResize,this)},onDenyColumnHide:function(){},render:function(){var A=this.cm;var B=A.getColumnCount();if(this.autoFill){this.fitColumns(true,true)}else{if(this.forceFit){this.fitColumns(true,false)}else{if(this.grid.autoExpandColumn){this.autoExpand(true)}}}this.renderUI()},initData:function(B,A){if(this.ds){this.ds.un("load",this.onLoad,this);this.ds.un("datachanged",this.onDataChange,this);this.ds.un("add",this.onAdd,this);this.ds.un("remove",this.onRemove,this);this.ds.un("update",this.onUpdate,this);this.ds.un("clear",this.onClear,this)}if(B){B.on("load",this.onLoad,this);B.on("datachanged",this.onDataChange,this);B.on("add",this.onAdd,this);B.on("remove",this.onRemove,this);B.on("update",this.onUpdate,this);B.on("clear",this.onClear,this)}this.ds=B;if(this.cm){this.cm.un("configchange",this.onColConfigChange,this);this.cm.un("widthchange",this.onColWidthChange,this);this.cm.un("headerchange",this.onHeaderChange,this);this.cm.un("hiddenchange",this.onHiddenChange,this);this.cm.un("columnmoved",this.onColumnMove,this);this.cm.un("columnlockchange",this.onColumnLock,this)}if(A){A.on("configchange",this.onColConfigChange,this);A.on("widthchange",this.onColWidthChange,this);A.on("headerchange",this.onHeaderChange,this);A.on("hiddenchange",this.onHiddenChange,this);A.on("columnmoved",this.onColumnMove,this);A.on("columnlockchange",this.onColumnLock,this)}this.cm=A},onDataChange:function(){this.refresh();this.updateHeaderSortState()},onClear:function(){this.refresh()},onUpdate:function(B,A){this.refreshRow(A)},onAdd:function(C,A,B){this.insertRows(C,B,B+(A.length-1))},onRemove:function(D,A,B,C){if(C!==true){this.fireEvent("beforerowremoved",this,B,A)}this.removeRow(B);if(C!==true){this.processRows(B);this.applyEmptyText();this.fireEvent("rowremoved",this,B,A)}},onLoad:function(){this.scrollToTop()},onColWidthChange:function(A,B,C){this.updateColumnWidth(B,C)},onHeaderChange:function(A,B,C){this.updateHeaders()},onHiddenChange:function(A,B,C){this.updateColumnHidden(B,C)},onColumnMove:function(A,D,B){this.indexMap=null;var C=this.getScrollState();this.refresh(true);this.restoreScroll(C);this.afterMove(B)},onColConfigChange:function(){delete this.lastViewWidth;this.indexMap=null;this.refresh(true)},initUI:function(A){A.on("headerclick",this.onHeaderClick,this);if(A.trackMouseOver){A.on("mouseover",this.onRowOver,this);A.on("mouseout",this.onRowOut,this)}},initEvents:function(){},onHeaderClick:function(B,A){if(this.headersDisabled||!this.cm.isSortable(A)){return }B.stopEditing(true);B.store.sort(this.cm.getDataIndex(A))},onRowOver:function(B,A){var C;if((C=this.findRowIndex(A))!==false){this.addRowClass(C,"x-grid3-row-over")}},onRowOut:function(B,A){var C;if((C=this.findRowIndex(A))!==false&&C!==this.findRowIndex(B.getRelatedTarget())){this.removeRowClass(C,"x-grid3-row-over")}},handleWheel:function(A){A.stopPropagation()},onRowSelect:function(A){this.addRowClass(A,"x-grid3-row-selected")},onRowDeselect:function(A){this.removeRowClass(A,"x-grid3-row-selected")},onCellSelect:function(C,B){var A=this.getCell(C,B);if(A){this.fly(A).addClass("x-grid3-cell-selected")}},onCellDeselect:function(C,B){var A=this.getCell(C,B);if(A){this.fly(A).removeClass("x-grid3-cell-selected")}},onColumnSplitterMoved:function(C,B){this.userResized=true;var A=this.grid.colModel;A.setColumnWidth(C,B,true);if(this.forceFit){this.fitColumns(true,false,C);this.updateAllColumnWidths()}else{this.updateColumnWidth(C,B)}this.grid.fireEvent("columnresize",C,B)},handleHdMenuClick:function(C){var B=this.hdCtxIndex;var A=this.cm,D=this.ds;switch(C.id){case"asc":D.sort(A.getDataIndex(B),"ASC");break;case"desc":D.sort(A.getDataIndex(B),"DESC");break;default:B=A.getIndexById(C.id.substr(4));if(B!=-1){if(C.checked&&A.getColumnsBy(this.isHideableColumn,this).length<=1){this.onDenyColumnHide();return false}A.setHidden(B,C.checked)}}return true},isHideableColumn:function(A){return !A.hidden&&!A.fixed},beforeColMenuShow:function(){var A=this.cm,C=A.getColumnCount();this.colMenu.removeAll();for(var B=0;B<C;B++){if(A.config[B].fixed!==true&&A.config[B].hideable!==false){this.colMenu.add(new Ext.menu.CheckItem({id:"col-"+A.getColumnId(B),text:A.getColumnHeader(B),checked:!A.isHidden(B),hideOnClick:false,disabled:A.config[B].hideable===false}))}}},handleHdDown:function(F,D){if(Ext.fly(D).hasClass("x-grid3-hd-btn")){F.stopEvent();var E=this.findHeaderCell(D);Ext.fly(E).addClass("x-grid3-hd-menu-open");var C=this.getCellIndex(E);this.hdCtxIndex=C;var B=this.hmenu.items,A=this.cm;B.get("asc").setDisabled(!A.isSortable(C));B.get("desc").setDisabled(!A.isSortable(C));this.hmenu.on("hide",function(){Ext.fly(E).removeClass("x-grid3-hd-menu-open")},this,{single:true});this.hmenu.show(D,"tl-bl?")}},handleHdOver:function(D,A){var C=this.findHeaderCell(A);if(C&&!this.headersDisabled){this.activeHd=C;this.activeHdIndex=this.getCellIndex(C);var B=this.fly(C);this.activeHdRegion=B.getRegion();if(!this.cm.isMenuDisabled(this.activeHdIndex)){B.addClass("x-grid3-hd-over");this.activeHdBtn=B.child(".x-grid3-hd-btn");if(this.activeHdBtn){this.activeHdBtn.dom.style.height=(C.firstChild.offsetHeight-1)+"px"}}}},handleHdMove:function(F,D){if(this.activeHd&&!this.headersDisabled){var B=this.splitHandleWidth||5;var E=this.activeHdRegion;var A=F.getPageX();var C=this.activeHd.style;if(A-E.left<=B&&this.cm.isResizable(this.activeHdIndex-1)){C.cursor=Ext.isAir?"move":Ext.isSafari?"e-resize":"col-resize"}else{if(E.right-A<=(!this.activeHdBtn?B:2)&&this.cm.isResizable(this.activeHdIndex)){C.cursor=Ext.isAir?"move":Ext.isSafari?"w-resize":"col-resize"}else{C.cursor=""}}}},handleHdOut:function(C,A){var B=this.findHeaderCell(A);if(B&&(!Ext.isIE||!C.within(B,true))){this.activeHd=null;this.fly(B).removeClass("x-grid3-hd-over");B.style.cursor=""}},hasRows:function(){var A=this.mainBody.dom.firstChild;return A&&A.className!="x-grid-empty"},bind:function(A,B){this.initData(A,B)}});Ext.grid.GridView.SplitDragZone=function(A,B){this.grid=A;this.view=A.getView();this.marker=this.view.resizeMarker;this.proxy=this.view.resizeProxy;Ext.grid.GridView.SplitDragZone.superclass.constructor.call(this,B,"gridSplitters"+this.grid.getGridEl().id,{dragElId:Ext.id(this.proxy.dom),resizeFrame:false});this.scroll=false;this.hw=this.view.splitHandleWidth||5};Ext.extend(Ext.grid.GridView.SplitDragZone,Ext.dd.DDProxy,{b4StartDrag:function(A,E){this.view.headersDisabled=true;var D=this.view.mainWrap.getHeight();this.marker.setHeight(D);this.marker.show();this.marker.alignTo(this.view.getHeaderCell(this.cellIndex),"tl-tl",[-2,0]);this.proxy.setHeight(D);var B=this.cm.getColumnWidth(this.cellIndex);var C=Math.max(B-this.grid.minColumnWidth,0);this.resetConstraints();this.setXConstraint(C,1000);this.setYConstraint(0,0);this.minX=A-C;this.maxX=A+1000;this.startPos=A;Ext.dd.DDProxy.prototype.b4StartDrag.call(this,A,E)},handleMouseDown:function(A){var H=this.view.findHeaderCell(A.getTarget());if(H){var K=this.view.fly(H).getXY(),E=K[0],D=K[1];var I=A.getXY(),C=I[0],B=I[1];var G=H.offsetWidth,F=false;if((C-E)<=this.hw){F=-1}else{if((E+G)-C<=this.hw){F=0}}if(F!==false){this.cm=this.grid.colModel;var J=this.view.getCellIndex(H);if(F==-1){if(J+F<0){return }while(this.cm.isHidden(J+F)){--F;if(J+F<0){return }}}this.cellIndex=J+F;this.split=H.dom;if(this.cm.isResizable(this.cellIndex)&&!this.cm.isFixed(this.cellIndex)){Ext.grid.GridView.SplitDragZone.superclass.handleMouseDown.apply(this,arguments)}}else{if(this.view.columnDrag){this.view.columnDrag.callHandleMouseDown(A)}}}},endDrag:function(D){this.marker.hide();var A=this.view;var B=Math.max(this.minX,D.getPageX());var C=B-this.startPos;A.onColumnSplitterMoved(this.cellIndex,this.cm.getColumnWidth(this.cellIndex)+C);setTimeout(function(){A.headersDisabled=false},50)},autoOffset:function(){this.setDelta(0,0)}});
Ext.grid.GroupingView=Ext.extend(Ext.grid.GridView,{hideGroupedColumn:false,showGroupName:true,startCollapsed:false,enableGrouping:true,enableGroupingMenu:true,enableNoGroups:true,emptyGroupText:"(None)",ignoreAdd:false,groupTextTpl:"{text}",gidSeed:1000,initTemplates:function(){Ext.grid.GroupingView.superclass.initTemplates.call(this);this.state={};var A=this.grid.getSelectionModel();A.on(A.selectRow?"beforerowselect":"beforecellselect",this.onBeforeRowSelect,this);if(!this.startGroup){this.startGroup=new Ext.XTemplate("<div id=\"{groupId}\" class=\"x-grid-group {cls}\">","<div id=\"{groupId}-hd\" class=\"x-grid-group-hd\" style=\"{style}\"><div>",this.groupTextTpl,"</div></div>","<div id=\"{groupId}-bd\" class=\"x-grid-group-body\">")}this.startGroup.compile();this.endGroup="</div></div>"},findGroup:function(A){return Ext.fly(A).up(".x-grid-group",this.mainBody.dom)},getGroups:function(){return this.hasRows()?this.mainBody.dom.childNodes:[]},onAdd:function(){if(this.enableGrouping&&!this.ignoreAdd){var A=this.getScrollState();this.refresh();this.restoreScroll(A)}else{if(!this.enableGrouping){Ext.grid.GroupingView.superclass.onAdd.apply(this,arguments)}}},onRemove:function(E,A,B,D){Ext.grid.GroupingView.superclass.onRemove.apply(this,arguments);var C=document.getElementById(A._groupId);if(C&&C.childNodes[1].childNodes.length<1){Ext.removeNode(C)}this.applyEmptyText()},refreshRow:function(A){if(this.ds.getCount()==1){this.refresh()}else{this.isUpdating=true;Ext.grid.GroupingView.superclass.refreshRow.apply(this,arguments);this.isUpdating=false}},beforeMenuShow:function(){var C=this.getGroupField();var B=this.hmenu.items.get("groupBy");if(B){B.setDisabled(this.cm.config[this.hdCtxIndex].groupable===false)}var A=this.hmenu.items.get("showGroups");if(A){if(!!C){A.setDisabled(this.cm.config[this.hdCtxIndex].groupable===false)}A.setChecked(!!C)}},renderUI:function(){Ext.grid.GroupingView.superclass.renderUI.call(this);this.mainBody.on("mousedown",this.interceptMouse,this);if(this.enableGroupingMenu&&this.hmenu){this.hmenu.add("-",{id:"groupBy",text:this.groupByText,handler:this.onGroupByClick,scope:this,iconCls:"x-group-by-icon"});if(this.enableNoGroups){this.hmenu.add({id:"showGroups",text:this.showGroupsText,checked:true,checkHandler:this.onShowGroupsClick,scope:this})}this.hmenu.on("beforeshow",this.beforeMenuShow,this)}},onGroupByClick:function(){this.grid.store.groupBy(this.cm.getDataIndex(this.hdCtxIndex));this.beforeMenuShow()},onShowGroupsClick:function(A,B){if(B){this.onGroupByClick()}else{this.grid.store.clearGrouping()}},toggleGroup:function(C,B){this.grid.stopEditing(true);C=Ext.getDom(C);var A=Ext.fly(C);B=B!==undefined?B:A.hasClass("x-grid-group-collapsed");this.state[A.dom.id]=B;A[B?"removeClass":"addClass"]("x-grid-group-collapsed")},toggleAllGroups:function(C){var B=this.getGroups();for(var D=0,A=B.length;D<A;D++){this.toggleGroup(B[D],C)}},expandAllGroups:function(){this.toggleAllGroups(true)},collapseAllGroups:function(){this.toggleAllGroups(false)},interceptMouse:function(B){var A=B.getTarget(".x-grid-group-hd",this.mainBody);if(A){B.stopEvent();this.toggleGroup(A.parentNode)}},getGroup:function(A,D,F,G,B,E){var C=F?F(A,{},D,G,B,E):String(A);if(C===""){C=this.cm.config[B].emptyGroupText||this.emptyGroupText}return C},getGroupField:function(){return this.grid.store.getGroupState()},renderRows:function(){var A=this.getGroupField();var D=!!A;if(this.hideGroupedColumn){var B=this.cm.findColumnIndex(A);if(!D&&this.lastGroupField!==undefined){this.mainBody.update("");this.cm.setHidden(this.cm.findColumnIndex(this.lastGroupField),false);delete this.lastGroupField}else{if(D&&this.lastGroupField===undefined){this.lastGroupField=A;this.cm.setHidden(B,true)}else{if(D&&this.lastGroupField!==undefined&&A!==this.lastGroupField){this.mainBody.update("");var C=this.cm.findColumnIndex(this.lastGroupField);this.cm.setHidden(C,false);this.lastGroupField=A;this.cm.setHidden(B,true)}}}}return Ext.grid.GroupingView.superclass.renderRows.apply(this,arguments)},doRender:function(D,G,P,A,O,R){if(G.length<1){return""}var Y=this.getGroupField();var N=this.cm.findColumnIndex(Y);this.enableGrouping=!!Y;if(!this.enableGrouping||this.isUpdating){return Ext.grid.GroupingView.superclass.doRender.apply(this,arguments)}var H="width:"+this.getTotalWidth()+";";var Q=this.grid.getGridEl().id;var F=this.cm.config[N];var B=F.groupRenderer||F.renderer;var S=this.showGroupName?(F.groupName||F.header)+": ":"";var X=[],K,T,U,M;for(T=0,U=G.length;T<U;T++){var J=A+T;var L=G[T],E=L.data[Y],V=this.getGroup(E,L,B,J,N,P);if(!K||K.group!=V){M=Q+"-gp-"+Y+"-"+Ext.util.Format.htmlEncode(V);var C=typeof this.state[M]!=="undefined"?!this.state[M]:this.startCollapsed;var I=C?"x-grid-group-collapsed":"";K={group:V,gvalue:E,text:S+V,groupId:M,startRow:J,rs:[L],cls:I,style:H};X.push(K)}else{K.rs.push(L)}L._groupId=M}var W=[];for(T=0,U=X.length;T<U;T++){var V=X[T];this.doGroupStart(W,V,D,P,O);W[W.length]=Ext.grid.GroupingView.superclass.doRender.call(this,D,V.rs,P,V.startRow,O,R);this.doGroupEnd(W,V,D,P,O)}return W.join("")},getGroupId:function(F){var D=this.grid.getGridEl().id;var C=this.getGroupField();var E=this.cm.findColumnIndex(C);var B=this.cm.config[E];var G=B.groupRenderer||B.renderer;var A=this.getGroup(F,{data:{}},G,0,E,this.ds);return D+"-gp-"+C+"-"+Ext.util.Format.htmlEncode(F)},doGroupStart:function(A,D,B,E,C){A[A.length]=this.startGroup.apply(D)},doGroupEnd:function(A,D,B,E,C){A[A.length]=this.endGroup},getRows:function(){if(!this.enableGrouping){return Ext.grid.GroupingView.superclass.getRows.call(this)}var G=[];var F,C=this.getGroups();for(var E=0,A=C.length;E<A;E++){F=C[E].childNodes[1].childNodes;for(var D=0,B=F.length;D<B;D++){G[G.length]=F[D]}}return G},updateGroupWidths:function(){if(!this.enableGrouping||!this.hasRows()){return }var C=Math.max(this.cm.getTotalWidth(),this.el.dom.offsetWidth-this.scrollOffset)+"px";var B=this.getGroups();for(var D=0,A=B.length;D<A;D++){B[D].firstChild.style.width=C}},onColumnWidthUpdated:function(C,A,B){this.updateGroupWidths()},onAllColumnWidthsUpdated:function(A,B){this.updateGroupWidths()},onColumnHiddenUpdated:function(B,C,A){this.updateGroupWidths()},onLayout:function(){this.updateGroupWidths()},onBeforeRowSelect:function(D,C){if(!this.enableGrouping){return }var B=this.getRow(C);if(B&&!B.offsetParent){var A=this.findGroup(B);this.toggleGroup(A,true)}},groupByText:"Group By This Field",showGroupsText:"Show in Groups"});Ext.grid.GroupingView.GROUP_ID=1000;
Ext.grid.HeaderDragZone=function(A,C,B){this.grid=A;this.view=A.getView();this.ddGroup="gridHeader"+this.grid.getGridEl().id;Ext.grid.HeaderDragZone.superclass.constructor.call(this,C);if(B){this.setHandleElId(Ext.id(C));this.setOuterHandleElId(Ext.id(B))}this.scroll=false};Ext.extend(Ext.grid.HeaderDragZone,Ext.dd.DragZone,{maxDragWidth:120,getDragData:function(C){var A=Ext.lib.Event.getTarget(C);var B=this.view.findHeaderCell(A);if(B){return{ddel:B.firstChild,header:B}}return false},onInitDrag:function(A){this.view.headersDisabled=true;var B=this.dragData.ddel.cloneNode(true);B.id=Ext.id();B.style.width=Math.min(this.dragData.header.offsetWidth,this.maxDragWidth)+"px";this.proxy.update(B);return true},afterValidDrop:function(){var A=this.view;setTimeout(function(){A.headersDisabled=false},50)},afterInvalidDrop:function(){var A=this.view;setTimeout(function(){A.headersDisabled=false},50)}});Ext.grid.HeaderDropZone=function(A,C,B){this.grid=A;this.view=A.getView();this.proxyTop=Ext.DomHelper.append(document.body,{cls:"col-move-top",html:"&#160;"},true);this.proxyBottom=Ext.DomHelper.append(document.body,{cls:"col-move-bottom",html:"&#160;"},true);this.proxyTop.hide=this.proxyBottom.hide=function(){this.setLeftTop(-100,-100);this.setStyle("visibility","hidden")};this.ddGroup="gridHeader"+this.grid.getGridEl().id;Ext.grid.HeaderDropZone.superclass.constructor.call(this,A.getGridEl().dom)};Ext.extend(Ext.grid.HeaderDropZone,Ext.dd.DropZone,{proxyOffsets:[-4,-9],fly:Ext.Element.fly,getTargetFromEvent:function(C){var A=Ext.lib.Event.getTarget(C);var B=this.view.findCellIndex(A);if(B!==false){return this.view.getHeaderCell(B)}},nextVisible:function(C){var B=this.view,A=this.grid.colModel;C=C.nextSibling;while(C){if(!A.isHidden(B.getCellIndex(C))){return C}C=C.nextSibling}return null},prevVisible:function(C){var B=this.view,A=this.grid.colModel;C=C.prevSibling;while(C){if(!A.isHidden(B.getCellIndex(C))){return C}C=C.prevSibling}return null},positionIndicator:function(D,B,E){var H=Ext.lib.Event.getPageX(E);var A=Ext.lib.Dom.getRegion(B.firstChild);var I,K,G=A.top+this.proxyOffsets[1];if((A.right-H)<=(A.right-A.left)/2){I=A.right+this.view.borderWidth;K="after"}else{I=A.left;K="before"}var F=this.view.getCellIndex(D);var J=this.view.getCellIndex(B);if(this.grid.colModel.isFixed(J)){return false}var C=this.grid.colModel.isLocked(J);if(K=="after"){J++}if(F<J){J--}if(F==J&&(C==this.grid.colModel.isLocked(F))){return false}I+=this.proxyOffsets[0];this.proxyTop.setLeftTop(I,G);this.proxyTop.show();if(!this.bottomOffset){this.bottomOffset=this.view.mainHd.getHeight()}this.proxyBottom.setLeftTop(I,G+this.proxyTop.dom.offsetHeight+this.bottomOffset);this.proxyBottom.show();return K},onNodeEnter:function(D,A,C,B){if(B.header!=D){this.positionIndicator(B.header,D,C)}},onNodeOver:function(E,B,D,C){var A=false;if(C.header!=E){A=this.positionIndicator(C.header,E,D)}if(!A){this.proxyTop.hide();this.proxyBottom.hide()}return A?this.dropAllowed:this.dropNotAllowed},onNodeOut:function(D,A,C,B){this.proxyTop.hide();this.proxyBottom.hide()},onNodeDrop:function(B,K,F,D){var E=D.header;if(E!=B){var I=this.grid.colModel;var H=Ext.lib.Event.getPageX(F);var A=Ext.lib.Dom.getRegion(B.firstChild);var L=(A.right-H)<=((A.right-A.left)/2)?"after":"before";var G=this.view.getCellIndex(E);var J=this.view.getCellIndex(B);var C=I.isLocked(J);if(L=="after"){J++}if(G<J){J--}if(G==J&&(C==I.isLocked(G))){return false}I.setLocked(G,C,true);I.moveColumn(G,J);this.grid.fireEvent("columnmove",G,J);return true}return false}});Ext.grid.GridView.ColumnDragZone=function(A,B){Ext.grid.GridView.ColumnDragZone.superclass.constructor.call(this,A,B,null);this.proxy.el.addClass("x-grid3-col-dd")};Ext.extend(Ext.grid.GridView.ColumnDragZone,Ext.grid.HeaderDragZone,{handleMouseDown:function(A){},callHandleMouseDown:function(A){Ext.grid.GridView.ColumnDragZone.superclass.handleMouseDown.call(this,A)}});
Ext.grid.SplitDragZone=function(A,C,B){this.grid=A;this.view=A.getView();this.proxy=this.view.resizeProxy;Ext.grid.SplitDragZone.superclass.constructor.call(this,C,"gridSplitters"+this.grid.getGridEl().id,{dragElId:Ext.id(this.proxy.dom),resizeFrame:false});this.setHandleElId(Ext.id(C));this.setOuterHandleElId(Ext.id(B));this.scroll=false};Ext.extend(Ext.grid.SplitDragZone,Ext.dd.DDProxy,{fly:Ext.Element.fly,b4StartDrag:function(A,D){this.view.headersDisabled=true;this.proxy.setHeight(this.view.mainWrap.getHeight());var B=this.cm.getColumnWidth(this.cellIndex);var C=Math.max(B-this.grid.minColumnWidth,0);this.resetConstraints();this.setXConstraint(C,1000);this.setYConstraint(0,0);this.minX=A-C;this.maxX=A+1000;this.startPos=A;Ext.dd.DDProxy.prototype.b4StartDrag.call(this,A,D)},handleMouseDown:function(B){ev=Ext.EventObject.setEvent(B);var A=this.fly(ev.getTarget());if(A.hasClass("x-grid-split")){this.cellIndex=this.view.getCellIndex(A.dom);this.split=A.dom;this.cm=this.grid.colModel;if(this.cm.isResizable(this.cellIndex)&&!this.cm.isFixed(this.cellIndex)){Ext.grid.SplitDragZone.superclass.handleMouseDown.apply(this,arguments)}}},endDrag:function(C){this.view.headersDisabled=false;var A=Math.max(this.minX,Ext.lib.Event.getPageX(C));var B=A-this.startPos;this.view.onColumnSplitterMoved(this.cellIndex,this.cm.getColumnWidth(this.cellIndex)+B)},autoOffset:function(){this.setDelta(0,0)}});
Ext.grid.GridDragZone=function(B,A){this.view=B.getView();Ext.grid.GridDragZone.superclass.constructor.call(this,this.view.mainBody.dom,A);if(this.view.lockedBody){this.setHandleElId(Ext.id(this.view.mainBody.dom));this.setOuterHandleElId(Ext.id(this.view.lockedBody.dom))}this.scroll=false;this.grid=B;this.ddel=document.createElement("div");this.ddel.className="x-grid-dd-wrap"};Ext.extend(Ext.grid.GridDragZone,Ext.dd.DragZone,{ddGroup:"GridDD",getDragData:function(B){var A=Ext.lib.Event.getTarget(B);var D=this.view.findRowIndex(A);if(D!==false){var C=this.grid.selModel;if(!C.isSelected(D)||B.hasModifier()){C.handleMouseDown(this.grid,D,B)}return{grid:this.grid,ddel:this.ddel,rowIndex:D,selections:C.getSelections()}}return false},onInitDrag:function(B){var A=this.dragData;this.ddel.innerHTML=this.grid.getDragDropText();this.proxy.update(this.ddel)},afterRepair:function(){this.dragging=false},getRepairXY:function(B,A){return false},onEndDrag:function(A,B){},onValidDrop:function(A,B,C){this.hideProxy()},beforeInvalidDrop:function(A,B){}});
Ext.grid.ColumnModel=function(A){this.defaultWidth=100;this.defaultSortable=false;if(A.columns){Ext.apply(this,A);this.setConfig(A.columns,true)}else{this.setConfig(A,true)}this.addEvents("widthchange","headerchange","hiddenchange","columnmoved","columnlockchange","configchange");Ext.grid.ColumnModel.superclass.constructor.call(this)};Ext.extend(Ext.grid.ColumnModel,Ext.util.Observable,{getColumnId:function(A){return this.config[A].id},setConfig:function(C,B){if(!B){delete this.totalWidth;for(var D=0,A=this.config.length;D<A;D++){var E=this.config[D];if(E.editor){E.editor.destroy()}}}this.config=C;this.lookup={};for(var D=0,A=C.length;D<A;D++){var E=C[D];if(typeof E.renderer=="string"){E.renderer=Ext.util.Format[E.renderer]}if(typeof E.id=="undefined"){E.id=D}if(E.editor&&E.editor.isFormField){E.editor=new Ext.grid.GridEditor(E.editor)}this.lookup[E.id]=E}if(!B){this.fireEvent("configchange",this)}},getColumnById:function(A){return this.lookup[A]},getIndexById:function(C){for(var B=0,A=this.config.length;B<A;B++){if(this.config[B].id==C){return B}}return -1},moveColumn:function(C,A){var B=this.config[C];this.config.splice(C,1);this.config.splice(A,0,B);this.dataMap=null;this.fireEvent("columnmoved",this,C,A)},isLocked:function(A){return this.config[A].locked===true},setLocked:function(B,C,A){if(this.isLocked(B)==C){return }this.config[B].locked=C;if(!A){this.fireEvent("columnlockchange",this,B,C)}},getTotalLockedWidth:function(){var A=0;for(var B=0;B<this.config.length;B++){if(this.isLocked(B)&&!this.isHidden(B)){this.totalWidth+=this.getColumnWidth(B)}}return A},getLockedCount:function(){for(var B=0,A=this.config.length;B<A;B++){if(!this.isLocked(B)){return B}}},getColumnCount:function(C){if(C===true){var D=0;for(var B=0,A=this.config.length;B<A;B++){if(!this.isHidden(B)){D++}}return D}return this.config.length},getColumnsBy:function(D,C){var E=[];for(var B=0,A=this.config.length;B<A;B++){var F=this.config[B];if(D.call(C||this,F,B)===true){E[E.length]=F}}return E},isSortable:function(A){if(typeof this.config[A].sortable=="undefined"){return this.defaultSortable}return this.config[A].sortable},isMenuDisabled:function(A){return !!this.config[A].menuDisabled},getRenderer:function(A){if(!this.config[A].renderer){return Ext.grid.ColumnModel.defaultRenderer}return this.config[A].renderer},setRenderer:function(A,B){this.config[A].renderer=B},getColumnWidth:function(A){return this.config[A].width||this.defaultWidth},setColumnWidth:function(B,C,A){this.config[B].width=C;this.totalWidth=null;if(!A){this.fireEvent("widthchange",this,B,C)}},getTotalWidth:function(B){if(!this.totalWidth){this.totalWidth=0;for(var C=0,A=this.config.length;C<A;C++){if(B||!this.isHidden(C)){this.totalWidth+=this.getColumnWidth(C)}}}return this.totalWidth},getColumnHeader:function(A){return this.config[A].header},setColumnHeader:function(A,B){this.config[A].header=B;this.fireEvent("headerchange",this,A,B)},getColumnTooltip:function(A){return this.config[A].tooltip},setColumnTooltip:function(A,B){this.config[A].tooltip=B},getDataIndex:function(A){return this.config[A].dataIndex},setDataIndex:function(A,B){this.config[A].dataIndex=B},findColumnIndex:function(C){var D=this.config;for(var B=0,A=D.length;B<A;B++){if(D[B].dataIndex==C){return B}}return -1},isCellEditable:function(A,B){return(this.config[A].editable||(typeof this.config[A].editable=="undefined"&&this.config[A].editor))?true:false},getCellEditor:function(A,B){return this.config[A].editor},setEditable:function(A,B){this.config[A].editable=B},isHidden:function(A){return this.config[A].hidden},isFixed:function(A){return this.config[A].fixed},isResizable:function(A){return A>=0&&this.config[A].resizable!==false&&this.config[A].fixed!==true},setHidden:function(A,B){var C=this.config[A];if(C.hidden!==B){C.hidden=B;this.totalWidth=null;this.fireEvent("hiddenchange",this,A,B)}},setEditor:function(A,B){this.config[A].editor=B}});Ext.grid.ColumnModel.defaultRenderer=function(A){if(typeof A=="string"&&A.length<1){return"&#160;"}return A};Ext.grid.DefaultColumnModel=Ext.grid.ColumnModel;
Ext.grid.AbstractSelectionModel=function(){this.locked=false;Ext.grid.AbstractSelectionModel.superclass.constructor.call(this)};Ext.extend(Ext.grid.AbstractSelectionModel,Ext.util.Observable,{init:function(A){this.grid=A;this.initEvents()},lock:function(){this.locked=true},unlock:function(){this.locked=false},isLocked:function(){return this.locked}});
Ext.grid.RowSelectionModel=function(A){Ext.apply(this,A);this.selections=new Ext.util.MixedCollection(false,function(B){return B.id});this.last=false;this.lastActive=false;this.addEvents("selectionchange","beforerowselect","rowselect","rowdeselect");Ext.grid.RowSelectionModel.superclass.constructor.call(this)};Ext.extend(Ext.grid.RowSelectionModel,Ext.grid.AbstractSelectionModel,{singleSelect:false,initEvents:function(){if(!this.grid.enableDragDrop&&!this.grid.enableDrag){this.grid.on("rowmousedown",this.handleMouseDown,this)}else{this.grid.on("rowclick",function(B,D,C){if(C.button===0&&!C.shiftKey&&!C.ctrlKey){this.selectRow(D,false);B.view.focusRow(D)}},this)}this.rowNav=new Ext.KeyNav(this.grid.getGridEl(),{"up":function(C){if(!C.shiftKey){this.selectPrevious(C.shiftKey)}else{if(this.last!==false&&this.lastActive!==false){var B=this.last;this.selectRange(this.last,this.lastActive-1);this.grid.getView().focusRow(this.lastActive);if(B!==false){this.last=B}}else{this.selectFirstRow()}}},"down":function(C){if(!C.shiftKey){this.selectNext(C.shiftKey)}else{if(this.last!==false&&this.lastActive!==false){var B=this.last;this.selectRange(this.last,this.lastActive+1);this.grid.getView().focusRow(this.lastActive);if(B!==false){this.last=B}}else{this.selectFirstRow()}}},scope:this});var A=this.grid.view;A.on("refresh",this.onRefresh,this);A.on("rowupdated",this.onRowUpdated,this);A.on("rowremoved",this.onRemove,this)},onRefresh:function(){var F=this.grid.store,B;var D=this.getSelections();this.clearSelections(true);for(var C=0,A=D.length;C<A;C++){var E=D[C];if((B=F.indexOfId(E.id))!=-1){this.selectRow(B,true)}}if(D.length!=this.selections.getCount()){this.fireEvent("selectionchange",this)}},onRemove:function(A,B,C){if(this.selections.remove(C)!==false){this.fireEvent("selectionchange",this)}},onRowUpdated:function(A,B,C){if(this.isSelected(C)){A.onRowSelect(B)}},selectRecords:function(B,E){if(!E){this.clearSelections()}var D=this.grid.store;for(var C=0,A=B.length;C<A;C++){this.selectRow(D.indexOf(B[C]),true)}},getCount:function(){return this.selections.length},selectFirstRow:function(){this.selectRow(0)},selectLastRow:function(A){this.selectRow(this.grid.store.getCount()-1,A)},selectNext:function(A){if(this.hasNext()){this.selectRow(this.last+1,A);this.grid.getView().focusRow(this.last);return true}return false},selectPrevious:function(A){if(this.hasPrevious()){this.selectRow(this.last-1,A);this.grid.getView().focusRow(this.last);return true}return false},hasNext:function(){return this.last!==false&&(this.last+1)<this.grid.store.getCount()},hasPrevious:function(){return !!this.last},getSelections:function(){return[].concat(this.selections.items)},getSelected:function(){return this.selections.itemAt(0)},each:function(E,D){var C=this.getSelections();for(var B=0,A=C.length;B<A;B++){if(E.call(D||this,C[B],B)===false){return false}}return true},clearSelections:function(A){if(this.locked){return }if(A!==true){var C=this.grid.store;var B=this.selections;B.each(function(D){this.deselectRow(C.indexOfId(D.id))},this);B.clear()}else{this.selections.clear()}this.last=false},selectAll:function(){if(this.locked){return }this.selections.clear();for(var B=0,A=this.grid.store.getCount();B<A;B++){this.selectRow(B,true)}},hasSelection:function(){return this.selections.length>0},isSelected:function(A){var B=typeof A=="number"?this.grid.store.getAt(A):A;return(B&&this.selections.key(B.id)?true:false)},isIdSelected:function(A){return(this.selections.key(A)?true:false)},handleMouseDown:function(D,F,E){if(E.button!==0||this.isLocked()){return }var A=this.grid.getView();if(E.shiftKey&&this.last!==false){var C=this.last;this.selectRange(C,F,E.ctrlKey);this.last=C;A.focusRow(F)}else{var B=this.isSelected(F);if(E.ctrlKey&&B){this.deselectRow(F)}else{if(!B||this.getCount()>1){this.selectRow(F,E.ctrlKey||E.shiftKey);A.focusRow(F)}}}},selectRows:function(C,D){if(!D){this.clearSelections()}for(var B=0,A=C.length;B<A;B++){this.selectRow(C[B],true)}},selectRange:function(B,A,D){if(this.locked){return }if(!D){this.clearSelections()}if(B<=A){for(var C=B;C<=A;C++){this.selectRow(C,true)}}else{for(var C=B;C>=A;C--){this.selectRow(C,true)}}},deselectRange:function(C,B,A){if(this.locked){return }for(var D=C;D<=B;D++){this.deselectRow(D,A)}},selectRow:function(B,D,A){if(this.locked||(B<0||B>=this.grid.store.getCount())){return }var C=this.grid.store.getAt(B);if(C&&this.fireEvent("beforerowselect",this,B,D,C)!==false){if(!D||this.singleSelect){this.clearSelections()}this.selections.add(C);this.last=this.lastActive=B;if(!A){this.grid.getView().onRowSelect(B)}this.fireEvent("rowselect",this,B,C);this.fireEvent("selectionchange",this)}},deselectRow:function(B,A){if(this.locked){return }if(this.last==B){this.last=false}if(this.lastActive==B){this.lastActive=false}var C=this.grid.store.getAt(B);if(C){this.selections.remove(C);if(!A){this.grid.getView().onRowDeselect(B)}this.fireEvent("rowdeselect",this,B,C);this.fireEvent("selectionchange",this)}},restoreLast:function(){if(this._last){this.last=this._last}},acceptsNav:function(C,B,A){return !A.isHidden(B)&&A.isCellEditable(B,C)},onEditorKey:function(F,E){var C=E.getKey(),G,D=this.grid,B=D.activeEditor;var A=E.shiftKey;if(C==E.TAB){E.stopEvent();B.completeEdit();if(A){G=D.walkCells(B.row,B.col-1,-1,this.acceptsNav,this)}else{G=D.walkCells(B.row,B.col+1,1,this.acceptsNav,this)}}else{if(C==E.ENTER){E.stopEvent();B.completeEdit();if(this.moveEditorOnEnter!==false){if(A){G=D.walkCells(B.row-1,B.col,-1,this.acceptsNav,this)}else{G=D.walkCells(B.row+1,B.col,1,this.acceptsNav,this)}}}else{if(C==E.ESC){B.cancelEdit()}}}if(G){D.startEditing(G[0],G[1])}}});
Ext.grid.CellSelectionModel=function(A){Ext.apply(this,A);this.selection=null;this.addEvents("beforecellselect","cellselect","selectionchange");Ext.grid.CellSelectionModel.superclass.constructor.call(this)};Ext.extend(Ext.grid.CellSelectionModel,Ext.grid.AbstractSelectionModel,{initEvents:function(){this.grid.on("cellmousedown",this.handleMouseDown,this);this.grid.getGridEl().on(Ext.isIE?"keydown":"keypress",this.handleKeyDown,this);var A=this.grid.view;A.on("refresh",this.onViewChange,this);A.on("rowupdated",this.onRowUpdated,this);A.on("beforerowremoved",this.clearSelections,this);A.on("beforerowsinserted",this.clearSelections,this);if(this.grid.isEditor){this.grid.on("beforeedit",this.beforeEdit,this)}},beforeEdit:function(A){this.select(A.row,A.column,false,true,A.record)},onRowUpdated:function(A,B,C){if(this.selection&&this.selection.record==C){A.onCellSelect(B,this.selection.cell[1])}},onViewChange:function(){this.clearSelections(true)},getSelectedCell:function(){return this.selection?this.selection.cell:null},clearSelections:function(B){var A=this.selection;if(A){if(B!==true){this.grid.view.onCellDeselect(A.cell[0],A.cell[1])}this.selection=null;this.fireEvent("selectionchange",this,null)}},hasSelection:function(){return this.selection?true:false},handleMouseDown:function(B,D,A,C){if(C.button!==0||this.isLocked()){return }this.select(D,A)},select:function(F,C,B,E,D){if(this.fireEvent("beforecellselect",this,F,C)!==false){this.clearSelections();D=D||this.grid.store.getAt(F);this.selection={record:D,cell:[F,C]};if(!B){var A=this.grid.getView();A.onCellSelect(F,C);if(E!==true){A.focusCell(F,C)}}this.fireEvent("cellselect",this,F,C);this.fireEvent("selectionchange",this,this.selection)}},isSelectable:function(C,B,A){return !A.isHidden(B)},handleKeyDown:function(F){if(!F.isNavKeyPress()){return }var E=this.grid,J=this.selection;if(!J){F.stopEvent();var I=E.walkCells(0,0,1,this.isSelectable,this);if(I){this.select(I[0],I[1])}return }var B=this;var H=function(M,K,L){return E.walkCells(M,K,L,B.isSelectable,B)};var C=F.getKey(),A=J.cell[0],G=J.cell[1];var D;switch(C){case F.TAB:if(F.shiftKey){D=H(A,G-1,-1)}else{D=H(A,G+1,1)}break;case F.DOWN:D=H(A+1,G,1);break;case F.UP:D=H(A-1,G,-1);break;case F.RIGHT:D=H(A,G+1,1);break;case F.LEFT:D=H(A,G-1,-1);break;case F.ENTER:if(E.isEditor&&!E.editing){E.startEditing(A,G);F.stopEvent();return }break}if(D){this.select(D[0],D[1]);F.stopEvent()}},acceptsNav:function(C,B,A){return !A.isHidden(B)&&A.isCellEditable(B,C)},onEditorKey:function(E,D){var B=D.getKey(),F,C=this.grid,A=C.activeEditor;if(B==D.TAB){if(D.shiftKey){F=C.walkCells(A.row,A.col-1,-1,this.acceptsNav,this)}else{F=C.walkCells(A.row,A.col+1,1,this.acceptsNav,this)}D.stopEvent()}else{if(B==D.ENTER){A.completeEdit();D.stopEvent()}else{if(B==D.ESC){D.stopEvent();A.cancelEdit()}}}if(F){C.startEditing(F[0],F[1])}}});
Ext.grid.EditorGridPanel=Ext.extend(Ext.grid.GridPanel,{clicksToEdit:2,isEditor:true,detectEdit:false,autoEncode:false,trackMouseOver:false,initComponent:function(){Ext.grid.EditorGridPanel.superclass.initComponent.call(this);if(!this.selModel){this.selModel=new Ext.grid.CellSelectionModel()}this.activeEditor=null;this.addEvents("beforeedit","afteredit","validateedit")},initEvents:function(){Ext.grid.EditorGridPanel.superclass.initEvents.call(this);this.on("bodyscroll",this.stopEditing,this,[true]);if(this.clicksToEdit==1){this.on("cellclick",this.onCellDblClick,this)}else{if(this.clicksToEdit=="auto"&&this.view.mainBody){this.view.mainBody.on("mousedown",this.onAutoEditClick,this)}this.on("celldblclick",this.onCellDblClick,this)}this.getGridEl().addClass("xedit-grid")},onCellDblClick:function(B,C,A){this.startEditing(C,A)},onAutoEditClick:function(C,B){if(C.button!==0){return }var E=this.view.findRowIndex(B);var A=this.view.findCellIndex(B);if(E!==false&&A!==false){this.stopEditing();if(this.selModel.getSelectedCell){var D=this.selModel.getSelectedCell();if(D&&D.cell[0]===E&&D.cell[1]===A){this.startEditing(E,A)}}else{if(this.selModel.isSelected(E)){this.startEditing(E,A)}}}},onEditComplete:function(B,D,A){this.editing=false;this.activeEditor=null;B.un("specialkey",this.selModel.onEditorKey,this.selModel);var C=B.record;var F=this.colModel.getDataIndex(B.col);D=this.postEditValue(D,A,C,F);if(String(D)!==String(A)){var E={grid:this,record:C,field:F,originalValue:A,value:D,row:B.row,column:B.col,cancel:false};if(this.fireEvent("validateedit",E)!==false&&!E.cancel){C.set(F,E.value);delete E.cancel;this.fireEvent("afteredit",E)}}this.view.focusCell(B.row,B.col)},startEditing:function(F,B){this.stopEditing();if(this.colModel.isCellEditable(B,F)){this.view.ensureVisible(F,B,true);var C=this.store.getAt(F);var E=this.colModel.getDataIndex(B);var D={grid:this,record:C,field:E,value:C.data[E],row:F,column:B,cancel:false};if(this.fireEvent("beforeedit",D)!==false&&!D.cancel){this.editing=true;var A=this.colModel.getCellEditor(B,F);if(!A.rendered){A.render(this.view.getEditorParent(A))}(function(){A.row=F;A.col=B;A.record=C;A.on("complete",this.onEditComplete,this,{single:true});A.on("specialkey",this.selModel.onEditorKey,this.selModel);this.activeEditor=A;var G=this.preEditValue(C,E);A.startEdit(this.view.getCell(F,B),G)}).defer(50,this)}}},preEditValue:function(A,B){return this.autoEncode&&typeof value=="string"?Ext.util.Format.htmlDecode(A.data[B]):A.data[B]},postEditValue:function(C,A,B,D){return this.autoEncode&&typeof C=="string"?Ext.util.Format.htmlEncode(C):C},stopEditing:function(A){if(this.activeEditor){this.activeEditor[A===true?"cancelEdit":"completeEdit"]()}this.activeEditor=null}});Ext.reg("editorgrid",Ext.grid.EditorGridPanel);
Ext.grid.GridEditor=function(B,A){Ext.grid.GridEditor.superclass.constructor.call(this,B,A);B.monitorTab=false};Ext.extend(Ext.grid.GridEditor,Ext.Editor,{alignment:"tl-tl",autoSize:"width",hideEl:false,cls:"x-small-editor x-grid-editor",shim:false,shadow:false});
Ext.grid.PropertyRecord=Ext.data.Record.create([{name:"name",type:"string"},"value"]);Ext.grid.PropertyStore=function(A,B){this.grid=A;this.store=new Ext.data.Store({recordType:Ext.grid.PropertyRecord});this.store.on("update",this.onUpdate,this);if(B){this.setSource(B)}Ext.grid.PropertyStore.superclass.constructor.call(this)};Ext.extend(Ext.grid.PropertyStore,Ext.util.Observable,{setSource:function(C){this.source=C;this.store.removeAll();var B=[];for(var A in C){if(this.isEditableValue(C[A])){B.push(new Ext.grid.PropertyRecord({name:A,value:C[A]},A))}}this.store.loadRecords({records:B},{},true)},onUpdate:function(E,A,D){if(D==Ext.data.Record.EDIT){var B=A.data["value"];var C=A.modified["value"];if(this.grid.fireEvent("beforepropertychange",this.source,A.id,B,C)!==false){this.source[A.id]=B;A.commit();this.grid.fireEvent("propertychange",this.source,A.id,B,C)}else{A.reject()}}},getProperty:function(A){return this.store.getAt(A)},isEditableValue:function(A){if(Ext.isDate(A)){return true}else{if(typeof A=="object"||typeof A=="function"){return false}}return true},setValue:function(B,A){this.source[B]=A;this.store.getById(B).set("value",A)},getSource:function(){return this.source}});Ext.grid.PropertyColumnModel=function(C,B){this.grid=C;var D=Ext.grid;D.PropertyColumnModel.superclass.constructor.call(this,[{header:this.nameText,width:50,sortable:true,dataIndex:"name",id:"name",menuDisabled:true},{header:this.valueText,width:50,resizable:false,dataIndex:"value",id:"value",menuDisabled:true}]);this.store=B;this.bselect=Ext.DomHelper.append(document.body,{tag:"select",cls:"x-grid-editor x-hide-display",children:[{tag:"option",value:"true",html:"true"},{tag:"option",value:"false",html:"false"}]});var E=Ext.form;var A=new E.Field({el:this.bselect,bselect:this.bselect,autoShow:true,getValue:function(){return this.bselect.value=="true"}});this.editors={"date":new D.GridEditor(new E.DateField({selectOnFocus:true})),"string":new D.GridEditor(new E.TextField({selectOnFocus:true})),"number":new D.GridEditor(new E.NumberField({selectOnFocus:true,style:"text-align:left;"})),"boolean":new D.GridEditor(A)};this.renderCellDelegate=this.renderCell.createDelegate(this);this.renderPropDelegate=this.renderProp.createDelegate(this)};Ext.extend(Ext.grid.PropertyColumnModel,Ext.grid.ColumnModel,{nameText:"Name",valueText:"Value",dateFormat:"m/j/Y",renderDate:function(A){return A.dateFormat(this.dateFormat)},renderBool:function(A){return A?"true":"false"},isCellEditable:function(A,B){return A==1},getRenderer:function(A){return A==1?this.renderCellDelegate:this.renderPropDelegate},renderProp:function(A){return this.getPropertyName(A)},renderCell:function(A){var B=A;if(Ext.isDate(A)){B=this.renderDate(A)}else{if(typeof A=="boolean"){B=this.renderBool(A)}}return Ext.util.Format.htmlEncode(B)},getPropertyName:function(B){var A=this.grid.propertyNames;return A&&A[B]?A[B]:B},getCellEditor:function(A,E){var B=this.store.getProperty(E);var D=B.data["name"],C=B.data["value"];if(this.grid.customEditors[D]){return this.grid.customEditors[D]}if(Ext.isDate(C)){return this.editors["date"]}else{if(typeof C=="number"){return this.editors["number"]}else{if(typeof C=="boolean"){return this.editors["boolean"]}else{return this.editors["string"]}}}}});Ext.grid.PropertyGrid=Ext.extend(Ext.grid.EditorGridPanel,{enableColumnMove:false,stripeRows:false,trackMouseOver:false,clicksToEdit:1,enableHdMenu:false,viewConfig:{forceFit:true},initComponent:function(){this.customEditors=this.customEditors||{};this.lastEditRow=null;var B=new Ext.grid.PropertyStore(this);this.propStore=B;var A=new Ext.grid.PropertyColumnModel(this,B);B.store.sort("name","ASC");this.addEvents("beforepropertychange","propertychange");this.cm=A;this.ds=B.store;Ext.grid.PropertyGrid.superclass.initComponent.call(this);this.selModel.on("beforecellselect",function(E,D,C){if(C===0){this.startEditing.defer(200,this,[D,1]);return false}},this)},onRender:function(){Ext.grid.PropertyGrid.superclass.onRender.apply(this,arguments);this.getGridEl().addClass("x-props-grid")},afterRender:function(){Ext.grid.PropertyGrid.superclass.afterRender.apply(this,arguments);if(this.source){this.setSource(this.source)}},setSource:function(A){this.propStore.setSource(A)},getSource:function(){return this.propStore.getSource()}});
Ext.grid.RowNumberer=function(A){Ext.apply(this,A);if(this.rowspan){this.renderer=this.renderer.createDelegate(this)}};Ext.grid.RowNumberer.prototype={header:"",width:23,sortable:false,fixed:true,menuDisabled:true,dataIndex:"",id:"numberer",rowspan:undefined,renderer:function(B,C,A,D){if(this.rowspan){C.cellAttr="rowspan=\""+this.rowspan+"\""}return D+1}};
Ext.grid.CheckboxSelectionModel=Ext.extend(Ext.grid.RowSelectionModel,{header:"<div class=\"x-grid3-hd-checker\">&#160;</div>",width:20,sortable:false,menuDisabled:true,fixed:true,dataIndex:"",id:"checker",initEvents:function(){Ext.grid.CheckboxSelectionModel.superclass.initEvents.call(this);this.grid.on("render",function(){var A=this.grid.getView();A.mainBody.on("mousedown",this.onMouseDown,this);Ext.fly(A.innerHd).on("mousedown",this.onHdMouseDown,this)},this)},onMouseDown:function(C,B){if(C.button===0&&B.className=="x-grid3-row-checker"){C.stopEvent();var D=C.getTarget(".x-grid3-row");if(D){var A=D.rowIndex;if(this.isSelected(A)){this.deselectRow(A)}else{this.selectRow(A,true)}}}},onHdMouseDown:function(C,A){if(A.className=="x-grid3-hd-checker"){C.stopEvent();var B=Ext.fly(A.parentNode);var D=B.hasClass("x-grid3-hd-checker-on");if(D){B.removeClass("x-grid3-hd-checker-on");this.clearSelections()}else{B.addClass("x-grid3-hd-checker-on");this.selectAll()}}},renderer:function(B,C,A){return"<div class=\"x-grid3-row-checker\">&#160;</div>"}});
Ext.LoadMask=function(C,B){this.el=Ext.get(C);Ext.apply(this,B);if(this.store){this.store.on("beforeload",this.onBeforeLoad,this);this.store.on("load",this.onLoad,this);this.store.on("loadexception",this.onLoad,this);this.removeMask=Ext.value(this.removeMask,false)}else{var A=this.el.getUpdater();A.showLoadIndicator=false;A.on("beforeupdate",this.onBeforeLoad,this);A.on("update",this.onLoad,this);A.on("failure",this.onLoad,this);this.removeMask=Ext.value(this.removeMask,true)}};Ext.LoadMask.prototype={msg:"Loading...",msgCls:"x-mask-loading",disabled:false,disable:function(){this.disabled=true},enable:function(){this.disabled=false},onLoad:function(){this.el.unmask(this.removeMask)},onBeforeLoad:function(){if(!this.disabled){this.el.mask(this.msg,this.msgCls)}},show:function(){this.onBeforeLoad()},hide:function(){this.onLoad()},destroy:function(){if(this.store){this.store.un("beforeload",this.onBeforeLoad,this);this.store.un("load",this.onLoad,this);this.store.un("loadexception",this.onLoad,this)}else{var A=this.el.getUpdater();A.un("beforeupdate",this.onBeforeLoad,this);A.un("update",this.onLoad,this);A.un("failure",this.onLoad,this)}}};
Ext.ProgressBar=Ext.extend(Ext.BoxComponent,{baseCls:"x-progress",waitTimer:null,initComponent:function(){Ext.ProgressBar.superclass.initComponent.call(this);this.addEvents("update")},onRender:function(D,A){Ext.ProgressBar.superclass.onRender.call(this,D,A);var C=new Ext.Template("<div class=\"{cls}-wrap\">","<div class=\"{cls}-inner\">","<div class=\"{cls}-bar\">","<div class=\"{cls}-text\">","<div>&#160;</div>","</div>","</div>","<div class=\"{cls}-text {cls}-text-back\">","<div>&#160;</div>","</div>","</div>","</div>");if(A){this.el=C.insertBefore(A,{cls:this.baseCls},true)}else{this.el=C.append(D,{cls:this.baseCls},true)}if(this.id){this.el.dom.id=this.id}var B=this.el.dom.firstChild;this.progressBar=Ext.get(B.firstChild);if(this.textEl){this.textEl=Ext.get(this.textEl);delete this.textTopEl}else{this.textTopEl=Ext.get(this.progressBar.dom.firstChild);var E=Ext.get(B.childNodes[1]);this.textTopEl.setStyle("z-index",99).addClass("x-hidden");this.textEl=new Ext.CompositeElement([this.textTopEl.dom.firstChild,E.dom.firstChild]);this.textEl.setWidth(B.offsetWidth)}if(this.value){this.updateProgress(this.value,this.text)}else{this.updateText(this.text)}this.setSize(this.width||"auto","auto");this.progressBar.setHeight(B.offsetHeight)},updateProgress:function(B,C){this.value=B||0;if(C){this.updateText(C)}var A=Math.floor(B*this.el.dom.firstChild.offsetWidth);this.progressBar.setWidth(A);if(this.textTopEl){this.textTopEl.removeClass("x-hidden").setWidth(A)}this.fireEvent("update",this,B,C);return this},wait:function(B){if(!this.waitTimer){var A=this;B=B||{};this.waitTimer=Ext.TaskMgr.start({run:function(C){var D=B.increment||10;this.updateProgress(((((C+D)%D)+1)*(100/D))*0.01)},interval:B.interval||1000,duration:B.duration,onStop:function(){if(B.fn){B.fn.apply(B.scope||this)}this.reset()},scope:A})}return this},isWaiting:function(){return this.waitTimer!=null},updateText:function(A){this.text=A||"&#160;";this.textEl.update(this.text);return this},setSize:function(A,C){Ext.ProgressBar.superclass.setSize.call(this,A,C);if(this.textTopEl){var B=this.el.dom.firstChild;this.textEl.setSize(B.offsetWidth,B.offsetHeight)}return this},reset:function(A){this.updateProgress(0);if(this.textTopEl){this.textTopEl.addClass("x-hidden")}if(this.waitTimer){this.waitTimer.onStop=null;Ext.TaskMgr.stop(this.waitTimer);this.waitTimer=null}if(A===true){this.hide()}return this}});Ext.reg("progress",Ext.ProgressBar);

if(!Repository) var Repository = {};
 
Repository.Templates = {
		login :  new Ext.XTemplate(		'<div id="oryx_repository_header" onmouseover="this.className = \'mouseover\'" onmouseout="this.className = \'\'">'+
					        '<!--a href="http://oryx-project.org" target="_blank"-->'+
						    '<!--img src="/backend/images/style/oryx.small.gif" id="oryx_repository_logo" alt="ORYX Logo" title="ORYX"/-->'+
					    '<!--/a-->'+
					    '<img src="/backend/images/style/db-logo.png" width="150px" height="30px" id="oryx_repository_logo" alt="dBLogo" title="dBlogo"/>'+
						'<tpl if="isPublicUser">'+
							'<form action="login" method="post" id="openid_login">'+
								'<div>'+
									'<span>'+
										'<img src="/backend/images/repository/hpi.png" onclick="Repository.Templates.login.changeOpenId(\'https://login.secureserver.net/?app=wbe\' , 39, 8)"/>'+
										'<img src="/backend/images/repository/blogger.png" onclick="Repository.Templates.login.changeOpenId(\'http://username.blogspot.com/\' , 7, 8)"/>'+
										'<img src="/backend/images/repository/getopenid.png" onclick="Repository.Templates.login.changeOpenId(\'http://getopenid.com/username\', 21, 8)"/>'+
									'</span>'+
									'<input type="text" name="openid_identifier" id="openid_login_openid" class="text gray" value={Repository.I18N.Repository.openIdSample} onblur="if(this.value.replace(/^\s+/, \'\').replace(/\s+$/, \'\').length==0) {this.value=Repository.I18N.Repository.openIdSample; this.className+=\' gray\';}" onfocus="this.className = this.className.replace(/ gray/ig, \'\'); if(this.value==Repository.I18N.Repository.openIdSample) this.value=\'\';" />'+
									'<input type="submit" class="button" value={Repository.I18N.Repository.login} />'+
								'</div>'+
							'</form>'+
						'</tpl>'+
						
						'<tpl if="!isPublicUser">'+
							'<form action="login?logout=true" method="post" id="openid_login">'+
								'<div>'+
									'<div style="display:inline;" class="login_name">{Repository.I18N.Repository.sayHello}, {currentUser}</div>'+
									'<input type="submit" class="button" value={Repository.I18N.Repository.logout} />'+
								'</div>'+
							'</form>'+
					
						'</tpl>'+
					
						'<div style="clear: both;"></div>'+
					'</div>', 
					{						
						changeOpenId: function(url, start, size){
							var o = document.getElementById('openid_login_openid');
							o.value = url;
							alert(url);
							o.focus();
							
							if (window.ActiveXObject) {
								try {
									var tr = o.createTextRange();
									tr.collapse(true);
									tr.moveStart('character', start);
									tr.moveEnd('character', size);
									tr.select();
								} 
								catch (e) {
								}
							}
							else {
								o.setSelectionRange(start, start + size);
							}
						}
					}), // end of login
		login2 : function () {
			tpl = new Ext.XTemplate('<div id="oryx_repository_header"> <tpl if="isPublicUser"> PUBLIC </tpl><tpl if="!isPublicUser">  NOT PUBLIC </tpl></div>');
			//tpl.compile;
			return tpl;
		}
}/***************************************
 * Copyright (c) 2008
 * Bjoern Wagner
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
****************************************/


var Clazz = function() {};
Clazz.prototype.construct = function() {};
Clazz.extend = function(def) {
    var classDef = function() {
        if (arguments[0] !== Clazz) { this.construct.apply(this, arguments); }
    };
    
    var proto = new this(Clazz);
    var superClass = this.prototype;
    
    for (var n in def) {
        var item = def[n];                        
        if (item instanceof Function) item.$ = superClass;
        proto[n] = item;
    }

    classDef.prototype = proto;
    
    //Give this new class the same static extend method    
    classDef.extend = this.extend;        
    return classDef;
};

/**
 * Copyright (c) 2008
 * Willi Tscheschner
 * 
 */

/**
 * Implementation of an OpenID Cropping-Tool
 * 
 * 
 */
if( !Repository ){ Repository = {} }
if( !Repository.Helper ){ Repository.Helper = {} }


Repository.Helper.CutOpenID = function( openid, width ){
	
	var OpenIDsRightTruncated = ['blogspot.com', 'verisignlabs.com']
	var cutTemplate = new Ext.Template('<span title="{openid}">{cuttedopenid}</span>');


	width 				= width || 30;
	var shouldCut 		= openid.length >= width;
	if( shouldCut ){
		var rightCut		= OpenIDsRightTruncated.some(function(val){ return openid.toLowerCase().include( val )})
		var cuttedOpenId 	= rightCut ? openid.slice( 0, width ) + "..." : "..."+ openid.slice( openid.length-width ); 		
	}
	
	return shouldCut ? cutTemplate.apply({openid:openid, cuttedopenid:cuttedOpenId}): openid ;
	
}

/**
 *  Defines all XML-Namespaces
 */

XMLNS = {
	ATOM:	"http://www.w3.org/2005/Atom",
	XHTML:	"http://www.w3.org/1999/xhtml",
	ERDF:	"http://purl.org/NET/erdf/profile",
	RDFS:	"http://www.w3.org/2000/01/rdf-schema#",
	RDF:	"http://www.w3.org/1999/02/22-rdf-syntax-ns#",
	RAZIEL: "http://b3mn.org/Raziel",

	SCHEMA: ""
};

if( !Repository ){ Repository = {} }
if( !Repository.Config ){ Repository.Config = {} }

Repository.Config.BACKEND_PATH		= '/backend/poem';
Repository.Config.STENCILSET_URI	= "/oryx/stencilsets/stencilsets.json"
Repository.Config.PATH 				= '/backend/repository2/'
Repository.Config.PLUGIN_PATH 		= 'plugins/'
Repository.Config.PLUGIN_CONFIG 	= 'plugins.xml'


Repository.Config.SORT_DESC 		= 'desc'
Repository.Config.SORT_ASC 			= 'asc'

/**
 * Copyright (c) 2008
 * Willi Tscheschner
 * 
 */

/**
 * Implementation of a Star-Rating Component
 * 
 * 
 */
Ext.Rating = Ext.extend(Ext.BoxComponent, {

	// Defines the max score value
	maxScore			: 5,

	// Defines the min score value
	minScore			: 1,
	
	// Defines both imgs
	scoreImgEnabled		: '../images/silk/star.png',
	scoreImgDisabled	: '../images/silk/star_gray.png',
	
	imgStyle			: 'width:12px;margin:2px;',
	imgEditStyle		: 'cursor:pointer;',
	textStyle			: 'margin-left:5px;position:relative;top:-4px;',
	
	// Defines a disabled img
	disabledImg			: '../images/silk/bullet_black.png',	

	value				: 0,
	
	text				: '',
	
	stars				: [],
	
	editable			: false,
	
	_setStyle: function(node, style){
		if( Ext.isIE ){
			node.style.setAttribute('cssText', style );	
		} else {
			node.setAttribute('style', style );	
		}
	},
	
    // private
    onRender : function(ct, position){
        if(!this.el){
            this.el = document.createElement('div');
            this.el.id = this.getId();
			
			this.stars = [];
			for (var i = this.minScore; i <= this.maxScore; i++){
				var img = document.createElement('img')
				
				if( this.editable ){
					Element.observe( img, 'mouseover', this.onMouseOverStar.bind(this), true);
					Element.observe( img, 'mouseout', this.onMouseOutStar.bind(this), true);
					Element.observe( img, 'click', this.onClickStar.bind(this), true);	
					this._setStyle( img, this.imgStyle + '' + this.imgEditStyle );			
				} else {
					this._setStyle( img, this.imgStyle );					
				}
				this.stars.push( img );
			}
			
			// Add all the imgs
			this.stars.each(function(star){
				this.el.appendChild( star );
			}.bind(this))
			
			// Add a text behind
			this.textEl = document.createElement('span');
			this._setStyle( this.textEl, this.textStyle );	
			this.textEl.innerHTML = this.text;
			this.el.appendChild( this.textEl );
					
			if(this.forId){
                this.el.setAttribute('htmlFor', this.forId);
            }
        }

		// Set the imgs
		this.setStars();

		if( ct )
       		Ext.Rating.superclass.onRender.call(this, ct, position);
    },
	
	setStars: function( value ){
						
		if( !value ){
			value = this.value;
		}

		var isDisabled = this.disabled || value <= 0;
				
		this.stars.each(function(star, index){
			
			var pos = index + this.minScore;
			
			var isBelowScore = pos <= (value+0.5);
			var imgScr 	= isBelowScore 	? this.scoreImgEnabled 	: this.scoreImgDisabled;
			imgScr 		= isDisabled 	? this.disabledImg 		: imgScr ;
			
			star.setAttribute('src', 	imgScr);
			star.setAttribute('title', 	pos);
			
		}.bind(this));
	},
	
	onMouseOverStar: function(e){
		this.setStars( this.stars.indexOf( e.target ) + this.minScore )
	},

	onMouseOutStar: function(e){
		this.setStars()
	},
	
	onClickStar: function(e){
		var index = this.stars.indexOf( e.target ) + this.minScore
		
		this.setValue( index );
		 
		if( this.changed instanceof Function ){
			this.changed( index )
		}
	},
			
    
    setValue: function(t){
        this.value = t;
		this.setStars();
    },
	    
    setText: function(t){
        this.text = t;
		
		if( this.textEl )
			this.textEl.innerHTML = t;
    },
	
	startEdit: function(){
		this._setStyle( this.el.dom, 'left:22px;position:absolute;top:2px;')
	},
	completeEdit: function(){
		
	},
	cancelEdit: function(){
		
	}
});

Ext.reg('rating', Ext.Rating);



/**
 * Implementation of an Ext-LinkButton
 * 
 * 
 */
Ext.LinkButton = Ext.extend(Ext.BoxComponent, {

	// On Click Handler
    click: null,
	
	// Image url 
    image: null,
	
	// Image style (only if an image url is setted) 
    imageStyle: null,

	toggle:false, 
	
	toggleStyle:null,

	selected:false,
	
	href:false,

	el: null, 
	
    // private
    onRender : function(ct, position){
				
        if( this.el == null ){	

            this.el = document.createElement('a');

            this.el.id = this.getId();

			
			if( !this.disabled )
            	this.el.href = this.href ? this.href : "#" + this.text;

            if( !this.disabled ){
                Element.observe( this.el, 'click', this.onClick.bind(this));
            }
	
			if( this.image ){
				this.el.innerHTML = '<img src="' + this.image + '" title="' + this.text + '"' + ( this.imageStyle ? ' style="' + this.imageStyle + '"/>': '/>')
			} else {
				this.el.innerHTML = this.text ? Ext.util.Format.htmlEncode(this.text) : (this.html || '');	
			}

            if(this.forId){
                this.el.setAttribute('htmlFor', this.forId);
            }

        }

        Ext.LinkButton.superclass.onRender.call(this, ct, position);

    },
	
	onClick: function(e){
		
		if( this.disabled ){ Event.stop(e); return; }
		
		// Toggle the button
		if( this.toggle ){
			this.selected = !this.selected;
			if( this.toggleStyle ){
				this._setStyle( this.el.dom, '')
				this.el.dom.setAttribute('style','')
				if( this.selected ){
					this.el.applyStyles( this.toggleStyle )
				} else {
					this.el.applyStyles( this.initialConfig.style )
				}
			}
		}

		
		if( this.click instanceof Function )
			this.click.apply(this.click, [this, e]); 
		 
		Event.stop(e)
	},
    
    setText: function(t, encode){
        this.text = t;
        if(this.rendered){
            this.el.dom.innerHTML = encode !== false ? Ext.util.Format.htmlEncode(t) : t;
        }
        return this;
    },
	
	_setStyle: function(node, style){
		if( Ext.isIE ){
			node.style.setAttribute('cssText', style );	
		} else {
			node.setAttribute('style', style );	
		}
	}
});

Ext.reg('linkbutton', Ext.LinkButton);


/********
 * Multi-Value ComboBox
 * 
 * 
 * */
/**
* @class Ext.form.ComboBoxMulti
* @extends Ext.form.ComboBox
* Adds freeform multiselect and duplicate entry prevention to the standard combobox
* @constructor
* Create a new ComboBoxMulti.
* @param {Object} config Configuration options
*/
Ext.form.ComboBoxMulti = function(config){
    /**
     * @cfg {String} sep is used to separate text entries
     */
    /**
     * @cfg {Boolean} preventDuplicates indicates whether repeated selections of the same option will generate extra entries
     */
		
    Ext.apply(config);
    
    // this option will interfere will expected operation
    this.typeAhead 		= false;
    // these options customize behavior
    this.minChars 		= 1;
	this.validationEvent = true;
    this.hideTrigger = true;
    this.defaultAutoCreate = {
        tag: config.renderAsTextArea ? "textarea" : "input",
        autocomplete: "off"
    };
    
    Ext.form.ComboBoxMulti.superclass.constructor.call(this, config);
	
};

Ext.form.ComboBoxMulti = Ext.extend(Ext.form.ComboBoxMulti, Ext.form.ComboBox, {
    
	// True to match any part not just the 
	// beginning of the filters autocomplete
	anyMatch: false,
	
	getPosition: function(){
        if (document.selection) { // IE
            var r = document.selection.createRange();
            var d = r.duplicate();
            d.moveToElementText(this.el.dom);
            d.setEndPoint('EndToEnd', r);
            return d.text.length;
        }
        else {
            return this.el.dom.selectionEnd;
        }
    },
    
    getActiveRange: function(){
        var s = this.sep;
        var p = this.getPosition();
        var v = this.getRawValue();
		var d = v.split( this.sep );
        var left = p;
        while (left > 0 && (v.charAt(left) != s  /* || v.slice(left+1).blank()*/)) {
            --left;
        }
        if (left > 0) {
            left++;
        }
        return {
            left: left,
            right: p
        };
    },
    
    getActiveEntry: function(){
        var r = this.getActiveRange();
        return this.getRawValue().substring(r.left, r.right).replace(/^\s+|\s+$/g, '');
    },
    
    replaceActiveEntry: function(value){
        var r = this.getActiveRange();
        var v = this.getRawValue();
        if (this.preventDuplicates && v.indexOf(value) >= 0) {
            return;
        }
        var pad = (this.sep == ' ' ? '' : ' '); 
        pad = (this.sep == "\n" ? '' : pad);	
		
        this.setValue(v.substring(0, r.left) + (r.left > 0 ? pad : '') + value + this.sep + pad + v.substring(r.right));
        var p = r.left + value.length + 2 + pad.length;
        this.selectText.defer(200, this, [p, p]);
    },
    
    onSelect: function(record, index){
        if (this.fireEvent('beforeselect', this, record, index) !== false) {
            var value = record.data[this.valueField || this.displayField];
            if (this.sep) {
                this.replaceActiveEntry(value);
            }
            else {
                this.setValue(value);
            }
            this.collapse();
            this.fireEvent('select', this, record, index);
        }
    },

    // private
    initEvents : function(){
        Ext.form.ComboBoxMulti.superclass.initEvents.call(this);
		
		this.keyNav.doRelay = function(foo, bar, hname){
                if(this.scope.isExpanded()){
                   return Ext.KeyNav.prototype.doRelay.apply(this, arguments);
                }
                return true;
            }
	},	    
    initQuery: function(){
        this.doQuery(this.sep ? this.getActiveEntry() : this.getRawValue());
    },

    selectText : function(start, end){
        var v = this.sep ? this.getActiveEntry() : this.getRawValue();
        if(v.length > 0){
            start = start === undefined ? this.getRawValue().indexOf(v) : start;
            end = end === undefined ? v.length : end;
            var d = this.el.dom;
            if(d.setSelectionRange){
                d.setSelectionRange(start, end);
            }else if(d.createTextRange){
                var range = d.createTextRange();
                range.moveStart("character", start);
                range.moveEnd("character", end-v.length);
                range.select();
            }
        }
    },
	
    // private
    onLoad : function(){
	
        if(!this.hasFocus){
            return;
        }
        if(this.store.getCount() > 0){
            this.expand();
            this.restrictHeight();
            if(this.lastQuery == this.allQuery){
                if(this.editable){
                    this.selectText()
                }
                if(!this.selectByValue(this.value, true)){
                    this.select(0, true);
                }
            }else{
                this.selectNext();
                if(this.typeAhead && this.lastKey != Ext.EventObject.BACKSPACE && this.lastKey != Ext.EventObject.DELETE){
                    this.taTask.delay(this.typeAheadDelay);
                }
            }
        }else{
            this.onEmptyResults();
        }
		
        //this.el.focus();
    },	

    /**
     * @cfg {Number} growMin The minimum height to allow when grow = true (defaults to 60)
     */
    growMin : 60,
    /**
     * @cfg {Number} growMax The maximum height to allow when grow = true (defaults to 1000)
     */
    growMax: 1000,
	
    // private
    onKeyUp : function(e){
        if(!e.isNavKeyPress() || e.getKey() == e.ENTER){          		
			Ext.form.ComboBoxMulti.superclass.onKeyUp.call(this, e);
			this.autoSize();
        }
    },

    doQuery : function(q, forceAll){
        if(q === undefined || q === null){
            q = '';
        }
        var qe = {
            query: q,
            forceAll: forceAll,
            combo: this,
            cancel:false
        };
        if(this.fireEvent('beforequery', qe)===false || qe.cancel){
            return false;
        }
        q = qe.query;
        forceAll = qe.forceAll;
        if(forceAll === true || (q.length >= this.minChars)){
            if(this.lastQuery !== q){
                this.lastQuery = q;
                if(this.mode == 'local'){
                    this.selectedIndex = -1;
                    if(forceAll){
                        this.store.clearFilter();
                    }else{
                        this.store.filter(this.displayField, q, this.anyMatch);
                    }
                    this.onLoad();
                }else{
                    this.store.baseParams[this.queryParam] = q;
                    this.store.load({
                        params: this.getParams(q)
                    });
                    this.expand();
                }
            }else{
                this.selectedIndex = -1;
                this.onLoad();
            }
        }
    },
	
    /**
     * Automatically grows the field to accomodate the height of the text up to the maximum field height allowed.
     * This only takes effect if grow = true, and fires the autosize event if the height changes.
     */
    autoSize : function(){
		
        if(!this.grow || this.defaultAutoCreate.tag !== "textarea" || !this.el ){
            return;
        }
		
		// Get the el and the value
        var el 	= this.el;
        var v 	= el.dom.value;
		
		// Get the line height (in IE the line-height is normal)
		var lineHeight = el.getStyle('line-height') == "normal" ? 14.4 : el.getStyle('line-height').replace("px", "");
		
		// Calc the new height
		var h 	= Number( lineHeight ) * (v.split("\n").length+1);
		h		-= 6;
		h		+= el.isScrollable() ? 20 : 0;
        h = Math.min(this.growMax, Math.max(h, this.growMin));
		
		// Set the height
        if(h != this.lastHeight){
            this.lastHeight = h;
            this.el.setHeight(h);
        }
    }	
});

Ext.reg('combomulti', Ext.form.ComboBoxMulti);/**
 * Copyright (c) 2008
 * Bj�rn Wagner, Sven Wagner-Boysen
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 **/

// set namespace

if(!Repository.Core) Repository.Core = {};

function EventHandler() {
	this._callbacks = new Array();
}

EventHandler.prototype = {
	registerCallback : function(callback) {
		if ( callback instanceof Function ) {
			this._callbacks.push(callback);
		}
	},
	
	unregisterCallback : function(callback) {
		// if callback exists
		if (this._callbacks.indexOf(callback) > -1) {
			this._callbacks[this._callbacks.indexOf(callback)] = null; // remove it
			this._callbacks = this._callbacks.compact(); // remove null item from array
		}
	},
	
	invoke : function(arg) {
		this._callbacks.each(function(callback) { 
			try {
				callback(arg);
			} catch(e) {
				// if the call fails do nothing but call remaining callbacks
			}});
	},
	
	invoke : function(arg1, arg2) {
		this._callbacks.each(function(callback) {callback(arg1, arg2);})
	}
}/**
 * Copyright (c) 2008
 * Bj�rn Wagner, Sven Wagner-Boysen
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 **/

// set namespace

if(!Repository) var Repository = {};
if(!Repository.Core) Repository.Core = {};

Repository.Core.DataCache = {
		
	oryxUrl : '/oryx',
	stencilsetUrl : '/stencilsets',

	construct : function() {
		
		// Stores data returned from /config handler
		this._configData = null;
		
		// Stores data returned from /user handler
		this._userData = null;
		
		// stores meta data of available modeltypes
		this._model_types = [];	
		// Stores cache type as key and the corresponding hash as value
		this._data = new Hash();
	
		
		this._addHandler 		= new EventHandler();
		this._updateHandler 	= new EventHandler();
		this._removeHandler 	= new EventHandler();
		this._userUpdateHandler = new EventHandler();
		
		this._busyHandler 		= { start: new EventHandler(), end:new EventHandler() };
		
		
		
	},
	
	
	getAddHandler 		: function() {return this._addHandler;},
	getUpdateHandler 	: function() {return this._updateHandler;},
	getRemoveHandler 	: function() {return this._removeHandler;},
	getBusyHandler 		: function() {return this._busyHandler;},
	getUserUpdateHandler : function() {return this._userUpdateHandler;},

	
	getDataAsync : function(fetchDataUri, ids, callback) {
		
		this._busyHandler.start.invoke();
		
		var modelIds = $A(ids); // Ensure that ids is an array
		var cacheMisses = []; // Stores ids of models that aren't cached
		if (this._data.get(fetchDataUri)) {
			// Check if all models 
			modelIds.each(function(modelId) {
				var data = this._data.get(fetchDataUri).get(modelId); // Read value from data hash
				// data isn't cached
				if (data == undefined) {
					cacheMisses.push(modelId);
				}				
			}.bind(this));
		} else {
			cacheMisses = modelIds.clone(); // load all if nothing was loaded before
			this._data.set(fetchDataUri, new Hash());
		}
		// All model data is cached, no server request necessary
		if (cacheMisses.length == 0) {
			result = new Hash();
			modelIds.each(function(id) {
				result.set(id, this._data.get(fetchDataUri).get(id));
			}.bind(this));
			
			if( callback )
				callback(result);
			
			this._busyHandler.end.invoke();
			return;
		}
		// Build query object
		var query = {};
		query.modelIds 		= modelIds;
		query.fetchDataUri 	= fetchDataUri;
		query.callback 		= callback;
		query.cacheMisses 	= cacheMisses;
		
		cacheMisses.each(function(modelId) {
			// Remove leading slash from model uri
			var requestUrl = modelId.substring(1) +  fetchDataUri 
			Ext.Ajax.request({url : requestUrl,  success : this.defaultReturnHandler.bind(this, query, modelId), failure:function(){/*console.log(arguments)*/}});
		}.bind(this));
		
		if( cacheMisses.length <= 0){
			this._busyHandler.end.invoke();
		}
	},
	
	updateObject : function(fetchDataUri, id, data, forceNotUpdate) {
		if (!this._data.get(fetchDataUri)) {
			this._data.set(fetchDataUri, new Hash())
		}
		this._data.get(fetchDataUri).set(id, data);
		if( !forceNotUpdate )
			this._updateHandler.invoke(id);
	},
	
	defaultReturnHandler : function(queryData, modelId, response, options) { 

		// Decode JSON
		var respText 		= response.responseText;
		var returnedData 	= respText.length > 0 ? Ext.util.JSON.decode(respText) : null;

		queryData.cacheMisses = queryData.cacheMisses.without( modelId );
		this.updateObject(queryData.fetchDataUri, modelId, returnedData, true); // Force update event only when at last request 

		// Everything returned from server
		if (queryData.cacheMisses.length == 0) {
			var queriedData = new Hash()
			
			queryData.modelIds.each(function (id){
				queriedData.set(id, this._data.get(queryData.fetchDataUri).get(id) ); // Write data to output hash
			}.bind(this));
			
			if( queryData.callback )
				queryData.callback(queriedData, response); 
			
			
			this._busyHandler.end.invoke();
		
		}
	},
	
	setData:  function( modelIds, uriSuffix, params, successHandler, raiseUserUpdateEvent ){
		this._sendRequest( modelIds, uriSuffix, 'post', params, successHandler, raiseUserUpdateEvent)
	}, 
	
	deleteData:  function( modelIds, uriSuffix, params, successHandler,  raiseUserUpdateEvent){
		this._sendRequest( modelIds, uriSuffix, 'delete', params, successHandler, raiseUserUpdateEvent)
	},	
	
	_sendRequest: function( modelIds, uriSuffix, method, params, successHandler, raiseUserUpdateEvent ){
		
		this._busyHandler.start.invoke();
		
		if( !(modelIds instanceof Array) ){
			modelIds = [ modelIds ]
		}

		uriSuffix = (uriSuffix.startsWith("/") ? uriSuffix : "/" + uriSuffix)	
		
		// Build query object
		var query = {};
		query.modelIds 		= modelIds;
		query.fetchDataUri 	= uriSuffix;
		query.callback 		= function(){
			
			this._updateHandler.invoke( modelIds );
			
			if( successHandler )
				successHandler.apply( successHandler , arguments)
				
			if( raiseUserUpdateEvent )
				this.updateUserData()
			
		}.bind(this);
						
		query.cacheMisses 	= modelIds;
		
		modelIds.each(function(modelId) {
			var requestUrl = modelId.substring(1) + uriSuffix;
			
			if( method.toLowerCase() == "get" || method.toLowerCase() == "delete" ){
				requestUrl += params ? "?" + $H(params).toQueryString() : "";
			}
			
			Ext.Ajax.request({
				    url		: requestUrl,
				    method	: method,
				    params	: params,
				    success	: this.defaultReturnHandler.bind(this, query, modelId),
					failure	: function(){
						Ext.Msg.alert('Oryx','Server communication failed!')
					}
				});
		
		}.bind(this));

		if( modelIds.length <= 0){
			this._busyHandler.end.invoke();
		}
	},
	
	getModelTypes : function() {
		// lazy loading
		if (!this._modelTypes) {
			
			this._busyHandler.start.invoke();
			
			new Ajax.Request( Repository.Config.STENCILSET_URI, 
			 {
				method: "get",
				asynchronous : false,
				onSuccess: function(transport) {
					this._modelTypes = transport.responseText.evalJSON();
					this._modelTypes.each(function(type) {
						type.iconUrl = this.oryxUrl + this.stencilsetUrl + type.icon_url;
						type.url = this.stencilsetUrl + type.uri
					}.bind(this));
					
					
					this._busyHandler.end.invoke();
			
				}.bind(this),
				onFailure: function() {
						alert("Fehler modelTypes");
						this._busyHandler.end.invoke();
					}.bind(this)
			});
		}
		return this._modelTypes;
	},
	
	/* The following functions handle the requests to the /config server handler
	 * 
	 */
	
	
	_ensureConfigData : function() {
		// lazy loading
		if (!this._configData) {
			
			this._busyHandler.start.invoke();
		
			new Ajax.Request("config", 
			 {
				method: "get",
				asynchronous : false,
				onSuccess: function(transport) {
					this._configData = transport.responseText.evalJSON();
					this._busyHandler.end.invoke();
				}.bind(this),
				onFailure: function() {
						alert("Error loading config data.")
						this._busyHandler.end.invoke();
					}.bind(this)
			});
		}
	},
	
	getAvailableLanguages : function() {
		this._ensureConfigData();
		return this._configData.availableLanguages;
	},
	
	getAvailableSorts : function() {
		this._ensureConfigData();
		return this._configData.availableSorts;
	},

	getAvailableExports : function() {
		this._ensureConfigData();
		return this._configData.availableExports;
	},
		
	/* The following functions handle the requests to the /user server handler
	 * 
	 */

	updateUserData: function(useCache){
		
		if( !useCache ){
			this._userData = null;
			this._ensureConfigData();
		}
		
		this._userUpdateHandler.invoke();
				
	},
		
	_ensureUserData : function() {
		// lazy loading
		if (!this._userData) {
			
			this._busyHandler.start.invoke();
			new Ajax.Request("user", 
			 {
				method: "get",
				asynchronous : false,
				onSuccess: function(transport) {
					this._userData = transport.responseText.evalJSON();
					this._busyHandler.end.invoke();
				}.bind(this),
				onFailure: function() {
						alert("Error loading user data.")
						this._busyHandler.end.invoke();
					}.bind(this)
			});
		}
	},
	
	getUserTags : function() {
		this._ensureUserData();
		return this._userData.userTags;
	},
	
	getFriends : function() {
		this._ensureUserData();
		return this._userData.friends;
	},
	
	getLanguage : function() {
		this._ensureUserData();
		return this._userData.currentLanguage;
	},
	
	setLanguage : function(languagecode, countrycode) {
		
		
		this._busyHandler.start.invoke();
			
		new Ajax.Request("user", 
				 {
					method: "post",
					asynchronous : false,
					parameters : { 
						"languagecode" : languagecode,
						"countrycode" : countrycode
					},
					onSuccess: function(transport) {
						
						this._busyHandler.end.invoke();
						window.location.reload(); // reload repository to 
					}.bind(this),
					onFailure: function() {
						alert("Changing langauge failed!")
						this._busyHandler.end.invoke();
					}.bind(this)
				});
	},
	
	
	doRequest: function( url, successHandler, params,  method, asynchronous ){
		
		if(!url){
			return
		}
		
		// Set Busy
		this._busyHandler.start.invoke();
		
		// Define successcallback
		var callback = function(){
		
			this._busyHandler.end.invoke();
			
			if( successHandler )
				successHandler.apply( successHandler , arguments)
			
		}.bind(this);
		
		// Check URL
		method = method ? method : "get";
		if( method.toLowerCase() == "get" || method.toLowerCase() == "delete" ){
			url += params ? "?" + $H(params).toQueryString() : "";
			params = null;
		}				

		if( !asynchronous ){
			new Ajax.Request(url, 
				 {
					method			: "get",
					asynchronous 	: false,
					onSuccess		: callback,
					onFailure		: function(){
						Ext.Msg.alert('Oryx','Server communication failed!')
					},
					parameters 		: params
				});
		} else {
			// Send request	
			Ext.Ajax.request({
				    url		: url,
				    method	: method,
				    params	: params,
				    success	: callback,
					failure	: function(){
						Ext.Msg.alert('Oryx','Server communication failed!')
					}
				});			
		}

		

	}

	
	
};

Repository.Core.DataCache = Clazz.extend(Repository.Core.DataCache);

/**
 * Copyright (c) 2008
 * Bjoern Wagner, Sven Wagner-Boysen
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 **/

// init repository namespace

if(!Repository) var Repository = {};
if(!Repository.Core) Repository.Core = {};




Repository.Core.Repository = {
		
		initialized: false,
	
		construct : function() {

			arguments.callee.$.construct.apply(this, arguments); // call super class constructor
			this._currentUser = decodeURI( Repository.currentUser );
			this._publicUser = 'public';
			this._modelCache = new Repository.Core.DataCache();

			this._eventListeners = new Hash();
			
			this._initializeLoadEvent();
			/*var loadMask = this.showMask();
			
			// After 300 milsec after initialized, hide loading panel
			this.on('initialized', function(){ 
								
					window.setTimeout(function(){ this.hideMask(loadMask) }.bind(this), 200) 
				
				}.bind(this));*/
			
			// Event handler
			this._viewChangedHandler = new EventHandler();
			this._selectionChangedHandler = new EventHandler();
			this._filterChangedHandler = new EventHandler();
			
			// Plugin facade
			this._facade = null;
			
			// Model arrays
			this._filteredModels = new Array();
			this._selectedModels = new Array();
			this._displayedModels = new Array();
			
			this._filters = this.isPublicUser() ? new Hash() : new Hash({access:'owner,read,write'});

			this._currentSort = this.isPublicUser() ? "rating" : "lastChange";
			this._currentSortDirection = null;
			// UI
			this._controls = new Object();
			
			this._plugins = [];
			this._views = new Hash();
			this._currentView = "";				
			
			this._bootstrapUI();
					
			// Loads all required plugins which 
			// are specified in the plugins.xml
			this._loadPlugins();
			
			// Apply Filter and Refresh
			this.setSort( this._currentSort , Repository.Config.SORT_DESC);
			
			
 		},
		
		_initializeLoadEvent: function(){
			
			var bh = this._modelCache.getBusyHandler();
			
			var startCount = 0;
			var timer;
			var nothingTimer;
			
			
			var increase 	= function(){ clearTimer();if(nothingTimer){ window.clearTimeout(nothingTimer); nothingTimer = null} startCount++; };
			var decrease 	= function(){ startCount--; finished() }.bind(this);
			var clearTimer 	= function(){ if(timer){ startCount--; window.clearTimeout(timer);timer=null;} }.bind(this);
			var finished 	= function(){ 
				if( startCount > 0 || this.initialized ){ return }
				bh.start.unregisterCallback(increase)
				bh.end.unregisterCallback(decrease)
				this.initialized = true;
				this.raise('initialized') 
			}.bind(this)
			
			// For each start while loading time, raise the count
			bh.start.registerCallback( increase )
			// For each finishing while loading time, remove a count, and if complete finished, raise event
			bh.end.registerCallback( function(){ clearTimer(); timer = window.setTimeout(decrease, 250) }.bind(this) )	


			nothingTimer = window.setTimeout( finished.bind(this), 200 );
						
		},
		
	
		/**
		 * Implementation of an event listener
		 * @param {Object} event
		 * @param {Object} fn
		 */
		on: function(event, fn){
			if( !(fn instanceof Function &&  typeof event == "string") ){ return }
			
			if( !this._eventListeners.get( event )){
				this._eventListeners.set( event, [])
			}
			
			this._eventListeners.get( event ).push( fn )			
		},
		
		/**
		 * Raises the event and call every listener
		 * @param {Object} event
		 */
		raise: function(event){
			if( !(typeof event == "string" && this._eventListeners.get( event )) ){ return }
						
			this._eventListeners.get( event ).each(function(fn){
				fn.apply(fn)
			})			
		},
		
		
		showMask: function() {
			
			var loadMask = new Ext.LoadMask(Ext.getBody(), {
                        msg: Repository.I18N.Repository.loadingText
                    });
           	loadMask.show();
			loadMask.el._mask.applyStyles('background-color:#FFFFFF;opacity:1.0;')
			
			return loadMask;
		},
		
		hideMask: function( mask ){
			var duration = 0.5;

			// Fade out the background
			mask.el._mask.fadeOut({
									duration	: duration, 
									useDisplay	: true, 
									easing		: 'easeOut',
									callback	: function(){ mask.hide() }
								})		
								
			
			//Fade out the message
			mask.el._maskMsg.fadeOut({
									duration	: duration, 
									useDisplay	: true
								})										
		},
		
		getFacade : function() {
			if (!this._facade) {
				this._facade = {
						
						// Event handler
						registerOnViewChanged 		: this._viewChangedHandler.registerCallback.bind(this._viewChangedHandler),
						registerOnSelectionChanged 	: this._selectionChangedHandler.registerCallback.bind(this._selectionChangedHandler),
						registerOnFilterChanged 	: this._filterChangedHandler.registerCallback.bind(this._filterChangedHandler),
						
						modelCache 			: this._modelCache,
						
						isPublicUser 		: this.isPublicUser.bind(this),
						getCurrentUser		: this.getCurrentUser.bind(this),
						setSort				: this.setSort.bind(this),
						getSort				: this.getSort.bind(this),
						
						updateView			: this.updateView.bind(this),
						 
						applyFilter 		: this.applyFilter.bind(this),
						removeFilter 		: this.removeFilter.bind(this),
						getFilter			: this.getFilter.bind(this),
						getFilteredModels 	: this.getFilteredModels.bind(this),
						
						changeSelection 	: this.changeSelection.bind(this),
						getSelectedModels 	: this.getSelectedModels.bind(this),
						
						getDisplayedModels	: this.getDisplayedModels.bind(this),						
						setDisplayedModels	: this.setDisplayedModels.bind(this),
						
						getCurrentView 		: this.getCurrentView.bind(this),
						
						createNewModel		: this.createNewModel.bind(this),
						openModelInEditor 	: this.openModelInEditor.bind(this),
						
						registerPlugin: this.registerPlugin.bind(this)
				};
			}
			return this._facade;
		},
		
		updateView: function(){
			this._viewChangedHandler.invoke( this.getDisplayedModels() )	
		},
		
		isPublicUser: function() {
			return this._currentUser == this._publicUser;
		},

		getCurrentUser: function() {
			return this._currentUser;
		},
				
		setSort : function(sort, direction) {
			this._currentSort 			= sort;
			this._currentSortDirection	= direction ? direction : Repository.Config.SORT_DESC;
			this.applyFilter();
		},
		
		getSort : function() {
			return this._currentSort;
		},
		
		applyFilter : function(name, parameters) {
			if (name) this._filters.set(name, parameters);
			var params = this._filters.clone();
			if (this._currentSort) {
				params.set('sort', this._currentSort);
			}
			
			this._modelCache.doRequest("filter", function(transport) {
														this._filteredModels = eval(transport.responseText);
														if( this._currentSortDirection == Repository.Config.SORT_ASC)
															this._filteredModels.reverse()
															
														this._filterChangedHandler.invoke(this._filteredModels);
													}.bind(this), params, 'get', false )

		},
		
		removeFilter : function(name) {
			if (this._filters.get(name) != undefined) {
				this._filters.unset(name);
				this.updateFilteredIds();
			}
		},

		getFilter : function() {
			return this._filters;
		},
				
		getFilteredModels : function(){
			return this._filteredModels;
		},		
		
		getViews : function(){
			return this._views;
		},

		getCurrentView : function(){
			return this._currentView;
		},
				
		_switchView : function(view) {
			if(this._currentView instanceof Repository.Core.ViewPlugin)
				this._currentView.disable();

			// Get the current index of displayed models
			var currentDisplayedIndex 	= this._currentView.lastStartIndexOfDisplayedModel || 0;
			// Get the current selection index within the displayed models
			var currentSelectedIndex 	= this.getSelectedModels().length > 0 ? this.getDisplayedModels().indexOf(this.getSelectedModels()[0]) : 0;
			
			this._currentView = view;			
			this._currentView.enable();
			
			var newIndex = currentDisplayedIndex + currentSelectedIndex ;
			var size	 = view.numOfDisplayedModels;			
			
			this._currentView.showDisplayedModelsStartingFrom( newIndex-(newIndex%size) );
			//view.preRender(this.getDisplayedModels());

		},
		
		changeSelection : function(selectedIds) {
			selArray =  $A(selectedIds); // Make sure that it's an array
			if (selArray.length > 1) {
				selArray = selArray.reduce(); // remove double entries
			}
			this._selectedModels = selArray;
			this._selectionChangedHandler.invoke(selArray);
		},
		
		getSelectedModels : function() {
			return this._selectedModels;
		},
		
		getDisplayedModels : function() {
			return this._displayedModels;
		},
		
		setDisplayedModels : function(modelIds) {
			displArray =  $A(modelIds); // Make sure that it's an array
			if (displArray.length > 1) {
				displArray = displArray.reduce(); // remove double entries
			}
			this._displayedModels = displArray;
			
			this._viewChangedHandler.invoke( displArray )
		},
		
		createNewModel : function(stencilsetUrl, profileName) {
			
			var callback = function() {
				
				var url = './new';
				if(stencilsetUrl && profileName)
					url+= '?stencilset=' + stencilsetUrl +"&profile="+profileName;
				if(!stencilsetUrl && profileName)
					url+= '?profile=' + profileName;
				if(stencilsetUrl && !profileName)
					url+= '?stencilset=' + stencilsetUrl;
				
				var editor = window.open(url);
				
				window.setTimeout(function(){
					if (!editor || !editor.opener || editor.closed) {
						Ext.MessageBox.alert(Repository.I18N.Repository.windowTitle, Repository.I18N.Repository.windowTimeoutMessage).setIcon(Ext.MessageBox.QUESTION)
					}
				}, 5000);
			}
		
			if(this.isPublicUser()){
				
				Ext.MessageBox.buttonText.yes 	= Repository.I18N.Repository.yes;
				Ext.MessageBox.buttonText.no 	= Repository.I18N.Repository.no;
				
				Ext.Msg.show({
				   title	: Repository.I18N.Repository.noSaveTitle,
				   msg		: Repository.I18N.Repository.noSaveMessage,
				   buttons	: Ext.Msg.YESNO,
				   fn		: function(btn, text){
							   		if(btn == "yes"){
										callback();
									}
							   }
				});
						
			} else {
				callback();
			}
		},
		
		/**
		 * opens model with "model_id" in editor
		 * @param {Object} model_id
		 */
		openModelInEditor : function (model_id) {

			var uri	= model_id.slice(1) + "/self";
			
			// Open the model in a new window
			var editor = window.open( uri );
			window.setTimeout(
                        function() {
                                if(!editor || !editor.opener || editor.closed) {
                                        Ext.MessageBox.alert(Repository.I18N.Repository.windowTitle, Repository.I18N.Repository.windowTimeoutMessage).setIcon(Ext.MessageBox.QUESTION)
                                }
                        }, 5000);			
		},
		
		/**
		 * register plugin on panel for this plugin type and returns a panel, where the plugin can render itselfs. 
		 * @param {Object} plugin
		 */
		registerPlugin: function(plugin) {
			
			var pluginPanel
			
			if( plugin.viewRegion == "view" ) { 
				pluginPanel = this._registerPluginOnView(plugin, "view");
			} else {
				pluginPanel = this._registerPluginOnPanel(plugin.name, plugin.viewRegion);
			}
			
			if( plugin.toolbarButtons )
				plugin.toolbarButtons.each(function(button) {
					this._registerButtonOnToolbar(button);
				}.bind(this));
			
			return pluginPanel;
		},
		
		_registerPluginOnPanel : function(pluginName, panelName) {
			panel = this._controls[panelName + 'Panel'];
			if (!panel) return null; // Panel doesn't exist
			var pluginPanel = new Ext.Panel({
				pluginName 	: pluginName,
                title		: pluginName,
                collapsible	: true,
                collapsed	: false,
				border		: false,
                split 		: true,
				layout		: 'anchor'
				
			});
			pluginPanel = panel.add(pluginPanel);
			panel.doLayout(); // Force rendering to display image and generate body
			return pluginPanel;
		},
		
		_registerButtonOnToolbar : function(buttonConfig) {
					
			if (buttonConfig) {
				if ( buttonConfig instanceof Ext.Toolbar.Button || (buttonConfig.text != undefined) && (typeof(buttonConfig.handler) == "function")) {
					
					var menu = null;
										
					// Depending on if there is already a spacer, add the following element befor or behind this
					var spacer 		= this._controls.toolbar.items.find(function(item){ return item instanceof Ext.Toolbar.Spacer})
					var indexSpacer	= spacer ? this._controls.toolbar.items.indexOf(spacer) : null;
					var region		= buttonConfig.region && buttonConfig.region.toLowerCase() == "right" ? "right" : "left";
					
					if( !indexSpacer && region == "right" ){
						this._controls.toolbar.addFill();
						indexSpacer =  this._controls.toolbar.items.length-1;
					}
				

					// if the button should be added to a sub menu try to find it and create it if it isn't there
					if (buttonConfig.menu != undefined) {
					

						this._controls.toolbar.items.each(function(item) {
							if ((item.text == buttonConfig.menu) && (item.menu != undefined)) {
								menu = item.menu;
							}
						});
						
						// If no menu exists
						if (menu == null) {
							
							menu = new Ext.menu.Menu({items : []});
							
							// Insert the button to the particular place
							//this._controls.toolbar.insertButton(
									//indexSpacer ? (region == "right" ? indexSpacer+1 : indexSpacer-1) : this._controls.toolbar.items.length,
							// TODO: Add at the particular place --> Like it was the IE raises Errors
							this._controls.toolbar.add(
									{
										//id : buttonConfig.menu,
										iconCls: 'some_class_that_does_not_exist_but_fixes-rendering repository_ext_btn_align_center', // do not remove!
										text : buttonConfig.menu, 
										menu : menu,
										icon : buttonConfig.menuIcon,
										tooltip: {
											text: buttonConfig.tooltipText,
	                                        autoHide: true
	                                    }
									});
							
							menu.render();
						}
						
						if( !buttonConfig.iconCls ){
							buttonConfig.iconCls = 'repository_ext_icon_align_center';
						}

						menu.addMenuItem( buttonConfig );
						
					} else if( buttonConfig instanceof Ext.Toolbar.Button){

							// Insert the button to the particular place
							this._controls.toolbar.insertButton(
									indexSpacer ? (region == "right" ? indexSpacer+1 : indexSpacer-1) : this._controls.toolbar.items.length,
									buttonConfig
							);
							
					} else {
						
							// Insert the button to the particular place
							this._controls.toolbar.insertButton(
									indexSpacer ? (region == "right" ? indexSpacer+1 : indexSpacer-1) : this._controls.toolbar.items.length,
									
									new Ext.Toolbar.Button({
										text : buttonConfig.text,
										handler : buttonConfig.handler,
										iconCls: 'some_class_that_does_not_exist_but_fixes-rendering', // do not remove!
										icon : buttonConfig.icon
									})
							);
					}
					
				}
			}
			
		},
		
		_registerPluginOnView : function(plugin) {
			// TODO: check if all values are passed and check whether the plugin already exists
			
			this._registerButtonOnToolbar({
				text : plugin.name, 
				icon : plugin.icon, 
				tooltipText : Repository.I18N.Repository.viewMenuTooltip,
				menu : Repository.I18N.Repository.viewMenu, 
				menuIcon : '/backend/images/silk/application.png',
				handler : function() {this._switchView(plugin)}.bind(this)
			});
			
			return this._registerPluginOnPanel( null, 'view' );
		},
		
		_loadPlugins : function() {
			
			var source = Repository.Config.PATH + Repository.Config.PLUGIN_PATH	+ Repository.Config.PLUGIN_CONFIG
	
			this._modelCache.doRequest(		source, 
											function(result){
												
													// get plugins.xml content
													var resultXml = result.responseXML;
													
													// Get all source names
													//var files = $A(resultXml.getElementsByTagName("plugin")).map(function(p){ return p.getAttribute('source') }).compact()
													//this._intializePluginFiles( files );
													
													// Get all plugin names
													var names = $A(resultXml.getElementsByTagName("plugin")).map(function(p){ return p.getAttribute('name') }).compact()
													window.setTimeout(this._initializePlugins.bind(this, names), 200);
													 					
												}.bind(this),
											null, 'get', false);
			
		},
		
		_initializePlugins: function( names ){
			 
			names.each(function( name ){
				
				// Try to initialize a new plugin-class
				try {
					var className 	= eval( name )
					var plugin 		= new className( this.getFacade() )
					this._plugins.push( plugin )
					
				} catch(e){
					// TODO: Error Handling
				}
			}.bind(this));
			
			// Find a view plugin and switch to the first one
			var firstView = this._plugins.find(function(plugin){ return plugin instanceof Repository.Core.ViewPlugin })
			if( firstView ){
				this._switchView( firstView );
			}

			this._viewChangedHandler.invoke( this._displayedModels );
			this._selectionChangedHandler.invoke( this._selectedModels );
			
			// HACK
			// Added a unvisible last child so that every view gets displayed
			this._controls.viewPanel.add( {xtype:'label'} )
			this._controls.viewPanel.doLayout();
			
		}, 
		
		_intializePluginFiles: function( files ){

			var prefixURL = Repository.Config.PATH + Repository.Config.PLUGIN_PATH;

			files.each(function(file){

				// prepare a script tag and place it in html head.
				/*var head = document.getElementsByTagName('head')[0];
				var s = document.createElementNS(XMLNS.XHTML, "script");
				s.setAttributeNS(XMLNS.XHTML, 'type', 'text/javascript');
			   	s.src = prefixURL + file;
		
			   	head.appendChild(s);	*/			
							
			});
			
		},
		
		/* This functions defines and initialize the basic UI components
		 * 
		 */
		_bootstrapUI : function() {
			
			Ext.QuickTips.init();
			
			test_tpl = new Ext.XTemplate('<div id="oryx_repository_header"> <tpl if="isPublicUser"> PUBLIC </tpl><tpl if="!isPublicUser">  NOT PUBLIC </tpl></div>');
			
			// View panel
			this._controls.viewPanel = new Ext.Panel({ 
                region		: 'center',
				autoScroll	: true,
				border		: false
            });
			// Left panel
			this._controls.leftPanel = new Ext.Panel({ 
                region		: 'west',
                title		: Repository.I18N.Repository.leftPanelTitle,
                collapsible	: true,
                collapsed	: false,
                split 		: true,	
				width		: 200,
				autoScroll	: true			            		
            });
			// Right panel
			this._controls.rightPanel = new Ext.Panel({ 
                region		: 'east',
                title		: Repository.I18N.Repository.rightPanelTitle,
                collapsible	: true,
                collapsed	: false,
                split 		: true,
				width		: 210,
				autoScroll	: true		            		
            });			
			// Bottom panel
			this._controls.bottomPanel = new Ext.Panel({ 
                region		: 'south',
                //title: Repository.I18N.Repository.bottomPanelTitle,
                collapsible	: true,
				height		: 40,
				border		: false
				//titleCollapse: true,
                //collapsed: true,            		
            });
			// Toolbar
			this._controls.toolbar = new Ext.Toolbar({
				region 		: "south",
				items 		: []
			});
			
			
			// center panel, contains view panel and bottom panel
			this._controls.centerPanel = new Ext.Panel({
				region 		: 'center',
				layout		: 'border',
				items 		: [this._controls.viewPanel, this._controls.bottomPanel]
			});
			
			this._viewport = new Ext.Viewport({
					layout		: 'border',
					margins 	: '0 0 0 0',
					defaults	: {}, // default config for all child widgets
					items		: [ 
							        new Ext.Panel({ // Header panel for login and toolbar
										region : 'north',
										height : 60,
										margins : '0 0 0 0',
										border : true,
										items :[{ // Header with logo and login
									                region: 'north',
									                html: Repository.Templates.login.apply({currentUser : this._currentUser, isPublicUser : this._currentUser=='public'}),
									                height: 30
									           },
									           this._controls.toolbar
									    ] // Toolbar
									}), // Panel 
									this._controls.centerPanel,
						            this._controls.leftPanel,	
								    this._controls.rightPanel
							       ]});
						
			
			this._viewport.doLayout();	
										   
				
		}
};

Repository.Core.Repository = Clazz.extend(Repository.Core.Repository);


/**
 * graft() function
 * Originally by Sean M. Burke from interglacial.com, altered for usage with
 * SVG and namespace (xmlns) support. Be sure you understand xmlns before
 * using this funtion, as it creates all grafted elements in the xmlns
 * provided by you and all element's attribures in default xmlns. If you
 * need to graft elements in a certain xmlns and wish to assign attributes
 * in both that and another xmlns, you will need to do stepwise grafting,
 * adding non-default attributes yourself or you'll have to enhance this
 * function. Latter, I would appreciate: martin�apfelfabrik.de
 * @param {Object} namespace The namespace in which
 * 					elements should be grafted.
 * @param {Object} parent The element that should contain the grafted
 * 					structure after the function returned.
 * @param {Object} t the crafting structure.
 * @param {Object} doc the document in which grafting is performed.
 */
Repository.Core.graft = function(namespace, parent, t, doc) {

    doc = (doc || (parent && parent.ownerDocument) || document);
    var e;
    if(t === undefined) {
        throw "Can't graft an undefined value";
    } else if(t.constructor == String) {
        e = doc.createTextNode( t );
    } else {
        for(var i = 0; i < t.length; i++) {
            if( i === 0 && t[i].constructor == String ) {
                var snared;
                snared = t[i].match( /^([a-z][a-z0-9]*)\.([^\s\.]+)$/i );
                if( snared ) {
                    e = doc.createElementNS(namespace, snared[1] );
                    e.setAttributeNS(null, 'class', snared[2] );
                    continue;
                }
                snared = t[i].match( /^([a-z][a-z0-9]*)$/i );
                if( snared ) {
                    e = doc.createElementNS(namespace, snared[1] );  // but no class
                    continue;
                }

                // Otherwise:
                e = doc.createElementNS(namespace, "span" );
                e.setAttribute(null, "class", "namelessFromLOL" );
            }

            if( t[i] === undefined ) {
                throw "Can't graft an undefined value in a list!";
            } else if( t[i].constructor == String || t[i].constructor == Array ) {
                this.graft(namespace, e, t[i], doc );
            } else if(  t[i].constructor == Number ) {
                this.graft(namespace, e, t[i].toString(), doc );
            } else if(  t[i].constructor == Object ) {
                // hash's properties => element's attributes
                for(var k in t[i]) { e.setAttributeNS(null, k, t[i][k] ); }
            } else {

			}
        }
    }
	if(parent) {
	    parent.appendChild( e );
	} else {

	}
    return e; // return the topmost created node
};

Ext.onReady(function(){new Repository.Core.Repository();});/**
 * Copyright (c) 2008
 * Bj�rn Wagner, Sven Wagner-Boysen
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 **/

/**
 * SuperClass for all Plugins.
 * @param {Object} facade
 */

// define namespace
if(!Repository) var Repository = {};
if(!Repository.Core) Repository.Core = {};

Repository.Core.Plugin = {
	
	panel 		: null,
	
	modelTypes 	: null, 
	
	viewRegion 	: "left",
	
	name		: null,
	
	dataUris	: [],
	
	hidePanel	: false,
	
	/**
	 * 
	 */
	construct: function(facade) {
		arguments.callee.$.construct.apply(this, arguments);
		this.facade = facade;
		
		if(!this.toolbarButtons) this.toolbarButtons = [];
		
		this.panel = this.facade.registerPlugin(this);
		
		if( this.hidePanel && this.panel){
			this.panel.hide();
		}
	},
	preRender: function(modelIds) {
		if( this.dataUris.length <= 0 ){
			var o = $H();
			modelIds.each(function(el){ o.set( el, null)})
			this.render( o )
		} else if( modelIds.length <= 0) {
			this.render( $H() )
		} else {
			this.facade.modelCache.getDataAsync(this.dataUris, modelIds, this.render.bind(this))	
		}
	},
	render: function(modelData) {
		
	},
	
	deletePanelItems: function( panel ){
		
		if( !panel )
			panel = this.panel;
			
		if( panel && panel.items ){
			panel.items.each(function(item){ panel.remove( item ) }.bind(this));
		}
			
	}

};


Repository.Core.Plugin = Clazz.extend(Repository.Core.Plugin);
/***************************************
 * Copyright (c) 2008
 * Bjoern Wagner
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
****************************************/

if(!Repository.Core) Repository.Core = {};

Repository.Core.ViewPlugin = {
	
	
		viewRegion : "view",
		
		numOfDisplayedModels : 10,
		
		icon : "/backend/images/silk/lightbulb.png",
		
		construct : function(facade) {
			arguments.callee.$.construct.apply(this, arguments); // call superclass constructor
			
			this.parentPanel = this.panel;
			this.panel = new Ext.Panel({border: false, autoScroll: true, region: 'center'});
			this.parentPanel.add(this.panel);
			
			this.enabled = false;
			this.lastStartIndexOfDisplayedModel = 0; // index of last displayed model in filteredModels array
	
			this.facade.registerOnFilterChanged(this.filterChanged.bind(this));
			this.facade.registerOnViewChanged(this.viewChanged.bind(this));
			this.facade.registerOnSelectionChanged(this.selectionChanged.bind(this));
		},
		
		showNextDisplayedModels : function() {			
			this.showDisplayedModelsStartingFrom( this.lastStartIndexOfDisplayedModel + this.numOfDisplayedModels);
		},

		showPreviousDisplayedModels : function() {			
			this.showDisplayedModelsStartingFrom( this.lastStartIndexOfDisplayedModel - this.numOfDisplayedModels);
		},
		
		showDisplayedModelsStartingFrom: function( index ){

			var filteredModels 	= this.facade.getFilteredModels();
			var startIndex 	= Math.max( Math.min( index , filteredModels.length-1 ) , 0 );
			var endIndex 	= Math.max( Math.min( startIndex+this.numOfDisplayedModels, filteredModels.length ) , 0 );
			
			var newDisplayedModels = [];
			
			for(var i = startIndex; i < endIndex; i++ )
				newDisplayedModels.push(filteredModels[i]);
				
			this.lastStartIndexOfDisplayedModel = startIndex;
			this.facade.setDisplayedModels( newDisplayedModels );	
			
			
			// Reset the selection
			var ds = this.facade.getSelectedModels();
			var dd = this.facade.getDisplayedModels();
			
			var newSelection = ds.findAll(function(old){ return dd.include( old )})
			
			this.facade.changeSelection( newSelection );
				
		},	
			
		enable : function() {

			// make it visible
			this.enabled = true;
			this.panel.setVisible(true);
			//this.panel.doLayout();
			// determine models to display
			//this.showDisplayedModelsStartingFrom( 0 );
		},
		
		disable : function() {
			this.enabled = false;
			this.panel.setVisible(false);
			this.panel.doLayout();
		},
		
		filterChanged : function(modelIds) {
			
			if (this !== this.facade.getCurrentView()) {
				return
			}
				
			this.showDisplayedModelsStartingFrom( 0 );
		},

		viewChanged : function(modelIds) {
			
			if( this == this.facade.getCurrentView() ){
				this.preRender(modelIds);
			}
			
		},		
		
		selectionChanged: function( modelIds ) {
			
		},
		
		updateModels : function(modelIds) {
			modelIds.each(function(modelId) {
				if (this.facade.getDisplayedModels().indexOf(modelId) != -1) {
					this.preRender(this.facade.getDisplayedModels());
					return;
				}
			}.bind(this));
		}
		
		
};


Repository.Core.ViewPlugin = Repository.Core.Plugin.extend(Repository.Core.ViewPlugin);
/**
 * Copyright (c) 2008
 * Bj�rn Wagner, Sven Wagner-Boysen
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 **/

// define namespace

if(!Repository.Core) Repository.Core = {};

Repository.Core.ContextFreePlugin = {
	/**
	 * 
	 */
	construct: function(facade) {
		arguments.callee.$.construct.apply(this, arguments);
		
	},
	
	preRender: function(){
		
	}
};

Repository.Core.ContextFreePlugin = Repository.Core.Plugin.extend(Repository.Core.ContextFreePlugin);
/**
 * Copyright (c) 2008
 * Bj�rn Wagner, Sven Wagner-Boysen
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 **/

if(!Repository.Core) Repository.Core ={};

Repository.Core.ContextPlugin = {
	
	viewRegion : "right",
		
	/**
	 * 
	 */
	construct: function(facade) {
		// call Plugin constructor
		arguments.callee.$.construct.apply(this, arguments);
				
		// register on events SectionChanged and ModelUpdate
		this.facade.registerOnSelectionChanged(this.selectionChanged.bind(this));
		this.facade.modelCache.getUpdateHandler().registerCallback(this.modelUpdate.bind(this));
		
		this.preRender( this.facade.getDisplayedModels() )
		
	},
	selectionChanged : function(modelIds) {
		
		this.preRender( modelIds )
	
	},
	
	modelUpdate : function(modelId) {
		if( modelId instanceof Array ){
			this.preRender( modelId )
		} else {
			if (this.facade.getSelectedModels().indexOf(modelId) != -1) {
				var a = new Array();
				a.push(modelId);
				this.preRender( a )
			}	
		}
	}
};

Repository.Core.ContextPlugin = Repository.Core.Plugin.extend(Repository.Core.ContextPlugin);
/**
 * Copyright (c) 2008
 * Bjoern Wagner
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 **/

// define namespace
if(!Repository) var Repository = {};
if(!Repository.Plugins) Repository.Plugins = {};

/**
 * Supplies filtering by model type (stencil set)
 * Note: Only stencil sets defined in the stencilsets.json can be selected as filter
 */

Repository.Plugins.AccessFilter = {
	
	filter : [],
	
	construct: function(facade) {
		this.name = Repository.I18N.AccessFilter.name;
		arguments.callee.$.construct.apply(this, arguments); // call Plugin super class

		if( !this.facade.isPublicUser() ){
			this._generateGUI();
		} else {
			this.panel.hide();
		}
		
	},
	
	_generateGUI: function(){
				
		this.panel.getEl().setHeight( this.panel.getEl().getHeight() )
		this.deletePanelItems();

		var curFilter = this.facade.getFilter().get('access')
				
		var myFilters = [	
							[Repository.I18N.AccessFilter.mine, 		'owner'	], 
							[Repository.I18N.AccessFilter.writer, 		'write'	], 
							[Repository.I18N.AccessFilter.reader, 		'read'	], 
							[Repository.I18N.AccessFilter.publicText, 	'public']
						];		
		
		var store 	= new Ext.data.SimpleStore({
	        fields	: ['title','access'],
	        data	: myFilters
	    });
		
		
	    var tpl 	= new Ext.XTemplate(
			'<tpl for=".">',
				'<div class="x-grid3-row" UNSELECTABLE = "on" style="clear:left;">',
					'<div class="x-grid3-row-checker" style="width: 18px; float:left;"></div>',
					'<div class="x-grid3-cell-inner x-grid3-col-1">{title}</div>',
				'</div>',
			'</tpl>'
		);
		
	    var grid = new Ext.DataView({
	        store			: store,
			tpl 			: tpl,
	       	autoHight		: true,
			itemSelector	: 'div.x-grid3-row',
    		overClass		: 'x-grid3-row-over',
			selectedClass	: 'x-grid3-row x-grid3-row-selected',
			multiSelect		: true,
			simpleSelect 	: true
	    });

		this.panel.add( grid )
		this.panel.getEl().setHeight( )
		this.panel.doLayout();
		
		// Select the entree, if there are already setted in the initial filter
		if( curFilter ){
			for( var i=0; i < myFilters.length; i++){
				if( curFilter.include( myFilters[i][1] ) ){
					grid.select(i, true)
				}
			}
		}	
					
		grid.addListener('selectionchange', this._onSelectionChange.bind(this) );	
	},
	
	_onSelectionChange : function( dataView ) {
				
		var filter = $A(dataView.getSelectedRecords()).map(function(item){ return (item.data.access); });
		this.facade.applyFilter('access', filter.join(","));	
	}
};

Repository.Plugins.AccessFilter = Repository.Core.ContextFreePlugin.extend(Repository.Plugins.AccessFilter);
/**
 * Copyright (c) 2008
 * Willi Tscheschner
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 **/

// define namespace
if(!Repository) var Repository = {};
if(!Repository.Plugins) Repository.Plugins = {};

/**
 * Supplies filtering by model type (stencil set)
 * Note: Only stencil sets defined in the stencilsets.json can be selected as filter
 */

Repository.Plugins.BusyIndicator = {
	
	startedCount: 0,

	hidePanel: true,
		
	construct: function( facade ) {
		
		// define Create New Model menu
		this.facade 		= facade;

		this.indicator = new Ext.Toolbar.Button({
										iconCls		: 'some_class_that_does_not_exist_but_fixes-rendering', // do not remove!
										//icon 		: "/backend/images/large-loading.gif",
										region		: 'right',
										disabled	: true,
										disabledClass : 'another_style_class_so_that_the_image_is_shown_proper',
										hidden		: true,
										text		: '<img src="/backend/images/large-loading.gif" width="15" />'
									})


		this.toolbarButtons = [ this.indicator ];
		
		// Register Busy Start/End
		var bh = this.facade.modelCache.getBusyHandler();
		bh.start.registerCallback( this._start.bind(this) )
		bh.end.registerCallback( this._end.bind(this) )
							
		arguments.callee.$.construct.apply(this, arguments); //call Plugin super class	

	},
	
	_start: function(){
		this.indicator.setVisible( true )
		this.startedCount++
	},
	
	_end: function(){
		if( this.startedCount <= 1 )
			this.indicator.setVisible( false )
		
		this.startedCount--
	}	
	
};

Repository.Plugins.BusyIndicator = Repository.Core.ContextPlugin.extend(Repository.Plugins.BusyIndicator);
/**
 * Copyright (c) 2008
 * Bjoern Wagner
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 **/

// define namespace
if(!Repository) var Repository = {};
if(!Repository.Plugins) Repository.Plugins = {};

/**
 * Supplies filtering by model type (stencil set)
 * Note: Only stencil sets defined in the stencilsets.json can be selected as filter
 */

Repository.Plugins.FriendFilter = {
	
	filter : [],
	
	construct: function(facade) {
		this.name = Repository.I18N.FriendFilter.name;
		arguments.callee.$.construct.apply(this, arguments); // call Plugin super class


		if (!this.facade.isPublicUser()) {
			this._generateGUI();
			this.facade.modelCache.getUserUpdateHandler().registerCallback(this._generateGUI.bind(this));
		} else {
			this.panel.hide();
		}

	},
	
	_generateGUI: function(){
		
		var types = $H(this.facade.modelCache.getFriends()).map(function(item) { return Number(item.value) > 0 ? [ unescape(item.key), item.value ] : null }.bind(this)).compact();

		if( this.types && types && types instanceof Array && types.length > 0 && types.toString() == this.types.toString() ){
			if( this.panel && this.panel.body ){
				this.panel.body.hide();
			}
			return 
		}

		this.types = types;
				
		this.panel.getEl().setHeight( this.panel.getEl().getHeight() )
		this.deletePanelItems();

		// Hide the body if there are no friends
		if( types.length <= 0 && this.panel ){
				this.panel.collapse();
		}	
						
		
		var store 	= new Ext.data.SimpleStore({
	        fields	: ['friend', 'count'],
	        data	: types
	    });
		
	    var tpl 	= new Ext.XTemplate(
			'<tpl for=".">',
				'<div class="x-grid3-row" UNSELECTABLE = "on" style="clear:left;">',
					'<div class="x-grid3-row-checker" style="width: 18px; float:left;"></div>',
					'<div class="x-grid3-cell-inner x-grid3-col-1">{friend} ({count})</div>',
				'</div>',
			'</tpl>'
		);
		
	    var grid = new Ext.DataView({
	        store	: store,
			tpl 	: tpl,
	       	autoHight: true,
			itemSelector	: 'div.x-grid3-row',
    		overClass		: 'x-grid3-row-over',
			selectedClass	: 'x-grid3-row x-grid3-row-selected',
			multiSelect	: true,
			simpleSelect : true
	    });

		this.panel.add( grid )
		this.panel.getEl().setHeight( )
		this.panel.doLayout();
		
		
		grid.addListener('selectionchange', this._onSelectionChange.bind(this) );
		
	},
	
	_onSelectionChange : function( dataView, selection ) {
				
		var filter = $A(dataView.getSelectedRecords()).map(function(item){ return item.data.friend; });
		this.facade.applyFilter('friend', filter.join(","));	
	}
};

Repository.Plugins.FriendFilter = Repository.Core.ContextFreePlugin.extend(Repository.Plugins.FriendFilter);
/**
 * Copyright (c) 2008
 * Willi Tscheschner
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 **/

// define namespace
if(!Repository) var Repository = {};
if(!Repository.Plugins) Repository.Plugins = {};

/**
 * Supplies filtering by model type (stencil set)
 * Note: Only stencil sets defined in the stencilsets.json can be selected as filter
 */

Repository.Plugins.LanguageSupport = {
	
	IMAGE_URLS: {
		de: '/backend/images/flags/de.png',
		en_us: '/backend/images/flags/us.png',
		en: '/backend/images/flags/us.png',
		ru: '/backend/images/flags/ru.png',
		es: '/backend/images/flags/es.png'
	},

	hidePanel: true,
	
	construct: function( facade ) {
		
		// define Create New Model menu
		this.toolbarButtons = [];
		this.facade 		= facade;
		
		var currentLanguage	= this.facade.modelCache.getLanguage();
		currentLanguage		= currentLanguage.languagecode + ( currentLanguage.countrycode ? "_" + currentLanguage.countrycode : "");
		
		
		this.facade.modelCache.getAvailableLanguages().each(function(type) {
			
			var language = type.languagecode + ( type.countrycode ? "_" + type.countrycode : "");
			
			this.toolbarButtons.push({
				text 		: Repository.I18N[language],
				region		: 'right',
				menu 		: Repository.I18N[currentLanguage],
				menuIcon 	: this.IMAGE_URLS[currentLanguage],
				tooltipText : Repository.I18N[currentLanguage],
				icon 		: this.IMAGE_URLS[language],
				handler		: this._setLanguage.bind(this, type)				
			});
		}.bind(this));
					
		arguments.callee.$.construct.apply(this, arguments); //call Plugin super class

	},
	
	_setLanguage: function( type ){
		this.facade.modelCache.setLanguage( type.languagecode, type.countrycode )
	}
};

Repository.Plugins.LanguageSupport = Repository.Core.ContextPlugin.extend(Repository.Plugins.LanguageSupport);
/**
 * Copyright (c) 2008
 * Bj�rn Wagner, Sven Wagner-Boysen
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 **/


// define namespace
if(!Repository) var Repository = {};
if(!Repository.Plugins) Repository.Plugins = {};

/**
 * renders the dropdown menu for modeltypes and calls the oryx editor with the choosen type
 */

Repository.Plugins.NewModel = {
	
	hidePanel: true,
	
	construct: function(facade) {

		//this.name = Repository.I18N.NewModel.name;

		// define Create New Model menu
		this.toolbarButtons = new Array();
		this.facade = facade;
		
		this.facade.modelCache.getModelTypes().each(function(type) {
			
			if( !type.visible ){
				return
			}
			
			this.toolbarButtons.push({
				text 		: type.title,
				menu 		: Repository.I18N.NewModel.name,
				menuIcon 	: "/backend/images/silk/shape_square_add.png",
				tooltipText : Repository.I18N.NewModel.tooltipText,
				icon 		: type.iconUrl,
				handler		: function(){
					this.facade.createNewModel(type.url)
				}.bind(this)				
			});
			
			if(type.title=="BPMN 2.0 Conversations"){
				this.toolbarButtons.push({
					text 		: "BPMN 2.0 Choreographies",
					menu 		: Repository.I18N.NewModel.name,
					menuIcon 	: "/backend/images/silk/shape_square_add.png",
					tooltipText : Repository.I18N.NewModel.tooltipText,
					icon 		: "/oryx/stencilsets/bpmn2.0/bpmn2.0.png",
					handler		: function(){
						this.facade.createNewModel(null,"bpmn2.0Choreography")
					}.bind(this)				
				});
				
			}
		}.bind(this));
		

		arguments.callee.$.construct.apply(this, arguments); //call Plugin super class
	}
};

Repository.Plugins.NewModel = Repository.Core.Plugin.extend(Repository.Plugins.NewModel);
/**
 * Copyright (c) 2008
 * Willi Tscheschner
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 **/

// define namespace
if(!Repository) var Repository = {};
if(!Repository.Plugins) Repository.Plugins = {};

/**
 * Supplies filtering by model type (stencil set)
 * Note: Only stencil sets defined in the stencilsets.json can be selected as filter
 */

Repository.Plugins.RatingFilter = {
	
	filter : [],
	
	construct: function(facade) {
		this.name = Repository.I18N.RatingFilter.name;
		arguments.callee.$.construct.apply(this, arguments); // call Plugin super class
		
		this._generateGUI();
		
	
	},
	
	_generateGUI: function(){

		this.panel.getEl().setHeight( this.panel.getEl().getHeight() )
		this.deletePanelItems();
				
		
		var sm 		= new Ext.grid.CheckboxSelectionModel({listeners :  { selectionchange: this._onButtonClick.bind(this) }});
		var store 	= new Ext.data.SimpleStore({
	        fields	: ['rating'],
	        data	: [[]]
	    });
		
		this.editor = new Ext.Rating({	
										value		:0,
										editable	:true,
										changed		:this._setRatingFilter.bind(this)
									})
		
	    this.grid = new Ext.grid.EditorGridPanel({
			cls		: 'repository_rating_filter',
	        store	: store,
			width	: 200,
			clicksToEdit : 0,
	        cm		: new Ext.grid.ColumnModel([
			            sm,
			            {
							editor		: this.editor,
							dataIndex	: 'rating',
							width		: 178
						}
			        ]),
	        sm		: sm,
			hideHeaders :true,
			border	: false
	    });

		// Add grid to panel
		this.panel.add( this.grid )
		// Do Layouting
		this.panel.getEl().setHeight();
		this.panel.doLayout();
		// Start Editing
		this.grid.startEditing(0, 1)
				
	},
	
	
	
	_setRatingFilter: function( num ){
		
		if( this.currentValue && this.currentValue == num ){
			return;
		}
		
		this.currentValue = num;
		
		this.facade.applyFilter('rating', num - 0.5);
		if( this.grid.getSelectionModel().getCount() <= 0)
			this.grid.getSelectionModel().selectFirstRow();
		
	},
	_onButtonClick : function( selectModel ) {
		
		var selValue = this.editor.value;
						
		if( selectModel.getCount() >= 1 && selValue > 0 ){
			
			if( this.currentValue && this.currentValue == selValue ){
				return;
			}
			this.currentValue = selValue;
			this.facade.applyFilter('rating', selValue - 0.5);	
			
		} else {
			this.currentValue = 0;
			this.editor.setValue(0);
			this.facade.applyFilter('rating', '');	
		}
	}
};

Repository.Plugins.RatingFilter = Repository.Core.ContextFreePlugin.extend(Repository.Plugins.RatingFilter);
/**
 * Copyright (c) 2008
 * Willi Tscheschner
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 **/

// define namespace
if(!Repository) var Repository = {};
if(!Repository.Plugins) Repository.Plugins = {};

/**
 * Supplies filtering by model type (stencil set)
 * Note: Only stencil sets defined in the stencilsets.json can be selected as filter
 */

Repository.Plugins.SortingSupport = {
		
	hidePanel: true,
	
	construct: function( facade ) {
		
		// define Create New Model menu
		this.toolbarButtons = [];
		this.facade 		= facade;
		
		
		this.facade.modelCache.getAvailableSorts().each(function(type) {
			
			var isCurrent = type.toLowerCase() === this.facade.getSort();
			
			this.toolbarButtons.push({
				text 		: Repository.I18N.SortingSupport[type],
				menu 		: Repository.I18N.SortingSupport.name,
				menuIcon 	: "/backend/images/silk/table_sort.png",
				tooltipText : Repository.I18N.SortingSupport.name,
				//icon 		: type,
				handler		: this._setSorting.bind(this, type),		
				sort		: isCurrent ? Repository.Config.SORT_DESC : false,
				iconCls		: isCurrent ? 'repository_ext_icon_arrow_down' : ''
						
			});
		}.bind(this));
					
		arguments.callee.$.construct.apply(this, arguments); //call Plugin super class

	},
	
	_setSorting: function( type, menuItem ){
	
		menuItem.sort = menuItem.sort && menuItem.sort == Repository.Config.SORT_DESC ? Repository.Config.SORT_ASC : Repository.Config.SORT_DESC
		
		if( menuItem.sort == Repository.Config.SORT_ASC ){
			menuItem.setIconClass('repository_ext_icon_arrow_up')
		} else {
			menuItem.setIconClass('repository_ext_icon_arrow_down')
		}
		
		menuItem.parentMenu.items.each(function(menuIt){ 
			if( menuIt !== menuItem ){
				menuIt.sort = null; 
				menuIt.setIconClass('');
			}
		})
		

		this.facade.setSort( type, menuItem.sort);
		
	}
};

Repository.Plugins.SortingSupport = Repository.Core.ContextPlugin.extend(Repository.Plugins.SortingSupport);
/**
 * Copyright (c) 2008
 * Bjoern Wagner
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 **/

// define namespace
if(!Repository) var Repository = {};
if(!Repository.Plugins) Repository.Plugins = {};

/**
 * Supplies filtering by model type (stencil set)
 * Note: Only stencil sets defined in the stencilsets.json can be selected as filter
 */

Repository.Plugins.TagFilter = {
	
	filter : [],
	
	construct: function(facade) {
		this.name = Repository.I18N.TagFilter.name;
		arguments.callee.$.construct.apply(this, arguments); // call Plugin super class
		

		if (!this.facade.isPublicUser()) {
			this._generateGUI();
			this.facade.modelCache.getUserUpdateHandler().registerCallback(this._generateGUI.bind(this));
		} else {
			this.panel.hide();
		}
		
	
	},
	
	_generateGUI: function(){

		var types = this.facade.modelCache.getUserTags().map(function(item) { return [ unescape(item) ];}.bind(this));
		
		if( this.types && types && types instanceof Array && types.length > 0 && types.toString() == this.types.toString() ){		
			return 
		}

		this.types = types;

		//this.panel.getEl().setHeight( this.panel.getEl().getHeight() )
		this.deletePanelItems();
		
		// Hide the body if there is no tags
		if( types.length <= 0 && this.panel ){
				this.panel.collapse();
		}	
			
		
		//var sm 		= new Ext.grid.CheckboxSelectionModel({listeners :  { selectionchange: this._onButtonClick.bind(this) }});
		var store 	= new Ext.data.SimpleStore({
	        fields	: ['tag'],
	        data	: types
	    });

	    var tpl 	= new Ext.XTemplate(
			'<tpl for=".">',
				'<div class="x-grid3-row" UNSELECTABLE = "on" style="clear:left;">',
					'<div class="x-grid3-row-checker" style="width: 18px; float:left;"></div>',
					'<div class="x-grid3-cell-inner x-grid3-col-1">{tag}</div>',
				'</div>',
			'</tpl>'
		);
		
	    var grid = new Ext.DataView({
	        store	: store,
			tpl 	: tpl,
	       	autoHight: true,
			itemSelector	: 'div.x-grid3-row',
    		overClass		: 'x-grid3-row-over',
			selectedClass	: 'x-grid3-row x-grid3-row-selected',
			multiSelect	: true,
			simpleSelect : true
	    });

		this.panel.add( grid );
		this.panel.doLayout();
				
		grid.addListener('selectionchange', this._onSelectionChange.bind(this) );
	},
	
	_onSelectionChange : function( dataView, selection ) {
			
		var filter = $A(dataView.getSelectedRecords()).map(function(item){ return (item.data.tag) });
		
		this.facade.applyFilter('tags', filter.join(","));	
	}
};

Repository.Plugins.TagFilter = Repository.Core.ContextFreePlugin.extend(Repository.Plugins.TagFilter);
/**
 * Copyright (c) 2008
 * Bj�rn Wagner
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 **/

// define namespace
if(!Repository) var Repository = {};
if(!Repository.Plugins) Repository.Plugins = {};

/**
 * Supplies filtering by model type (stencil set)
 * Note: Only stencil sets defined in the stencilsets.json can be selected as filter
 */

Repository.Plugins.TypeFilter = {
	
	filter : [],
	
	construct: function(facade) {
		this.name = Repository.I18N.TypeFilter.name;
		arguments.callee.$.construct.apply(this, arguments); // call Plugin super class

		var types =[];
		
		// load types
		this.facade.modelCache.getModelTypes().each(function(stencilset) {
			types.push( [ stencilset.namespace , stencilset.title] )
		}.bind(this));
		
		
		// prepare data for dataView
		var store 	= new Ext.data.SimpleStore({
	        fields	: ['namespace', 'title'],
	        data	: types
	    });
		
		var tpl 	= new Ext.XTemplate(
			'<tpl for=".">',
				'<div class="x-grid3-row" UNSELECTABLE = "on" style="clear:left;">',
					'<div class="x-grid3-row-checker" style="width: 18px; float:left;"></div>',
					'<div class="x-grid3-cell-inner x-grid3-col-1">{title}</div>',
				'</div>',
			'</tpl>'
		);
		
	    var grid = new Ext.DataView({
	        store			: store,
			tpl 			: tpl,
	       	autoHight		: true,
			itemSelector	: 'div.x-grid3-row',
    		overClass		: 'x-grid3-row-over',
			selectedClass	: 'x-grid3-row x-grid3-row-selected',
			multiSelect		: true,
			simpleSelect 	: true
	    });

		
		this.panel.add( grid )
		this.panel.doLayout();
		
		grid.addListener('selectionchange', this._onSelectionChange.bind(this) );
	},
	/**
	 * apply typ filter, if selection has changed 
	 * @param {Object} dataView
	 * @param {Object} selection
	 */
	_onSelectionChange : function( dataView, selection ) {
		
		var filter = $A(dataView.getSelectedRecords()).map(function(item){ return item.data.namespace });
		this.facade.applyFilter('type', filter.join(","));
		
	}
};

Repository.Plugins.TypeFilter = Repository.Core.ContextFreePlugin.extend(Repository.Plugins.TypeFilter);
/**
 * Copyright (c) 2008
 * Willi Tscheschner
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 **/

// define namespace
if(!Repository) var Repository = {};
if(!Repository.Plugins) Repository.Plugins = {};

/**
 * Supplies filtering by model type (stencil set)
 * Note: Only stencil sets defined in the stencilsets.json can be selected as filter
 */

Repository.Plugins.UpdateButton = {
	
	hidePanel: true,	
	
	construct: function( facade ) {
		
		// define Create New Model menu
		this.toolbarButtons = [];
		this.facade 		= facade;

		this.toolbarButtons.push({
			text 		: Repository.I18N.UpdateButton.name,
			region		: 'right',
			tooltipText : Repository.I18N.UpdateButton.name,
			icon 		: "/backend/images/silk/arrow_refresh.png",
			handler		: this._update.bind(this)				
		});

					
		arguments.callee.$.construct.apply(this, arguments); //call Plugin super class
		

	},
	
	_update: function(){
		this.facade.applyFilter();
	}
};

Repository.Plugins.UpdateButton = Repository.Core.ContextPlugin.extend(Repository.Plugins.UpdateButton);
/**
 * Copyright (c) 2008
 * Willi Tscheschner
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 **/

// define namespace
if(!Repository) var Repository = {};
if(!Repository.Plugins) Repository.Plugins = {};

/**
 * Supplies filtering by model type (stencil set)
 * Note: Only stencil sets defined in the stencilsets.json can be selected as filter
 */

Repository.Plugins.AccessInfo = {
	
	ACCESS_URL 	: "/access",
	PUBLIC_USER : "public",
	
	construct: function( facade ) {
		// Set the name
		this.name = Repository.I18N.AccessInfo.name;

		// Set the data uris
		this.dataUris = [this.ACCESS_URL];
				
		// call Plugin super class
		arguments.callee.$.construct.apply(this, arguments); 
		
		this.currentOpenIDs = {owner:null, reader:[], writer:[]};
		
		this._generateData();
		this._generateGUI();
		
		// To cut the open ids, register on resize
		if( this.panel && this.panel.ownerCt)
			this.panel.ownerCt.addListener('resize', function(obj, width){ this.cropOpenIDs()}.bind(this))

	},
	
	cropOpenIDs: function(){
		
		var width 	= this.panel.getInnerWidth()/6.4;
		width		-= 5;
		width		= Math.max( width, 6 )
		var all = this.currentOpenIDs.writer.concat(this.currentOpenIDs.reader)
		all.push(this.currentOpenIDs.owner)
		all = all.compact()
		
		all.each(function(label){
			label.getEl().dom.innerHTML = Repository.Helper.CutOpenID( label.originText, width || 50 );
		})
		
		
	},
	
	render: function( modelData ){
		
		// If modelData hasnt changed, return
		if( !this.myContrPanel || !this.myReadrPanel || !this.myPublicPanel ){ return }
		
		this.panel.getEl().setHeight( this.panel.getEl().getHeight() )
		

		var oneIsSelected 	= $H(modelData).keys().length !== 0;
		var isPublicUser	= this.facade.isPublicUser();
		
		// Find every openids which are available in all selected models
		var contributers 	= [];
		var readers 		= [];
		var owner			= "";
		var isPublic		= false;
		
		var currentUser		= this.facade.getCurrentUser();
		var hasWriteAccess	= true;
		
		// FOR EACH Model			
		$H(modelData).each(function( pair ){ 	
		
						var hasWriteAccessForThatModel = false;
		
						// FOR EACH Access-Rights
						$H(pair.value).each(function( access ){
							
							var value = decodeURI( access.key );
							
							hasWriteAccessForThatModel = hasWriteAccessForThatModel || ( value == currentUser && (access.value == "write" || access.value == "owner" ))
							
							if( modelData.every(function( spair ){
									return $H(spair.value).some(function(saccess){ return access.key == saccess.key && access.value == saccess.value})
								}) ){
								
								if( access.key == "public" ){
									isPublic = true;
								} else if( access.value == "write" ){
									contributers.push( value )
								} else if( access.value == "read" ){
									readers.push( value )
								} else if( access.value == "owner" ) {
									owner = value
								}
							} 
							
						})
						
						hasWriteAccess = hasWriteAccess && hasWriteAccessForThatModel;
					})
				
		
		// Get the write access
		owner == this.facade.getCurrentUser() || contributers.include( this.facade.getCurrentUser() )
		
		this._setPublic( isPublic, oneIsSelected, !this.facade.isPublicUser() && hasWriteAccess )
		this._setOwner( owner, $H(modelData).keys().length > 1 )
		this._setContributer( contributers.uniq(), !this.facade.isPublicUser() &&  hasWriteAccess)
		this._setReader( readers.uniq(), !this.facade.isPublicUser() &&  hasWriteAccess )		
	

		// Enable/Disable the controls
		if( this.controls ){
			this.controls.each(function(co){
				co.setDisabled( isPublicUser || !oneIsSelected || !hasWriteAccess )
			}.bind(this))
			// Reset textfield
			this.controls[0].setValue( oneIsSelected && !hasWriteAccess ? Repository.I18N.AccessInfo.noWritePermission : '')
		}

		// Reset Height;
		this.panel.getEl().setHeight()	
		
		this.cropOpenIDs();
	},
	
	_setPublic: function( isPublic, oneIsSelected, writeAccess ){

		// Check is the values has been changed
		if( this._lastPublicAndSelected && this._lastPublicAndSelected == isPublic + "" + oneIsSelected + "" + writeAccess ){
			return
		} else {
			this._lastPublicAndSelected = isPublic + "" + oneIsSelected + "" + writeAccess;
		}
		
		// Remove children
		this._deleteItems( this.myPublicPanel );

		// Generate the public panel
		if( oneIsSelected ){
			var button, label;
			if( isPublic ){
				button 	= new Ext.LinkButton({image:'../images/silk/user_delete.png', imageStyle:'width:12px; margin:0px 2px -2px 10px;', text:Repository.I18N.AccessInfo.unPublish , click:this._deleteOpenID.bind(this, this.PUBLIC_USER)})
				label	= {text: Repository.I18N.AccessInfo.publicText, xtype:'label', style:"font-weight:bold;"};
			} else {
				button 	= new Ext.LinkButton({image:'../images/silk/user_add.png', imageStyle:'width:12px; margin:0px 2px -2px 10px;', text:Repository.I18N.AccessInfo.publish , click:this._addOpenID.bind(this, this.PUBLIC_USER, 'read')})
				label	= {text: Repository.I18N.AccessInfo.notPublicText , xtype:'label', style:"font-style:italic;color:gray;"};			
			}
			// Add the content to the panel		
			this._addItems( this.myPublicPanel, !writeAccess ? [label] : [label, button] )			
		} else {
			this._addItems( this.myPublicPanel, [ {text: Repository.I18N.AccessInfo.noneIsSelected, xtype:'label', style:"font-style:italic;color:gray;"}] )	
		}	
	},

	_setOwner: function( owner, moreThanOneIsSelected ){

		// Check is the values has been changed
		if( this._lastOwner && this._lastOwner.toString() == owner.toString() ){
			return
		} else {
			this._lastOwner = owner;
		}
		
				
		// Remove children
		this._deleteItems( this.myOwnerPanel );	
		this.currentOpenIDs.owner = null;
		
		// Set the owner
		if( owner ){
			var label = new Ext.form.Label( {text: owner, originText:owner, style:'white-space:nowrap;'});
			this._addItems( this.myOwnerPanel, [ label ] )	
			this.currentOpenIDs.owner = label;
		} else if( moreThanOneIsSelected ) {
			this._addItems( this.myOwnerPanel, [ {text: Repository.I18N.AccessInfo.several, xtype:'label', style:"font-style:italic;color:gray;"}] )	
		} else {
			this._addItems( this.myOwnerPanel, [ {text: Repository.I18N.AccessInfo.none, xtype:'label', style:"font-style:italic;color:gray;"}] )	
		}
		
							
	},

	_setContributer: function( contributers, writeAccess ){
		
		// Check is the values has been changed
		if( this._lastContributers && this._lastContributers.toString() == contributers.toString() && this._lastContributersWrite == writeAccess ){
			return
		} else {
			this._lastContributers 		= contributers;
			this._lastContributersWrite = writeAccess;
		}
		
		// Remove children
		this._deleteItems( this.myContrPanel );

		var contributerButtons 	= this._generateButtons( contributers, writeAccess );
		this._addItems( this.myContrPanel,  contributerButtons );
		
		// Set labels to eventiually cut those
		this.currentOpenIDs.writer = contributerButtons.map(function(el){return el instanceof Ext.Panel ? el.items.last() : null }).compact();
						
	},

	_setReader: function( readers, writeAccess ){

		// Check is the values has been changed
		if( this._lastReaders && this._lastReaders.toString() == readers.toString() && this._lastReadersWrite == writeAccess ){
			return
		} else {
			this._lastReaders 		= readers;
			this._lastReadersWrite 	= writeAccess;
		}
				
		// Remove children
		this._deleteItems( this.myReadrPanel );		
		
		var readerButtons = this._generateButtons( readers, writeAccess );
		this._addItems( this.myReadrPanel,  readerButtons );
		
		// Set labels to eventiually cut those
		this.currentOpenIDs.reader = readerButtons.map(function(el){return el instanceof Ext.Panel ? el.items.last() : null }).compact();
	},
				
	
	_addItems: function( panel, items ){
		panel.add(new Ext.Panel({items:items, border: false})) 		
		panel.getEl().setHeight()
		panel.doLayout();
	},
	
	_deleteItems: function( panel ){
		if( panel && panel.items ){
			panel.getEl().setHeight( panel.getEl().getHeight() )
			panel.items.each(function(item){ panel.remove( item ) }.bind(this));
		}
			
	},
	
	_generateButtons:function( data, editable ){
		
		var buttons = [];
		
		// Set Contributer as Links		
		if( data.length <= 0 ){
			// If there is no contributer, add a 'none'
			buttons.push( {text: Repository.I18N.AccessInfo.none, xtype:'label', style:"font-style:italic;color:gray;"} );				
		}	
		
		// Generate Contributer Buttons			
		data.each(function(openid){
			
			var label = new Ext.form.Label({text: openid, originText: openid, xtype:'label', style:'white-space:nowrap;'});
			var image = new Ext.LinkButton({image:'../images/silk/cross.png', imageStyle:'width:12px; margin:0px 2px -2px 10px;position:absolute;right:0px;top:1px;', text:Repository.I18N.AccessInfo.deleteText, click:this._deleteOpenID.bind(this, openid)})

			buttons.push( new Ext.Panel({border:false, items: editable ? [image, label] : [label] , style:""}))			
				
		}.bind(this))
		
		return buttons;
				
	},
	
	_generateData: function(){

		var types = $H(this.facade.modelCache.getFriends()).keys().map(function(item) { return [ unescape(item) ]; }.bind(this));

		this.dataStore =  new Ext.data.SimpleStore({
	        fields	: ['friend'],
	        data	: types ? types : []
	    });
				
	},
	
	_generateGUI: function(){
				
		var owner	= {text: Repository.I18N.AccessInfo.owner, xtype:'label', style:"display:block;font-weight:bold;margin-bottom:3px;"};
		var contr	= {text: Repository.I18N.AccessInfo.contributer, xtype:'label', style:"display:block;font-weight:bold;margin-bottom:3px;margin-top:8px;"};
		var readr	= {text: Repository.I18N.AccessInfo.reader, xtype:'label', style:"display:block;font-weight:bold;margin-bottom:3px;margin-top:8px;"};

		this.controls	= [		new Ext.form.ComboBoxMulti({
											id			: 'repository_accessinfo_textfield',
											x			: 0, 
											y			: 0, 
											width		: 160,
											height		: 39,
											grow		: true,
											growMax		: 120,
											growMin		: 45,
											emptyText 	: Repository.I18N.AccessInfo.openid,
											disabled  	: true,  
											mode 		: 'local',
											store 		: this.dataStore,
											displayField : 'friend',
											editable	: true,
											anyMatch	: true,
											sep			: "\n",
											renderAsTextArea : true
										}),
								new Ext.LinkButton({
											image		: '../images/silk/page_white_magnify.png', 
											imageStyle	: 'margin:2px;',
											text		: Repository.I18N.AccessInfo.addReader, 
											click		:  function(){
																this._addOpenID(Ext.getCmp('repository_accessinfo_textfield').getValue(), "read")
															}.bind(this)
										}),
								new Ext.LinkButton({
											image		: '../images/silk/page_white_edit.png', 
											imageStyle	: 'margin:2px;',
											text		: Repository.I18N.AccessInfo.addContributer, 
											click		: function(){
																this._addOpenID(Ext.getCmp('repository_accessinfo_textfield').getValue(), "write")
															}.bind(this)
										})				
							]
							
		// Generate a new panel for the add form
		var addPanel = new Ext.Panel({
					style	: 'padding-top:10px;',
					border	: false,
					items	: [
								this.controls[0],
								new Ext.Panel({
											width	: 160,
											style	: 'text-align:right;',
											border	: false,
											items	: [this.controls[1], this.controls[2]]
										})
								]
				});

		var isPublicUser	= this.facade.isPublicUser();
		
		this.myPublicPanel 	= new Ext.Panel({border:false, height:20, style:'white-space:nowrap;'});
		this.myContrPanel 	= new Ext.Panel({border:false});
		this.myOwnerPanel 	= new Ext.Panel({border:false});
		this.myReadrPanel	= new Ext.Panel({border:false});

		var panels	= [this.myPublicPanel, owner, this.myOwnerPanel, contr, this.myContrPanel, readr, this.myReadrPanel]
		if( !isPublicUser ){
			panels.push( addPanel )
		}

		this.myPanel = new Ext.Panel({
					style	: 'padding:10px;', 
					border	: false,
					items	: panels
				})
				
		// Add the panel		
		this.panel.add( this.myPanel )
		this.panel.doLayout();
						
	},
	
	_deleteOpenID: function( openID ){
		
		if( !openID ){ return }
		
		this.facade.modelCache.deleteData( this.facade.getSelectedModels(), this.ACCESS_URL, {subject:openID}, null, true );
		
	},	
	
	_addOpenID: function( openid, access ){
		
		// Replaces ';' and '\n' to ',' ;and stripes and decodes 
		var decoded = openid.gsub(';', ',').gsub('\n', ',').split(',').map(function(s){ s = s.strip(); return s.blank() ? null : s}).uniq().compact().join(',')
		
		if( decoded.length <= 0 ){ return }
		
		this.facade.modelCache.setData( this.facade.getSelectedModels(), this.ACCESS_URL, { subject:decoded, predicate:access }, null, true )

		// Add the new friends to the data store
		//	Create a new record-class
		var Tag = Ext.data.Record.create([{name: 'friend'}])
		//	Add every friend to the store
		decoded.split(",").each(function( friend ){
			this.dataStore.add( new Tag({friend: unescape(friend) }) );
		}.bind(this))
				
	}
};

Repository.Plugins.AccessInfo = Repository.Core.ContextPlugin.extend(Repository.Plugins.AccessInfo);
/**
 * Copyright (c) 2008
 * Willi Tscheschner
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 **/

// define namespace
if(!Repository) var Repository = {};
if(!Repository.Plugins) Repository.Plugins = {};

/**
 * Supplies filtering by model type (stencil set)
 * Note: Only stencil sets defined in the stencilsets.json can be selected as filter
 */

Repository.Plugins.Edit = {
	
	// This plugin is only enabled 
	// when user is logged on
	enabled:false,
	
	construct: function( facade ) {
		// Set the name
		this.name = Repository.I18N.Edit.name;

		// Set the data uris
		this.dataUris = ["/meta"];
				
		// call Plugin super class
		arguments.callee.$.construct.apply(this, arguments); 
		
		if( !this.facade.isPublicUser() ){
			this.enabled = true;
			this._generateGUI();
			this.panel.collapse();
		} else {
			this.panel.hide();
		}

	},
	
	render: function( modelData ){
		
		if( !this.enabled ){ return }
		
		// Set absolute Height
		this.panel.getEl().setHeight( this.panel.getEl().getHeight() )
		
		var oneIsSelected 	= $H(modelData).keys().length == 1;
		var data			= oneIsSelected ? modelData.get( modelData.keys()[0] ) : {title:"",summary:""};
		var hasWriteAccess	= $H(modelData).keys().every( function(key){ return modelData.get( key ).author == this.facade.getCurrentUser() }.bind(this) );
		
		// Set Textfields
		this._enableTextFields( oneIsSelected && hasWriteAccess, data.title, data.summary );
		this._enableDelete( $H(modelData).keys().length, hasWriteAccess, modelData)
		
		// Reset Height;
		this.panel.getEl().setHeight();
		this.panel.doLayout();
		
	},
	
	_enableTextFields: function( enable, name, summary ){
		
		// Set initial values
		this.controls[0].setValue( enable ? unescape(name) : '' )
		this.controls[1].setValue( enable ? unescape(summary) : '' )
		
		// Enable/Disable Textfield
		this.controls[0].setDisabled( !enable )
		this.controls[1].setDisabled( !enable )
		
		// Enable/Disable Save-Button
		this.controls[2].setDisabled( !enable )
	},
	
	_enableDelete: function( size, hasWriteAccess, modelData ){
		
		size = !hasWriteAccess ? 0 : size;
		
		// Disable the button
		this.controls[3].setDisabled( size <= 0 )
		
		var innerText = '<b>' + Repository.I18N.Edit.deleteText + ':</b> ';
		if( size == 1 ){
			innerText += new Template(Repository.I18N.Edit.deleteOneText).evaluate({title: unescape(modelData.get( modelData.keys()[0] ).title) });
		} else if( size > 1 ){
			innerText += new Template(Repository.I18N.Edit.deleteMoreText).evaluate({size: size });			
		} else {
			innerText = '<span style="font-style:italic;color:gray;">' + Repository.I18N.Edit.deleteText + ( !hasWriteAccess ? ": " +  Repository.I18N.Edit.noWriteAccess : '') + '</span>'
		}
		
		if( this.controls[4].getEl() )
		this.controls[4].getEl().dom.innerHTML = innerText
	},
	
	_generateGUI: function(){
				
		this.controls	= [		
								new Ext.form.TextField({
											id			: 'repository_edit_textfield_name',
											width		: 165,
											emptyText 	: Repository.I18N.Edit.editName ,
											disabled  	: true
										}),
								new Ext.form.TextArea({
											id			: 'repository_edit_textfield_summary',
											width		: 165,
											height		: 39,
											growMax		: 120,
											growMin		: 55,
											growPad		: -10,
											grow		: true,
											emptyText 	: Repository.I18N.Edit.editSummary,
											disabled  	: true
										}),		
								new Ext.LinkButton({
											image		:'../images/silk/disk.png',
											text 		: Repository.I18N.Edit.editText,
											click		: function(){
															this._storeChanges(Ext.getCmp('repository_edit_textfield_name').getValue(), Ext.getCmp('repository_edit_textfield_summary').getValue())
														}.bind(this)
										}),											
								new Ext.LinkButton({
											image		:'../images/silk/cross.png',
											text 		: Repository.I18N.Edit.deleteText,
											click 		: this._deleteModels.bind(this)
											
										}),
								new Ext.form.Label({
											style		:'display:block;width:100%;text-align:left;',
											text		:''
										})
							]
							
		// Generate a new panel for the add form
		var panels = new Ext.Panel({
					style	: 'padding-top:10px;',
					border	: false,
					items	: [								
								new Ext.Panel({
											border		: false,
											items		: [
															{xtype:'label', text: Repository.I18N.Edit.nameText, style: "display:block;font-weight:bold;margin-bottom:5px;"},
															this.controls[0],
															{xtype:'label', text: Repository.I18N.Edit.summaryText, style: "display:block;font-weight:bold;margin-bottom:5px;margin-top:10px;"},
															this.controls[1]
														]
										}),
								new Ext.Panel({
											width	: 165,
											style	: 'text-align:right;margin-top:5px;',
											border	: false,
											items	: [this.controls[2]]
										}),
								new Ext.Panel({
											style	: 'text-align:right;margin-top:20px;margin-right:5px;padding:5px 5px 5px 0px;border-top:1px solid silver;',
											border	: false,
											items	: [this.controls[4],this.controls[3]]
										})
								]
				});


		this.myPanel = new Ext.Panel({
					style	: 'padding:10px;', 
					border	: false,
					items	: panels
				})
				
		// Add the panel		
		this.panel.add( this.myPanel )
		this.panel.doLayout();
						
	},
	
	_deleteModels: function() {
		
		this.facade.modelCache.deleteData( this.facade.getSelectedModels(), "/self", null, function(){ this.facade.applyFilter() }.bind(this) );
		 
	},
	
	_storeChanges: function(name, summary){

		this.facade.modelCache.setData( this.facade.getSelectedModels(), "/meta", { title:(name), summary:(summary) },  function(){  this.facade.updateView() }.bind(this) )
		
	}
};

Repository.Plugins.Edit = Repository.Core.ContextPlugin.extend(Repository.Plugins.Edit);
/**
 * Copyright (c) 2008
 * Willi Tscheschner
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 **/

// define namespace
if(!Repository) var Repository = {};
if(!Repository.Plugins) Repository.Plugins = {};

/**
 * Supplies filtering by model type (stencil set)
 * Note: Only stencil sets defined in the stencilsets.json can be selected as filter
 */

Repository.Plugins.Export = {
	
	CONFIG_URL 	: "/config",
	extentions	: [],
	
	
	construct: function( facade ) {
		// Set the name
		this.name = Repository.I18N.Export.name;

		// Set the data uris
		this.dataUris = [];
		
		this.extentions = facade.modelCache.getAvailableExports()
		this.extentions.unshift( {name: 'Editor', uri: '/self', iconUrl: '/backend/images/silk/application_edit.png' } )
				
		// call Plugin super class
		arguments.callee.$.construct.apply(this, arguments); 
		
		this._generateGUI();
		

	},
	
	render: function( modelData ){
			
		// If modelData hasnt changed, return
		if( !this.exportPanel ){ return }

		this.panel.getEl().setHeight( this.panel.getEl().getHeight() )
			
		// Try to removes the old child ...
		this._deleteItems( this.exportPanel );

		// Only one is selected
		var onlyOneIsSelected 	= $H(modelData).keys().length === 1;
		
		// IF so...
		if( onlyOneIsSelected ){
			// .. show the particular links for those
			var uri	= modelData.keys()[0].slice(1);			
			
			this.extentions.each(function( extention ){
				
				var newURI = uri + extention.uri
				var button = new Ext.LinkButton({text:newURI, href:newURI, style:"display:block;", click:this._openWindow.bind(this, newURI)})
				
				var panel = new Ext.Panel({
					layout	: 'absolute',
					height	: 35,
					border	: false,
					items	: [
								// IMAGE
								new Ext.Panel({border:false, html:"<img src='"+extention.iconUrl+"'/>", x:0,y:0}),
								// TITLE
								new Ext.Panel({border:false, items:[{xtype:'label', text:extention.name, style:'font-weight:bold;'}], x:25,y:0}),
								// LINK
								new Ext.Panel({border:false, items:[button], x:25,y:12})								
								]
				})
				
				this.exportPanel.add(panel)
				
			}.bind(this))
				
			
		// IF not, show a alert text	
		} else {
			this.exportPanel.add({text: Repository.I18N.Export.onlyOne, xtype:'label', style:"font-style:italic;color:gray;"})
		}

		
		this.panel.getEl().setHeight()
		this.exportPanel.doLayout();

	},
	
	_deleteItems: function( panel ){
		if( panel.items )
			panel.items.each(function(item){ panel.remove( item ) }.bind(this));
	},
			
	_openWindow: function( uri ){
		
		window.open( uri )
		
	},
	
	
	_generateGUI: function(){
				
		var label			= {text: Repository.I18N.Export.title, xtype:'label', style:"display:block;font-weight:bold;margin-bottom:10px;"};		
		this.exportPanel 	= new Ext.Panel({border:false});

		this.myPanel = new Ext.Panel({
					style	: 'padding:10px;', 
					border	: false,
					items	: [label, this.exportPanel]
				})
				
		// Add the panel		
		this.panel.add( this.myPanel )
		this.panel.doLayout();
						
	}
};

Repository.Plugins.Export = Repository.Core.ContextPlugin.extend(Repository.Plugins.Export);
/**
 * Copyright (c) 2008
 * Willi Tscheschner
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 **/

// define namespace
if(!Repository) var Repository = {};
if(!Repository.Plugins) Repository.Plugins = {};

/**
 * Supplies filtering by model type (stencil set)
 * Note: Only stencil sets defined in the stencilsets.json can be selected as filter
 */

Repository.Plugins.ModelRangeSelection = {
	
	viewRegion : "bottom",
	
	lessSpaceIndicator: 500,
	
	construct: function( facade ) {

		// call Plugin super class
		arguments.callee.$.construct.apply(this, arguments); 

		if( this.panel.ownerCt ){
			this.panel.ownerCt.addListener('resize', this._checkForLessSpace.bind(this));
		}
		
	},
	
	render: function( modelData ){

		// Try to removes the old child ...
		if( this.myPanel )
			this.panel.remove( this.myPanel );

		var isLessSpace = this.panel.getInnerWidth() < this.lessSpaceIndicator;

		var buttons 	= [];
		var buttonStyle	= "padding:5px;"
				
		var size		= this.facade.getFilteredModels().length;
		var shownModels	= this.facade.getDisplayedModels().length;
		var index		= this.facade.getCurrentView().lastStartIndexOfDisplayedModel;
		var pageSize	= this.facade.getCurrentView().numOfDisplayedModels;

		var isFirstPage	= index < pageSize;
		var isLastPage	= index >= size - pageSize;
				
		// Previous
		buttons.push( new Ext.LinkButton({text:Repository.I18N.ModelRangeSelection[isLessSpace ? 'previousSmall' : 'previous'], click:this._previous.bind(this), style:"position:absolute;top:1px;left:10px;", disabled:isFirstPage}) );
		
			
		// Generate Page Buttons

		var currentPage	= Math.max( Math.floor( index / pageSize ) , 0);
		var lastPage	= Math.max( Math.floor( (size-1) / pageSize ) , 0);
		var endPage		= Math.max( Math.min( currentPage + 2, lastPage ), 0);
		var startPage	= Math.max( endPage - 4, 0);
		endPage			= Math.max(  Math.min( startPage + 4, lastPage ), 0);
		
		if( startPage != 0 ){
		
			// First
			buttons.push( new Ext.LinkButton({text:"1", click:this._setRange.bind(this, 0), style:buttonStyle, disabled:isFirstPage}) );			
			// plus ...
			buttons.push( {xtype:'label', text:'...', style:buttonStyle} )
		}
		
		for( var i=startPage; i <= endPage; i++ ){
			var style = currentPage == i ? buttonStyle + "font-size:13px;font-weight:bold;color:#000000;": buttonStyle;
			buttons.push( new Ext.LinkButton({text:(i+1)+"", click:this._setRange.bind(this, i*pageSize), style:style, disabled: currentPage == i}) );
		}

		// Checks if the last shown page is really the last page
		if( endPage !== lastPage ){
			// ...
			buttons.push( {xtype:'label', text:'...', style:buttonStyle} )
			// Last
			buttons.push( new Ext.LinkButton({text:lastPage+1, click:this._setRange.bind(this, size - (size % pageSize)), style:buttonStyle, disabled:isLastPage}) );

		}
								
		var labelModelOf = 	size == 0 ?
								Repository.I18N.ModelRangeSelection.modelsOfZero :
								(shownModels == 1 ? 
									new Template(Repository.I18N.ModelRangeSelection.modelsOfOne).evaluate({size: size, from: index+1}) : 					
									new Template(Repository.I18N.ModelRangeSelection.modelsOfMore).evaluate({size: size, from: index+1, to: index+shownModels}) );
		buttons.push( {xtype:'label', text:labelModelOf, style:'margin-left:15px;'} )
		
		// Next
		buttons.push( new Ext.LinkButton({text:Repository.I18N.ModelRangeSelection[isLessSpace ? 'nextSmall' : 'next'], click:this._next.bind(this), style:"position:absolute;top:1px;right:10px;", disabled:isLastPage}) );
		

		this.myPanel = new Ext.Panel({
					style	: 'padding:10px;white-space:nowrap;text-align:center;', 
					border	: false,
					items	: buttons,
					height	: 40
				})
						
		// ... before the new child gets added		
		this.panel.add( this.myPanel );
		// Update layouting
		this.panel.doLayout();

		this.buttons = buttons;
		
	},
	
	_checkForLessSpace: function() {
		
		if( !this.buttons && this.buttons.length <= 0 ){ return }
		
		var isLessSpace = this.panel.getInnerWidth() < this.lessSpaceIndicator;
		
		this.buttons[0].setText( Repository.I18N.ModelRangeSelection[isLessSpace ? 'previousSmall' : 'previous'] )
		this.buttons[this.buttons.length-1].setText( Repository.I18N.ModelRangeSelection[isLessSpace ? 'nextSmall' : 'next'] )
		
	},
	
	_previous: function(){
		this.facade.getCurrentView().showPreviousDisplayedModels();
	},
	
	_next: function(){
		this.facade.getCurrentView().showNextDisplayedModels();
	},
	
	_setRange: function( index ){
		this.facade.getCurrentView().showDisplayedModelsStartingFrom( index );
	}		
};

Repository.Plugins.ModelRangeSelection = Repository.Core.ContextPlugin.extend(Repository.Plugins.ModelRangeSelection);
/**
 * Copyright (c) 2008
 * Willi Tscheschner
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 **/

// define namespace
if(!Repository) var Repository = {};
if(!Repository.Plugins) Repository.Plugins = {};

/**
 * Supplies filtering by model type (stencil set)
 * Note: Only stencil sets defined in the stencilsets.json can be selected as filter
 */

Repository.Plugins.Rating = {
	
	RATING_URL : "/rating",
	
	construct: function( facade ) {
		// Set the name
		this.name = Repository.I18N.Rating.name;

		this.dataUris = [this.RATING_URL];
										
		// call Plugin super class
		arguments.callee.$.construct.apply(this, arguments); 
		
		this._generateGUI();

	},
	
	render: function( modelData ){
		
		if( !this.controls ){
			return
		}
		
		var totalScore 	= 0;
		var userScore	= 0; 
		var totalVotes	= 0; 
		var modelCount	= $H(modelData).keys().length; 
		var voteCount	= 0;
		
		$H(modelData).values().each(function( score ){
			totalScore 	+= score.totalScore;
			totalVotes 	+= score.totalVotes;
			userScore 	+= score.userScore;
			
			if( score.totalScore > 0 )
				voteCount++
			
		});
		
		// Get the avarage
		totalScore 	/= voteCount || 1;
		totalVotes 	/= voteCount || 1;
		userScore 	/= voteCount || 1;
		
		// Define the text beneath the stars, depeding on the model vote counts
		var totalText;
		switch( modelCount * voteCount ){
			case 0:		totalText = Repository.I18N.Rating.totalNoneText;
						break;
			case 1: 	totalText = new Template(Repository.I18N.Rating.totalOneText).evaluate({totalScore: totalScore, totalVotes: totalVotes });
						break;
			default:	totalText = new Template(Repository.I18N.Rating.totalMoreText).evaluate({totalScore: totalScore, totalVotes: totalVotes, modelCount: modelCount, voteCount: voteCount });
						break;
		}

		this.controls[0].setDisabled( modelCount <= 0 )		
		this.controls[0].setValue( totalScore )
		this.controls[0].setText( modelCount <= 0 ? '' : totalText )
		
		if( this.controls[1].rendered ){
			this.controls[1].setDisabled( modelCount <= 0 )	
			this.controls[1].setValue( modelCount > 1 ? 0 : userScore )		
		}
		
	},
	
	
	_generateGUI: function(){

		var totalLabel 		= {text: Repository.I18N.Rating.total, xtype:'label', style:"display:block;font-weight:bold;margin-bottom:5px;"};
		var myLabel 		= {text: Repository.I18N.Rating.my, xtype:'label', style:"display:block;font-weight:bold;margin-bottom:5px;margin-top:10px;"};
		
		this.controls	= [
								new Ext.Rating({
											value		: 0,
											editable	: false
										}),
								new Ext.Rating({
											value		: 0,
											editable	: true,
											changed 	: this._setUserRating.bind(this)
										})
							]

		var items = [];
		
		if( this.facade.isPublicUser() ){
			items = [totalLabel, this.controls[0]]
		} else {
			items = [totalLabel, this.controls[0], myLabel, this.controls[1]]
		}
		

		this.myPanel = new Ext.Panel({
					style	: 'padding:10px;', 
					border	: false,
					items	: items
				})
						
		// ... before the new child gets added		
		this.panel.add( this.myPanel );
		// Update layouting
		this.panel.doLayout();
				
	},
	
	_setUserRating: function( value ){
		
		if( !value ){ return }
		
		this.facade.modelCache.setData( this.facade.getSelectedModels(), this.RATING_URL, {userScore:value}, null, true )
		
	
	}
};

Repository.Plugins.Rating = Repository.Core.ContextPlugin.extend(Repository.Plugins.Rating);
/**
 * Copyright (c) 2008
 * Willi Tscheschner
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 **/

// define namespace
if(!Repository) var Repository = {};
if(!Repository.Plugins) Repository.Plugins = {};

/**
 * Supplies filtering by model type (stencil set)
 * Note: Only stencil sets defined in the stencilsets.json can be selected as filter
 */

Repository.Plugins.TagInfo = {
	
	TAG_URL : "/tags",
	
	construct: function( facade ) {
		// Set the name
		this.name = Repository.I18N.TagInfo.name;

		this.dataUris = [this.TAG_URL];
										
		// call Plugin super class
		arguments.callee.$.construct.apply(this, arguments); 
		
		
		if (!this.facade.isPublicUser()) {
			this._createDataStore();
			this._generateGUI();
		} else {
			this.panel.hide();
		}


	},
	
	render: function( modelData ){
		
		// If modelData hasnt changed, return
		if( this.facade.isPublicUser() || !this.tagPanel ){ return }
						
		// Find every tag which are available in all selected models
		var modelTags 		= []
		$H(modelData).each(function( pair ){ 
						pair.value.userTags.each(function( tag ){
							if( modelData.every(function( spair ){
									return spair.value.userTags.include( tag )
								}) ){
								modelTags.push( unescape( tag ) )
							} 
						})
					})
		
		modelTags = modelTags.uniq();


		var oneIsSelected 	= $H(modelData).keys().length !== 0;
		var isPublic		= this.facade.isPublicUser();
		
		// Hide/Show the controls
		if( this.controls ){
			this.controls.each(function(co){
				co.setDisabled( isPublic || !oneIsSelected )
			}.bind(this))
			
			this.controls[0].setValue("")
		}
		
		
		// Set the tags		
		this._setModelTag( modelTags );
	},
	
	_setModelTag: function( modelTags ){

		if( this._lastModelTags && this._lastModelTags.toString() == modelTags.toString() ){
			return
		} else {
			this._lastModelTags = modelTags;
		}

		var isPublic		= this.facade.isPublicUser();
		var buttons 		= [];
		
		// Hold the height of the panel
		this.panel.getEl().setHeight( this.panel.getEl().getHeight() )
		this.tagPanel.getEl().setHeight( this.tagPanel.getEl().getHeight() )
		
		// Try to removes the old child ...
		if( this.tagPanelContent )
			this.tagPanel.remove( this.tagPanelContent );
			
		// For each modeltag create a label						
		modelTags.each(function(tag, index){
			
			var label = {text: tag, xtype:'label'};
			var image = new Ext.LinkButton({image:'../images/silk/cross.png', imageStyle:'width:12px; margin:0px 2px -2px 2px;', text:Repository.I18N.TagInfo.deleteText, click:this._onTagClick.bind(this, tag)})
			
			buttons.push( label );
			if (!isPublic) buttons.push( image ); // Don't display remove buttons to the public user
			
			if( index < modelTags.length-1 )
				buttons.push( {html:', ', width:10, xtype:'label'} );
				
		}.bind(this))

		if( buttons.length == 0 ){
			// Add a 'none'
			buttons.push( {text: Repository.I18N.TagInfo.none, xtype:'label', style:"font-style:italic;color:gray;"} );				
		}
	
		
		this.tagPanelContent = new Ext.Panel({
									items	: buttons,
									border	: false
								})			


		// Add the new content
		this.tagPanel.add( this.tagPanelContent );
		
		// Reset the height
		this.tagPanel.getEl().setHeight( )
		this.panel.getEl().setHeight()
		
		// Force for layouting
		this.tagPanel.doLayout();
				
	},
	
	_createDataStore : function() {
		var types = this.facade.modelCache.getUserTags().map(function(item) { return [ unescape(item) ];}.bind(this));

		
		this.dataStore =  new Ext.data.SimpleStore({
	        fields	: ['tag'],
	        data	: types ? types : []
	    });
	},
	
	_generateGUI: function(){

		var label 		= {text: Repository.I18N.TagInfo.shared, xtype:'label', style:"display:block;font-weight:bold;margin-bottom:5px;"};
		this.tagPanel	= new Ext.Panel({border:false})
		this.controls	= [
								new Ext.form.ComboBoxMulti({
											id			: 'repository_taginfo_textfield',
											x			: 0, 
											y			: 0, 
											width		: 150,
											emptyText 	: Repository.I18N.TagInfo.newTag ,
											disabled  	: true,
											mode 		: 'local',
											store 		: this.dataStore,
											displayField : 'tag',
											editable	: true,
											sep			: ","
										}),
								new Ext.LinkButton({
											image		:'../images/silk/add.png',
											text 		: Repository.I18N.TagInfo.addTag,
											click 		: function(){
																this._addTag(Ext.getCmp('repository_taginfo_textfield').getValue())
															}.bind(this)
											
										})
							]
							
		// Generate a new panel for the add form
		var addPanel = new Ext.Panel({
					style	: 'padding-top:10px;',
					layout	: 'absolute',
					border	: false,
					height	: 40,
					items	: [
								this.controls[0],
								new Ext.Panel({
											x		: 155, 
											y		: 3,
											border	: false,
											items	: [this.controls[1]]
										})
								]
				});

		var isPublicUser	= this.facade.isPublicUser();
		
		var panels	= [label, this.tagPanel]
		if( !isPublicUser ){
			panels.push( addPanel )
		}
		
		this.myPanel = new Ext.Panel({
					style	: 'padding:10px;', 
					border	: false,
					items	: panels
				})
						
		// ... before the new child gets added		
		this.panel.add( this.myPanel );
		// Update layouting
		this.panel.doLayout();
				
	},
	
	_onTagClick: function( tag ){
		
		if( !tag || tag.length <= 0 ){ return }
		
		this.facade.modelCache.deleteData( this.facade.getSelectedModels(), this.TAG_URL, {tag_name:tag}, null, true )

	},	
	
	_addTag: function( tagname ){
		
		if( !tagname || tagname.length <= 0 ){ return }
		
		
		tagname = tagname.split(",").map(function(text){ return text.blank() ? null :  text.strip() }).compact().join(",")
		
		this.facade.modelCache.setData( this.facade.getSelectedModels(), this.TAG_URL, {tag_name:tagname}, null, true )
		
		// Add the new tags to the data store
		//	Create a new record-class
		var Tag = Ext.data.Record.create([{name: 'tag'}])
		//	Add every tag to the store
		tagname.split(",").each(function( tagText ){
			this.dataStore.add( new Tag({tag: unescape(tagText) }) );
		}.bind(this))
	
	}
};

Repository.Plugins.TagInfo = Repository.Core.ContextPlugin.extend(Repository.Plugins.TagInfo);
/**
 * Copyright (c) 2008
 * Willi Tscheschner
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 **/

// define plugin namespace

if(!Repository.Plugins) Repository.Plugins = {};

Repository.Plugins.FullView = {
	

	construct: function(facade) {
		this.name = Repository.I18N.FullView.name;
		
		this.icon = '/backend/images/silk/application_view_gallery.png';
		this.numOfDisplayedModels = 1;
		
		// define required data uris
		this.dataUris = ["/meta"];
		
		arguments.callee.$.construct.apply(this, arguments); // call superclass constructor

		if( this.parentPanel.ownerCt ){
			this.parentPanel.ownerCt.addListener('resize', function(){ if(this.facade.getCurrentView() == this){ this.setFrameHeight()} }.bind(this));
		}
				
	},
	
	
	render : function(modelData) {
		
		if( this.myPanel ){
			this.panel.remove( this.myPanel )
		}
		
		// If there are no models, return
		if( $H(modelData).keys().length <= 0 ){
			return
		}
		
		var rawData			= modelData.get( modelData.keys()[0] );
		
		var data			= {};
		
		var ssName			= this.facade.modelCache.getModelTypes().find(function(type){ return rawData.type == type.namespace }.bind(this));
		data.type 			= ssName ? ssName.title : rawData.type;
		
		data.title			= unescape(rawData.title)
		data.summary		= unescape(rawData.summary).gsub('\n', '<br/>');
		data.creationDate	= rawData.creationDate;
		data.lastUpdate		= rawData.lastUpdate;
		data.author			= rawData.author;
		data.pngUri			= rawData.pngUri;
		
		data.editUri			= Repository.Config.BACKEND_PATH + modelData.keys()[0] + "/self";
		
		// Define the labels
		data.createdLabel		= Repository.I18N.FullView.createdLabel;
		data.fromLabel			= Repository.I18N.FullView.fromLabel;
		data.descriptionLabel	= Repository.I18N.FullView.descriptionLabel;
		data.changeLabel		= Repository.I18N.FullView.changeLabel;
		data.editLabel			= Repository.I18N.FullView.editorLabel;
	
		var newHTML = new Ext.Template(
							    '<div>',
							   		'<div style="margin-bottom:10px;"><span style="font-weight:bold;font-size:15px;margin-right:5px;">{title}</span> ({type}) <a href="{editUri}" target="_blank" style="text-decoration:none;margin-left:20px;"><img src="/backend/images/silk/application_edit.png" style="margin-right:5px;margin-bottom:-4px;"/>{editLabel}</a></div>',
									'<div><span style="width:120px;font-weight:bold;display:inline-table;">{createdLabel}: </span>{creationDate} <span style="width:120px;font-weight:bold;margin-left:50px;display:inline-table;">{changeLabel}: </span>{lastUpdate}</div>',
							   		'<div><span style="width:120px;font-weight:bold;display:inline-table;">{fromLabel}: </span>{author}</div>',
									'<div><span style="width:120px;font-weight:bold;display:block;float:left">{descriptionLabel}: </span><div style="margin-left:120px;">{summary}</div></div>',
									'<iframe id="repository_fullview_pngframe" src="{pngUri}" title="{title}" style="width:99%;border:none;margin-top:20px;"/>',
							    '</div>'
							);
	
	    this.myPanel = new Ext.Panel({
			style		: 'padding:10px',
	        html		: newHTML.apply( data ),
			border		: false
		});
		
		this.panel.add( this.myPanel );
		this.panel.doLayout(); 
		
		this.setFrameHeight();
		
		this.facade.changeSelection( [modelData.keys()[0]] );

	},
	
	setFrameHeight: function(){
		
		// Set the height for the canvas
		var el = $('repository_fullview_pngframe');
		el.height = this.panel.getEl().parent().parent().parent().parent().getComputedHeight() - el.offsetTop - 20;
				
	}	
};

Repository.Plugins.FullView = Repository.Core.ViewPlugin.extend(Repository.Plugins.FullView);



/**
 * Copyright (c) 2008
 * Willi Tscheschner
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 **/

// define plugin namespace

if(!Repository.Plugins) Repository.Plugins = {};

Repository.Plugins.IconView = {
	
	
	construct: function(facade) {
		this.name = Repository.I18N.IconView.name;
		
		this.icon = '/backend/images/silk/application_view_icons.png';
		this.numOfDisplayedModels = 12;
		
		// define required data uris
		this.dataUris = ["/meta"];
		
		arguments.callee.$.construct.apply(this, arguments); // call superclass constructor
		
	},
	
	
	
	render : function(modelData) {
		
		this.isRendering = true;
				
		if( this.myPanel ){
			this.panel.remove( this.myPanel )
		}
		
		var data = [];
		modelData.each(function( pair ){
			var stencilset = pair.value.type;
			// Try to display stencilset title instead of uri
			this.facade.modelCache.getModelTypes().each(function(type){
				if (stencilset == type.namespace) {
					stencilset = type.title;
					return;
				}
			}.bind(this));
			
			data.push( [ pair.key, pair.value.thumbnailUri + "?" + Math.random(), unescape(pair.value.title), stencilset, Repository.Helper.CutOpenID(pair.value.author, 45) || 'Unknown' ] )
		}.bind(this));
		
		var store = new Ext.data.SimpleStore({
	        fields	: ['id', 'icon', 'title', 'type', 'author'],
	        data	: data
	    });
	
	    this.myPanel = new Ext.Panel({
			border	:false,
	        items	: new DataGridPanel({store: store, listeners:{click:this._onSelectionChange.bind(this), dblclick:this._onDblClick.bind(this)}})
	    });

		this.panel.add( this.myPanel );
		this.panel.doLayout(); 
		
		
		this.isRendering = false;
	},
	
	_onSelectionChange: function(dataGrid){

		if( this.isRendering || this.isSelecting ){ return }

		var ids = [];
		// Get the selection
		dataGrid.getSelectedRecords().each(function(data){
			ids.push( data.data.id )
		})
		
		// Change the selection
		this.facade.changeSelection( ids );
	},
	
	_onDblClick: function(dataGrid, index, node, e){
		
		// Get the uri from the clicked model
		var id 	= dataGrid.getRecord( node ).data.id
				
		// Select the new range
		dataGrid.selectRange(index, index)
		this.facade.changeSelection( [id] );
		
		// Open the model in Editor
		this.facade.openModelInEditor(id);
		
	},
	
	selectionChanged: function(modelIds) {
		
		if( !this.myPanel || this.isRendering ){ return }
		
		var dg		= this.myPanel.items.get(0);
		var data  	= dg.store.data;
		
		if( dg.events.click.firing ){ return }
		
		this.isSelecting = true;
		
		var selectingIndices = [];
		
		data.each(function(d, index ){
			if( modelIds.include( d.data.id )){ selectingIndices.push( index ) }
		})
		
		dg.select( selectingIndices );
		
		this.isSelecting = false;
	}	
};

Repository.Plugins.IconView = Repository.Core.ViewPlugin.extend(Repository.Plugins.IconView);


DataGridPanel = Ext.extend(Ext.DataView, {
	multiSelect		: true,
	//simpleSelect	: true, 
    cls				: 'repository_iconview',
    itemSelector	: 'dd',
    overClass		: 'over',
	selectedClass	: 'selected',
    tpl : new Ext.XTemplate(
        '<div>',
			'<dl>',
            '<tpl for=".">',
				'<dd>',
				'<div class="image"><img src="{icon}" title="{title}"/></div>',
	            '<div><span class="title" title="{[ values.title.length + (values.type.length*0.8) > 30 ? values.title : "" ]}">{[ values.title.truncate(30 - (values.type.length*0.8)) ]}</span><span class="author" unselectable="on">({type})</span></div>',
	            '<div><span class="type">{author}</span></div>',
				'</dd>',
            '</tpl>',
			'</dl>',
        '</div>'
    )
});

/**
 * Copyright (c) 2008
 * Sven Wagner-Boysen
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 **/

// define plugin namespace

if(!Repository.Plugins) Repository.Plugins = {};

Repository.Plugins.TableView = {
	construct: function(facade) {
		this.name = Repository.I18N.TableView.name;
		this.icon = '/backend/images/silk/application_view_columns.png';
		this.numOfDisplayedModels = 30;
		
		// define required data uris
		this.dataUris = ["/meta"];
		
		arguments.callee.$.construct.apply(this, arguments); // call superclass constructor
		
		if( this.parentPanel.ownerCt ){
			this.parentPanel.ownerCt.addListener('resize', function(panel, adjWidth, adjHeigth, rawWidth, rawHeight){
												if (this.facade.getCurrentView() == this) {
													this.setWidth(adjWidth)
												}
											}.bind(this));
		}
	},
	
	
	
	render : function(modelData) {
		
		if( this.tablePanel ){
			this.panel.remove( this.tablePanel )
		}
		
		var data = [];
		modelData.each(function( pair ){
			var stencilset = pair.value.type;
			// Try to display stencilset title instead of uri
			this.facade.modelCache.getModelTypes().each(function(type){
				if (stencilset == type.namespace) {
					stencilset = type.title;
					return;
				}
			}.bind(this));
			
			pair.value.lastUpdate = pair.value.lastUpdate.substring(0,19);
			pair.value.creationDate = pair.value.creationDate.substring(0,19);
			
			data.push( [ pair.key, unescape(pair.value.title), stencilset, pair.value.author || 'Unknown', unescape(pair.value.summary).gsub('\n', ''), pair.value.creationDate, pair.value.lastUpdate ] )
		}.bind(this));
		
		/*var reader = new Ext.data.ArrayReader({},[
			{name: 'id'},
			{name: 'title'},
			{name: 'type'},
			{name: 'author'},
			{name: 'summary'},
			{name: 'creationDate', type: 'date', dateFormat: 'Y-M-D H:i:s.u'},
			{name: 'lastUpdate'}
		]);*/
		
		var store = new Ext.data.SimpleStore({
	        fields	: ['id', 'title', 'type', 'author', 'summary', 'creationDate', 'lastUpdate'],
	        //reader 	: reader,
			data	: data
	    });
		
		this.tablePanel = new Ext.grid.GridPanel({
			store		: store,
			border		:false,
			columns		: [ 
				{id: "title", header: Repository.I18N.TableView.columns.title, sortable: false, dataIndex: "title"},
				{id: "type", width: 50, header: Repository.I18N.TableView.columns.type, sortable: false, dataIndex: "type"},
				{id: "author", header: Repository.I18N.TableView.columns.author, sortable: false, dataIndex: "author"},
				{id: "summary", header: Repository.I18N.TableView.columns.summary, sortable: false, dataIndex: "summary"},
				{id: "creationDate", width: 70, header: Repository.I18N.TableView.columns.creationDate, sortable: false, dataIndex: "creationDate"},
				{id: "lastUpdate", width: 70, header: Repository.I18N.TableView.columns.lastUpdate, sortable: false, dataIndex: "lastUpdate"},
				{id: "id", width: 45, header: Repository.I18N.TableView.columns.id, sortable: false, dataIndex: "id"}
			],
			viewConfig: {
				forceFit 	: true
			},
			enableHdMenu 	: false,
			sm				: new Ext.grid.RowSelectionModel({listeners: {selectionchange: this._onSelectionChange.bind(this)}}),
			listeners		: {rowdblclick:this._onDblClick.bind(this)}		
		});
		
		this.panel.add(this.tablePanel);
		this.panel.doLayout(); // Force rendering to show the panel
		
		// Select the selected models
		var selIndicies = this.facade.getSelectedModels().map(function(modelid){ var id = this.facade.getDisplayedModels().indexOf(modelid); return id >= 0 ? id : null }.bind(this)).compact()
		this.tablePanel.getSelectionModel().selectRows( selIndicies )
		
	},
	
	setWidth: function(width){
		if( this.tablePanel ){
			this.tablePanel.setWidth( width );
			this.tablePanel.doLayout();
		}
	},
	
	_onSelectionChange: function(table){
		
		var ids = [];
		
		// Get the selection
		table.getSelections().each(function(entry){
			ids.push( entry.data.id );
		})
		
		// Change the selection
		this.facade.changeSelection( ids );
	},
	
	_onDblClick: function(grid, rowIndex, e){
		
		// Get the uri from the clicked model
		var id = grid.getStore().getAt(rowIndex).data.id;
		
		this.facade.openModelInEditor(id);
	}
};

Repository.Plugins.TableView = Repository.Core.ViewPlugin.extend(Repository.Plugins.TableView);


!(function(name, definition) {
    // 处理 Lib 的环境

    // define是否已经定义为函数
    var hasDefine = typeof define === 'function';
    // 是否为node环境
    var hasExports = typeof module !== 'undefined' && module.exports;

    if (hasDefine) {
        // AMD 或者 CMD 规范
        define(definition);
    } else if (hasExports) {
        // Node环境，导出EventPorxy
        module.exports = definition(require('debug')('eventproxy'));
    } else {
        this[name] = definition();
    }
})('EventProxy', function(debug) {
    debug = debug || function() {};

    var SLICE = Array.prototype.slice;
    var CONCAT = Array.prototype.concat;
    var ALL_EVENT = '__all__';

    /**
     * EventProxy接口
     */
    var EventProxy = function() {
        // 防止不使用new关键字进行实例化对象
        if (!(this instanceof EventProxy)) {
            return new EventProxy();
        }

        this._callbacks = {};
        this._fired = {};
    };

    /**
     * 添加事件监听和回调
     * @param {[type]}   ev       [description]
     * @param {Function} callback [description]
     */
    EventProxy.prototype.addListener = function(ev, callback) {
        debug('Add listener for %s', ev);
        this._callbacks[ev] = this._callbacks[ev] || [];
        this._callbacks[ev].push(callback);

        return this;
    };

    EventProxy.prototype.bind = EventProxy.prototype.addListener;

    EventProxy.prototype.on = EventProxy.prototype.addListener;

    EventProxy.prototype.subscribe = EventProxy.prototype.addListener;

    /**
     * 绑定一个事件，把绑定的回调放在所有回调的最前
     * @param  {[type]}   ev       [description]
     * @param  {Function} callback [description]
     * @return {[type]}            [description]
     */
    EventProxy.prototype.headbind = function(ev, callback) {
        debug('Add listener for %s', ev);
        this._callbacks[ev] = this._callbacks[ev] || [];
        this._callbacks[ev].unshift(callback);

        return this;
    };

    /**
     * 移除监听
     * @param  {[type]}   ev       [description]
     * @param  {Function} callback [description]
     * @return {[type]}            [description]
     */
    EventProxy.prototype.removeListener = function(ev, callback) {
        var calls = this._callbacks;

        if (!ev) {
            debug('remove all listener');
            this._callbacks = {};
            return ;
        };

        if (!callback) {
            calls[ev] = [];
            return ;
        }

        var list = calls[ev];
        if (list) {
            var len = list.length;
            for (var i = 0; i < len; i++) {
                if (list[i] === callback) {
                    debug('Remove a listener of %s', ev);
                    list[i] = null;
                }
            }
        }

        return this;
    };

    EventProxy.prototype.unbind = EventProxy.prototype.removeListener;

    /**
     * 移除事件
     * @param  {[type]} event [description]
     * @return {[type]}       [description]
     */
    EventProxy.prototype.removeAllListeners = function(event) {
        return this.unbind(event);
    };

    /**
     * 添加__all__事件监听
     * @param  {Function} callback [description]
     * @return {[type]}            [description]
     */
    EventProxy.prototype.bindForAll = function(callback) {
        this.bind(ALL_EVENT, callback);
    };

    /**
     * 删除__all__事件监听
     * @param  {Function} callback [description]
     * @return {[type]}            [description]
     */
    EventProxy.prototype.unbindForAll = function(callback) {
        this.unbind(ALL_EVENT, callback);
    };

    EventProxy.prototype.trigger = function(eventName, data) {
        var ev, callback, list, args;
        var i, len;
        var calls = this._callbacks;
        var both = 2;

        debug('Emit event %s with data %j', eventName, data);
        while(both--) {
            // __all__事件都会被触发
            ev = both ? eventName : ALL_EVENT;
            list = calls[ev];

            if (list) {
                len = list.length;
                for (i = 0; i < len; i++) {
                    if (!(callback = list[i])) {
                        list.splice(i, 1);
                        i--;
                        len--;
                    } else {
                        args = both ? SLICE.call(arguments, 1) : arguments;
                        callback.apply(this, args);
                    }
                }
            }
        }

        return this;
    };

    EventProxy.prototype.emit = EventProxy.prototype.trigger;

    EventProxy.prototype.fire = EventProxy.prototype.trigger;

    /**
     * 只触发一次
     * @param  {[type]}   ev       [description]
     * @param  {Function} callback [description]
     * @return {[type]}            [description]
     */
    EventProxy.prototype.once = function(ev, callback) {
        var self = this;

        var wrapper = function() {
            callback.apply(self, arguments);
            self.unbind(ev, wrapper);
        };

        this.bind(ev, wrapper);

        return this;
    };

    var later = typeof process !== 'undefined' && process.nextTick || function(fn) {
        setTimeout(fn, 0);
    };

    /**
     * 下一个时间周期触发时间
     * 防止回调同步情况下，事件绑定无法处理
     * @return {[type]} [description]
     */
    EventProxy.prototype.emitLater = function() {
        var self = this;
        var args = arguments;

        later(function() {
            self.trigger.apply(self, args);
        });
    };

    /**
     * 立即触发
     * @param  {[type]}   ev       [description]
     * @param  {Function} callback [description]
     * @param  {[type]}   data     [description]
     * @return {[type]}            [description]
     */
    EventProxy.prototype.immediate = function(ev, callback, data) {
        this.bind(ev, callback);
        this.trigger(ev, data);

        return this;
    };

    EventProxy.prototype.asap = EventProxy.prototype.immediate;

    var _assign = function(eventName1, eventName2, cb, once) {
        var proxy = this;
        var argsLength = arguments.length;
        var times = 0;
        var flag = {};

        if (argsLength < 3) {
            return this;
        }

        // 得到参数
        var events = SLICE.call(arguments, 0, -2);
        var callback = arguments[argsLength - 2];
        var isOnce = arguments[argsLength - 1];

        if (typeof callback !== 'function') {
            return this;
        }

        debug('Assign listener for events %j, once is %s', events, !!isOnce);
        var bind = function(key) {
            // 绑定事件回调，添加data给_fire[key]的data对象
            var method = isOnce ? 'once' : 'bind';
            proxy[method](key, function(data) {
                proxy._fired[key] = proxy._fired[key] || {};
                proxy._fired[key].data = data;

                if (!flag[key]) {
                    flag[key] = true;
                    times++;
                }
            });
        };

        var length = events.length;
        for (var i = 0; i < length; i++) {
            bind(events[i]);
        }

        var _all = function(event) {
            if (times < length) {
                return ;
            }

            if (!flag[event]) {
                return ;
            }

            var data = [];
            for (var i = 0; i < length; i++) {
                data.push(proxy._fired[events[i]].data);
            }

            if (isOnce) {
                proxy.unbindForAll(_all);
            }

            debug('Events %j all emited with data %j', events, data);
            callback.apply(null, data);
        };

        proxy.bindForAll(_all);
    };

    /**
     * 分配所有的事件
     * 等待所有事件完成后触发
     * @param  {[type]}   eventName1 [description]
     * @param  {[type]}   eventName2 [description]
     * @param  {Function} callback   [description]
     * @return {[type]}              [description]
     */
    EventProxy.prototype.all = function(eventName1, eventName2, callback) {
        var args = CONCAT.apply([], arguments);
        args.push(true);
        _assign.apply(this, args);

        return this;
    };

    EventProxy.prototype.assign = EventProxy.prototype.all;

    /**
     * 错误处理
     * @param  {Function} callback [description]
     * @return {[type]}            [description]
     */
    EventProxy.prototype.fail = function(callback) {
        var that = this;

        this.once('error', function(err) {
            that.unbind();
            callback.apply(null, arguments);
        });

        return this;
    };

    /**
     * 分配任务
     * @return {[type]} [description]
     */
    EventProxy.prototype.tail = function() {
        var args = CONCAT.apply([], arguments);
        args.push(false);
        _assign.apply(this, args);

        return this;
    };

    EventProxy.prototype.assignAll = EventProxy.prototype.tail;

    EventProxy.prototype.assignAlways = EventProxy.prototype.tail;

    /**
     * 触发指定次数之后，才执行回调
     * @param  {[type]}   eventName [description]
     * @param  {[type]}   times     [description]
     * @param  {Function} callback  [description]
     * @return {[type]}             [description]
     */
    EventProxy.prototype.after = function (eventName, times, callback) {
        if (times === 0) {
          callback.call(null, []);
          return this;
        }

        var proxy = this;
        var firedData = [];
        this._after = this._after || {};
        var group = eventName + '_group';
        this._after[group] = {
          index: 0,
          results: []
        };
        debug('After emit %s times, event %s\'s listenner will execute', times, eventName);
        var all = function (name, data) {
            if (name === eventName) {
                times--;
                firedData.push(data);
                if (times < 1) {
                    debug('Event %s was emit %s, and execute the listenner', eventName, times);
                    proxy.unbindForAll(all);
                    callback.apply(null, [firedData]);
                }
            }

            if (name === group) {
                times--;
                proxy._after[group].results[data.index] = data.result;
                if (times < 1) {
                    debug('Event %s was emit %s, and execute the listenner', eventName, times);
                    proxy.unbindForAll(all);
                    callback.call(null, proxy._after[group].results);
                }
            }
        };

        proxy.bindForAll(all);
        return this;
    };

    EventProxy.prototype.group = function(eventName, callback) {
        var that = this;
        var group = eventName + '_group';
        var index = that._after[group].index;
        that._after[group].index++;

        return function (err, data) {
            if (err) {
                // put all arguments to the error handler
                return that.emit.apply(that, ['error'].concat(SLICE.call(arguments)));
            }

            that.emit(group, {
                index: index,
                // callback(err, args1, args2, ...)
                result: callback ? callback.apply(null, SLICE.call(arguments, 1)) : data
            });
        };
    };

    /**
     * 触发任意一个事件都将执行该回调
     * @return {[type]} [description]
     */
    EventProxy.prototype.any = function() {
        var proxy = this;
        var callback = arguments[arguments.length - 1];
        var events = SLICE.call(arguments, 0, -1);
        var _eventName = events.join("_");

        proxy.once(_eventName, callback);

        var _bind = function (key) {
            proxy.bind(key, function (data) {
                debug('One of events %j emited, execute the listenner');
                proxy.trigger(_eventName, {"data": data, eventName: key});
            });
        };

        for (var index = 0; index < events.length; index++) {
            _bind(events[index]);
        }
    };

    /**
     * 不是指定的事件时，都将触发该回调
     * @param  {[type]}   eventName [description]
     * @param  {Function} callback  [description]
     * @return {[type]}             [description]
     */
    EventProxy.prototype.not = function(eventName, callback) {
        var proxy = this;

        proxy.bindForAll(function(name, data) {
            if (name !== eventName) {
                callback(data);
            }
        });
    };

    EventProxy.prototype.done = function(handler, callback) {
        var that = this;

        return function(err, data) {
            if (err) {
                return that.emit.apply(that, ['error'].concat(SLICE.call(arguments)));
            }

            var args = SLICE.call(arguments, 1);
            if (typeof handler === 'string') {
                if (callback) {
                  // only replace the args when it really return a result
                  return that.emit(handler, callback.apply(null, args));
                } else {
                  // put all arguments to the done handler
                  //ep.done('some');
                  //ep.on('some', function(args1, args2, ...){});
                  return that.emit.apply(that, [handler].concat(args));
                }
            }

            if (arguments.length <= 2) {
                return handler(data);
            }

            handler.apply(null, args);
        };
    };

    /**
     * 异步done
     * @param  {[type]}   handler  [description]
     * @param  {Function} callback [description]
     * @return {[type]}            [description]
     */
    EventProxy.prototype.doneLater = function(handler, callback) {
        var _doneHandler = this.done(handler, callback);
            return function (err, data) {
            var args = arguments;
            later(function () {
                _doneHandler.apply(null, args);
            });
        };
    };

    /**
     * 创建一个proxy实例
     * @return {[type]} [description]
     */
    EventProxy.create = function() {
        var ep = new EventProxy();
        var args = CONCAT.apply([], arguments);
        if (args.length) {
            var errorHandler = args[args.length - 1];
            var callback = args[args.length - 2];
            if (typeof errorHandler === 'function' && typeof callback === 'function') {
                args.pop();
                ep.fail(errorHandler);
            }

            ep.assign.apply(ep, args);
        }

        return ep;
    };

    EventProxy.EventProxy = EventProxy;

    return EventProxy;
});

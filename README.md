# node-event-fun #

## Node事件代理工具 ##

### 使用EventProxy ###

```
// var ep = EventProxy.create();
var EventProxy = require('EventPorxy').EventProxy;
var ep = new EventProxy();
```

### API ###

```
// bind, on, subscribe
addListener(event, callback)

headbind(event, callback);

// unbind
removeListeners(event, callback)

// \__all__
bindForAll(callback)

//
unbindForAll(callback)

// emit, fire
trigger(event, data)

once(event, callback)

// asap
immediate(event, callback, data)

// asign
all(eventName1, eventName2, callback)

fail(callback)

// assignAll, assignAlway
tail()

afert()

group()

any()

not()

done()

doneLater()
```

## 其它 ##

原地址：[EventProxy](https://github.com/JacksonTian/eventproxy)

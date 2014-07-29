# JavaScript ECDC

## Architecture

```
                     [Workers: EcdcWorker]
                     /                   \
        Tasks: XHR  /                     \  Messages: postMessage
                   /      Page: html       \
    [Server: EcdcServer] ------------ [Browser: EcdcClient] --- [User]
       |                                 |
    [Database: Any]                   [Storage: localStorage]
```

## Basic logic

 1. User uses Browser browses Server's page
 2. Initialised EcdcClient client
 3. EcdcClient spawns Workers
 4. EcdcClient cleanups local expired tasks (located in Storage)
 5. EcdcClient forces one worker to deliver complete but unsend tasks (located in Storage)
 6. EcdcClient awakens workers
 7. Workers gets tasks(if any) from Storage (EcdcClient is proxy)
 8. Workers gets tasks via XHR from Server and puts received tasks via postMessage into Storage (EcdcClient is proxy)
 9. Workers calculates tasks
 10. Workers puts tasks into Storage (EcdcClient is proxy)
 11. Workers posts tasks to Server
 12. Server saves task to Database
 13. Server returns bunch of tasks to Worker

and so on...

## Example - Md5 brute force server

 * `npm install`
 * Run `node example/md5-bruteforce-server`
 * Browse `http://127.0.0.1:8080/index.html`

Worker requires WebWorkers API, localStorage, XMLHttpRequest, JSON (all modern browsers, expect mobile)
this behavior can be configured by overriding method `EcdcClient.prototype.isActive`

### Static setup

I use node.js for distribution of static files. You can use nginx, lighthttpd. `controllers/StaticController.js` caches
all static files and returns them on request.

### Md5 brute force server routes

 * `POST /login/` - Login
 * `GET /logout/` - Logout
 * `GET /task/` - Gets task
 * `POST /task/` - Saves task
 * `GET '/stat.:format?'` - Statistic in html (default) or json

### Server setup

You have to overwrite these EcdcServer methods (browse source for details):

 * `EcdcServer.prototype.isOwnUser` (**synchronous**) checks if current user is own
 * `EcdcServer.prototype.saveTask` (**asynchronous**) checks and saves received task
 * `EcdcServer.prototype.createUserId` (**asynchronous**) generates  user id on login
 * `EcdcServer.prototype.createTasks` (**asynchronous**) creates task, format:


    {
        id: Math.round(Math.random() * 1e16), // some task id Number or String
        data: Math.random(), // current task data Mixed
        expires: (new Date(+new Date() + 3 * 60 * 60 * 1000)).toString() // Task expires time Date String
    }

Also you can overwrite default action methods or routes: `postTaskAction`, `getTaskAction`, `getLoginAction`, `_setupRoutes`

See `Md5BruteForceServer.js` for details

### Client setup

Create EcdcClient instance

    var client = new EcdcClient({
        script: '/Md5BruteForceWorker.js', // Path to worker script
        count: 1,                          // Workers count 1..N
        autoStart: false                   // Auto start?
    });

1 Worker is enough (1 CPU 100% load)

You can overwrite these EcdcClient events:

  * `EcdcClient.prototype.onUnauthorized` 403 on any request
  * `EcdcClient.prototype.onNoTasks` Server returns empty task list
  * `EcdcClient.prototype.onLock` Client is locked by another client (two+ clients in same browser can't calculate in same time)
  * `EcdcClient.prototype.onUnlock` Client unlocked

### Worker setup

Include via `importScripts` required files `/EcdcWorker.js`, `/md5.js` and `/NumberConverter.js` then setup worker options:

  * `EcdcWorker.prototype.MAX_TASKS_BUFFER` default: 1 - Accumulates N tasks then post all to server
  * `EcdcWorker.prototype.LOG_LEVEL` 1 - log is on, 0 - off
  * `EcdcWorker.prototype.URL` default: '/task/' - REST Path
  * `EcdcWorker.prototype.MAX_TASK_COMPUTING_TIME` default: 5min - max calculation time for one task after that time task ll be internally expired

then overwrite `EcdcWorker.prototype.calculateSync` (asynchronous version) or `EcdcWorker.prototype.calculate` (synchronous version, faster then asynchronous)

    /**
     * Calculates MD5
     *
     * @param {Number} id         task id
     * @param {Object} data       task data
     * @param {Number} data.max   start of passwords range eg 1
     * @param {Number} data.min   end of passwords range, eg 154778
     * @param {Number} data.base  password base eg 96 10 15 etc
     * @param {String} data.hash  password md5 hash
     *
     * @returns {Object} task result
     */
    EcdcWorker.prototype.calculateSync = function (id, data) {
        var maxPasswordId = data.max,
            password,
            alphabetBase = data.base,
            hash = data.hash;

        for (var i = data.min; i <= maxPasswordId; i++) {
            // convert password id to real password
            // then take md5 from password
            password = from10toN(i, alphabetBase);
            if (md5(password) === hash) { // tada!
                return {id: id, data: password}; // found - return password
            }
        }

        return {id: id, data: ""}; // not found
    };

(function `from10toN` converts number in 10th numeral system to Nth in our case N = 96)

Then start worker in synchronous mode (pass true to EcdcWorker), default is asynchronous

    var worker = new EcdcWorker(true);

### Results

Md5 brute force server uses sqlite3 database located by default in `database/ecdc.sqlite3` to store results of completed tasks, format:

    CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY, expires INTEGER, done SMALLINT, user CHARACTER(32))

but you can use `:memory:` (browse `Md5BruteForceServer.js` for details). A plain file `database/result.txt` to store password (if found).

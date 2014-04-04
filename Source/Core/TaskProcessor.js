/*global define*/
define([
        'require',
        './buildModuleUrl',
        './defaultValue',
        './defined',
        './destroyObject',
        './isCrossOriginUrl',
        '../ThirdParty/when',
        '../ThirdParty/Uri'
    ], function(
        require,
        buildModuleUrl,
        defaultValue,
        defined,
        destroyObject,
        isCrossOriginUrl,
        when,
        Uri) {
    "use strict";

    var canTransferArrayBufferResult;

    function canTransferArrayBuffer() {
        if (!defined(canTransferArrayBufferResult)) {
            var worker = new Worker(getWorkerUrl('Workers/transferTypedArrayTest.js'));
            worker.postMessage = defaultValue(worker.webkitPostMessage, worker.postMessage);

            var value = 100;
            var array = new Int8Array([value]);

            try {
                // postMessage might fail with a DataCloneError
                // if transferring array buffers is not supported.
                worker.postMessage({
                    array : array
                }, [array.buffer]);
            } catch (e) {
                canTransferArrayBufferResult = false;
                return false;
            }

            var deferred = when.defer();

            worker.onmessage = function(event) {
                var array = event.data.array;

                // some versions of Firefox silently fail to transfer typed arrays.
                // https://bugzilla.mozilla.org/show_bug.cgi?id=841904
                // Check to make sure the value round-trips successfully.
                var result = defined(array) && array[0] === value;
                deferred.resolve(result);

                worker.terminate();

                canTransferArrayBufferResult = result;
            };

            canTransferArrayBufferResult = deferred;
        }

        return canTransferArrayBufferResult;
    }

    function completeTask(processor, data) {
        --processor._activeTasks;

        var id = data.id;
        if (!defined(id)) {
            // This is not one of ours.
            return;
        }

        var deferreds = processor._deferreds;
        var deferred = deferreds[id];

        if (defined(data.error)) {
            deferred.reject(data.error);
        } else {
            deferred.resolve(data.result);
        }

        delete deferreds[id];
    }

    function getWorkerUrl(moduleID) {
        var url = buildModuleUrl(moduleID);

        if (isCrossOriginUrl(url)) {
            //to load cross-origin, create a shim worker from a blob URL
            var script = 'importScripts("' + url + '");';

            var blob;
            try {
                blob = new Blob([script], {
                    type : 'application/javascript'
                });
            } catch (e) {
                var BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder || window.MSBlobBuilder;
                var blobBuilder = new BlobBuilder();
                blobBuilder.append(script);
                blob = blobBuilder.getBlob('application/javascript');
            }

            var URL = window.URL || window.webkitURL;
            url = URL.createObjectURL(blob);
        }

        return url;
    }

    var bootstrapperUrlResult;
    function getBootstrapperUrl() {
        if (!defined(bootstrapperUrlResult)) {
            bootstrapperUrlResult = getWorkerUrl('Workers/cesiumWorkerBootstrapper.js');
        }
        return bootstrapperUrlResult;
    }

    function createWorker(processor, canTransferArrayBuffer) {
        var worker = new Worker(getBootstrapperUrl());
        worker.postMessage = defaultValue(worker.webkitPostMessage, worker.postMessage);

        var bootstrapMessage = {
            loaderConfig : {},
            workerModule : TaskProcessor._workerModulePrefix + processor._workerName,
            canTransferArrayBuffer : canTransferArrayBuffer
        };

        if (defined(TaskProcessor._loaderConfig)) {
            bootstrapMessage.loaderConfig = TaskProcessor._loaderConfig;
        } else if (defined(require.toUrl)) {
            var baseUrl = new Uri('..').resolve(new Uri(buildModuleUrl('Workers/cesiumWorkerBootstrapper.js'))).toString();
            bootstrapMessage.loaderConfig.baseUrl = baseUrl;
        } else {
            bootstrapMessage.loaderConfig.paths = {
                'Workers' : buildModuleUrl('Workers')
            };
        }

        worker.postMessage(bootstrapMessage);

        worker.onmessage = function(event) {
            completeTask(processor, event.data);
        };

        processor._worker = worker;
    }

    /**
     * A wrapper around a web worker that allows scheduling tasks for a given worker,
     * returning results asynchronously via a promise.
     *
     * The Worker is not constructed until a task is scheduled.
     *
     * @alias TaskProcessor
     * @constructor
     *
     * @param {String} workerName The name of the worker.  This is expected to be a script
     *                            in the Workers folder.
     * @param {Number} [maximumActiveTasks=5] The maximum number of active tasks.  Once exceeded,
     *                                        scheduleTask will not queue any more tasks, allowing
     *                                        work to be rescheduled in future frames.
     */
    var TaskProcessor = function(workerName, maximumActiveTasks) {
        this._workerName = workerName;
        this._maximumActiveTasks = defaultValue(maximumActiveTasks, 5);
        this._activeTasks = 0;
        this._deferreds = {};
        this._nextID = 0;
    };

    var emptyTransferableObjectArray = [];

    /**
     * Schedule a task to be processed by the web worker asynchronously.  If there are currently more
     * tasks active than the maximum set by the constructor, will immediately return undefined.
     * Otherwise, returns a promise that will resolve to the result posted back by the worker when
     * finished.
     *
     * @param {*} parameters Any input data that will be posted to the worker.
     * @param {Array} [transferableObjects] An array of objects contained in parameters that should be
     *                                      transferred to the worker instead of copied.
     * @returns {Promise} Either a promise that will resolve to the result when available, or undefined
     *                    if there are too many active tasks,
     *
     * @example
     * var taskProcessor = new Cesium.TaskProcessor('myWorkerName');
     * var promise = taskProcessor.scheduleTask({
     *     someParameter : true,
     *     another : 'hello'
     * });
     * if (!Cesium.defined(promise)) {
     *     // too many active tasks - try again later
     * } else {
     *     Cesium.when(promise, function(result) {
     *         // use the result of the task
     *     });
     * }
     */
    TaskProcessor.prototype.scheduleTask = function(parameters, transferableObjects) {
        var processor = this;
        return when(canTransferArrayBuffer(), function(canTransferArrayBuffer) {
            if (!defined(processor._worker)) {
                createWorker(processor, canTransferArrayBuffer);
            }

            if (processor._activeTasks >= processor._maximumActiveTasks) {
                return undefined;
            }

            ++processor._activeTasks;

            if (!defined(transferableObjects)) {
                transferableObjects = emptyTransferableObjectArray;
            }

            var id = this._nextID++;
            var deferred = when.defer();
            this._deferreds[id] = deferred;

            this._worker.postMessage({
                id : id,
                parameters : parameters
            }, transferableObjects);

            return deferred.promise;
        });
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof TaskProcessor
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see TaskProcessor#destroy
     */
    TaskProcessor.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys this object.  This will immediately terminate the Worker.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof TaskProcessor
     *
     * @returns {undefined}
     */
    TaskProcessor.prototype.destroy = function() {
        if (defined(this._worker)) {
            this._worker.terminate();
        }
        return destroyObject(this);
    };

    // exposed for testing purposes
    TaskProcessor._defaultWorkerModulePrefix = 'Workers/';
    TaskProcessor._workerModulePrefix = TaskProcessor._defaultWorkerModulePrefix;
    TaskProcessor._loaderConfig = undefined;

    return TaskProcessor;
});

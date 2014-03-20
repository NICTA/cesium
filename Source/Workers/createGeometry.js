/*global define*/
define([
        'require',
        './createTaskProcessorWorker',
        '../Core/defined',
        '../Core/GeometryPacker',
        '../Scene/PrimitivePipeline',
        '../ThirdParty/when'
    ], function(
        require,
        createTaskProcessorWorker,
        defined,
        GeometryPacker,
        PrimitivePipeline,
        when) {
    "use strict";

    var moduleCache = {};

    function runTask(task, createFunction, transferableObjects, results) {
        var geometry = createFunction(task.geometry);
        //PrimitivePipeline.transferGeometry(geometry, transferableObjects);
        results.push(geometry);
    }

    function createTask(moduleName, deferred, task, createFunction, transferableObjects, results) {
        return function(createFunction) {
            moduleCache[moduleName] = createFunction;
            runTask(task, createFunction, transferableObjects, results);
            deferred.resolve();
        };
    }

    function createGeometry(parameters, transferableObjects) {
        //var start = Date.now();

        var subTasks = parameters.subTasks;

        var results = [];
        var promises = [];
        var deferred = when.defer();

        for (var i = 0; i < subTasks.length; i++) {
            var task = subTasks[i];
            var moduleName = task.moduleName;
            if (defined(moduleName)) {
                var createFunction = moduleCache[moduleName];
                if (defined(createFunction)) {
                    runTask(task, createFunction, transferableObjects, results);
                } else {
                    var innedDeferred = when.defer();
                    require(['./' + moduleName], createTask(moduleName, innedDeferred, task, createFunction, transferableObjects, results));
                    promises.push(innedDeferred.promise);
                }
            } else {
                //preexisting geometry
                results.push(task.geometry);
            }
        }
        when.all(promises, function() {
            var names = [];
            var packedData = GeometryPacker.packForCreateGeoemtry(results, names);
            transferableObjects.push(packedData.buffer);
            deferred.resolve({
                names : names,
                data : packedData
            });
            //console.log("THREAD: createGeometry: " + ((Date.now() - start) / 1000.0).toFixed(3) + " seconds");
        });

        return deferred.promise;
    }

    return createTaskProcessorWorker(createGeometry);
});

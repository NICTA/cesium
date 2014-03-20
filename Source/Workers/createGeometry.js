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
        results.push({
            geometry : geometry,
            index : task.index
        });
    }

    function createTask(moduleName, deferred, task, createFunction, transferableObjects, results) {
        return function(createFunction) {
            moduleCache[moduleName] = createFunction;
            runTask(task, createFunction, transferableObjects, results);
            deferred.resolve();
        };
    }

    function createGeometry(parameters, transferableObjects) {
        //console.log("createGeometry START " + new Date().getSeconds());
        var subTasks = parameters.subTasks;

        var results = [];
        var promises = [];
        var deferred = when.defer();

        for (var i = 0; i < subTasks.length; i++) {
            var task = subTasks[i];
            var moduleName = task.moduleName;
            var createFunction = moduleCache[moduleName];
            if (defined(createFunction)) {
                runTask(task, createFunction, transferableObjects, results);
            } else {
                var innedDeferred = when.defer();
                require(['./' + moduleName], createTask(moduleName, innedDeferred, task, createFunction, transferableObjects, results));
                promises.push(innedDeferred.promise);
            }
        }
        when.all(promises, function() {
            //console.log("createGeometry END " + new Date().getSeconds());
            var names = [];
            var packedData = GeometryPacker.pack(results, names);
            transferableObjects.push(packedData.buffer);
            deferred.resolve({
                names : names,
                data : packedData
            });
        });

        return deferred.promise;
    }

    return createTaskProcessorWorker(createGeometry);
});

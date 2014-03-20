/*global define*/
define([
        '../Core/Ellipsoid',
        '../Core/GeographicProjection',
        '../Core/Matrix4',
        '../Core/WebMercatorProjection',
        '../Core/GeometryPacker',
        '../Scene/PrimitivePipeline',
        './createTaskProcessorWorker'
    ], function(
        Ellipsoid,
        GeographicProjection,
        Matrix4,
        WebMercatorProjection,
        GeometryPacker,
        PrimitivePipeline,
        createTaskProcessorWorker) {
    "use strict";

    function combineGeometry(parameters, transferableObjects) {
        var start = Date.now();

        var results = parameters.results;
        var length = results.length;
        var instances = parameters.instances;
        var index = 0;
        for (var i = 0; i < length; i++) {
            var result = results[i];

            var geometries = GeometryPacker.unpackFromCreateGeometry(result.data, result.names);
            var geometriesLength = geometries.length;
            for (var x = 0; x < geometriesLength; x++) {
                instances[index++].geometry = geometries[x];
            }
        }

        parameters.ellipsoid = Ellipsoid.clone(parameters.ellipsoid);
        parameters.projection = parameters.isGeographic ? new GeographicProjection(parameters.ellipsoid) : new WebMercatorProjection(parameters.ellipsoid);
        parameters.modelMatrix = Matrix4.clone(parameters.modelMatrix);

        PrimitivePipeline.receiveInstances(parameters.instances);
        var combinedResult = PrimitivePipeline.combineGeometry(parameters);
        PrimitivePipeline.transferGeometries(combinedResult.geometries, transferableObjects);
        PrimitivePipeline.transferPerInstanceAttributes(combinedResult.vaAttributes, transferableObjects);
        if (typeof console !== 'undefined') {
            console.log("THREAD: combineGeometry: " + ((Date.now() - start) / 1000.0).toFixed(3) + " seconds");
        }

        return combinedResult;
    }

    return createTaskProcessorWorker(combineGeometry);
});

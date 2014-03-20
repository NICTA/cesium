/*global define*/
define(['../Core/defined'], function(defined) {
    "use strict";

    var GeometryPacker = {};

    GeometryPacker.pack = function(geometry) {
        console.log("GeometryPacker.pack START " + new Date().getSeconds());

        console.log("GeometryPacker.pack END " + new Date().getSeconds());
        return geometry;
    };

    GeometryPacker.unpack = function(packedGeometry) {
        console.log("GeometryPacker.unpack START " + new Date().getSeconds());

        console.log("GeometryPacker.unpack END " + new Date().getSeconds());
        return packedGeometry;
    };
    return GeometryPacker;
});

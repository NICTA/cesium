/*global define*/
define(['../Core/BoundingSphere',
        '../Core/Cartesian3',
        '../Core/ComponentDatatype',
        '../Core/defined',
        '../Core/Geometry'
    ], function(
        BoundingSphere,
        Cartesian3,
        ComponentDatatype,
        defined,
        Geometry) {
    "use strict";

    var GeometryPacker = {};

    function typedArrayConcat(lhs, rhs, count){
        for(var i = 0; i < rhs.length; i++){
            lhs[count++] = rhs[i];
        }
        return count;
    }

    GeometryPacker.pack = function(items) {
        //console.log("GeometryPacker.pack START " + new Date().getSeconds());

        var result = [];
        var count = 0;

        var length = items.length;
        for (var i = 0; i < length; i++) {
            var item = items[i];

            var index = item.index;
            var geometry = item.geometry;

            //index
            result[count++] = index;

            //type
            result[count++] = geometry.primitiveType;

            //BoundingSphere
            Cartesian3.pack(geometry.boundingSphere.center, result, count);
            count += 3;
            result[count++] = geometry.boundingSphere.radius;

            //indices
            result[count++] = geometry.indices.length;
            count = typedArrayConcat(result, geometry.indices, count);

            //attributes
            var attributes = geometry.attributes;
            var attributesToWrite = [];
            for ( var property in attributes) {
                if (attributes.hasOwnProperty(property) && defined(attributes[property])) {
                    attributesToWrite.push(property);
                }
            }

            result[count++] = attributesToWrite.length;
            for (var q = 0; q < attributesToWrite.length; q++) {
                var name = attributesToWrite[q];
                result[count++] = name;
                var attribute = attributes[name];
                result[count++] = attribute.componentDatatype.value;
                result[count++] = attribute.componentsPerAttribute;
                result[count++] = attribute.normalize;
                result[count++] = attribute.values.length;
                count = typedArrayConcat(result, attribute.values, count);
            }
        }

        //console.log("GeometryPacker.pack END " + new Date().getSeconds());
        return result;
    };

    GeometryPacker.unpack = function(packedGeometry) {
        //console.log("GeometryPacker.unpack START " + new Date().getSeconds());

        var result = [];

        var i = 0;
        while (i < packedGeometry.length) {
            var index = packedGeometry[i++];
            var primitiveType = packedGeometry[i++];

            //BoundingSphere
            var boundingSphere = new BoundingSphere(new Cartesian3(packedGeometry[i++], packedGeometry[i++], packedGeometry[i++]), packedGeometry[i++]);

            //indices
            var length = packedGeometry[i++];
            var indices = new Uint16Array(length);
            for (var q = 0; q < length; q++) {
                indices[q] = packedGeometry[i++];
            }

            //attributes
            var attributes = {};
            var numAttributes = packedGeometry[i++];
            for (var x = 0; x < numAttributes; x++) {
                var name = packedGeometry[i++];
                var attribute = attributes[name] = {};
                attribute.componentDatatype = ComponentDatatype.fromValue(packedGeometry[i++]);
                attribute.componentsPerAttribute = packedGeometry[i++];
                attribute.normalize = packedGeometry[i++];

                length = packedGeometry[i++];
                var values = ComponentDatatype.createTypedArray(attribute.componentDatatype, length);
                for (var p = 0; p < length; p++) {
                    values[p] = packedGeometry[i++];
                }
                attribute.values = values;
            }
            result.push({
                index : index,
                geometry : new Geometry({
                    primitiveType : primitiveType,
                    boundingSphere : boundingSphere,
                    indices : indices,
                    attributes : attributes
                })
            });
        }

        //console.log("GeometryPacker.unpack END " + new Date().getSeconds());
        return result;
    };
    return GeometryPacker;
});

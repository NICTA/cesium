/*global define*/
define(['../Core/BoundingSphere',
        '../Core/Cartesian3',
        '../Core/ComponentDatatype',
        '../Core/defined',
        '../Core/Geometry',
        '../Core/Color',
        '../Core/Matrix4'
    ], function(
        BoundingSphere,
        Cartesian3,
        ComponentDatatype,
        defined,
        Geometry,
        Color,
        Matrix4) {
    "use strict";

    var GeometryPacker = {};

    function typedArrayConcat(lhs, rhs, count) {
        for (var i = 0; i < rhs.length; i++) {
            lhs[count++] = rhs[i];
        }
        return count;
    }

    function createArrayForCreateGeoemtry(items) {
        var count = 0;

        var length = items.length;
        for (var i = 0; i < length; i++) {
            var geometry = items[i];

            //type
            //result[count++] = geometry.primitiveType;
            count++;

            //BoundingSphere
            //Cartesian3.pack(geometry.boundingSphere.center, result, count);
            //count += 3;
            //result[count++] = geometry.boundingSphere.radius;
            count += 4;

            //indices
            //result[count++] = geometry.indices.length;
            count++;
            //count = typedArrayConcat(result, geometry.indices, count);
            count += geometry.indices.length;

            //attributes
            var attributes = geometry.attributes;
            var attributesToWrite = [];
            for ( var property in attributes) {
                if (attributes.hasOwnProperty(property) && defined(attributes[property])) {
                    attributesToWrite.push(property);
                }
            }

            //result[count++] = attributesToWrite.length;
            count++;
            for (var q = 0; q < attributesToWrite.length; q++) {
                var name = attributesToWrite[q];
                var attribute = attributes[name];
                //result[count++] = name;
                //result[count++] = attribute.componentDatatype.value;
                //result[count++] = attribute.componentsPerAttribute;
                //result[count++] = attribute.normalize;
                //result[count++] = attribute.values.length;
                count += 5;
                //count = typedArrayConcat(result, attribute.values, count);
                count += attribute.values.length;
            }
        }
        return new Float64Array(count);
    }

    function createArrayForCombineGeoemtry(instances) {
        var count = 0;
        var length = instances.length;
        for (var i = 0; i < length; i++) {
            var instance = instances[i];

            //var matrix = instance.modelMatrix;
            //for (var x = 0; x < 16; x++) {
            //    result[count++] = matrix[x];
            //}
            count += 16;

            //attributes
            var attributes = instance.attributes;
            var attributesToWrite = [];
            for ( var property in attributes) {
                if (attributes.hasOwnProperty(property) && defined(attributes[property])) {
                    attributesToWrite.push(property);
                }
            }

            //result[count++] = attributesToWrite.length;
            count++;
            for (var q = 0; q < attributesToWrite.length; q++) {
                var name = attributesToWrite[q];
                var attribute = attributes[name];
                //result[count++] = meee[name];
                //result[count++] = attribute.componentDatatype.value;
                //result[count++] = attribute.componentsPerAttribute;
                //result[count++] = attribute.normalize;
                //result[count++] = attribute.value.length;
                count += 5;
                //count = typedArrayConcat(result, attribute.value, count);
                count += attribute.value.length;
            }
        }
        return new Float64Array(count);
    }

    GeometryPacker.packForCreateGeoemtry = function(items, stringTable) {
        //var start = Date.now();

        var result = createArrayForCreateGeoemtry(items);
        var count = 0;

        var meee = {};
        var mapCount = 0;

        var length = items.length;
        for (var i = 0; i < length; i++) {
            var geometry = items[i];

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
                    if (!defined(meee[property])) {
                        meee[property] = mapCount++;
                    }
                }
            }

            result[count++] = attributesToWrite.length;
            for (var q = 0; q < attributesToWrite.length; q++) {
                var name = attributesToWrite[q];
                result[count++] = meee[name];
                var attribute = attributes[name];
                result[count++] = attribute.componentDatatype.value;
                result[count++] = attribute.componentsPerAttribute;
                result[count++] = attribute.normalize;
                result[count++] = attribute.values.length;
                count = typedArrayConcat(result, attribute.values, count);
            }
        }
        for ( var n in meee) {
            if (meee.hasOwnProperty(n)) {
                stringTable[meee[n]] = n;
            }
        }
        //console.log("THREAD: GeometryPacker.packForCreateGeoemtry: " + ((Date.now() - start) / 1000.0).toFixed(3) + " seconds");
        return result;
    };

    GeometryPacker.unpackFromCreateGeometry = function(packedGeometry, stringTable) {
        //var start = Date.now();

        var result = [];

        var i = 0;
        while (i < packedGeometry.length) {
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
                var name = stringTable[packedGeometry[i++]];
                var attribute = attributes[name] = {};
                attribute.componentDatatype = ComponentDatatype.fromValue(packedGeometry[i++]);
                attribute.componentsPerAttribute = packedGeometry[i++];
                attribute.normalize = packedGeometry[i++] !== 0;

                length = packedGeometry[i++];
                var values = ComponentDatatype.createTypedArray(attribute.componentDatatype, length);
                for (var p = 0; p < length; p++) {
                    values[p] = packedGeometry[i++];
                }
                attribute.values = values;
            }
            result.push(new Geometry({
                primitiveType : primitiveType,
                boundingSphere : boundingSphere,
                indices : indices,
                attributes : attributes
            }));
        }

        //console.log("GeometryPacker.unpackFromCreateGeometry: " + ((Date.now() - start) / 1000.0).toFixed(3) + " seconds");
        return result;
    };

    GeometryPacker.packInstancesForCombine = function(instances, stringTable) {
        //var start = Date.now();

        var result = createArrayForCombineGeoemtry(instances);
        var count = 0;

        var meee = {};
        var mapCount = 0;

        var length = instances.length;
        for (var i = 0; i < length; i++) {
            var instance = instances[i];

            var matrix = instance.modelMatrix;
            for (var x = 0; x < 16; x++) {
                result[count++] = matrix[x];
            }

            //attributes
            var attributes = instance.attributes;
            var attributesToWrite = [];
            for ( var property in attributes) {
                if (attributes.hasOwnProperty(property) && defined(attributes[property])) {
                    attributesToWrite.push(property);
                    if (!defined(meee[property])) {
                        meee[property] = mapCount++;
                    }
                }
            }

            result[count++] = attributesToWrite.length;
            for (var q = 0; q < attributesToWrite.length; q++) {
                var name = attributesToWrite[q];
                result[count++] = meee[name];
                var attribute = attributes[name];
                result[count++] = attribute.componentDatatype.value;
                result[count++] = attribute.componentsPerAttribute;
                result[count++] = attribute.normalize;
                result[count++] = attribute.value.length;
                count = typedArrayConcat(result, attribute.value, count);
            }
        }
        for ( var n in meee) {
            if (meee.hasOwnProperty(n)) {
                stringTable[meee[n]] = n;
            }
        }
        //console.log("THREAD: GeometryPacker.packInstancesForCombine: " + ((Date.now() - start) / 1000.0).toFixed(3) + " seconds");
        return result;
    };

    GeometryPacker.unpackInstancesForCombine = function(packedInstances, stringTable) {
        //var start = Date.now();

        var result = [];

        var i = 0;
        while (i < packedInstances.length) {
            var modelMatrix = new Matrix4();
            for (var q = 0; q < 16; q++) {
                modelMatrix[q] = packedInstances[i++];
            }

            //attributes
            var attributes = {};
            var numAttributes = packedInstances[i++];
            for (var x = 0; x < numAttributes; x++) {
                var name = stringTable[packedInstances[i++]];
                var attribute = attributes[name] = {};
                attribute.componentDatatype = ComponentDatatype.fromValue(packedInstances[i++]);
                attribute.componentsPerAttribute = packedInstances[i++];
                attribute.normalize = packedInstances[i++] !== 0;

                var length = packedInstances[i++];
                var values = ComponentDatatype.createTypedArray(attribute.componentDatatype, length);
                for (var p = 0; p < length; p++) {
                    values[p] = packedInstances[i++];
                }
                attribute.value = values;
            }
            result.push({
                attributes : attributes,
                modelMatrix : modelMatrix
            });
        }

        //console.log("GeometryPacker.unpackFromCreateGeometry: " + ((Date.now() - start) / 1000.0).toFixed(3) + " seconds");
        return result;
    };

    GeometryPacker.packPickIds = function(pickIds) {
        var length = pickIds.length;
        var result = new Uint16Array(pickIds.length);
        var q = 0;
        for (var i = 0; i < length; ++i) {
            result[i] = pickIds[i].toRgba();
        }
        return result;
    };

    GeometryPacker.unpackPickIds = function(packedPickIds) {
        var length = packedPickIds.length;
        var result = new Array(length);
        for (var i = 0; i < length; i++) {
            result[i] = Color.fromRgba(packedPickIds[i]);
        }
        return result;
    };

    return GeometryPacker;
});

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


    function createArrayForCombineGeoemtry(instances) {
        var count = 1;
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
                //result[count++] = stringHash[name];
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

    function createArrayForAttributeLocations(attributeLocations) {
        var length = attributeLocations.length;
        var count = 1;
        //result[count++] = length;
        for (var i = 0; i < length; i++) {
            var instance = attributeLocations[i];

            var propertiesToWrites = [];
            for ( var propertyName in instance) {
                if (instance.hasOwnProperty(propertyName) && defined(instance[propertyName])) {
                    propertiesToWrites.push(propertyName);
                }
            }

            //result[count++] = propertiesToWrites.length;
            count++;
            for (var q = 0; q < propertiesToWrites.length; q++) {
                var name = propertiesToWrites[q];
                var property = instance[name];
                //result[count++] = stringHash[name];
                count++;
                //result[count++] = property.dirty;
                count++;

                var indices = property.indices;
                var indicesLength = indices.length;
                //result[count++] = indicesLength;
                count++;
                for (var x = 0; x < indicesLength; x++) {
                    //var index = indices[x];
                    //result[count++] = index.count;
                    //result[count++] = index.offset;
                    //var tableIndex = attributeTable.indexOf(attribute.values);
                    //if (tableIndex === -1) {
                    //tableIndex = attributeTable.length;
                    //attributeTable.push(attribute.values);
                    //}
                    //result[count++] = tableIndex;
                    //attributeTable.push(attribute.values);
                    count += 3;
                }

                //result[count++] = property.value.length;
                //count = typedArrayConcat(result, property.value, count);
                count++;
                count += property.value.length;
            }
        }
        return new Float64Array(count);
    }

    GeometryPacker.packInstancesForCombine = function(instances, transferableObjects) {
        var result = createArrayForCombineGeoemtry(instances);
        var stringHash = {};
        var stringTable = [];

        var length = instances.length;
        var count = 0;
        result[count++] = length;
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
                    if (!defined(stringHash[property])) {
                        stringHash[property] = stringTable.length;
                        stringTable.push(property);
                    }
                }
            }

            result[count++] = attributesToWrite.length;
            for (var q = 0; q < attributesToWrite.length; q++) {
                var name = attributesToWrite[q];
                result[count++] = stringHash[name];
                var attribute = attributes[name];
                result[count++] = attribute.componentDatatype.value;
                result[count++] = attribute.componentsPerAttribute;
                result[count++] = attribute.normalize;
                result[count++] = attribute.value.length;
                result.set(attribute.value, count);
                count += attribute.value.length;
            }
        }
        transferableObjects.push(result.buffer);

        return {
            stringTable : stringTable,
            packedData : result
        };
    };

    GeometryPacker.unpackInstancesForCombine = function(data) {
        var packedInstances = data.packedData;
        var stringTable = data.stringTable;
        var result = new Array(packedInstances[0]);
        var count = 0;

        var i = 1;
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
            result[count++] = {
                attributes : attributes,
                modelMatrix : modelMatrix
            };
        }

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

    GeometryPacker.packAttributeLocations = function(attributeLocations) {
        var stringTable = [];
        var attributeTable = [];

        var stringHash = {};
        var result = createArrayForAttributeLocations(attributeLocations);
        var length = attributeLocations.length;
        var count = 0;
        result[count++] = length;
        for (var i = 0; i < length; i++) {
            var instance = attributeLocations[i];

            var propertiesToWrites = [];
            for ( var propertyName in instance) {
                if (instance.hasOwnProperty(propertyName) && defined(instance[propertyName])) {
                    propertiesToWrites.push(propertyName);
                    if (!defined(stringHash[propertyName])) {
                        stringHash[propertyName] = stringTable.length;
                        stringTable.push(propertyName);
                    }
                }
            }

            result[count++] = propertiesToWrites.length;
            for (var q = 0; q < propertiesToWrites.length; q++) {
                var name = propertiesToWrites[q];
                var property = instance[name];
                result[count++] = stringHash[name];
                result[count++] = property.dirty;

                var indices = property.indices;
                var indicesLength = indices.length;
                result[count++] = indicesLength;
                for (var x = 0; x < indicesLength; x++) {
                    var index = indices[x];
                    result[count++] = index.count;
                    result[count++] = index.offset;
                    var tableIndex = attributeTable.indexOf(index.attribute);
                    if (tableIndex === -1) {
                        tableIndex = attributeTable.length;
                        attributeTable.push(index.attribute);
                    }
                    result[count++] = tableIndex;
                }

                result[count++] = property.value.length;
                result.set(property.value, count);
                count += property.value.length;
            }
        }

        return {
            stringTable : stringTable,
            packedData : result,
            attributeTable : attributeTable
        };
    };

    GeometryPacker.unpackAttributeLocations = function(packedData, vaAttributes) {
        var stringTable = packedData.stringTable;
        var attributeTable = packedData.attributeTable;
        var packedAttributeLocations = packedData.packedData;

        var result = new Array(packedAttributeLocations[0]);
        var count = 0;

        var attributTableIndex = 0;
        var i = 1;
        while (i < packedAttributeLocations.length) {
            var instance = {};
            var numAttributes = packedAttributeLocations[i++];
            for (var x = 0; x < numAttributes; x++) {
                var name = stringTable[packedAttributeLocations[i++]];
                var property = instance[name] = {};
                property.dirty = packedAttributeLocations[i++] !== 0;
                var indices = new Array(packedAttributeLocations[i++]);
                for (var f = 0; f < indices.length; f++) {
                    var index = {};
                    index.count = packedAttributeLocations[i++];
                    index.offset = packedAttributeLocations[i++];
                    index.attribute = attributeTable[packedAttributeLocations[i++]];
                    indices[f] = index;
                }
                property.indices = indices;

                var zlength = packedAttributeLocations[i++];
                var values = ComponentDatatype.createTypedArray(indices[0].attribute.componentDatatype, zlength);
                for (var p = 0; p < zlength; p++) {
                    values[p] = packedAttributeLocations[i++];
                }
                property.value = values;
            }
            result[count++] = instance;
        }

        return result;
    };

    return GeometryPacker;
});
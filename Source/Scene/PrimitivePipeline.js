/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/Color',
        '../Core/ComponentDatatype',
        '../Core/defined',
        '../Core/defaultValue',
        '../Core/DeveloperError',
        '../Core/Ellipsoid',
        '../Core/FeatureDetection',
        '../Core/GeographicProjection',
        '../Core/Geometry',
        '../Core/GeometryAttribute',
        '../Core/GeometryPipeline',
        '../Core/Matrix4',
        '../Core/GeometryPacker',
        '../Core/WebMercatorProjection'
    ], function(
        BoundingSphere,
        Color,
        ComponentDatatype,
        defined,
        defaultValue,
        DeveloperError,
        Ellipsoid,
        FeatureDetection,
        GeographicProjection,
        Geometry,
        GeometryAttribute,
        GeometryPipeline,
        Matrix4,
        GeometryPacker,
        WebMercatorProjection) {
    "use strict";

    // Bail out if the browser doesn't support typed arrays, to prevent the setup function
    // from failing, since we won't be able to create a WebGL context anyway.
    if (!FeatureDetection.supportsTypedArrays()) {
        return {};
    }

    function transformToWorldCoordinates(instances, primitiveModelMatrix, allow3DOnly) {
        var toWorld = !allow3DOnly;
        var length = instances.length;
        var i;

        if (!toWorld && (length > 1)) {
            var modelMatrix = instances[0].modelMatrix;

            for (i = 1; i < length; ++i) {
                if (!Matrix4.equals(modelMatrix, instances[i].modelMatrix)) {
                    toWorld = true;
                    break;
                }
            }
        }

        if (toWorld) {
            for (i = 0; i < length; ++i) {
                GeometryPipeline.transformToWorldCoordinates(instances[i]);
            }
        } else {
            // Leave geometry in local coordinate system; auto update model-matrix.
            Matrix4.clone(instances[0].modelMatrix, primitiveModelMatrix);
        }
    }

    function addPickColorAttribute(instances, pickIds) {
        var length = instances.length;

        for (var i = 0; i < length; ++i) {
            var instance = instances[i];
            var geometry = instance.geometry;
            var attributes = geometry.attributes;
            var positionAttr = attributes.position;
            var numberOfComponents = 4 * (positionAttr.values.length / positionAttr.componentsPerAttribute);

            attributes.pickColor = new GeometryAttribute({
                componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
                componentsPerAttribute : 4,
                normalize : true,
                values : new Uint8Array(numberOfComponents)
            });

            var pickColor = pickIds[i];
            var red = Color.floatToByte(pickColor.red);
            var green = Color.floatToByte(pickColor.green);
            var blue = Color.floatToByte(pickColor.blue);
            var alpha = Color.floatToByte(pickColor.alpha);
            var values = attributes.pickColor.values;

            for (var j = 0; j < numberOfComponents; j += 4) {
                values[j] = red;
                values[j + 1] = green;
                values[j + 2] = blue;
                values[j + 3] = alpha;
            }
        }
    }

    function getCommonPerInstanceAttributeNames(instances) {
        var length = instances.length;

        var attributesInAllInstances = [];
        var attributes0 = instances[0].attributes;
        var name;

        for (name in attributes0) {
            if (attributes0.hasOwnProperty(name)) {
                var attribute = attributes0[name];
                var inAllInstances = true;

                // Does this same attribute exist in all instances?
                for (var i = 1; i < length; ++i) {
                    var otherAttribute = instances[i].attributes[name];

                    if (!defined(otherAttribute) ||
                        (attribute.componentDatatype.value !== otherAttribute.componentDatatype.value) ||
                        (attribute.componentsPerAttribute !== otherAttribute.componentsPerAttribute) ||
                        (attribute.normalize !== otherAttribute.normalize)) {

                        inAllInstances = false;
                        break;
                    }
                }

                if (inAllInstances) {
                    attributesInAllInstances.push(name);
                }
            }
        }

        return attributesInAllInstances;
    }

    function addPerInstanceAttributes(instances, names) {
        var length = instances.length;
        for (var i = 0; i < length; ++i) {
            var instance = instances[i];
            var instanceAttributes = instance.attributes;
            var geometry = instance.geometry;
            var numberOfVertices = Geometry.computeNumberOfVertices(geometry);

            var namesLength = names.length;
            for (var j = 0; j < namesLength; ++j) {
                var name = names[j];
                var attribute = instanceAttributes[name];
                var componentDatatype = attribute.componentDatatype;
                var value = attribute.value;
                var componentsPerAttribute = value.length;

                var buffer = ComponentDatatype.createTypedArray(componentDatatype, numberOfVertices * componentsPerAttribute);
                for (var k = 0; k < numberOfVertices; ++k) {
                    buffer.set(value, k * componentsPerAttribute);
                }

                geometry.attributes[name] = new GeometryAttribute({
                    componentDatatype : componentDatatype,
                    componentsPerAttribute : componentsPerAttribute,
                    normalize : attribute.normalize,
                    values : buffer
                });
            }
        }
    }

    function geometryPipeline(parameters) {
        var instances = parameters.instances;
        var pickIds = parameters.pickIds;
        var projection = parameters.projection;
        var uintIndexSupport = parameters.elementIndexUintSupported;
        var allow3DOnly = parameters.allow3DOnly;
        var allowPicking = parameters.allowPicking;
        var vertexCacheOptimize = parameters.vertexCacheOptimize;
        var modelMatrix = parameters.modelMatrix;

        var i;
        var length = instances.length;
        var primitiveType = instances[0].geometry.primitiveType;

        //>>includeStart('debug', pragmas.debug);
        for (i = 1; i < length; ++i) {
            if (instances[i].geometry.primitiveType !== primitiveType) {
                throw new DeveloperError('All instance geometries must have the same primitiveType.');
            }
        }
        //>>includeEnd('debug');

        // Unify to world coordinates before combining.
        transformToWorldCoordinates(instances, modelMatrix, allow3DOnly);

        // Clip to IDL
        if (!allow3DOnly) {
            for (i = 0; i < length; ++i) {
                GeometryPipeline.wrapLongitude(instances[i].geometry);
            }
        }

        // Add pickColor attribute for picking individual instances
        if (allowPicking) {
            addPickColorAttribute(instances, pickIds);
        }

        // add attributes to the geometry for each per-instance attribute
        var perInstanceAttributeNames = getCommonPerInstanceAttributeNames(instances);
        addPerInstanceAttributes(instances, perInstanceAttributeNames);

        // Optimize for vertex shader caches
        if (vertexCacheOptimize) {
            for (i = 0; i < length; ++i) {
                GeometryPipeline.reorderForPostVertexCache(instances[i].geometry);
                GeometryPipeline.reorderForPreVertexCache(instances[i].geometry);
            }
        }

        // Combine into single geometry for better rendering performance.
        var geometry = GeometryPipeline.combine(instances);

        // Split positions for GPU RTE
        var attributes = geometry.attributes;
        var name;
        if (!allow3DOnly) {
            for (name in attributes) {
                if (attributes.hasOwnProperty(name) && attributes[name].componentDatatype.value === ComponentDatatype.DOUBLE.value) {
                    var name3D = name + '3D';
                    var name2D = name + '2D';

                    // Compute 2D positions
                    GeometryPipeline.projectTo2D(geometry, name, name3D, name2D, projection);

                    GeometryPipeline.encodeAttribute(geometry, name3D, name3D + 'High', name3D + 'Low');
                    GeometryPipeline.encodeAttribute(geometry, name2D, name2D + 'High', name2D + 'Low');
                }
            }
        } else {
            for (name in attributes) {
                if (attributes.hasOwnProperty(name) && attributes[name].componentDatatype.value === ComponentDatatype.DOUBLE.value) {
                    GeometryPipeline.encodeAttribute(geometry, name, name + '3DHigh', name + '3DLow');
                }
            }
        }

        if (!uintIndexSupport) {
            // Break into multiple geometries to fit within unsigned short indices if needed
            return GeometryPipeline.fitToUnsignedShortIndices(geometry);
        }

        // Unsigned int indices are supported.  No need to break into multiple geometries.
        return [geometry];
    }

    function createPerInstanceVAAttributes(geometry, attributeLocations, names) {
        var vaAttributes = [];
        var attributes = geometry.attributes;

        var length = names.length;
        for (var i = 0; i < length; ++i) {
            var name = names[i];
            var attribute = attributes[name];

            var componentDatatype = attribute.componentDatatype;
            if (componentDatatype.value === ComponentDatatype.DOUBLE.value) {
                componentDatatype = ComponentDatatype.FLOAT;
            }

            var typedArray = ComponentDatatype.createTypedArray(componentDatatype, attribute.values);
            vaAttributes.push({
                index : attributeLocations[name],
                componentDatatype : componentDatatype,
                componentsPerAttribute : attribute.componentsPerAttribute,
                normalize : attribute.normalize,
                values : typedArray
            });

            delete attributes[name];
        }

        return vaAttributes;
    }

    function computePerInstanceAttributeLocations(instances, vertexArrays, attributeLocations) {
        var indices = [];

        var names = getCommonPerInstanceAttributeNames(instances);
        var length = instances.length;
        var offsets = {};
        var vaIndices = {};

        for (var i = 0; i < length; ++i) {
            var instance = instances[i];
            var numberOfVertices = Geometry.computeNumberOfVertices(instance.geometry);

            var namesLength = names.length;
            for (var j = 0; j < namesLength; ++j) {
                var name = names[j];
                var index = attributeLocations[name];

                var tempVertexCount = numberOfVertices;
                while (tempVertexCount > 0) {
                    var vaIndex = defaultValue(vaIndices[name], 0);
                    var va = vertexArrays[vaIndex];
                    var vaLength = va.length;

                    var attribute;
                    for (var k = 0; k < vaLength; ++k) {
                        attribute = va[k];
                        if (attribute.index === index) {
                            break;
                        }
                    }

                    if (!defined(indices[i])) {
                        indices[i] = {};
                    }

                    if (!defined(indices[i][name])) {
                        indices[i][name] = {
                            dirty : false,
                            value : instance.attributes[name].value,
                            indices : []
                        };
                    }

                    var size = attribute.values.length / attribute.componentsPerAttribute;
                    var offset = defaultValue(offsets[name], 0);

                    var count;
                    if (offset + tempVertexCount < size) {
                        count = tempVertexCount;
                        indices[i][name].indices.push({
                            attribute : attribute,
                            offset : offset,
                            count : count
                        });
                        offsets[name] = offset + tempVertexCount;
                    } else {
                        count = size - offset;
                        indices[i][name].indices.push({
                            attribute : attribute,
                            offset : offset,
                            count : count
                        });
                        offsets[name] = 0;
                        vaIndices[name] = vaIndex + 1;
                    }

                    tempVertexCount -= count;
                }
            }
        }

        return indices;
    }

    /**
     * @private
     */
    var PrimitivePipeline = {};

    /**
     * @private
     */
    PrimitivePipeline.combineGeometry = function(parameters) {
        var clonedParameters = {
            instances : parameters.instances,
            pickIds : parameters.pickIds,
            ellipsoid : parameters.ellipsoid,
            projection : parameters.projection,
            elementIndexUintSupported : parameters.elementIndexUintSupported,
            allow3DOnly : parameters.allow3DOnly,
            allowPicking : parameters.allowPicking,
            vertexCacheOptimize : parameters.vertexCacheOptimize,
            modelMatrix : Matrix4.clone(parameters.modelMatrix)
        };
        var geometries = geometryPipeline(clonedParameters);
        var attributeLocations = GeometryPipeline.createAttributeLocations(geometries[0]);

        var instances = clonedParameters.instances;
        var perInstanceAttributeNames = getCommonPerInstanceAttributeNames(instances);

        var perInstanceAttributes = [];
        var length = geometries.length;
        for (var i = 0; i < length; ++i) {
            var geometry = geometries[i];
            perInstanceAttributes.push(createPerInstanceVAAttributes(geometry, attributeLocations, perInstanceAttributeNames));
        }

        var indices = computePerInstanceAttributeLocations(instances, perInstanceAttributes, attributeLocations);

        return {
            geometries : geometries,
            modelMatrix : clonedParameters.modelMatrix,
            attributeLocations : attributeLocations,
            vaAttributes : perInstanceAttributes,
            vaAttributeLocations : indices
        };
    };

    /*
     * The below functions are needed when transferring typed arrays to/from web
     * workers. This is a workaround for:
     *
     * https://bugzilla.mozilla.org/show_bug.cgi?id=841904
     */

    function stupefyTypedArray(typedArray) {
        if (defined(typedArray.constructor.name)) {
            return {
                type : typedArray.constructor.name,
                buffer : typedArray.buffer
            };
        } else {
            return typedArray;
        }
    }

    var typedArrayMap = {
        Int8Array : Int8Array,
        Uint8Array : Uint8Array,
        Int16Array : Int16Array,
        Uint16Array : Uint16Array,
        Int32Array : Int32Array,
        Uint32Array : Uint32Array,
        Float32Array : Float32Array,
        Float64Array : Float64Array
    };

    function unStupefyTypedArray(typedArray) {
        if (defined(typedArray.type)) {
            return new typedArrayMap[typedArray.type](typedArray.buffer);
        } else {
            return typedArray;
        }
    }

    /**
     * @private
     */
    PrimitivePipeline.transferGeometry = function(geometry, transferableObjects) {
        var typedArray;
        var attributes = geometry.attributes;
        for (var name in attributes) {
            if (attributes.hasOwnProperty(name) &&
                    defined(attributes[name]) &&
                    defined(attributes[name].values)) {
                typedArray = attributes[name].values;

                if (FeatureDetection.supportsTransferringArrayBuffers()) {
                    transferableObjects.push(typedArray.buffer);
                }

                if (!defined(typedArray.type)) {
                    attributes[name].values = stupefyTypedArray(typedArray);
                }
            }
        }

        if (defined(geometry.indices)) {
            typedArray = geometry.indices;

            if (FeatureDetection.supportsTransferringArrayBuffers()) {
                transferableObjects.push(typedArray.buffer);
            }

            if (!defined(typedArray.type)) {
                geometry.indices = stupefyTypedArray(geometry.indices);
            }
        }
    };

    /**
     * @private
     */
    PrimitivePipeline.transferGeometries = function(geometries, transferableObjects) {
        var length = geometries.length;
        for (var i = 0; i < length; ++i) {
            PrimitivePipeline.transferGeometry(geometries[i], transferableObjects);
        }
    };

    /**
     * @private
     */
    PrimitivePipeline.transferPerInstanceAttributes = function(perInstanceAttributes, transferableObjects) {
        var length = perInstanceAttributes.length;
        for (var i = 0; i < length; ++i) {
            var vaAttributes = perInstanceAttributes[i];
            var vaLength = vaAttributes.length;
            for (var j = 0; j < vaLength; ++j) {
                var typedArray = vaAttributes[j].values;
                if (FeatureDetection.supportsTransferringArrayBuffers()) {
                    transferableObjects.push(typedArray.buffer);
                }
                vaAttributes[j].values = stupefyTypedArray(typedArray);
            }
        }
    };

    /**
     * @private
     */
    PrimitivePipeline.receiveGeometry = function(geometry) {
        var attributes = geometry.attributes;
        for (var name in attributes) {
            if (attributes.hasOwnProperty(name) &&
                    defined(attributes[name]) &&
                    defined(attributes[name].values)) {
                attributes[name].values = unStupefyTypedArray(attributes[name].values);
            }
        }

        if (defined(geometry.indices)) {
            geometry.indices = unStupefyTypedArray(geometry.indices);
        }
    };

    /**
     * @private
     */
    PrimitivePipeline.receiveGeometries = function(geometries) {
        var length = geometries.length;
        for (var i = 0; i < length; ++i) {
            PrimitivePipeline.receiveGeometry(geometries[i]);
        }
    };

    /**
     * @private
     */
    PrimitivePipeline.receivePerInstanceAttributes = function(perInstanceAttributes) {
        var length = perInstanceAttributes.length;
        for (var i = 0; i < length; ++i) {
            var vaAttributes = perInstanceAttributes[i];
            var vaLength = vaAttributes.length;
            for (var j = 0; j < vaLength; ++j) {
                vaAttributes[j].values = unStupefyTypedArray(vaAttributes[j].values);
            }
        }
    };

    /**
     * @private
     */
    PrimitivePipeline.receiveInstances = function(instances) {
        var length = instances.length;
        for (var i = 0; i < length; ++i) {
            var instance = instances[i];
            PrimitivePipeline.receiveGeometry(instance.geometry);
        }
    };

    // This function was created by simplifying packCreateGeometryResults into a count-only operation.
    function countCreateGeometryResults(items) {
        var count = 1;
        var length = items.length;
        for (var i = 0; i < length; i++) {
            var geometry = items[i];

            count += 4 + BoundingSphere.packedLength + geometry.indices.length;

            var attributes = geometry.attributes;
            var attributesToWrite = [];
            for ( var property in attributes) {
                if (attributes.hasOwnProperty(property) && defined(attributes[property])) {
                    var attribute = attributes[property];
                    count += 5 + attribute.values.length;
                }
            }
        }

        return count;
    }

    /**
     * @private
     */
    PrimitivePipeline.packCreateGeometryResults = function(items, transferableObjects) {
        var packedData = new Float64Array(countCreateGeometryResults(items));
        var stringTable = [];
        var stringHash = {};

        var length = items.length;
        var count = 0;
        packedData[count++] = length;
        for (var i = 0; i < length; i++) {
            var geometry = items[i];

            //primitiveType
            packedData[count++] = geometry.primitiveType;

            //boundingSphere
            BoundingSphere.pack(geometry.boundingSphere, packedData, count);
            count += BoundingSphere.packedLength;

            //indices
            packedData[count++] = ComponentDatatype.fromTypedArray(geometry.indices).value;
            packedData[count++] = geometry.indices.length;
            packedData.set(geometry.indices, count);
            count += geometry.indices.length;

            //attributes
            var attributes = geometry.attributes;
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

            packedData[count++] = attributesToWrite.length;
            for (var q = 0; q < attributesToWrite.length; q++) {
                var name = attributesToWrite[q];
                var attribute = attributes[name];
                packedData[count++] = stringHash[name];
                packedData[count++] = attribute.componentDatatype.value;
                packedData[count++] = attribute.componentsPerAttribute;
                packedData[count++] = attribute.normalize ? 1 : 0;
                packedData[count++] = attribute.values.length;
                packedData.set(attribute.values, count);
                count += attribute.values.length;
            }
        }

        if (FeatureDetection.supportsTransferringArrayBuffers()) {
            transferableObjects.push(packedData.buffer);
        }

        return {
            stringTable : stringTable,
            packedData : packedData
        };
    };

    /**
     * @private
     */
    PrimitivePipeline.unpackCreateGeometryResults = function(createGeometryResult) {
        var stringTable = createGeometryResult.stringTable;
        var packedGeometry = createGeometryResult.packedData;

        var i;
        var result = new Array(packedGeometry[0]);
        var resultIndex = 0;

        var packedGeometryIndex = 1;
        while (packedGeometryIndex < packedGeometry.length) {
            var primitiveType = packedGeometry[packedGeometryIndex++];

            //boundingSphere
            var boundingSphere = BoundingSphere.unpack(packedGeometry, packedGeometryIndex);
            packedGeometryIndex += BoundingSphere.packedLength;

            //indices
            var type = ComponentDatatype.fromValue(packedGeometry[packedGeometryIndex++]);
            var length = packedGeometry[packedGeometryIndex++];
            var indices = ComponentDatatype.createTypedArray(type, length);
            for (i = 0; i < length; i++) {
                indices[i] = packedGeometry[packedGeometryIndex++];
            }

            //attributes
            var attributes = {};
            var numAttributes = packedGeometry[packedGeometryIndex++];
            for (i = 0; i < numAttributes; i++) {
                var name = stringTable[packedGeometry[packedGeometryIndex++]];
                var componentDatatype = ComponentDatatype.fromValue(packedGeometry[packedGeometryIndex++]);
                var componentsPerAttribute = packedGeometry[packedGeometryIndex++];
                var normalize = packedGeometry[packedGeometryIndex++] !== 0;

                length = packedGeometry[packedGeometryIndex++];
                var values = ComponentDatatype.createTypedArray(componentDatatype, length);
                for (var valuesIndex = 0; valuesIndex < length; valuesIndex++) {
                    values[valuesIndex] = packedGeometry[packedGeometryIndex++];
                }

                attributes[name] = new GeometryAttribute({
                    componentDatatype : componentDatatype,
                    componentsPerAttribute : componentsPerAttribute,
                    normalize : normalize,
                    values : values
                });
            }

            result[resultIndex++] = new Geometry({
                primitiveType : primitiveType,
                boundingSphere : boundingSphere,
                indices : indices,
                attributes : attributes
            });
        }

        return result;
    };

    /**
     * @private
     */
    PrimitivePipeline.packCombineGeometryParameters = function(parameters, transferableObjects) {
        var createGeometryResults = parameters.createGeometryResults;
        var length = createGeometryResults.length;

        if (FeatureDetection.supportsTransferringArrayBuffers()) {
            for (var i = 0; i < length; i++) {
                transferableObjects.push(createGeometryResults[i].packedData.buffer);
            }
        }

        var packedPickIds;
        if (parameters.allowPicking) {
            packedPickIds = GeometryPacker.packPickIds(parameters.pickIds);
            if (FeatureDetection.supportsTransferringArrayBuffers()) {
                transferableObjects.push(packedPickIds.buffer);
            }
        }

        return {
            createGeometryResults : parameters.createGeometryResults,
            packedInstances : GeometryPacker.packInstancesForCombine(parameters.instances, transferableObjects),
            packedPickIds : packedPickIds,
            ellipsoid : parameters.ellipsoid,
            isGeographic : parameters.isGeographic,
            elementIndexUintSupported : parameters.elementIndexUintSupported,
            allow3DOnly : parameters.allow3DOnly,
            allowPicking : parameters.allowPicking,
            vertexCacheOptimize : parameters.vertexCacheOptimize,
            modelMatrix : parameters.modelMatrix
        };
    };

    /**
     * @private
     */
    PrimitivePipeline.unpackCombineGeometryParameters = function(packedParameters) {
        var instances = GeometryPacker.unpackInstancesForCombine(packedParameters.packedInstances);
        var pickIds = GeometryPacker.unpackPickIds(packedParameters.packedPickIds);

        var createGeometryResults = packedParameters.createGeometryResults;
        var length = createGeometryResults.length;
        var index = 0;
        for (var i = 0; i < length; i++) {
            var geometries = PrimitivePipeline.unpackCreateGeometryResults(createGeometryResults[i]);
            var geometriesLength = geometries.length;
            for (var x = 0; x < geometriesLength; x++) {
                instances[index++].geometry = geometries[x];
            }
        }

        var ellipsoid = Ellipsoid.clone(packedParameters.ellipsoid);
        var projection = packedParameters.isGeographic ? new GeographicProjection(ellipsoid) : new WebMercatorProjection(ellipsoid);
        var modelMatrix = Matrix4.clone(packedParameters.modelMatrix);

        return {
            instances : instances,
            pickIds : pickIds,
            ellipsoid : ellipsoid,
            projection : projection,
            elementIndexUintSupported : packedParameters.elementIndexUintSupported,
            allow3DOnly : packedParameters.allow3DOnly,
            allowPicking : packedParameters.allowPicking,
            vertexCacheOptimize : packedParameters.vertexCacheOptimize,
            modelMatrix : packedParameters.modelMatrix
        };
    };

    /**
     * @private
     */
    PrimitivePipeline.packCombineGeometryResults = function(results, transferableObjects) {
        PrimitivePipeline.transferGeometries(results.geometries, transferableObjects);
        PrimitivePipeline.transferPerInstanceAttributes(results.vaAttributes, transferableObjects);

        results.packedVaAttributeLocations = GeometryPacker.packAttributeLocations(results.vaAttributeLocations);
        if (FeatureDetection.supportsTransferringArrayBuffers()) {
            transferableObjects.push(results.packedVaAttributeLocations.packedData.buffer);
        }
        delete results.vaAttributeLocations;
        return results;
    };

    /**
     * @private
     */
    PrimitivePipeline.unpackCombineGeometryResults = function(packedResult) {
        PrimitivePipeline.receiveGeometries(packedResult.geometries);
        PrimitivePipeline.receivePerInstanceAttributes(packedResult.vaAttributes);

        return {
            geometries : packedResult.geometries,
            attributeLocations : packedResult.attributeLocations,
            vaAttributes : packedResult.vaAttributes,
            perInstanceAttributeLocations : GeometryPacker.unpackAttributeLocations(packedResult.packedVaAttributeLocations, packedResult.vaAttributes),
            modelMatrix : packedResult.modelMatrix
        };
    };

    return PrimitivePipeline;
});

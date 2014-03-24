/*global defineSuite*/
defineSuite([
         'Scene/PrimitivePipeline',
         'Core/BoxGeometry',
         'Core/VertexFormat',
         'Core/Cartesian3',
         'Core/Color',
         'Core/Matrix4',
         'Core/ShowGeometryInstanceAttribute',
         'Core/ColorGeometryInstanceAttribute'
     ], function(
         PrimitivePipeline,
         BoxGeometry,
         VertexFormat,
         Cartesian3,
         Color,
         Matrix4,
         ShowGeometryInstanceAttribute,
         ColorGeometryInstanceAttribute) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('can pack and unpack for createGeometry', function() {
        var original = [BoxGeometry.createGeometry(new BoxGeometry({
            minimumCorner : new Cartesian3(0, 0, 0),
            maximumCorner : new Cartesian3(1, 1, 1),
            vertexFormat : VertexFormat.ALL
        }))];

        var transferableObjects = [];
        var packed = PrimitivePipeline.packCreateGeometryResults(original, transferableObjects);
        var unpacked = PrimitivePipeline.unpackCreateGeometryResults(packed);
        expect(transferableObjects[0]).toBe(packed.packedData.buffer);
        expect(original).toEqual(unpacked);
    });
});

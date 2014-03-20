/*global defineSuite*/
defineSuite([
         'Core/GeometryPacker',
         'Core/BoxGeometry',
         'Core/VertexFormat',
         'Core/Cartesian3'
     ], function(
         GeometryPacker,
         BoxGeometry,
         VertexFormat,
         Cartesian3) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('can pack and unpack', function() {
        var original = [BoxGeometry.createGeometry(new BoxGeometry({
            minimumCorner : new Cartesian3(0, 0, 0),
            maximumCorner : new Cartesian3(1, 1, 1),
            vertexFormat : VertexFormat.ALL
        }))];

        var attributeNames = [];
        var packed = GeometryPacker.packForCreateGeoemtry(original, attributeNames);
        var unpacked = GeometryPacker.unpackFromCreateGeometry(packed, attributeNames);
        expect(original).toEqual(unpacked);
    });
});

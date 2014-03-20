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
        var minimumCorner = new Cartesian3(0, 0, 0);
        var maximumCorner = new Cartesian3(1, 1, 1);
        var m = BoxGeometry.createGeometry(new BoxGeometry({
            minimumCorner : minimumCorner,
            maximumCorner : maximumCorner,
            vertexFormat : VertexFormat.ALL
        }));

        var original = [{
            index : 1,
            geometry : m
        }];
        var packed = GeometryPacker.pack(original);
        var unpacked = GeometryPacker.unpack(packed);

        expect(original).toEqual(unpacked);
    });
});

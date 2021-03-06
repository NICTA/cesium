/*global defineSuite*/
defineSuite([
         'Core/GeometryInstance',
         'Core/Geometry',
         'Core/GeometryAttribute',
         'Core/GeometryInstanceAttribute',
         'Core/ComponentDatatype',
         'Core/BoundingSphere',
         'Core/Cartesian3',
         'Core/PrimitiveType',
         'Core/Matrix4'
     ], function(
         GeometryInstance,
         Geometry,
         GeometryAttribute,
         GeometryInstanceAttribute,
         ComponentDatatype,
         BoundingSphere,
         Cartesian3,
         PrimitiveType,
         Matrix4) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructor', function() {
        var geometry = new Geometry({
            attributes : {
                position : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.DOUBLE,
                    componentsPerAttribute : 3,
                    values : new Float64Array([
                        0.0, 0.0, 0.0,
                        1.0, 0.0, 0.0,
                        0.0, 1.0, 0.0
                    ])
                })
            },
            indices : new Uint16Array([0, 1, 2]),
            primitiveType : PrimitiveType.TRIANGLES,
            boundingSphere : new BoundingSphere(new Cartesian3(0.5, 0.5, 0.0), 1.0)
        });
        var modelMatrix = Matrix4.multiplyByTranslation(Matrix4.IDENTITY, new Cartesian3(0.0, 0.0, 9000000.0));
        var attributes = {
            color : new GeometryInstanceAttribute({
                componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
                componentsPerAttribute : 4,
                normalize : true,
                value : new Uint8Array([255, 255, 0, 255])
            })
        };
        var instance = new GeometryInstance({
            geometry : geometry,
            modelMatrix : modelMatrix,
            id : 'geometry',
            attributes : attributes
        });

        expect(instance.geometry).toBe(geometry);
        expect(instance.modelMatrix).toEqual(modelMatrix);
        expect(instance.id).toEqual('geometry');
        expect(attributes).toBe(attributes);
    });

    it('constructor throws without geometry', function() {
        expect(function() {
            return new GeometryInstance();
        }).toThrowDeveloperError();
    });

});

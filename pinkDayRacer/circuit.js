class Circuit
{
    constructor(scene){
        // reference to the game scene
        this.scene = scene;

        // graphics to draw the road polygons on it
        this.graphics = scene.add.graphics(0,0);

        //texture to draw sprites on it
        this.texture = scene.add.renderTexture(0, 0, SCREEN_W, SCREEN_H);

        // array of road segments
        this.segments = [];

        // single segment length
        this.segmentLength = 100;

        // total number of road segments
        this.total_segments = null;

        // number of visable segments to be drawn
        this.visable_segments = 600;

        // number of segments that forms a rumble strip
        this.rumble_segments = 5;

        // number of road lanes
		this.roadLanes = 3;

        // road width (half of the road)
        this.roadWidth = 1000;

        // total road length
        this.roadLength = null;

        this.circuitDesign = [
            [0, 0],                 // Start/Finish Line
            [0, 0],                 // Straight Section
            [1, 0],                 // Right Turn
            [-0.5, 0.5],           // Upward Curve
            [-1, 0.25],            // Upward Curve
            [1.5, 0.125],              // Upward Curve
            [2, 0.1],            // Upward Curve
            [-2.5, 0.05],           // Upward Curve
            [-2, 0],                // Left Turn
            [0, 0.5],               // Straight Section
            [-1.5, -0.05],          // Downward Curve
            [-1.5, -0.1],           // Downward Curve
            [1, -0.125],            // Downward Curve
            [1, 0],                // Left-Right Combination
            [0.5, 0],               // Left-Right Combination
            [-0.5, 0],              // Left-Right Combination
            [0, 0],                 // Straight Section
            [-0.5, 0],              // Hairpin Turn
            [-1, 0.5],             // Upward Curve
            [1.5, 0.25],            // Upward Curve
            [-1.5, 0.125],           // Upward Curve
            [-2, 0],                // Right Turn
            [1.5, -0.05],          // Downward Curve
            [1.5, -0.125],           // Downward Curve
            [-1, -0.25],            // Downward Curve
            [-0.5, 0],              // Left-Right Combination
            [0.5, 0],               // Left-Right Combination
            [0, 0],                 // Straight Section
            [0.5, 0],               // Left Turn
            [0, 0],                 // Straight Section
            [0, 0]                  // Start/Finish Line
        ];

        this.circuitDesign.sort(() => Math.random() - 0.5);
    
    }

    create(){
        this.segments = [];

        this.createRoad();

        for (var n=0; n<this.rumble_segments; n++){
			this.segments[n].color.road = '0xFFFFFF';							// start
			this.segments[this.segments.length-1-n].color.road = '0x222222';	// finish
		}

        this.total_segments= this.segments.length;

        this.roadLength = this.total_segments * this.segmentLength;
    }

    createRoad(){
        this.createSection(2000);
    }

    createSection(nSegments){
        for (var i=0; i < nSegments; i++){
            this.createSegment();
       } 
    }

    createSegment() {
        const COLORS = {
            LIGHT: { road: '0x393939', grass: '0x550055', rumble: '0xFF0000' },
            DARK: { road: '0x282828', grass: '0x330033', rumble: '0xFF0000', lane: '0xFFFFFF' }
          };                
      
        var n = this.segments.length;
    
        // determine the circuit interval
        var interval = Math.floor(n / (2000 / this.circuitDesign.length));
      
        // add new segment
        this.segments.push({
            index: n,
        
            point: {
                world: { x: 0, y: 0, z: n * this.segmentLength },
                screen: { x: 0, y: 0, z: 0 },
                scale: -1,
            },
        
            color: Math.floor(n / this.rumble_segments) % 2 ? COLORS.DARK : COLORS.LIGHT,
        
            curveX: this.circuitDesign[interval][0],
            curveY: this.circuitDesign[interval][1],
        });
    }
      

    getSegment(positionZ){
        if (positionZ<0) positionZ += this.roadLength;
        var index = Math.floor(positionZ / this.segmentLength) % this.total_segments;
        return this.segments[index];
    }

    project3D(point,cameraX, cameraY, cameraZ, cameraDepth){
        var transX = point.world.x - cameraX;
        var transY = point.world.y - cameraY;
        var transZ = point.world.z - cameraZ;

        point.scale = cameraDepth/transZ;

        var projectedX = point.scale * transX;
        var projectedY = point.scale * transY;
        var projectedW = point.scale * this.roadWidth;

        point.screen.x = Math.round((1 + projectedX) * SCREEN_CX);
        point.screen.y = Math.round((1 - projectedY) * SCREEN_CY);
        point.screen.w = Math.round(projectedW * SCREEN_CX);
    }

    render3D(){
        this.graphics.clear();
    
        var x = 0, y = 0, z = 0; // Initialize x, y, and z variables for the road position
        var dx = 0, dy = 0 // Initialize dx, dy variables for the road curvature
    
        var clipBottomLine = SCREEN_H;
    
        var camera = this.scene.camera;
    
        var baseSegment = this.getSegment(camera.z);
        var baseIndex = baseSegment.index;
    
        for (var n=0; n<this.visable_segments; n++){
    
            var currIndex = (baseIndex + n) % this.total_segments;
            var currSegment = this.segments[currIndex];
    
            var offsetZ = (currIndex < baseIndex) ? this.roadLength : 0;
    
            // Calculate the road position and curvature for the current segment
            x += dx;
            y += dy;
            dx += currSegment.curveX;
            dy += currSegment.curveY;
    
            this.project3D(currSegment.point, camera.x - x, camera.y - y, camera.z - z - offsetZ, camera.distToPlane);
    
            var currBottomLine = currSegment.point.screen.y;
            if (n>0 && currBottomLine < clipBottomLine){
                var prevIndex = (currIndex>0) ? currIndex-1 : this.total_segments-1;
                var prevSegment = this.segments[prevIndex];
    
                var p1 = prevSegment.point.screen;
                var p2 = currSegment.point.screen;
    
                this.drawSegment(
                    p1.x, p1.y, p1.w,
                    p2.x, p2.y, p2.w,
                    currSegment.color
                );
    
                //move the clipping bottom line up
                clipBottomLine = currBottomLine;
            }
    
        }
    
        //draw all the visible objects on the rendering texture
        this.texture.clear();
    
        var player = this.scene.player;
        this.texture.draw(player.sprite, player.screen.x, player.screen.y);
    }

    drawSegment(x1, y1, w1, x2, y2, w2, color){
        this.graphics.fillStyle(color.grass, 1);
        this.graphics.fillRect(0, y2, SCREEN_W, y1 - y2);
        
        this.drawPolygon(x1-w1, y1, x1+w1, y1, x2+w2, y2, x2-w2, y2, color.road);

        var rumble_w1 = w1/5;
		var rumble_w2 = w2/5;
		this.drawPolygon(x1-w1-rumble_w1, y1, x1-w1, y1, x2-w2, y2, x2-w2-rumble_w2, y2, color.rumble);
		this.drawPolygon(x1+w1+rumble_w1, y1, x1+w1, y1, x2+w2, y2, x2+w2+rumble_w2, y2, color.rumble);
		
        if (color.lane) {
			var line_w1 = (w1/20) / 2;
			var line_w2 = (w2/20) / 2;
			
			var lane_w1 = (w1*2) / this.roadLanes;
			var lane_w2 = (w2*2) / this.roadLanes;
			
			var lane_x1 = x1 - w1;
			var lane_x2 = x2 - w2;
			
			for(var i=1; i<this.roadLanes; i++){
				lane_x1 += lane_w1;
				lane_x2 += lane_w2;
				
				this.drawPolygon(
					lane_x1-line_w1, y1, 
					lane_x1+line_w1, y1, 
					lane_x2+line_w2, y2, 
					lane_x2-line_w2, y2, 
					color.lane
				);
			}
		}
    }

    drawPolygon(x1, y1, x2, y2, x3, y3, x4, y4, color){
        this.graphics.fillStyle(color, 1);
        this.graphics.beginPath();

        this.graphics.moveTo(x1, y1);
        this.graphics.lineTo(x2, y2);
        this.graphics.lineTo(x3, y3);
        this.graphics.lineTo(x4, y4);

        this.graphics.closePath();
        this.graphics.fillPath();
    }
}
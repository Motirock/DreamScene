#version 450

layout(binding = 0) uniform UniformBufferObject {
    mat4 view;
    mat4 proj;
    vec3 cameraPos;
    float time;
} ubo;

layout(binding = 1) uniform sampler2D textureSamplers[3];

layout(binding = 2) uniform sampler3D noiseSamplers[1];

layout(location = 0) in vec3 worldPosition;

layout(location = 0) out vec4 outColor;

const float e = 2.71828f;
const float MAX_DISTANCE = 2000.0f;

const vec3 lowerBounds = vec3(200.0f, -500.0f, -400.0f);
const vec3 upperBounds = vec3(1200.0f, 500.0f, 600.0f);
const vec3 boundsSizes = vec3(1000.0f);

float exitRayAABB(vec3 rayOrigin, vec3 rayDirection, vec3 lowerBounds, vec3 upperBounds) {
    vec3 tMin = (lowerBounds - rayOrigin) / rayDirection;
    vec3 tMax = (upperBounds - rayOrigin) / rayDirection;

    //Handle division by zero: set t to a large number for axes where direction is 0
    const float INF = 1e20;
    tMin = (rayDirection == vec3(0.0)) ? vec3(-INF) : tMin;
    tMax = (rayDirection == vec3(0.0)) ? vec3(INF) : tMax;

    //Ensure tMin is the min, tMax is the max
    vec3 t1 = min(tMin, tMax);
    vec3 t2 = max(tMin, tMax);

    //Since ray starts on surface, we only care about t > 0 (the exit distances)
    float tExitX = (t2.x > 1e-5) ? t2.x : INF;
    float tExitY = (t2.y > 1e-5) ? t2.y : INF;
    float tExitZ = (t2.z > 1e-5) ? t2.z : INF;

    // Find the furthest exit distance
    float tExit = min(tExitX, min(tExitY, tExitZ));

    return (tExit < INF) ? tExit : -1.0; //Return -1 if ray is parallel to box and won't exit
}

void main() {
    vec3 rayDirection = normalize(worldPosition - ubo.cameraPos);
    vec3 rayOrigin = worldPosition;
    vec3 rayPosition = rayOrigin+vec3(0.0f, 0.0f, -20+40.0f*cos(ubo.time/5.0f));
    float distanceTraveled = 0.0f;
    int steps = 0;
    float minStepSize = 50.0f;

    float endDistance = exitRayAABB(rayOrigin, rayDirection, lowerBounds, upperBounds);

    //Cull edges as they only lead to floating point errors
    vec3 distanceFromEdge = min(abs(rayOrigin-lowerBounds), abs(rayOrigin-upperBounds));
    if ((distanceFromEdge.x < 1.0f ? 1.0f : 0.0f) + (distanceFromEdge.y < 1.0f ? 1.0f : 0.0f) + (distanceFromEdge.z < 1.0f ? 1.0f : 0.0f) >= 2) {
        outColor = vec4(0.0f);
        return;
    }

    float transparency = 1.0f;
    vec3 color = vec3(0.0f, 0.0f, 0.0f);

    while (distanceTraveled < min(MAX_DISTANCE, endDistance)) {
        vec3 noiseCoordinates = (rayPosition-lowerBounds)/1000.0f;
        vec4 localValue = texture(noiseSamplers[0], noiseCoordinates);

        if (localValue.w > 0.01f) {
            float transparencyChange = transparency*min(0.01f/(localValue.w+0.0001f), 1.0f)/1000.0f*minStepSize*10;
        
            transparency -= transparencyChange;
            color += localValue.xyz*transparencyChange;

            if (transparency <= 0.05f) {
                transparency = 0.0f;
                break;
            }

            vec3 nextStep = boundsSizes * localValue.w;
            rayPosition += vec3(nextStep.x*rayDirection.x, nextStep.y*rayDirection.y, nextStep.z*rayDirection.z);
        }
        else {
            rayPosition += rayDirection * minStepSize;
            distanceTraveled += minStepSize;
        }

        steps++;
    }

    color = color/(max(color.x, max(color.y, color.z)))*vec3(abs(sin(ubo.time/3.0f)), abs(cos(ubo.time/5.0f)), 10*abs(sin(ubo.time/10.0f)));

    outColor = vec4(color, 1.0f-transparency);
}


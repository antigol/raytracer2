#version 130

in vec2 vertex;
uniform float aspect;
uniform float anglevalue; // angle / 2 == arctan(1 / anglevalue)
uniform vec3 eye;
uniform vec3 up;
out vec3 first_ray;

void main(void)
{
//    first_ray = vec3(vertex.x * aspect, vertex.y, -1.428); // 70 degrees
    first_ray = anglevalue * eye + vertex.x * aspect * cross(eye, up) + vertex.y * up;
    gl_Position = vec4(vertex, 0.0, 1.0);
}

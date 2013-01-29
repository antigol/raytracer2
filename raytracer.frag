#version 130

struct material {
    float phong_factor; // between 0 and 1
    vec3 ambiant;
    vec3 diffuse;

    float opacity; // between 0 and 1
    float eta; // index inside the material, behind the normal direction
};

struct sphere {
    vec3 center;
    float radius;
    material mat;
};

struct plane {
    vec3 point;
    vec3 normal;
    material mat;
};

struct ray {
    float factor;
    vec3 origin;
    vec3 direction;
};

in vec3 first_ray; // direction du rayon qui part de l'origine (0,0,0)
uniform vec3 camera;
uniform vec3 light; // position de la lumire
uniform sphere spheres[16];
uniform samplerCube cubemap;
out vec4 pixelColor;

vec3 send_ray(in ray r);

bool refraction(in vec3 v, in vec3 n, in float cos, out vec3 t, in float eta);
float fresnel(in float cosi, in float cost, in float eta);

// retourne la distance minimale strictement positive
bool line_sphere_intersection(in vec3 origin, in vec3 direction, in vec3 center, in float radius, out float dist);
bool line_plane_intersection(in vec3 origin, in vec3 direction, in vec3 basis, in vec3 normal, out float dist);

int next_sphere_intersection(in vec3 origin, in vec3 direction, out float dist);

float rand(vec2 co) {
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

const float fuzzy = 5e-5;

const int maxrays = 8;
ray queue[maxrays];
int queue_size;

void main(void)
{
    vec3 color = vec3(0.0, 0.0, 0.0);

    queue[0] = ray(1.0, camera, normalize(first_ray));
    queue_size = 1;

    for (int ray_count = 0; ray_count < queue_size; ++ray_count) {
        color += send_ray(queue[ray_count]);
    }

    pixelColor = vec4(color, 1.0);
}

vec3 send_ray(in ray r)
{
    vec3 color = vec3(0.0, 0.0, 0.0);
    float dist = 0.0;

    // cherche la collision
    int k = next_sphere_intersection(r.origin, r.direction, dist);
    if (k == -1)
        return r.factor * texture(cubemap, r.direction).bgr;

    vec3 p = r.origin + dist * r.direction;
    vec3 n = (p - spheres[k].center) / spheres[k].radius;
    float cos = dot(r.direction, n);
    vec3 i = r.direction - 2.0 * cos * n;

    // phong
    if (spheres[k].mat.phong_factor > 0.0) {
        int sk = next_sphere_intersection(p + fuzzy * light, light, dist);
        float lightfactor = 1.0;
        if (sk != -1)
            lightfactor = (1.0 - spheres[sk].mat.phong_factor) * (1.0 - spheres[sk].mat.opacity);
        if (lightfactor > 0.0) {
            float dfactor = clamp(dot(light, n), 0.0, 1.0);
            float sfactor = pow(clamp(dot(light, i), 0.0, 1.0), 4.0);
            color += lightfactor * dfactor * spheres[k].mat.diffuse + sfactor * vec3(1.0, 1.0, 1.0);
        }
        color += spheres[k].mat.ambiant;
        color *= spheres[k].mat.phong_factor;
    }

    // reflexion
    if (spheres[k].mat.phong_factor < 1.0 && queue_size < maxrays) {
        vec3 t;
        float freflect = 1.0;
        if (spheres[k].mat.opacity < 1.0 && refraction(r.direction, n, cos, t, spheres[k].mat.eta)) {
            float frefract = (1.0 - fresnel(cos, dot(t, n), spheres[k].mat.eta)) * (1.0 - spheres[k].mat.opacity);
            freflect = 1.0 - frefract;

            if (0.5 < freflect)
                queue[queue_size++] = ray(r.factor * (1.0 - spheres[k].mat.phong_factor)/* * freflect*/, p + fuzzy * i, i);
            else
                queue[queue_size++] = ray(r.factor * (1.0 - spheres[k].mat.phong_factor)/* * frefract*/, p + fuzzy * t, t);
        } else {

//        if (queue_size < maxrays)
            queue[queue_size++] = ray(r.factor * (1.0 - spheres[k].mat.phong_factor) * freflect, p + fuzzy * i, i);
        }
    }
    /*
    if (spheres[k].mat.phong_factor < 1.0 && queue_size < maxrays) {
        vec3 t;
        float freflect = 1.0;
        if (spheres[k].mat.opacity < 1.0 && refraction(r.direction, n, cos, t, spheres[k].mat.eta)) {
            float frefract = (1.0 - fresnel(cos, dot(t, n), spheres[k].mat.eta)) * (1.0 - spheres[k].mat.opacity);
            freflect = 1.0 - frefract;

            queue[queue_size++] = ray(r.factor * (1.0 - spheres[k].mat.phong_factor) * frefract, p + fuzzy * t, t);
        }
        if (queue_size < maxrays)
            queue[queue_size++] = ray(r.factor * (1.0 - spheres[k].mat.phong_factor) * freflect, p + fuzzy * i, i);
    }

      */

    return r.factor * color;
}

bool refraction(in vec3 v, in vec3 n, in float cos, out vec3 t, in float eta)
{ // cos = dot(v,n)
    if (cos < 0.0) {
//        t = refract(v, n, 1.0 / eta);
        float k = 1.0 - (1.0 - cos * cos) / eta / eta;
        if (k < 0.0)
            return false;
        t = v / eta - (cos / eta + sqrt(k)) * n;
    } else {
//        t = refract(v, -n, eta);
        float k = 1.0 - eta * eta * (1.0 - cos * cos); // -a * -a = a * a
        if (k < 0.0)
            return false;
        t = eta * v + (-eta * cos + sqrt(k)) * n; // -n
    }
    return true;
}

float fresnel(in float cosi, in float cost, in float eta)
{
    // cosi = v*n
    // cost = t*n
    if (cosi > 0.0) {
        float rs = (eta * cosi - cost) / (eta * cosi + cost);
        float rp = (eta * cost - cosi) / (eta * cost + cosi);
        return (rs*rs + rp*rp) / 2.0;
    } else {
        float rs = (cosi - eta * cost) / (cosi + eta * cost);
        float rp = (cost - eta * cosi) / (cost + eta * cosi);
        return (rs*rs + rp*rp) / 2.0;
    }
}

bool line_sphere_intersection(in vec3 origin, in vec3 direction, in vec3 center, in float radius, out float dist)
{
    float d = 0.0;

    vec3 x = origin - center;
    float a = dot(direction, direction);
    float b = 2.0 * dot(direction, x);
    float c = dot(x, x) - radius * radius;
    float delta = b * b - 4.0 * a * c;
    if (delta < 0.0)
        return false;
    if (c < 0.0) {
        // in the sphere
        d = (-b + sqrt(delta)) / (2.0 * a);
    } else {
        // out of the sphere
        d = (-b - sqrt(delta)) / (2.0 * a);
    }

    dist = d;
    return d > 0.0;
}

bool line_plane_intersection(in vec3 origin, in vec3 direction, in vec3 basis, in vec3 normal, out float dist)
{
    return false;
}

int next_sphere_intersection(in vec3 origin, in vec3 direction, out float dist)
{
    float dmin = 0.0;
    int ii = -1;
    for (int i = 0; i < 10; ++i) {
        if (spheres[i].radius == 0.0)
            break;

        float d;
        if (line_sphere_intersection(origin, direction, spheres[i].center, spheres[i].radius, d)) {
            if (dmin == 0.0 || d < dmin) {
                dmin = d;
                ii = i;
            }
        }
    }
    dist = dmin;
    return ii;
}

#version 130

struct material {
    float phong_factor; // between 0 and 1
    vec3 ambiant;
    vec3 diffuse;

    float transparency; // 0 or 1
    float eta; // index inside the material, behind the normal direction
};

struct sphere {
    vec3 center;
    float radius;
    material mat;
};

struct plan {
    vec3 point;
    vec3 normal;
    material mat;
};

struct ray {
    float factor;
    vec3 origin;
    vec3 direction;
};

in vec3 first_ray; // direction du rayon qui part de camera
uniform vec3 camera; // point de dpart du rayon
uniform vec3 light; // position de la lumire
uniform sphere spheres[16];
uniform samplerCube cubemap;
out vec4 pixelColor;

bool refraction(in vec3 v, in vec3 n, in float cos, out vec3 t, in float eta);
//float fresnel(in float cosi, in float cost, in float eta);

// retourne la distance minimale strictement positive
bool line_sphere_intersection(in vec3 origin, in vec3 direction, in vec3 center, in float radius, out float dist);
bool line_plan_intersection(in vec3 origin, in vec3 direction, in vec3 basis, in vec3 normal, out float dist);

int next_sphere_intersection(in vec3 origin, in vec3 direction, out float dist);

const float fuzzy = 5e-4;

const int maxrays = 8;

void main(void)
{
    vec3 color = vec3(0.0, 0.0, 0.0);

    ray r;
    r.factor = 1.0;
    r.origin = camera;
    r.direction = normalize(first_ray);

    for (int ray_count = 0; ray_count < maxrays; ++ray_count) {
        float d = 0.0;

        // collision
        int k = next_sphere_intersection(r.origin, r.direction, d);
        if (k == -1) {
            color += r.factor * textureCube(cubemap, r.direction).rgb;
            break;
        }


        vec3 p = r.origin + d * r.direction;
        vec3 n = (p - spheres[k].center) / spheres[k].radius;
        float cos = dot(r.direction, n);
        vec3 i = r.direction - 2.0 * cos * n;

        // phong
        if (spheres[k].mat.phong_factor > 0.0) {
            float lfactor = 1.0; // light
            float dfactor = 0.0; // diffuse
            float sfactor = 0.0; // specular

            int sk = next_sphere_intersection(p + fuzzy * light, light, d);
            if (sk != -1)
                lfactor = (1.0 - spheres[sk].mat.phong_factor) * spheres[sk].mat.transparency;

            if (lfactor > 0.0) { // if we are not in the shadow
                dfactor = clamp(dot(light, n), 0.0, 1.0);
                sfactor = pow(clamp(dot(light, i), 0.0, 1.0), 4.0);
            }
            color += r.factor * spheres[k].mat.phong_factor * (spheres[k].mat.ambiant + lfactor * dfactor * spheres[k].mat.diffuse + sfactor * vec3(1.0, 1.0, 1.0));
        }

        // reflexion
        if (spheres[k].mat.phong_factor < 1.0 && ray_count + 1 < maxrays) {
            vec3 t;

            if (spheres[k].mat.transparency > 0.0 && refraction(r.direction, n, cos, t, spheres[k].mat.eta)) {
//                float frefract = (1.0 - fresnel(cos, dot(t, n), spheres[k].mat.eta)) * spheres[k].mat.transparency;

//                if (0.5 < frefract) {
                    r.factor *= 1.0 - spheres[k].mat.phong_factor;
                    r.origin = p + fuzzy * t;
                    r.direction = t;
//                } else {
//                    r.factor *= 1.0 - spheres[k].mat.phong_factor;
//                    r.origin = p + fuzzy * i;
//                    r.direction = i;
//                }
            } else {
                r.factor *= 1.0 - spheres[k].mat.phong_factor;
                r.origin = p + fuzzy * i;
                r.direction = i;
            }
        }
    }

    pixelColor = vec4(color, 1.0);
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

//float fresnel(in float cosi, in float cost, in float eta)
//{
//    // cosi = v*n
//    // cost = t*n
//    if (cosi > 0.0) {
//        float rs = (eta * cosi - cost) / (eta * cosi + cost);
//        float rp = (eta * cost - cosi) / (eta * cost + cosi);
//        return (rs*rs + rp*rp) / 2.0;
//    } else {
//        float rs = (cosi - eta * cost) / (cosi + eta * cost);
//        float rp = (cost - eta * cosi) / (cost + eta * cosi);
//        return (rs*rs + rp*rp) / 2.0;
//    }
//}

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

bool line_plan_intersection(in vec3 origin, in vec3 direction, in vec3 basis, in vec3 normal, out float dist)
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

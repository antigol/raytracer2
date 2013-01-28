#include "widget.h"

Widget::Widget(QWidget *parent)
    : QGLWidget(parent)
{
    _program = new QGLShaderProgram(this);
}

Widget::~Widget()
{
    
}

#define PROGRAM_VERTEX_ATTRIBUTE 0

void Widget::initializeGL()
{
    qDebug() << ":1";
    _program->addShaderFromSourceFile(QGLShader::Vertex, ":/glsl/raytracer.vert");
    _program->addShaderFromSourceFile(QGLShader::Fragment, ":/glsl/raytracer.frag");
    _program->bindAttributeLocation("vertex", PROGRAM_VERTEX_ATTRIBUTE);
    qDebug() << ":2";
    _program->link();
    qDebug() << ":3";
    _program->bind();
    qDebug() << ":4";

    _program->setUniformValue("light", QVector3D(0.0, 1.0, 0.1).normalized());

    _program->setUniformValue("spheres[0].center", QVector3D(1.0, 0.0, -6.0));
    _program->setUniformValue("spheres[0].radius", 2.0f);
    _program->setUniformValue("spheres[0].mat.phong_factor", 1.0f);
    _program->setUniformValue("spheres[0].mat.ambiant", QVector3D(0.0, 0.0, 0.0));
    _program->setUniformValue("spheres[0].mat.diffuse", QVector3D(0.8, 0.8, 0.0));
    _program->setUniformValue("spheres[0].mat.opacity", 1.0f);
    _program->setUniformValue("spheres[0].mat.eta", 1.5f);

    _program->setUniformValue("spheres[1].center", QVector3D(0.0, 0.0, -3.0));
    _program->setUniformValue("spheres[1].radius", 1.0f);
    _program->setUniformValue("spheres[1].mat.phong_factor", 0.0f);
    _program->setUniformValue("spheres[1].mat.ambiant", QVector3D(0.0, 0.0, 0.0));
    _program->setUniformValue("spheres[1].mat.diffuse", QVector3D(0.8, 0.0, 0.0));
    _program->setUniformValue("spheres[1].mat.opacity", 0.0f);
    _program->setUniformValue("spheres[1].mat.eta", 1.5f);

    _program->setUniformValue("spheres[2].radius", 0.0f);
}

void Widget::resizeGL(int w, int h)
{
    _program->setUniformValue("aspect", h? GLfloat(w)/GLfloat(h) : 1.0f);
    glViewport(0, 0, w, h);
}

void Widget::paintGL()
{
    glClear(GL_COLOR_BUFFER_BIT);

    const GLfloat quad[8] = {1,1, -1,1, -1,-1, 1,-1};
    _program->enableAttributeArray(PROGRAM_VERTEX_ATTRIBUTE);
    _program->setAttributeArray(PROGRAM_VERTEX_ATTRIBUTE, GL_FLOAT, quad, 2);
    glDrawArrays(GL_QUADS, 0, 4);
    _program->disableAttributeArray(PROGRAM_VERTEX_ATTRIBUTE);
}

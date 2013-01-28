#ifndef WIDGET_H
#define WIDGET_H

#include <QGLWidget>
#include <QGLShaderProgram>

class Widget : public QGLWidget
{
    Q_OBJECT
    
public:
    Widget(QWidget *parent = 0);
    ~Widget();

private:
    void initializeGL();
    void resizeGL(int w, int h);
    void paintGL();

    QGLShaderProgram *_program;
};

#endif // WIDGET_H
